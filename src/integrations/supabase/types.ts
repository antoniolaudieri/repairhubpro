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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device_brand: string | null
          device_model: string | null
          device_type: string
          id: string
          issue_description: string
          notes: string | null
          preferred_date: string
          preferred_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device_brand?: string | null
          device_model?: string | null
          device_type: string
          id?: string
          issue_description: string
          notes?: string | null
          preferred_date: string
          preferred_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          device_brand?: string | null
          device_model?: string | null
          device_type?: string
          id?: string
          issue_description?: string
          notes?: string | null
          preferred_date?: string
          preferred_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          brand: string
          created_at: string
          customer_id: string
          device_type: string
          id: string
          imei: string | null
          initial_condition: string | null
          model: string
          password: string | null
          photo_url: string | null
          reported_issue: string
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          customer_id: string
          device_type: string
          id?: string
          imei?: string | null
          initial_condition?: string | null
          model: string
          password?: string | null
          photo_url?: string | null
          reported_issue: string
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          customer_id?: string
          device_type?: string
          id?: string
          imei?: string | null
          initial_condition?: string | null
          model?: string
          password?: string | null
          photo_url?: string | null
          reported_issue?: string
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          rating: number
          repair_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          rating: number
          repair_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          rating?: number
          repair_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_code: string | null
          product_name: string
          quantity: number
          spare_part_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_code?: string | null
          product_name: string
          quantity: number
          spare_part_id?: string | null
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_code?: string | null
          product_name?: string
          quantity?: number
          spare_part_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_spare_part_id_fkey"
            columns: ["spare_part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_number: string
          ordered_at: string | null
          received_at: string | null
          status: string
          supplier: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_number: string
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          supplier?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          supplier?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          device_brand: string | null
          device_model: string | null
          device_type: string
          diagnosis: string | null
          id: string
          issue_description: string
          items: Json
          labor_cost: number | null
          notes: string | null
          parts_cost: number | null
          signature_data: string | null
          signed_at: string | null
          status: string
          total_cost: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          device_brand?: string | null
          device_model?: string | null
          device_type: string
          diagnosis?: string | null
          id?: string
          issue_description: string
          items?: Json
          labor_cost?: number | null
          notes?: string | null
          parts_cost?: number | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          total_cost: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          device_brand?: string | null
          device_model?: string | null
          device_type?: string
          diagnosis?: string | null
          id?: string
          issue_description?: string
          items?: Json
          labor_cost?: number | null
          notes?: string | null
          parts_cost?: number | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          total_cost?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_parts: {
        Row: {
          created_at: string
          id: string
          quantity: number
          repair_id: string
          spare_part_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          repair_id: string
          spare_part_id: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          repair_id?: string
          spare_part_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_parts_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_parts_spare_part_id_fkey"
            columns: ["spare_part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          ai_suggestions: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          customer_email: string | null
          delivered_at: string | null
          device_id: string
          diagnosis: string | null
          estimated_cost: number | null
          final_cost: number | null
          final_cost_accepted_at: string | null
          final_cost_signature: string | null
          id: string
          intake_signature: string | null
          intake_signature_date: string | null
          priority: string
          repair_notes: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_suggestions?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          delivered_at?: string | null
          device_id: string
          diagnosis?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          final_cost_accepted_at?: string | null
          final_cost_signature?: string | null
          id?: string
          intake_signature?: string | null
          intake_signature_date?: string | null
          priority?: string
          repair_notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_suggestions?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          delivered_at?: string | null
          device_id?: string
          diagnosis?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          final_cost_accepted_at?: string | null
          final_cost_signature?: string | null
          id?: string
          intake_signature?: string | null
          intake_signature_date?: string | null
          priority?: string
          repair_notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repairs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_parts: {
        Row: {
          brand: string | null
          category: string
          cost: number | null
          created_at: string
          id: string
          image_url: string | null
          minimum_stock: number | null
          model_compatibility: string | null
          name: string
          notes: string | null
          selling_price: number | null
          stock_quantity: number
          supplier: string | null
          supplier_code: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category: string
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          minimum_stock?: number | null
          model_compatibility?: string | null
          name: string
          notes?: string | null
          selling_price?: number | null
          stock_quantity?: number
          supplier?: string | null
          supplier_code?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          minimum_stock?: number | null
          model_compatibility?: string | null
          name?: string
          notes?: string | null
          selling_price?: number | null
          stock_quantity?: number
          supplier?: string | null
          supplier_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "technician" | "customer"
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
      app_role: ["admin", "technician", "customer"],
    },
  },
} as const
