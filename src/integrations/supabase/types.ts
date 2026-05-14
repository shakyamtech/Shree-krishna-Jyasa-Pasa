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
      cashbook: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["cash_direction"]
          entry_date: string
          id: string
          note: string | null
          party_id: string | null
          party_type: Database["public"]["Enums"]["party_type"] | null
          payment_mode: string
          ref_id: string | null
          ref_table: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["cash_direction"]
          entry_date?: string
          id?: string
          note?: string | null
          party_id?: string | null
          party_type?: Database["public"]["Enums"]["party_type"] | null
          payment_mode?: string
          ref_id?: string | null
          ref_table?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["cash_direction"]
          entry_date?: string
          id?: string
          note?: string | null
          party_id?: string | null
          party_type?: Database["public"]["Enums"]["party_type"] | null
          payment_mode?: string
          ref_id?: string | null
          ref_table?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          metal: Database["public"]["Enums"]["metal_type"]
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          metal?: Database["public"]["Enums"]["metal_type"]
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          metal?: Database["public"]["Enums"]["metal_type"]
          name?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          created_at: string
          credit: number
          debit: number
          entry_date: string
          id: string
          note: string | null
          party_id: string
          party_type: Database["public"]["Enums"]["party_type"]
          ref_id: string | null
          ref_table: string | null
        }
        Insert: {
          created_at?: string
          credit?: number
          debit?: number
          entry_date?: string
          id?: string
          note?: string | null
          party_id: string
          party_type: Database["public"]["Enums"]["party_type"]
          ref_id?: string | null
          ref_table?: string | null
        }
        Update: {
          created_at?: string
          credit?: number
          debit?: number
          entry_date?: string
          id?: string
          note?: string | null
          party_id?: string
          party_type?: Database["public"]["Enums"]["party_type"]
          ref_id?: string | null
          ref_table?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opening_balance: number
          pan: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          pan?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          pan?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metal_prices: {
        Row: {
          currency: string
          fetched_at: string
          id: string
          metal: Database["public"]["Enums"]["metal_type"]
          price_per_gram: number
          price_per_tola: number
          source: string | null
        }
        Insert: {
          currency?: string
          fetched_at?: string
          id?: string
          metal: Database["public"]["Enums"]["metal_type"]
          price_per_gram: number
          price_per_tola: number
          source?: string | null
        }
        Update: {
          currency?: string
          fetched_at?: string
          id?: string
          metal?: Database["public"]["Enums"]["metal_type"]
          price_per_gram?: number
          price_per_tola?: number
          source?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string
          id: string
          image_url: string | null
          making_charge: number
          metal: Database["public"]["Enums"]["metal_type"]
          min_stock: number
          name: string
          notes: string | null
          purity: string | null
          sku: string | null
          stock_qty: number
          updated_at: string
          weight_gram: number
        }
        Insert: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          making_charge?: number
          metal?: Database["public"]["Enums"]["metal_type"]
          min_stock?: number
          name: string
          notes?: string | null
          purity?: string | null
          sku?: string | null
          stock_qty?: number
          updated_at?: string
          weight_gram?: number
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          making_charge?: number
          metal?: Database["public"]["Enums"]["metal_type"]
          min_stock?: number
          name?: string
          notes?: string | null
          purity?: string | null
          sku?: string | null
          stock_qty?: number
          updated_at?: string
          weight_gram?: number
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
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          amount: number
          description: string
          id: string
          making_charge: number
          metal: Database["public"]["Enums"]["metal_type"]
          product_id: string | null
          purchase_id: string
          purity: string | null
          qty: number
          rate_per_gram: number
          weight_gram: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          making_charge?: number
          metal?: Database["public"]["Enums"]["metal_type"]
          product_id?: string | null
          purchase_id: string
          purity?: string | null
          qty?: number
          rate_per_gram?: number
          weight_gram?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          making_charge?: number
          metal?: Database["public"]["Enums"]["metal_type"]
          product_id?: string | null
          purchase_id?: string
          purity?: string | null
          qty?: number
          rate_per_gram?: number
          weight_gram?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          bill_no: string
          created_at: string
          created_by: string | null
          due: number
          id: string
          notes: string | null
          paid: number
          payment_mode: string
          purchase_date: string
          subtotal: number
          supplier_id: string | null
          total: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          bill_no?: string
          created_at?: string
          created_by?: string | null
          due?: number
          id?: string
          notes?: string | null
          paid?: number
          payment_mode?: string
          purchase_date?: string
          subtotal?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          bill_no?: string
          created_at?: string
          created_by?: string | null
          due?: number
          id?: string
          notes?: string | null
          paid?: number
          payment_mode?: string
          purchase_date?: string
          subtotal?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          amount: number
          description: string
          id: string
          making_charge: number
          metal: Database["public"]["Enums"]["metal_type"]
          product_id: string | null
          purity: string | null
          qty: number
          rate_per_gram: number
          sale_id: string
          weight_gram: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          making_charge?: number
          metal?: Database["public"]["Enums"]["metal_type"]
          product_id?: string | null
          purity?: string | null
          qty?: number
          rate_per_gram?: number
          sale_id: string
          weight_gram?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          making_charge?: number
          metal?: Database["public"]["Enums"]["metal_type"]
          product_id?: string | null
          purity?: string | null
          qty?: number
          rate_per_gram?: number
          sale_id?: string
          weight_gram?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          due: number
          id: string
          invoice_no: string
          making_total: number
          notes: string | null
          paid: number
          payment_mode: string
          sale_date: string
          subtotal: number
          total: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          due?: number
          id?: string
          invoice_no?: string
          making_total?: number
          notes?: string | null
          paid?: number
          payment_mode?: string
          sale_date?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          due?: number
          id?: string
          invoice_no?: string
          making_total?: number
          notes?: string | null
          paid?: number
          payment_mode?: string
          sale_date?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          address: string | null
          bill_footer: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          invoice_prefix: string
          logo_url: string | null
          pan_vat: string | null
          phone: string | null
          shop_name: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          address?: string | null
          bill_footer?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          pan_vat?: string | null
          phone?: string | null
          shop_name?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          address?: string | null
          bill_footer?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          pan_vat?: string | null
          phone?: string | null
          shop_name?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          qty: number
          ref_id: string | null
          ref_table: string | null
          type: Database["public"]["Enums"]["movement_type"]
          weight_gram: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          qty?: number
          ref_id?: string | null
          ref_table?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          weight_gram?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          qty?: number
          ref_id?: string | null
          ref_table?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          weight_gram?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opening_balance: number
          pan: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          pan?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          pan?: string | null
          phone?: string | null
          updated_at?: string
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
      is_staff_or_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "staff"
      cash_direction: "in" | "out"
      metal_type: "gold" | "silver" | "other"
      movement_type: "in" | "out" | "adjust"
      party_type: "customer" | "supplier"
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
      app_role: ["owner", "staff"],
      cash_direction: ["in", "out"],
      metal_type: ["gold", "silver", "other"],
      movement_type: ["in", "out", "adjust"],
      party_type: ["customer", "supplier"],
    },
  },
} as const
