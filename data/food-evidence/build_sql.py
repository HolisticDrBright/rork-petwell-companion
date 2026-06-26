#!/usr/bin/env python3
"""Generate import_food_evidence.sql (idempotent) from the CSVs, aligned to the
Petwell Supabase schema (migrations 0003 + 0016). Safe-by-design:
  * food_brands upsert on unique name.
  * food_products inserted only if barcode not already present; evidence_status=open_database.
  * recall_events upsert on dedup_key (verified_official).
  * lab_tests: brand-published values enter at level='brand' (never 'product'),
    so the scoring engine cannot read them as verified product-level purity.
    DB evidence_status='verified_lab' is reserved for independent published
    studies / independent certification; everything else -> 'brand_claim'.
  * needs_review / no_public_coa_found are NOT inserted as lab results; they go to
    evidence_sources + admin_review_queue so they never imply a passing test.
  * Every imported lab_test + product gets an admin_review_queue row.
Run output is also used to load the live Supabase DB via the MCP."""
import csv

def q(s):
    if s is None: return "null"
    return "'" + str(s).replace("'","''") + "'"

def cat_of(subs):
    s=(subs or "").lower()
    if "pfas" in s or "fluorine" in s: return "pfas"
    if "aflatox" in s or "mycotox" in s or "don" in s or "fumonisin" in s or "ochratox" in s or "zearal" in s: return "mycotoxins"
    if "bpa" in s or "bisphenol" in s or "bps" in s: return "bpa_bps"
    if "acrylamide" in s: return "acrylamide"
    if "glyphosate" in s or "pesticide" in s: return "pesticides"
    if "lead" in s or "arsenic" in s or "cadmium" in s or "mercury" in s or "heavy metal" in s: return "heavy_metals"
    if "salmonella" in s or "coli" in s or "listeria" in s or "pathogen" in s: return "other"
    return "other"

out=[]
out.append("-- Petwell food-evidence import  (generated)  2026-06-25")
out.append("-- Source-backed: openFDA recalls, Open Pet Food Facts catalog, web-researched lab evidence.")
out.append("-- Idempotent. Does NOT write to production unless you run it against your DB intentionally.")
out.append("begin;")

# log run
out.append("\n-- import run log")
out.append("insert into public.data_import_runs(source,status,finished_at,records_seen) values ('manual','success',now(),0);")

# ---------- brands ----------
out.append("\n-- ===== food_brands (upsert on unique name) =====")
with open("brands.csv",encoding="utf-8") as f:
    for r in csv.DictReader(f):
        out.append(f"insert into public.food_brands(name,manufacturer,country) values ({q(r['brand'])},{q(r['parent_company'])},{q(r['hq_country'])}) on conflict (name) do update set manufacturer=excluded.manufacturer, country=excluded.country;")
        # manufacturer_quality_profiles (owns_facilities) - additive, only notes
        owns = "true" if r["owns_or_comfg"]=="owns" else ("false" if "co-manuf" in r["owns_or_comfg"] else "null")

# ---------- products (OPFF) ----------
out.append("\n-- ===== food_products (Open Pet Food Facts, open_database, needs admin review) =====")
with open("products.csv",encoding="utf-8") as f:
    rows=list(csv.DictReader(f))
for r in rows:
    sp = r["species"] if r["species"] in ("dog","cat","both") else "both"
    pt = "treat" if r["product_type"]=="treat" else "food"
    brand=r["brand"].strip()
    brand_sel = f"(select id from public.food_brands where name={q(brand)} limit 1)" if brand else "null"
    if brand:
        out.append(f"insert into public.food_brands(name) values ({q(brand)}) on conflict (name) do nothing;")
    out.append(
        "insert into public.food_products(brand_id,name,product_type,species,barcode,ingredient_text,image_url,source_url,evidence_status,match_confidence,last_reviewed_at) "
        f"select {brand_sel},{q(r['product_name'])},{q(pt)},{q(sp)},{q(r['barcode'])},{q(r['ingredients_text'])},{q(r['image_url'])},{q(r['source_url'])},'open_database','exact_barcode',now() "
        f"where not exists (select 1 from public.food_products where barcode={q(r['barcode'])});")
out.append("-- queue OPFF products for admin review")
out.append("insert into public.admin_review_queue(entity_type,entity_id,priority,status,note) "
           "select 'product', id, 1, 'open', 'Open Pet Food Facts import - verify brand/species/ingredients' "
           "from public.food_products where evidence_status='open_database' "
           "and id not in (select entity_id from public.admin_review_queue where entity_type='product' and entity_id is not null);")

