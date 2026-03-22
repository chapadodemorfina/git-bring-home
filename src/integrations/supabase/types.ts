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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts_receivable: {
        Row: {
          amount_received: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string
          due_date: string | null
          id: string
          reference_id: string | null
          reference_type: string
          remaining_amount: number | null
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_received?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description: string
          due_date?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string
          remaining_amount?: number | null
          status?: string
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_received?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string
          remaining_amount?: number | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_movements: {
        Row: {
          affects_bank: boolean | null
          affects_cash: boolean | null
          amount: number
          cash_register_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          source_type: string | null
          tenant_id: string
        }
        Insert: {
          affects_bank?: boolean | null
          affects_cash?: boolean | null
          amount: number
          cash_register_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source_type?: string | null
          tenant_id: string
        }
        Update: {
          affects_bank?: boolean | null
          affects_cash?: boolean | null
          amount?: number
          cash_register_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["cash_movement_type"]
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_bank_balance: number | null
          closing_notes: string | null
          counted_amount: number | null
          created_at: string
          difference_amount: number | null
          difference_bank: number | null
          expected_amount: number | null
          expected_bank_balance: number | null
          id: string
          initial_amount: number
          notes: string | null
          opened_at: string
          opened_by: string
          opening_bank_balance: number | null
          status: Database["public"]["Enums"]["cash_register_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_bank_balance?: number | null
          closing_notes?: string | null
          counted_amount?: number | null
          created_at?: string
          difference_amount?: number | null
          difference_bank?: number | null
          expected_amount?: number | null
          expected_bank_balance?: number | null
          id?: string
          initial_amount?: number
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_bank_balance?: number | null
          status?: Database["public"]["Enums"]["cash_register_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_bank_balance?: number | null
          closing_notes?: string | null
          counted_amount?: number | null
          created_at?: string
          difference_amount?: number | null
          difference_bank?: number | null
          expected_amount?: number | null
          expected_bank_balance?: number | null
          id?: string
          initial_amount?: number
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_bank_balance?: number | null
          status?: Database["public"]["Enums"]["cash_register_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_point_commissions: {
        Row: {
          base_amount: number
          calculated_amount: number
          collection_point_id: string
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          created_at: string
          id: string
          is_paid: boolean
          notes: string | null
          paid_at: string | null
          service_order_id: string
          tenant_id: string
        }
        Insert: {
          base_amount?: number
          calculated_amount?: number
          collection_point_id: string
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          created_at?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          paid_at?: string | null
          service_order_id: string
          tenant_id: string
        }
        Update: {
          base_amount?: number
          calculated_amount?: number
          collection_point_id?: string
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          created_at?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          paid_at?: string | null
          service_order_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_point_commissions_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_point_commissions_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
          },
          {
            foreignKeyName: "collection_point_commissions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_point_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_point_users: {
        Row: {
          collection_point_id: string
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          collection_point_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          user_id: string
        }
        Update: {
          collection_point_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_point_users_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_point_users_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
          },
          {
            foreignKeyName: "collection_point_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_points: {
        Row: {
          city: string | null
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          company_name: string | null
          complement: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          responsible_person: string | null
          settings: Json
          state: string | null
          street: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          company_name?: string | null
          complement?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          responsible_person?: string | null
          settings?: Json
          state?: string | null
          street?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          company_name?: string | null
          complement?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          responsible_person?: string | null
          settings?: Json
          state?: string | null
          street?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_points_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_transfers: {
        Row: {
          collection_point_id: string
          created_at: string
          direction: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          service_order_id: string
          status: Database["public"]["Enums"]["transfer_status"]
          tenant_id: string
          tracking_code: string | null
          transferred_at: string | null
          transferred_by: string | null
          updated_at: string
        }
        Insert: {
          collection_point_id: string
          created_at?: string
          direction?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          service_order_id: string
          status?: Database["public"]["Enums"]["transfer_status"]
          tenant_id: string
          tracking_code?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string
        }
        Update: {
          collection_point_id?: string
          created_at?: string
          direction?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          service_order_id?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          tenant_id?: string
          tracking_code?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_transfers_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_transfers_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
          },
          {
            foreignKeyName: "collection_transfers_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          base_amount: number
          commission_amount: number
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          reference_date: string | null
          role: string
          rule_id: string | null
          source_id: string
          source_label: string | null
          source_type: string
          status: Database["public"]["Enums"]["commission_entry_status"] | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_amount?: number
          commission_amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          reference_date?: string | null
          role: string
          rule_id?: string | null
          source_id: string
          source_label?: string | null
          source_type: string
          status?: Database["public"]["Enums"]["commission_entry_status"] | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_amount?: number
          commission_amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          reference_date?: string | null
          role?: string
          rule_id?: string | null
          source_id?: string
          source_label?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["commission_entry_status"] | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          base_type: string
          category_filter: string | null
          created_at: string | null
          fixed_amount: number | null
          id: string
          is_active: boolean | null
          label: string
          notes: string | null
          only_after_payment: boolean
          percentage: number | null
          product_id: string | null
          role: string
          source_type: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          base_type: string
          category_filter?: string | null
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          notes?: string | null
          only_after_payment?: boolean
          percentage?: number | null
          product_id?: string | null
          role: string
          source_type: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          base_type?: string
          category_filter?: string | null
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          notes?: string | null
          only_after_payment?: boolean
          percentage?: number | null
          product_id?: string | null
          role?: string
          source_type?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "commission_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_commission_periods: {
        Row: {
          collection_point_id: string
          commission_amount: number
          completed_orders: number
          created_at: string
          financial_entry_id: string | null
          id: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["cp_commission_period_status"]
          tenant_id: string
          total_orders: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          collection_point_id: string
          commission_amount?: number
          completed_orders?: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["cp_commission_period_status"]
          tenant_id: string
          total_orders?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          collection_point_id?: string
          commission_amount?: number
          completed_orders?: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["cp_commission_period_status"]
          tenant_id?: string
          total_orders?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_commission_periods_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_commission_periods_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
          },
          {
            foreignKeyName: "cp_commission_periods_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_commission_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string
          neighborhood: string | null
          number: string | null
          state: string | null
          street: string | null
          tenant_id: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string | null
          number?: string | null
          state?: string | null
          street?: string | null
          tenant_id: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string | null
          number?: string | null
          state?: string | null
          street?: string | null
          tenant_id?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_message_events: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_status: string
          error_message: string | null
          event_type: string
          id: string
          message_text: string
          phone: string
          reference_id: string
          reference_type: string
          sent_automatically: boolean
          template_key: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_status?: string
          error_message?: string | null
          event_type: string
          id?: string
          message_text: string
          phone: string
          reference_id: string
          reference_type: string
          sent_automatically?: boolean
          template_key?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_status?: string
          error_message?: string | null
          event_type?: string
          id?: string
          message_text?: string
          phone?: string
          reference_id?: string
          reference_type?: string
          sent_automatically?: boolean
          template_key?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_message_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_message_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_accessories: {
        Row: {
          created_at: string
          delivered: boolean
          device_id: string
          id: string
          name: string
          notes: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          delivered?: boolean
          device_id: string
          id?: string
          name: string
          notes?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          delivered?: boolean
          device_id?: string
          id?: string
          name?: string
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_accessories_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_accessories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_location_tracking: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          location: string
          moved_by: string | null
          notes: string | null
          service_order_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          location?: string
          moved_by?: string | null
          notes?: string | null
          service_order_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          location?: string
          moved_by?: string | null
          notes?: string | null
          service_order_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_location_tracking_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_location_tracking_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_location_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_photos: {
        Row: {
          caption: string | null
          created_at: string
          device_id: string
          id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          device_id: string
          id?: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          device_id?: string
          id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_photos_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          imei: string | null
          internal_notes: string | null
          is_active: boolean
          model: string | null
          password_notes: string | null
          physical_condition: string | null
          reported_issue: string | null
          serial_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          imei?: string | null
          internal_notes?: string | null
          is_active?: boolean
          model?: string | null
          password_notes?: string | null
          physical_condition?: string | null
          reported_issue?: string | null
          serial_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          imei?: string | null
          internal_notes?: string | null
          is_active?: boolean
          model?: string | null
          password_notes?: string | null
          physical_condition?: string | null
          reported_issue?: string | null
          serial_number?: string | null
          tenant_id?: string
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
          {
            foreignKeyName: "devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_faults: {
        Row: {
          confirmed: boolean
          created_at: string
          diagnosis_id: string
          fault_description: string | null
          fault_type: string
          id: string
          severity: Database["public"]["Enums"]["fault_severity"]
          tenant_id: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          diagnosis_id: string
          fault_description?: string | null
          fault_type: string
          id?: string
          severity?: Database["public"]["Enums"]["fault_severity"]
          tenant_id: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          diagnosis_id?: string
          fault_description?: string | null
          fault_type?: string
          id?: string
          severity?: Database["public"]["Enums"]["fault_severity"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_faults_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_faults_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_parts: {
        Row: {
          created_at: string
          diagnosis_id: string
          estimated_unit_cost: number
          id: string
          notes: string | null
          part_name: string
          product_id: string | null
          quantity: number
          supplier: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          diagnosis_id: string
          estimated_unit_cost?: number
          id?: string
          notes?: string | null
          part_name: string
          product_id?: string | null
          quantity?: number
          supplier?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          diagnosis_id?: string
          estimated_unit_cost?: number
          id?: string
          notes?: string | null
          part_name?: string
          product_id?: string | null
          quantity?: number
          supplier?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_parts_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "diagnosis_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_tests: {
        Row: {
          created_at: string
          diagnosis_id: string
          id: string
          measured_value: string | null
          notes: string | null
          sort_order: number | null
          tenant_id: string
          test_category: string | null
          test_name: string
          test_result: Database["public"]["Enums"]["test_result"]
        }
        Insert: {
          created_at?: string
          diagnosis_id: string
          id?: string
          measured_value?: string | null
          notes?: string | null
          sort_order?: number | null
          tenant_id: string
          test_category?: string | null
          test_name: string
          test_result?: Database["public"]["Enums"]["test_result"]
        }
        Update: {
          created_at?: string
          diagnosis_id?: string
          id?: string
          measured_value?: string | null
          notes?: string | null
          sort_order?: number | null
          tenant_id?: string
          test_category?: string | null
          test_name?: string
          test_result?: Database["public"]["Enums"]["test_result"]
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_tests_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_tests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          created_at: string
          diagnosed_by: string | null
          diagnosis_completed_at: string | null
          diagnosis_started_at: string | null
          diagnosis_status: Database["public"]["Enums"]["diagnosis_status"]
          estimated_cost: number | null
          estimated_repair_hours: number | null
          id: string
          internal_notes: string | null
          not_repairable_reason: string | null
          probable_cause: string | null
          repair_complexity: Database["public"]["Enums"]["repair_complexity"]
          repair_viability:
            | Database["public"]["Enums"]["repair_viability"]
            | null
          required_parts: string | null
          service_order_id: string
          technical_findings: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_completed_at?: string | null
          diagnosis_started_at?: string | null
          diagnosis_status?: Database["public"]["Enums"]["diagnosis_status"]
          estimated_cost?: number | null
          estimated_repair_hours?: number | null
          id?: string
          internal_notes?: string | null
          not_repairable_reason?: string | null
          probable_cause?: string | null
          repair_complexity?: Database["public"]["Enums"]["repair_complexity"]
          repair_viability?:
            | Database["public"]["Enums"]["repair_viability"]
            | null
          required_parts?: string | null
          service_order_id: string
          technical_findings?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_completed_at?: string | null
          diagnosis_started_at?: string | null
          diagnosis_status?: Database["public"]["Enums"]["diagnosis_status"]
          estimated_cost?: number | null
          estimated_repair_hours?: number | null
          id?: string
          internal_notes?: string | null
          not_repairable_reason?: string | null
          probable_cause?: string | null
          repair_complexity?: Database["public"]["Enums"]["repair_complexity"]
          repair_viability?:
            | Database["public"]["Enums"]["repair_viability"]
            | null
          required_parts?: string | null
          service_order_id?: string
          technical_findings?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          category: string | null
          collection_point_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string
          due_date: string | null
          entry_type: Database["public"]["Enums"]["financial_entry_type"]
          id: string
          is_primary_os_revenue: boolean
          notes: string | null
          paid_amount: number
          quote_id: string | null
          service_order_id: string | null
          status: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          collection_point_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description: string
          due_date?: string | null
          entry_type: Database["public"]["Enums"]["financial_entry_type"]
          id?: string
          is_primary_os_revenue?: boolean
          notes?: string | null
          paid_amount?: number
          quote_id?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          collection_point_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string
          due_date?: string | null
          entry_type?: Database["public"]["Enums"]["financial_entry_type"]
          id?: string
          is_primary_os_revenue?: boolean
          notes?: string | null
          paid_amount?: number
          quote_id?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
          },
          {
            foreignKeyName: "financial_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_scrap: {
        Row: {
          brand: string | null
          color: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          device_type: string
          estimated_recovery_value: number | null
          id: string
          imei_serial: string | null
          location: string | null
          model: string | null
          notes: string | null
          salvageable_parts: string | null
          scrap_category: Database["public"]["Enums"]["scrap_category"] | null
          service_order_id: string | null
          status: Database["public"]["Enums"]["scrap_status"] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          device_type: string
          estimated_recovery_value?: number | null
          id?: string
          imei_serial?: string | null
          location?: string | null
          model?: string | null
          notes?: string | null
          salvageable_parts?: string | null
          scrap_category?: Database["public"]["Enums"]["scrap_category"] | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["scrap_status"] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          device_type?: string
          estimated_recovery_value?: number | null
          id?: string
          imei_serial?: string | null
          location?: string | null
          model?: string | null
          notes?: string | null
          salvageable_parts?: string | null
          scrap_category?: Database["public"]["Enums"]["scrap_category"] | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["scrap_status"] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_scrap_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_scrap_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_scrap_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_status: Database["public"]["Enums"]["notification_processing_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["notification_processing_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["notification_processing_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string
          id: string
          provider_key: string | null
          queue_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          response_status: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_key?: string | null
          queue_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_key?: string | null
          queue_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "notification_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error_message: string | null
          event_id: string | null
          id: string
          last_attempt_at: string | null
          next_attempt_at: string
          payload: Json | null
          recipient_address: string
          recipient_name: string | null
          rendered_body: string
          rendered_subject: string | null
          rule_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_queue_status"]
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string
          payload?: Json | null
          recipient_address: string
          recipient_name?: string | null
          rendered_body: string
          rendered_subject?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_queue_status"]
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string
          payload?: Json | null
          recipient_address?: string
          recipient_name?: string | null
          rendered_body?: string
          rendered_subject?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_queue_status"]
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          conditions: Json | null
          created_at: string
          delay_minutes: number
          event_type: string
          id: string
          is_active: boolean
          provider_key: string | null
          target_audience: string
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number
          event_type: string
          id?: string
          is_active?: boolean
          provider_key?: string | null
          target_audience?: string
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number
          event_type?: string
          id?: string
          is_active?: boolean
          provider_key?: string | null
          target_audience?: string
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string | null
          template_key: string
          tenant_id: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          template_key: string
          tenant_id: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          template_key?: string
          tenant_id?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      part_reservations: {
        Row: {
          created_at: string
          diagnosis_id: string | null
          id: string
          product_id: string
          quantity: number
          reserved_by: string | null
          service_order_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosis_id?: string | null
          id?: string
          product_id: string
          quantity?: number
          reserved_by?: string | null
          service_order_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosis_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reserved_by?: string | null
          service_order_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_reservations_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "part_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          financial_entry_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          financial_entry_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          financial_entry_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pickups_deliveries: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          collection_point_id: string | null
          completed_date: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          logistics_type: Database["public"]["Enums"]["logistics_type"]
          notes: string | null
          proof_notes: string | null
          proof_storage_path: string | null
          requested_date: string | null
          scheduled_date: string | null
          service_order_id: string
          status: Database["public"]["Enums"]["logistics_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          collection_point_id?: string | null
          completed_date?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          logistics_type?: Database["public"]["Enums"]["logistics_type"]
          notes?: string | null
          proof_notes?: string | null
          proof_storage_path?: string | null
          requested_date?: string | null
          scheduled_date?: string | null
          service_order_id: string
          status?: Database["public"]["Enums"]["logistics_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          collection_point_id?: string | null
          completed_date?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          logistics_type?: Database["public"]["Enums"]["logistics_type"]
          notes?: string | null
          proof_notes?: string | null
          proof_storage_path?: string | null
          requested_date?: string | null
          scheduled_date?: string | null
          service_order_id?: string
          status?: Database["public"]["Enums"]["logistics_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickups_deliveries_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_deliveries_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
          },
          {
            foreignKeyName: "pickups_deliveries_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_products: number
          max_service_orders_per_month: number
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          sort_order: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_products?: number
          max_service_orders_per_month?: number
          max_users?: number
          name: string
          price_monthly?: number
          price_yearly?: number | null
          slug: string
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_products?: number
          max_service_orders_per_month?: number
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          compatible_devices: string | null
          cost_price: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          location: string | null
          minimum_quantity: number
          name: string
          notes: string | null
          quantity: number
          reserved_quantity: number
          sale_price: number
          sku: string
          supplier_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          compatible_devices?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          minimum_quantity?: number
          name: string
          notes?: string | null
          quantity?: number
          reserved_quantity?: number
          sale_price?: number
          sku: string
          supplier_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          compatible_devices?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          minimum_quantity?: number
          name?: string
          notes?: string | null
          quantity?: number
          reserved_quantity?: number
          sale_price?: number
          sku?: string
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          collection_point_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          collection_point_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          collection_point_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
          },
        ]
      }
      purchase_entries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          received_at: string
          supplier_id: string | null
          tenant_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          received_at?: string
          supplier_id?: string | null
          tenant_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          received_at?: string
          supplier_id?: string | null
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_approvals: {
        Row: {
          charge_analysis_fee: boolean | null
          created_at: string
          decided_by_name: string | null
          decided_by_role: string | null
          decision: Database["public"]["Enums"]["quote_status"]
          id: string
          quote_id: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          charge_analysis_fee?: boolean | null
          created_at?: string
          decided_by_name?: string | null
          decided_by_role?: string | null
          decision: Database["public"]["Enums"]["quote_status"]
          id?: string
          quote_id: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          charge_analysis_fee?: boolean | null
          created_at?: string
          decided_by_name?: string | null
          decided_by_role?: string | null
          decision?: Database["public"]["Enums"]["quote_status"]
          id?: string
          quote_id?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_approvals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string
          payment_method: string
          receivable_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          receivable_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          receivable_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivable_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_parts_used: {
        Row: {
          consumed_by: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          service_order_id: string
          tenant_id: string
          total_cost: number
          total_price: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          consumed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          service_order_id: string
          tenant_id: string
          total_cost?: number
          total_price?: number
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          consumed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          service_order_id?: string
          tenant_id?: string
          total_cost?: number
          total_price?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_parts_used_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "repair_parts_used_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_parts_used_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_parts_used_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          item_type: Database["public"]["Enums"]["quote_item_type"]
          quantity: number
          quote_id: string
          sort_order: number | null
          tenant_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_type: Database["public"]["Enums"]["quote_item_type"]
          quantity?: number
          quote_id: string
          sort_order?: number | null
          tenant_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_type?: Database["public"]["Enums"]["quote_item_type"]
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          tenant_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quote_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_quotes: {
        Row: {
          analysis_fee: number | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          notes: string | null
          quote_number: string
          service_order_id: string
          status: Database["public"]["Enums"]["quote_status"]
          tenant_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          analysis_fee?: number | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          quote_number: string
          service_order_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          tenant_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          analysis_fee?: number | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          quote_number?: string
          service_order_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_quotes_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_services: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          service_order_id: string
          technician_id: string | null
          tenant_id: string
          time_spent_minutes: number | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          description: string
          id?: string
          service_order_id: string
          technician_id?: string | null
          tenant_id: string
          time_spent_minutes?: number | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          service_order_id?: string
          technician_id?: string | null
          tenant_id?: string
          time_spent_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_services_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_tests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          passed: boolean | null
          service_order_id: string
          sort_order: number | null
          tenant_id: string
          test_name: string
          tested_at: string | null
          tested_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          passed?: boolean | null
          service_order_id: string
          sort_order?: number | null
          tenant_id: string
          test_name: string
          tested_at?: string | null
          tested_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          passed?: boolean | null
          service_order_id?: string
          sort_order?: number | null
          tenant_id?: string
          test_name?: string
          tested_at?: string | null
          tested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_tests_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_timer_sessions: {
        Row: {
          accumulated_seconds: number
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          paused_at: string | null
          service_order_id: string
          started_at: string
          status: string
          technician_id: string
          tenant_id: string
        }
        Insert: {
          accumulated_seconds?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          paused_at?: string | null
          service_order_id: string
          started_at?: string
          status?: string
          technician_id: string
          tenant_id: string
        }
        Update: {
          accumulated_seconds?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          paused_at?: string | null
          service_order_id?: string
          started_at?: string
          status?: string
          technician_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_timer_sessions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_timer_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price_snapshot: number
          created_at: string
          discount_amount: number
          id: string
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          sale_id: string
          sku_snapshot: string | null
          tenant_id: string
          total_amount: number
          unit_price: number
        }
        Insert: {
          cost_price_snapshot?: number
          created_at?: string
          discount_amount?: number
          id?: string
          product_id?: string | null
          product_name_snapshot: string
          quantity?: number
          sale_id: string
          sku_snapshot?: string | null
          tenant_id: string
          total_amount?: number
          unit_price?: number
        }
        Update: {
          cost_price_snapshot?: number
          created_at?: string
          discount_amount?: number
          id?: string
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          sale_id?: string
          sku_snapshot?: string | null
          tenant_id?: string
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
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
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          installments: number | null
          notes: string | null
          paid_at: string
          payment_method: Database["public"]["Enums"]["sale_payment_method"]
          reference: string | null
          sale_id: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          installments?: number | null
          notes?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["sale_payment_method"]
          reference?: string | null
          sale_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installments?: number | null
          notes?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["sale_payment_method"]
          reference?: string | null
          sale_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          amount_refunded: number
          created_at: string
          id: string
          processed_by: string | null
          product_id: string | null
          quantity: number
          reason: string
          returned_at: string
          sale_id: string
          sale_item_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_refunded?: number
          created_at?: string
          id?: string
          processed_by?: string | null
          product_id?: string | null
          quantity?: number
          reason: string
          returned_at?: string
          sale_id: string
          sale_item_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_refunded?: number
          created_at?: string
          id?: string
          processed_by?: string | null
          product_id?: string | null
          quantity?: number
          reason?: string
          returned_at?: string
          sale_id?: string
          sale_item_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["sale_payment_status"]
          sale_number: string
          seller_user_id: string
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          surcharge_amount: number
          tenant_id: string
          total_amount: number
          total_returned: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["sale_payment_status"]
          sale_number: string
          seller_user_id: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          surcharge_amount?: number
          tenant_id: string
          total_amount?: number
          total_returned?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["sale_payment_status"]
          sale_number?: string
          seller_user_id?: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          surcharge_amount?: number
          tenant_id?: string
          total_amount?: number
          total_returned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          label: string
          notes: string | null
          period_end: string
          period_start: string
          target_value: number
          team_role: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          goal_type?: string
          id?: string
          label: string
          notes?: string | null
          period_end: string
          period_start: string
          target_value?: number
          team_role?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          label?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          target_value?: number
          team_role?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scrap_carcass_details: {
        Row: {
          aesthetic_state: string | null
          back_cover_ok: boolean | null
          buttons_ok: boolean | null
          color: string | null
          created_at: string | null
          frame_ok: boolean | null
          id: string
          lenses_ok: boolean | null
          missing_details: string | null
          purpose: string | null
          scrap_id: string
          sim_tray_ok: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          aesthetic_state?: string | null
          back_cover_ok?: boolean | null
          buttons_ok?: boolean | null
          color?: string | null
          created_at?: string | null
          frame_ok?: boolean | null
          id?: string
          lenses_ok?: boolean | null
          missing_details?: string | null
          purpose?: string | null
          scrap_id: string
          sim_tray_ok?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          aesthetic_state?: string | null
          back_cover_ok?: boolean | null
          buttons_ok?: boolean | null
          color?: string | null
          created_at?: string | null
          frame_ok?: boolean | null
          id?: string
          lenses_ok?: boolean | null
          missing_details?: string | null
          purpose?: string | null
          scrap_id?: string
          sim_tray_ok?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrap_carcass_details_scrap_id_fkey"
            columns: ["scrap_id"]
            isOneToOne: true
            referencedRelation: "inventory_scrap"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_carcass_details_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scrap_disassembly: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          scrap_id: string
          technician_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          scrap_id: string
          technician_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          scrap_id?: string
          technician_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrap_disassembly_scrap_id_fkey"
            columns: ["scrap_id"]
            isOneToOne: false
            referencedRelation: "inventory_scrap"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_disassembly_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "mv_technician_performance"
            referencedColumns: ["technician_id"]
          },
          {
            foreignKeyName: "scrap_disassembly_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_disassembly_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scrap_parts_recovered: {
        Row: {
          added_to_stock: boolean
          condition: string
          created_at: string
          disassembly_id: string
          id: string
          product_id: string
          quantity: number
          tenant_id: string
        }
        Insert: {
          added_to_stock?: boolean
          condition?: string
          created_at?: string
          disassembly_id: string
          id?: string
          product_id: string
          quantity?: number
          tenant_id: string
        }
        Update: {
          added_to_stock?: boolean
          condition?: string
          created_at?: string
          disassembly_id?: string
          id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrap_parts_recovered_disassembly_id_fkey"
            columns: ["disassembly_id"]
            isOneToOne: false
            referencedRelation: "scrap_disassembly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_parts_recovered_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "scrap_parts_recovered_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_parts_recovered_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scrap_triage: {
        Row: {
          battery_usable: boolean | null
          board_responsive: boolean | null
          buttons_flex_usable: boolean | null
          camera_usable: boolean | null
          carcass_usable: boolean | null
          charge_module_usable: boolean | null
          connectors_usable: boolean | null
          created_at: string | null
          destination: string | null
          estimated_value: number | null
          id: string
          notes: string | null
          recovery_potential: string | null
          scrap_id: string
          screen_usable: boolean | null
          speaker_mic_usable: boolean | null
          still_powers_on: boolean | null
          tenant_id: string
          triaged_by: string | null
        }
        Insert: {
          battery_usable?: boolean | null
          board_responsive?: boolean | null
          buttons_flex_usable?: boolean | null
          camera_usable?: boolean | null
          carcass_usable?: boolean | null
          charge_module_usable?: boolean | null
          connectors_usable?: boolean | null
          created_at?: string | null
          destination?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          recovery_potential?: string | null
          scrap_id: string
          screen_usable?: boolean | null
          speaker_mic_usable?: boolean | null
          still_powers_on?: boolean | null
          tenant_id: string
          triaged_by?: string | null
        }
        Update: {
          battery_usable?: boolean | null
          board_responsive?: boolean | null
          buttons_flex_usable?: boolean | null
          camera_usable?: boolean | null
          carcass_usable?: boolean | null
          charge_module_usable?: boolean | null
          connectors_usable?: boolean | null
          created_at?: string | null
          destination?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          recovery_potential?: string | null
          scrap_id?: string
          screen_usable?: boolean | null
          speaker_mic_usable?: boolean | null
          still_powers_on?: boolean | null
          tenant_id?: string
          triaged_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrap_triage_scrap_id_fkey"
            columns: ["scrap_id"]
            isOneToOne: false
            referencedRelation: "inventory_scrap"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_triage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_attachments: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string
          file_type: string | null
          id: string
          service_order_id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name: string
          file_type?: string | null
          id?: string
          service_order_id: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_type?: string | null
          id?: string
          service_order_id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_attachments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_checklists: {
        Row: {
          checklist_type: string
          completed_at: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          service_order_id: string
          technician_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          checklist_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          service_order_id: string
          technician_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          checklist_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          service_order_id?: string
          technician_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_checklists_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          item_type: Database["public"]["Enums"]["so_item_type"]
          notes: string | null
          product_id: string | null
          quantity: number
          service_order_id: string
          sort_order: number
          tenant_id: string
          total_price: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_type?: Database["public"]["Enums"]["so_item_type"]
          notes?: string | null
          product_id?: string | null
          quantity?: number
          service_order_id: string
          sort_order?: number
          tenant_id: string
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_type?: Database["public"]["Enums"]["so_item_type"]
          notes?: string | null
          product_id?: string | null
          quantity?: number
          service_order_id?: string
          sort_order?: number
          tenant_id?: string
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "service_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_public_links: {
        Row: {
          access_count: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          last_access_at: string | null
          metadata: Json | null
          public_token: string
          revoked_at: string | null
          service_order_id: string
          status: Database["public"]["Enums"]["public_link_status"]
          tenant_id: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_access_at?: string | null
          metadata?: Json | null
          public_token: string
          revoked_at?: string | null
          service_order_id: string
          status?: Database["public"]["Enums"]["public_link_status"]
          tenant_id: string
        }
        Update: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_access_at?: string | null
          metadata?: Json | null
          public_token?: string
          revoked_at?: string | null
          service_order_id?: string
          status?: Database["public"]["Enums"]["public_link_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_public_links_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_public_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          service_order_id: string
          signature_data: string
          signer_name: string
          signer_role: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          service_order_id: string
          signature_data: string
          signer_name: string
          signer_role?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          service_order_id?: string
          signature_data?: string
          signer_name?: string
          signer_role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_signatures_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status:
            | Database["public"]["Enums"]["service_order_status"]
            | null
          id: string
          notes: string | null
          service_order_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["service_order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["service_order_status"]
            | null
          id?: string
          notes?: string | null
          service_order_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["service_order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["service_order_status"]
            | null
          id?: string
          notes?: string | null
          service_order_id?: string
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["service_order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_order_status_history_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_terms: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          accessories_received: string | null
          assigned_technician_id: string | null
          collection_point_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_checklist: Json | null
          device_id: string | null
          estimated_value: number | null
          expected_deadline: string | null
          id: string
          intake_channel: Database["public"]["Enums"]["intake_channel"]
          intake_checklist: Json | null
          intake_notes: string | null
          internal_notes: string | null
          order_number: string
          physical_condition: string | null
          priority: Database["public"]["Enums"]["service_order_priority"]
          reported_issue: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          accessories_received?: string | null
          assigned_technician_id?: string | null
          collection_point_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_checklist?: Json | null
          device_id?: string | null
          estimated_value?: number | null
          expected_deadline?: string | null
          id?: string
          intake_channel?: Database["public"]["Enums"]["intake_channel"]
          intake_checklist?: Json | null
          intake_notes?: string | null
          internal_notes?: string | null
          order_number: string
          physical_condition?: string | null
          priority?: Database["public"]["Enums"]["service_order_priority"]
          reported_issue?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          accessories_received?: string | null
          assigned_technician_id?: string | null
          collection_point_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_checklist?: Json | null
          device_id?: string | null
          estimated_value?: number | null
          expected_deadline?: string | null
          id?: string
          intake_channel?: Database["public"]["Enums"]["intake_channel"]
          intake_checklist?: Json | null
          intake_notes?: string | null
          internal_notes?: string | null
          order_number?: string
          physical_condition?: string | null
          priority?: Database["public"]["Enums"]["service_order_priority"]
          reported_issue?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configs: {
        Row: {
          created_at: string
          id: string
          priority: string
          status: string
          target_hours: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority: string
          status: string
          target_hours: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: string
          status?: string
          target_hours?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_quantity: number
          notes: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_inventory_usage"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          billing_provider: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          billing_provider?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          billing_provider?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          supplier_type: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          supplier_type?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          supplier_type?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_counters: {
        Row: {
          key: string
          tenant_id: string
          value: number
        }
        Insert: {
          key: string
          tenant_id: string
          value?: number
        }
        Update: {
          key?: string
          tenant_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          tenant_id: string
          tenant_role: Database["public"]["Enums"]["tenant_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          tenant_id: string
          tenant_role?: Database["public"]["Enums"]["tenant_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          tenant_id?: string
          tenant_role?: Database["public"]["Enums"]["tenant_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          document: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transport_events: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["logistics_status"] | null
          id: string
          notes: string | null
          pickup_delivery_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["logistics_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["logistics_status"] | null
          id?: string
          notes?: string | null
          pickup_delivery_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["logistics_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["logistics_status"] | null
          id?: string
          notes?: string | null
          pickup_delivery_id?: string
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["logistics_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transport_events_pickup_delivery_id_fkey"
            columns: ["pickup_delivery_id"]
            isOneToOne: false
            referencedRelation: "pickups_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          coverage_description: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          end_date: string
          id: string
          is_void: boolean
          quote_id: string | null
          service_order_id: string
          start_date: string
          tenant_id: string
          terms: string | null
          updated_at: string
          void_reason: string | null
          warranty_number: string
          warranty_type: string
        }
        Insert: {
          coverage_description?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          end_date?: string
          id?: string
          is_void?: boolean
          quote_id?: string | null
          service_order_id: string
          start_date?: string
          tenant_id: string
          terms?: string | null
          updated_at?: string
          void_reason?: string | null
          warranty_number: string
          warranty_type?: string
        }
        Update: {
          coverage_description?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          end_date?: string
          id?: string
          is_void?: boolean
          quote_id?: string | null
          service_order_id?: string
          start_date?: string
          tenant_id?: string
          terms?: string | null
          updated_at?: string
          void_reason?: string | null
          warranty_number?: string
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_items: {
        Row: {
          created_at: string
          description: string
          id: string
          item_type: string
          quantity: number
          reference_id: string | null
          tenant_id: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_type: string
          quantity?: number
          reference_id?: string | null
          tenant_id: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_type?: string
          quantity?: number
          reference_id?: string | null
          tenant_id?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_items_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_returns: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          new_service_order_id: string | null
          original_service_order_id: string
          outcome: string | null
          reason: string
          resolved_at: string | null
          return_cause: string | null
          status: string
          technical_analysis: string | null
          tenant_id: string
          updated_at: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          new_service_order_id?: string | null
          original_service_order_id: string
          outcome?: string | null
          reason: string
          resolved_at?: string | null
          return_cause?: string | null
          status?: string
          technical_analysis?: string | null
          tenant_id: string
          updated_at?: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          new_service_order_id?: string | null
          original_service_order_id?: string
          outcome?: string | null
          reason?: string
          resolved_at?: string | null
          return_cause?: string | null
          status?: string
          technical_analysis?: string | null
          tenant_id?: string
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_returns_new_service_order_id_fkey"
            columns: ["new_service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_returns_original_service_order_id_fkey"
            columns: ["original_service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_returns_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_rules: {
        Row: {
          applies_to: string
          created_at: string
          device_type: string | null
          id: string
          is_active: boolean
          name: string
          service_category: string | null
          tenant_id: string
          warranty_days: number
        }
        Insert: {
          applies_to?: string
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean
          name: string
          service_category?: string | null
          tenant_id: string
          warranty_days?: number
        }
        Update: {
          applies_to?: string
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean
          name?: string
          service_category?: string | null
          tenant_id?: string
          warranty_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "warranty_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_ai_actions: {
        Row: {
          action_payload: Json | null
          action_type: string
          conversation_id: string
          created_at: string
          id: string
          message_id: string | null
          result_payload: Json | null
          success: boolean
          tenant_id: string
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          conversation_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          result_payload?: Json | null
          success?: boolean
          tenant_id: string
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          result_payload?: Json | null
          success?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_ai_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_ai_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to_user_id: string | null
          channel: string
          created_at: string
          current_handoff_state:
            | Database["public"]["Enums"]["whatsapp_handoff_status"]
            | null
          customer_id: string | null
          id: string
          last_message_at: string
          metadata: Json | null
          phone: string
          status: Database["public"]["Enums"]["whatsapp_conversation_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          channel?: string
          created_at?: string
          current_handoff_state?:
            | Database["public"]["Enums"]["whatsapp_handoff_status"]
            | null
          customer_id?: string | null
          id?: string
          last_message_at?: string
          metadata?: Json | null
          phone: string
          status?: Database["public"]["Enums"]["whatsapp_conversation_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          channel?: string
          created_at?: string
          current_handoff_state?:
            | Database["public"]["Enums"]["whatsapp_handoff_status"]
            | null
          customer_id?: string | null
          id?: string
          last_message_at?: string
          metadata?: Json | null
          phone?: string
          status?: Database["public"]["Enums"]["whatsapp_conversation_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_handoffs: {
        Row: {
          assigned_to_user_id: string | null
          conversation_id: string
          created_at: string
          id: string
          reason: string | null
          requested_by: string
          resolved_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["whatsapp_handoff_status"]
          tenant_id: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string
          resolved_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_handoff_status"]
          tenant_id: string
        }
        Update: {
          assigned_to_user_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string
          resolved_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_handoff_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_handoffs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_handoffs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          confidence: number | null
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["whatsapp_message_direction"]
          id: string
          intent: string | null
          message_type: Database["public"]["Enums"]["whatsapp_message_type"]
          payload: Json | null
          provider_message_id: string | null
          sent_by_user_id: string | null
          tenant_id: string
          text_content: string | null
        }
        Insert: {
          confidence?: number | null
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["whatsapp_message_direction"]
          id?: string
          intent?: string | null
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          payload?: Json | null
          provider_message_id?: string | null
          sent_by_user_id?: string | null
          tenant_id: string
          text_content?: string | null
        }
        Update: {
          confidence?: number | null
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["whatsapp_message_direction"]
          id?: string
          intent?: string | null
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          payload?: Json | null
          provider_message_id?: string | null
          sent_by_user_id?: string | null
          tenant_id?: string
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pending_states: {
        Row: {
          conversation_id: string
          created_at: string
          expires_at: string
          id: string
          pending_action: string | null
          pending_context: Json | null
          pending_entity_id: string | null
          pending_entity_type: string | null
          pending_intent: string
          pending_question: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          expires_at?: string
          id?: string
          pending_action?: string | null
          pending_context?: Json | null
          pending_entity_id?: string | null
          pending_entity_type?: string | null
          pending_intent: string
          pending_question?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          pending_action?: string | null
          pending_context?: Json | null
          pending_entity_id?: string | null
          pending_entity_type?: string | null
          pending_intent?: string
          pending_question?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_pending_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_pending_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_dashboard_kpis: {
        Row: {
          delivered_orders: number | null
          month_revenue: number | null
          open_orders: number | null
          today_received: number | null
          today_revenue: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      mv_inventory_usage: {
        Row: {
          cost_price: number | null
          current_stock: number | null
          minimum_quantity: number | null
          orders_used_in: number | null
          product_id: string | null
          product_name: string | null
          sale_price: number | null
          sku: string | null
          total_consumed: number | null
          total_cost_consumed: number | null
        }
        Relationships: []
      }
      mv_partner_performance: {
        Row: {
          approved_quotes: number | null
          collection_point_id: string | null
          collection_point_name: string | null
          total_commissions: number | null
          total_orders: number | null
          total_quotes: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      mv_technician_performance: {
        Row: {
          avg_hours_to_complete: number | null
          delivered_orders: number | null
          distinct_parts_used: number | null
          technician_id: string | null
          technician_name: string | null
          total_orders: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _internal_sync_os_revenue: {
        Args: { _so_id: string }
        Returns: undefined
      }
      adjust_stock: {
        Args: { _new_quantity: number; _product_id: string; _reason?: string }
        Returns: Json
      }
      approve_cp_commission: { Args: { _id: string }; Returns: undefined }
      approve_reject_quote: {
        Args: {
          _charge_analysis_fee?: boolean
          _decided_by_name?: string
          _decided_by_role?: string
          _decision: string
          _quote_id: string
          _reason?: string
        }
        Returns: Json
      }
      audit_os_financial_inconsistencies: {
        Args: never
        Returns: {
          auxiliary_count: number
          auxiliary_paid_any: boolean
          cancelled_os_active_revenue: boolean
          customer_name: string
          divergence: number
          has_auxiliary_revenues: boolean
          issue_type: string
          order_number: string
          os_status: string
          os_total: number
          primary_revenue_amount: number
          primary_revenue_id: string
          primary_revenue_paid: number
          primary_revenue_status: string
          service_order_id: string
        }[]
      }
      can_delete_product: { Args: { _product_id: string }; Returns: Json }
      can_delete_supplier: { Args: { _supplier_id: string }; Returns: Json }
      cancel_os_revenue: {
        Args: { _service_order_id: string }
        Returns: undefined
      }
      cancel_sale: {
        Args: { _reason: string; _sale_id: string }
        Returns: undefined
      }
      change_service_order_status: {
        Args: {
          _from_status: string
          _notes?: string
          _order_id: string
          _to_status: string
        }
        Returns: undefined
      }
      check_cp_permission: { Args: { _permission: string }; Returns: boolean }
      check_plan_limits: {
        Args: { _resource_type: string; _tenant_id: string }
        Returns: boolean
      }
      close_cash_register: {
        Args: {
          _closing_notes?: string
          _counted_amount: number
          _counted_bank_balance?: number
          _register_id: string
        }
        Returns: Json
      }
      collection_point_performance: {
        Args: { _cp_id?: string; _from?: string; _to?: string }
        Returns: {
          avg_ticket: number
          calculated_commission: number
          commission_type: string
          commission_value: number
          completed_orders: number
          cp_id: string
          cp_name: string
          total_orders: number
          total_revenue: number
        }[]
      }
      commission_summary: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      complete_sale: { Args: { _sale_id: string }; Returns: Json }
      consume_part: {
        Args: {
          _notes?: string
          _product_id: string
          _quantity: number
          _service_order_id: string
        }
        Returns: Json
      }
      cp_can_view_all_tenant_orders: { Args: never; Returns: boolean }
      cp_ranking: {
        Args: { _cp_id?: string; _from?: string; _to?: string }
        Returns: {
          avg_ticket: number
          commission: number
          completed_orders: number
          cp_id: string
          cp_name: string
          rank_position: number
          total_orders: number
          total_revenue: number
        }[]
      }
      create_tenant: {
        Args: { _document?: string; _name: string; _slug: string }
        Returns: Json
      }
      create_warranty_return: {
        Args: { _reason: string; _warranty_id: string }
        Returns: Json
      }
      dashboard_summary: { Args: { _from: string; _to: string }; Returns: Json }
      detect_stale_devices: {
        Args: { days_threshold?: number }
        Returns: {
          customer_name: string
          days_stale: number
          device_label: string
          last_update: string
          order_number: string
          service_order_id: string
          status: string
        }[]
      }
      detect_suspicious_activity: { Args: { _days?: number }; Returns: Json }
      expire_stale_commercial_quotes: { Args: never; Returns: number }
      expire_stale_quotes: { Args: never; Returns: number }
      finance_summary:
        | { Args: never; Returns: Json }
        | { Args: { _from: string; _to: string }; Returns: Json }
      generate_cp_commissions: {
        Args: { _cp_id?: string; _period_end: string; _period_start: string }
        Returns: number
      }
      generate_public_tracking_token: {
        Args: { _service_order_id: string }
        Returns: Json
      }
      generate_sale_commissions: { Args: { _sale_id: string }; Returns: number }
      generate_so_commissions: { Args: { _so_id: string }; Returns: number }
      get_active_tenant_id: { Args: never; Returns: string }
      get_cached_dashboard_kpis: { Args: never; Returns: Json }
      get_cached_inventory_usage: { Args: never; Returns: Json }
      get_cached_partner_performance: { Args: never; Returns: Json }
      get_cached_technician_performance: { Args: never; Returns: Json }
      get_cp_operator_customer_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_cp_operator_device_customer_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_customer_ids_for_email: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_diagnostic_suggestions: {
        Args: {
          _device_brand?: string
          _device_model?: string
          _device_type?: string
          _reported_issue?: string
        }
        Returns: Json
      }
      get_financial_balances: { Args: never; Returns: Json }
      get_goal_progress: { Args: { _goal_id: string }; Returns: Json }
      get_last_closed_balances: { Args: never; Returns: Json }
      get_my_cp_settings: { Args: never; Returns: Json }
      get_next_sequence: {
        Args: { _key: string; _tenant_id: string }
        Returns: number
      }
      get_plan_usage: { Args: { _tenant_id: string }; Returns: Json }
      get_user_collection_points: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_cp_id: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      get_work_queues:
        | { Args: never; Returns: Json }
        | {
            Args: {
              _collection_point_only?: boolean
              _page?: number
              _page_size?: number
              _priority?: string
              _queue?: string
              _technician_id?: string
            }
            Returns: Json
          }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cp_operator_for_cp: { Args: { _cp_id: string }; Returns: boolean }
      is_cp_operator_for_quote: {
        Args: { _quote_id: string }
        Returns: boolean
      }
      is_cp_operator_for_so: { Args: { _so_id: string }; Returns: boolean }
      is_customer_for_so: { Args: { _so_id: string }; Returns: boolean }
      is_technician_for_so: { Args: { _so_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      mark_overdue_entries: { Args: never; Returns: number }
      mark_overdue_receivables: { Args: never; Returns: number }
      onboard_tenant: {
        Args: {
          _company_name: string
          _company_slug: string
          _user_email: string
          _user_id: string
          _user_name: string
        }
        Returns: Json
      }
      pay_cp_commission: {
        Args: { _id: string; _method?: string }
        Returns: undefined
      }
      process_notification_events: { Args: never; Returns: Json }
      process_sale_return: {
        Args: {
          _amount_refunded: number
          _product_id: string
          _quantity: number
          _reason: string
          _sale_id: string
          _sale_item_id: string
        }
        Returns: string
      }
      public_approve_reject_quote: {
        Args: { _decision: string; _quote_id: string; _token: string }
        Returns: Json
      }
      public_track_order: { Args: { _token: string }; Returns: Json }
      quotes_summary: { Args: never; Returns: Json }
      receivables_summary: { Args: never; Returns: Json }
      recover_scrap_part: {
        Args: { _recovered_part_id: string }
        Returns: Json
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      register_payment:
        | {
            Args: {
              _amount: number
              _entry_id: string
              _installment_number?: number
              _method: string
              _notes?: string
              _reference?: string
              _total_installments?: number
            }
            Returns: Json
          }
        | {
            Args: {
              _amount: number
              _financial_entry_id: string
              _notes?: string
              _payment_date?: string
              _payment_method?: string
              _reference?: string
            }
            Returns: Json
          }
      register_receivable_payment: {
        Args: {
          _amount: number
          _notes?: string
          _payment_method?: string
          _receivable_id: string
        }
        Returns: Json
      }
      release_reservation: { Args: { _reservation_id: string }; Returns: Json }
      reserve_part: {
        Args: {
          _diagnosis_id?: string
          _product_id: string
          _quantity?: number
          _service_order_id: string
        }
        Returns: Json
      }
      resolve_warranty_return: {
        Args: {
          _outcome: string
          _return_id: string
          _technical_analysis?: string
        }
        Returns: Json
      }
      reverse_sale_commissions: {
        Args: { _proportion?: number; _sale_id: string }
        Returns: undefined
      }
      run_consistency_checks: { Args: never; Returns: Json }
      sales_dashboard_summary: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      scrap_dashboard_summary: { Args: never; Returns: Json }
      set_tenant_context: { Args: { _tenant_id: string }; Returns: undefined }
      switch_tenant: { Args: { _tenant_id: string }; Returns: Json }
      team_ranking_data: {
        Args: { _from?: string; _to?: string }
        Returns: {
          commission_total: number
          goal_pct: number
          name: string
          role: string
          sales_count: number
          sales_revenue: number
          so_count: number
          so_revenue: number
          ticket_avg: number
          total_revenue: number
          user_id: string
        }[]
      }
      upsert_os_revenue: {
        Args: { _service_order_id: string }
        Returns: string
      }
      void_warranty: {
        Args: { _reason: string; _warranty_id: string }
        Returns: Json
      }
      wa_archive_stale_conversations: { Args: never; Returns: number }
      wa_expire_pending_states: { Args: never; Returns: number }
      wa_get_customer_balance: { Args: { _customer_id: string }; Returns: Json }
      wa_get_customer_logistics: {
        Args: { _customer_id: string }
        Returns: Json
      }
      wa_get_customer_orders: { Args: { _customer_id: string }; Returns: Json }
      wa_get_customer_quotes: { Args: { _customer_id: string }; Returns: Json }
      wa_get_customer_warranties: {
        Args: { _customer_id: string }
        Returns: Json
      }
      wa_lookup_by_order_number: {
        Args: { _order_number: string }
        Returns: Json
      }
      wa_lookup_by_quote_number: {
        Args: { _quote_number: string }
        Returns: Json
      }
      wa_lookup_customer: { Args: { _phone: string }; Returns: Json }
      wa_lookup_customer_by_document: {
        Args: { _document: string }
        Returns: Json
      }
      warranty_analytics: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "front_desk"
        | "bench_technician"
        | "field_technician"
        | "finance"
        | "collection_point_operator"
        | "customer"
      cash_movement_type:
        | "sale"
        | "receipt"
        | "withdrawal"
        | "reinforcement"
        | "expense"
        | "adjustment"
      cash_register_status: "open" | "closed"
      commission_entry_status: "pending" | "approved" | "paid" | "cancelled"
      commission_type: "percentage" | "fixed_per_order" | "fixed_per_device"
      cp_commission_period_status: "pending" | "approved" | "paid"
      customer_type: "individual" | "business"
      device_type:
        | "notebook"
        | "desktop_pc"
        | "monitor"
        | "tv"
        | "smartphone"
        | "tablet"
        | "printer"
        | "electronic_module"
        | "motherboard"
        | "other"
      diagnosis_status: "in_progress" | "completed" | "cancelled"
      fault_severity: "minor" | "moderate" | "severe" | "critical"
      financial_entry_status:
        | "pending"
        | "partial"
        | "paid"
        | "overdue"
        | "cancelled"
      financial_entry_type: "revenue" | "expense" | "commission"
      intake_channel:
        | "front_desk"
        | "collection_point"
        | "whatsapp"
        | "phone"
        | "email"
        | "website"
      logistics_status:
        | "pickup_requested"
        | "pickup_scheduled"
        | "picked_up"
        | "in_transport"
        | "received_at_lab"
        | "ready_for_return"
        | "return_scheduled"
        | "returned"
      logistics_type: "pickup" | "delivery" | "collection_point_transfer"
      notification_channel: "whatsapp" | "email" | "sms" | "internal"
      notification_processing_status:
        | "pending"
        | "processing"
        | "processed"
        | "failed"
      notification_queue_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
        | "skipped"
      payment_method:
        | "cash"
        | "credit_card"
        | "debit_card"
        | "pix"
        | "bank_transfer"
        | "boleto"
        | "check"
        | "other"
      public_link_status: "active" | "revoked" | "expired"
      quote_item_type: "labor" | "part"
      quote_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      repair_complexity: "simple" | "moderate" | "complex" | "specialized"
      repair_viability: "repairable" | "not_repairable" | "uncertain"
      sale_payment_method:
        | "cash"
        | "pix"
        | "credit_card"
        | "debit_card"
        | "bank_transfer"
        | "other"
      sale_payment_status:
        | "pending"
        | "partial"
        | "paid"
        | "refunded"
        | "cancelled"
      sale_status:
        | "draft"
        | "completed"
        | "cancelled"
        | "partially_refunded"
        | "refunded"
      scrap_category:
        | "aparelho_completo"
        | "placa"
        | "carcaca"
        | "tela_quebrada"
        | "lote_pecas"
        | "acessorio"
      scrap_status:
        | "aguardando_triagem"
        | "triada"
        | "desmontada"
        | "pecas_recuperadas"
        | "descartada"
        | "vendida"
        | "usada_internamente"
      service_order_priority: "low" | "normal" | "high" | "urgent"
      service_order_status:
        | "received"
        | "triage"
        | "awaiting_diagnosis"
        | "awaiting_quote"
        | "awaiting_customer_approval"
        | "awaiting_parts"
        | "in_repair"
        | "in_testing"
        | "ready_for_pickup"
        | "delivered"
        | "cancelled"
        | "warranty_return"
      so_item_type: "service" | "product" | "labor"
      stock_movement_type:
        | "entry"
        | "exit"
        | "adjustment"
        | "return"
        | "reserved"
        | "consumed"
        | "sale"
        | "sale_return"
        | "scrap_recovery"
      tenant_role: "owner" | "admin" | "member"
      test_result: "pass" | "fail" | "abnormal" | "inconclusive" | "not_tested"
      transfer_status:
        | "pending_pickup"
        | "in_transit_to_center"
        | "received_at_center"
        | "in_transit_to_collection_point"
        | "delivered_to_collection_point"
        | "delivered_to_customer"
      whatsapp_conversation_status:
        | "active"
        | "bot_active"
        | "waiting_human"
        | "human_active"
        | "resolved"
        | "archived"
      whatsapp_handoff_status:
        | "pending"
        | "assigned"
        | "active"
        | "resolved"
        | "cancelled"
      whatsapp_message_direction: "inbound" | "outbound"
      whatsapp_message_type:
        | "text"
        | "image"
        | "audio"
        | "document"
        | "location"
        | "system"
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
        "manager",
        "front_desk",
        "bench_technician",
        "field_technician",
        "finance",
        "collection_point_operator",
        "customer",
      ],
      cash_movement_type: [
        "sale",
        "receipt",
        "withdrawal",
        "reinforcement",
        "expense",
        "adjustment",
      ],
      cash_register_status: ["open", "closed"],
      commission_entry_status: ["pending", "approved", "paid", "cancelled"],
      commission_type: ["percentage", "fixed_per_order", "fixed_per_device"],
      cp_commission_period_status: ["pending", "approved", "paid"],
      customer_type: ["individual", "business"],
      device_type: [
        "notebook",
        "desktop_pc",
        "monitor",
        "tv",
        "smartphone",
        "tablet",
        "printer",
        "electronic_module",
        "motherboard",
        "other",
      ],
      diagnosis_status: ["in_progress", "completed", "cancelled"],
      fault_severity: ["minor", "moderate", "severe", "critical"],
      financial_entry_status: [
        "pending",
        "partial",
        "paid",
        "overdue",
        "cancelled",
      ],
      financial_entry_type: ["revenue", "expense", "commission"],
      intake_channel: [
        "front_desk",
        "collection_point",
        "whatsapp",
        "phone",
        "email",
        "website",
      ],
      logistics_status: [
        "pickup_requested",
        "pickup_scheduled",
        "picked_up",
        "in_transport",
        "received_at_lab",
        "ready_for_return",
        "return_scheduled",
        "returned",
      ],
      logistics_type: ["pickup", "delivery", "collection_point_transfer"],
      notification_channel: ["whatsapp", "email", "sms", "internal"],
      notification_processing_status: [
        "pending",
        "processing",
        "processed",
        "failed",
      ],
      notification_queue_status: [
        "pending",
        "processing",
        "sent",
        "failed",
        "cancelled",
        "skipped",
      ],
      payment_method: [
        "cash",
        "credit_card",
        "debit_card",
        "pix",
        "bank_transfer",
        "boleto",
        "check",
        "other",
      ],
      public_link_status: ["active", "revoked", "expired"],
      quote_item_type: ["labor", "part"],
      quote_status: ["draft", "sent", "approved", "rejected", "expired"],
      repair_complexity: ["simple", "moderate", "complex", "specialized"],
      repair_viability: ["repairable", "not_repairable", "uncertain"],
      sale_payment_method: [
        "cash",
        "pix",
        "credit_card",
        "debit_card",
        "bank_transfer",
        "other",
      ],
      sale_payment_status: [
        "pending",
        "partial",
        "paid",
        "refunded",
        "cancelled",
      ],
      sale_status: [
        "draft",
        "completed",
        "cancelled",
        "partially_refunded",
        "refunded",
      ],
      scrap_category: [
        "aparelho_completo",
        "placa",
        "carcaca",
        "tela_quebrada",
        "lote_pecas",
        "acessorio",
      ],
      scrap_status: [
        "aguardando_triagem",
        "triada",
        "desmontada",
        "pecas_recuperadas",
        "descartada",
        "vendida",
        "usada_internamente",
      ],
      service_order_priority: ["low", "normal", "high", "urgent"],
      service_order_status: [
        "received",
        "triage",
        "awaiting_diagnosis",
        "awaiting_quote",
        "awaiting_customer_approval",
        "awaiting_parts",
        "in_repair",
        "in_testing",
        "ready_for_pickup",
        "delivered",
        "cancelled",
        "warranty_return",
      ],
      so_item_type: ["service", "product", "labor"],
      stock_movement_type: [
        "entry",
        "exit",
        "adjustment",
        "return",
        "reserved",
        "consumed",
        "sale",
        "sale_return",
        "scrap_recovery",
      ],
      tenant_role: ["owner", "admin", "member"],
      test_result: ["pass", "fail", "abnormal", "inconclusive", "not_tested"],
      transfer_status: [
        "pending_pickup",
        "in_transit_to_center",
        "received_at_center",
        "in_transit_to_collection_point",
        "delivered_to_collection_point",
        "delivered_to_customer",
      ],
      whatsapp_conversation_status: [
        "active",
        "bot_active",
        "waiting_human",
        "human_active",
        "resolved",
        "archived",
      ],
      whatsapp_handoff_status: [
        "pending",
        "assigned",
        "active",
        "resolved",
        "cancelled",
      ],
      whatsapp_message_direction: ["inbound", "outbound"],
      whatsapp_message_type: [
        "text",
        "image",
        "audio",
        "document",
        "location",
        "system",
      ],
    },
  },
} as const
