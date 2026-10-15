/** Reviewed export scope; adding tables or columns requires a new review. */
export interface BackupTableDefinition {
  name: string;
  scope: "tenant" | "tenant-record" | "profiles";
  columns: string;
  cursor: "id" | "key" | "permission_key";
  partitionByRole?: boolean;
}
export const BACKUP_SOURCE_PROJECT = "moijoyqwapimforpijdc";
export const BACKUP_FORMAT_VERSION = "i9-tenant-export/1";
export const BACKUP_PAGE_SIZE = 250;
export const BACKUP_RAW_LIMIT = 128 * 1024 * 1024;
export const BACKUP_FILE_LIMIT = 20 * 1024 * 1024;
export const BACKUP_ROLES = ["admin", "manager", "front_desk", "bench_technician", "field_technician", "finance", "collection_point_operator", "customer"] as const;
export const SAFE_SETTING_KEYS = [
  "company_name", "company_legal_name", "company_cnpj", "company_logo_url", "company_primary_color",
  "company_street", "company_number", "company_neighborhood", "company_city", "company_state", "company_zip",
  "company_phone", "company_email", "whatsapp_support_number", "company_website", "company_instagram",
  "pdf_show_qrcode", "pdf_show_signatures", "pdf_show_terms", "pdf_mode", "terms_service", "terms_warranty",
  "terms_abandonment", "default_warranty_days", "default_whatsapp_message",
] as const;
export const BACKUP_EXCLUSIONS = [
  "Schemas internos, cron, net, Auth, senhas/hashes, sessões, tokens, secrets, policies, funções, triggers e estrutura SQL não são exportados.",
  "Tabelas globais sem tenant permissions e plans, views e tabelas ausentes do manifesto revisado não são exportadas.",
  "Configurações fora da allowlist institucional, senha de equipamento e tokens públicos são excluídos; valores sensíveis em JSON são ocultados.",
  "Storage inclui somente fotos, anexos de OS e comprovantes de logística referenciados pelas linhas autorizadas. Avatares, logos, objetos órfãos e URLs externas não são copiados.",
  "A exportação usa a visibilidade RLS do usuário e não comprova cópia integral do banco; consultas separadas não formam um snapshot transacional.",
];
export const BACKUP_TABLES: readonly BackupTableDefinition[] = [
  {
    "name": "accounts_receivable",
    "scope": "tenant",
    "columns": "amount_received,created_at,created_by,customer_id,description,due_date,id,reference_id,reference_type,remaining_amount,status,tenant_id,total_amount,updated_at",
    "cursor": "id"
  },
  {
    "name": "app_settings",
    "scope": "tenant",
    "columns": "description,key,tenant_id,updated_at,updated_by,value",
    "cursor": "key"
  },
  {
    "name": "audit_logs",
    "scope": "tenant",
    "columns": "action,created_at,id,ip_address,new_data,old_data,record_id,table_name,tenant_id,user_id",
    "cursor": "id"
  },
  {
    "name": "cash_register_movements",
    "scope": "tenant",
    "columns": "affects_bank,affects_cash,amount,cash_register_id,created_at,created_by,description,id,movement_type,payment_method,reference_id,reference_type,source_type,tenant_id",
    "cursor": "id"
  },
  {
    "name": "cash_registers",
    "scope": "tenant",
    "columns": "closed_at,closed_by,closing_bank_balance,closing_notes,counted_amount,created_at,difference_amount,difference_bank,expected_amount,expected_bank_balance,id,initial_amount,notes,opened_at,opened_by,opening_bank_balance,status,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "collection_point_commissions",
    "scope": "tenant",
    "columns": "base_amount,calculated_amount,collection_point_id,commission_type,commission_value,created_at,id,is_paid,notes,paid_at,service_order_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "collection_point_users",
    "scope": "tenant",
    "columns": "collection_point_id,created_at,id,is_active,tenant_id,user_id",
    "cursor": "id"
  },
  {
    "name": "collection_points",
    "scope": "tenant",
    "columns": "city,commission_type,commission_value,company_name,complement,created_at,created_by,email,id,is_active,name,neighborhood,notes,number,phone,responsible_person,settings,state,street,tenant_id,updated_at,whatsapp,zip_code",
    "cursor": "id"
  },
  {
    "name": "collection_transfers",
    "scope": "tenant",
    "columns": "collection_point_id,created_at,direction,id,notes,received_at,received_by,service_order_id,status,tenant_id,tracking_code,transferred_at,transferred_by,updated_at",
    "cursor": "id"
  },
  {
    "name": "commission_entries",
    "scope": "tenant",
    "columns": "base_amount,commission_amount,created_at,id,notes,paid_at,reference_date,role,rule_id,source_id,source_label,source_type,status,tenant_id,updated_at,user_id",
    "cursor": "id"
  },
  {
    "name": "commission_rules",
    "scope": "tenant",
    "columns": "base_type,category_filter,created_at,fixed_amount,id,is_active,label,notes,only_after_payment,percentage,product_id,role,source_type,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "cp_commission_periods",
    "scope": "tenant",
    "columns": "collection_point_id,commission_amount,completed_orders,created_at,financial_entry_id,id,period_end,period_start,status,tenant_id,total_orders,total_revenue,updated_at",
    "cursor": "id"
  },
  {
    "name": "customer_addresses",
    "scope": "tenant",
    "columns": "city,complement,created_at,customer_id,id,is_default,label,neighborhood,number,state,street,tenant_id,updated_at,zip_code",
    "cursor": "id"
  },
  {
    "name": "customer_contacts",
    "scope": "tenant",
    "columns": "created_at,customer_id,email,id,is_primary,name,phone,role,tenant_id,updated_at,whatsapp",
    "cursor": "id"
  },
  {
    "name": "customer_message_events",
    "scope": "tenant",
    "columns": "created_at,created_by,customer_id,delivery_status,error_message,event_type,id,message_text,phone,reference_id,reference_type,sent_automatically,template_key,tenant_id",
    "cursor": "id"
  },
  {
    "name": "customers",
    "scope": "tenant",
    "columns": "created_at,created_by,document,email,full_name,id,is_active,notes,phone,tenant_id,type,updated_at,whatsapp",
    "cursor": "id"
  },
  {
    "name": "device_accessories",
    "scope": "tenant",
    "columns": "created_at,delivered,device_id,id,name,notes,tenant_id",
    "cursor": "id"
  },
  {
    "name": "device_location_tracking",
    "scope": "tenant",
    "columns": "created_at,device_id,id,location,moved_by,notes,service_order_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "device_photos",
    "scope": "tenant",
    "columns": "caption,created_at,device_id,id,storage_path,tenant_id,uploaded_by",
    "cursor": "id"
  },
  {
    "name": "devices",
    "scope": "tenant",
    "columns": "brand,color,created_at,created_by,custom_device_type,customer_id,device_type,id,imei,internal_notes,is_active,model,physical_condition,reported_issue,serial_number,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "diagnosis_faults",
    "scope": "tenant",
    "columns": "confirmed,created_at,diagnosis_id,fault_description,fault_type,id,severity,tenant_id",
    "cursor": "id"
  },
  {
    "name": "diagnosis_parts",
    "scope": "tenant",
    "columns": "created_at,diagnosis_id,estimated_unit_cost,id,notes,part_name,product_id,quantity,supplier,tenant_id",
    "cursor": "id"
  },
  {
    "name": "diagnosis_tests",
    "scope": "tenant",
    "columns": "created_at,diagnosis_id,id,measured_value,notes,sort_order,tenant_id,test_category,test_name,test_result",
    "cursor": "id"
  },
  {
    "name": "diagnostics",
    "scope": "tenant",
    "columns": "created_at,diagnosed_by,diagnosis_completed_at,diagnosis_started_at,diagnosis_status,estimated_cost,estimated_repair_hours,id,internal_notes,not_repairable_reason,probable_cause,repair_complexity,repair_viability,required_parts,service_order_id,technical_findings,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "financial_entries",
    "scope": "tenant",
    "columns": "amount,category,collection_point_id,created_at,created_by,customer_id,description,due_date,entry_type,id,is_primary_os_revenue,notes,paid_amount,quote_id,sale_id,service_order_id,status,supplier_id,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "inventory_scrap",
    "scope": "tenant",
    "columns": "brand,color,condition,created_at,created_by,customer_id,device_type,estimated_recovery_value,id,imei_serial,location,model,notes,salvageable_parts,scrap_category,service_order_id,status,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "notification_events",
    "scope": "tenant",
    "columns": "created_at,created_by,entity_id,entity_type,event_type,id,payload,processed_at,processing_status,tenant_id",
    "cursor": "id"
  },
  {
    "name": "notification_logs",
    "scope": "tenant",
    "columns": "created_at,id,provider_key,queue_id,request_payload,response_payload,response_status,tenant_id",
    "cursor": "id"
  },
  {
    "name": "notification_queue",
    "scope": "tenant",
    "columns": "attempts,channel,created_at,error_message,event_id,id,last_attempt_at,next_attempt_at,payload,recipient_address,recipient_name,rendered_body,rendered_subject,rule_id,sent_at,status,template_id,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "notification_rules",
    "scope": "tenant",
    "columns": "channel,conditions,created_at,delay_minutes,event_type,id,is_active,provider_key,target_audience,template_id,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "notification_templates",
    "scope": "tenant",
    "columns": "body,channel,created_at,id,is_active,name,subject,template_key,tenant_id,updated_at,variables",
    "cursor": "id"
  },
  {
    "name": "part_reservations",
    "scope": "tenant",
    "columns": "created_at,diagnosis_id,id,product_id,quantity,reserved_by,service_order_id,status,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "payments",
    "scope": "tenant",
    "columns": "amount,created_at,created_by,financial_entry_id,id,notes,payment_date,payment_method,reference,tenant_id",
    "cursor": "id"
  },
  {
    "name": "pickups_deliveries",
    "scope": "tenant",
    "columns": "address_city,address_complement,address_neighborhood,address_number,address_state,address_street,address_zip,collection_point_id,completed_date,contact_name,contact_phone,created_at,created_by,driver_name,driver_phone,id,logistics_type,notes,proof_notes,proof_storage_path,requested_date,scheduled_date,service_order_id,status,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "products",
    "scope": "tenant",
    "columns": "brand,category,compatible_devices,cost_price,created_at,created_by,id,is_active,location,minimum_quantity,name,notes,quantity,reserved_quantity,sale_price,sku,supplier_id,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "profiles",
    "scope": "profiles",
    "columns": "avatar_url,collection_point_id,created_at,email,full_name,id,is_active,phone,updated_at",
    "cursor": "id"
  },
  {
    "name": "purchase_entries",
    "scope": "tenant",
    "columns": "created_at,created_by,id,invoice_number,notes,received_at,supplier_id,tenant_id,total_amount",
    "cursor": "id"
  },
  {
    "name": "quote_approvals",
    "scope": "tenant",
    "columns": "charge_analysis_fee,created_at,decided_by_name,decided_by_role,decision,id,quote_id,reason,tenant_id",
    "cursor": "id"
  },
  {
    "name": "quote_history",
    "scope": "tenant",
    "columns": "action,created_at,created_by,id,notes,quote_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "quote_items",
    "scope": "tenant",
    "columns": "created_at,description,id,item_type,product_id,profit_amount,quantity,quote_id,tenant_id,total_cost,total_price,unit_cost,unit_price",
    "cursor": "id"
  },
  {
    "name": "quotes",
    "scope": "tenant",
    "columns": "approved_at,approved_by,cancelled_at,cancelled_by,converted_at,converted_service_order_id,created_at,created_by,customer_id,deleted_at,description,device_id,discount_amount,estimated_profit,id,parent_quote_id,quote_number,rejected_at,rejected_by,rejection_reason,service_order_id,status,subtotal_labor,subtotal_other,subtotal_parts,tenant_id,title,total_amount,total_cost,updated_at,updated_by,valid_until,version",
    "cursor": "id"
  },
  {
    "name": "receivable_payments",
    "scope": "tenant",
    "columns": "amount,created_at,created_by,id,notes,paid_at,payment_method,receivable_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "repair_parts_used",
    "scope": "tenant",
    "columns": "consumed_by,created_at,id,notes,product_id,quantity,service_order_id,tenant_id,total_cost,total_price,unit_cost,unit_price",
    "cursor": "id"
  },
  {
    "name": "repair_quote_items",
    "scope": "tenant",
    "columns": "created_at,description,id,item_type,quantity,quote_id,sort_order,tenant_id,total_price,unit_price",
    "cursor": "id"
  },
  {
    "name": "repair_quotes",
    "scope": "tenant",
    "columns": "analysis_fee,created_at,created_by,discount_amount,discount_percent,expires_at,id,notes,quote_number,service_order_id,status,tenant_id,total_amount,updated_at",
    "cursor": "id"
  },
  {
    "name": "repair_services",
    "scope": "tenant",
    "columns": "action_type,created_at,description,id,service_order_id,technician_id,tenant_id,time_spent_minutes",
    "cursor": "id"
  },
  {
    "name": "repair_tests",
    "scope": "tenant",
    "columns": "created_at,id,notes,passed,service_order_id,sort_order,tenant_id,test_name,tested_at,tested_by",
    "cursor": "id"
  },
  {
    "name": "repair_timer_sessions",
    "scope": "tenant",
    "columns": "accumulated_seconds,created_at,ended_at,id,notes,paused_at,service_order_id,started_at,status,technician_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "role_permissions",
    "scope": "tenant",
    "columns": "allowed,created_at,permission_key,role,tenant_id,updated_at",
    "cursor": "permission_key",
    "partitionByRole": true
  },
  {
    "name": "sale_items",
    "scope": "tenant",
    "columns": "cost_price_snapshot,created_at,discount_amount,id,product_id,product_name_snapshot,quantity,sale_id,sku_snapshot,tenant_id,total_amount,unit_price",
    "cursor": "id"
  },
  {
    "name": "sale_payments",
    "scope": "tenant",
    "columns": "amount,created_at,id,installments,notes,paid_at,payment_method,reference,sale_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "sale_returns",
    "scope": "tenant",
    "columns": "amount_refunded,created_at,id,processed_by,product_id,quantity,reason,returned_at,sale_id,sale_item_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "sales",
    "scope": "tenant",
    "columns": "cancelled_at,completed_at,created_at,customer_id,discount_amount,id,notes,payment_status,sale_number,seller_user_id,status,subtotal,surcharge_amount,tenant_id,total_amount,total_returned,updated_at",
    "cursor": "id"
  },
  {
    "name": "sales_goals",
    "scope": "tenant",
    "columns": "created_at,goal_type,id,label,notes,period_end,period_start,target_value,team_role,tenant_id,updated_at,user_id",
    "cursor": "id"
  },
  {
    "name": "scrap_carcass_details",
    "scope": "tenant",
    "columns": "aesthetic_state,back_cover_ok,buttons_ok,color,created_at,frame_ok,id,lenses_ok,missing_details,purpose,scrap_id,sim_tray_ok,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "scrap_disassembly",
    "scope": "tenant",
    "columns": "created_at,id,notes,scrap_id,technician_id,tenant_id",
    "cursor": "id"
  },
  {
    "name": "scrap_parts_recovered",
    "scope": "tenant",
    "columns": "added_to_stock,condition,created_at,disassembly_id,id,product_id,quantity,tenant_id",
    "cursor": "id"
  },
  {
    "name": "scrap_triage",
    "scope": "tenant",
    "columns": "battery_usable,board_responsive,buttons_flex_usable,camera_usable,carcass_usable,charge_module_usable,connectors_usable,created_at,destination,estimated_value,id,notes,recovery_potential,scrap_id,screen_usable,speaker_mic_usable,still_powers_on,tenant_id,triaged_by",
    "cursor": "id"
  },
  {
    "name": "service_order_attachments",
    "scope": "tenant",
    "columns": "caption,created_at,file_name,file_type,id,service_order_id,storage_path,tenant_id,uploaded_by",
    "cursor": "id"
  },
  {
    "name": "service_order_checklists",
    "scope": "tenant",
    "columns": "checklist_type,completed_at,created_at,id,items,notes,service_order_id,technician_id,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "service_order_items",
    "scope": "tenant",
    "columns": "created_at,description,id,item_type,notes,product_id,quantity,service_order_id,sort_order,tenant_id,total_price,unit_price,updated_at",
    "cursor": "id"
  },
  {
    "name": "service_order_public_links",
    "scope": "tenant",
    "columns": "access_count,created_at,created_by,expires_at,id,last_access_at,metadata,revoked_at,service_order_id,status,tenant_id",
    "cursor": "id"
  },
  {
    "name": "service_order_signatures",
    "scope": "tenant",
    "columns": "created_at,id,ip_address,service_order_id,signature_data,signer_name,signer_role,tenant_id",
    "cursor": "id"
  },
  {
    "name": "service_order_status_history",
    "scope": "tenant",
    "columns": "changed_by,created_at,from_status,id,notes,service_order_id,tenant_id,to_status",
    "cursor": "id"
  },
  {
    "name": "service_order_terms",
    "scope": "tenant",
    "columns": "content,created_at,id,is_active,tenant_id,title,updated_at,version",
    "cursor": "id"
  },
  {
    "name": "service_orders",
    "scope": "tenant",
    "columns": "accessories_received,assigned_technician_id,collection_point_id,created_at,created_by,customer_id,delivery_checklist,device_id,estimated_value,expected_deadline,id,intake_channel,intake_checklist,intake_notes,internal_notes,order_number,physical_condition,priority,reported_issue,status,tenant_id,total_amount,updated_at",
    "cursor": "id"
  },
  {
    "name": "sla_configs",
    "scope": "tenant",
    "columns": "created_at,id,priority,status,target_hours,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "stock_movements",
    "scope": "tenant",
    "columns": "created_at,created_by,id,movement_type,new_quantity,notes,previous_quantity,product_id,quantity,reference_id,reference_type,tenant_id,unit_cost",
    "cursor": "id"
  },
  {
    "name": "subscriptions",
    "scope": "tenant",
    "columns": "billing_cycle,billing_provider,canceled_at,created_at,current_period_end,current_period_start,external_customer_id,external_subscription_id,id,plan_id,status,stripe_customer_id,stripe_subscription_id,tenant_id,trial_ends_at,updated_at",
    "cursor": "id"
  },
  {
    "name": "suppliers",
    "scope": "tenant",
    "columns": "address,city,contact_name,country,created_at,created_by,document,email,id,is_active,lead_time_days,name,notes,phone,state,supplier_type,tenant_id,updated_at,whatsapp",
    "cursor": "id"
  },
  {
    "name": "tenant_counters",
    "scope": "tenant",
    "columns": "key,tenant_id,value",
    "cursor": "key"
  },
  {
    "name": "tenant_users",
    "scope": "tenant",
    "columns": "created_at,id,is_active,is_default,tenant_id,tenant_role,user_id",
    "cursor": "id"
  },
  {
    "name": "tenants",
    "scope": "tenant-record",
    "columns": "created_at,document,id,is_active,logo_url,name,slug,updated_at",
    "cursor": "id"
  },
  {
    "name": "transport_events",
    "scope": "tenant",
    "columns": "changed_by,created_at,from_status,id,notes,pickup_delivery_id,tenant_id,to_status",
    "cursor": "id"
  },
  {
    "name": "user_permission_overrides",
    "scope": "tenant",
    "columns": "created_at,created_by,effect,expires_at,id,permission_key,reason,tenant_id,updated_at,user_id",
    "cursor": "id"
  },
  {
    "name": "user_roles",
    "scope": "tenant",
    "columns": "created_at,id,role,tenant_id,user_id",
    "cursor": "id"
  },
  {
    "name": "warranties",
    "scope": "tenant",
    "columns": "coverage_description,created_at,created_by,customer_id,end_date,id,is_void,quote_id,service_order_id,start_date,tenant_id,terms,updated_at,void_reason,warranty_number,warranty_type",
    "cursor": "id"
  },
  {
    "name": "warranty_items",
    "scope": "tenant",
    "columns": "created_at,description,id,item_type,quantity,reference_id,tenant_id,warranty_id",
    "cursor": "id"
  },
  {
    "name": "warranty_returns",
    "scope": "tenant",
    "columns": "created_at,created_by,customer_id,id,new_service_order_id,original_service_order_id,outcome,reason,resolved_at,return_cause,status,technical_analysis,tenant_id,updated_at,warranty_id",
    "cursor": "id"
  },
  {
    "name": "warranty_rules",
    "scope": "tenant",
    "columns": "applies_to,created_at,device_type,id,is_active,name,service_category,tenant_id,warranty_days",
    "cursor": "id"
  },
  {
    "name": "whatsapp_ai_actions",
    "scope": "tenant",
    "columns": "action_payload,action_type,conversation_id,created_at,id,message_id,result_payload,success,tenant_id",
    "cursor": "id"
  },
  {
    "name": "whatsapp_conversations",
    "scope": "tenant",
    "columns": "assigned_to_user_id,channel,created_at,current_handoff_state,customer_id,id,last_message_at,metadata,phone,status,tenant_id,updated_at",
    "cursor": "id"
  },
  {
    "name": "whatsapp_handoffs",
    "scope": "tenant",
    "columns": "assigned_to_user_id,conversation_id,created_at,id,reason,requested_by,resolved_at,started_at,status,tenant_id",
    "cursor": "id"
  },
  {
    "name": "whatsapp_messages",
    "scope": "tenant",
    "columns": "confidence,conversation_id,created_at,direction,id,intent,message_type,payload,provider_message_id,sent_by_user_id,tenant_id,text_content",
    "cursor": "id"
  },
  {
    "name": "whatsapp_pending_states",
    "scope": "tenant",
    "columns": "conversation_id,created_at,expires_at,id,pending_action,pending_context,pending_entity_id,pending_entity_type,pending_intent,pending_question,tenant_id,updated_at",
    "cursor": "id"
  }
];
