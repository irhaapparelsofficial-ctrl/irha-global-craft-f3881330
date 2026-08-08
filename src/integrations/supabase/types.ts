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
      admin_ai_knowledge: {
        Row: {
          admin_route: string | null
          category: string
          content: string
          created_at: string
          id: string
          instructions: Json
          is_active: boolean
          knowledge_key: string
          owner_approval_required: boolean
          priority: number
          source_reference: string | null
          source_type: string
          tags: string[]
          title: string
          truth_status: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          admin_route?: string | null
          category: string
          content: string
          created_at?: string
          id?: string
          instructions?: Json
          is_active?: boolean
          knowledge_key: string
          owner_approval_required?: boolean
          priority?: number
          source_reference?: string | null
          source_type?: string
          tags?: string[]
          title: string
          truth_status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          admin_route?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          instructions?: Json
          is_active?: boolean
          knowledge_key?: string
          owner_approval_required?: boolean
          priority?: number
          source_reference?: string | null
          source_type?: string
          tags?: string[]
          title?: string
          truth_status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      admin_ai_snapshot_cache: {
        Row: {
          checked_at: string
          id: string
          snapshot: Json
          updated_at: string
        }
        Insert: {
          checked_at?: string
          id?: string
          snapshot?: Json
          updated_at?: string
        }
        Update: {
          checked_at?: string
          id?: string
          snapshot?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ai_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          error: string | null
          executed_at: string | null
          id: string
          payload: Json
          requires_approval: boolean
          result: Json
          risk_level: string
          run_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json
          requires_approval?: boolean
          result?: Json
          risk_level?: string
          run_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json
          requires_approval?: boolean
          result?: Json
          risk_level?: string
          run_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_business_rules: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          rules: Json
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          rules?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          rules?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          command: string
          context_snapshot: Json
          created_at: string
          id: string
          mode: string
          reply: string | null
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          command: string
          context_snapshot?: Json
          created_at?: string
          id?: string
          mode?: string
          reply?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          command?: string
          context_snapshot?: Json
          created_at?: string
          id?: string
          mode?: string
          reply?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_runtime_incidents: {
        Row: {
          component_stack: string | null
          created_at: string
          error_message: string | null
          error_name: string
          id: number
          incident_id: string
          route: string
          source: string
          source_sha: string | null
          user_agent: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          error_message?: string | null
          error_name?: string
          id?: number
          incident_id: string
          route?: string
          source?: string
          source_sha?: string | null
          user_agent?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          error_message?: string | null
          error_name?: string
          id?: number
          incident_id?: string
          route?: string
          source?: string
          source_sha?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          business_rules_version: number | null
          completed_at: string | null
          created_at: string
          error: string | null
          external_execution: boolean
          id: string
          modules: Json
          requested_by: string | null
          started_at: string
          status: string
          summary: Json
          trigger_source: string
        }
        Insert: {
          business_rules_version?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          external_execution?: boolean
          id?: string
          modules?: Json
          requested_by?: string | null
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
        }
        Update: {
          business_rules_version?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          external_execution?: boolean
          id?: string
          modules?: Json
          requested_by?: string | null
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
        }
        Relationships: []
      }
      automation_settings: {
        Row: {
          canva_handoff_enabled: boolean
          created_at: string
          daily_lead_candidate_limit: number
          daily_listing_task_limit: number
          daily_run_time: string
          daily_seo_draft_limit: number
          daily_social_draft_limit: number
          enabled: boolean
          external_listing_publish: boolean
          id: string
          last_run_at: string | null
          lead_auto_import: boolean
          lead_buyer_types: string[]
          lead_markets: string[]
          lead_product_focus: string[]
          leads_enabled: boolean
          listings_enabled: boolean
          next_run_at: string | null
          seo_auto_publish: boolean
          seo_enabled: boolean
          seo_locales: string[]
          social_auto_publish: boolean
          social_enabled: boolean
          social_platforms: string[]
          timezone: string
          updated_at: string
          updated_by: string | null
          weekly_reel_target: number
        }
        Insert: {
          canva_handoff_enabled?: boolean
          created_at?: string
          daily_lead_candidate_limit?: number
          daily_listing_task_limit?: number
          daily_run_time?: string
          daily_seo_draft_limit?: number
          daily_social_draft_limit?: number
          enabled?: boolean
          external_listing_publish?: boolean
          id?: string
          last_run_at?: string | null
          lead_auto_import?: boolean
          lead_buyer_types?: string[]
          lead_markets?: string[]
          lead_product_focus?: string[]
          leads_enabled?: boolean
          listings_enabled?: boolean
          next_run_at?: string | null
          seo_auto_publish?: boolean
          seo_enabled?: boolean
          seo_locales?: string[]
          social_auto_publish?: boolean
          social_enabled?: boolean
          social_platforms?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          weekly_reel_target?: number
        }
        Update: {
          canva_handoff_enabled?: boolean
          created_at?: string
          daily_lead_candidate_limit?: number
          daily_listing_task_limit?: number
          daily_run_time?: string
          daily_seo_draft_limit?: number
          daily_social_draft_limit?: number
          enabled?: boolean
          external_listing_publish?: boolean
          id?: string
          last_run_at?: string | null
          lead_auto_import?: boolean
          lead_buyer_types?: string[]
          lead_markets?: string[]
          lead_product_focus?: string[]
          leads_enabled?: boolean
          listings_enabled?: boolean
          next_run_at?: string | null
          seo_auto_publish?: boolean
          seo_enabled?: boolean
          seo_locales?: string[]
          social_auto_publish?: boolean
          social_enabled?: boolean
          social_platforms?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          weekly_reel_target?: number
        }
        Relationships: []
      }
      automation_task_repair_snapshots: {
        Row: {
          created_at: string
          repair_key: string
          snapshot: Json
          snapshot_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          repair_key: string
          snapshot: Json
          snapshot_id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          repair_key?: string
          snapshot?: Json
          snapshot_id?: string
          task_id?: string
        }
        Relationships: []
      }
      automation_tasks: {
        Row: {
          action: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          error: string | null
          executed_at: string | null
          external_action: boolean
          id: string
          idempotency_key: string
          module: string
          payload: Json
          requires_approval: boolean
          result: Json
          run_id: string | null
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          external_action?: boolean
          id?: string
          idempotency_key: string
          module: string
          payload?: Json
          requires_approval?: boolean
          result?: Json
          run_id?: string | null
          scheduled_for?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          external_action?: boolean
          id?: string
          idempotency_key?: string
          module?: string
          payload?: Json
          requires_approval?: boolean
          result?: Json
          run_id?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_leads: {
        Row: {
          apparel_segment: string | null
          assignee: string | null
          buyer_type: string | null
          company_name: string
          country: string
          created_at: string
          crm_history: Json
          crm_status: string
          email: string | null
          facebook_url: string | null
          follow_up_at: string | null
          id: string
          instagram_url: string | null
          last_gmail_thread_id: string | null
          last_outreach_at: string | null
          last_outreach_status: string | null
          last_reply_at: string | null
          lead_campaign_id: string | null
          lead_status: Database["public"]["Enums"]["lead_status"]
          linkedin_url: string | null
          notes: string | null
          outreach_opt_out: boolean
          phone: string | null
          pi_url: string | null
          priority: string
          quotation_url: string | null
          sample_status: string
          source_provider: string | null
          source_url: string | null
          updated_at: string
          verification_evidence: Json
          verification_score: number | null
          website: string | null
          website_domain: string | null
          whatsapp: string | null
        }
        Insert: {
          apparel_segment?: string | null
          assignee?: string | null
          buyer_type?: string | null
          company_name: string
          country: string
          created_at?: string
          crm_history?: Json
          crm_status?: string
          email?: string | null
          facebook_url?: string | null
          follow_up_at?: string | null
          id?: string
          instagram_url?: string | null
          last_gmail_thread_id?: string | null
          last_outreach_at?: string | null
          last_outreach_status?: string | null
          last_reply_at?: string | null
          lead_campaign_id?: string | null
          lead_status?: Database["public"]["Enums"]["lead_status"]
          linkedin_url?: string | null
          notes?: string | null
          outreach_opt_out?: boolean
          phone?: string | null
          pi_url?: string | null
          priority?: string
          quotation_url?: string | null
          sample_status?: string
          source_provider?: string | null
          source_url?: string | null
          updated_at?: string
          verification_evidence?: Json
          verification_score?: number | null
          website?: string | null
          website_domain?: string | null
          whatsapp?: string | null
        }
        Update: {
          apparel_segment?: string | null
          assignee?: string | null
          buyer_type?: string | null
          company_name?: string
          country?: string
          created_at?: string
          crm_history?: Json
          crm_status?: string
          email?: string | null
          facebook_url?: string | null
          follow_up_at?: string | null
          id?: string
          instagram_url?: string | null
          last_gmail_thread_id?: string | null
          last_outreach_at?: string | null
          last_outreach_status?: string | null
          last_reply_at?: string | null
          lead_campaign_id?: string | null
          lead_status?: Database["public"]["Enums"]["lead_status"]
          linkedin_url?: string | null
          notes?: string | null
          outreach_opt_out?: boolean
          phone?: string | null
          pi_url?: string | null
          priority?: string
          quotation_url?: string | null
          sample_status?: string
          source_provider?: string | null
          source_url?: string | null
          updated_at?: string
          verification_evidence?: Json
          verification_score?: number | null
          website?: string | null
          website_domain?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_leads_lead_campaign_id_fkey"
            columns: ["lead_campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      backend_activation_checkpoints: {
        Row: {
          admin_role_count: number
          auth_user_count: number
          checkpoint_key: string
          created_at: string
          existing_objects: Json
          id: number
          project_ref: string
          recorded_migration_count: number
        }
        Insert: {
          admin_role_count: number
          auth_user_count: number
          checkpoint_key: string
          created_at?: string
          existing_objects?: Json
          id?: number
          project_ref: string
          recorded_migration_count: number
        }
        Update: {
          admin_role_count?: number
          auth_user_count?: number
          checkpoint_key?: string
          created_at?: string
          existing_objects?: Json
          id?: number
          project_ref?: string
          recorded_migration_count?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          body_md: string | null
          canonical_url: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          locale: string
          og_image_url: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body_md?: string | null
          canonical_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          locale?: string
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body_md?: string | null
          canonical_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          locale?: string
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_listings: {
        Row: {
          account_name: string | null
          created_at: string
          id: string
          last_verified_at: string | null
          next_action: string | null
          notes: string | null
          owner: string | null
          platform: string
          profile_url: string | null
          source: string
          status: string
          updated_at: string
          verification_level: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          next_action?: string | null
          notes?: string | null
          owner?: string | null
          platform: string
          profile_url?: string | null
          source?: string
          status?: string
          updated_at?: string
          verification_level?: string
        }
        Update: {
          account_name?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          next_action?: string | null
          notes?: string | null
          owner?: string | null
          platform?: string
          profile_url?: string | null
          source?: string
          status?: string
          updated_at?: string
          verification_level?: string
        }
        Relationships: []
      }
      business_suits: {
        Row: {
          construction: string | null
          created_at: string
          fabric_type: string | null
          gsm_weight: number | null
          id: string
          master_carton_count: number
          pattern: string | null
          status: string
          suit_name: string
        }
        Insert: {
          construction?: string | null
          created_at?: string
          fabric_type?: string | null
          gsm_weight?: number | null
          id?: string
          master_carton_count?: number
          pattern?: string | null
          status?: string
          suit_name: string
        }
        Update: {
          construction?: string | null
          created_at?: string
          fabric_type?: string | null
          gsm_weight?: number | null
          id?: string
          master_carton_count?: number
          pattern?: string | null
          status?: string
          suit_name?: string
        }
        Relationships: []
      }
      catalog_change_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      catalog_drive_files: {
        Row: {
          angle_classification_source: string
          angle_confidence: string
          checksum_sha256: string | null
          discovered_at: string
          drive_file_id: string
          height_px: number | null
          import_attempts: number
          import_status: string
          imported_at: string | null
          last_error: string | null
          media_asset_id: string | null
          mime_type: string | null
          original_bucket: string | null
          original_object_path: string | null
          product_drive_folder_id: string
          public_url: string | null
          published_in_gallery: boolean
          role: Database["public"]["Enums"]["slot_media_role"]
          role_index: number
          size_bytes: number | null
          source_extension: string
          source_mime_type: string
          source_modified_at: string | null
          source_name: string
          source_size_bytes: number | null
          updated_at: string
          visual_review_status: string
          web_bucket: string | null
          web_object_path: string | null
          width_px: number | null
        }
        Insert: {
          angle_classification_source?: string
          angle_confidence?: string
          checksum_sha256?: string | null
          discovered_at?: string
          drive_file_id: string
          height_px?: number | null
          import_attempts?: number
          import_status?: string
          imported_at?: string | null
          last_error?: string | null
          media_asset_id?: string | null
          mime_type?: string | null
          original_bucket?: string | null
          original_object_path?: string | null
          product_drive_folder_id: string
          public_url?: string | null
          published_in_gallery?: boolean
          role: Database["public"]["Enums"]["slot_media_role"]
          role_index?: number
          size_bytes?: number | null
          source_extension: string
          source_mime_type: string
          source_modified_at?: string | null
          source_name: string
          source_size_bytes?: number | null
          updated_at?: string
          visual_review_status?: string
          web_bucket?: string | null
          web_object_path?: string | null
          width_px?: number | null
        }
        Update: {
          angle_classification_source?: string
          angle_confidence?: string
          checksum_sha256?: string | null
          discovered_at?: string
          drive_file_id?: string
          height_px?: number | null
          import_attempts?: number
          import_status?: string
          imported_at?: string | null
          last_error?: string | null
          media_asset_id?: string | null
          mime_type?: string | null
          original_bucket?: string | null
          original_object_path?: string | null
          product_drive_folder_id?: string
          public_url?: string | null
          published_in_gallery?: boolean
          role?: Database["public"]["Enums"]["slot_media_role"]
          role_index?: number
          size_bytes?: number | null
          source_extension?: string
          source_mime_type?: string
          source_modified_at?: string | null
          source_name?: string
          source_size_bytes?: number | null
          updated_at?: string
          visual_review_status?: string
          web_bucket?: string | null
          web_object_path?: string | null
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_drive_files_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_drive_files_product_drive_folder_id_fkey"
            columns: ["product_drive_folder_id"]
            isOneToOne: false
            referencedRelation: "catalog_drive_folders"
            referencedColumns: ["drive_folder_id"]
          },
          {
            foreignKeyName: "catalog_drive_files_product_drive_folder_id_fkey"
            columns: ["product_drive_folder_id"]
            isOneToOne: false
            referencedRelation: "catalog_drive_product_manifest"
            referencedColumns: ["drive_folder_id"]
          },
        ]
      }
      catalog_drive_folders: {
        Row: {
          audience_group: string | null
          child_folder_count: number
          depth: number
          discovered_at: string
          drive_folder_id: string
          duplicate_source_of_folder_id: string | null
          file_count: number
          folder_kind: string
          is_primary_product_source: boolean
          last_error: string | null
          name: string
          normalized_name: string
          normalized_slug: string
          parent_drive_folder_id: string | null
          path_ids: string[]
          path_names: string[]
          product_id: string | null
          product_mapping_confidence: string | null
          product_mapping_source: string | null
          reference_code: string | null
          root_category: string | null
          scan_attempts: number
          scan_status: string
          scanned_at: string | null
          updated_at: string
        }
        Insert: {
          audience_group?: string | null
          child_folder_count?: number
          depth: number
          discovered_at?: string
          drive_folder_id: string
          duplicate_source_of_folder_id?: string | null
          file_count?: number
          folder_kind?: string
          is_primary_product_source?: boolean
          last_error?: string | null
          name: string
          normalized_name: string
          normalized_slug: string
          parent_drive_folder_id?: string | null
          path_ids?: string[]
          path_names?: string[]
          product_id?: string | null
          product_mapping_confidence?: string | null
          product_mapping_source?: string | null
          reference_code?: string | null
          root_category?: string | null
          scan_attempts?: number
          scan_status?: string
          scanned_at?: string | null
          updated_at?: string
        }
        Update: {
          audience_group?: string | null
          child_folder_count?: number
          depth?: number
          discovered_at?: string
          drive_folder_id?: string
          duplicate_source_of_folder_id?: string | null
          file_count?: number
          folder_kind?: string
          is_primary_product_source?: boolean
          last_error?: string | null
          name?: string
          normalized_name?: string
          normalized_slug?: string
          parent_drive_folder_id?: string | null
          path_ids?: string[]
          path_names?: string[]
          product_id?: string | null
          product_mapping_confidence?: string | null
          product_mapping_source?: string | null
          reference_code?: string | null
          root_category?: string | null
          scan_attempts?: number
          scan_status?: string
          scanned_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_drive_folders_duplicate_source_of_folder_id_fkey"
            columns: ["duplicate_source_of_folder_id"]
            isOneToOne: false
            referencedRelation: "catalog_drive_folders"
            referencedColumns: ["drive_folder_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_duplicate_source_of_folder_id_fkey"
            columns: ["duplicate_source_of_folder_id"]
            isOneToOne: false
            referencedRelation: "catalog_drive_product_manifest"
            referencedColumns: ["drive_folder_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_parent_drive_folder_id_fkey"
            columns: ["parent_drive_folder_id"]
            isOneToOne: false
            referencedRelation: "catalog_drive_folders"
            referencedColumns: ["drive_folder_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_parent_drive_folder_id_fkey"
            columns: ["parent_drive_folder_id"]
            isOneToOne: false
            referencedRelation: "catalog_drive_product_manifest"
            referencedColumns: ["drive_folder_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_drive_import_control: {
        Row: {
          enabled: boolean
          expires_at: string
          import_token: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          expires_at: string
          import_token: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          expires_at?: string
          import_token?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      catalog_drive_import_runs: {
        Row: {
          action: string
          completed_at: string | null
          error: string | null
          id: string
          request_id: string | null
          started_at: string
          stats: Json
          status: string
        }
        Insert: {
          action: string
          completed_at?: string | null
          error?: string | null
          id?: string
          request_id?: string | null
          started_at?: string
          stats?: Json
          status?: string
        }
        Update: {
          action?: string
          completed_at?: string | null
          error?: string | null
          id?: string
          request_id?: string | null
          started_at?: string
          stats?: Json
          status?: string
        }
        Relationships: []
      }
      catalog_publication_events: {
        Row: {
          acted_by: string | null
          created_at: string
          event: string
          gate_snapshot: Json
          id: string
          reason: string | null
          reference_code: string
        }
        Insert: {
          acted_by?: string | null
          created_at?: string
          event: string
          gate_snapshot: Json
          id?: string
          reason?: string | null
          reference_code: string
        }
        Update: {
          acted_by?: string | null
          created_at?: string
          event?: string
          gate_snapshot?: Json
          id?: string
          reason?: string | null
          reference_code?: string
        }
        Relationships: []
      }
      catalog_slot_completion: {
        Row: {
          approved_media_count: number
          audience_slug: string
          created_at: string
          factual_description: string | null
          family_slug: string
          id: string
          main_slug: string
          owner_approved_title: string | null
          owner_signed_off: boolean
          publish_state: string
          publishable: boolean | null
          published_at: string | null
          published_by: string | null
          reference_code: string
          slot_slug: string
          spec_sheet_ready: boolean
          taxonomy_assigned: boolean
          unpublished_at: string | null
          unpublished_reason: string | null
          updated_at: string
          updated_by: string | null
          working_title: string
        }
        Insert: {
          approved_media_count?: number
          audience_slug: string
          created_at?: string
          factual_description?: string | null
          family_slug: string
          id?: string
          main_slug: string
          owner_approved_title?: string | null
          owner_signed_off?: boolean
          publish_state?: string
          publishable?: boolean | null
          published_at?: string | null
          published_by?: string | null
          reference_code: string
          slot_slug: string
          spec_sheet_ready?: boolean
          taxonomy_assigned?: boolean
          unpublished_at?: string | null
          unpublished_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          working_title: string
        }
        Update: {
          approved_media_count?: number
          audience_slug?: string
          created_at?: string
          factual_description?: string | null
          family_slug?: string
          id?: string
          main_slug?: string
          owner_approved_title?: string | null
          owner_signed_off?: boolean
          publish_state?: string
          publishable?: boolean | null
          published_at?: string | null
          published_by?: string | null
          reference_code?: string
          slot_slug?: string
          spec_sheet_ready?: boolean
          taxonomy_assigned?: boolean
          unpublished_at?: string | null
          unpublished_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          working_title?: string
        }
        Relationships: []
      }
      catalog_taxonomy_migration_map: {
        Row: {
          created_at: string
          id: string
          legacy_category_id: string | null
          notes: string | null
          product_id: string | null
          redirect_status: string
          source_key: string
          source_kind: string
          source_path: string
          target_full_slug_path: string
          target_node_id: string
          target_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          legacy_category_id?: string | null
          notes?: string | null
          product_id?: string | null
          redirect_status?: string
          source_key: string
          source_kind: string
          source_path: string
          target_full_slug_path: string
          target_node_id: string
          target_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          legacy_category_id?: string | null
          notes?: string | null
          product_id?: string | null
          redirect_status?: string
          source_key?: string
          source_kind?: string
          source_path?: string
          target_full_slug_path?: string
          target_node_id?: string
          target_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_taxonomy_migration_map_legacy_category_id_fkey"
            columns: ["legacy_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_taxonomy_migration_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalog_taxonomy_migration_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalog_taxonomy_migration_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_taxonomy_migration_map_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "catalog_taxonomy_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_taxonomy_nodes: {
        Row: {
          created_at: string
          created_by: string | null
          depth: number
          description: string | null
          full_slug_path: string
          id: string
          image_url: string | null
          media_asset_id: string | null
          name: string
          node_type: string
          parent_id: string | null
          publish_state: string
          redirect_aliases: string[]
          seo_description: string | null
          seo_empty_state_reason: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          depth: number
          description?: string | null
          full_slug_path: string
          id?: string
          image_url?: string | null
          media_asset_id?: string | null
          name: string
          node_type: string
          parent_id?: string | null
          publish_state?: string
          redirect_aliases?: string[]
          seo_description?: string | null
          seo_empty_state_reason?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          depth?: number
          description?: string | null
          full_slug_path?: string
          id?: string
          image_url?: string | null
          media_asset_id?: string | null
          name?: string
          node_type?: string
          parent_id?: string | null
          publish_state?: string
          redirect_aliases?: string[]
          seo_description?: string | null
          seo_empty_state_reason?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_taxonomy_nodes_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_taxonomy_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalog_taxonomy_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_taxonomy_review_events: {
        Row: {
          action: string
          actor_id: string | null
          assignment_count: number
          confirmation: string
          created_at: string
          id: string
          node_count: number
          snapshot: Json
          snapshot_hash: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          assignment_count: number
          confirmation: string
          created_at?: string
          id?: string
          node_count: number
          snapshot: Json
          snapshot_hash: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          assignment_count?: number
          confirmation?: string
          created_at?: string
          id?: string
          node_count?: number
          snapshot?: Json
          snapshot_hash?: string
        }
        Relationships: []
      }
      catalogue_leads: {
        Row: {
          admin_notes: string | null
          assignee: string | null
          catalogue_url: string | null
          category_interest: string | null
          company_name: string | null
          country: string | null
          created_at: string
          crm_history: Json
          email: string | null
          follow_up_at: string | null
          id: string
          language: string | null
          message: string | null
          name: string
          pi_url: string | null
          priority: string
          quotation_url: string | null
          sample_status: string
          source: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string | null
        }
        Insert: {
          admin_notes?: string | null
          assignee?: string | null
          catalogue_url?: string | null
          category_interest?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          crm_history?: Json
          email?: string | null
          follow_up_at?: string | null
          id?: string
          language?: string | null
          message?: string | null
          name: string
          pi_url?: string | null
          priority?: string
          quotation_url?: string | null
          sample_status?: string
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Update: {
          admin_notes?: string | null
          assignee?: string | null
          catalogue_url?: string | null
          category_interest?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          crm_history?: Json
          email?: string | null
          follow_up_at?: string | null
          id?: string
          language?: string | null
          message?: string | null
          name?: string
          pi_url?: string | null
          priority?: string
          quotation_url?: string | null
          sample_status?: string
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          catalog_url: string | null
          created_at: string
          description: string | null
          details: string[]
          id: string
          image_url: string | null
          is_published: boolean
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          short: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          catalog_url?: string | null
          created_at?: string
          description?: string | null
          details?: string[]
          id?: string
          image_url?: string | null
          is_published?: boolean
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          catalog_url?: string | null
          created_at?: string
          description?: string | null
          details?: string[]
          id?: string
          image_url?: string | null
          is_published?: boolean
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel: string
          client_message_id: string | null
          created_at: string
          id: string
          message: string
          role: string
          session_id: string
        }
        Insert: {
          channel?: string
          client_message_id?: string | null
          created_at?: string
          id?: string
          message: string
          role: string
          session_id: string
        }
        Update: {
          channel?: string
          client_message_id?: string | null
          created_at?: string
          id?: string
          message?: string
          role?: string
          session_id?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          admin_seen_at: string | null
          admin_typing_at: string | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          entry_path: string | null
          first_seen_at: string
          human_requested_at: string
          last_admin_message_at: string | null
          last_message_at: string
          last_seen_at: string
          last_user_message_at: string | null
          presence_alerted_at: string | null
          referrer_host: string | null
          session_id: string
          status: string
          updated_at: string
          visitor_city: string | null
          visitor_company: string | null
          visitor_country: string | null
          visitor_country_code: string | null
          visitor_email: string | null
          visitor_language: string | null
          visitor_name: string | null
          visitor_region: string | null
          visitor_requirement: string | null
          visitor_timezone: string | null
          visitor_token_hash: string
          visitor_typing_at: string | null
          visitor_typing_preview: string | null
          visitor_whatsapp: string | null
        }
        Insert: {
          admin_seen_at?: string | null
          admin_typing_at?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          entry_path?: string | null
          first_seen_at?: string
          human_requested_at?: string
          last_admin_message_at?: string | null
          last_message_at?: string
          last_seen_at?: string
          last_user_message_at?: string | null
          presence_alerted_at?: string | null
          referrer_host?: string | null
          session_id: string
          status?: string
          updated_at?: string
          visitor_city?: string | null
          visitor_company?: string | null
          visitor_country?: string | null
          visitor_country_code?: string | null
          visitor_email?: string | null
          visitor_language?: string | null
          visitor_name?: string | null
          visitor_region?: string | null
          visitor_requirement?: string | null
          visitor_timezone?: string | null
          visitor_token_hash: string
          visitor_typing_at?: string | null
          visitor_typing_preview?: string | null
          visitor_whatsapp?: string | null
        }
        Update: {
          admin_seen_at?: string | null
          admin_typing_at?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          entry_path?: string | null
          first_seen_at?: string
          human_requested_at?: string
          last_admin_message_at?: string | null
          last_message_at?: string
          last_seen_at?: string
          last_user_message_at?: string | null
          presence_alerted_at?: string | null
          referrer_host?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          visitor_city?: string | null
          visitor_company?: string | null
          visitor_country?: string | null
          visitor_country_code?: string | null
          visitor_email?: string | null
          visitor_language?: string | null
          visitor_name?: string | null
          visitor_region?: string | null
          visitor_requirement?: string | null
          visitor_timezone?: string | null
          visitor_token_hash?: string
          visitor_typing_at?: string | null
          visitor_typing_preview?: string | null
          visitor_whatsapp?: string | null
        }
        Relationships: []
      }
      cms_document_revisions: {
        Row: {
          action: string
          content: Json
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          version: number
        }
        Insert: {
          action: string
          content: Json
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          version: number
        }
        Update: {
          action?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cms_document_revisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "cms_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_key: string
          document_type: string
          draft_content: Json
          id: string
          published_at: string | null
          published_by: string | null
          published_content: Json | null
          published_version: number | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_key: string
          document_type: string
          draft_content?: Json
          id?: string
          published_at?: string | null
          published_by?: string | null
          published_content?: Json | null
          published_version?: number | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_key?: string
          document_type?: string
          draft_content?: Json
          id?: string
          published_at?: string | null
          published_by?: string | null
          published_content?: Json | null
          published_version?: number | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_change_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      crm_activity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: number
          metadata: Json
          source_id: string
          source_type: string
          summary: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: number
          metadata?: Json
          source_id: string
          source_type: string
          summary: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: number
          metadata?: Json
          source_id?: string
          source_type?: string
          summary?: string
        }
        Relationships: []
      }
      crm_buyer_profiles: {
        Row: {
          address: string | null
          buyer_type: string | null
          company_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          phone: string | null
          preferred_language: string | null
          product_interest: string | null
          quantity: string | null
          source_id: string
          source_type: string
          timezone: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          buyer_type?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          preferred_language?: string | null
          product_interest?: string | null
          quantity?: string | null
          source_id: string
          source_type: string
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          buyer_type?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          preferred_language?: string | null
          product_interest?: string | null
          quantity?: string | null
          source_id?: string
          source_type?: string
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      crm_communications: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          direction: string
          external_url: string | null
          id: string
          metadata: Json
          occurred_at: string
          source_id: string
          source_type: string
          status: string
          subject: string | null
          summary: string
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          direction: string
          external_url?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          source_id: string
          source_type: string
          status?: string
          subject?: string | null
          summary: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          external_url?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          source_id?: string
          source_type?: string
          status?: string
          subject?: string | null
          summary?: string
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          linkedin_url: string | null
          name: string
          phone: string | null
          source_id: string
          source_type: string
          status: string
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          name: string
          phone?: string | null
          source_id: string
          source_type: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          source_id?: string
          source_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      crm_daily_reports: {
        Row: {
          created_at: string
          generated_at: string
          generated_by: string | null
          generated_by_user_id: string | null
          highlights: Json
          id: string
          metrics: Json
          report_date: string
          updated_at: string
          workload: Json
        }
        Insert: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          generated_by_user_id?: string | null
          highlights?: Json
          id?: string
          metrics: Json
          report_date: string
          updated_at?: string
          workload?: Json
        }
        Update: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          generated_by_user_id?: string | null
          highlights?: Json
          id?: string
          metrics?: Json
          report_date?: string
          updated_at?: string
          workload?: Json
        }
        Relationships: []
      }
      crm_files: {
        Row: {
          bucket: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string
          id: string
          mime_type: string
          object_path: string
          size_bytes: number
          source_id: string
          source_type: string
        }
        Insert: {
          bucket?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          id?: string
          mime_type: string
          object_path: string
          size_bytes: number
          source_id: string
          source_type: string
        }
        Update: {
          bucket?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          object_path?: string
          size_bytes?: number
          source_id?: string
          source_type?: string
        }
        Relationships: []
      }
      crm_meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          location_url: string | null
          meeting_reference: string
          meeting_type: string
          outcome_notes: string | null
          source_id: string
          source_type: string
          start_at: string
          status: string
          timezone: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          location_url?: string | null
          meeting_reference?: string
          meeting_type: string
          outcome_notes?: string | null
          source_id: string
          source_type: string
          start_at: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          location_url?: string | null
          meeting_reference?: string
          meeting_type?: string
          outcome_notes?: string | null
          source_id?: string
          source_type?: string
          start_at?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          pinned: boolean
          source_id: string
          source_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          pinned?: boolean
          source_id: string
          source_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          pinned?: boolean
          source_id?: string
          source_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_notifications: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          dedupe_key: string
          id: string
          metadata: Json
          notification_type: string
          read_at: string | null
          severity: string
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          body?: string
          created_at?: string
          dedupe_key: string
          id?: string
          metadata?: Json
          notification_type: string
          read_at?: string | null
          severity?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          metadata?: Json
          notification_type?: string
          read_at?: string | null
          severity?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_quotation_items: {
        Row: {
          created_at: string
          description: string
          id: string
          line_total: number | null
          quantity: number
          quotation_id: string
          sort_order: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_total?: number | null
          quantity: number
          quotation_id: string
          sort_order?: number
          unit?: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_total?: number | null
          quantity?: number
          quotation_id?: string
          sort_order?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "crm_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quotations: {
        Row: {
          accepted_at: string | null
          buyer_email: string | null
          buyer_name: string
          company: string | null
          created_at: string
          created_by: string | null
          currency: string
          destination_country: string | null
          discount_amount: number
          id: string
          incoterm: string
          notes: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          payment_terms: string
          quotation_number: string
          sent_at: string | null
          shipping_amount: number
          shipping_scope: string
          source_id: string
          source_type: string
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string
        }
        Insert: {
          accepted_at?: string | null
          buyer_email?: string | null
          buyer_name?: string
          company?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          destination_country?: string | null
          discount_amount?: number
          id?: string
          incoterm: string
          notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          payment_terms: string
          quotation_number?: string
          sent_at?: string | null
          shipping_amount?: number
          shipping_scope: string
          source_id: string
          source_type: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until: string
        }
        Update: {
          accepted_at?: string | null
          buyer_email?: string | null
          buyer_name?: string
          company?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          destination_country?: string | null
          discount_amount?: number
          id?: string
          incoterm?: string
          notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          payment_terms?: string
          quotation_number?: string
          sent_at?: string | null
          shipping_amount?: number
          shipping_scope?: string
          source_id?: string
          source_type?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      crm_record_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          left_source_id: string
          left_source_type: string
          link_type: string
          reason: string | null
          right_source_id: string
          right_source_type: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          left_source_id: string
          left_source_type: string
          link_type: string
          reason?: string | null
          right_source_id: string
          right_source_type: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          left_source_id?: string
          left_source_type?: string
          link_type?: string
          reason?: string | null
          right_source_id?: string
          right_source_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_samples: {
        Row: {
          approved_at: string | null
          courier: string | null
          created_at: string
          created_by: string | null
          currency: string
          feedback: string | null
          id: string
          notes: string | null
          product: string
          quantity: number
          requested_at: string
          requirements: string
          sample_cost: number
          sample_reference: string
          sent_at: string | null
          shipping_cost: number
          source_id: string
          source_type: string
          status: string
          tracking_number: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          courier?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          feedback?: string | null
          id?: string
          notes?: string | null
          product: string
          quantity?: number
          requested_at?: string
          requirements: string
          sample_cost?: number
          sample_reference?: string
          sent_at?: string | null
          shipping_cost?: number
          source_id: string
          source_type: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          courier?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          feedback?: string | null
          id?: string
          notes?: string | null
          product?: string
          quantity?: number
          requested_at?: string
          requirements?: string
          sample_cost?: number
          sample_reference?: string
          sent_at?: string | null
          shipping_cost?: number
          source_id?: string
          source_type?: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_saved_views: {
        Row: {
          created_at: string
          created_by: string | null
          filters: Json
          id: string
          is_default: boolean
          module: string
          name: string
          owner_user_id: string | null
          preset_key: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filters?: Json
          id?: string
          is_default?: boolean
          module: string
          name: string
          owner_user_id?: string | null
          preset_key: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filters?: Json
          id?: string
          is_default?: boolean
          module?: string
          name?: string
          owner_user_id?: string | null
          preset_key?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          priority: string
          source_id: string
          source_type: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          source_id: string
          source_type: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          source_id?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_team_members: {
        Row: {
          active: boolean
          can_approve_quotes: boolean
          can_send: boolean
          created_at: string
          created_by: string | null
          email: string
          id: string
          name: string
          notes: string | null
          role: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          can_approve_quotes?: boolean
          can_send?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          role?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          can_approve_quotes?: boolean
          can_send?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          role?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_workspace_preferences: {
        Row: {
          compact_mode: boolean
          created_at: string
          daily_report_enabled: boolean
          daily_report_hour: number
          default_admin_view: string
          default_saved_view_id: string | null
          preferences: Json
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          compact_mode?: boolean
          created_at?: string
          daily_report_enabled?: boolean
          daily_report_hour?: number
          default_admin_view?: string
          default_saved_view_id?: string | null
          preferences?: Json
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          compact_mode?: boolean
          created_at?: string
          daily_report_enabled?: boolean
          daily_report_hour?: number
          default_admin_view?: string
          default_saved_view_id?: string | null
          preferences?: Json
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workspace_preferences_default_saved_view_id_fkey"
            columns: ["default_saved_view_id"]
            isOneToOne: false
            referencedRelation: "crm_saved_views"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_published: boolean
          locale: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          locale?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          locale?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gmail_inbox_items: {
        Row: {
          category: string
          created_at: string
          gmail_message_id: string
          gmail_thread_id: string | null
          gmail_url: string | null
          has_attachment: boolean
          id: string
          importance: string
          is_unread: boolean
          linked_lead_id: string | null
          raw_metadata: Json
          received_at: string
          recipient_email: string | null
          recommended_action: string | null
          reply_draft: string | null
          sender_email: string | null
          sender_name: string | null
          snippet: string | null
          status: string
          subject: string
          summary_roman_urdu: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          gmail_message_id: string
          gmail_thread_id?: string | null
          gmail_url?: string | null
          has_attachment?: boolean
          id?: string
          importance?: string
          is_unread?: boolean
          linked_lead_id?: string | null
          raw_metadata?: Json
          received_at: string
          recipient_email?: string | null
          recommended_action?: string | null
          reply_draft?: string | null
          sender_email?: string | null
          sender_name?: string | null
          snippet?: string | null
          status?: string
          subject?: string
          summary_roman_urdu?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          gmail_message_id?: string
          gmail_thread_id?: string | null
          gmail_url?: string | null
          has_attachment?: boolean
          id?: string
          importance?: string
          is_unread?: boolean
          linked_lead_id?: string | null
          raw_metadata?: Json
          received_at?: string
          recipient_email?: string | null
          recommended_action?: string | null
          reply_draft?: string | null
          sender_email?: string | null
          sender_name?: string | null
          snippet?: string | null
          status?: string
          subject?: string
          summary_roman_urdu?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_inbox_items_linked_lead_id_fkey"
            columns: ["linked_lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_sync_state: {
        Row: {
          id: string
          last_error: string | null
          last_message_at: string | null
          last_status: string
          last_synced_at: string | null
          meaningful_messages_saved: number
          messages_seen: number
          updated_at: string
        }
        Insert: {
          id?: string
          last_error?: string | null
          last_message_at?: string | null
          last_status?: string
          last_synced_at?: string | null
          meaningful_messages_saved?: number
          messages_seen?: number
          updated_at?: string
        }
        Update: {
          id?: string
          last_error?: string | null
          last_message_at?: string | null
          last_status?: string
          last_synced_at?: string | null
          meaningful_messages_saved?: number
          messages_seen?: number
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          admin_notes: string | null
          assignee: string | null
          category: string | null
          company: string | null
          country: string | null
          created_at: string
          crm_history: Json
          email: string | null
          follow_up_at: string | null
          id: string
          inquiry_ref: string | null
          intent: string | null
          lead_context: Json
          message: string | null
          name: string
          phone: string | null
          pi_url: string | null
          priority: string
          profile_id: string | null
          quantity: string | null
          quotation_url: string | null
          sample_status: string
          source: string | null
          status: string
          tech_pack_paths: string[]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assignee?: string | null
          category?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          crm_history?: Json
          email?: string | null
          follow_up_at?: string | null
          id?: string
          inquiry_ref?: string | null
          intent?: string | null
          lead_context?: Json
          message?: string | null
          name: string
          phone?: string | null
          pi_url?: string | null
          priority?: string
          profile_id?: string | null
          quantity?: string | null
          quotation_url?: string | null
          sample_status?: string
          source?: string | null
          status?: string
          tech_pack_paths?: string[]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assignee?: string | null
          category?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          crm_history?: Json
          email?: string | null
          follow_up_at?: string | null
          id?: string
          inquiry_ref?: string | null
          intent?: string | null
          lead_context?: Json
          message?: string | null
          name?: string
          phone?: string | null
          pi_url?: string | null
          priority?: string
          profile_id?: string | null
          quantity?: string | null
          quotation_url?: string | null
          sample_status?: string
          source?: string | null
          status?: string
          tech_pack_paths?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_items: {
        Row: {
          buyer_notes: string | null
          category_slug: string | null
          created_at: string
          id: string
          inquiry_id: string
          product_id: string | null
          product_name: string
          product_slug: string
          size_breakdown: string | null
          target_quantity: number
        }
        Insert: {
          buyer_notes?: string | null
          category_slug?: string | null
          created_at?: string
          id?: string
          inquiry_id: string
          product_id?: string | null
          product_name: string
          product_slug: string
          size_breakdown?: string | null
          target_quantity: number
        }
        Update: {
          buyer_notes?: string | null
          category_slug?: string | null
          created_at?: string
          id?: string
          inquiry_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string
          size_breakdown?: string | null
          target_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_items_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      instagram_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          instagram_account_id: string
          last_message_at: string | null
          last_message_preview: string | null
          meta_conversation_id: string
          metadata: Json
          participant_igsid: string
          participant_name: string | null
          participant_username: string | null
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          instagram_account_id: string
          last_message_at?: string | null
          last_message_preview?: string | null
          meta_conversation_id: string
          metadata?: Json
          participant_igsid: string
          participant_name?: string | null
          participant_username?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          instagram_account_id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          meta_conversation_id?: string
          metadata?: Json
          participant_igsid?: string
          participant_name?: string | null
          participant_username?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      instagram_messages: {
        Row: {
          attachments: Json
          body: string | null
          conversation_id: string
          created_at: string
          delivery_status: string
          direction: string
          id: string
          idempotency_key: string | null
          message_type: string
          meta_message_id: string | null
          raw_payload: Json
          recipient_igsid: string | null
          sender_igsid: string | null
          sent_at: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          conversation_id: string
          created_at?: string
          delivery_status?: string
          direction: string
          id?: string
          idempotency_key?: string | null
          message_type?: string
          meta_message_id?: string | null
          raw_payload?: Json
          recipient_igsid?: string | null
          sender_igsid?: string | null
          sent_at: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          conversation_id?: string
          created_at?: string
          delivery_status?: string
          direction?: string
          id?: string
          idempotency_key?: string | null
          message_type?: string
          meta_message_id?: string | null
          raw_payload?: Json
          recipient_igsid?: string | null
          sender_igsid?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instagram_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_reply_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          conversation_id: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          sent_message_id: string | null
          source: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          sent_message_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          sent_message_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "instagram_reply_drafts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instagram_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_reply_drafts_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "instagram_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_webhook_events: {
        Row: {
          dedupe_key: string
          error_message: string | null
          id: string
          object_type: string | null
          payload: Json
          processed_at: string | null
          processing_status: string
          received_at: string
          signature_valid: boolean
        }
        Insert: {
          dedupe_key: string
          error_message?: string | null
          id?: string
          object_type?: string | null
          payload: Json
          processed_at?: string | null
          processing_status?: string
          received_at?: string
          signature_valid?: boolean
        }
        Update: {
          dedupe_key?: string
          error_message?: string | null
          id?: string
          object_type?: string | null
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          received_at?: string
          signature_valid?: boolean
        }
        Relationships: []
      }
      internal_asset_migration_control: {
        Row: {
          created_at: string
          enabled: boolean
          expires_at: string
          id: string
          max_batch: number
          source_hosts: string[]
          target_bucket: string
          token_hash: string
          token_plaintext: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          expires_at: string
          id: string
          max_batch?: number
          source_hosts?: string[]
          target_bucket?: string
          token_hash: string
          token_plaintext?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          expires_at?: string
          id?: string
          max_batch?: number
          source_hosts?: string[]
          target_bucket?: string
          token_hash?: string
          token_plaintext?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_links: {
        Row: {
          anchor_text: string
          created_at: string
          from_route: string
          id: string
          is_published: boolean
          locale: string
          priority: number
          to_route: string
          updated_at: string
        }
        Insert: {
          anchor_text: string
          created_at?: string
          from_route: string
          id?: string
          is_published?: boolean
          locale?: string
          priority?: number
          to_route: string
          updated_at?: string
        }
        Update: {
          anchor_text?: string
          created_at?: string
          from_route?: string
          id?: string
          is_published?: boolean
          locale?: string
          priority?: number
          to_route?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_media_integrity_audits: {
        Row: {
          audit_name: string
          created_at: string
          details: Json
          id: string
          summary: Json
        }
        Insert: {
          audit_name: string
          created_at?: string
          details?: Json
          id?: string
          summary?: Json
        }
        Update: {
          audit_name?: string
          created_at?: string
          details?: Json
          id?: string
          summary?: Json
        }
        Relationships: []
      }
      internal_release_storage_refs_e001: {
        Row: {
          bucket_id: string
          build_sha: string
          created_at: string | null
          main_sha: string | null
          object_path: string
          recorded_at: string
          source: string
        }
        Insert: {
          bucket_id: string
          build_sha: string
          created_at?: string | null
          main_sha?: string | null
          object_path: string
          recorded_at?: string
          source?: string
        }
        Update: {
          bucket_id?: string
          build_sha?: string
          created_at?: string | null
          main_sha?: string | null
          object_path?: string
          recorded_at?: string
          source?: string
        }
        Relationships: []
      }
      internal_storage_cleanup_control: {
        Row: {
          approved: boolean | null
          created_at: string
          disabled_at: string | null
          enabled: boolean
          execution_id: string | null
          expected_release_ref_count: number | null
          expires_at: string
          id: string
          main_sha: string | null
          max_batch: number
          plan_checksum: string | null
          project_ref: string | null
          token_hash: string
          token_plaintext: string | null
          token_sha256: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          disabled_at?: string | null
          enabled?: boolean
          execution_id?: string | null
          expected_release_ref_count?: number | null
          expires_at: string
          id: string
          main_sha?: string | null
          max_batch?: number
          plan_checksum?: string | null
          project_ref?: string | null
          token_hash: string
          token_plaintext?: string | null
          token_sha256?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          disabled_at?: string | null
          enabled?: boolean
          execution_id?: string | null
          expected_release_ref_count?: number | null
          expires_at?: string
          id?: string
          main_sha?: string | null
          max_batch?: number
          plan_checksum?: string | null
          project_ref?: string | null
          token_hash?: string
          token_plaintext?: string | null
          token_sha256?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_storage_cleanup_manifest_e001: {
        Row: {
          bucket_id: string
          canonical_bucket_id: string | null
          canonical_object_id: string | null
          canonical_object_path: string | null
          checksum: string | null
          classification: string | null
          cleanup_id: string
          created_at_source: string | null
          deleted_at: string | null
          deletion_error: string | null
          etag: string | null
          execution_id: string | null
          failure: string | null
          id: string
          object_id: string | null
          object_path: string
          object_size: number | null
          planned_at: string | null
          protected_reference_count: number | null
          reason: string
          recorded_at: string
          removed_at: string | null
          size_bytes: number
          source_object_path: string | null
          status: string
          verified_absent_at: string | null
        }
        Insert: {
          bucket_id: string
          canonical_bucket_id?: string | null
          canonical_object_id?: string | null
          canonical_object_path?: string | null
          checksum?: string | null
          classification?: string | null
          cleanup_id: string
          created_at_source?: string | null
          deleted_at?: string | null
          deletion_error?: string | null
          etag?: string | null
          execution_id?: string | null
          failure?: string | null
          id?: string
          object_id?: string | null
          object_path: string
          object_size?: number | null
          planned_at?: string | null
          protected_reference_count?: number | null
          reason: string
          recorded_at?: string
          removed_at?: string | null
          size_bytes: number
          source_object_path?: string | null
          status?: string
          verified_absent_at?: string | null
        }
        Update: {
          bucket_id?: string
          canonical_bucket_id?: string | null
          canonical_object_id?: string | null
          canonical_object_path?: string | null
          checksum?: string | null
          classification?: string | null
          cleanup_id?: string
          created_at_source?: string | null
          deleted_at?: string | null
          deletion_error?: string | null
          etag?: string | null
          execution_id?: string | null
          failure?: string | null
          id?: string
          object_id?: string | null
          object_path?: string
          object_size?: number | null
          planned_at?: string | null
          protected_reference_count?: number | null
          reason?: string
          recorded_at?: string
          removed_at?: string | null
          size_bytes?: number
          source_object_path?: string | null
          status?: string
          verified_absent_at?: string | null
        }
        Relationships: []
      }
      internal_storage_cleanup_runs: {
        Row: {
          cleanup_id: string
          created_at: string
          failed_count: number
          failures: Json
          id: string
          removed_count: number
          removed_paths: string[]
          selected_count: number
        }
        Insert: {
          cleanup_id: string
          created_at?: string
          failed_count?: number
          failures?: Json
          id?: string
          removed_count?: number
          removed_paths?: string[]
          selected_count?: number
        }
        Update: {
          cleanup_id?: string
          created_at?: string
          failed_count?: number
          failures?: Json
          id?: string
          removed_count?: number
          removed_paths?: string[]
          selected_count?: number
        }
        Relationships: []
      }
      internal_storage_cleanup_validation_e001: {
        Row: {
          approved: boolean
          approved_at: string | null
          candidate_bytes: number
          candidate_count: number
          execution_id: string
          main_sha: string
          missing_release_ref_count: number
          object_bytes: number
          object_count: number
          plan_checksum: string | null
          planned_at: string | null
          project_ref: string
          protected_ref_count: number
          release_ref_count: number
          updated_at: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          candidate_bytes?: number
          candidate_count?: number
          execution_id: string
          main_sha: string
          missing_release_ref_count?: number
          object_bytes?: number
          object_count?: number
          plan_checksum?: string | null
          planned_at?: string | null
          project_ref: string
          protected_ref_count?: number
          release_ref_count?: number
          updated_at?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          candidate_bytes?: number
          candidate_count?: number
          execution_id?: string
          main_sha?: string
          missing_release_ref_count?: number
          object_bytes?: number
          object_count?: number
          plan_checksum?: string | null
          planned_at?: string | null
          project_ref?: string
          protected_ref_count?: number
          release_ref_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      internal_storage_protected_refs_e001: {
        Row: {
          bucket_id: string
          created_at: string
          execution_id: string
          main_sha: string | null
          object_path: string
          source: string
          source_relation: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          execution_id: string
          main_sha?: string | null
          object_path: string
          source: string
          source_relation: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          execution_id?: string
          main_sha?: string | null
          object_path?: string
          source?: string
          source_relation?: string
        }
        Relationships: []
      }
      lead_activation_batches: {
        Row: {
          candidate_ids: string[]
          completed_at: string | null
          created_at: string
          errors: Json
          failed_count: number
          id: string
          imported_count: number
          imported_lead_ids: string[]
          requested_by: string | null
          rolled_back_at: string | null
          skipped_count: number
          status: string
          strict_ready_count: number
          summary: Json
        }
        Insert: {
          candidate_ids?: string[]
          completed_at?: string | null
          created_at?: string
          errors?: Json
          failed_count?: number
          id?: string
          imported_count?: number
          imported_lead_ids?: string[]
          requested_by?: string | null
          rolled_back_at?: string | null
          skipped_count?: number
          status?: string
          strict_ready_count?: number
          summary?: Json
        }
        Update: {
          candidate_ids?: string[]
          completed_at?: string | null
          created_at?: string
          errors?: Json
          failed_count?: number
          id?: string
          imported_count?: number
          imported_lead_ids?: string[]
          requested_by?: string | null
          rolled_back_at?: string | null
          skipped_count?: number
          status?: string
          strict_ready_count?: number
          summary?: Json
        }
        Relationships: []
      }
      lead_activation_events: {
        Row: {
          actor: string | null
          batch_id: string
          candidate_id: string | null
          created_at: string
          detail: Json
          event_type: string
          id: string
          lead_id: string | null
        }
        Insert: {
          actor?: string | null
          batch_id: string
          candidate_id?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          lead_id?: string | null
        }
        Update: {
          actor?: string | null
          batch_id?: string
          candidate_id?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activation_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "lead_activation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activation_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "lead_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_campaigns: {
        Row: {
          buyer_types: string[]
          created_at: string
          discovered_count: number
          error: string | null
          id: string
          imported_count: number
          last_run_at: string | null
          market: string
          name: string
          product_focus: string[]
          requested_by: string | null
          reviewed_count: number
          search_queries: string[]
          source_providers: string[]
          status: string
          target_count: number
          updated_at: string
          verified_count: number
        }
        Insert: {
          buyer_types?: string[]
          created_at?: string
          discovered_count?: number
          error?: string | null
          id?: string
          imported_count?: number
          last_run_at?: string | null
          market: string
          name: string
          product_focus?: string[]
          requested_by?: string | null
          reviewed_count?: number
          search_queries?: string[]
          source_providers?: string[]
          status?: string
          target_count?: number
          updated_at?: string
          verified_count?: number
        }
        Update: {
          buyer_types?: string[]
          created_at?: string
          discovered_count?: number
          error?: string | null
          id?: string
          imported_count?: number
          last_run_at?: string | null
          market?: string
          name?: string
          product_focus?: string[]
          requested_by?: string | null
          reviewed_count?: number
          search_queries?: string[]
          source_providers?: string[]
          status?: string
          target_count?: number
          updated_at?: string
          verified_count?: number
        }
        Relationships: []
      }
      lead_candidates: {
        Row: {
          activation_claim_token: string | null
          activation_claimed_at: string | null
          buyer_type: string | null
          campaign_id: string
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          duplicate_of: string | null
          duplicate_reason: string | null
          email: string | null
          evidence: Json
          facebook_url: string | null
          id: string
          import_fingerprint: string | null
          imported_lead_id: string | null
          instagram_url: string | null
          linkedin_url: string | null
          phone: string | null
          product_fit: string[]
          raw_data: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source_excerpt: string | null
          source_provider: string
          source_query: string | null
          source_title: string | null
          source_url: string
          updated_at: string
          verification_score: number
          verification_status: string
          website: string | null
          website_domain: string | null
          whatsapp: string | null
        }
        Insert: {
          activation_claim_token?: string | null
          activation_claimed_at?: string | null
          buyer_type?: string | null
          campaign_id: string
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          duplicate_of?: string | null
          duplicate_reason?: string | null
          email?: string | null
          evidence?: Json
          facebook_url?: string | null
          id?: string
          import_fingerprint?: string | null
          imported_lead_id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          product_fit?: string[]
          raw_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_excerpt?: string | null
          source_provider?: string
          source_query?: string | null
          source_title?: string | null
          source_url: string
          updated_at?: string
          verification_score?: number
          verification_status?: string
          website?: string | null
          website_domain?: string | null
          whatsapp?: string | null
        }
        Update: {
          activation_claim_token?: string | null
          activation_claimed_at?: string | null
          buyer_type?: string | null
          campaign_id?: string
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          duplicate_of?: string | null
          duplicate_reason?: string | null
          email?: string | null
          evidence?: Json
          facebook_url?: string | null
          id?: string
          import_fingerprint?: string | null
          imported_lead_id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          product_fit?: string[]
          raw_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_excerpt?: string | null
          source_provider?: string
          source_query?: string | null
          source_title?: string | null
          source_url?: string
          updated_at?: string
          verification_score?: number
          verification_status?: string
          website?: string | null
          website_domain?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_candidates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_candidates_imported_lead_id_fkey"
            columns: ["imported_lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_import_files: {
        Row: {
          blocked_count: number
          bucket: string
          campaign_id: string
          checksum_sha256: string | null
          created_at: string
          created_by: string | null
          duplicate_count: number
          error: string | null
          file_name: string
          id: string
          mime_type: string
          object_path: string
          parsed_row_count: number
          sheet_name: string | null
          size_bytes: number
          staged_row_count: number
          status: string
          updated_at: string
        }
        Insert: {
          blocked_count?: number
          bucket?: string
          campaign_id: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          error?: string | null
          file_name: string
          id?: string
          mime_type: string
          object_path: string
          parsed_row_count?: number
          sheet_name?: string | null
          size_bytes: number
          staged_row_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          blocked_count?: number
          bucket?: string
          campaign_id?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          error?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          object_path?: string
          parsed_row_count?: number
          sheet_name?: string | null
          size_bytes?: number
          staged_row_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_import_files_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_search_runs: {
        Row: {
          campaign_id: string
          completed_at: string | null
          error: string | null
          id: string
          provider: string
          query: string
          response_meta: Json
          result_count: number
          started_at: string
          status: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          error?: string | null
          id?: string
          provider?: string
          query: string
          response_meta?: Json
          result_count?: number
          started_at?: string
          status?: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          error?: string | null
          id?: string
          provider?: string
          query?: string
          response_meta?: Json
          result_count?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_search_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_file_links: {
        Row: {
          candidate_id: string | null
          created_at: string
          created_by: string | null
          id: string
          import_file_id: string
          lead_id: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          import_file_id: string
          lead_id: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          import_file_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_source_file_links_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "lead_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_source_file_links_import_file_id_fkey"
            columns: ["import_file_id"]
            isOneToOne: false
            referencedRelation: "lead_import_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_source_file_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_route_redirects: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          confidence: string
          created_at: string
          created_by: string | null
          from_path: string
          id: string
          reason: string | null
          to_path: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          from_path: string
          id?: string
          reason?: string | null
          to_path: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          from_path?: string
          id?: string
          reason?: string | null
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      master_cartons: {
        Row: {
          carton_number: string | null
          created_at: string
          current_status: string
          id: string
          product_link: string | null
          units_per_carton: number
        }
        Insert: {
          carton_number?: string | null
          created_at?: string
          current_status?: string
          id?: string
          product_link?: string | null
          units_per_carton?: number
        }
        Update: {
          carton_number?: string | null
          created_at?: string
          current_status?: string
          id?: string
          product_link?: string | null
          units_per_carton?: number
        }
        Relationships: []
      }
      media_asset_events: {
        Row: {
          action: string
          actor_id: string | null
          after_record: Json | null
          before_record: Json | null
          created_at: string
          id: number
          media_asset_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_record?: Json | null
          before_record?: Json | null
          created_at?: string
          id?: number
          media_asset_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_record?: Json | null
          before_record?: Json | null
          created_at?: string
          id?: number
          media_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_events_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          ai_background_hex: string
          ai_background_normalized: boolean
          ai_background_style: string
          ai_enhanced: boolean
          ai_master_bucket: string | null
          ai_master_height_px: number | null
          ai_master_object_path: string | null
          ai_master_url: string | null
          ai_master_width_px: number | null
          ai_processed_at: string | null
          ai_processing_attempts: number
          ai_processing_error: string | null
          ai_processing_lock_token: string | null
          ai_processing_locked_at: string | null
          ai_processing_source: string
          ai_processing_status: string
          ai_processing_worker: string | null
          ai_quality_score: number | null
          ai_review_reason: string | null
          ai_source_height_px: number | null
          ai_source_width_px: number | null
          ai_upscaled: boolean
          alt_text: string | null
          bucket: string
          checksum_sha256: string | null
          created_at: string
          created_by: string | null
          duplicate_kind: string | null
          duplicate_of: string | null
          duplicate_status: string
          duration_ms: number | null
          file_name: string
          height_px: number | null
          id: string
          mime_type: string
          object_path: string
          public_url: string
          replacement_history: Json
          responsive_attempted_at: string | null
          responsive_error: string | null
          responsive_format: string | null
          responsive_generated_at: string | null
          responsive_total_size_bytes: number | null
          responsive_widths: number[] | null
          size_bytes: number
          social_approved: boolean
          social_approved_at: string | null
          social_approved_by: string | null
          source_drive_file_id: string | null
          source_kind: string | null
          status: string
          tags: string[]
          thumbnail_bucket: string | null
          thumbnail_generated_at: string | null
          thumbnail_height_px: number | null
          thumbnail_object_path: string | null
          thumbnail_size_bytes: number | null
          thumbnail_url: string | null
          thumbnail_width_px: number | null
          title: string | null
          updated_at: string
          updated_by: string | null
          usage_notes: string | null
          verification_status: string
          width_px: number | null
        }
        Insert: {
          ai_background_hex?: string
          ai_background_normalized?: boolean
          ai_background_style?: string
          ai_enhanced?: boolean
          ai_master_bucket?: string | null
          ai_master_height_px?: number | null
          ai_master_object_path?: string | null
          ai_master_url?: string | null
          ai_master_width_px?: number | null
          ai_processed_at?: string | null
          ai_processing_attempts?: number
          ai_processing_error?: string | null
          ai_processing_lock_token?: string | null
          ai_processing_locked_at?: string | null
          ai_processing_source?: string
          ai_processing_status?: string
          ai_processing_worker?: string | null
          ai_quality_score?: number | null
          ai_review_reason?: string | null
          ai_source_height_px?: number | null
          ai_source_width_px?: number | null
          ai_upscaled?: boolean
          alt_text?: string | null
          bucket?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_kind?: string | null
          duplicate_of?: string | null
          duplicate_status?: string
          duration_ms?: number | null
          file_name: string
          height_px?: number | null
          id?: string
          mime_type: string
          object_path: string
          public_url: string
          replacement_history?: Json
          responsive_attempted_at?: string | null
          responsive_error?: string | null
          responsive_format?: string | null
          responsive_generated_at?: string | null
          responsive_total_size_bytes?: number | null
          responsive_widths?: number[] | null
          size_bytes: number
          social_approved?: boolean
          social_approved_at?: string | null
          social_approved_by?: string | null
          source_drive_file_id?: string | null
          source_kind?: string | null
          status?: string
          tags?: string[]
          thumbnail_bucket?: string | null
          thumbnail_generated_at?: string | null
          thumbnail_height_px?: number | null
          thumbnail_object_path?: string | null
          thumbnail_size_bytes?: number | null
          thumbnail_url?: string | null
          thumbnail_width_px?: number | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_notes?: string | null
          verification_status?: string
          width_px?: number | null
        }
        Update: {
          ai_background_hex?: string
          ai_background_normalized?: boolean
          ai_background_style?: string
          ai_enhanced?: boolean
          ai_master_bucket?: string | null
          ai_master_height_px?: number | null
          ai_master_object_path?: string | null
          ai_master_url?: string | null
          ai_master_width_px?: number | null
          ai_processed_at?: string | null
          ai_processing_attempts?: number
          ai_processing_error?: string | null
          ai_processing_lock_token?: string | null
          ai_processing_locked_at?: string | null
          ai_processing_source?: string
          ai_processing_status?: string
          ai_processing_worker?: string | null
          ai_quality_score?: number | null
          ai_review_reason?: string | null
          ai_source_height_px?: number | null
          ai_source_width_px?: number | null
          ai_upscaled?: boolean
          alt_text?: string | null
          bucket?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_kind?: string | null
          duplicate_of?: string | null
          duplicate_status?: string
          duration_ms?: number | null
          file_name?: string
          height_px?: number | null
          id?: string
          mime_type?: string
          object_path?: string
          public_url?: string
          replacement_history?: Json
          responsive_attempted_at?: string | null
          responsive_error?: string | null
          responsive_format?: string | null
          responsive_generated_at?: string | null
          responsive_total_size_bytes?: number | null
          responsive_widths?: number[] | null
          size_bytes?: number
          social_approved?: boolean
          social_approved_at?: string | null
          social_approved_by?: string | null
          source_drive_file_id?: string | null
          source_kind?: string | null
          status?: string
          tags?: string[]
          thumbnail_bucket?: string | null
          thumbnail_generated_at?: string | null
          thumbnail_height_px?: number | null
          thumbnail_object_path?: string | null
          thumbnail_size_bytes?: number | null
          thumbnail_url?: string | null
          thumbnail_width_px?: number | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_notes?: string | null
          verification_status?: string
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_generation_briefs: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          created_by: string | null
          generated_asset_id: string | null
          id: string
          notes: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          reference_code: string
          status: string
          style: string | null
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          created_by?: string | null
          generated_asset_id?: string | null
          id?: string
          notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          reference_code: string
          status?: string
          style?: string | null
          subject: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          created_by?: string | null
          generated_asset_id?: string | null
          id?: string
          notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          reference_code?: string
          status?: string
          style?: string | null
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_generation_briefs_generated_asset_id_fkey"
            columns: ["generated_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_placement_events: {
        Row: {
          acted_by: string | null
          action: string
          created_at: string
          id: string
          media_asset_id: string | null
          page_slug: string | null
          page_type: Database["public"]["Enums"]["placement_page_type"] | null
          reason: string | null
          reference_code: string | null
          snapshot: Json
        }
        Insert: {
          acted_by?: string | null
          action: string
          created_at?: string
          id?: string
          media_asset_id?: string | null
          page_slug?: string | null
          page_type?: Database["public"]["Enums"]["placement_page_type"] | null
          reason?: string | null
          reference_code?: string | null
          snapshot?: Json
        }
        Update: {
          acted_by?: string | null
          action?: string
          created_at?: string
          id?: string
          media_asset_id?: string | null
          page_slug?: string | null
          page_type?: Database["public"]["Enums"]["placement_page_type"] | null
          reason?: string | null
          reference_code?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      notification_delivery_attempts: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          metadata: Json
          notification_id: string | null
          outbox_id: string | null
          provider: string | null
          recipient: string
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          notification_id?: string | null
          outbox_id?: string | null
          provider?: string | null
          recipient: string
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          notification_id?: string | null
          outbox_id?: string | null
          provider?: string | null
          recipient?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_attempts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "crm_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_attempts_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dispatch_runtime: {
        Row: {
          id: number
          last_started_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          last_started_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          last_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_dispatch_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          dedupe_key: string
          event_key: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          notification_id: string | null
          payload: Json
          provider: string | null
          recipient: string
          response_metadata: Json
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          dedupe_key: string
          event_key: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id?: string | null
          payload?: Json
          provider?: string | null
          recipient: string
          response_metadata?: Json
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          dedupe_key?: string
          event_key?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id?: string | null
          payload?: Json
          provider?: string | null
          recipient?: string
          response_metadata?: Json
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "crm_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_call_tokens: {
        Row: {
          action: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
        }
        Insert: {
          action: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
        }
        Update: {
          action?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      operations_control: {
        Row: {
          created_at: string
          email_provider_ready: boolean
          email_queue_enabled: boolean
          enabled: boolean
          heartbeat_interval_minutes: number
          id: string
          last_daily_run_at: string | null
          last_email_run_at: string | null
          last_error: string | null
          last_heartbeat_at: string | null
          last_success_at: string | null
          lead_discovery_enabled: boolean
          public_smoke_tests_enabled: boolean
          social_drafts_enabled: boolean
          stale_run_minutes: number
          timezone: string
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_provider_ready?: boolean
          email_queue_enabled?: boolean
          enabled?: boolean
          heartbeat_interval_minutes?: number
          id?: string
          last_daily_run_at?: string | null
          last_email_run_at?: string | null
          last_error?: string | null
          last_heartbeat_at?: string | null
          last_success_at?: string | null
          lead_discovery_enabled?: boolean
          public_smoke_tests_enabled?: boolean
          social_drafts_enabled?: boolean
          stale_run_minutes?: number
          timezone?: string
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_provider_ready?: boolean
          email_queue_enabled?: boolean
          enabled?: boolean
          heartbeat_interval_minutes?: number
          id?: string
          last_daily_run_at?: string | null
          last_email_run_at?: string | null
          last_error?: string | null
          last_heartbeat_at?: string | null
          last_success_at?: string | null
          lead_discovery_enabled?: boolean
          public_smoke_tests_enabled?: boolean
          social_drafts_enabled?: boolean
          stale_run_minutes?: number
          timezone?: string
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      operations_health_snapshots: {
        Row: {
          blockers: Json
          checked_at: string
          components: Json
          id: number
          metrics: Json
          overall_status: string
          run_id: string | null
        }
        Insert: {
          blockers?: Json
          checked_at?: string
          components?: Json
          id?: number
          metrics?: Json
          overall_status: string
          run_id?: string | null
        }
        Update: {
          blockers?: Json
          checked_at?: string
          components?: Json
          id?: number
          metrics?: Json
          overall_status?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_health_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "operations_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_runs: {
        Row: {
          action: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          started_at: string
          status: string
          summary: Json
          trigger_source: string
        }
        Insert: {
          action: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
        }
        Update: {
          action?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
        }
        Relationships: []
      }
      operations_setting_events: {
        Row: {
          changed_at: string
          database_user: string
          id: number
          new_value: Json | null
          old_value: Json | null
          setting_group: string
          setting_key: string
          txid: number
        }
        Insert: {
          changed_at?: string
          database_user?: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          setting_group: string
          setting_key: string
          txid?: number
        }
        Update: {
          changed_at?: string
          database_user?: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          setting_group?: string
          setting_key?: string
          txid?: number
        }
        Relationships: []
      }
      outreach_campaigns: {
        Row: {
          approved_count: number
          call_to_action: string
          created_at: string
          draft_count: number
          error: string | null
          failed_count: number
          id: string
          language_mode: string
          name: string
          objective: string
          product_focus: string[]
          replied_count: number
          requested_by: string | null
          selected_lead_count: number
          sent_count: number
          status: string
          target_market: string | null
          updated_at: string
        }
        Insert: {
          approved_count?: number
          call_to_action?: string
          created_at?: string
          draft_count?: number
          error?: string | null
          failed_count?: number
          id?: string
          language_mode?: string
          name: string
          objective: string
          product_focus?: string[]
          replied_count?: number
          requested_by?: string | null
          selected_lead_count?: number
          sent_count?: number
          status?: string
          target_market?: string | null
          updated_at?: string
        }
        Update: {
          approved_count?: number
          call_to_action?: string
          created_at?: string
          draft_count?: number
          error?: string | null
          failed_count?: number
          id?: string
          language_mode?: string
          name?: string
          objective?: string
          product_focus?: string[]
          replied_count?: number
          requested_by?: string | null
          selected_lead_count?: number
          sent_count?: number
          status?: string
          target_market?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outreach_events: {
        Row: {
          actor: string | null
          campaign_id: string
          created_at: string
          detail: Json
          event_type: string
          id: string
          lead_id: string | null
          message_id: string | null
        }
        Insert: {
          actor?: string | null
          campaign_id: string
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          lead_id?: string | null
          message_id?: string | null
        }
        Update: {
          actor?: string | null
          campaign_id?: string
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          lead_id?: string | null
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outreach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_message_attachments: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          crm_file_id: string
          error: string | null
          id: string
          message_id: string
          metadata: Json
          provider_file_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          crm_file_id: string
          error?: string | null
          id?: string
          message_id: string
          metadata?: Json
          provider_file_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          crm_file_id?: string
          error?: string | null
          id?: string
          message_id?: string
          metadata?: Json
          provider_file_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_message_attachments_crm_file_id_fkey"
            columns: ["crm_file_id"]
            isOneToOne: false
            referencedRelation: "crm_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outreach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_text: string
          campaign_id: string
          channel: string
          connector_response: Json
          created_at: string
          dispatched_by: string | null
          error: string | null
          gmail_history_id: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          idempotency_key: string
          language: string
          lead_id: string
          manual_reason: string | null
          parent_message_id: string | null
          personalization_evidence: Json
          recipient_company: string
          recipient_email: string | null
          recipient_whatsapp: string | null
          replied_at: string | null
          sent_at: string | null
          sequence_number: number
          status: string
          subject: string
          unsubscribe_token: string
          updated_at: string
          whatsapp_message_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_text: string
          campaign_id: string
          channel?: string
          connector_response?: Json
          created_at?: string
          dispatched_by?: string | null
          error?: string | null
          gmail_history_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          idempotency_key: string
          language?: string
          lead_id: string
          manual_reason?: string | null
          parent_message_id?: string | null
          personalization_evidence?: Json
          recipient_company: string
          recipient_email?: string | null
          recipient_whatsapp?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sequence_number?: number
          status?: string
          subject: string
          unsubscribe_token?: string
          updated_at?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_text?: string
          campaign_id?: string
          channel?: string
          connector_response?: Json
          created_at?: string
          dispatched_by?: string | null
          error?: string | null
          gmail_history_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          idempotency_key?: string
          language?: string
          lead_id?: string
          manual_reason?: string | null
          parent_message_id?: string | null
          personalization_evidence?: Json
          recipient_company?: string
          recipient_email?: string | null
          recipient_whatsapp?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sequence_number?: number
          status?: string
          subject?: string
          unsubscribe_token?: string
          updated_at?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "outreach_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_whatsapp_message_id_fkey"
            columns: ["whatsapp_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          enabled: boolean
          endpoint: string
          failure_count: number
          id: string
          last_error: string | null
          last_success_at: string | null
          p256dh: string
          platform: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          enabled?: boolean
          endpoint: string
          failure_count?: number
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          failure_count?: number
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh?: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          path: string
          referrer: string | null
          region: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      pinterest_oauth_bootstrap_tokens: {
        Row: {
          created_at: string
          expires_at: string
          max_uses: number
          token_hash: string
          use_count: number
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          max_uses?: number
          token_hash: string
          use_count?: number
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          max_uses?: number
          token_hash?: string
          use_count?: number
          used_at?: string | null
        }
        Relationships: []
      }
      pinterest_oauth_credentials: {
        Row: {
          access_token_cipher: string
          access_token_expires_at: string | null
          access_token_iv: string
          connected_at: string
          connected_by: string | null
          id: string
          refresh_token_cipher: string | null
          refresh_token_expires_at: string | null
          refresh_token_iv: string | null
          scope: string | null
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token_cipher: string
          access_token_expires_at?: string | null
          access_token_iv: string
          connected_at?: string
          connected_by?: string | null
          id?: string
          refresh_token_cipher?: string | null
          refresh_token_expires_at?: string | null
          refresh_token_iv?: string | null
          scope?: string | null
          token_type?: string
          updated_at?: string
        }
        Update: {
          access_token_cipher?: string
          access_token_expires_at?: string | null
          access_token_iv?: string
          connected_at?: string
          connected_by?: string | null
          id?: string
          refresh_token_cipher?: string | null
          refresh_token_expires_at?: string | null
          refresh_token_iv?: string | null
          scope?: string | null
          token_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pinterest_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          requested_by: string | null
          state_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          requested_by?: string | null
          state_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          requested_by?: string | null
          state_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      pinterest_operator_jobs: {
        Row: {
          action: string
          created_at: string
          error_code: string | null
          expires_at: string
          finished_at: string | null
          id: string
          payload: Json
          result: Json | null
          started_at: string | null
          status: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_code?: string | null
          expires_at: string
          finished_at?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_code?: string | null
          expires_at?: string
          finished_at?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      product_image_migration_assets: {
        Row: {
          attempt_count: number
          checksum_sha256: string | null
          copied_at: string | null
          height_px: number | null
          last_error: string | null
          mime_type: string | null
          public_url: string | null
          size_bytes: number | null
          source_origin: string
          source_path: string
          status: string
          storage_bucket: string
          storage_object_path: string | null
          updated_at: string
          verified_at: string | null
          width_px: number | null
        }
        Insert: {
          attempt_count?: number
          checksum_sha256?: string | null
          copied_at?: string | null
          height_px?: number | null
          last_error?: string | null
          mime_type?: string | null
          public_url?: string | null
          size_bytes?: number | null
          source_origin?: string
          source_path: string
          status?: string
          storage_bucket?: string
          storage_object_path?: string | null
          updated_at?: string
          verified_at?: string | null
          width_px?: number | null
        }
        Update: {
          attempt_count?: number
          checksum_sha256?: string | null
          copied_at?: string | null
          height_px?: number | null
          last_error?: string | null
          mime_type?: string | null
          public_url?: string | null
          size_bytes?: number | null
          source_origin?: string
          source_path?: string
          status?: string
          storage_bucket?: string
          storage_object_path?: string | null
          updated_at?: string
          verified_at?: string | null
          width_px?: number | null
        }
        Relationships: []
      }
      product_image_migration_backups: {
        Row: {
          captured_at: string
          id: number
          migration_batch: string
          previous_gallery: string[] | null
          previous_image_url: string | null
          previous_updated_at: string | null
          product_id: string
          product_name: string
          product_slug: string
          restored_at: string | null
        }
        Insert: {
          captured_at?: string
          id?: number
          migration_batch: string
          previous_gallery?: string[] | null
          previous_image_url?: string | null
          previous_updated_at?: string | null
          product_id: string
          product_name: string
          product_slug: string
          restored_at?: string | null
        }
        Update: {
          captured_at?: string
          id?: number
          migration_batch?: string
          previous_gallery?: string[] | null
          previous_image_url?: string | null
          previous_updated_at?: string | null
          product_id?: string
          product_name?: string
          product_slug?: string
          restored_at?: string | null
        }
        Relationships: []
      }
      product_image_migration_control: {
        Row: {
          call_count: number
          enabled: boolean
          last_called_at: string | null
          max_batch_size: number
          migration_id: string
          updated_at: string
        }
        Insert: {
          call_count?: number
          enabled?: boolean
          last_called_at?: string | null
          max_batch_size?: number
          migration_id: string
          updated_at?: string
        }
        Update: {
          call_count?: number
          enabled?: boolean
          last_called_at?: string | null
          max_batch_size?: number
          migration_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_media_live_validation: {
        Row: {
          attempt_count: number
          checksum_sha256: string | null
          copied_at: string | null
          last_error: string | null
          media_url: string
          mime_type: string | null
          public_url: string | null
          resolved_url: string | null
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_object_path: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          checksum_sha256?: string | null
          copied_at?: string | null
          last_error?: string | null
          media_url: string
          mime_type?: string | null
          public_url?: string | null
          resolved_url?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string
          storage_object_path?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          checksum_sha256?: string | null
          copied_at?: string | null
          last_error?: string | null
          media_url?: string
          mime_type?: string | null
          public_url?: string | null
          resolved_url?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string
          storage_object_path?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      product_quality_reviews: {
        Row: {
          created_at: string
          not_applicable_fields: string[]
          product_id: string
          reviewer_notes: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          not_applicable_fields?: string[]
          product_id: string
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          not_applicable_fields?: string[]
          product_id?: string
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_quality_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_quality_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_quality_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_slot_media: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          is_required: boolean
          mapping_confidence: string
          media_asset_id: string
          provenance_note: string | null
          reference_code: string
          rejected_reason: string | null
          role: Database["public"]["Enums"]["slot_media_role"]
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_required?: boolean
          mapping_confidence?: string
          media_asset_id: string
          provenance_note?: string | null
          reference_code: string
          rejected_reason?: string | null
          role: Database["public"]["Enums"]["slot_media_role"]
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_required?: boolean
          mapping_confidence?: string
          media_asset_id?: string
          provenance_note?: string | null
          reference_code?: string
          rejected_reason?: string | null
          role?: Database["public"]["Enums"]["slot_media_role"]
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_slot_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      product_taxonomy_assignments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_by: string | null
          assignment_source: string
          created_at: string
          product_id: string
          review_state: string
          taxonomy_node_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_by?: string | null
          assignment_source?: string
          created_at?: string
          product_id: string
          review_state?: string
          taxonomy_node_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_by?: string | null
          assignment_source?: string
          created_at?: string
          product_id?: string
          review_state?: string
          taxonomy_node_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_taxonomy_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_taxonomy_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_taxonomy_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_taxonomy_assignments_taxonomy_node_id_fkey"
            columns: ["taxonomy_node_id"]
            isOneToOne: false
            referencedRelation: "catalog_taxonomy_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_closeout_events: {
        Row: {
          closeout_id: string
          created_at: string
          created_by: string | null
          event_type: string
          evidence: Json
          from_value: string | null
          id: number
          note: string | null
          production_job_id: string
          to_value: string | null
        }
        Insert: {
          closeout_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          evidence?: Json
          from_value?: string | null
          id?: number
          note?: string | null
          production_job_id: string
          to_value?: string | null
        }
        Update: {
          closeout_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          evidence?: Json
          from_value?: string | null
          id?: number
          note?: string | null
          production_job_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_closeout_events_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_closeout_summary"
            referencedColumns: ["closeout_id"]
          },
          {
            foreignKeyName: "production_closeout_events_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_order_closeouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_closeout_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_closeout_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_closeout_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_closeout_issues: {
        Row: {
          closeout_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          issue_type: string
          owner_waiver_reason: string | null
          production_job_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          closeout_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_type: string
          owner_waiver_reason?: string | null
          production_job_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          closeout_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_type?: string
          owner_waiver_reason?: string | null
          production_job_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_closeout_issues_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_closeout_summary"
            referencedColumns: ["closeout_id"]
          },
          {
            foreignKeyName: "production_closeout_issues_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_order_closeouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_closeout_issues_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_closeout_issues_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_closeout_issues_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_cost_entries: {
        Row: {
          amount_base: number | null
          category: string
          closeout_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          evidence_reference: string | null
          exchange_rate_to_base: number
          id: string
          notes: string | null
          production_job_id: string
          quantity: number
          unit_cost: number
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_base?: number | null
          category: string
          closeout_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          description: string
          evidence_reference?: string | null
          exchange_rate_to_base?: number
          id?: string
          notes?: string | null
          production_job_id: string
          quantity?: number
          unit_cost: number
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_base?: number | null
          category?: string
          closeout_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          evidence_reference?: string | null
          exchange_rate_to_base?: number
          id?: string
          notes?: string | null
          production_job_id?: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_cost_entries_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_closeout_summary"
            referencedColumns: ["closeout_id"]
          },
          {
            foreignKeyName: "production_cost_entries_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_order_closeouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cost_entries_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_cost_entries_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cost_entries_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_delivery_evidence: {
        Row: {
          bucket: string
          created_at: string
          created_by: string | null
          delivered_at: string
          delivery_location: string | null
          evidence_type: string
          file_name: string | null
          id: string
          mime_type: string | null
          notes: string | null
          object_path: string | null
          production_job_id: string
          recipient_name: string
          recipient_role: string | null
          sha256: string | null
          shipment_id: string
          size_bytes: number | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          delivered_at: string
          delivery_location?: string | null
          evidence_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          object_path?: string | null
          production_job_id: string
          recipient_name: string
          recipient_role?: string | null
          sha256?: string | null
          shipment_id: string
          size_bytes?: number | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string
          delivery_location?: string | null
          evidence_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          object_path?: string | null
          production_job_id?: string
          recipient_name?: string
          recipient_role?: string | null
          sha256?: string | null
          shipment_id?: string
          size_bytes?: number | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_delivery_evidence_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_delivery_evidence_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_delivery_evidence_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_delivery_evidence_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_delivery_evidence_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipping_summary"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      production_evidence_files: {
        Row: {
          checksum_sha256: string | null
          created_at: string
          defect_id: string | null
          evidence_note: string | null
          evidence_type: string
          file_name: string
          id: string
          inspection_id: string | null
          mime_type: string
          production_job_id: string
          sample_approval_id: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          checksum_sha256?: string | null
          created_at?: string
          defect_id?: string | null
          evidence_note?: string | null
          evidence_type: string
          file_name: string
          id?: string
          inspection_id?: string | null
          mime_type: string
          production_job_id: string
          sample_approval_id?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          uploaded_by?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          checksum_sha256?: string | null
          created_at?: string
          defect_id?: string | null
          evidence_note?: string | null
          evidence_type?: string
          file_name?: string
          id?: string
          inspection_id?: string | null
          mime_type?: string
          production_job_id?: string
          sample_approval_id?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_evidence_files_defect_id_fkey"
            columns: ["defect_id"]
            isOneToOne: false
            referencedRelation: "production_qc_defects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_evidence_files_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "production_qc_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_evidence_files_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_evidence_files_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_evidence_files_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_evidence_files_sample_approval_id_fkey"
            columns: ["sample_approval_id"]
            isOneToOne: false
            referencedRelation: "production_sample_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      production_job_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          evidence: Json
          from_value: string | null
          id: string
          note: string | null
          production_job_id: string
          to_value: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          evidence?: Json
          from_value?: string | null
          id?: string
          note?: string | null
          production_job_id: string
          to_value?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          evidence?: Json
          from_value?: string | null
          id?: string
          note?: string | null
          production_job_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_job_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_job_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_job_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_jobs: {
        Row: {
          assigned_to: string | null
          buyer_approval_status: string
          buyer_name: string
          buyer_notification_status: string
          buyer_target_text: string | null
          closeout_risk: string
          closeout_status: string
          commercially_closed_at: string | null
          commercially_closed_by: string | null
          company_name: string | null
          completion_percent: number
          courier_name: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          dispatch_approved_at: string | null
          dispatch_approved_by: string | null
          dispatch_ready_at: string | null
          dispatched_at: string | null
          id: string
          internal_ship_target: string | null
          internal_target_date: string | null
          job_number: string
          job_type: string
          metadata: Json
          notes: string | null
          order_reference: string | null
          owner_approval_required: boolean
          owner_approved_at: string | null
          owner_approved_by: string | null
          planned_start_date: string | null
          priority: string
          product_name: string
          production_plan_status: string
          qc_status: string
          quality_release_status: string
          quality_released_at: string | null
          quality_released_by: string | null
          quality_risk: string
          quantity_text: string
          released_at: string | null
          released_by: string | null
          risk_level: string
          sample_status: string
          shipping_risk: string
          shipping_status: string
          source_id: string | null
          source_type: string | null
          specification_reference: string
          stage: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          buyer_approval_status?: string
          buyer_name: string
          buyer_notification_status?: string
          buyer_target_text?: string | null
          closeout_risk?: string
          closeout_status?: string
          commercially_closed_at?: string | null
          commercially_closed_by?: string | null
          company_name?: string | null
          completion_percent?: number
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          dispatch_approved_at?: string | null
          dispatch_approved_by?: string | null
          dispatch_ready_at?: string | null
          dispatched_at?: string | null
          id?: string
          internal_ship_target?: string | null
          internal_target_date?: string | null
          job_number: string
          job_type: string
          metadata?: Json
          notes?: string | null
          order_reference?: string | null
          owner_approval_required?: boolean
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          planned_start_date?: string | null
          priority?: string
          product_name: string
          production_plan_status?: string
          qc_status?: string
          quality_release_status?: string
          quality_released_at?: string | null
          quality_released_by?: string | null
          quality_risk?: string
          quantity_text: string
          released_at?: string | null
          released_by?: string | null
          risk_level?: string
          sample_status?: string
          shipping_risk?: string
          shipping_status?: string
          source_id?: string | null
          source_type?: string | null
          specification_reference: string
          stage?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          buyer_approval_status?: string
          buyer_name?: string
          buyer_notification_status?: string
          buyer_target_text?: string | null
          closeout_risk?: string
          closeout_status?: string
          commercially_closed_at?: string | null
          commercially_closed_by?: string | null
          company_name?: string | null
          completion_percent?: number
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          dispatch_approved_at?: string | null
          dispatch_approved_by?: string | null
          dispatch_ready_at?: string | null
          dispatched_at?: string | null
          id?: string
          internal_ship_target?: string | null
          internal_target_date?: string | null
          job_number?: string
          job_type?: string
          metadata?: Json
          notes?: string | null
          order_reference?: string | null
          owner_approval_required?: boolean
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          planned_start_date?: string | null
          priority?: string
          product_name?: string
          production_plan_status?: string
          qc_status?: string
          quality_release_status?: string
          quality_released_at?: string | null
          quality_released_by?: string | null
          quality_risk?: string
          quantity_text?: string
          released_at?: string | null
          released_by?: string | null
          risk_level?: string
          sample_status?: string
          shipping_risk?: string
          shipping_status?: string
          source_id?: string | null
          source_type?: string | null
          specification_reference?: string
          stage?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      production_material_requirements: {
        Row: {
          available_quantity: number
          blocker_note: string | null
          created_at: string
          created_by: string | null
          critical: boolean
          expected_date: string | null
          id: string
          material_category: string
          material_code: string | null
          material_name: string
          notes: string | null
          procurement_status: string
          production_job_id: string
          required_quantity: number
          specification: string | null
          supplier_reference: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          blocker_note?: string | null
          created_at?: string
          created_by?: string | null
          critical?: boolean
          expected_date?: string | null
          id?: string
          material_category?: string
          material_code?: string | null
          material_name: string
          notes?: string | null
          procurement_status?: string
          production_job_id: string
          required_quantity: number
          specification?: string | null
          supplier_reference?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          blocker_note?: string | null
          created_at?: string
          created_by?: string | null
          critical?: boolean
          expected_date?: string | null
          id?: string
          material_category?: string
          material_code?: string | null
          material_name?: string
          notes?: string | null
          procurement_status?: string
          production_job_id?: string
          required_quantity?: number
          specification?: string | null
          supplier_reference?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_material_requirements_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_material_requirements_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_material_requirements_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_operations: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assigned_to: string | null
          blocker_note: string | null
          created_at: string
          created_by: string | null
          evidence: Json
          evidence_required: boolean
          id: string
          notes: string | null
          operation_code: string | null
          operation_name: string
          planned_end: string | null
          planned_start: string | null
          production_job_id: string
          sequence_no: number
          stage: string
          status: string
          updated_at: string
          work_center: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_to?: string | null
          blocker_note?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          evidence_required?: boolean
          id?: string
          notes?: string | null
          operation_code?: string | null
          operation_name: string
          planned_end?: string | null
          planned_start?: string | null
          production_job_id: string
          sequence_no: number
          stage: string
          status?: string
          updated_at?: string
          work_center?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_to?: string | null
          blocker_note?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          evidence_required?: boolean
          id?: string
          notes?: string | null
          operation_code?: string | null
          operation_name?: string
          planned_end?: string | null
          planned_start?: string | null
          production_job_id?: string
          sequence_no?: number
          stage?: string
          status?: string
          updated_at?: string
          work_center?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_operations_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_operations_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_operations_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_order_closeouts: {
        Row: {
          acceptance_notes: string | null
          acceptance_reference: string | null
          acceptance_status: string
          accepted_at: string | null
          base_currency: string
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_exchange_rate_to_base: number
          invoice_number: string | null
          lessons_learned: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          payment_reference: string | null
          payment_reviewed_at: string | null
          payment_status: string
          production_job_id: string
          shipment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acceptance_notes?: string | null
          acceptance_reference?: string | null
          acceptance_status?: string
          accepted_at?: string | null
          base_currency?: string
          closed_at?: string | null
          closed_by?: string | null
          closeout_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_exchange_rate_to_base?: number
          invoice_number?: string | null
          lessons_learned?: string | null
          owner_review_status?: string
          owner_reviewed_at?: string | null
          owner_reviewed_by?: string | null
          payment_reference?: string | null
          payment_reviewed_at?: string | null
          payment_status?: string
          production_job_id: string
          shipment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acceptance_notes?: string | null
          acceptance_reference?: string | null
          acceptance_status?: string
          accepted_at?: string | null
          base_currency?: string
          closed_at?: string | null
          closed_by?: string | null
          closeout_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_currency?: string | null
          invoice_exchange_rate_to_base?: number
          invoice_number?: string | null
          lessons_learned?: string | null
          owner_review_status?: string
          owner_reviewed_at?: string | null
          owner_reviewed_by?: string | null
          payment_reference?: string | null
          payment_reviewed_at?: string | null
          payment_status?: string
          production_job_id?: string
          shipment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_closeouts_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_order_closeouts_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_closeouts_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_order_closeouts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_closeouts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipping_summary"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      production_packages: {
        Row: {
          barcode: string | null
          contents_summary: string | null
          created_at: string
          created_by: string | null
          damage_note: string | null
          gross_weight_kg: number
          height_cm: number | null
          id: string
          length_cm: number | null
          net_weight_kg: number | null
          package_number: string
          package_type: string
          packed_at: string | null
          production_job_id: string
          seal_number: string | null
          sealed_at: string | null
          shipment_id: string
          status: string
          unit_count: number
          updated_at: string
          width_cm: number | null
        }
        Insert: {
          barcode?: string | null
          contents_summary?: string | null
          created_at?: string
          created_by?: string | null
          damage_note?: string | null
          gross_weight_kg: number
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          net_weight_kg?: number | null
          package_number: string
          package_type?: string
          packed_at?: string | null
          production_job_id: string
          seal_number?: string | null
          sealed_at?: string | null
          shipment_id: string
          status?: string
          unit_count: number
          updated_at?: string
          width_cm?: number | null
        }
        Update: {
          barcode?: string | null
          contents_summary?: string | null
          created_at?: string
          created_by?: string | null
          damage_note?: string | null
          gross_weight_kg?: number
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          net_weight_kg?: number | null
          package_number?: string
          package_type?: string
          packed_at?: string | null
          production_job_id?: string
          seal_number?: string | null
          sealed_at?: string | null
          shipment_id?: string
          status?: string
          unit_count?: number
          updated_at?: string
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_packages_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_packages_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_packages_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipping_summary"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      production_qc_defects: {
        Row: {
          assigned_to: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          defect_category: string
          defect_code: string | null
          description: string
          due_at: string | null
          id: string
          inspection_id: string
          location: string | null
          production_job_id: string
          quantity: number
          rework_status: string
          root_cause: string | null
          severity: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          defect_category?: string
          defect_code?: string | null
          description: string
          due_at?: string | null
          id?: string
          inspection_id: string
          location?: string | null
          production_job_id: string
          quantity?: number
          rework_status?: string
          root_cause?: string | null
          severity: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          defect_category?: string
          defect_code?: string | null
          description?: string
          due_at?: string | null
          id?: string
          inspection_id?: string
          location?: string | null
          production_job_id?: string
          quantity?: number
          rework_status?: string
          root_cause?: string | null
          severity?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_qc_defects_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "production_qc_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_qc_defects_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_qc_defects_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_qc_defects_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_qc_inspections: {
        Row: {
          checklist: Json
          created_at: string
          created_by: string | null
          failed_quantity: number
          id: string
          inspected_at: string | null
          inspected_quantity: number
          inspection_number: string
          inspection_type: string
          inspector_id: string | null
          measurement_summary: Json
          notes: string | null
          operation_id: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          passed_quantity: number
          production_job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          failed_quantity?: number
          id?: string
          inspected_at?: string | null
          inspected_quantity?: number
          inspection_number: string
          inspection_type: string
          inspector_id?: string | null
          measurement_summary?: Json
          notes?: string | null
          operation_id?: string | null
          owner_review_status?: string
          owner_reviewed_at?: string | null
          owner_reviewed_by?: string | null
          passed_quantity?: number
          production_job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          failed_quantity?: number
          id?: string
          inspected_at?: string | null
          inspected_quantity?: number
          inspection_number?: string
          inspection_type?: string
          inspector_id?: string | null
          measurement_summary?: Json
          notes?: string | null
          operation_id?: string | null
          owner_review_status?: string
          owner_reviewed_at?: string | null
          owner_reviewed_by?: string | null
          passed_quantity?: number
          production_job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_qc_inspections_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "production_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_qc_inspections_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_qc_inspections_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_qc_inspections_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_repeat_order_opportunities: {
        Row: {
          buyer_name: string
          closeout_id: string
          company_name: string | null
          contacted_at: string | null
          created_at: string
          created_by: string | null
          estimated_lead_time_days: number
          follow_up_due_date: string
          id: string
          outreach_draft: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          priority: string
          product_name: string
          production_job_id: string
          rationale: string | null
          reorder_cycle_days: number
          source_id: string | null
          source_type: string | null
          status: string
          suggested_quantity_text: string | null
          updated_at: string
        }
        Insert: {
          buyer_name: string
          closeout_id: string
          company_name?: string | null
          contacted_at?: string | null
          created_at?: string
          created_by?: string | null
          estimated_lead_time_days?: number
          follow_up_due_date: string
          id?: string
          outreach_draft?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          priority?: string
          product_name: string
          production_job_id: string
          rationale?: string | null
          reorder_cycle_days?: number
          source_id?: string | null
          source_type?: string | null
          status?: string
          suggested_quantity_text?: string | null
          updated_at?: string
        }
        Update: {
          buyer_name?: string
          closeout_id?: string
          company_name?: string | null
          contacted_at?: string | null
          created_at?: string
          created_by?: string | null
          estimated_lead_time_days?: number
          follow_up_due_date?: string
          id?: string
          outreach_draft?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          priority?: string
          product_name?: string
          production_job_id?: string
          rationale?: string | null
          reorder_cycle_days?: number
          source_id?: string | null
          source_type?: string | null
          status?: string
          suggested_quantity_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_repeat_order_opportunities_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_closeout_summary"
            referencedColumns: ["closeout_id"]
          },
          {
            foreignKeyName: "production_repeat_order_opportunities_closeout_id_fkey"
            columns: ["closeout_id"]
            isOneToOne: false
            referencedRelation: "production_order_closeouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_repeat_order_opportunities_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_repeat_order_opportunities_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_repeat_order_opportunities_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_sample_approvals: {
        Row: {
          approved_specification_reference: string | null
          created_at: string
          created_by: string | null
          decision_at: string | null
          decision_reference: string | null
          decision_source: string
          id: string
          notes: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          production_job_id: string
          sample_round: number
          status: string
          updated_at: string
        }
        Insert: {
          approved_specification_reference?: string | null
          created_at?: string
          created_by?: string | null
          decision_at?: string | null
          decision_reference?: string | null
          decision_source?: string
          id?: string
          notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          production_job_id: string
          sample_round?: number
          status?: string
          updated_at?: string
        }
        Update: {
          approved_specification_reference?: string | null
          created_at?: string
          created_by?: string | null
          decision_at?: string | null
          decision_reference?: string | null
          decision_source?: string
          id?: string
          notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          production_job_id?: string
          sample_round?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_sample_approvals_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_sample_approvals_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sample_approvals_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_shipments: {
        Row: {
          booking_reference: string | null
          consignee_company: string | null
          consignee_email: string | null
          consignee_name: string | null
          consignee_phone: string | null
          courier_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          customs_reference: string | null
          declared_value: number | null
          delivered_at: string | null
          delivery_confirmed_by: string | null
          destination_address: string | null
          destination_city: string | null
          destination_country: string | null
          dispatch_approved_at: string | null
          dispatch_approved_by: string | null
          dispatched_at: string | null
          expected_delivery_at: string | null
          expected_dispatch_at: string | null
          export_reason: string | null
          id: string
          incoterm: string | null
          master_tracking_number: string | null
          notes: string | null
          owner_approval_required: boolean
          production_job_id: string
          service_level: string | null
          shipment_number: string
          shipping_mode: string
          status: string
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          booking_reference?: string | null
          consignee_company?: string | null
          consignee_email?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customs_reference?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          delivery_confirmed_by?: string | null
          destination_address?: string | null
          destination_city?: string | null
          destination_country?: string | null
          dispatch_approved_at?: string | null
          dispatch_approved_by?: string | null
          dispatched_at?: string | null
          expected_delivery_at?: string | null
          expected_dispatch_at?: string | null
          export_reason?: string | null
          id?: string
          incoterm?: string | null
          master_tracking_number?: string | null
          notes?: string | null
          owner_approval_required?: boolean
          production_job_id: string
          service_level?: string | null
          shipment_number: string
          shipping_mode?: string
          status?: string
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          booking_reference?: string | null
          consignee_company?: string | null
          consignee_email?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customs_reference?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          delivery_confirmed_by?: string | null
          destination_address?: string | null
          destination_city?: string | null
          destination_country?: string | null
          dispatch_approved_at?: string | null
          dispatch_approved_by?: string | null
          dispatched_at?: string | null
          expected_delivery_at?: string | null
          expected_dispatch_at?: string | null
          export_reason?: string | null
          id?: string
          incoterm?: string | null
          master_tracking_number?: string | null
          notes?: string | null
          owner_approval_required?: boolean
          production_job_id?: string
          service_level?: string | null
          shipment_number?: string
          shipping_mode?: string
          status?: string
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_shipments_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_shipments_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shipments_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_shipping_documents: {
        Row: {
          bucket: string
          created_at: string
          created_by: string | null
          document_number: string | null
          document_type: string
          expiry_date: string | null
          file_name: string | null
          id: string
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          object_path: string | null
          production_job_id: string
          rejection_reason: string | null
          required: boolean
          sha256: string | null
          shipment_id: string
          size_bytes: number | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_type: string
          expiry_date?: string | null
          file_name?: string | null
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          object_path?: string | null
          production_job_id: string
          rejection_reason?: string | null
          required?: boolean
          sha256?: string | null
          shipment_id: string
          size_bytes?: number | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_type?: string
          expiry_date?: string | null
          file_name?: string | null
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          object_path?: string | null
          production_job_id?: string
          rejection_reason?: string | null
          required?: boolean
          sha256?: string | null
          shipment_id?: string
          size_bytes?: number | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_shipping_documents_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_shipping_documents_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shipping_documents_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_shipping_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shipping_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipping_summary"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          assigned_to: string | null
          blocker_note: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          evidence: Json
          evidence_required: boolean
          id: string
          operation_id: string | null
          priority: string
          production_job_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          blocker_note?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          evidence?: Json
          evidence_required?: boolean
          id?: string
          operation_id?: string | null
          priority?: string
          production_job_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          blocker_note?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          evidence?: Json
          evidence_required?: boolean
          id?: string
          operation_id?: string | null
          priority?: string
          production_job_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "production_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_tasks_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      production_tracking_events: {
        Row: {
          carrier_status: string | null
          created_at: string
          event_type: string
          evidence: Json
          external_event_id: string | null
          id: number
          location_text: string | null
          notes: string | null
          occurred_at: string
          production_job_id: string
          recorded_by: string | null
          shipment_id: string
          source: string
          tracking_number: string | null
        }
        Insert: {
          carrier_status?: string | null
          created_at?: string
          event_type: string
          evidence?: Json
          external_event_id?: string | null
          id?: number
          location_text?: string | null
          notes?: string | null
          occurred_at: string
          production_job_id: string
          recorded_by?: string | null
          shipment_id: string
          source?: string
          tracking_number?: string | null
        }
        Update: {
          carrier_status?: string | null
          created_at?: string
          event_type?: string
          evidence?: Json
          external_event_id?: string | null
          id?: number
          location_text?: string | null
          notes?: string | null
          occurred_at?: string
          production_job_id?: string
          recorded_by?: string | null
          shipment_id?: string
          source?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_tracking_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_tracking_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tracking_events_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipping_summary"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      products: {
        Row: {
          audience_group: string | null
          available_colors: string[]
          available_sizes: string[]
          canonical_path: string | null
          category_id: string
          country_of_origin: string | null
          created_at: string
          custom_colors: boolean | null
          customization: Json
          description: string | null
          details: Json
          fabric_composition: string | null
          gallery: string[]
          gsm: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          main_category: string | null
          material_specifications: string | null
          moq_display: string | null
          moq_min: number | null
          name: string
          packaging_custom: boolean | null
          packaging_standard: string | null
          primary_material: string | null
          product_type: string | null
          production_timeline: string | null
          publish_state: string
          reference_code: string | null
          related_product_ids: string[]
          sample_available: boolean | null
          sample_timeline: string | null
          seo_description: string | null
          seo_h1: string | null
          seo_title: string | null
          short_description: string | null
          size_notes: string | null
          sku: string | null
          slug: string
          sort_order: number
          source_drive_folder_id: string | null
          specs: string[]
          updated_at: string
        }
        Insert: {
          audience_group?: string | null
          available_colors?: string[]
          available_sizes?: string[]
          canonical_path?: string | null
          category_id: string
          country_of_origin?: string | null
          created_at?: string
          custom_colors?: boolean | null
          customization?: Json
          description?: string | null
          details?: Json
          fabric_composition?: string | null
          gallery?: string[]
          gsm?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          main_category?: string | null
          material_specifications?: string | null
          moq_display?: string | null
          moq_min?: number | null
          name: string
          packaging_custom?: boolean | null
          packaging_standard?: string | null
          primary_material?: string | null
          product_type?: string | null
          production_timeline?: string | null
          publish_state?: string
          reference_code?: string | null
          related_product_ids?: string[]
          sample_available?: boolean | null
          sample_timeline?: string | null
          seo_description?: string | null
          seo_h1?: string | null
          seo_title?: string | null
          short_description?: string | null
          size_notes?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          source_drive_folder_id?: string | null
          specs?: string[]
          updated_at?: string
        }
        Update: {
          audience_group?: string | null
          available_colors?: string[]
          available_sizes?: string[]
          canonical_path?: string | null
          category_id?: string
          country_of_origin?: string | null
          created_at?: string
          custom_colors?: boolean | null
          customization?: Json
          description?: string | null
          details?: Json
          fabric_composition?: string | null
          gallery?: string[]
          gsm?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          main_category?: string | null
          material_specifications?: string | null
          moq_display?: string | null
          moq_min?: number | null
          name?: string
          packaging_custom?: boolean | null
          packaging_standard?: string | null
          primary_material?: string | null
          product_type?: string | null
          production_timeline?: string | null
          publish_state?: string
          reference_code?: string | null
          related_product_ids?: string[]
          sample_available?: boolean | null
          sample_timeline?: string | null
          seo_description?: string | null
          seo_h1?: string | null
          seo_title?: string | null
          short_description?: string | null
          size_notes?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
          source_drive_folder_id?: string | null
          specs?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          company_name: string
          company_size: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          id: string
          metadata: Json
          official_email: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          auth_user_id?: string | null
          company_name: string
          company_size?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          official_email: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          auth_user_id?: string | null
          company_name?: string
          company_size?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          official_email?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      public_submission_events: {
        Row: {
          action: string
          created_at: string
          fingerprint_hash: string
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          fingerprint_hash: string
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          fingerprint_hash?: string
          id?: string
        }
        Relationships: []
      }
      seo_keyword_clusters: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cluster_name: string
          created_at: string
          created_by: string | null
          id: string
          locale: string
          market: string | null
          negative_keywords: Json
          primary_keywords: Json
          product_focus: string[]
          questions: Json
          search_intent: string
          seed_keywords: string[]
          source_notes: Json
          status: string
          supporting_keywords: Json
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cluster_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          locale: string
          market?: string | null
          negative_keywords?: Json
          primary_keywords?: Json
          product_focus?: string[]
          questions?: Json
          search_intent: string
          seed_keywords?: string[]
          source_notes?: Json
          status?: string
          supporting_keywords?: Json
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cluster_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string
          market?: string | null
          negative_keywords?: Json
          primary_keywords?: Json
          product_focus?: string[]
          questions?: Json
          search_intent?: string
          seed_keywords?: string[]
          source_notes?: Json
          status?: string
          supporting_keywords?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_keyword_clusters_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "seo_locales"
            referencedColumns: ["locale"]
          },
        ]
      }
      seo_locales: {
        Row: {
          created_at: string
          direction: string
          language_name: string
          locale: string
          native_name: string
          notes: string | null
          priority: number
          requires_native_review: boolean
          status: string
          target_markets: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          direction?: string
          language_name: string
          locale: string
          native_name: string
          notes?: string | null
          priority?: number
          requires_native_review?: boolean
          status?: string
          target_markets?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          direction?: string
          language_name?: string
          locale?: string
          native_name?: string
          notes?: string | null
          priority?: number
          requires_native_review?: boolean
          status?: string
          target_markets?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      seo_localized_pages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_route: string
          created_at: string
          cta: Json
          eyebrow: string | null
          faqs: Json
          h1: string
          id: string
          internal_links: Json
          intro: string
          json_ld: Json
          keyword_cluster_ids: string[]
          locale: string
          native_review_status: string
          noindex: boolean
          page_type: string
          path: string
          published_at: string | null
          quality_report: Json
          quality_score: number
          reviewed_at: string | null
          reviewed_by: string | null
          sections: Json
          seo_description: string
          seo_title: string
          slug: string
          source_summary: string | null
          source_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_route: string
          created_at?: string
          cta?: Json
          eyebrow?: string | null
          faqs?: Json
          h1: string
          id?: string
          internal_links?: Json
          intro: string
          json_ld?: Json
          keyword_cluster_ids?: string[]
          locale: string
          native_review_status?: string
          noindex?: boolean
          page_type?: string
          path: string
          published_at?: string | null
          quality_report?: Json
          quality_score?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections?: Json
          seo_description: string
          seo_title: string
          slug: string
          source_summary?: string | null
          source_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_route?: string
          created_at?: string
          cta?: Json
          eyebrow?: string | null
          faqs?: Json
          h1?: string
          id?: string
          internal_links?: Json
          intro?: string
          json_ld?: Json
          keyword_cluster_ids?: string[]
          locale?: string
          native_review_status?: string
          noindex?: boolean
          page_type?: string
          path?: string
          published_at?: string | null
          quality_report?: Json
          quality_score?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections?: Json
          seo_description?: string
          seo_title?: string
          slug?: string
          source_summary?: string | null
          source_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_localized_pages_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "seo_locales"
            referencedColumns: ["locale"]
          },
        ]
      }
      seo_page_overrides: {
        Row: {
          canonical_url: string | null
          created_at: string
          id: string
          is_published: boolean
          json_ld: Json | null
          locale: string
          noindex: boolean
          notes: string | null
          og_image_url: string | null
          route: string
          seo_description: string | null
          seo_title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          json_ld?: Json | null
          locale?: string
          noindex?: boolean
          notes?: string | null
          og_image_url?: string | null
          route: string
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          json_ld?: Json | null
          locale?: string
          noindex?: boolean
          notes?: string | null
          og_image_url?: string | null
          route?: string
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_media_placements: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          is_lcp: boolean
          media_asset_id: string
          notes: string | null
          page_slug: string
          page_type: Database["public"]["Enums"]["placement_page_type"]
          role: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_lcp?: boolean
          media_asset_id: string
          notes?: string | null
          page_slug: string
          page_type: Database["public"]["Enums"]["placement_page_type"]
          role: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_lcp?: boolean
          media_asset_id?: string
          notes?: string | null
          page_slug?: string
          page_type?: Database["public"]["Enums"]["placement_page_type"]
          role?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_media_placements_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visitors: {
        Row: {
          alerted_at: string | null
          chat_opened_at: string | null
          city: string | null
          country: string | null
          country_code: string | null
          current_path: string
          device_type: string
          entry_path: string
          first_seen_at: string
          language: string | null
          last_seen_at: string
          page_view_count: number
          referrer_host: string | null
          region: string | null
          timezone: string | null
          updated_at: string
          user_agent: string | null
          viewport_width: number | null
          visitor_session_id: string
        }
        Insert: {
          alerted_at?: string | null
          chat_opened_at?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          current_path?: string
          device_type?: string
          entry_path?: string
          first_seen_at?: string
          language?: string | null
          last_seen_at?: string
          page_view_count?: number
          referrer_host?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          viewport_width?: number | null
          visitor_session_id: string
        }
        Update: {
          alerted_at?: string | null
          chat_opened_at?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          current_path?: string
          device_type?: string
          entry_path?: string
          first_seen_at?: string
          language?: string | null
          last_seen_at?: string
          page_view_count?: number
          referrer_host?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          viewport_width?: number | null
          visitor_session_id?: string
        }
        Relationships: []
      }
      sitemap_submission_control: {
        Row: {
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_http_status: number | null
          last_request_id: number | null
          last_success_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_http_status?: number | null
          last_request_id?: number | null
          last_success_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_http_status?: number | null
          last_request_id?: number | null
          last_success_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_attribution_events: {
        Row: {
          anonymous_session_hash: string | null
          created_at: string
          destination_path: string | null
          event_type: string
          evidence: Json
          id: number
          item_id: string | null
          lead_source_id: string | null
          lead_source_type: string | null
          occurred_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          anonymous_session_hash?: string | null
          created_at?: string
          destination_path?: string | null
          event_type: string
          evidence?: Json
          id?: number
          item_id?: string | null
          lead_source_id?: string | null
          lead_source_type?: string | null
          occurred_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          anonymous_session_hash?: string | null
          created_at?: string
          destination_path?: string | null
          event_type?: string
          evidence?: Json
          id?: number
          item_id?: string | null
          lead_source_id?: string | null
          lead_source_type?: string | null
          occurred_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_attribution_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_attribution_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_growth_latest"
            referencedColumns: ["item_id"]
          },
        ]
      }
      social_autopilot_events: {
        Row: {
          actor: string | null
          calendar_item_id: string | null
          campaign_id: string | null
          created_at: string
          detail: Json
          event_type: string
          id: string
          run_id: string | null
        }
        Insert: {
          actor?: string | null
          calendar_item_id?: string | null
          campaign_id?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          run_id?: string | null
        }
        Update: {
          actor?: string | null
          calendar_item_id?: string | null
          campaign_id?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_autopilot_events_calendar_item_id_fkey"
            columns: ["calendar_item_id"]
            isOneToOne: false
            referencedRelation: "social_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_autopilot_events_calendar_item_id_fkey"
            columns: ["calendar_item_id"]
            isOneToOne: false
            referencedRelation: "social_growth_latest"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "social_autopilot_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_autopilot_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "social_autopilot_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_autopilot_runs: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          created_at: string
          dry_run: boolean
          error: string | null
          id: string
          plan: Json
          requested_by: string | null
          selected_products: Json
          settings_fingerprint: string
          status: string
          summary: Json
          week_key: string
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          dry_run?: boolean
          error?: string | null
          id?: string
          plan?: Json
          requested_by?: string | null
          selected_products?: Json
          settings_fingerprint: string
          status?: string
          summary?: Json
          week_key: string
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          dry_run?: boolean
          error?: string | null
          id?: string
          plan?: Json
          requested_by?: string | null
          selected_products?: Json
          settings_fingerprint?: string
          status?: string
          summary?: Json
          week_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_autopilot_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      social_autopilot_settings: {
        Row: {
          category_rotation: boolean
          content_mix: string[]
          created_at: string
          daily_draft_limit: number
          enabled: boolean
          horizon_days: number
          id: string
          language: string
          platforms: Json
          posting_windows: Json
          product_cooldown_days: number
          target_markets: string[]
          timezone: string
          updated_at: string
          updated_by: string | null
          visual_preset: Json
          weekly_reels: number
        }
        Insert: {
          category_rotation?: boolean
          content_mix?: string[]
          created_at?: string
          daily_draft_limit?: number
          enabled?: boolean
          horizon_days?: number
          id?: string
          language?: string
          platforms?: Json
          posting_windows?: Json
          product_cooldown_days?: number
          target_markets?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          visual_preset?: Json
          weekly_reels?: number
        }
        Update: {
          category_rotation?: boolean
          content_mix?: string[]
          created_at?: string
          daily_draft_limit?: number
          enabled?: boolean
          horizon_days?: number
          id?: string
          language?: string
          platforms?: Json
          posting_windows?: Json
          product_cooldown_days?: number
          target_markets?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          visual_preset?: Json
          weekly_reels?: number
        }
        Relationships: []
      }
      social_calendar_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          call_to_action?: string | null
          campaign_id: string
          caption: string
          carousel_outline?: Json
          connector_result?: Json
          content_type?: string
          created_at?: string
          creative_brief?: Json
          creative_status?: string
          delivery_lock_token?: string | null
          delivery_locked_at?: string | null
          delivery_mode?: string
          error?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          hashtags?: string[]
          id?: string
          idempotency_key: string
          image_url?: string | null
          language?: string
          last_attempt_at?: string | null
          last_worker_id?: string | null
          max_attempts?: number
          metrics_last_collected_at?: string | null
          next_attempt_at?: string | null
          platform: string
          platform_account_id?: string | null
          product_id?: string | null
          product_url?: string | null
          publish_approved_at?: string | null
          publish_approved_by?: string | null
          publish_attempts?: number
          published_at?: string | null
          reel_script?: string | null
          render_verified?: boolean
          risk_flags?: string[]
          scheduled_at?: string | null
          source_media_asset_id?: string | null
          source_render_job_id?: string | null
          status?: string
          timezone?: string
          title: string
          tracking_url?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          call_to_action?: string | null
          campaign_id?: string
          caption?: string
          carousel_outline?: Json
          connector_result?: Json
          content_type?: string
          created_at?: string
          creative_brief?: Json
          creative_status?: string
          delivery_lock_token?: string | null
          delivery_locked_at?: string | null
          delivery_mode?: string
          error?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          hashtags?: string[]
          id?: string
          idempotency_key?: string
          image_url?: string | null
          language?: string
          last_attempt_at?: string | null
          last_worker_id?: string | null
          max_attempts?: number
          metrics_last_collected_at?: string | null
          next_attempt_at?: string | null
          platform?: string
          platform_account_id?: string | null
          product_id?: string | null
          product_url?: string | null
          publish_approved_at?: string | null
          publish_approved_by?: string | null
          publish_attempts?: number
          published_at?: string | null
          reel_script?: string | null
          render_verified?: boolean
          risk_flags?: string[]
          scheduled_at?: string | null
          source_media_asset_id?: string | null
          source_render_job_id?: string | null
          status?: string
          timezone?: string
          title?: string
          tracking_url?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_calendar_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_calendar_items_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "social_platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_calendar_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "social_calendar_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "social_calendar_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_calendar_items_source_media_asset_id_fkey"
            columns: ["source_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_calendar_items_source_render_job_id_fkey"
            columns: ["source_render_job_id"]
            isOneToOne: false
            referencedRelation: "social_render_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_campaigns: {
        Row: {
          approved_count: number
          brief: Json
          created_at: string
          error: string | null
          failed_count: number
          id: string
          item_count: number
          language: string
          name: string
          objective: string
          platforms: string[]
          product_focus: string[]
          product_id: string | null
          published_count: number
          requested_by: string | null
          status: string
          target_markets: string[]
          updated_at: string
        }
        Insert: {
          approved_count?: number
          brief?: Json
          created_at?: string
          error?: string | null
          failed_count?: number
          id?: string
          item_count?: number
          language?: string
          name: string
          objective: string
          platforms?: string[]
          product_focus?: string[]
          product_id?: string | null
          published_count?: number
          requested_by?: string | null
          status?: string
          target_markets?: string[]
          updated_at?: string
        }
        Update: {
          approved_count?: number
          brief?: Json
          created_at?: string
          error?: string | null
          failed_count?: number
          id?: string
          item_count?: number
          language?: string
          name?: string
          objective?: string
          platforms?: string[]
          product_focus?: string[]
          product_id?: string | null
          published_count?: number
          requested_by?: string | null
          status?: string
          target_markets?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "social_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "social_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      social_delivery_attempts: {
        Row: {
          actor: string | null
          attempt_number: number
          campaign_id: string
          created_at: string
          error: string | null
          id: string
          item_id: string
          platform: string
          request_snapshot: Json
          response_snapshot: Json
          status: string
        }
        Insert: {
          actor?: string | null
          attempt_number: number
          campaign_id: string
          created_at?: string
          error?: string | null
          id?: string
          item_id: string
          platform: string
          request_snapshot?: Json
          response_snapshot?: Json
          status: string
        }
        Update: {
          actor?: string | null
          attempt_number?: number
          campaign_id?: string
          created_at?: string
          error?: string | null
          id?: string
          item_id?: string
          platform?: string
          request_snapshot?: Json
          response_snapshot?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_delivery_attempts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_delivery_attempts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_delivery_attempts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_growth_latest"
            referencedColumns: ["item_id"]
          },
        ]
      }
      social_growth_recommendations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          evidence: Json
          id: string
          item_id: string | null
          priority: number
          proposed_action: string
          reason: string
          recommendation_type: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          item_id?: string | null
          priority?: number
          proposed_action: string
          reason: string
          recommendation_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          item_id?: string | null
          priority?: number
          proposed_action?: string
          reason?: string
          recommendation_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_growth_recommendations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_growth_recommendations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_growth_latest"
            referencedColumns: ["item_id"]
          },
        ]
      }
      social_metric_snapshots: {
        Row: {
          clicks: number
          collected_by: string | null
          comments: number
          created_at: string
          external_post_id: string | null
          external_post_url: string | null
          followers_delta: number
          id: string
          impressions: number
          item_id: string
          likes: number
          platform: string
          profile_visits: number
          provider_snapshot_key: string | null
          raw_metrics: Json
          reach: number
          saves: number
          shares: number
          snapshot_at: string
          source: string
          verified: boolean
          views: number
        }
        Insert: {
          clicks?: number
          collected_by?: string | null
          comments?: number
          created_at?: string
          external_post_id?: string | null
          external_post_url?: string | null
          followers_delta?: number
          id?: string
          impressions?: number
          item_id: string
          likes?: number
          platform: string
          profile_visits?: number
          provider_snapshot_key?: string | null
          raw_metrics?: Json
          reach?: number
          saves?: number
          shares?: number
          snapshot_at?: string
          source: string
          verified?: boolean
          views?: number
        }
        Update: {
          clicks?: number
          collected_by?: string | null
          comments?: number
          created_at?: string
          external_post_id?: string | null
          external_post_url?: string | null
          followers_delta?: number
          id?: string
          impressions?: number
          item_id?: string
          likes?: number
          platform?: string
          profile_visits?: number
          provider_snapshot_key?: string | null
          raw_metrics?: Json
          reach?: number
          saves?: number
          shares?: number
          snapshot_at?: string
          source?: string
          verified?: boolean
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_metric_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_metric_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_growth_latest"
            referencedColumns: ["item_id"]
          },
        ]
      }
      social_platform_accounts: {
        Row: {
          capabilities: Json
          connection_note: string | null
          created_at: string
          created_by: string | null
          display_name: string
          enabled: boolean
          external_account_id: string | null
          id: string
          last_health: Json
          last_verified_at: string | null
          platform: string
          updated_at: string
          updated_by: string | null
          verification_status: string
        }
        Insert: {
          capabilities?: Json
          connection_note?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          enabled?: boolean
          external_account_id?: string | null
          id?: string
          last_health?: Json
          last_verified_at?: string | null
          platform: string
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
        }
        Update: {
          capabilities?: Json
          connection_note?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          enabled?: boolean
          external_account_id?: string | null
          id?: string
          last_health?: Json
          last_verified_at?: string | null
          platform?: string
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          caption: string
          channels: string[]
          created_at: string
          created_by: string | null
          error: string | null
          fb_post_id: string | null
          fb_post_url: string | null
          id: string
          ig_post_id: string | null
          ig_post_url: string | null
          image_url: string | null
          status: string
        }
        Insert: {
          caption: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          error?: string | null
          fb_post_id?: string | null
          fb_post_url?: string | null
          id?: string
          ig_post_id?: string | null
          ig_post_url?: string | null
          image_url?: string | null
          status?: string
        }
        Update: {
          caption?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          error?: string | null
          fb_post_id?: string | null
          fb_post_url?: string | null
          id?: string
          ig_post_id?: string | null
          ig_post_url?: string | null
          image_url?: string | null
          status?: string
        }
        Relationships: []
      }
      social_publish_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: Json
          event_type: string
          id: number
          item_id: string | null
          run_id: string | null
          worker_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          id?: number
          item_id?: string | null
          run_id?: string | null
          worker_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          id?: number
          item_id?: string | null
          run_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_publish_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_publish_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "social_growth_latest"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "social_publish_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "social_publish_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_publish_runs: {
        Row: {
          claimed_count: number
          completed_at: string | null
          error: string | null
          failed_count: number
          id: string
          manual_count: number
          published_count: number
          requested_by: string | null
          started_at: string
          status: string
          summary: Json
          trigger_source: string
          worker_id: string
        }
        Insert: {
          claimed_count?: number
          completed_at?: string | null
          error?: string | null
          failed_count?: number
          id?: string
          manual_count?: number
          published_count?: number
          requested_by?: string | null
          started_at?: string
          status?: string
          summary?: Json
          trigger_source: string
          worker_id: string
        }
        Update: {
          claimed_count?: number
          completed_at?: string | null
          error?: string | null
          failed_count?: number
          id?: string
          manual_count?: number
          published_count?: number
          requested_by?: string | null
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
          worker_id?: string
        }
        Relationships: []
      }
      social_render_events: {
        Row: {
          actor_id: string | null
          after_record: Json | null
          before_record: Json | null
          created_at: string
          event_type: string
          id: number
          job_id: string | null
        }
        Insert: {
          actor_id?: string | null
          after_record?: Json | null
          before_record?: Json | null
          created_at?: string
          event_type: string
          id?: number
          job_id?: string | null
        }
        Update: {
          actor_id?: string | null
          after_record?: Json | null
          before_record?: Json | null
          created_at?: string
          event_type?: string
          id?: number
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_render_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "social_render_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_render_job_items: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          job_id: string
          media_asset_id: string
          overlay_text: string | null
          position: number
          scene_text: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          job_id: string
          media_asset_id: string
          overlay_text?: string | null
          position: number
          scene_text?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          job_id?: string
          media_asset_id?: string
          overlay_text?: string | null
          position?: number
          scene_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_render_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "social_render_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_render_job_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      social_render_jobs: {
        Row: {
          aspect_ratio: string
          attempt_count: number
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          locked_at: string | null
          manifest: Json
          output_asset_id: string | null
          output_url: string | null
          output_verification: Json | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          render_type: string
          renderer_job_id: string | null
          renderer_provider: string | null
          requested_duration_seconds: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aspect_ratio: string
          attempt_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          manifest?: Json
          output_asset_id?: string | null
          output_url?: string | null
          output_verification?: Json | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          render_type: string
          renderer_job_id?: string | null
          renderer_provider?: string | null
          requested_duration_seconds?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aspect_ratio?: string
          attempt_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          manifest?: Json
          output_asset_id?: string | null
          output_url?: string | null
          output_verification?: Json | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          render_type?: string
          renderer_job_id?: string | null
          renderer_provider?: string | null
          requested_duration_seconds?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_render_jobs_output_asset_id_fkey"
            columns: ["output_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string | null
          external_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          processing_status: string
          provider: string
          signature_valid: boolean
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider: string
          signature_valid?: boolean
        }
        Update: {
          created_at?: string
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider?: string
          signature_valid?: boolean
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          crm_lead_id: string | null
          id: string
          language_code: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          metadata: Json
          opt_in_status: string
          phone_e164: string | null
          profile_name: string | null
          updated_at: string
          wa_id: string
        }
        Insert: {
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          language_code?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          metadata?: Json
          opt_in_status?: string
          phone_e164?: string | null
          profile_name?: string | null
          updated_at?: string
          wa_id: string
        }
        Update: {
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          language_code?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          metadata?: Json
          opt_in_status?: string
          phone_e164?: string | null
          profile_name?: string | null
          updated_at?: string
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_summary: string | null
          qualification: Json
          qualification_status: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_summary?: string | null
          qualification?: Json
          qualification_status?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_summary?: string | null
          qualification?: Json
          qualification_status?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string | null
          contact_id: string
          conversation_id: string
          created_at: string
          created_by: string | null
          direction: string
          error: string | null
          id: string
          media_id: string | null
          media_mime_type: string | null
          message_type: string
          raw_payload: Json
          received_at: string | null
          reply_to_wa_message_id: string | null
          requires_owner_approval: boolean
          sent_at: string | null
          status: string
          template_language: string | null
          template_name: string | null
          updated_at: string
          wa_message_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          contact_id: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          direction: string
          error?: string | null
          id?: string
          media_id?: string | null
          media_mime_type?: string | null
          message_type?: string
          raw_payload?: Json
          received_at?: string | null
          reply_to_wa_message_id?: string | null
          requires_owner_approval?: boolean
          sent_at?: string | null
          status: string
          template_language?: string | null
          template_name?: string | null
          updated_at?: string
          wa_message_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          contact_id?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          error?: string | null
          id?: string
          media_id?: string | null
          media_mime_type?: string | null
          message_type?: string
          raw_payload?: Json
          received_at?: string | null
          reply_to_wa_message_id?: string | null
          requires_owner_approval?: boolean
          sent_at?: string | null
          status?: string
          template_language?: string | null
          template_name?: string | null
          updated_at?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_key: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_key: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_key?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_legacy_redirect_queue: {
        Row: {
          created_at: string | null
          from_path: string | null
          id: string | null
          reason: string | null
          to_path: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_path?: string | null
          id?: string | null
          reason?: string | null
          to_path?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_path?: string | null
          id?: string | null
          reason?: string | null
          to_path?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_media_audit_summary: {
        Row: {
          social_approved_count: number | null
          total: number | null
          verification_status: string | null
        }
        Relationships: []
      }
      admin_media_brief_queue: {
        Row: {
          aspect_ratio: string | null
          created_at: string | null
          generated_asset_id: string | null
          id: string | null
          notes: string | null
          owner_approved_at: string | null
          reference_code: string | null
          status: string | null
          style: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string | null
          generated_asset_id?: string | null
          id?: string | null
          notes?: string | null
          owner_approved_at?: string | null
          reference_code?: string | null
          status?: string | null
          style?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string | null
          generated_asset_id?: string | null
          id?: string | null
          notes?: string | null
          owner_approved_at?: string | null
          reference_code?: string | null
          status?: string | null
          style?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_generation_briefs_generated_asset_id_fkey"
            columns: ["generated_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_slot_completion_dashboard: {
        Row: {
          approved_media_count: number | null
          audience_slug: string | null
          blocking_gate: string | null
          family_slug: string | null
          main_slug: string | null
          owner_approved_title: string | null
          owner_signed_off: boolean | null
          publish_state: string | null
          publishable: boolean | null
          published_at: string | null
          reference_code: string | null
          slot_slug: string | null
          spec_sheet_ready: boolean | null
          taxonomy_assigned: boolean | null
          updated_at: string | null
          working_title: string | null
        }
        Insert: {
          approved_media_count?: number | null
          audience_slug?: string | null
          blocking_gate?: never
          family_slug?: string | null
          main_slug?: string | null
          owner_approved_title?: string | null
          owner_signed_off?: boolean | null
          publish_state?: string | null
          publishable?: boolean | null
          published_at?: string | null
          reference_code?: string | null
          slot_slug?: string | null
          spec_sheet_ready?: boolean | null
          taxonomy_assigned?: boolean | null
          updated_at?: string | null
          working_title?: string | null
        }
        Update: {
          approved_media_count?: number | null
          audience_slug?: string | null
          blocking_gate?: never
          family_slug?: string | null
          main_slug?: string | null
          owner_approved_title?: string | null
          owner_signed_off?: boolean | null
          publish_state?: string | null
          publishable?: boolean | null
          published_at?: string | null
          reference_code?: string | null
          slot_slug?: string | null
          spec_sheet_ready?: boolean | null
          taxonomy_assigned?: boolean | null
          updated_at?: string | null
          working_title?: string | null
        }
        Relationships: []
      }
      catalog_drive_product_manifest: {
        Row: {
          audience_group: string | null
          canonical_path: string | null
          card_front_image: string | null
          drive_folder_id: string | null
          front_image_count: number | null
          gallery_count: number | null
          is_published: boolean | null
          mapped_image_count: number | null
          normalized_name: string | null
          normalized_slug: string | null
          product_id: string | null
          product_name: string | null
          product_slug: string | null
          publish_state: string | null
          reference_code: string | null
          root_category: string | null
          sku: string | null
          source_image_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_drive_folders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_priority_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_audit"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "catalog_drive_folders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_priority_audit: {
        Row: {
          category_id: string | null
          distinct_gallery_count: number | null
          gallery_count: number | null
          image_url: string | null
          is_published: boolean | null
          is_reference_style: boolean | null
          issue_codes: string[] | null
          issue_count: number | null
          minimum_short_edge_px: number | null
          name: string | null
          priority: string | null
          product_id: string | null
          review_status: string | null
          reviewer_notes: string | null
          slug: string | null
          subcategory_name: string | null
          top_category_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_quality_audit: {
        Row: {
          category_id: string | null
          completeness_percent: number | null
          image_url: string | null
          is_published: boolean | null
          missing_count: number | null
          missing_fields: string[] | null
          name: string | null
          not_applicable_fields: string[] | null
          product_id: string | null
          review_status: string | null
          reviewer_notes: string | null
          slug: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      production_closeout_summary: {
        Row: {
          acceptance_reference: string | null
          acceptance_status: string | null
          accepted_at: string | null
          base_currency: string | null
          buyer_name: string | null
          closed_at: string | null
          closeout_id: string | null
          closeout_risk: string | null
          company_name: string | null
          contribution_margin_base: number | null
          contribution_margin_percent: number | null
          delivered_at: string | null
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_exchange_rate_to_base: number | null
          invoice_number: string | null
          job_number: string | null
          job_type: string | null
          lessons_learned: string | null
          next_follow_up_due_date: string | null
          open_critical_issue_count: number | null
          open_issue_count: number | null
          open_repeat_order_count: number | null
          owner_review_status: string | null
          owner_reviewed_at: string | null
          payment_status: string | null
          pending_cost_base: number | null
          pending_cost_count: number | null
          product_name: string | null
          production_job_id: string | null
          quantity_text: string | null
          revenue_base: number | null
          shipment_id: string | null
          shipment_status: string | null
          source_id: string | null
          source_type: string | null
          stage: string | null
          status: string | null
          updated_at: string | null
          verified_cost_base: number | null
          verified_cost_count: number | null
          verified_delivery_evidence_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_order_closeouts_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_order_closeouts_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_closeouts_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_order_closeouts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_closeouts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "production_shipping_summary"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      production_control_summary: {
        Row: {
          blocked_operations: number | null
          blocked_tasks: number | null
          buyer_name: string | null
          company_name: string | null
          completed_operations: number | null
          completion_percent: number | null
          critical_shortages: number | null
          internal_ship_target: string | null
          internal_target_date: string | null
          job_number: string | null
          job_type: string | null
          material_count: number | null
          open_tasks: number | null
          operation_count: number | null
          overdue_tasks: number | null
          priority: string | null
          product_name: string | null
          production_job_id: string | null
          production_plan_status: string | null
          quantity_text: string | null
          released_at: string | null
          risk_level: string | null
          specification_reference: string | null
          stage: string | null
          total_shortages: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      production_management_report: {
        Row: {
          accepted_delivery_count: number | null
          blocked_closeout_count: number | null
          closed_order_count: number | null
          closeout_count: number | null
          contribution_margin_base: number | null
          overdue_payment_count: number | null
          paid_order_count: number | null
          report_month: string | null
          revenue_base: number | null
          verified_cost_base: number | null
        }
        Relationships: []
      }
      production_quality_summary: {
        Row: {
          approved_specification_reference: string | null
          buyer_approval_status: string | null
          buyer_name: string | null
          company_name: string | null
          evidence_count: number | null
          inspection_count: number | null
          job_number: string | null
          job_type: string | null
          latest_sample_round: number | null
          latest_sample_status: string | null
          open_critical: number | null
          open_defects: number | null
          open_major: number | null
          passed_inspections: number | null
          product_name: string | null
          production_job_id: string | null
          qc_status: string | null
          quality_release_status: string | null
          quality_released_at: string | null
          quality_risk: string | null
          quantity_text: string | null
          sample_status: string | null
          stage: string | null
          updated_at: string | null
          verified_evidence: number | null
        }
        Relationships: []
      }
      production_shipping_summary: {
        Row: {
          booking_reference: string | null
          buyer_name: string | null
          company_name: string | null
          consignee_name: string | null
          courier_name: string | null
          delivered_at: string | null
          destination_city: string | null
          destination_country: string | null
          dispatch_approved_at: string | null
          dispatched_at: string | null
          expected_delivery_at: string | null
          expected_dispatch_at: string | null
          gross_weight_kg: number | null
          incoterm: string | null
          job_number: string | null
          job_type: string | null
          latest_tracking_at: string | null
          latest_tracking_event: string | null
          master_tracking_number: string | null
          package_count: number | null
          packed_units: number | null
          product_name: string | null
          production_job_id: string | null
          qc_status: string | null
          quality_release_status: string | null
          quality_released_at: string | null
          quantity_text: string | null
          required_documents: number | null
          risk_level: string | null
          service_level: string | null
          shipment_id: string | null
          shipment_number: string | null
          shipping_mode: string | null
          stage: string | null
          status: string | null
          tracking_event_count: number | null
          tracking_url: string | null
          unsealed_packages: number | null
          updated_at: string | null
          verified_delivery_evidence_count: number | null
          verified_required_documents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_shipments_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_control_summary"
            referencedColumns: ["production_job_id"]
          },
          {
            foreignKeyName: "production_shipments_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shipments_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: true
            referencedRelation: "production_quality_summary"
            referencedColumns: ["production_job_id"]
          },
        ]
      }
      social_growth_latest: {
        Row: {
          attributed_lead_count: number | null
          campaign_id: string | null
          clicks: number | null
          comments: number | null
          content_type: string | null
          external_post_id: string | null
          external_post_url: string | null
          followers_delta: number | null
          impressions: number | null
          item_id: string | null
          landing_count: number | null
          likes: number | null
          metric_source: string | null
          metric_verified: boolean | null
          metrics_last_collected_at: string | null
          platform: string | null
          profile_visits: number | null
          published_at: string | null
          reach: number | null
          saves: number | null
          shares: number | null
          snapshot_at: string | null
          snapshot_id: string | null
          status: string | null
          title: string | null
          tracking_url: string | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_calendar_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_ai_get_live_snapshot: { Args: never; Returns: Json }
      admin_ai_live_snapshot: { Args: never; Returns: Json }
      admin_approve_social_render_job: {
        Args: { _job_id: string }
        Returns: undefined
      }
      admin_cancel_social_render_job: {
        Args: { _job_id: string }
        Returns: undefined
      }
      admin_retry_social_render_job: {
        Args: { _job_id: string }
        Returns: undefined
      }
      admin_submit_social_render_job: {
        Args: { _job_id: string }
        Returns: undefined
      }
      catalog_build_drive_products: { Args: never; Returns: Json }
      catalog_drive_claim_job: {
        Args: { p_job_id: string }
        Returns: {
          action: string
          payload: Json
        }[]
      }
      catalog_drive_finish_job: {
        Args: {
          p_error?: string
          p_job_id: string
          p_result?: Json
          p_success: boolean
        }
        Returns: undefined
      }
      catalog_drive_import_authorized: {
        Args: { p_token: string }
        Returns: boolean
      }
      catalog_drive_import_request: {
        Args: { p_action: string; p_limit?: number }
        Returns: number
      }
      catalog_drive_internal_token: { Args: never; Returns: string }
      catalog_get_admin_health: { Args: never; Returns: Json }
      catalog_get_public_release: { Args: never; Returns: Json }
      catalog_get_public_taxonomy: { Args: never; Returns: Json }
      catalog_publish_reviewed_taxonomy: {
        Args: {
          p_confirmation: string
          p_expected_assignments: number
          p_expected_snapshot_hash: string
        }
        Returns: Json
      }
      catalog_taxonomy_review_summary: { Args: never; Returns: Json }
      catalog_unpublish_taxonomy: {
        Args: { p_confirmation: string }
        Returns: Json
      }
      claim_ai_image_processing_jobs: {
        Args: { _limit?: number; _worker?: string }
        Returns: {
          attempt: number
          bucket: string
          file_name: string
          id: string
          lock_token: string
          mime_type: string
          object_path: string
          public_url: string
        }[]
      }
      claim_catalog_drive_files: {
        Args: { _limit?: number }
        Returns: {
          angle_classification_source: string
          angle_confidence: string
          checksum_sha256: string | null
          discovered_at: string
          drive_file_id: string
          height_px: number | null
          import_attempts: number
          import_status: string
          imported_at: string | null
          last_error: string | null
          media_asset_id: string | null
          mime_type: string | null
          original_bucket: string | null
          original_object_path: string | null
          product_drive_folder_id: string
          public_url: string | null
          published_in_gallery: boolean
          role: Database["public"]["Enums"]["slot_media_role"]
          role_index: number
          size_bytes: number | null
          source_extension: string
          source_mime_type: string
          source_modified_at: string | null
          source_name: string
          source_size_bytes: number | null
          updated_at: string
          visual_review_status: string
          web_bucket: string | null
          web_object_path: string | null
          width_px: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "catalog_drive_files"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_catalog_drive_files_v2: {
        Args: { _limit?: number }
        Returns: {
          angle_classification_source: string
          angle_confidence: string
          checksum_sha256: string | null
          discovered_at: string
          drive_file_id: string
          height_px: number | null
          import_attempts: number
          import_status: string
          imported_at: string | null
          last_error: string | null
          media_asset_id: string | null
          mime_type: string | null
          original_bucket: string | null
          original_object_path: string | null
          product_drive_folder_id: string
          public_url: string | null
          published_in_gallery: boolean
          role: Database["public"]["Enums"]["slot_media_role"]
          role_index: number
          size_bytes: number | null
          source_extension: string
          source_mime_type: string
          source_modified_at: string | null
          source_name: string
          source_size_bytes: number | null
          updated_at: string
          visual_review_status: string
          web_bucket: string | null
          web_object_path: string | null
          width_px: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "catalog_drive_files"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_catalog_media_worker_job_v1: {
        Args: { p_job_id: string }
        Returns: {
          max_files: number
        }[]
      }
      claim_homepage_drive_files_v1: {
        Args: { _limit?: number }
        Returns: {
          angle_classification_source: string
          angle_confidence: string
          checksum_sha256: string | null
          discovered_at: string
          drive_file_id: string
          height_px: number | null
          import_attempts: number
          import_status: string
          imported_at: string | null
          last_error: string | null
          media_asset_id: string | null
          mime_type: string | null
          original_bucket: string | null
          original_object_path: string | null
          product_drive_folder_id: string
          public_url: string | null
          published_in_gallery: boolean
          role: Database["public"]["Enums"]["slot_media_role"]
          role_index: number
          size_bytes: number | null
          source_extension: string
          source_mime_type: string
          source_modified_at: string | null
          source_name: string
          source_size_bytes: number | null
          updated_at: string
          visual_review_status: string
          web_bucket: string | null
          web_object_path: string | null
          width_px: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "catalog_drive_files"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_instagram_reply_draft: {
        Args: { p_actor_user_id: string; p_draft_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body: string
          conversation_id: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          sent_message_id: string | null
          source: string
          status: string
          updated_at: string
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "instagram_reply_drafts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_lead_candidates_for_activation: {
        Args: {
          p_candidate_ids: string[]
          p_claim_token: string
          p_limit?: number
        }
        Returns: {
          activation_claim_token: string | null
          activation_claimed_at: string | null
          buyer_type: string | null
          campaign_id: string
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          duplicate_of: string | null
          duplicate_reason: string | null
          email: string | null
          evidence: Json
          facebook_url: string | null
          id: string
          import_fingerprint: string | null
          imported_lead_id: string | null
          instagram_url: string | null
          linkedin_url: string | null
          phone: string | null
          product_fit: string[]
          raw_data: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source_excerpt: string | null
          source_provider: string
          source_query: string | null
          source_title: string | null
          source_url: string
          updated_at: string
          verification_score: number
          verification_status: string
          website: string | null
          website_domain: string | null
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "lead_candidates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_next_social_render_job: {
        Args: { _provider: string }
        Returns: {
          aspect_ratio: string
          attempt_count: number
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          locked_at: string | null
          manifest: Json
          output_asset_id: string | null
          output_url: string | null
          output_verification: Json | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          render_type: string
          renderer_job_id: string | null
          renderer_provider: string | null
          requested_duration_seconds: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_render_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_owner_admin: { Args: never; Returns: boolean }
      claim_sitemap_submission: { Args: { _token: string }; Returns: boolean }
      cleanup_edge_rate_limit_state: {
        Args: { p_max_rows?: number }
        Returns: {
          metric_rows_deleted: number
          state_rows_deleted: number
        }[]
      }
      cleanup_stale_site_visitors: { Args: never; Returns: number }
      cms_get_admin_document: { Args: { _key: string }; Returns: Json }
      cms_get_published_document: { Args: { _key: string }; Returns: Json }
      cms_publish_document: { Args: { _key: string }; Returns: Json }
      cms_restore_revision: {
        Args: { _key: string; _revision_id: string }
        Returns: Json
      }
      cms_save_draft: {
        Args: {
          _content: Json
          _document_type: string
          _key: string
          _title: string
        }
        Returns: Json
      }
      complete_ai_image_processing_job: {
        Args: {
          _background_hex: string
          _background_style: string
          _enhanced: boolean
          _id: string
          _lock_token: string
          _master_bucket: string
          _master_height_px: number
          _master_object_path: string
          _master_url: string
          _master_width_px: number
          _published: boolean
          _quality_score: number
          _responsive_total_size_bytes: number
          _responsive_widths: number[]
          _review_reason: string
          _source_height_px: number
          _source_width_px: number
          _thumbnail_height_px: number
          _thumbnail_object_path: string
          _thumbnail_size_bytes: number
          _thumbnail_url: string
          _thumbnail_width_px: number
          _upscaled: boolean
        }
        Returns: boolean
      }
      complete_media_asset_verification: {
        Args: {
          _asset_id: string
          _checksum_sha256: string
          _duration_ms: number
          _height_px: number
          _status: string
          _width_px: number
        }
        Returns: undefined
      }
      complete_social_render_job: {
        Args: {
          _job_id: string
          _output_asset_id: string
          _output_url: string
          _renderer_job_id: string
          _verification: Json
        }
        Returns: undefined
      }
      consume_edge_rate_limit: {
        Args: {
          p_cost?: number
          p_duplicate_hash?: string
          p_now?: string
          p_policy_key: string
          p_resource_hash?: string
          p_subject_hash: string
        }
        Returns: {
          blocked_until: string
          decision: string
          duplicate_suppressed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      consume_public_submission_limit: {
        Args: {
          _action: string
          _fingerprint_hash: string
          _max_count: number
          _window_seconds: number
        }
        Returns: boolean
      }
      content_get_admin_health: { Args: never; Returns: Json }
      content_get_public_blog_post: {
        Args: { _locale?: string; _slug: string }
        Returns: Json
      }
      content_get_public_blog_posts: {
        Args: { _locale?: string }
        Returns: Json
      }
      content_get_public_faqs: { Args: { _locale?: string }; Returns: Json }
      content_get_public_page_tools: {
        Args: { _locale?: string; _route: string }
        Returns: Json
      }
      create_automation_planning_cycle: {
        Args: { _trigger_source?: string }
        Returns: string
      }
      crm_confirm_same_buyer: {
        Args: {
          _left_source_id: string
          _left_source_type: string
          _reason: string
          _right_source_id: string
          _right_source_type: string
        }
        Returns: Json
      }
      crm_create_buyer_quotation_handoff: {
        Args: {
          _currency: string
          _incoterm: string
          _notes?: string
          _payment_terms: string
          _shipping_scope: string
          _source_id: string
          _source_type: string
          _valid_until: string
        }
        Returns: Json
      }
      crm_create_followup_task: {
        Args: {
          _assigned_to?: string
          _due_at?: string
          _notes?: string
          _priority?: string
          _source_id: string
          _source_type: string
          _title: string
        }
        Returns: Json
      }
      crm_find_duplicate_candidates:
        | {
            Args: { _limit?: number }
            Returns: {
              confidence: number
              left_display: string
              left_source_id: string
              left_source_type: string
              match_reason: string
              right_display: string
              right_source_id: string
              right_source_type: string
            }[]
          }
        | {
            Args: { _limit?: number; _source_id: string; _source_type: string }
            Returns: {
              already_linked: boolean
              candidate_source_id: string
              candidate_source_type: string
              company_name: string
              country: string
              display_name: string
              email: string
              match_score: number
              match_type: string
              phone: string
            }[]
          }
      crm_generate_daily_owner_report: {
        Args: { _report_date?: string }
        Returns: Json
      }
      crm_get_buyer_communication_history: {
        Args: { _limit?: number; _source_id: string; _source_type: string }
        Returns: Json
      }
      crm_get_buyer_profile: {
        Args: { _source_id: string; _source_type: string }
        Returns: Json
      }
      crm_log_communication: {
        Args: {
          _channel: string
          _direction: string
          _external_url?: string
          _occurred_at?: string
          _source_id: string
          _source_type: string
          _status?: string
          _subject?: string
          _summary: string
        }
        Returns: Json
      }
      crm_normalize_email: { Args: { _value: string }; Returns: string }
      crm_normalize_phone: { Args: { _value: string }; Returns: string }
      crm_recalculate_quotation: {
        Args: { _quotation_id: string }
        Returns: undefined
      }
      crm_refresh_action_notifications: { Args: never; Returns: Json }
      crm_save_buyer_profile: {
        Args: {
          _address?: string
          _buyer_type?: string
          _company_name?: string
          _country?: string
          _display_name?: string
          _email?: string
          _facebook_url?: string
          _instagram_url?: string
          _linkedin_url?: string
          _phone?: string
          _preferred_language?: string
          _product_interest?: string
          _quantity?: string
          _source_id: string
          _source_type: string
          _timezone?: string
          _website?: string
          _whatsapp?: string
        }
        Returns: Json
      }
      crm_schedule_buyer_meeting: {
        Args: {
          _agenda?: string
          _end_at: string
          _location_url?: string
          _meeting_type: string
          _source_id: string
          _source_type: string
          _start_at: string
          _timezone?: string
          _title: string
        }
        Returns: Json
      }
      crm_set_meeting_outcome: {
        Args: { _meeting_id: string; _outcome_notes: string; _status: string }
        Returns: Json
      }
      crm_set_task_status: {
        Args: { _status: string; _task_id: string }
        Returns: Json
      }
      crm_source_contact_snapshot: {
        Args: { _source_id: string; _source_type: string }
        Returns: Json
      }
      crm_source_exists: {
        Args: { _source_id: string; _source_type: string }
        Returns: boolean
      }
      crm_update_buyer_operating_state: {
        Args: {
          _assignee?: string
          _follow_up_at?: string
          _outcome_reason?: string
          _outreach_opt_out?: boolean
          _priority: string
          _source_id: string
          _source_type: string
          _stage: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fail_ai_image_processing_job: {
        Args: {
          _id: string
          _lock_token: string
          _message: string
          _review_required?: boolean
        }
        Returns: boolean
      }
      fail_social_render_job: {
        Args: { _job_id: string; _message: string }
        Returns: undefined
      }
      finalize_sitemap_submission: { Args: never; Returns: boolean }
      finish_catalog_media_worker_job_v1: {
        Args: {
          p_error?: string
          p_job_id: string
          p_result?: Json
          p_status: string
        }
        Returns: undefined
      }
      get_public_catalog_route_manifest: {
        Args: never
        Returns: {
          audience_name: string
          audience_slug: string
          canonical_path: string
          gallery: string[]
          image_url: string
          main_category_name: string
          main_category_slug: string
          product_description: string
          product_id: string
          product_name: string
          product_slug: string
          product_type_name: string
          product_type_slug: string
          reference_code: string
          seo_description: string
          seo_h1: string
          seo_title: string
          short_description: string
          updated_at: string
        }[]
      }
      get_public_homepage_media: {
        Args: never
        Returns: {
          alt_text: string
          public_url: string
          role: string
        }[]
      }
      get_public_legacy_redirects: {
        Args: never
        Returns: {
          from_path: string
          to_path: string
          updated_at: string
        }[]
      }
      get_public_sitemap_entries: {
        Args: never
        Returns: {
          entry_kind: string
          image_url: string
          lastmod: string
          path: string
        }[]
      }
      gmail_promote_inbox_item_to_lead: {
        Args: {
          _buyer_type?: string
          _company_name: string
          _country: string
          _gmail_item_id: string
          _priority?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      internal_e001_refresh_protected_refs: { Args: never; Returns: Json }
      invoke_irha_operations: {
        Args: { p_action: string; p_body?: Json; p_trigger_source?: string }
        Returns: number
      }
      invoke_next_lead_verification: {
        Args: { p_limit?: number; p_trigger_source?: string }
        Returns: number
      }
      is_irha_business_email: { Args: { p_email: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_irha_inquiry_ref: { Args: never; Returns: string }
      notification_begin_dispatch: {
        Args: { _minimum_seconds?: number }
        Returns: boolean
      }
      notification_claim_outbox: {
        Args: { _limit?: number }
        Returns: {
          attempt_count: number
          channel: string
          created_at: string
          dedupe_key: string
          event_key: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          notification_id: string | null
          payload: Json
          provider: string | null
          recipient: string
          response_metadata: Json
          sent_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      notification_consume_dispatch_token: {
        Args: { _token: string }
        Returns: boolean
      }
      notification_delivery_health: { Args: never; Returns: Json }
      notification_dispatch_tick: { Args: never; Returns: number }
      notification_get_secret: { Args: { _name: string }; Returns: string }
      notification_normalize_outbound_payload: {
        Args: { _payload: Json }
        Returns: Json
      }
      notification_owner_email: { Args: never; Returns: string }
      notification_requeue_blocked: {
        Args: { _channel: string }
        Returns: number
      }
      owner_auth_readiness: { Args: never; Returns: Json }
      owner_bootstrap_open: { Args: never; Returns: boolean }
      production_add_closeout_cost: {
        Args: {
          _category: string
          _closeout_id: string
          _currency: string
          _description: string
          _evidence_reference?: string
          _exchange_rate: number
          _notes?: string
          _quantity: number
          _unit_cost: number
        }
        Returns: {
          amount_base: number | null
          category: string
          closeout_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          evidence_reference: string | null
          exchange_rate_to_base: number
          id: string
          notes: string | null
          production_job_id: string
          quantity: number
          unit_cost: number
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "production_cost_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_add_closeout_issue: {
        Args: {
          _closeout_id: string
          _description?: string
          _issue_type: string
          _severity: string
          _title: string
        }
        Returns: {
          closeout_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          issue_type: string
          owner_waiver_reason: string | null
          production_job_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_closeout_issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_add_qc_defect: {
        Args: {
          _category: string
          _description: string
          _due_at?: string
          _inspection_id: string
          _location?: string
          _quantity: number
          _severity: string
        }
        Returns: {
          assigned_to: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          defect_category: string
          defect_code: string | null
          description: string
          due_at: string | null
          id: string
          inspection_id: string
          location: string | null
          production_job_id: string
          quantity: number
          rework_status: string
          root_cause: string | null
          severity: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "production_qc_defects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_approve_dispatch: {
        Args: { _shipment_id: string }
        Returns: {
          booking_reference: string | null
          consignee_company: string | null
          consignee_email: string | null
          consignee_name: string | null
          consignee_phone: string | null
          courier_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          customs_reference: string | null
          declared_value: number | null
          delivered_at: string | null
          delivery_confirmed_by: string | null
          destination_address: string | null
          destination_city: string | null
          destination_country: string | null
          dispatch_approved_at: string | null
          dispatch_approved_by: string | null
          dispatched_at: string | null
          expected_delivery_at: string | null
          expected_dispatch_at: string | null
          export_reason: string | null
          id: string
          incoterm: string | null
          master_tracking_number: string | null
          notes: string | null
          owner_approval_required: boolean
          production_job_id: string
          service_level: string | null
          shipment_number: string
          shipping_mode: string
          status: string
          tracking_url: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_shipments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_close_order: {
        Args: { _closeout_id: string; _note?: string }
        Returns: {
          acceptance_notes: string | null
          acceptance_reference: string | null
          acceptance_status: string
          accepted_at: string | null
          base_currency: string
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_exchange_rate_to_base: number
          invoice_number: string | null
          lessons_learned: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          payment_reference: string | null
          payment_reviewed_at: string | null
          payment_status: string
          production_job_id: string
          shipment_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_order_closeouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_closeout_readiness: {
        Args: { _closeout_id: string }
        Returns: Json
      }
      production_confirm_delivery: {
        Args: { _delivery_evidence_id: string; _shipment_id: string }
        Returns: {
          booking_reference: string | null
          consignee_company: string | null
          consignee_email: string | null
          consignee_name: string | null
          consignee_phone: string | null
          courier_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          customs_reference: string | null
          declared_value: number | null
          delivered_at: string | null
          delivery_confirmed_by: string | null
          destination_address: string | null
          destination_city: string | null
          destination_country: string | null
          dispatch_approved_at: string | null
          dispatch_approved_by: string | null
          dispatched_at: string | null
          expected_delivery_at: string | null
          expected_dispatch_at: string | null
          export_reason: string | null
          id: string
          incoterm: string | null
          master_tracking_number: string | null
          notes: string | null
          owner_approval_required: boolean
          production_job_id: string
          service_level: string | null
          shipment_number: string
          shipping_mode: string
          status: string
          tracking_url: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_shipments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_create_qc_inspection: {
        Args: {
          _failed_quantity: number
          _inspected_quantity: number
          _inspection_type: string
          _job_id: string
          _notes?: string
          _passed_quantity: number
          _status: string
        }
        Returns: {
          checklist: Json
          created_at: string
          created_by: string | null
          failed_quantity: number
          id: string
          inspected_at: string | null
          inspected_quantity: number
          inspection_number: string
          inspection_type: string
          inspector_id: string | null
          measurement_summary: Json
          notes: string | null
          operation_id: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          passed_quantity: number
          production_job_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_qc_inspections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_ensure_closeout: {
        Args: { _job_id: string }
        Returns: {
          acceptance_notes: string | null
          acceptance_reference: string | null
          acceptance_status: string
          accepted_at: string | null
          base_currency: string
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_exchange_rate_to_base: number
          invoice_number: string | null
          lessons_learned: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          payment_reference: string | null
          payment_reviewed_at: string | null
          payment_status: string
          production_job_id: string
          shipment_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_order_closeouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_owner_close_qc: { Args: { _job_id: string }; Returns: Json }
      production_owner_review_closeout: {
        Args: { _approve: boolean; _closeout_id: string; _note?: string }
        Returns: {
          acceptance_notes: string | null
          acceptance_reference: string | null
          acceptance_status: string
          accepted_at: string | null
          base_currency: string
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_exchange_rate_to_base: number
          invoice_number: string | null
          lessons_learned: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          payment_reference: string | null
          payment_reviewed_at: string | null
          payment_status: string
          production_job_id: string
          shipment_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_order_closeouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_prepare_repeat_order: {
        Args: {
          _closeout_id: string
          _cycle_days?: number
          _lead_time_days?: number
          _outreach_draft?: string
          _quantity_text?: string
          _rationale?: string
        }
        Returns: {
          buyer_name: string
          closeout_id: string
          company_name: string | null
          contacted_at: string | null
          created_at: string
          created_by: string | null
          estimated_lead_time_days: number
          follow_up_due_date: string
          id: string
          outreach_draft: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          priority: string
          product_name: string
          production_job_id: string
          rationale: string | null
          reorder_cycle_days: number
          source_id: string | null
          source_type: string | null
          status: string
          suggested_quantity_text: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_repeat_order_opportunities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_qc_readiness: { Args: { _job_id: string }; Returns: Json }
      production_record_delivery_acceptance: {
        Args: {
          _accepted_at?: string
          _closeout_id: string
          _notes?: string
          _reference?: string
          _status: string
        }
        Returns: {
          acceptance_notes: string | null
          acceptance_reference: string | null
          acceptance_status: string
          accepted_at: string | null
          base_currency: string
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_exchange_rate_to_base: number
          invoice_number: string | null
          lessons_learned: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          payment_reference: string | null
          payment_reviewed_at: string | null
          payment_status: string
          production_job_id: string
          shipment_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_order_closeouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_record_dispatch: {
        Args: {
          _booking_reference: string
          _shipment_id: string
          _tracking_number: string
          _tracking_url?: string
        }
        Returns: {
          booking_reference: string | null
          consignee_company: string | null
          consignee_email: string | null
          consignee_name: string | null
          consignee_phone: string | null
          courier_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          customs_reference: string | null
          declared_value: number | null
          delivered_at: string | null
          delivery_confirmed_by: string | null
          destination_address: string | null
          destination_city: string | null
          destination_country: string | null
          dispatch_approved_at: string | null
          dispatch_approved_by: string | null
          dispatched_at: string | null
          expected_delivery_at: string | null
          expected_dispatch_at: string | null
          export_reason: string | null
          id: string
          incoterm: string | null
          master_tracking_number: string | null
          notes: string | null
          owner_approval_required: boolean
          production_job_id: string
          service_level: string | null
          shipment_number: string
          shipping_mode: string
          status: string
          tracking_url: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_shipments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_record_sample_decision: {
        Args: {
          _approved_specification_reference?: string
          _decision_reference?: string
          _decision_source: string
          _job_id: string
          _notes?: string
          _sample_round: number
          _status: string
        }
        Returns: {
          approved_specification_reference: string | null
          created_at: string
          created_by: string | null
          decision_at: string | null
          decision_reference: string | null
          decision_source: string
          id: string
          notes: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          production_job_id: string
          sample_round: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_sample_approvals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_refresh_job_status: {
        Args: { _job_id: string }
        Returns: {
          assigned_to: string | null
          buyer_approval_status: string
          buyer_name: string
          buyer_notification_status: string
          buyer_target_text: string | null
          closeout_risk: string
          closeout_status: string
          commercially_closed_at: string | null
          commercially_closed_by: string | null
          company_name: string | null
          completion_percent: number
          courier_name: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          dispatch_approved_at: string | null
          dispatch_approved_by: string | null
          dispatch_ready_at: string | null
          dispatched_at: string | null
          id: string
          internal_ship_target: string | null
          internal_target_date: string | null
          job_number: string
          job_type: string
          metadata: Json
          notes: string | null
          order_reference: string | null
          owner_approval_required: boolean
          owner_approved_at: string | null
          owner_approved_by: string | null
          planned_start_date: string | null
          priority: string
          product_name: string
          production_plan_status: string
          qc_status: string
          quality_release_status: string
          quality_released_at: string | null
          quality_released_by: string | null
          quality_risk: string
          quantity_text: string
          released_at: string | null
          released_by: string | null
          risk_level: string
          sample_status: string
          shipping_risk: string
          shipping_status: string
          source_id: string | null
          source_type: string | null
          specification_reference: string
          stage: string
          tracking_number: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_refresh_job_status_internal: {
        Args: { _job_id: string }
        Returns: undefined
      }
      production_register_evidence: {
        Args: {
          _checksum_sha256?: string
          _defect_id?: string
          _evidence_note?: string
          _evidence_type: string
          _file_name: string
          _inspection_id?: string
          _job_id: string
          _mime_type: string
          _sample_approval_id?: string
          _size_bytes: number
          _storage_path: string
        }
        Returns: {
          checksum_sha256: string | null
          created_at: string
          defect_id: string | null
          evidence_note: string | null
          evidence_type: string
          file_name: string
          id: string
          inspection_id: string | null
          mime_type: string
          production_job_id: string
          sample_approval_id: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "production_evidence_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_release_job: {
        Args: { _job_id: string; _owner_note?: string }
        Returns: {
          assigned_to: string | null
          buyer_approval_status: string
          buyer_name: string
          buyer_notification_status: string
          buyer_target_text: string | null
          closeout_risk: string
          closeout_status: string
          commercially_closed_at: string | null
          commercially_closed_by: string | null
          company_name: string | null
          completion_percent: number
          courier_name: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          dispatch_approved_at: string | null
          dispatch_approved_by: string | null
          dispatch_ready_at: string | null
          dispatched_at: string | null
          id: string
          internal_ship_target: string | null
          internal_target_date: string | null
          job_number: string
          job_type: string
          metadata: Json
          notes: string | null
          order_reference: string | null
          owner_approval_required: boolean
          owner_approved_at: string | null
          owner_approved_by: string | null
          planned_start_date: string | null
          priority: string
          product_name: string
          production_plan_status: string
          qc_status: string
          quality_release_status: string
          quality_released_at: string | null
          quality_released_by: string | null
          quality_risk: string
          quantity_text: string
          released_at: string | null
          released_by: string | null
          risk_level: string
          sample_status: string
          shipping_risk: string
          shipping_status: string
          source_id: string | null
          source_type: string | null
          specification_reference: string
          stage: string
          tracking_number: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_release_readiness: { Args: { _job_id: string }; Returns: Json }
      production_resolve_closeout_issue: {
        Args: { _issue_id: string; _resolution: string; _status: string }
        Returns: {
          closeout_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          issue_type: string
          owner_waiver_reason: string | null
          production_job_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_closeout_issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_set_repeat_order_status: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: {
          buyer_name: string
          closeout_id: string
          company_name: string | null
          contacted_at: string | null
          created_at: string
          created_by: string | null
          estimated_lead_time_days: number
          follow_up_due_date: string
          id: string
          outreach_draft: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          priority: string
          product_name: string
          production_job_id: string
          rationale: string | null
          reorder_cycle_days: number
          source_id: string | null
          source_type: string | null
          status: string
          suggested_quantity_text: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_repeat_order_opportunities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_set_rework_status: {
        Args: {
          _corrective_action?: string
          _defect_id: string
          _root_cause?: string
          _status: string
        }
        Returns: {
          assigned_to: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          defect_category: string
          defect_code: string | null
          description: string
          due_at: string | null
          id: string
          inspection_id: string
          location: string | null
          production_job_id: string
          quantity: number
          rework_status: string
          root_cause: string | null
          severity: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "production_qc_defects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_shipping_readiness: {
        Args: { _shipment_id: string }
        Returns: Json
      }
      production_update_closeout_commercial: {
        Args: {
          _closeout_id: string
          _closeout_notes?: string
          _exchange_rate: number
          _invoice_amount: number
          _invoice_currency: string
          _invoice_number: string
          _lessons_learned?: string
          _payment_reference?: string
          _payment_status: string
        }
        Returns: {
          acceptance_notes: string | null
          acceptance_reference: string | null
          acceptance_status: string
          accepted_at: string | null
          base_currency: string
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_amount: number | null
          invoice_currency: string | null
          invoice_exchange_rate_to_base: number
          invoice_number: string | null
          lessons_learned: string | null
          owner_review_status: string
          owner_reviewed_at: string | null
          owner_reviewed_by: string | null
          payment_reference: string | null
          payment_reviewed_at: string | null
          payment_status: string
          production_job_id: string
          shipment_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_order_closeouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_verify_closeout_cost: {
        Args: { _cost_id: string; _note?: string; _status: string }
        Returns: {
          amount_base: number | null
          category: string
          closeout_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          evidence_reference: string | null
          exchange_rate_to_base: number
          id: string
          notes: string | null
          production_job_id: string
          quantity: number
          unit_cost: number
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "production_cost_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      production_verify_evidence: {
        Args: { _evidence_id: string; _status: string }
        Returns: {
          checksum_sha256: string | null
          created_at: string
          defect_id: string | null
          evidence_note: string | null
          evidence_type: string
          file_name: string
          id: string
          inspection_id: string | null
          mime_type: string
          production_job_id: string
          sample_approval_id: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "production_evidence_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_slot_ref: {
        Args: { _reference_code: string }
        Returns: {
          approved_media_count: number
          audience_slug: string
          created_at: string
          factual_description: string | null
          family_slug: string
          id: string
          main_slug: string
          owner_approved_title: string | null
          owner_signed_off: boolean
          publish_state: string
          publishable: boolean | null
          published_at: string | null
          published_by: string | null
          reference_code: string
          slot_slug: string
          spec_sheet_ready: boolean
          taxonomy_assigned: boolean
          unpublished_at: string | null
          unpublished_reason: string | null
          updated_at: string
          updated_by: string | null
          working_title: string
        }
        SetofOptions: {
          from: "*"
          to: "catalog_slot_completion"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      queue_sitemap_submission: {
        Args: { _force?: boolean; _token: string }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_public_app_incident: {
        Args: {
          _component_stack?: string
          _error_message?: string
          _error_name: string
          _incident_id: string
          _route: string
          _source_sha?: string
          _user_agent?: string
        }
        Returns: boolean
      }
      record_sitemap_submission_result: {
        Args: {
          _error?: string
          _http_status: number
          _ok: boolean
          _token: string
        }
        Returns: boolean
      }
      refresh_admin_ai_snapshot_cache: { Args: never; Returns: Json }
      refresh_all_drive_product_galleries: { Args: never; Returns: Json }
      refresh_drive_product_gallery: {
        Args: { _product_id: string }
        Returns: Json
      }
      social_attach_verified_render: {
        Args: { _item_id: string; _render_job_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_calendar_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      social_claim_due_publications: {
        Args: { _limit?: number; _worker_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "social_calendar_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      social_complete_publication: {
        Args: {
          _connector_result?: Json
          _error?: string
          _external_post_id?: string
          _external_post_url?: string
          _item_id: string
          _lock_token: string
          _run_id: string
          _status: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_calendar_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      social_fail_publication: {
        Args: {
          _connector_result?: Json
          _error: string
          _item_id: string
          _lock_token: string
          _run_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_calendar_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      social_growth_health: { Args: never; Returns: Json }
      social_record_manual_metrics: {
        Args: {
          _clicks?: number
          _comments?: number
          _evidence?: Json
          _followers_delta?: number
          _impressions?: number
          _item_id: string
          _likes?: number
          _profile_visits?: number
          _reach?: number
          _saves?: number
          _shares?: number
          _snapshot_at: string
          _views?: number
        }
        Returns: {
          clicks: number
          collected_by: string | null
          comments: number
          created_at: string
          external_post_id: string | null
          external_post_url: string | null
          followers_delta: number
          id: string
          impressions: number
          item_id: string
          likes: number
          platform: string
          profile_visits: number
          provider_snapshot_key: string | null
          raw_metrics: Json
          reach: number
          saves: number
          shares: number
          snapshot_at: string
          source: string
          verified: boolean
          views: number
        }
        SetofOptions: {
          from: "*"
          to: "social_metric_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      social_request_publication: {
        Args: {
          _delivery_mode?: string
          _item_id: string
          _scheduled_at?: string
          _timezone?: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_calendar_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      social_revoke_publication: {
        Args: { _item_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_calendar_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      social_set_recommendation_status: {
        Args: { _id: string; _status: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          evidence: Json
          id: string
          item_id: string | null
          priority: number
          proposed_action: string
          reason: string
          recommendation_type: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "social_growth_recommendations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      social_set_tracking: {
        Args: {
          _item_id: string
          _tracking_url: string
          _utm_campaign?: string
          _utm_content?: string
          _utm_medium?: string
          _utm_source: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          call_to_action: string | null
          campaign_id: string
          caption: string
          carousel_outline: Json
          connector_result: Json
          content_type: string
          created_at: string
          creative_brief: Json
          creative_status: string
          delivery_lock_token: string | null
          delivery_locked_at: string | null
          delivery_mode: string
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          last_attempt_at: string | null
          last_worker_id: string | null
          max_attempts: number
          metrics_last_collected_at: string | null
          next_attempt_at: string | null
          platform: string
          platform_account_id: string | null
          product_id: string | null
          product_url: string | null
          publish_approved_at: string | null
          publish_approved_by: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          render_verified: boolean
          risk_flags: string[]
          scheduled_at: string | null
          source_media_asset_id: string | null
          source_render_job_id: string | null
          status: string
          timezone: string
          title: string
          tracking_url: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_calendar_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_b2b_inquiry: {
        Args: { _payload: Json }
        Returns: {
          inquiry_id: string
          inquiry_ref: string
        }[]
      }
      unpublish_slot_ref: {
        Args: { _reason: string; _reference_code: string }
        Returns: {
          approved_media_count: number
          audience_slug: string
          created_at: string
          factual_description: string | null
          family_slug: string
          id: string
          main_slug: string
          owner_approved_title: string | null
          owner_signed_off: boolean
          publish_state: string
          publishable: boolean | null
          published_at: string | null
          published_by: string | null
          reference_code: string
          slot_slug: string
          spec_sheet_ready: boolean
          taxonomy_assigned: boolean
          unpublished_at: string | null
          unpublished_reason: string | null
          updated_at: string
          updated_by: string | null
          working_title: string
        }
        SetofOptions: {
          from: "*"
          to: "catalog_slot_completion"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin"
      lead_status: "New" | "Pitched" | "Warm" | "Replied" | "Rejected"
      placement_page_type:
        | "home"
        | "main_category"
        | "audience"
        | "family"
        | "product"
        | "static"
      slot_media_role:
        | "hero"
        | "three_quarter"
        | "side"
        | "rear_three_quarter"
        | "back"
        | "macro"
        | "branding_detail"
        | "packaging"
        | "gallery"
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
    Enums: {
      app_role: ["admin"],
      lead_status: ["New", "Pitched", "Warm", "Replied", "Rejected"],
      placement_page_type: [
        "home",
        "main_category",
        "audience",
        "family",
        "product",
        "static",
      ],
      slot_media_role: [
        "hero",
        "three_quarter",
        "side",
        "rear_three_quarter",
        "back",
        "macro",
        "branding_detail",
        "packaging",
        "gallery",
      ],
    },
  },
} as const