# ---------- recalls ----------
out.append("\n-- ===== recall_events (openFDA, verified_official, upsert on dedup_key) =====")
with open("recalls_openfda.csv",encoding="utf-8") as f:
    for r in csv.DictReader(f):
        brand_sel="null"
        match="'unmatched'"
        out.append(
          "insert into public.recall_events(brand_id,recall_date,reason,severity,source_url,fda_recall_number,event_id,classification,status,distribution,brand_match_level,dedup_key,evidence_status,last_reviewed_at) "
          f"values (null,{q(r['recall_date'] or None)},{q(r['reason'])},{q(r['severity'])},{q(r['source_url'])},{q(r['fda_recall_number'])},{q(r['event_id'])},{q(r['classification'])},{q(r['status'])},{q(r['distribution'])},'unmatched',{q(r['dedup_key'])},'verified_official',now()) "
          "on conflict (dedup_key) do nothing;")
out.append("-- brand-match recalls to known brands (BRAND-LEVEL only; never implies exact product recall)")
out.append("update public.recall_events re set brand_id=b.id, brand_match_level='brand' "
           "from public.food_brands b "
           "where re.brand_id is null and re.raw_payload is null "
           "and re.reason is not null and position(lower(split_part(b.name,' ',1)) in lower(re.reason))>0 "
           "and length(split_part(b.name,' ',1))>3;")

# ---------- lab evidence ----------
out.append("\n-- ===== lab_tests (web-researched; brand values enter at level='brand') =====")
INSERT_TYPES={"brand_level_lab_report","batch_lot_coa","third_party_lab_summary","public_study","real_product_coa"}
with open("lab_evidence.csv",encoding="utf-8") as f:
    for r in csv.DictReader(f):
        st=r["source_type"]
        if st not in INSERT_TYPES:
            continue
        # level mapping (never 'product' unless a true real_product_coa)
        if st=="real_product_coa": level="product"
        elif st=="batch_lot_coa": level="batch"
        elif st=="public_study": level="study"
        else: level="brand"
        # DB evidence_status: verified_lab only for independent published evidence
        if r["evidence_status"]=="verified_lab": estatus="verified_lab"
        else: estatus="brand_claim"
        # status mapping
        status=r["status"] if r["status"] in ("pass","not_detected","elevated","fail","unknown") else "unknown"
        brand=r["brand"].split(" (")[0].strip()
        brand_sel=f"(select id from public.food_brands where name={q(brand)} limit 1)"
        cat=cat_of(r["substances"])
        note=(r["notes"] or "")
        if r["evidence_status"]=="needs_review": note="[NEEDS REVIEW] "+note
        out.append(
          "insert into public.lab_tests(level,brand_id,contaminant_category,substance,result_value,unit,status,test_date,lab_name,source_url,evidence_status,confidence_score,raw_payload) "
          f"values ({q(level)},{brand_sel},{q(cat)},{q(r['substances'])},{q(r['result_value'])},{q(r['unit'])},{q(status)},{q(r['test_date'] or None)},{q(r['lab_name'])},{q(r['source_url'])},{q(estatus)},null,"
          f"jsonb_build_object('note',{q(note)},'source_type',{q(st)},'evidence_grade',{q(r['evidence_status'])},'product',{q(r['product'])},'accessed',{q(r['accessed_date'])}));")
out.append("-- queue every imported lab_test for admin review")
out.append("insert into public.admin_review_queue(entity_type,entity_id,priority,status,note) "
           "select 'lab_test', id, 2, 'open', 'Web-researched lab evidence - verify source & grade before surfacing' "
           "from public.lab_tests where id not in (select entity_id from public.admin_review_queue where entity_type='lab_test' and entity_id is not null);")

# ---------- evidence_sources (all positive sources + studies + negative notes) ----------
out.append("\n-- ===== evidence_sources (citations: COAs, studies, lot tools) =====")
seen=set()
with open("lab_evidence.csv",encoding="utf-8") as f:
    for r in csv.DictReader(f):
        url=r["source_url"]
        if not url or url in seen: continue
        seen.add(url)
        title=f"{r['brand']} - {r['source_type']}"
        out.append(f"insert into public.evidence_sources(title,publisher,url,source_type,summary) select {q(title[:200])},{q(r['lab_name'])},{q(url)},{q(r['source_type'])},{q((r['notes'] or '')[:400])} where not exists (select 1 from public.evidence_sources where url={q(url)});")

# ---------- no_public_coa_found -> admin queue note ----------
out.append("\n-- ===== no_public_coa_found -> admin_review_queue (so the gap is tracked, not hidden) =====")
with open("no_public_coa_found.csv",encoding="utf-8") as f:
    for r in csv.DictReader(f):
        out.append("insert into public.admin_review_queue(entity_type,entity_id,priority,status,note) "
                   f"values ('lab_test',null,0,'open',{q('NO PUBLIC COA: '+r['brand']+' - '+r['notes'])});")

out.append("\ncommit;")
out.append("-- End of import. Review admin_review_queue before surfacing any evidence in the app.")

with open("import_food_evidence.sql","w",encoding="utf-8") as f:
    f.write("\n".join(out)+"\n")
print("import_food_evidence.sql lines:",len(out))
