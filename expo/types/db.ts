// Auto-generated from the Supabase schema (supabase gen types typescript).
// Regenerate after migrations. Do not edit by hand.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
      contaminant_tests: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          lab: string | null
          product_id: string | null
          result: string
          source_url: string | null
          substance: string
          tested_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          lab?: string | null
          product_id?: string | null
          result: string
          source_url?: string | null
          substance: string
          tested_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          lab?: string | null
          product_id?: string | null
          result?: string
          source_url?: string | null
          substance?: string
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
            foreignKeyName: "contaminant_tests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
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
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
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
          brand_id: string | null
          calorie_density: string | null
          created_at: string
          form: string | null
          id: string
          name: string
          product_type: string
          species: string
        }
        Insert: {
          brand_id?: string | null
          calorie_density?: string | null
          created_at?: string
          form?: string | null
          id?: string
          name: string
          product_type?: string
          species?: string
        }
        Update: {
          brand_id?: string | null
          calorie_density?: string | null
          created_at?: string
          form?: string | null
          id?: string
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
          created_at: string
          factors: Json
          food_scan_id: string | null
          grade: string
          id: string
          owner_id: string | null
          product_id: string | null
          summary: string | null
        }
        Insert: {
          created_at?: string
          factors?: Json
          food_scan_id?: string | null
          grade: string
          id?: string
          owner_id?: string | null
          product_id?: string | null
          summary?: string | null
        }
        Update: {
          created_at?: string
          factors?: Json
          food_scan_id?: string | null
          grade?: string
          id?: string
          owner_id?: string | null
          product_id?: string | null
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
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarded: boolean
          premium: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarded?: boolean
          premium?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarded?: boolean
          premium?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recall_events: {
        Row: {
          brand_id: string | null
          created_at: string
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
      triage_results: {
        Row: {
          causes: Json
          changes_urgency: Json
          confidence: string
          created_at: string
          id: string
          owner_id: string
          pet_id: string
          session_id: string | null
          steps: Json
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
          session_id?: string | null
          steps?: Json
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
          session_id?: string | null
          steps?: Json
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

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
