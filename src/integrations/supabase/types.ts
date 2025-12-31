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
      ad_qr_scans: {
        Row: {
          campaign_id: string
          corner_id: string | null
          id: string
          ip_hash: string | null
          referrer: string | null
          scanned_at: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          corner_id?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          corner_id?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_qr_scans_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "display_ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_qr_scans_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
        ]
      }
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
          centro_id: string | null
          corner_id: string | null
          created_at: string
          customer_email: string
          customer_latitude: number | null
          customer_longitude: number | null
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
          centro_id?: string | null
          corner_id?: string | null
          created_at?: string
          customer_email: string
          customer_latitude?: number | null
          customer_longitude?: number | null
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
          centro_id?: string | null
          corner_id?: string | null
          created_at?: string
          customer_email?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
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
        Relationships: [
          {
            foreignKeyName: "appointments_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_logos: {
        Row: {
          brand_name: string
          created_at: string
          device_categories: string[] | null
          display_name: string | null
          id: string
          logo_url: string
          updated_at: string
        }
        Insert: {
          brand_name: string
          created_at?: string
          device_categories?: string[] | null
          display_name?: string | null
          id?: string
          logo_url: string
          updated_at?: string
        }
        Update: {
          brand_name?: string
          created_at?: string
          device_categories?: string[] | null
          display_name?: string | null
          id?: string
          logo_url?: string
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
          opening_hours: Json | null
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
          opening_hours?: Json | null
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
          opening_hours?: Json | null
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
      centro_financial_categories: {
        Row: {
          centro_id: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          type: Database["public"]["Enums"]["financial_movement_type"]
        }
        Insert: {
          centro_id: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          type: Database["public"]["Enums"]["financial_movement_type"]
        }
        Update: {
          centro_id?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          type?: Database["public"]["Enums"]["financial_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "centro_financial_categories_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      centro_financial_movements: {
        Row: {
          amount: number
          category: string
          centro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          movement_date: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          recurring_frequency: string | null
          reference_id: string | null
          reference_type: string | null
          subcategory: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["financial_movement_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          centro_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          movement_date?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          reference_id?: string | null
          reference_type?: string | null
          subcategory?: string | null
          tags?: string[] | null
          type: Database["public"]["Enums"]["financial_movement_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          centro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          movement_date?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          reference_id?: string | null
          reference_type?: string | null
          subcategory?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["financial_movement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centro_financial_movements_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      centro_goals: {
        Row: {
          achieved_at: string | null
          centro_id: string
          created_at: string
          current_value: number
          goal_type: string
          id: string
          is_achieved: boolean
          period: string
          period_end: string
          period_start: string
          target_value: number
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          centro_id: string
          created_at?: string
          current_value?: number
          goal_type: string
          id?: string
          is_achieved?: boolean
          period: string
          period_end: string
          period_start: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          centro_id?: string
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          is_achieved?: boolean
          period?: string
          period_end?: string
          period_start?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centro_goals_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      centro_promos: {
        Row: {
          applies_to: string
          centro_id: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          title: string
          updated_at: string
          usage_count: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          applies_to?: string
          centro_id: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          title: string
          updated_at?: string
          usage_count?: number
          valid_from?: string
          valid_until: string
        }
        Update: {
          applies_to?: string
          centro_id?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          title?: string
          updated_at?: string
          usage_count?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "centro_promos_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          category: string
          checklist_id: string
          created_at: string
          id: string
          item_name: string
          notes: string | null
          photo_url: string | null
          sort_order: number | null
          status: string
        }
        Insert: {
          category: string
          checklist_id: string
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number | null
          status: string
        }
        Update: {
          category?: string
          checklist_id?: string
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          photo_url?: string | null
          sort_order?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "repair_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string
          created_at: string
          device_type: string
          id: string
          is_active: boolean | null
          item_name: string
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string
          device_type: string
          id?: string
          is_active?: boolean | null
          item_name: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          device_type?: string
          id?: string
          is_active?: boolean | null
          item_name?: string
          sort_order?: number | null
        }
        Relationships: []
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
      corner_loyalty_invitations: {
        Row: {
          clicked_at: string | null
          corner_id: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          expires_at: string | null
          id: string
          invitation_token: string
          loyalty_card_id: string | null
          paid_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clicked_at?: string | null
          corner_id: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          invitation_token?: string
          loyalty_card_id?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clicked_at?: string | null
          corner_id?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          invitation_token?: string
          loyalty_card_id?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corner_loyalty_invitations_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corner_loyalty_invitations_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
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
          direct_to_centro_multiplier: number | null
          email: string
          id: string
          last_credit_update: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          notes: string | null
          opening_hours: Json | null
          payment_status: string | null
          phone: string
          settings: Json | null
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
          direct_to_centro_multiplier?: number | null
          email: string
          id?: string
          last_credit_update?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          notes?: string | null
          opening_hours?: Json | null
          payment_status?: string | null
          phone: string
          settings?: Json | null
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
          direct_to_centro_multiplier?: number | null
          email?: string
          id?: string
          last_credit_update?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          notes?: string | null
          opening_hours?: Json | null
          payment_status?: string | null
          phone?: string
          settings?: Json | null
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
      customer_achievements: {
        Row: {
          achievement_description: string | null
          achievement_icon: string | null
          achievement_name: string
          achievement_type: string
          centro_id: string
          created_at: string
          customer_id: string
          id: string
          is_unlocked: boolean
          progress: number
          target: number
          unlocked_at: string | null
          updated_at: string
          xp_reward: number
        }
        Insert: {
          achievement_description?: string | null
          achievement_icon?: string | null
          achievement_name: string
          achievement_type: string
          centro_id: string
          created_at?: string
          customer_id: string
          id?: string
          is_unlocked?: boolean
          progress?: number
          target?: number
          unlocked_at?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          achievement_description?: string | null
          achievement_icon?: string | null
          achievement_name?: string
          achievement_type?: string
          centro_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_unlocked?: boolean
          progress?: number
          target?: number
          unlocked_at?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_achievements_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_achievements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          centro_id: string
          content: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          metadata: Json | null
          status: string
          subject: string | null
          template_name: string | null
          type: string
        }
        Insert: {
          centro_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          status?: string
          subject?: string | null
          template_name?: string | null
          type?: string
        }
        Update: {
          centro_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          status?: string
          subject?: string | null
          template_name?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_gamification_stats: {
        Row: {
          centro_id: string
          created_at: string
          current_streak: number
          customer_id: string
          id: string
          last_sync_date: string | null
          level: number
          longest_streak: number
          total_syncs: number
          total_xp: number
          updated_at: string
        }
        Insert: {
          centro_id: string
          created_at?: string
          current_streak?: number
          customer_id: string
          id?: string
          last_sync_date?: string | null
          level?: number
          longest_streak?: number
          total_syncs?: number
          total_xp?: number
          updated_at?: string
        }
        Update: {
          centro_id?: string
          created_at?: string
          current_streak?: number
          customer_id?: string
          id?: string
          last_sync_date?: string | null
          level?: number
          longest_streak?: number
          total_syncs?: number
          total_xp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_gamification_stats_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_gamification_stats_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_health_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_name: string
          badge_type: string
          centro_id: string
          customer_id: string
          earned_at: string
          id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name: string
          badge_type: string
          centro_id: string
          customer_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name?: string
          badge_type?: string
          centro_id?: string
          customer_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_health_badges_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_health_badges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          created_at: string
          customer_email: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          acquisition_source: string | null
          app_user: boolean | null
          avg_visit_duration_minutes: number | null
          behavioral_tags: string[] | null
          birth_date: string | null
          centro_id: string
          consent_updated_at: string | null
          created_at: string | null
          customer_id: string
          device_preferences: string[] | null
          email_consent: boolean | null
          gender: string | null
          id: string
          last_app_visit: string | null
          marketing_consent: boolean | null
          preferred_contact_method: string | null
          preferred_language: string | null
          push_enabled: boolean | null
          referred_by_customer_id: string | null
          sms_consent: boolean | null
          typical_visit_days: string[] | null
          typical_visit_time: string | null
          updated_at: string | null
        }
        Insert: {
          acquisition_source?: string | null
          app_user?: boolean | null
          avg_visit_duration_minutes?: number | null
          behavioral_tags?: string[] | null
          birth_date?: string | null
          centro_id: string
          consent_updated_at?: string | null
          created_at?: string | null
          customer_id: string
          device_preferences?: string[] | null
          email_consent?: boolean | null
          gender?: string | null
          id?: string
          last_app_visit?: string | null
          marketing_consent?: boolean | null
          preferred_contact_method?: string | null
          preferred_language?: string | null
          push_enabled?: boolean | null
          referred_by_customer_id?: string | null
          sms_consent?: boolean | null
          typical_visit_days?: string[] | null
          typical_visit_time?: string | null
          updated_at?: string | null
        }
        Update: {
          acquisition_source?: string | null
          app_user?: boolean | null
          avg_visit_duration_minutes?: number | null
          behavioral_tags?: string[] | null
          birth_date?: string | null
          centro_id?: string
          consent_updated_at?: string | null
          created_at?: string | null
          customer_id?: string
          device_preferences?: string[] | null
          email_consent?: boolean | null
          gender?: string | null
          id?: string
          last_app_visit?: string | null
          marketing_consent?: boolean | null
          preferred_contact_method?: string | null
          preferred_language?: string | null
          push_enabled?: boolean | null
          referred_by_customer_id?: string | null
          sms_consent?: boolean | null
          typical_visit_days?: string[] | null
          typical_visit_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_referred_by_customer_id_fkey"
            columns: ["referred_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_visits: {
        Row: {
          centro_id: string
          check_in_at: string | null
          check_out_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          duration_minutes: number | null
          id: string
          notes: string | null
          visit_type: string | null
        }
        Insert: {
          centro_id: string
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          visit_type?: string | null
        }
        Update: {
          centro_id?: string
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_visits_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          centro_id: string | null
          churn_risk_score: number | null
          created_at: string
          email: string | null
          id: string
          last_interaction_at: string | null
          ltv_score: number | null
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          centro_id?: string | null
          churn_risk_score?: number | null
          created_at?: string
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          ltv_score?: number | null
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          centro_id?: string | null
          churn_risk_score?: number | null
          created_at?: string
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          ltv_score?: number | null
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
      device_health_alerts: {
        Row: {
          alert_type: string
          centro_action: string | null
          centro_id: string
          centro_notes: string | null
          centro_reviewed: boolean
          centro_reviewed_at: string | null
          created_at: string
          customer_id: string
          customer_response: string | null
          customer_response_at: string | null
          customer_viewed_at: string | null
          device_health_log_id: string | null
          device_id: string | null
          diagnostic_quiz_id: string | null
          discount_code: string | null
          discount_offered: number | null
          email_sent_at: string | null
          expires_at: string | null
          id: string
          message: string
          push_sent_at: string | null
          recommended_action: string | null
          severity: string
          sms_sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          alert_type: string
          centro_action?: string | null
          centro_id: string
          centro_notes?: string | null
          centro_reviewed?: boolean
          centro_reviewed_at?: string | null
          created_at?: string
          customer_id: string
          customer_response?: string | null
          customer_response_at?: string | null
          customer_viewed_at?: string | null
          device_health_log_id?: string | null
          device_id?: string | null
          diagnostic_quiz_id?: string | null
          discount_code?: string | null
          discount_offered?: number | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          push_sent_at?: string | null
          recommended_action?: string | null
          severity?: string
          sms_sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          alert_type?: string
          centro_action?: string | null
          centro_id?: string
          centro_notes?: string | null
          centro_reviewed?: boolean
          centro_reviewed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_response?: string | null
          customer_response_at?: string | null
          customer_viewed_at?: string | null
          device_health_log_id?: string | null
          device_id?: string | null
          diagnostic_quiz_id?: string | null
          discount_code?: string | null
          discount_offered?: number | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          push_sent_at?: string | null
          recommended_action?: string | null
          severity?: string
          sms_sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_health_alerts_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_alerts_device_health_log_id_fkey"
            columns: ["device_health_log_id"]
            isOneToOne: false
            referencedRelation: "device_health_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_alerts_diagnostic_quiz_id_fkey"
            columns: ["diagnostic_quiz_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      device_health_logs: {
        Row: {
          ai_analysis: string | null
          anomalies: Json | null
          app_version: string | null
          battery_cycles: number | null
          battery_health: string | null
          battery_level: number | null
          battery_temperature: number | null
          centro_id: string
          color_depth: number | null
          connection_downlink: number | null
          connection_effective_type: string | null
          connection_rtt: number | null
          cpu_cores: number | null
          created_at: string
          customer_id: string
          device_id: string | null
          device_manufacturer: string | null
          device_memory_gb: number | null
          device_model_info: string | null
          first_sync_at: string | null
          hardware_concurrency: number | null
          health_score: number | null
          id: string
          installed_apps: Json | null
          is_charging: boolean | null
          language: string | null
          latitude: number | null
          longitude: number | null
          loyalty_card_id: string | null
          max_touch_points: number | null
          network_connected: boolean | null
          network_type: string | null
          online_status: boolean | null
          orientation: string | null
          os_version: string | null
          pixel_ratio: number | null
          ram_available_mb: number | null
          ram_percent_used: number | null
          ram_total_mb: number | null
          screen_height: number | null
          screen_width: number | null
          source: string
          storage_available_gb: number | null
          storage_percent_used: number | null
          storage_total_gb: number | null
          storage_used_gb: number | null
          timezone: string | null
          touch_support: boolean | null
        }
        Insert: {
          ai_analysis?: string | null
          anomalies?: Json | null
          app_version?: string | null
          battery_cycles?: number | null
          battery_health?: string | null
          battery_level?: number | null
          battery_temperature?: number | null
          centro_id: string
          color_depth?: number | null
          connection_downlink?: number | null
          connection_effective_type?: string | null
          connection_rtt?: number | null
          cpu_cores?: number | null
          created_at?: string
          customer_id: string
          device_id?: string | null
          device_manufacturer?: string | null
          device_memory_gb?: number | null
          device_model_info?: string | null
          first_sync_at?: string | null
          hardware_concurrency?: number | null
          health_score?: number | null
          id?: string
          installed_apps?: Json | null
          is_charging?: boolean | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          loyalty_card_id?: string | null
          max_touch_points?: number | null
          network_connected?: boolean | null
          network_type?: string | null
          online_status?: boolean | null
          orientation?: string | null
          os_version?: string | null
          pixel_ratio?: number | null
          ram_available_mb?: number | null
          ram_percent_used?: number | null
          ram_total_mb?: number | null
          screen_height?: number | null
          screen_width?: number | null
          source?: string
          storage_available_gb?: number | null
          storage_percent_used?: number | null
          storage_total_gb?: number | null
          storage_used_gb?: number | null
          timezone?: string | null
          touch_support?: boolean | null
        }
        Update: {
          ai_analysis?: string | null
          anomalies?: Json | null
          app_version?: string | null
          battery_cycles?: number | null
          battery_health?: string | null
          battery_level?: number | null
          battery_temperature?: number | null
          centro_id?: string
          color_depth?: number | null
          connection_downlink?: number | null
          connection_effective_type?: string | null
          connection_rtt?: number | null
          cpu_cores?: number | null
          created_at?: string
          customer_id?: string
          device_id?: string | null
          device_manufacturer?: string | null
          device_memory_gb?: number | null
          device_model_info?: string | null
          first_sync_at?: string | null
          hardware_concurrency?: number | null
          health_score?: number | null
          id?: string
          installed_apps?: Json | null
          is_charging?: boolean | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          loyalty_card_id?: string | null
          max_touch_points?: number | null
          network_connected?: boolean | null
          network_type?: string | null
          online_status?: boolean | null
          orientation?: string | null
          os_version?: string | null
          pixel_ratio?: number | null
          ram_available_mb?: number | null
          ram_percent_used?: number | null
          ram_total_mb?: number | null
          screen_height?: number | null
          screen_width?: number | null
          source?: string
          storage_available_gb?: number | null
          storage_percent_used?: number | null
          storage_total_gb?: number | null
          storage_used_gb?: number | null
          timezone?: string | null
          touch_support?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "device_health_logs_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_logs_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      device_health_readings: {
        Row: {
          app_version: string | null
          battery_health: string | null
          battery_level: number | null
          centro_id: string
          color_depth: number | null
          connection_downlink: number | null
          connection_effective_type: string | null
          connection_rtt: number | null
          cpu_cores: number | null
          created_at: string
          customer_id: string | null
          device_manufacturer: string | null
          device_memory_gb: number | null
          device_model: string | null
          device_token: string | null
          hardware_concurrency: number | null
          health_score: number | null
          id: string
          is_charging: boolean | null
          language: string | null
          latitude: number | null
          longitude: number | null
          loyalty_card_id: string | null
          max_touch_points: number | null
          network_connected: boolean | null
          network_type: string | null
          online_status: boolean | null
          orientation: string | null
          os_version: string | null
          pixel_ratio: number | null
          platform: string | null
          ram_available_mb: number | null
          ram_percent_used: number | null
          ram_total_mb: number | null
          screen_height: number | null
          screen_width: number | null
          storage_available_gb: number | null
          storage_percent_used: number | null
          storage_total_gb: number | null
          storage_used_gb: number | null
          timezone: string | null
          touch_support: boolean | null
        }
        Insert: {
          app_version?: string | null
          battery_health?: string | null
          battery_level?: number | null
          centro_id: string
          color_depth?: number | null
          connection_downlink?: number | null
          connection_effective_type?: string | null
          connection_rtt?: number | null
          cpu_cores?: number | null
          created_at?: string
          customer_id?: string | null
          device_manufacturer?: string | null
          device_memory_gb?: number | null
          device_model?: string | null
          device_token?: string | null
          hardware_concurrency?: number | null
          health_score?: number | null
          id?: string
          is_charging?: boolean | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          loyalty_card_id?: string | null
          max_touch_points?: number | null
          network_connected?: boolean | null
          network_type?: string | null
          online_status?: boolean | null
          orientation?: string | null
          os_version?: string | null
          pixel_ratio?: number | null
          platform?: string | null
          ram_available_mb?: number | null
          ram_percent_used?: number | null
          ram_total_mb?: number | null
          screen_height?: number | null
          screen_width?: number | null
          storage_available_gb?: number | null
          storage_percent_used?: number | null
          storage_total_gb?: number | null
          storage_used_gb?: number | null
          timezone?: string | null
          touch_support?: boolean | null
        }
        Update: {
          app_version?: string | null
          battery_health?: string | null
          battery_level?: number | null
          centro_id?: string
          color_depth?: number | null
          connection_downlink?: number | null
          connection_effective_type?: string | null
          connection_rtt?: number | null
          cpu_cores?: number | null
          created_at?: string
          customer_id?: string | null
          device_manufacturer?: string | null
          device_memory_gb?: number | null
          device_model?: string | null
          device_token?: string | null
          hardware_concurrency?: number | null
          health_score?: number | null
          id?: string
          is_charging?: boolean | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          loyalty_card_id?: string | null
          max_touch_points?: number | null
          network_connected?: boolean | null
          network_type?: string | null
          online_status?: boolean | null
          orientation?: string | null
          os_version?: string | null
          pixel_ratio?: number | null
          platform?: string | null
          ram_available_mb?: number | null
          ram_percent_used?: number | null
          ram_total_mb?: number | null
          screen_height?: number | null
          screen_width?: number | null
          storage_available_gb?: number | null
          storage_percent_used?: number | null
          storage_total_gb?: number | null
          storage_used_gb?: number | null
          timezone?: string | null
          touch_support?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "device_health_readings_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_readings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_readings_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      device_health_settings: {
        Row: {
          android_monitoring_enabled: boolean
          auto_discount_on_critical: boolean
          badge_after_checkups: number
          battery_critical_threshold: number
          battery_warning_threshold: number
          centro_id: string
          created_at: string
          critical_discount_percent: number
          health_score_critical_threshold: number
          health_score_warning_threshold: number
          id: string
          ios_webapp_enabled: boolean
          is_enabled: boolean
          points_per_checkup: number
          quiz_reminder_days: number
          storage_critical_threshold: number
          storage_warning_threshold: number
          sync_interval_hours: number
          updated_at: string
          warning_discount_percent: number
        }
        Insert: {
          android_monitoring_enabled?: boolean
          auto_discount_on_critical?: boolean
          badge_after_checkups?: number
          battery_critical_threshold?: number
          battery_warning_threshold?: number
          centro_id: string
          created_at?: string
          critical_discount_percent?: number
          health_score_critical_threshold?: number
          health_score_warning_threshold?: number
          id?: string
          ios_webapp_enabled?: boolean
          is_enabled?: boolean
          points_per_checkup?: number
          quiz_reminder_days?: number
          storage_critical_threshold?: number
          storage_warning_threshold?: number
          sync_interval_hours?: number
          updated_at?: string
          warning_discount_percent?: number
        }
        Update: {
          android_monitoring_enabled?: boolean
          auto_discount_on_critical?: boolean
          badge_after_checkups?: number
          battery_critical_threshold?: number
          battery_warning_threshold?: number
          centro_id?: string
          created_at?: string
          critical_discount_percent?: number
          health_score_critical_threshold?: number
          health_score_warning_threshold?: number
          id?: string
          ios_webapp_enabled?: boolean
          is_enabled?: boolean
          points_per_checkup?: number
          quiz_reminder_days?: number
          storage_critical_threshold?: number
          storage_warning_threshold?: number
          sync_interval_hours?: number
          updated_at?: string
          warning_discount_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_health_settings_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: true
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      device_price_valuations: {
        Row: {
          brand: string
          centro_id: string | null
          corner_id: string | null
          created_at: string
          device_type: string
          grade_a: number | null
          grade_aa: number | null
          grade_aaa: number | null
          grade_b: number | null
          id: string
          model: string
          original_price: number | null
          storage: string | null
          trend: string | null
          trend_reason: string | null
        }
        Insert: {
          brand: string
          centro_id?: string | null
          corner_id?: string | null
          created_at?: string
          device_type?: string
          grade_a?: number | null
          grade_aa?: number | null
          grade_aaa?: number | null
          grade_b?: number | null
          id?: string
          model: string
          original_price?: number | null
          storage?: string | null
          trend?: string | null
          trend_reason?: string | null
        }
        Update: {
          brand?: string
          centro_id?: string | null
          corner_id?: string | null
          created_at?: string
          device_type?: string
          grade_a?: number | null
          grade_aa?: number | null
          grade_aaa?: number | null
          grade_b?: number | null
          id?: string
          model?: string
          original_price?: number | null
          storage?: string | null
          trend?: string | null
          trend_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_price_valuations_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_price_valuations_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
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
      diagnostic_quizzes: {
        Row: {
          ai_analysis: string | null
          analyzed_at: string | null
          centro_id: string
          created_at: string
          customer_id: string
          device_id: string | null
          hardware_info: Json | null
          health_score: number | null
          id: string
          loyalty_card_id: string | null
          recommendations: Json | null
          responses: Json
          status: string
        }
        Insert: {
          ai_analysis?: string | null
          analyzed_at?: string | null
          centro_id: string
          created_at?: string
          customer_id: string
          device_id?: string | null
          hardware_info?: Json | null
          health_score?: number | null
          id?: string
          loyalty_card_id?: string | null
          recommendations?: Json | null
          responses?: Json
          status?: string
        }
        Update: {
          ai_analysis?: string | null
          analyzed_at?: string | null
          centro_id?: string
          created_at?: string
          customer_id?: string
          device_id?: string | null
          hardware_info?: Json | null
          health_score?: number | null
          id?: string
          loyalty_card_id?: string | null
          recommendations?: Json | null
          responses?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_quizzes_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_quizzes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_quizzes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_quizzes_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      display_ad_campaign_corners: {
        Row: {
          campaign_id: string
          corner_id: string
          corner_revenue: number
          created_at: string
          id: string
          impressions_count: number
          payment_paid_at: string | null
          payment_requested_at: string | null
          payment_status: string | null
        }
        Insert: {
          campaign_id: string
          corner_id: string
          corner_revenue?: number
          created_at?: string
          id?: string
          impressions_count?: number
          payment_paid_at?: string | null
          payment_requested_at?: string | null
          payment_status?: string | null
        }
        Update: {
          campaign_id?: string
          corner_id?: string
          corner_revenue?: number
          created_at?: string
          id?: string
          impressions_count?: number
          payment_paid_at?: string | null
          payment_requested_at?: string | null
          payment_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "display_ad_campaign_corners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "display_ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_ad_campaign_corners_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
        ]
      }
      display_ad_campaigns: {
        Row: {
          ad_description: string | null
          ad_description_color: string | null
          ad_emoji: string | null
          ad_font: string | null
          ad_gradient: string | null
          ad_icon: string | null
          ad_image_url: string | null
          ad_title: string
          ad_title_color: string | null
          ad_type: string
          advertiser_company: string | null
          advertiser_email: string
          advertiser_name: string
          advertiser_phone: string | null
          approved_at: string | null
          approved_by: string | null
          company_logo_url: string | null
          corner_revenue_total: number
          countdown_enabled: boolean | null
          countdown_end_date: string | null
          countdown_text: string | null
          created_at: string
          display_seconds: number
          end_date: string
          id: string
          paid_at: string | null
          platform_revenue: number
          qr_destination_url: string | null
          qr_enabled: boolean | null
          rejected_reason: string | null
          start_date: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_price: number
          updated_at: string
        }
        Insert: {
          ad_description?: string | null
          ad_description_color?: string | null
          ad_emoji?: string | null
          ad_font?: string | null
          ad_gradient?: string | null
          ad_icon?: string | null
          ad_image_url?: string | null
          ad_title: string
          ad_title_color?: string | null
          ad_type?: string
          advertiser_company?: string | null
          advertiser_email: string
          advertiser_name: string
          advertiser_phone?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_logo_url?: string | null
          corner_revenue_total?: number
          countdown_enabled?: boolean | null
          countdown_end_date?: string | null
          countdown_text?: string | null
          created_at?: string
          display_seconds?: number
          end_date: string
          id?: string
          paid_at?: string | null
          platform_revenue?: number
          qr_destination_url?: string | null
          qr_enabled?: boolean | null
          rejected_reason?: string | null
          start_date: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_price?: number
          updated_at?: string
        }
        Update: {
          ad_description?: string | null
          ad_description_color?: string | null
          ad_emoji?: string | null
          ad_font?: string | null
          ad_gradient?: string | null
          ad_icon?: string | null
          ad_image_url?: string | null
          ad_title?: string
          ad_title_color?: string | null
          ad_type?: string
          advertiser_company?: string | null
          advertiser_email?: string
          advertiser_name?: string
          advertiser_phone?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_logo_url?: string | null
          corner_revenue_total?: number
          countdown_enabled?: boolean | null
          countdown_end_date?: string | null
          countdown_text?: string | null
          created_at?: string
          display_seconds?: number
          end_date?: string
          id?: string
          paid_at?: string | null
          platform_revenue?: number
          qr_destination_url?: string | null
          qr_enabled?: boolean | null
          rejected_reason?: string | null
          start_date?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_campaign_clicks: {
        Row: {
          campaign_type: string
          centro_id: string
          clicked_at: string | null
          converted: boolean
          converted_at: string | null
          created_at: string
          customer_id: string
          email_template: string
          id: string
        }
        Insert: {
          campaign_type?: string
          centro_id: string
          clicked_at?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          customer_id: string
          email_template: string
          id?: string
        }
        Update: {
          campaign_type?: string
          centro_id?: string
          clicked_at?: string | null
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          customer_id?: string
          email_template?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_clicks_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_clicks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribes: {
        Row: {
          campaign_type: string
          centro_id: string | null
          created_at: string
          customer_id: string | null
          email: string
          id: string
          reason: string | null
          unsubscribed_at: string
        }
        Insert: {
          campaign_type?: string
          centro_id?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
        }
        Update: {
          campaign_type?: string
          centro_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_unsubscribes_customer_id_fkey"
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
      forensic_reports: {
        Row: {
          analysis_summary: string
          centro_id: string
          compromised_accounts_check: boolean | null
          compromised_accounts_findings: string | null
          conclusions: string
          created_at: string
          customer_id: string
          data_integrity_check: boolean | null
          data_integrity_findings: string | null
          device_brand: string | null
          device_condition: string | null
          device_id: string | null
          device_imei: string | null
          device_model: string | null
          device_serial: string | null
          device_type: string
          id: string
          malware_check: boolean | null
          malware_findings: string | null
          other_findings: string | null
          purpose: string
          recipient_name: string | null
          recipient_role: string | null
          recommendations: string | null
          report_date: string
          report_number: string
          sent_at: string | null
          sent_to_email: string | null
          spyware_check: boolean | null
          spyware_findings: string | null
          status: string
          technician_name: string
          technician_qualification: string | null
          technician_signature: string | null
          updated_at: string
        }
        Insert: {
          analysis_summary: string
          centro_id: string
          compromised_accounts_check?: boolean | null
          compromised_accounts_findings?: string | null
          conclusions: string
          created_at?: string
          customer_id: string
          data_integrity_check?: boolean | null
          data_integrity_findings?: string | null
          device_brand?: string | null
          device_condition?: string | null
          device_id?: string | null
          device_imei?: string | null
          device_model?: string | null
          device_serial?: string | null
          device_type: string
          id?: string
          malware_check?: boolean | null
          malware_findings?: string | null
          other_findings?: string | null
          purpose: string
          recipient_name?: string | null
          recipient_role?: string | null
          recommendations?: string | null
          report_date?: string
          report_number: string
          sent_at?: string | null
          sent_to_email?: string | null
          spyware_check?: boolean | null
          spyware_findings?: string | null
          status?: string
          technician_name: string
          technician_qualification?: string | null
          technician_signature?: string | null
          updated_at?: string
        }
        Update: {
          analysis_summary?: string
          centro_id?: string
          compromised_accounts_check?: boolean | null
          compromised_accounts_findings?: string | null
          conclusions?: string
          created_at?: string
          customer_id?: string
          data_integrity_check?: boolean | null
          data_integrity_findings?: string | null
          device_brand?: string | null
          device_condition?: string | null
          device_id?: string | null
          device_imei?: string | null
          device_model?: string | null
          device_serial?: string | null
          device_type?: string
          id?: string
          malware_check?: boolean | null
          malware_findings?: string | null
          other_findings?: string | null
          purpose?: string
          recipient_name?: string | null
          recipient_role?: string | null
          recommendations?: string | null
          report_date?: string
          report_number?: string
          sent_at?: string | null
          sent_to_email?: string | null
          spyware_check?: boolean | null
          spyware_findings?: string | null
          status?: string
          technician_name?: string
          technician_qualification?: string | null
          technician_signature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forensic_reports_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forensic_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forensic_reports_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
      loyalty_card_usages: {
        Row: {
          created_at: string
          device_id: string | null
          discount_type: string
          discounted_amount: number
          id: string
          loyalty_card_id: string
          original_amount: number
          repair_id: string | null
          repair_request_id: string | null
          savings: number
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          discount_type: string
          discounted_amount: number
          id?: string
          loyalty_card_id: string
          original_amount: number
          repair_id?: string | null
          repair_request_id?: string | null
          savings: number
        }
        Update: {
          created_at?: string
          device_id?: string | null
          discount_type?: string
          discounted_amount?: number
          id?: string
          loyalty_card_id?: string
          original_amount?: number
          repair_id?: string | null
          repair_request_id?: string | null
          savings?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_card_usages_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_card_usages_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_card_usages_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_card_usages_repair_request_id_fkey"
            columns: ["repair_request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_cards: {
        Row: {
          activated_at: string | null
          amount_paid: number
          bonifico_confirmed_at: string | null
          bonifico_confirmed_by: string | null
          card_number: string | null
          centro_id: string
          centro_revenue: number
          corner_commission: number | null
          corner_commission_paid: boolean | null
          corner_commission_paid_at: string | null
          created_at: string
          customer_id: string
          devices_used: number
          expires_at: string | null
          id: string
          max_devices: number
          payment_method: string
          platform_commission: number
          referred_by_corner_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          amount_paid?: number
          bonifico_confirmed_at?: string | null
          bonifico_confirmed_by?: string | null
          card_number?: string | null
          centro_id: string
          centro_revenue?: number
          corner_commission?: number | null
          corner_commission_paid?: boolean | null
          corner_commission_paid_at?: string | null
          created_at?: string
          customer_id: string
          devices_used?: number
          expires_at?: string | null
          id?: string
          max_devices?: number
          payment_method: string
          platform_commission?: number
          referred_by_corner_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          amount_paid?: number
          bonifico_confirmed_at?: string | null
          bonifico_confirmed_by?: string | null
          card_number?: string | null
          centro_id?: string
          centro_revenue?: number
          corner_commission?: number | null
          corner_commission_paid?: boolean | null
          corner_commission_paid_at?: string | null
          created_at?: string
          customer_id?: string
          devices_used?: number
          expires_at?: string | null
          id?: string
          max_devices?: number
          payment_method?: string
          platform_commission?: number
          referred_by_corner_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_referred_by_corner_id_fkey"
            columns: ["referred_by_corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_program_settings: {
        Row: {
          annual_price: number
          card_accent_color: string | null
          card_background_url: string | null
          card_template: string | null
          card_text_color: string | null
          centro_id: string
          created_at: string
          diagnostic_fee: number
          id: string
          is_active: boolean
          max_devices: number
          promo_tagline: string | null
          repair_discount_percent: number
          updated_at: string
          validity_months: number
        }
        Insert: {
          annual_price?: number
          card_accent_color?: string | null
          card_background_url?: string | null
          card_template?: string | null
          card_text_color?: string | null
          centro_id: string
          created_at?: string
          diagnostic_fee?: number
          id?: string
          is_active?: boolean
          max_devices?: number
          promo_tagline?: string | null
          repair_discount_percent?: number
          updated_at?: string
          validity_months?: number
        }
        Update: {
          annual_price?: number
          card_accent_color?: string | null
          card_background_url?: string | null
          card_template?: string | null
          card_text_color?: string | null
          centro_id?: string
          created_at?: string
          diagnostic_fee?: number
          id?: string
          is_active?: boolean
          max_devices?: number
          promo_tagline?: string | null
          repair_discount_percent?: number
          updated_at?: string
          validity_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_program_settings_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: true
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_predictions: {
        Row: {
          centro_id: string
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          customer_id: string
          device_id: string | null
          dismiss_reason: string | null
          dismissed_at: string | null
          due_date: string | null
          estimated_cost: number | null
          id: string
          notified_at: string | null
          predicted_issue: string
          prediction_type: string
          reasoning: string | null
          recommended_action: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          centro_id: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          customer_id: string
          device_id?: string | null
          dismiss_reason?: string | null
          dismissed_at?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          notified_at?: string | null
          predicted_issue: string
          prediction_type: string
          reasoning?: string | null
          recommended_action?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          centro_id?: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          customer_id?: string
          device_id?: string | null
          dismiss_reason?: string | null
          dismissed_at?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          notified_at?: string | null
          predicted_issue?: string
          prediction_type?: string
          reasoning?: string | null
          recommended_action?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_predictions_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_predictions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_predictions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      malware_definitions: {
        Row: {
          adware_count: number | null
          changelog: string | null
          created_at: string | null
          dangerous_permission_combos: Json
          id: string
          is_active: boolean | null
          known_adware: Json
          known_malware: Json
          known_riskware: Json
          known_spyware: Json
          malicious_signatures: Json | null
          malware_count: number | null
          release_date: string
          source: string | null
          spyware_count: number | null
          suspicious_app_names: Json
          suspicious_patterns: Json
          system_app_whitelist: Json
          threat_categories: Json
          total_threats: number | null
          trusted_sources: Json
          updated_at: string | null
          version: string
        }
        Insert: {
          adware_count?: number | null
          changelog?: string | null
          created_at?: string | null
          dangerous_permission_combos?: Json
          id?: string
          is_active?: boolean | null
          known_adware?: Json
          known_malware?: Json
          known_riskware?: Json
          known_spyware?: Json
          malicious_signatures?: Json | null
          malware_count?: number | null
          release_date?: string
          source?: string | null
          spyware_count?: number | null
          suspicious_app_names?: Json
          suspicious_patterns?: Json
          system_app_whitelist?: Json
          threat_categories?: Json
          total_threats?: number | null
          trusted_sources?: Json
          updated_at?: string | null
          version: string
        }
        Update: {
          adware_count?: number | null
          changelog?: string | null
          created_at?: string | null
          dangerous_permission_combos?: Json
          id?: string
          is_active?: boolean | null
          known_adware?: Json
          known_malware?: Json
          known_riskware?: Json
          known_spyware?: Json
          malicious_signatures?: Json | null
          malware_count?: number | null
          release_date?: string
          source?: string | null
          spyware_count?: number | null
          suspicious_app_names?: Json
          suspicious_patterns?: Json
          system_app_whitelist?: Json
          threat_categories?: Json
          total_threats?: number | null
          trusted_sources?: Json
          updated_at?: string | null
          version?: string
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
          quote_id: string | null
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
          quote_id?: string | null
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
          quote_id?: string | null
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
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
      partnership_invites: {
        Row: {
          created_at: string
          from_id: string
          from_type: string
          id: string
          message: string | null
          responded_at: string | null
          status: string
          to_id: string
          to_type: string
        }
        Insert: {
          created_at?: string
          from_id: string
          from_type: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          to_id: string
          to_type: string
        }
        Update: {
          created_at?: string
          from_id?: string
          from_type?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          to_id?: string
          to_type?: string
        }
        Relationships: []
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
      print_queue: {
        Row: {
          centro_id: string
          copies: number
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          label_data: Json
          label_type: string
          label_xml: string | null
          printed_at: string | null
          printer_name: string | null
          priority: number
          status: string
        }
        Insert: {
          centro_id: string
          copies?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          label_data: Json
          label_type?: string
          label_xml?: string | null
          printed_at?: string | null
          printer_name?: string | null
          priority?: number
          status?: string
        }
        Update: {
          centro_id?: string
          copies?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          label_data?: Json
          label_type?: string
          label_xml?: string | null
          printed_at?: string | null
          printer_name?: string | null
          priority?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_queue_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          commission_prepaid_amount: number | null
          commission_prepaid_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_notified_at: string | null
          deposit_amount: number | null
          deposit_paid_at: string | null
          device_brand: string | null
          device_location: string | null
          device_model: string | null
          device_type: string
          diagnosis: string | null
          id: string
          issue_description: string
          items: Json
          labor_cost: number | null
          linked_order_id: string | null
          notes: string | null
          parts_arrived_at: string | null
          parts_cost: number | null
          parts_ordered_at: string | null
          payment_collection_method: string | null
          repair_request_id: string | null
          signature_data: string | null
          signed_at: string | null
          status: string
          total_cost: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          commission_prepaid_amount?: number | null
          commission_prepaid_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_notified_at?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          device_brand?: string | null
          device_location?: string | null
          device_model?: string | null
          device_type: string
          diagnosis?: string | null
          id?: string
          issue_description: string
          items?: Json
          labor_cost?: number | null
          linked_order_id?: string | null
          notes?: string | null
          parts_arrived_at?: string | null
          parts_cost?: number | null
          parts_ordered_at?: string | null
          payment_collection_method?: string | null
          repair_request_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          total_cost: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          commission_prepaid_amount?: number | null
          commission_prepaid_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_notified_at?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          device_brand?: string | null
          device_location?: string | null
          device_model?: string | null
          device_type?: string
          diagnosis?: string | null
          id?: string
          issue_description?: string
          items?: Json
          labor_cost?: number | null
          linked_order_id?: string | null
          notes?: string | null
          parts_arrived_at?: string | null
          parts_cost?: number | null
          parts_ordered_at?: string | null
          payment_collection_method?: string | null
          repair_request_id?: string | null
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
          {
            foreignKeyName: "quotes_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_repair_request_id_fkey"
            columns: ["repair_request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_checklists: {
        Row: {
          checklist_type: string
          created_at: string
          created_by: string | null
          customer_signature: string | null
          id: string
          notes: string | null
          repair_id: string | null
          signed_at: string | null
        }
        Insert: {
          checklist_type: string
          created_at?: string
          created_by?: string | null
          customer_signature?: string | null
          id?: string
          notes?: string | null
          repair_id?: string | null
          signed_at?: string | null
        }
        Update: {
          checklist_type?: string
          created_at?: string
          created_by?: string | null
          customer_signature?: string | null
          id?: string
          notes?: string | null
          repair_id?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_checklists_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
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
          at_corner_at: string | null
          awaiting_pickup_at: string | null
          corner_direct_to_centro: boolean | null
          corner_gestione_fee: number | null
          corner_gestione_fee_collected: boolean | null
          corner_gestione_fee_collected_at: string | null
          corner_gestione_fee_enabled: boolean | null
          corner_id: string | null
          created_at: string
          customer_id: string
          customer_latitude: number | null
          customer_longitude: number | null
          customer_paid_at: string | null
          delivered_at: string | null
          device_brand: string | null
          device_model: string | null
          device_type: string
          estimated_cost: number | null
          expires_at: string | null
          id: string
          in_diagnosis_at: string | null
          in_repair_at: string | null
          issue_description: string
          photos: Json | null
          picked_up_at: string | null
          quote_accepted_at: string | null
          quote_sent_at: string | null
          ready_for_return_at: string | null
          repair_completed_at: string | null
          service_type: string
          status: string
          updated_at: string
          waiting_for_parts_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_provider_id?: string | null
          assigned_provider_type?: string | null
          at_corner_at?: string | null
          awaiting_pickup_at?: string | null
          corner_direct_to_centro?: boolean | null
          corner_gestione_fee?: number | null
          corner_gestione_fee_collected?: boolean | null
          corner_gestione_fee_collected_at?: string | null
          corner_gestione_fee_enabled?: boolean | null
          corner_id?: string | null
          created_at?: string
          customer_id: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_paid_at?: string | null
          delivered_at?: string | null
          device_brand?: string | null
          device_model?: string | null
          device_type: string
          estimated_cost?: number | null
          expires_at?: string | null
          id?: string
          in_diagnosis_at?: string | null
          in_repair_at?: string | null
          issue_description: string
          photos?: Json | null
          picked_up_at?: string | null
          quote_accepted_at?: string | null
          quote_sent_at?: string | null
          ready_for_return_at?: string | null
          repair_completed_at?: string | null
          service_type?: string
          status?: string
          updated_at?: string
          waiting_for_parts_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_provider_id?: string | null
          assigned_provider_type?: string | null
          at_corner_at?: string | null
          awaiting_pickup_at?: string | null
          corner_direct_to_centro?: boolean | null
          corner_gestione_fee?: number | null
          corner_gestione_fee_collected?: boolean | null
          corner_gestione_fee_collected_at?: string | null
          corner_gestione_fee_enabled?: boolean | null
          corner_id?: string | null
          created_at?: string
          customer_id?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_paid_at?: string | null
          delivered_at?: string | null
          device_brand?: string | null
          device_model?: string | null
          device_type?: string
          estimated_cost?: number | null
          expires_at?: string | null
          id?: string
          in_diagnosis_at?: string | null
          in_repair_at?: string | null
          issue_description?: string
          photos?: Json | null
          picked_up_at?: string | null
          quote_accepted_at?: string | null
          quote_sent_at?: string | null
          ready_for_return_at?: string | null
          repair_completed_at?: string | null
          service_type?: string
          status?: string
          updated_at?: string
          waiting_for_parts_at?: string | null
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
          commission_prepaid_amount: number | null
          commission_prepaid_at: string | null
          completed_at: string | null
          created_at: string
          customer_email: string | null
          customer_notified_at: string | null
          delivered_at: string | null
          device_id: string
          device_location: string | null
          diagnosis: string | null
          diagnostic_fee: number | null
          diagnostic_fee_paid: boolean | null
          estimated_cost: number | null
          final_cost: number | null
          final_cost_accepted_at: string | null
          final_cost_accepted_by_phone: boolean | null
          final_cost_signature: string | null
          forfeited_at: string | null
          forfeiture_warning_sent_at: string | null
          id: string
          intake_signature: string | null
          intake_signature_date: string | null
          parts_arrived_at: string | null
          priority: string
          privacy_consent_at: string | null
          repair_notes: string | null
          shipping_cost: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acconto?: number | null
          ai_suggestions?: string | null
          assigned_to?: string | null
          commission_prepaid_amount?: number | null
          commission_prepaid_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_notified_at?: string | null
          delivered_at?: string | null
          device_id: string
          device_location?: string | null
          diagnosis?: string | null
          diagnostic_fee?: number | null
          diagnostic_fee_paid?: boolean | null
          estimated_cost?: number | null
          final_cost?: number | null
          final_cost_accepted_at?: string | null
          final_cost_accepted_by_phone?: boolean | null
          final_cost_signature?: string | null
          forfeited_at?: string | null
          forfeiture_warning_sent_at?: string | null
          id?: string
          intake_signature?: string | null
          intake_signature_date?: string | null
          parts_arrived_at?: string | null
          priority?: string
          privacy_consent_at?: string | null
          repair_notes?: string | null
          shipping_cost?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acconto?: number | null
          ai_suggestions?: string | null
          assigned_to?: string | null
          commission_prepaid_amount?: number | null
          commission_prepaid_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_notified_at?: string | null
          delivered_at?: string | null
          device_id?: string
          device_location?: string | null
          diagnosis?: string | null
          diagnostic_fee?: number | null
          diagnostic_fee_paid?: boolean | null
          estimated_cost?: number | null
          final_cost?: number | null
          final_cost_accepted_at?: string | null
          final_cost_accepted_by_phone?: boolean | null
          final_cost_signature?: string | null
          forfeited_at?: string | null
          forfeiture_warning_sent_at?: string | null
          id?: string
          intake_signature?: string | null
          intake_signature_date?: string | null
          parts_arrived_at?: string | null
          priority?: string
          privacy_consent_at?: string | null
          repair_notes?: string | null
          shipping_cost?: number | null
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
      saved_external_shops: {
        Row: {
          address: string
          centro_id: string
          contact_status: string
          created_at: string
          email: string | null
          external_id: string
          id: string
          last_contacted_at: string | null
          latitude: number
          longitude: number
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          centro_id: string
          contact_status?: string
          created_at?: string
          email?: string | null
          external_id: string
          id?: string
          last_contacted_at?: string | null
          latitude: number
          longitude: number
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          centro_id?: string
          contact_status?: string
          created_at?: string
          email?: string | null
          external_id?: string
          id?: string
          last_contacted_at?: string | null
          latitude?: number
          longitude?: number
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_external_shops_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_reports: {
        Row: {
          adware_count: number | null
          apps_scanned: number
          centro_id: string | null
          created_at: string | null
          customer_id: string | null
          definitions_version: string
          device_info: Json | null
          device_token: string | null
          id: string
          loyalty_card_id: string | null
          malware_count: number | null
          overall_risk_score: number | null
          pua_count: number | null
          risk_level: string | null
          riskware_count: number | null
          scan_duration_ms: number | null
          scan_type: string | null
          security_status: Json | null
          spyware_count: number | null
          suspicious_count: number | null
          threat_details: Json | null
          threats_found: number
        }
        Insert: {
          adware_count?: number | null
          apps_scanned?: number
          centro_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          definitions_version: string
          device_info?: Json | null
          device_token?: string | null
          id?: string
          loyalty_card_id?: string | null
          malware_count?: number | null
          overall_risk_score?: number | null
          pua_count?: number | null
          risk_level?: string | null
          riskware_count?: number | null
          scan_duration_ms?: number | null
          scan_type?: string | null
          security_status?: Json | null
          spyware_count?: number | null
          suspicious_count?: number | null
          threat_details?: Json | null
          threats_found?: number
        }
        Update: {
          adware_count?: number | null
          apps_scanned?: number
          centro_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          definitions_version?: string
          device_info?: Json | null
          device_token?: string | null
          id?: string
          loyalty_card_id?: string | null
          malware_count?: number | null
          overall_risk_score?: number | null
          pua_count?: number | null
          risk_level?: string | null
          riskware_count?: number | null
          scan_duration_ms?: number | null
          scan_type?: string | null
          security_status?: Json | null
          spyware_count?: number | null
          suspicious_count?: number | null
          threat_details?: Json | null
          threats_found?: number
        }
        Relationships: [
          {
            foreignKeyName: "scan_reports_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_reports_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_reminders: {
        Row: {
          centro_id: string
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          reminder_type: string
          severity: string
          title: string
          trigger_data: Json | null
        }
        Insert: {
          centro_id: string
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          reminder_type: string
          severity?: string
          title: string
          trigger_data?: Json | null
        }
        Update: {
          centro_id?: string
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          reminder_type?: string
          severity?: string
          title?: string
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_reminders_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      used_device_interests: {
        Row: {
          brands: string[] | null
          created_at: string
          customer_id: string | null
          device_types: string[] | null
          email: string
          id: string
          last_notified_at: string | null
          max_price: number | null
          notify_enabled: boolean
          updated_at: string
        }
        Insert: {
          brands?: string[] | null
          created_at?: string
          customer_id?: string | null
          device_types?: string[] | null
          email: string
          id?: string
          last_notified_at?: string | null
          max_price?: number | null
          notify_enabled?: boolean
          updated_at?: string
        }
        Update: {
          brands?: string[] | null
          created_at?: string
          customer_id?: string | null
          device_types?: string[] | null
          email?: string
          id?: string
          last_notified_at?: string | null
          max_price?: number | null
          notify_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "used_device_interests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      used_device_reservations: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device_id: string
          id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device_id: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          device_id?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "used_device_reservations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "used_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      used_devices: {
        Row: {
          brand: string
          centro_gross_margin: number | null
          centro_id: string | null
          centro_net_margin: number | null
          centro_split_percentage: number
          color: string | null
          condition: Database["public"]["Enums"]["device_condition"]
          corner_id: string | null
          created_at: string
          description: string | null
          device_type: string
          id: string
          model: string
          original_price: number | null
          owner_customer_id: string | null
          owner_payout: number | null
          owner_split_percentage: number
          photos: string[] | null
          price: number
          published_at: string | null
          repair_id: string | null
          reserved_at: string | null
          sale_platform_commission: number | null
          sale_type: Database["public"]["Enums"]["used_device_sale_type"]
          sold_at: string | null
          source: Database["public"]["Enums"]["device_source"]
          specifications: Json | null
          status: string
          storage_capacity: string | null
          updated_at: string
          views_count: number | null
          warranty_months: number | null
        }
        Insert: {
          brand: string
          centro_gross_margin?: number | null
          centro_id?: string | null
          centro_net_margin?: number | null
          centro_split_percentage?: number
          color?: string | null
          condition?: Database["public"]["Enums"]["device_condition"]
          corner_id?: string | null
          created_at?: string
          description?: string | null
          device_type: string
          id?: string
          model: string
          original_price?: number | null
          owner_customer_id?: string | null
          owner_payout?: number | null
          owner_split_percentage?: number
          photos?: string[] | null
          price: number
          published_at?: string | null
          repair_id?: string | null
          reserved_at?: string | null
          sale_platform_commission?: number | null
          sale_type?: Database["public"]["Enums"]["used_device_sale_type"]
          sold_at?: string | null
          source?: Database["public"]["Enums"]["device_source"]
          specifications?: Json | null
          status?: string
          storage_capacity?: string | null
          updated_at?: string
          views_count?: number | null
          warranty_months?: number | null
        }
        Update: {
          brand?: string
          centro_gross_margin?: number | null
          centro_id?: string | null
          centro_net_margin?: number | null
          centro_split_percentage?: number
          color?: string | null
          condition?: Database["public"]["Enums"]["device_condition"]
          corner_id?: string | null
          created_at?: string
          description?: string | null
          device_type?: string
          id?: string
          model?: string
          original_price?: number | null
          owner_customer_id?: string | null
          owner_payout?: number | null
          owner_split_percentage?: number
          photos?: string[] | null
          price?: number
          published_at?: string | null
          repair_id?: string | null
          reserved_at?: string | null
          sale_platform_commission?: number | null
          sale_type?: Database["public"]["Enums"]["used_device_sale_type"]
          sold_at?: string | null
          source?: Database["public"]["Enums"]["device_source"]
          specifications?: Json | null
          status?: string
          storage_capacity?: string | null
          updated_at?: string
          views_count?: number | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "used_devices_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centri_assistenza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_devices_corner_id_fkey"
            columns: ["corner_id"]
            isOneToOne: false
            referencedRelation: "corners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_devices_owner_customer_id_fkey"
            columns: ["owner_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_devices_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_device_health_score: {
        Args: {
          p_battery_health: string
          p_battery_level: number
          p_ram_percent_used: number
          p_storage_percent_used: number
        }
        Returns: number
      }
      confirm_topup: {
        Args: { p_confirmed_by: string; p_topup_id: string }
        Returns: undefined
      }
      generate_loyalty_card_number: { Args: never; Returns: string }
      get_user_centro_id: { Args: { _user_id: string }; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_campaign_active: { Args: { _campaign_id: string }; Returns: boolean }
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
      device_condition:
        | "ricondizionato"
        | "usato_ottimo"
        | "usato_buono"
        | "usato_discreto"
        | "alienato"
      device_source:
        | "riparazione_alienata"
        | "permuta"
        | "acquisto"
        | "ricondizionato"
      financial_movement_type: "income" | "expense"
      used_device_sale_type: "alienato" | "conto_vendita" | "acquistato"
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
      device_condition: [
        "ricondizionato",
        "usato_ottimo",
        "usato_buono",
        "usato_discreto",
        "alienato",
      ],
      device_source: [
        "riparazione_alienata",
        "permuta",
        "acquisto",
        "ricondizionato",
      ],
      financial_movement_type: ["income", "expense"],
      used_device_sale_type: ["alienato", "conto_vendita", "acquistato"],
    },
  },
} as const
