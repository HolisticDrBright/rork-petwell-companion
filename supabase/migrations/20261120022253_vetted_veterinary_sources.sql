create table public.vet_sources (
  id text primary key,
  title text not null,
  publisher text not null,
  url text not null check (url ~ '^https://'),
  species text not null check (species in ('dog','cat','both')),
  topics text[] not null,
  section text not null,
  passage text not null,
  last_reviewed_at date not null,
  status text not null default 'active' check (status in ('active','retired'))
);
create table public.triage_red_flags (
  id uuid primary key default gen_random_uuid(),
  phrase text not null check (char_length(phrase) between 4 and 120),
  species text not null check (species in ('dog','cat','both')),
  source_id text not null references public.vet_sources(id),
  routing text not null check (routing in ('emergency_vet','poison_control')),
  active boolean not null default false
);
alter table public.vet_sources enable row level security;
alter table public.triage_red_flags enable row level security;
revoke all on public.vet_sources, public.triage_red_flags from public, anon, authenticated;
grant select on public.vet_sources, public.triage_red_flags to authenticated;
grant all on public.vet_sources, public.triage_red_flags to service_role;
create policy active_vet_sources on public.vet_sources for select to authenticated using (status = 'active');
create policy active_triage_red_flags on public.triage_red_flags for select to authenticated using (
  active and exists (select from public.vet_sources s where s.id = source_id and s.status = 'active')
);

-- Published source summaries. For manual review and updates, see the seed JSON.
insert into public.vet_sources select * from jsonb_populate_recordset(null::public.vet_sources, $vet_sources$
[
  {
    "id": "cornell-urgent-care",
    "title": "Urgent Care",
    "publisher": "Cornell University College of Veterinary Medicine",
    "url": "https://www.vet.cornell.edu/hospitals/services/urgent-care",
    "species": "both",
    "topics": ["urgent", "appointment", "injury", "skin", "ear", "eye", "diarrhea", "urinary", "vomiting"],
    "section": "Urgent care and emergencies",
    "passage": "Cornell describes urgent care as prompt care for dogs and cats with non-life-threatening concerns. Emergencies need an emergency service. Cornell lists examples of problems its urgent care team can see, including some skin, ear, and gastrointestinal concerns.",
    "last_reviewed_at": "2026-11-19",
    "status": "active"
  },
  {
    "id": "avma-pet-first-aid",
    "title": "First aid for pets",
    "publisher": "American Veterinary Medical Association",
    "url": "https://ebusiness.avma.org/files/productdownloads/mcm-client-brochures-pet-first-aid-2023.pdf",
    "species": "both",
    "topics": ["emergency", "breathing", "collapse", "poison", "toxic", "first aid", "injury", "ate", "ingest"],
    "section": "Emergency and poisoning guidance",
    "passage": "In an emergency, call the veterinary clinic so it can prepare and follow its directions. For possible poisoning, consult a veterinarian or animal poison control before trying any home treatment or giving a medication.",
    "last_reviewed_at": "2026-11-19",
    "status": "active"
  },
  {
    "id": "cornell-cat-breathing",
    "title": "Dyspnea (Difficulty Breathing)",
    "publisher": "Cornell Feline Health Center",
    "url": "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/dyspnea-difficulty-breathing",
    "species": "cat",
    "topics": ["breathing", "panting", "dyspnea", "respiratory"],
    "section": "Difficulty breathing",
    "passage": "Difficulty breathing in a cat is a serious sign with many possible causes. Prompt veterinary care is needed to assess and treat the problem.",
    "last_reviewed_at": "2026-11-19",
    "status": "active"
  },
  {
    "id": "cornell-dog-diarrhea",
    "title": "Diarrhea",
    "publisher": "Cornell Riney Canine Health Center",
    "url": "https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/diarrhea",
    "species": "dog",
    "topics": ["diarrhea", "stool", "loose stool", "digestion"],
    "section": "When to contact the veterinarian",
    "passage": "Cornell advises seeking veterinary care when diarrhea occurs with signs such as lethargy, reduced appetite, vomiting, or dark tarry stool. A stool sample can help the veterinary team assess the problem.",
    "last_reviewed_at": "2026-11-19",
    "status": "active"
  },
  {
    "id": "cornell-dog-vomiting",
    "title": "Vomiting",
    "publisher": "Cornell Riney Canine Health Center",
    "url": "https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/vomiting",
    "species": "dog",
    "topics": ["vomit", "vomiting", "nausea", "digestion"],
    "section": "When to call your veterinarian",
    "passage": "Cornell advises calling a veterinarian when vomiting is persistent or is accompanied by signs such as lethargy, abdominal pain, or fever. The material describes general guidance for dogs.",
    "last_reviewed_at": "2026-11-19",
    "status": "active"
  }
]
$vet_sources$::jsonb);
