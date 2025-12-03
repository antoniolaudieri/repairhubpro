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
      additional_services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      centri_assistenza: {
        Row: {
          address: string
          approved_at: string | null
          approved_by: string | null
          business_name: string
          commission_rate: number
          created_at: string
          credit_balance: number | null
          credit_warning_threshold: number | null
          email: string
          id: string
          last_credit_update: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          notes: string | null
          owner_user_id: string
          payment_status: string | null
          phone: string
          settings: Json | null
          status: string
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address: string
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          commission_rate?: number
          created_at?: string
          credit_balance?: number | null
          credit_warning_threshold?: number | null
          email: string
          id?: string
          last_credit_update?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          notes?: string | null
          owner_user_id: string
          payment_status?: string | null
          phone: string
          settings?: Json | null
          status?: string
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          commission_rate?: number
          created_at?: string
          credit_balance?: number | null
          credit_warning_threshold?: number | null
          email?: string
          id?: string
          last_credit_update?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          notes?: string | null
          owner_user_id?: string
          payment_status?: string | null
          phone?: string
          settings?: Json | null
          status?: string
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      centro_collaboratori: {
        Row: {
          centro_id: string
          commission_share: number | null
          created_at: string
          id: string
          is_active: boolean
          riparatore_id: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          centro_id: string
          commission_share?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          riparatore_id?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          centro_id?: string
          commission_share?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          riparatore_id?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centro_collaboratori_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_collaboratori_riparatore_id_fkey"
            columns: ["riparatore_id"]
            isOneToOne: false
            referencedRelation: "riparatori"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          centro_commission: number | null
          centro_id: string | null
          centro_rate: number | null
          corner_commission: number | null
          corner_id: string | null
          corner_paid: boolean | null
          corner_paid_at: string | null
          corner_rate: number | null
          created_at: string
          gross_margin: number
          gross_revenue: number
          id: string
          notes: string | null
          paid_at: string | null
          parts_cost: number
          platform_commission: number
          platform_paid: boolean | null
          platform_paid_at: string | null
          platform_rate: number
          repair_id: string | null
          repair_request_id: string | null
          riparatore_commission: number | null
          riparatore_id: string | null
          riparatore_rate: number | null
          status: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          centro_commission?: number | null
          centro_id?: string | null
          centro_rate?: number | null
          corner_commission?: number | null
          corner_id?: string | null
          corner_paid?: boolean | null
          corner_paid_at?: string | null
          corner_rate?: number | null
          created_at?: string
          gross_margin: number
          gross_revenue: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          parts_cost?: number
          platform_commission: number
          platform_paid?: boolean | null
          platform_paid_at?: string | null
          platform_rate?: number
          repair_id?: string | null
          repair_request_id?: string | null
          riparatore_commission?: number | null
          riparatore_id?: string | null
          riparatore_rate?: number | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          centro_commission?: number | null
          centro_id?: string | null
          centro_rate?: number | null
          corner_commission?: number | null
          corner_id?: string | null
          corner_paid?: boolean | null
          corner_paid_at?: string | null
          corner_rate?: number | null
          created_at?: string
          gross_margin?: number
          gross_revenue?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          parts_cost?: number
          platform_commission?: number
          platform_paid?: boolean | null
          platform_paid_at?: string | null
          platform_rate?: number
          repair_id?: string | null
          repair_request_id?: string | null
          riparatore_commission?: number | null
          riparatore_id?: string | null
          riparatore_rate?: number | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_repair_request_id_fkey"
            columns: ["repair_request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_riparatore_id_fkey"
            columns: ["riparatore_id"]
            isOneToOne: false
            referencedRelation: "riparatori"
            referencedColumns: ["id"]
          },
        ]
      }
      corner_partnerships: {
        Row: {
          corner_id: string
          created_at: string
          id: string
          is_active: boolean
          priority: number
          provider_id: string
          provider_type: string
          updated_at: string
        }
        Insert: {
          corner_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          provider_id: string
          provider_type: string
          updated_at?: string
        }
        Update: {
          corner_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          provider_id?: string
          provider_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corner_partnerships_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
        ]
      }
      corners: {
        Row: {
          address: string
          approved_at: string | null
          approved_by: string | null
          business_name: string
          commission_rate: number
          created_at: string
          credit_balance: number | null
          credit_warning_threshold: number | null
          email: string
          id: string
          last_credit_update: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          payment_status: string | null
          phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          commission_rate?: number
          created_at?: string
          credit_balance?: number | null
          credit_warning_threshold?: number | null
          email: string
          id?: string
          last_credit_update?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_status?: string | null
          phone: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          commission_rate?: number
          created_at?: string
          credit_balance?: number | null
          credit_warning_threshold?: number | null
          email?: string
          id?: string
          last_credit_update?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_status?: string | null
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          commission_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          commission_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          commission_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          centro_id: string | null
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
          centro_id?: string | null
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
          centro_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_access: {
        Row: {
          can_reserve: boolean
          can_view: boolean
          centro_id: string
          created_at: string
          id: string
          is_active: boolean
          riparatore_id: string
          updated_at: string
        }
        Insert: {
          can_reserve?: boolean
          can_view?: boolean
          centro_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          riparatore_id: string
          updated_at?: string
        }
        Update: {
          can_reserve?: boolean
          can_view?: boolean
          centro_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          riparatore_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_access_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_access_riparatore_id_fkey"
            columns: ["riparatore_id"]
            isOneToOne: false
            referencedRelation: "riparatori"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          created_at: string
          distance_km: number | null
          expires_at: string
          id: string
          offered_at: string
          provider_id: string
          provider_type: string
          repair_request_id: string
          response_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          expires_at: string
          id?: string
          offered_at?: string
          provider_id: string
          provider_type: string
          repair_request_id: string
          response_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          expires_at?: string
          id?: string
          offered_at?: string
          provider_id?: string
          provider_type?: string
          repair_request_id?: string
          response_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_repair_request_id_fkey"
            columns: ["repair_request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_prices: {
        Row: {
          category: string
          created_at: string
          description: string | null
          device_type: string | null
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          device_type?: string | null
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          device_type?: string | null
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
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
          customer_id: string | null
          id: string
          notes: string | null
          order_number: string
          ordered_at: string | null
          received_at: string | null
          repair_id: string | null
          status: string
          supplier: string
          total_amount: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_number: string
          ordered_at?: string | null
          received_at?: string | null
          repair_id?: string | null
          status?: string
          supplier?: string
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          ordered_at?: string | null
          received_at?: string | null
          repair_id?: string | null
          status?: string
          supplier?: string
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          max_value: number | null
          min_value: number | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          max_value?: number | null
          min_value?: number | null
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          max_value?: number | null
          min_value?: number | null
          updated_at?: string
          value?: number
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
      repair_guides: {
        Row: {
          created_at: string
          created_by: string | null
          device_brand: string
          device_model: string
          device_type: string
          guide_data: Json
          id: string
          issue_category: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_brand: string
          device_model: string
          device_type: string
          guide_data: Json
          id?: string
          issue_category: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_brand?: string
          device_model?: string
          device_type?: string
          guide_data?: Json
          id?: string
          issue_category?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
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
      repair_requests: {
        Row: {
          assigned_at: string | null
          assigned_provider_id: string | null
          assigned_provider_type: string | null
          corner_id: string | null
          created_at: string
          customer_id: string
          customer_latitude: number | null
          customer_longitude: number | null
          device_brand: string | null
          device_model: string | null
          device_type: string
          estimated_cost: number | null
          expires_at: string | null
          id: string
          issue_description: string
          photos: Json | null
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_provider_id?: string | null
          assigned_provider_type?: string | null
          corner_id?: string | null
          created_at?: string
          customer_id: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          device_brand?: string | null
          device_model?: string | null
          device_type: string
          estimated_cost?: number | null
          expires_at?: string | null
          id?: string
          issue_description: string
          photos?: Json | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_provider_id?: string | null
          assigned_provider_type?: string | null
          corner_id?: string | null
          created_at?: string
          customer_id?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          device_brand?: string | null
          device_model?: string | null
          device_type?: string
          estimated_cost?: number | null
          expires_at?: string | null
          id?: string
          issue_description?: string
          photos?: Json | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_requests_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          acconto: number | null
          ai_suggestions: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          customer_email: string | null
          delivered_at: string | null
          device_id: string
          diagnosis: string | null
          diagnostic_fee: number | null
          diagnostic_fee_paid: boolean | null
          estimated_cost: number | null
          final_cost: number | null
          final_cost_accepted_at: string | null
          final_cost_signature: string | null
          forfeited_at: string | null
          forfeiture_warning_sent_at: string | null
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
          acconto?: number | null
          ai_suggestions?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          delivered_at?: string | null
          device_id: string
          diagnosis?: string | null
          diagnostic_fee?: number | null
          diagnostic_fee_paid?: boolean | null
          estimated_cost?: number | null
          final_cost?: number | null
          final_cost_accepted_at?: string | null
          final_cost_signature?: string | null
          forfeited_at?: string | null
          forfeiture_warning_sent_at?: string | null
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
          acconto?: number | null
          ai_suggestions?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          delivered_at?: string | null
          device_id?: string
          diagnosis?: string | null
          diagnostic_fee?: number | null
          diagnostic_fee_paid?: boolean | null
          estimated_cost?: number | null
          final_cost?: number | null
          final_cost_accepted_at?: string | null
          final_cost_signature?: string | null
          forfeited_at?: string | null
          forfeiture_warning_sent_at?: string | null
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
      riparatori: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          commission_rate: number
          created_at: string
          email: string
          full_name: string
          id: string
          is_mobile: boolean
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string
          service_radius_km: number
          specializations: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_mobile?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone: string
          service_radius_km?: number
          specializations?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_mobile?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string
          service_radius_km?: number
          specializations?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spare_parts: {
        Row: {
          brand: string | null
          category: string
          centro_id: string | null
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
          centro_id?: string | null
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
          centro_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "spare_parts_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      topup_requests: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
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
      confirm_topup: {
        Args: { p_confirmed_by: string; p_topup_id: string }
        Returns: undefined
      }
      get_user_centro_id: { Args: { _user_id: string }; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_centro_collaborator: {
        Args: { _centro_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "technician"
        | "customer"
        | "corner"
        | "riparatore"
        | "centro_admin"
        | "centro_tech"
        | "platform_admin"
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
      app_role: [
        "admin",
        "technician",
        "customer",
        "corner",
        "riparatore",
        "centro_admin",
        "centro_tech",
        "platform_admin",
      ],
    },
  },
} as const
