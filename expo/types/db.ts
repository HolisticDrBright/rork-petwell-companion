export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      biological_systems: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      care_tasks: {
        Row: {
          created_at: string
          detail: string | null
          done: boolean
          due_time: string | null
          icon: string
          id: string
          label: string
          pet_id: string
          sort: number
        }
        Insert: {
          created_at?: string
          detail?: string | null
          done?: boolean
          due_time?: string | null
          icon?: string
          id?: string
          label: string
          pet_id: string
          sort?: number
        }
        Update: {
          created_at?: string
          detail?: string | null
          done?: boolean
          due_time?: string | null
          icon?: string
          id?: string
          label?: string
          pet_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "care_tasks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_meal_plans: {
        Row: {
          base_urgency: string | null
          cat_guidance: string | null
          consider_items: Json
          created_at: string
          food_first: Json
          id: string
          lifestyle: Json
          notes: Json
          pattern: string | null
          red_flags: Json
          slug: string
          system_slug: string
          title: string
          what_to_track: Json
          when_to_ask_vet: Json
        }
        Insert: {
          base_urgency?: string | null
          cat_guidance?: string | null
          consider_items?: Json
          created_at?: string
          food_first?: Json
          id?: string
          lifestyle?: Json
          notes?: Json
          pattern?: string | null
          red_flags?: Json
          slug: string
          system_slug: string
          title: string
          what_to_track?: Json
          when_to_ask_vet?: Json
        }
        Update: {
          base_urgency?: string | null
          cat_guidance?: string | null
          consider_items?: Json
          created_at?: string
          food_first?: Json
          id?: string
          lifestyle?: Json
          notes?: Json
          pattern?: string | null
          red_flags?: Json
          slug?: string
          system_slug?: string
          title?: string
          what_to_track?: Json
          when_to_ask_vet?: Json
        }
        Relationships: []
      }
      contaminant_tests: {
        Row: {
          brand_id: string | null
          created_at: string
          evidence_source_id: string | null
          id: string
          is_demo: boolean
          lab: string | null
          product_id: string | null
          result: string
          source_url: string | null
          status: string | null
          substance: string
          substance_category: string | null
          tested_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          evidence_source_id?: string | null
          id?: string
          is_demo?: boolean
          lab?: string | null
          product_id?: string | null
          result: string
          source_url?: string | null
          status?: string | null
          substance: string
          substance_category?: string | null
          tested_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          evidence_source_id?: string | null
          id?: string
          is_demo?: boolean
          lab?: string | null
          product_id?: string | null
          result?: string
          source_url?: string | null
          status?: string | null
          substance?: string
          substance_category?: string | null
          tested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contaminant_tests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "food_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contaminant_tests_evidence_source_id_fkey"
            columns: ["evidence_source_id"]
            isOneToOne: false
            referencedRelation: "evidence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contaminant_tests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      contraindications: {
        Row: {
          contraindication: string
          created_at: string
          id: string
          item_kind: string
          item_slug: string
        }
        Insert: {
          contraindication: string
          created_at?: string
          id?: string
          item_kind: string
          item_slug: string
        }
        Update: {
          contraindication?: string
          created_at?: string
          id?: string
          item_kind?: string
          item_slug?: string
        }
        Relationships: []
      }
      detected_patterns: {
        Row: {
          confidence: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          pattern_id: string
          payload: Json
          pet_id: string
          summary: string | null
          system_slug: string | null
          urgent: boolean
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          pattern_id: string
          payload?: Json
          pet_id: string
          summary?: string | null
          system_slug?: string | null
          urgent?: boolean
        }
        Update: {
          confidence?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          pattern_id?: string
          payload?: Json
          pet_id?: string
          summary?: string | null
          system_slug?: string | null
          urgent?: boolean
        }
        Relationships: []
      }
      document_uploads: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          owner_id: string
          pet_id: string
          record_id: string | null
          size_bytes: number | null
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          owner_id: string
          pet_id: string
          record_id?: string | null
          size_bytes?: number | null
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          owner_id?: string
          pet_id?: string
          record_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "vet_records"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_checklists: {
        Row: {
          answers: Json
          created_at: string
          id: string
          owner_id: string
          pet_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          owner_id?: string
          pet_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          owner_id?: string
          pet_id?: string
        }
        Relationships: []
      }
      environment_risks: {
        Row: {
          allergy_relevant: boolean
          cat_severity: string
          dog_severity: string
          id: string
          label: string
          question: string
          safer_step: string
          slug: string
          why: string
        }
        Insert: {
          allergy_relevant?: boolean
          cat_severity?: string
          dog_severity?: string
          id?: string
          label: string
          question: string
          safer_step: string
          slug: string
          why: string
        }
        Update: {
          allergy_relevant?: boolean
          cat_severity?: string
          dog_severity?: string
          id?: string
          label?: string
          question?: string
          safer_step?: string
          slug?: string
          why?: string
        }
        Relationships: []
      }
      evidence_grades: {
        Row: {
          description: string
          grade: string
          label: string
        }
        Insert: {
          description: string
          grade: string
          label: string
        }
        Update: {
          description?: string
          grade?: string
          label?: string
        }
        Relationships: []
      }
      evidence_links: {
        Row: {
          brand_id: string | null
          created_at: string
          evidence_source_id: string
          id: string
          product_id: string | null
          relation: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          evidence_source_id: string
          id?: string
          product_id?: string | null
          relation?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          evidence_source_id?: string
          id?: string
          product_id?: string | null
          relation?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "food_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_evidence_source_id_fkey"
            columns: ["evidence_source_id"]
            isOneToOne: false
            referencedRelation: "evidence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_sources: {
        Row: {
          created_at: string
          id: string
          publisher: string | null
          source_type: string | null
          summary: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          publisher?: string | null
          source_type?: string | null
          summary?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          publisher?: string | null
          source_type?: string | null
          summary?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      food_brands: {
        Row: {
          country: string | null
          created_at: string
          id: string
          manufacturer: string | null
          name: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          manufacturer?: string | null
          name: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          manufacturer?: string | null
          name?: string
        }
        Relationships: []
      }
      food_ingredients: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_common_allergen: boolean
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_common_allergen?: boolean
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_common_allergen?: boolean
          name?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          created_at: string
          fed_at: string
          food_scan_id: string | null
          id: string
          label: string
          owner_id: string
          pet_id: string
          portion: string | null
          product_id: string | null
        }
        Insert: {
          created_at?: string
          fed_at?: string
          food_scan_id?: string | null
          id?: string
          label: string
          owner_id: string
          pet_id: string
          portion?: string | null
          product_id?: string | null
        }
        Update: {
          created_at?: string
          fed_at?: string
          food_scan_id?: string | null
          id?: string
          label?: string
          owner_id?: string
          pet_id?: string
          portion?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_scan_id_fkey"
            columns: ["food_scan_id"]
            isOneToOne: false
            referencedRelation: "food_scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      food_product_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          position: number
          product_id: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          position?: number
          product_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "food_ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      food_products: {
        Row: {
          aafco_statement: string | null
          barcode: string | null
          brand_id: string | null
          calorie_density: string | null
          created_at: string
          form: string | null
          id: string
          life_stage: string | null
          name: string
          product_type: string
          species: string
        }
        Insert: {
          aafco_statement?: string | null
          barcode?: string | null
          brand_id?: string | null
          calorie_density?: string | null
          created_at?: string
          form?: string | null
          id?: string
          life_stage?: string | null
          name: string
          product_type?: string
          species?: string
        }
        Update: {
          aafco_statement?: string | null
          barcode?: string | null
          brand_id?: string | null
          calorie_density?: string | null
          created_at?: string
          form?: string | null
          id?: string
          life_stage?: string | null
          name?: string
          product_type?: string
          species?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "food_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      food_recommendations: {
        Row: {
          created_at: string
          food_scan_id: string | null
          id: string
          owner_id: string | null
          pet_id: string | null
          product_id: string | null
          recommendation: string
          watch_window: string | null
        }
        Insert: {
          created_at?: string
          food_scan_id?: string | null
          id?: string
          owner_id?: string | null
          pet_id?: string | null
          product_id?: string | null
          recommendation: string
          watch_window?: string | null
        }
        Update: {
          created_at?: string
          food_scan_id?: string | null
          id?: string
          owner_id?: string | null
          pet_id?: string | null
          product_id?: string | null
          recommendation?: string
          watch_window?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_recommendations_food_scan_id_fkey"
            columns: ["food_scan_id"]
            isOneToOne: false
            referencedRelation: "food_scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_recommendations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_recommendations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      food_scans: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          owner_id: string
          pet_id: string
          product_id: string | null
          raw_label_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          owner_id: string
          pet_id: string
          product_id?: string | null
          raw_label_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          owner_id?: string
          pet_id?: string
          product_id?: string | null
          raw_label_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_scans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_scans_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_scans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      food_scores: {
        Row: {
          brand_transparency_score: number | null
          contaminant_confidence_score: number | null
          created_at: string
          factors: Json
          food_scan_id: string | null
          grade: string
          id: string
          ingredient_quality_score: number | null
          nutrition_fit_score: number | null
          overall_score: number | null
          owner_id: string | null
          personal_outcome_score: number | null
          pet_id: string | null
          product_id: string | null
          recall_risk_score: number | null
          recommendation: string | null
          summary: string | null
        }
        Insert: {
          brand_transparency_score?: number | null
          contaminant_confidence_score?: number | null
          created_at?: string
          factors?: Json
          food_scan_id?: string | null
          grade: string
          id?: string
          ingredient_quality_score?: number | null
          nutrition_fit_score?: number | null
          overall_score?: number | null
          owner_id?: string | null
          personal_outcome_score?: number | null
          pet_id?: string | null
          product_id?: string | null
          recall_risk_score?: number | null
          recommendation?: string | null
          summary?: string | null
        }
        Update: {
          brand_transparency_score?: number | null
          contaminant_confidence_score?: number | null
          created_at?: string
          factors?: Json
          food_scan_id?: string | null
          grade?: string
          id?: string
          ingredient_quality_score?: number | null
          nutrition_fit_score?: number | null
          overall_score?: number | null
          owner_id?: string | null
          personal_outcome_score?: number | null
          pet_id?: string | null
          product_id?: string | null
          recall_risk_score?: number | null
          recommendation?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_scores_food_scan_id_fkey"
            columns: ["food_scan_id"]
            isOneToOne: false
            referencedRelation: "food_scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_scores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_scores_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      health_logs: {
        Row: {
          category: string
          created_at: string
          id: string
          logged_at: string
          metric: string | null
          note: string | null
          owner_id: string
          pet_id: string
          unit: string | null
          value: number | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          logged_at?: string
          metric?: string | null
          note?: string | null
          owner_id: string
          pet_id: string
          unit?: string | null
          value?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          logged_at?: string
          metric?: string | null
          note?: string | null
          owner_id?: string
          pet_id?: string
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_logs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          band: string
          created_at: string
          generated_at: string
          headline: string | null
          id: string
          overall: number
          owner_id: string
          pet_id: string
          systems: Json
        }
        Insert: {
          band: string
          created_at?: string
          generated_at?: string
          headline?: string | null
          id?: string
          overall: number
          owner_id?: string
          pet_id: string
          systems?: Json
        }
        Update: {
          band?: string
          created_at?: string
          generated_at?: string
          headline?: string | null
          id?: string
          overall?: number
          owner_id?: string
          pet_id?: string
          systems?: Json
        }
        Relationships: []
      }
      herb_profiles: {
        Row: {
          ask_vet_first: boolean
          benefit: string
          cat_safety: string
          created_at: string
          dog_safety: string
          evidence_grade: string | null
          flavor: string | null
          id: string
          name: string
          slug: string
          source: string | null
          systems: Json
          tcm_pattern: string | null
          thermal_nature: string | null
        }
        Insert: {
          ask_vet_first?: boolean
          benefit: string
          cat_safety?: string
          created_at?: string
          dog_safety?: string
          evidence_grade?: string | null
          flavor?: string | null
          id?: string
          name: string
          slug: string
          source?: string | null
          systems?: Json
          tcm_pattern?: string | null
          thermal_nature?: string | null
        }
        Update: {
          ask_vet_first?: boolean
          benefit?: string
          cat_safety?: string
          created_at?: string
          dog_safety?: string
          evidence_grade?: string | null
          flavor?: string | null
          id?: string
          name?: string
          slug?: string
          source?: string | null
          systems?: Json
          tcm_pattern?: string | null
          thermal_nature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "herb_profiles_evidence_grade_fkey"
            columns: ["evidence_grade"]
            isOneToOne: false
            referencedRelation: "evidence_grades"
            referencedColumns: ["grade"]
          },
        ]
      }
      ingredient_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          ingredient_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          ingredient_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_aliases_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "food_ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_flags: {
        Row: {
          created_at: string
          flag_type: string
          id: string
          ingredient_id: string
          message: string
          severity: string
        }
        Insert: {
          created_at?: string
          flag_type: string
          id?: string
          ingredient_id: string
          message: string
          severity?: string
        }
        Update: {
          created_at?: string
          flag_type?: string
          id?: string
          ingredient_id?: string
          message?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_flags_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "food_ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      integrative_protocols: {
        Row: {
          created_at: string
          id: string
          slug: string
          summary: string | null
          system_slug: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          summary?: string | null
          system_slug: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          summary?: string | null
          system_slug?: string
          title?: string
        }
        Relationships: []
      }
      manufacturer_quality_profiles: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          notes: string | null
          owns_facilities: boolean | null
          recall_count: number | null
          transparency_score: number | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owns_facilities?: boolean | null
          recall_count?: number | null
          transparency_score?: number | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owns_facilities?: boolean | null
          recall_count?: number | null
          transparency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturer_quality_profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "food_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          blurb: string | null
          category: string
          evidence: string
          fit_tags: string[]
          id: string
          ingredient_quality: number
          lab_tested: boolean
          name: string
          reported_outcomes: number
          slug: string
          species: string
          transparency: number
        }
        Insert: {
          blurb?: string | null
          category: string
          evidence?: string
          fit_tags?: string[]
          id?: string
          ingredient_quality?: number
          lab_tested?: boolean
          name: string
          reported_outcomes?: number
          slug: string
          species?: string
          transparency?: number
        }
        Update: {
          blurb?: string | null
          category?: string
          evidence?: string
          fit_tags?: string[]
          id?: string
          ingredient_quality?: number
          lab_tested?: boolean
          name?: string
          reported_outcomes?: number
          slug?: string
          species?: string
          transparency?: number
        }
        Relationships: []
      }
      meal_plan_items: {
        Row: {
          id: string
          kind: string
          meal_plan_slug: string
          name: string
          note: string | null
          sort: number
        }
        Insert: {
          id?: string
          kind: string
          meal_plan_slug: string
          name: string
          note?: string | null
          sort?: number
        }
        Update: {
          id?: string
          kind?: string
          meal_plan_slug?: string
          name?: string
          note?: string | null
          sort?: number
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          calories_note: string | null
          cat_caution: string | null
          commercial: string[]
          condition_slug: string | null
          contraindications: string[]
          created_at: string
          evidence: string | null
          fat_note: string | null
          fiber_note: string | null
          homemade: string[]
          hydration_note: string | null
          id: string
          needs_nutritionist: boolean
          prep: string | null
          protein_note: string | null
          slug: string
          species: string
          tcm_pattern: string | null
          thermal_nature: string | null
          title: string
          who_for: string | null
        }
        Insert: {
          calories_note?: string | null
          cat_caution?: string | null
          commercial?: string[]
          condition_slug?: string | null
          contraindications?: string[]
          created_at?: string
          evidence?: string | null
          fat_note?: string | null
          fiber_note?: string | null
          homemade?: string[]
          hydration_note?: string | null
          id?: string
          needs_nutritionist?: boolean
          prep?: string | null
          protein_note?: string | null
          slug: string
          species?: string
          tcm_pattern?: string | null
          thermal_nature?: string | null
          title: string
          who_for?: string | null
        }
        Update: {
          calories_note?: string | null
          cat_caution?: string | null
          commercial?: string[]
          condition_slug?: string | null
          contraindications?: string[]
          created_at?: string
          evidence?: string | null
          fat_note?: string | null
          fiber_note?: string | null
          homemade?: string[]
          hydration_note?: string | null
          id?: string
          needs_nutritionist?: boolean
          prep?: string | null
          protein_note?: string | null
          slug?: string
          species?: string
          tcm_pattern?: string | null
          thermal_nature?: string | null
          title?: string
          who_for?: string | null
        }
        Relationships: []
      }
      medication_interactions: {
        Row: {
          created_at: string
          drug_class: string
          id: string
          item_kind: string
          item_slug: string
          note: string | null
        }
        Insert: {
          created_at?: string
          drug_class: string
          id?: string
          item_kind: string
          item_slug: string
          note?: string | null
        }
        Update: {
          created_at?: string
          drug_class?: string
          id?: string
          item_kind?: string
          item_slug?: string
          note?: string | null
        }
        Relationships: []
      }
      natural_remedies: {
        Row: {
          ask_vet_first: boolean
          benefit: string
          created_at: string
          evidence_grade: string | null
          id: string
          kind: string
          name: string
          slug: string
          source: string | null
          systems: Json
        }
        Insert: {
          ask_vet_first?: boolean
          benefit: string
          created_at?: string
          evidence_grade?: string | null
          id?: string
          kind: string
          name: string
          slug: string
          source?: string | null
          systems?: Json
        }
        Update: {
          ask_vet_first?: boolean
          benefit?: string
          created_at?: string
          evidence_grade?: string | null
          id?: string
          kind?: string
          name?: string
          slug?: string
          source?: string | null
          systems?: Json
        }
        Relationships: [
          {
            foreignKeyName: "natural_remedies_evidence_grade_fkey"
            columns: ["evidence_grade"]
            isOneToOne: false
            referencedRelation: "evidence_grades"
            referencedColumns: ["grade"]
          },
        ]
      }
      nutrition_profiles: {
        Row: {
          created_at: string
          fat_pct: number | null
          fiber_pct: number | null
          id: string
          kcal_per_100g: number | null
          moisture_pct: number | null
          product_id: string
          protein_pct: number | null
        }
        Insert: {
          created_at?: string
          fat_pct?: number | null
          fiber_pct?: number | null
          id?: string
          kcal_per_100g?: number | null
          moisture_pct?: number | null
          product_id: string
          protein_pct?: number | null
        }
        Update: {
          created_at?: string
          fat_pct?: number | null
          fiber_pct?: number | null
          id?: string
          kcal_per_100g?: number | null
          moisture_pct?: number | null
          product_id?: string
          protein_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_profiles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_allergies: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          label: string
          pet_id: string
          severity: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          label: string
          pet_id: string
          severity?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          label?: string
          pet_id?: string
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_allergies_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_conditions: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          label: string
          pet_id: string
          since: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          label: string
          pet_id: string
          since?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          label?: string
          pet_id?: string
          since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_conditions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_medications: {
        Row: {
          created_at: string
          dosage: string | null
          id: string
          name: string
          pet_id: string
          purpose: string | null
          refill_date: string | null
          schedule: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          id?: string
          name: string
          pet_id: string
          purpose?: string | null
          refill_date?: string | null
          schedule?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string | null
          id?: string
          name?: string
          pet_id?: string
          purpose?: string | null
          refill_date?: string | null
          schedule?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_medications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_profiles: {
        Row: {
          age_years: number
          breed: string
          created_at: string
          demo_key: string | null
          id: string
          name: string
          owner_id: string
          photo_url: string | null
          recent_change: string | null
          risk_watch: string | null
          sex: string | null
          species: string
          status: string
          status_note: string
          updated_at: string
          weight_lb: number
        }
        Insert: {
          age_years?: number
          breed?: string
          created_at?: string
          demo_key?: string | null
          id?: string
          name: string
          owner_id: string
          photo_url?: string | null
          recent_change?: string | null
          risk_watch?: string | null
          sex?: string | null
          species: string
          status?: string
          status_note?: string
          updated_at?: string
          weight_lb?: number
        }
        Update: {
          age_years?: number
          breed?: string
          created_at?: string
          demo_key?: string | null
          id?: string
          name?: string
          owner_id?: string
          photo_url?: string | null
          recent_change?: string | null
          risk_watch?: string | null
          sex?: string | null
          species?: string
          status?: string
          status_note?: string
          updated_at?: string
          weight_lb?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recommendations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          owner_id: string
          pet_id: string
          product_slug: string
          score: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          pet_id: string
          product_slug: string
          score?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          pet_id?: string
          product_slug?: string
          score?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarded: boolean
          personalized_insights: boolean
          premium: boolean
          share_research: boolean
          store_photos: boolean
          training_opt_out: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarded?: boolean
          personalized_insights?: boolean
          premium?: boolean
          share_research?: boolean
          store_photos?: boolean
          training_opt_out?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarded?: boolean
          personalized_insights?: boolean
          premium?: boolean
          share_research?: boolean
          store_photos?: boolean
          training_opt_out?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      program_logs: {
        Row: {
          day: number
          id: string
          logged_at: string
          note: string | null
          owner_id: string
          program_id: string
        }
        Insert: {
          day: number
          id?: string
          logged_at?: string
          note?: string | null
          owner_id?: string
          program_id: string
        }
        Update: {
          day?: number
          id?: string
          logged_at?: string
          note?: string | null
          owner_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "progress_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_tasks: {
        Row: {
          id: string
          kind: string
          label: string
          sort: number
          template_id: string
        }
        Insert: {
          id?: string
          kind?: string
          label: string
          sort?: number
          template_id: string
        }
        Update: {
          id?: string
          kind?: string
          label?: string
          sort?: number
          template_id?: string
        }
        Relationships: []
      }
      progress_programs: {
        Row: {
          created_at: string
          id: string
          logged_days: number[]
          owner_id: string
          pet_id: string
          started_at: string
          status: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_days?: number[]
          owner_id?: string
          pet_id: string
          started_at?: string
          status?: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_days?: number[]
          owner_id?: string
          pet_id?: string
          started_at?: string
          status?: string
          template_id?: string
        }
        Relationships: []
      }
      protocol_recommendations: {
        Row: {
          condition_slug: string | null
          created_at: string
          emergency_override: boolean
          id: string
          owner_id: string
          pet_id: string
          plan: Json
          system_slug: string | null
          triage_result_id: string | null
          urgency: string | null
        }
        Insert: {
          condition_slug?: string | null
          created_at?: string
          emergency_override?: boolean
          id?: string
          owner_id: string
          pet_id: string
          plan?: Json
          system_slug?: string | null
          triage_result_id?: string | null
          urgency?: string | null
        }
        Update: {
          condition_slug?: string | null
          created_at?: string
          emergency_override?: boolean
          id?: string
          owner_id?: string
          pet_id?: string
          plan?: Json
          system_slug?: string | null
          triage_result_id?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_recommendations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_recommendations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_recommendations_triage_result_id_fkey"
            columns: ["triage_result_id"]
            isOneToOne: false
            referencedRelation: "triage_results"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_events: {
        Row: {
          brand_id: string | null
          created_at: string
          evidence_source_id: string | null
          id: string
          product_id: string | null
          reason: string
          recall_date: string | null
          severity: string | null
          source_url: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          evidence_source_id?: string | null
          id?: string
          product_id?: string | null
          reason: string
          recall_date?: string | null
          severity?: string | null
          source_url?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          evidence_source_id?: string | null
          id?: string
          product_id?: string | null
          reason?: string
          recall_date?: string | null
          severity?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recall_events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "food_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_events_evidence_source_id_fkey"
            columns: ["evidence_source_id"]
            isOneToOne: false
            referencedRelation: "evidence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          detail: string | null
          enabled: boolean
          id: string
          label: string
          pet_id: string
          repeat: string | null
          sort: number
          time_label: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          enabled?: boolean
          id?: string
          label: string
          pet_id: string
          repeat?: string | null
          sort?: number
          time_label?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          enabled?: boolean
          id?: string
          label?: string
          pet_id?: string
          repeat?: string | null
          sort?: number
          time_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_images: {
        Row: {
          created_at: string
          height: number | null
          id: string
          scan_id: string
          sort: number
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          scan_id: string
          sort?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          scan_id?: string
          sort?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_images_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_records"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_records: {
        Row: {
          correlation: string | null
          created_at: string
          fields: Json
          follow_ups: Json
          id: string
          notes: string | null
          owner_id: string
          patterns: Json
          pet_id: string
          scan_type: string
          score: string | null
          score_label: string | null
          status: string
          urgency: string | null
        }
        Insert: {
          correlation?: string | null
          created_at?: string
          fields?: Json
          follow_ups?: Json
          id?: string
          notes?: string | null
          owner_id: string
          patterns?: Json
          pet_id: string
          scan_type: string
          score?: string | null
          score_label?: string | null
          status?: string
          urgency?: string | null
        }
        Update: {
          correlation?: string | null
          created_at?: string
          fields?: Json
          follow_ups?: Json
          id?: string
          notes?: string | null
          owner_id?: string
          patterns?: Json
          pet_id?: string
          scan_type?: string
          score?: string | null
          score_label?: string | null
          status?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      species_safety_rules: {
        Row: {
          category: string
          created_at: string
          id: string
          rule: string
          severity: string
          species: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          rule: string
          severity?: string
          species: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          rule?: string
          severity?: string
          species?: string
        }
        Relationships: []
      }
      supplement_ingredients: {
        Row: {
          ask_vet_first: boolean
          benefit: string
          cat_safety: string
          created_at: string
          dog_safety: string
          evidence_grade: string | null
          id: string
          name: string
          slug: string
          source: string | null
          systems: Json
        }
        Insert: {
          ask_vet_first?: boolean
          benefit: string
          cat_safety?: string
          created_at?: string
          dog_safety?: string
          evidence_grade?: string | null
          id?: string
          name: string
          slug: string
          source?: string | null
          systems?: Json
        }
        Update: {
          ask_vet_first?: boolean
          benefit?: string
          cat_safety?: string
          created_at?: string
          dog_safety?: string
          evidence_grade?: string | null
          id?: string
          name?: string
          slug?: string
          source?: string | null
          systems?: Json
        }
        Relationships: [
          {
            foreignKeyName: "supplement_ingredients_evidence_grade_fkey"
            columns: ["evidence_grade"]
            isOneToOne: false
            referencedRelation: "evidence_grades"
            referencedColumns: ["grade"]
          },
        ]
      }
      symptom_answers: {
        Row: {
          answer_id: string | null
          answer_label: string | null
          created_at: string
          id: string
          is_red_flag: boolean
          question_id: string
          question_text: string
          session_id: string
          sort: number
        }
        Insert: {
          answer_id?: string | null
          answer_label?: string | null
          created_at?: string
          id?: string
          is_red_flag?: boolean
          question_id: string
          question_text: string
          session_id: string
          sort?: number
        }
        Update: {
          answer_id?: string | null
          answer_label?: string | null
          created_at?: string
          id?: string
          is_red_flag?: boolean
          question_id?: string
          question_text?: string
          session_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "symptom_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "symptom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_sessions: {
        Row: {
          completed_at: string | null
          concern: string
          concern_label: string | null
          id: string
          owner_id: string
          pet_id: string
          red_flag_count: number
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          concern: string
          concern_label?: string | null
          id?: string
          owner_id: string
          pet_id: string
          red_flag_count?: number
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          concern?: string
          concern_label?: string | null
          id?: string
          owner_id?: string
          pet_id?: string
          red_flag_count?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_sessions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_sessions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_patterns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          system_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          system_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_patterns_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "biological_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_scores: {
        Row: {
          band: string
          created_at: string
          health_score_id: string
          id: string
          key: string
          label: string
          owner_id: string
          score: number
          status: string | null
        }
        Insert: {
          band: string
          created_at?: string
          health_score_id: string
          id?: string
          key: string
          label: string
          owner_id?: string
          score: number
          status?: string | null
        }
        Update: {
          band?: string
          created_at?: string
          health_score_id?: string
          id?: string
          key?: string
          label?: string
          owner_id?: string
          score?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_scores_health_score_id_fkey"
            columns: ["health_score_id"]
            isOneToOne: false
            referencedRelation: "health_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      tcm_food_properties: {
        Row: {
          condition_contraindications: string | null
          created_at: string
          flavor: string | null
          food: string
          id: string
          preparation_notes: string | null
          species_safety: string | null
          tcm_pattern_support: string | null
          thermal_nature: string | null
        }
        Insert: {
          condition_contraindications?: string | null
          created_at?: string
          flavor?: string | null
          food: string
          id?: string
          preparation_notes?: string | null
          species_safety?: string | null
          tcm_pattern_support?: string | null
          thermal_nature?: string | null
        }
        Update: {
          condition_contraindications?: string | null
          created_at?: string
          flavor?: string | null
          food?: string
          id?: string
          preparation_notes?: string | null
          species_safety?: string | null
          tcm_pattern_support?: string | null
          thermal_nature?: string | null
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          category: string
          created_at: string
          detail: string | null
          event_date: string
          event_time: string | null
          id: string
          owner_id: string
          pet_id: string
          ref_id: string | null
          source: string
          title: string
          urgency: string | null
          value: number | null
        }
        Insert: {
          category: string
          created_at?: string
          detail?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          owner_id: string
          pet_id: string
          ref_id?: string | null
          source?: string
          title: string
          urgency?: string | null
          value?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          detail?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          owner_id?: string
          pet_id?: string
          ref_id?: string | null
          source?: string
          title?: string
          urgency?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treat_audits: {
        Row: {
          calories: number | null
          created_at: string
          fat_level: string | null
          id: string
          name: string
          owner_id: string
          payload: Json
          pet_id: string
          verdict: string
        }
        Insert: {
          calories?: number | null
          created_at?: string
          fat_level?: string | null
          id?: string
          name: string
          owner_id?: string
          payload?: Json
          pet_id: string
          verdict: string
        }
        Update: {
          calories?: number | null
          created_at?: string
          fat_level?: string | null
          id?: string
          name?: string
          owner_id?: string
          payload?: Json
          pet_id?: string
          verdict?: string
        }
        Relationships: []
      }
      triage_results: {
        Row: {
          causes: Json
          changes_urgency: Json
          confidence: string
          created_at: string
          id: string
          owner_id: string
          pet_id: string
          red_flags: Json
          session_id: string | null
          steps: Json
          summary: string | null
          supports: Json
          urgency: string
        }
        Insert: {
          causes?: Json
          changes_urgency?: Json
          confidence: string
          created_at?: string
          id?: string
          owner_id: string
          pet_id: string
          red_flags?: Json
          session_id?: string | null
          steps?: Json
          summary?: string | null
          supports?: Json
          urgency: string
        }
        Update: {
          causes?: Json
          changes_urgency?: Json
          confidence?: string
          created_at?: string
          id?: string
          owner_id?: string
          pet_id?: string
          red_flags?: Json
          session_id?: string | null
          steps?: Json
          summary?: string | null
          supports?: Json
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_results_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_results_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "symptom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_corrections: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          field: string | null
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          owner_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          field?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          owner_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          field?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_corrections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_records: {
        Row: {
          category: string
          created_at: string
          id: string
          owner_id: string
          pet_id: string
          record_date: string | null
          sort: number
          status: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          owner_id: string
          pet_id: string
          record_date?: string | null
          sort?: number
          status?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          owner_id?: string
          pet_id?: string
          record_date?: string | null
          sort?: number
          status?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_reports: {
        Row: {
          concern_summary: string | null
          created_at: string
          generated_at: string
          id: string
          owner_id: string
          payload: Json
          pdf_path: string | null
          pet_id: string
          title: string
        }
        Insert: {
          concern_summary?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          owner_id: string
          payload?: Json
          pdf_path?: string | null
          pet_id: string
          title?: string
        }
        Update: {
          concern_summary?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          owner_id?: string
          payload?: Json
          pdf_path?: string | null
          pet_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pet_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
