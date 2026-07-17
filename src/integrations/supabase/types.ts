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
          created_at: string
          id: string
          message: string
          role: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          role: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          role?: string
          session_id?: string
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
          quantity: string | null
          quotation_url: string | null
          sample_status: string
          source: string | null
          status: string
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
          quantity?: string | null
          quotation_url?: string | null
          sample_status?: string
          source?: string | null
          status?: string
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
          quantity?: string | null
          quotation_url?: string | null
          sample_status?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          alt_text: string | null
          bucket: string
          checksum_sha256: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          file_name: string
          height_px: number | null
          id: string
          mime_type: string
          object_path: string
          public_url: string
          responsive_format: string | null
          responsive_generated_at: string | null
          responsive_total_size_bytes: number | null
          responsive_widths: number[] | null
          size_bytes: number
          social_approved: boolean
          social_approved_at: string | null
          social_approved_by: string | null
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
          alt_text?: string | null
          bucket?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          file_name: string
          height_px?: number | null
          id?: string
          mime_type: string
          object_path: string
          public_url: string
          responsive_format?: string | null
          responsive_generated_at?: string | null
          responsive_total_size_bytes?: number | null
          responsive_widths?: number[] | null
          size_bytes: number
          social_approved?: boolean
          social_approved_at?: string | null
          social_approved_by?: string | null
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
          alt_text?: string | null
          bucket?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          file_name?: string
          height_px?: number | null
          id?: string
          mime_type?: string
          object_path?: string
          public_url?: string
          responsive_format?: string | null
          responsive_generated_at?: string | null
          responsive_total_size_bytes?: number | null
          responsive_widths?: number[] | null
          size_bytes?: number
          social_approved?: boolean
          social_approved_at?: string | null
          social_approved_by?: string | null
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
        Relationships: []
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
      outreach_messages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_text: string
          campaign_id: string
          connector_response: Json
          created_at: string
          error: string | null
          gmail_history_id: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          idempotency_key: string
          language: string
          lead_id: string
          parent_message_id: string | null
          personalization_evidence: Json
          recipient_company: string
          recipient_email: string
          replied_at: string | null
          sent_at: string | null
          sequence_number: number
          status: string
          subject: string
          unsubscribe_token: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_text: string
          campaign_id: string
          connector_response?: Json
          created_at?: string
          error?: string | null
          gmail_history_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          idempotency_key: string
          language?: string
          lead_id: string
          parent_message_id?: string | null
          personalization_evidence?: Json
          recipient_company: string
          recipient_email: string
          replied_at?: string | null
          sent_at?: string | null
          sequence_number?: number
          status?: string
          subject: string
          unsubscribe_token?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_text?: string
          campaign_id?: string
          connector_response?: Json
          created_at?: string
          error?: string | null
          gmail_history_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          idempotency_key?: string
          language?: string
          lead_id?: string
          parent_message_id?: string | null
          personalization_evidence?: Json
          recipient_company?: string
          recipient_email?: string
          replied_at?: string | null
          sent_at?: string | null
          sequence_number?: number
          status?: string
          subject?: string
          unsubscribe_token?: string
          updated_at?: string
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
        ]
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
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
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
          company_name: string | null
          courier_name: string | null
          created_at: string
          created_by: string | null
          id: string
          internal_target_date: string | null
          job_number: string
          job_type: string
          metadata: Json
          notes: string | null
          owner_approval_required: boolean
          owner_approved_at: string | null
          owner_approved_by: string | null
          priority: string
          product_name: string
          qc_status: string
          quantity_text: string
          sample_status: string
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
          company_name?: string | null
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_target_date?: string | null
          job_number: string
          job_type: string
          metadata?: Json
          notes?: string | null
          owner_approval_required?: boolean
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          priority?: string
          product_name: string
          qc_status?: string
          quantity_text: string
          sample_status?: string
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
          company_name?: string | null
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_target_date?: string | null
          job_number?: string
          job_type?: string
          metadata?: Json
          notes?: string | null
          owner_approval_required?: boolean
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          priority?: string
          product_name?: string
          qc_status?: string
          quantity_text?: string
          sample_status?: string
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
      products: {
        Row: {
          available_colors: string[]
          available_sizes: string[]
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
          material_specifications: string | null
          moq_display: string | null
          moq_min: number | null
          name: string
          packaging_custom: boolean | null
          packaging_standard: string | null
          primary_material: string | null
          production_timeline: string | null
          related_product_ids: string[]
          sample_available: boolean | null
          sample_timeline: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          size_notes: string | null
          sku: string | null
          slug: string
          sort_order: number
          specs: string[]
          updated_at: string
        }
        Insert: {
          available_colors?: string[]
          available_sizes?: string[]
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
          material_specifications?: string | null
          moq_display?: string | null
          moq_min?: number | null
          name: string
          packaging_custom?: boolean | null
          packaging_standard?: string | null
          primary_material?: string | null
          production_timeline?: string | null
          related_product_ids?: string[]
          sample_available?: boolean | null
          sample_timeline?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          size_notes?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          specs?: string[]
          updated_at?: string
        }
        Update: {
          available_colors?: string[]
          available_sizes?: string[]
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
          material_specifications?: string | null
          moq_display?: string | null
          moq_min?: number | null
          name?: string
          packaging_custom?: boolean | null
          packaging_standard?: string | null
          primary_material?: string | null
          production_timeline?: string | null
          related_product_ids?: string[]
          sample_available?: boolean | null
          sample_timeline?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          size_notes?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
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
          error: string | null
          external_post_id: string | null
          external_post_url: string | null
          hashtags: string[]
          id: string
          idempotency_key: string
          image_url: string | null
          language: string
          platform: string
          product_id: string | null
          product_url: string | null
          publish_attempts: number
          published_at: string | null
          reel_script: string | null
          risk_flags: string[]
          scheduled_at: string | null
          status: string
          timezone: string
          title: string
          updated_at: string
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
          error?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          hashtags?: string[]
          id?: string
          idempotency_key: string
          image_url?: string | null
          language?: string
          platform: string
          product_id?: string | null
          product_url?: string | null
          publish_attempts?: number
          published_at?: string | null
          reel_script?: string | null
          risk_flags?: string[]
          scheduled_at?: string | null
          status?: string
          timezone?: string
          title: string
          updated_at?: string
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
          error?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          hashtags?: string[]
          id?: string
          idempotency_key?: string
          image_url?: string | null
          language?: string
          platform?: string
          product_id?: string | null
          product_url?: string | null
          publish_attempts?: number
          published_at?: string | null
          reel_script?: string | null
          risk_flags?: string[]
          scheduled_at?: string | null
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
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
            foreignKeyName: "social_calendar_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
        ]
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
    }
    Functions: {
      automation_today_key: { Args: { _timezone: string }; Returns: string }
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
      consume_public_submission_limit: {
        Args: {
          _action: string
          _fingerprint_hash: string
          _max_count: number
          _window_seconds: number
        }
        Returns: boolean
      }
      create_automation_planning_cycle: {
        Args: { _trigger_source?: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
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
    },
  },
} as const
