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
          country: string | null
          created_at: string
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
