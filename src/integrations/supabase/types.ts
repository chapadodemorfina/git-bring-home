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
          user_id?: string | null
        }
        Relationships: []
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
            foreignKeyName: "collection_point_commissions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
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
          user_id: string
        }
        Insert: {
          collection_point_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          collection_point_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
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
          state: string | null
          street: string | null
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
          state?: string | null
          street?: string | null
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
          state?: string | null
          street?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: []
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
            foreignKeyName: "collection_transfers_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
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
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      device_accessories: {
        Row: {
          created_at: string
          delivered: boolean
          device_id: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          delivered?: boolean
          device_id: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          delivered?: boolean
          device_id?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_accessories_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          device_id: string
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          device_id?: string
          id?: string
          storage_path?: string
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
      diagnostics: {
        Row: {
          created_at: string
          diagnosed_by: string | null
          estimated_repair_hours: number | null
          id: string
          internal_notes: string | null
          probable_cause: string | null
          repair_complexity: Database["public"]["Enums"]["repair_complexity"]
          required_parts: string | null
          service_order_id: string
          technical_findings: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosed_by?: string | null
          estimated_repair_hours?: number | null
          id?: string
          internal_notes?: string | null
          probable_cause?: string | null
          repair_complexity?: Database["public"]["Enums"]["repair_complexity"]
          required_parts?: string | null
          service_order_id: string
          technical_findings?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosed_by?: string | null
          estimated_repair_hours?: number | null
          id?: string
          internal_notes?: string | null
          probable_cause?: string | null
          repair_complexity?: Database["public"]["Enums"]["repair_complexity"]
          required_parts?: string | null
          service_order_id?: string
          technical_findings?: string | null
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
            foreignKeyName: "pickups_deliveries_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
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
          sale_price: number
          sku: string
          supplier_id: string | null
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
          sale_price?: number
          sku: string
          supplier_id?: string | null
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
          sale_price?: number
          sku?: string
          supplier_id?: string | null
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "quote_approvals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
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
          quote_number?: string
          service_order_id: string
          status?: Database["public"]["Enums"]["quote_status"]
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
          time_spent_minutes: number | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          description: string
          id?: string
          service_order_id: string
          technician_id?: string | null
          time_spent_minutes?: number | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          service_order_id?: string
          technician_id?: string | null
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
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          service_order_id: string
          signature_data: string
          signer_name: string
          signer_role?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          service_order_id?: string
          signature_data?: string
          signer_name?: string
          signer_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_signatures_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
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
        ]
      }
      service_order_terms: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          accessories_received: string | null
          assigned_technician_id: string | null
          collection_point_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          device_id: string | null
          expected_deadline: string | null
          id: string
          intake_channel: Database["public"]["Enums"]["intake_channel"]
          intake_notes: string | null
          internal_notes: string | null
          order_number: string
          physical_condition: string | null
          priority: Database["public"]["Enums"]["service_order_priority"]
          reported_issue: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          updated_at: string
        }
        Insert: {
          accessories_received?: string | null
          assigned_technician_id?: string | null
          collection_point_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          device_id?: string | null
          expected_deadline?: string | null
          id?: string
          intake_channel?: Database["public"]["Enums"]["intake_channel"]
          intake_notes?: string | null
          internal_notes?: string | null
          order_number?: string
          physical_condition?: string | null
          priority?: Database["public"]["Enums"]["service_order_priority"]
          reported_issue?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          updated_at?: string
        }
        Update: {
          accessories_received?: string | null
          assigned_technician_id?: string | null
          collection_point_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          device_id?: string | null
          expected_deadline?: string | null
          id?: string
          intake_channel?: Database["public"]["Enums"]["intake_channel"]
          intake_notes?: string | null
          internal_notes?: string | null
          order_number?: string
          physical_condition?: string | null
          priority?: Database["public"]["Enums"]["service_order_priority"]
          reported_issue?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
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
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
          unit_cost?: number | null
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
          contact_name: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
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
          to_status: Database["public"]["Enums"]["logistics_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["logistics_status"] | null
          id?: string
          notes?: string | null
          pickup_delivery_id: string
          to_status: Database["public"]["Enums"]["logistics_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["logistics_status"] | null
          id?: string
          notes?: string | null
          pickup_delivery_id?: string
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
        ]
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
      warranties: {
        Row: {
          coverage_description: string | null
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          is_void: boolean
          service_order_id: string
          start_date: string
          terms: string | null
          warranty_number: string
        }
        Insert: {
          coverage_description?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          is_void?: boolean
          service_order_id: string
          start_date?: string
          terms?: string | null
          warranty_number?: string
        }
        Update: {
          coverage_description?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          is_void?: boolean
          service_order_id?: string
          start_date?: string
          terms?: string | null
          warranty_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          new_service_order_id: string | null
          original_service_order_id: string
          reason: string
          status: string
          updated_at: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_service_order_id?: string | null
          original_service_order_id: string
          reason: string
          status?: string
          updated_at?: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_service_order_id?: string | null
          original_service_order_id?: string
          reason?: string
          status?: string
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
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
            foreignKeyName: "warranty_returns_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_collection_points: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      commission_type: "percentage" | "fixed_per_order" | "fixed_per_device"
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
      quote_item_type: "labor" | "part"
      quote_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      repair_complexity: "simple" | "moderate" | "complex" | "specialized"
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
      stock_movement_type:
        | "entry"
        | "exit"
        | "adjustment"
        | "return"
        | "reserved"
        | "consumed"
      transfer_status:
        | "pending_pickup"
        | "in_transit_to_center"
        | "received_at_center"
        | "in_transit_to_collection_point"
        | "delivered_to_collection_point"
        | "delivered_to_customer"
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
      commission_type: ["percentage", "fixed_per_order", "fixed_per_device"],
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
      quote_item_type: ["labor", "part"],
      quote_status: ["draft", "sent", "approved", "rejected", "expired"],
      repair_complexity: ["simple", "moderate", "complex", "specialized"],
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
      stock_movement_type: [
        "entry",
        "exit",
        "adjustment",
        "return",
        "reserved",
        "consumed",
      ],
      transfer_status: [
        "pending_pickup",
        "in_transit_to_center",
        "received_at_center",
        "in_transit_to_collection_point",
        "delivered_to_collection_point",
        "delivered_to_customer",
      ],
    },
  },
} as const
