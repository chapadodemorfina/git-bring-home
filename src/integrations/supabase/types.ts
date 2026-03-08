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
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "collection_point_users_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "mv_partner_performance"
            referencedColumns: ["collection_point_id"]
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
      device_location_tracking: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          location: string
          moved_by: string | null
          notes: string | null
          service_order_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          location?: string
          moved_by?: string | null
          notes?: string | null
          service_order_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          location?: string
          moved_by?: string | null
          notes?: string | null
          service_order_id?: string
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
      diagnosis_faults: {
        Row: {
          confirmed: boolean
          created_at: string
          diagnosis_id: string
          fault_description: string | null
          fault_type: string
          id: string
          severity: Database["public"]["Enums"]["fault_severity"]
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          diagnosis_id: string
          fault_description?: string | null
          fault_type: string
          id?: string
          severity?: Database["public"]["Enums"]["fault_severity"]
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          diagnosis_id?: string
          fault_description?: string | null
          fault_type?: string
          id?: string
          severity?: Database["public"]["Enums"]["fault_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_faults_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
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
          notes: string | null
          paid_amount: number
          quote_id: string | null
          service_order_id: string | null
          status: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id: string | null
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
          notes?: string | null
          paid_amount?: number
          quote_id?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
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
          notes?: string | null
          paid_amount?: number
          quote_id?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
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
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          id?: string
          provider_key?: string | null
          queue_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_status?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          provider_key?: string | null
          queue_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "notification_queue"
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
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "payments_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
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
          reserved_quantity: number
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
          reserved_quantity?: number
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
          reserved_quantity?: number
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
        }
        Relationships: [
          {
            foreignKeyName: "service_order_public_links_service_order_id_fkey"
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
      sla_configs: {
        Row: {
          created_at: string
          id: string
          priority: string
          status: string
          target_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority: string
          status: string
          target_hours: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: string
          status?: string
          target_hours?: number
          updated_at?: string
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
          customer_id: string | null
          end_date: string
          id: string
          is_void: boolean
          service_order_id: string
          start_date: string
          terms: string | null
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
          service_order_id: string
          start_date?: string
          terms?: string | null
          void_reason?: string | null
          warranty_number?: string
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
          service_order_id?: string
          start_date?: string
          terms?: string | null
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
          outcome: string | null
          reason: string
          return_cause: string | null
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
          outcome?: string | null
          reason: string
          return_cause?: string | null
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
          outcome?: string | null
          reason?: string
          return_cause?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_handoffs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
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
      adjust_stock: {
        Args: { _new_quantity: number; _product_id: string; _reason?: string }
        Returns: Json
      }
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
      consume_part: {
        Args: {
          _notes?: string
          _product_id: string
          _quantity: number
          _service_order_id: string
        }
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
      expire_stale_quotes: { Args: never; Returns: number }
      finance_summary: { Args: never; Returns: Json }
      generate_public_tracking_token: {
        Args: { _service_order_id: string }
        Returns: Json
      }
      get_cached_dashboard_kpis: { Args: never; Returns: Json }
      get_cached_inventory_usage: { Args: never; Returns: Json }
      get_cached_partner_performance: { Args: never; Returns: Json }
      get_cached_technician_performance: { Args: never; Returns: Json }
      get_user_collection_points: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_work_queues: {
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
      is_cp_operator_for_so: { Args: { _so_id: string }; Returns: boolean }
      is_customer_for_so: { Args: { _so_id: string }; Returns: boolean }
      is_technician_for_so: { Args: { _so_id: string }; Returns: boolean }
      mark_overdue_entries: { Args: never; Returns: number }
      process_notification_events: { Args: never; Returns: Json }
      public_approve_reject_quote: {
        Args: { _decision: string; _quote_id: string; _token: string }
        Returns: Json
      }
      public_track_order: { Args: { _token: string }; Returns: Json }
      refresh_materialized_views: { Args: never; Returns: undefined }
      register_payment: {
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
      run_consistency_checks: { Args: never; Returns: Json }
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
