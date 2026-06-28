export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      cart_items: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          quantity?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          cover_image: string | null;
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          subtotal_cents: number;
          title: string;
          unit_price_cents: number;
          vendor_id: string;
        };
        Insert: {
          cover_image?: string | null;
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          subtotal_cents: number;
          title: string;
          unit_price_cents: number;
          vendor_id: string;
        };
        Update: {
          cover_image?: string | null;
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          subtotal_cents?: number;
          title?: string;
          unit_price_cents?: number;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          order_number: string;
          shipping_address: Json | null;
          shipping_cents: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          tax_cents: number;
          total_cents: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          order_number?: string;
          shipping_address?: Json | null;
          shipping_cents?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          order_number?: string;
          shipping_address?: Json | null;
          shipping_cents?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_profiles_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      preservation_requests: {
        Row: {
          created_at: string;
          current_stage: Database["public"]["Enums"]["preservation_stage"];
          description: string | null;
          id: string;
          notes: string | null;
          preservation_type: string;
          quote_accepted: boolean;
          quote_cents: number | null;
          reference_images: Json;
          request_number: string;
          shape: string | null;
          size: string | null;
          updated_at: string;
          user_id: string;
          vendor_id: string | null;
        };
        Insert: {
          created_at?: string;
          current_stage?: Database["public"]["Enums"]["preservation_stage"];
          description?: string | null;
          id?: string;
          notes?: string | null;
          preservation_type: string;
          quote_accepted?: boolean;
          quote_cents?: number | null;
          reference_images?: Json;
          request_number?: string;
          shape?: string | null;
          size?: string | null;
          updated_at?: string;
          user_id: string;
          vendor_id?: string | null;
        };
        Update: {
          created_at?: string;
          current_stage?: Database["public"]["Enums"]["preservation_stage"];
          description?: string | null;
          id?: string;
          notes?: string | null;
          preservation_type?: string;
          quote_accepted?: boolean;
          quote_cents?: number | null;
          reference_images?: Json;
          request_number?: string;
          shape?: string | null;
          size?: string | null;
          updated_at?: string;
          user_id?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "preservation_requests_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pres_requests_user_id_profiles_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      preservation_stage_log: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          request_id: string;
          stage: Database["public"]["Enums"]["preservation_stage"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          request_id: string;
          stage: Database["public"]["Enums"]["preservation_stage"];
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          request_id?: string;
          stage?: Database["public"]["Enums"]["preservation_stage"];
        };
        Relationships: [
          {
            foreignKeyName: "preservation_stage_log_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "preservation_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          id: string;
          site_name: string;
          logo_url: string | null;
          contact_info: string | null;
          commission_percentage: number;
          support_email: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_name?: string;
          logo_url?: string | null;
          contact_info?: string | null;
          commission_percentage?: number;
          support_email?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_name?: string;
          logo_url?: string | null;
          contact_info?: string | null;
          commission_percentage?: number;
          support_email?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          category_id: string | null;
          color: string | null;
          compare_at_cents: number | null;
          cover_image: string | null;
          created_at: string;
          currency: string;
          custom_url: string | null;
          description: string | null;
          id: string;
          images: Json;
          is_customizable: boolean;
          is_featured: boolean;
          is_published: boolean;
          low_stock_threshold: number | null;
          material: string | null;
          meta_description: string | null;
          meta_title: string | null;
          price_cents: number;
          rating: number;
          review_count: number;
          sku: string | null;
          slug: string;
          status: string;
          stock: number;
          title: string;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          category_id?: string | null;
          color?: string | null;
          compare_at_cents?: number | null;
          cover_image?: string | null;
          created_at?: string;
          currency?: string;
          custom_url?: string | null;
          description?: string | null;
          id?: string;
          images?: Json;
          is_customizable?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          low_stock_threshold?: number | null;
          material?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          price_cents: number;
          rating?: number;
          review_count?: number;
          sku?: string | null;
          slug: string;
          status?: string;
          stock?: number;
          title: string;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          category_id?: string | null;
          color?: string | null;
          compare_at_cents?: number | null;
          cover_image?: string | null;
          created_at?: string;
          currency?: string;
          custom_url?: string | null;
          description?: string | null;
          id?: string;
          images?: Json;
          is_customizable?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          low_stock_threshold?: number | null;
          material?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          price_cents?: number;
          rating?: number;
          review_count?: number;
          sku?: string | null;
          slug?: string;
          status?: string;
          stock?: number;
          title?: string;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          is_active: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          product_id: string;
          rating: number;
          title: string | null;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          product_id: string;
          rating: number;
          title?: string | null;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          product_id?: string;
          rating?: number;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          banner_url: string | null;
          bio: string | null;
          created_at: string;
          id: string;
          location: string | null;
          logo_url: string | null;
          rating: number;
          slug: string;
          status: Database["public"]["Enums"]["vendor_status"];
          store_name: string;
          tagline: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          id?: string;
          location?: string | null;
          logo_url?: string | null;
          rating?: number;
          slug: string;
          status?: Database["public"]["Enums"]["vendor_status"];
          store_name: string;
          tagline?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          id?: string;
          location?: string | null;
          logo_url?: string | null;
          rating?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["vendor_status"];
          store_name?: string;
          tagline?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      vendor_payouts: {
        Row: {
          id: string;
          vendor_id: string;
          amount_cents: number;
          status: string;
          reference_note: string | null;
          created_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          amount_cents: number;
          status?: string;
          reference_note?: string | null;
          created_at?: string;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          amount_cents?: number;
          status?: string;
          reference_note?: string | null;
          created_at?: string;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlists: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_policies: {
        Row: {
          vendor_id: string;
          shipping_policy: string | null;
          return_policy: string | null;
          refund_policy: string | null;
          preservation_policy: string | null;
          terms_conditions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          vendor_id: string;
          shipping_policy?: string | null;
          return_policy?: string | null;
          refund_policy?: string | null;
          preservation_policy?: string | null;
          terms_conditions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          vendor_id?: string;
          shipping_policy?: string | null;
          return_policy?: string | null;
          refund_policy?: string | null;
          preservation_policy?: string | null;
          terms_conditions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_policies_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: true;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_earnings: {
        Row: {
          vendor_id: string;
          total_earnings_cents: number;
          available_balance_cents: number;
          pending_balance_cents: number;
          withdrawn_amount_cents: number;
          updated_at: string;
        };
        Insert: {
          vendor_id: string;
          total_earnings_cents?: number;
          available_balance_cents?: number;
          pending_balance_cents?: number;
          withdrawn_amount_cents?: number;
          updated_at?: string;
        };
        Update: {
          vendor_id?: string;
          total_earnings_cents?: number;
          available_balance_cents?: number;
          pending_balance_cents?: number;
          withdrawn_amount_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_earnings_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: true;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_withdrawals: {
        Row: {
          id: string;
          vendor_id: string;
          amount_cents: number;
          bank_details: Json | null;
          status: string;
          requested_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          amount_cents: number;
          bank_details?: Json | null;
          status?: string;
          requested_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          amount_cents?: number;
          bank_details?: Json | null;
          status?: string;
          requested_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_withdrawals_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_profiles: {
        Row: {
          vendor_id: string;
          contact_number: string | null;
          email: string | null;
          address: string | null;
          social_links: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          vendor_id: string;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          social_links?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          vendor_id?: string;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          social_links?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: true;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_portfolio: {
        Row: {
          id: string;
          vendor_id: string;
          media_url: string;
          media_type: string;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          media_url: string;
          media_type: string;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          media_url?: string;
          media_type?: string;
          category?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_portfolio_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "customer" | "vendor" | "admin";
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded";
      preservation_stage:
        | "submitted"
        | "consultation"
        | "item_received"
        | "cleaning"
        | "drying"
        | "casting"
        | "finishing"
        | "quality_check"
        | "ready_to_ship"
        | "delivered";
      vendor_status: "pending" | "approved" | "suspended";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "vendor", "admin"],
      order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      preservation_stage: [
        "submitted",
        "consultation",
        "item_received",
        "cleaning",
        "drying",
        "casting",
        "finishing",
        "quality_check",
        "ready_to_ship",
        "delivered",
      ],
      vendor_status: ["pending", "approved", "suspended"],
    },
  },
} as const;
