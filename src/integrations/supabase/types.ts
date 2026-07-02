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
      b2b_leads: {
        Row: {
          apparel_segment: string | null
          company_name: string
          country: string
          created_at: string
          email: string | null
          id: string
          lead_status: Database["public"]["Enums"]["lead_status"]
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          apparel_segment?: string | null
          company_name: string
          country: string
          created_at?: string
          email?: string | null
          id?: string
          lead_status?: Database["public"]["Enums"]["lead_status"]
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          apparel_segment?: string | null
          company_name?: string
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          lead_status?: Database["public"]["Enums"]["lead_status"]
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
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
      catalogue_leads: {
        Row: {
          admin_notes: string | null
          catalogue_url: string | null
          category_interest: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          language: string | null
          message: string | null
          name: string
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
          catalogue_url?: string | null
          category_interest?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string | null
          message?: string | null
          name: string
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
          catalogue_url?: string | null
          category_interest?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string | null
          message?: string | null
          name?: string
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
          category: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          quantity: string | null
          source: string | null
          status: string
        }
        Insert: {
          category?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          quantity?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          category?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          quantity?: string | null
          source?: string | null
          status?: string
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
      products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          details: Json
          gallery: string[]
          id: string
          image_url: string | null
          is_published: boolean
          material_specifications: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          specs: string[]
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          details?: Json
          gallery?: string[]
          id?: string
          image_url?: string | null
          is_published?: boolean
          material_specifications?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          specs?: string[]
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          details?: Json
          gallery?: string[]
          id?: string
          image_url?: string | null
          is_published?: boolean
          material_specifications?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
