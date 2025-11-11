create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "hypopg" with schema "extensions";

create extension if not exists "index_advisor" with schema "extensions";

drop trigger if exists "trigger_update_account_balance" on "public"."account_transactions";

drop trigger if exists "trigger_update_accounts_updated_at" on "public"."accounts";

drop trigger if exists "set_cash_movement_company_id_trigger" on "public"."cash_movements";

drop trigger if exists "trigger_company_created" on "public"."companies";

drop trigger if exists "trigger_create_default_roles_for_company" on "public"."companies";

drop trigger if exists "trigger_create_main_warehouse" on "public"."companies";

drop trigger if exists "trigger_update_companies_updated_at" on "public"."companies";

drop trigger if exists "trigger_update_cost_centers_updated_at" on "public"."cost_centers";

drop trigger if exists "trigger_log_customer_changes" on "public"."customers";

drop trigger if exists "trigger_update_customers_updated_at" on "public"."customers";

drop trigger if exists "trigger_recalculate_delivery_note_totals" on "public"."delivery_note_items";

drop trigger if exists "trigger_update_delivery_note_items_updated_at" on "public"."delivery_note_items";

drop trigger if exists "trigger_update_delivery_note_status" on "public"."delivery_note_items";

drop trigger if exists "trigger_log_delivery_note_changes" on "public"."delivery_notes";

drop trigger if exists "trigger_update_delivery_notes_updated_at" on "public"."delivery_notes";

drop trigger if exists "trigger_update_import_jobs_updated_at" on "public"."import_jobs";

drop trigger if exists "trigger_update_numerations_updated_at" on "public"."numerations";

drop trigger if exists "trigger_update_payment_gateways_updated_at" on "public"."payment_gateways";

drop trigger if exists "trigger_recalculate_payment_total" on "public"."payment_items";

drop trigger if exists "trigger_update_purchase_invoice_paid_amount" on "public"."payment_items";

drop trigger if exists "trigger_update_payment_methods_updated_at" on "public"."payment_methods";

drop trigger if exists "trigger_update_payment_transactions_updated_at" on "public"."payment_transactions";

drop trigger if exists "trigger_log_payment_changes" on "public"."payments";

drop trigger if exists "trigger_revert_account_balance_on_payment_cancellation" on "public"."payments";

drop trigger if exists "trigger_revert_purchase_invoice_paid_amount" on "public"."payments";

drop trigger if exists "trigger_update_account_balance_on_payment" on "public"."payments";

drop trigger if exists "trigger_update_payments_updated_at" on "public"."payments";

drop trigger if exists "trigger_permissions_updated_at" on "public"."permissions";

drop trigger if exists "trigger_update_pos_configurations_updated_at" on "public"."pos_configurations";

drop trigger if exists "trigger_print_templates_updated_at" on "public"."print_templates";

drop trigger if exists "trigger_update_product_import_history_updated_at" on "public"."product_import_history";

drop trigger if exists "trigger_recalculate_purchase_debit_note_totals" on "public"."purchase_debit_note_items";

drop trigger if exists "trigger_recalculate_purchase_debit_note_settlements" on "public"."purchase_debit_note_settlements";

drop trigger if exists "trigger_update_account_balance_on_debit_note_refund" on "public"."purchase_debit_note_settlements";

drop trigger if exists "trigger_validate_purchase_debit_note_settlements" on "public"."purchase_debit_note_settlements";

drop trigger if exists "trigger_log_purchase_debit_note_changes" on "public"."purchase_debit_notes";

drop trigger if exists "trigger_update_purchase_debit_notes_updated_at" on "public"."purchase_debit_notes";

drop trigger if exists "trigger_recalculate_purchase_invoice_totals" on "public"."purchase_invoice_items";

drop trigger if exists "trigger_update_purchase_invoice_items_updated_at" on "public"."purchase_invoice_items";

drop trigger if exists "trigger_recalculate_purchase_invoice_totals_withholdings" on "public"."purchase_invoice_withholdings";

drop trigger if exists "trigger_log_purchase_invoice_changes" on "public"."purchase_invoices";

drop trigger if exists "trigger_revert_inventory_on_purchase_invoice_cancellation" on "public"."purchase_invoices";

drop trigger if exists "trigger_update_inventory_on_purchase_invoice_payment" on "public"."purchase_invoices";

drop trigger if exists "trigger_update_purchase_invoice_payment_status" on "public"."purchase_invoices";

drop trigger if exists "trigger_update_purchase_invoices_updated_at" on "public"."purchase_invoices";

drop trigger if exists "trigger_recalculate_quote_totals" on "public"."quote_items";

drop trigger if exists "trigger_update_quote_items_updated_at" on "public"."quote_items";

drop trigger if exists "trigger_calculate_quote_expiration_date" on "public"."quotes";

drop trigger if exists "trigger_log_quote_changes" on "public"."quotes";

drop trigger if exists "trigger_update_quotes_updated_at" on "public"."quotes";

drop trigger if exists "trigger_recalculate_received_payment_total" on "public"."received_payment_items";

drop trigger if exists "trigger_log_received_payment_changes" on "public"."received_payments";

drop trigger if exists "trigger_update_account_balance_on_payment" on "public"."received_payments";

drop trigger if exists "trigger_update_received_payments_updated_at" on "public"."received_payments";

drop trigger if exists "trigger_recalculate_recurring_invoice_totals" on "public"."recurring_invoice_items";

drop trigger if exists "trigger_update_recurring_invoice_items_updated_at" on "public"."recurring_invoice_items";

drop trigger if exists "trigger_update_next_generation_date" on "public"."recurring_invoices";

drop trigger if exists "trigger_update_recurring_invoices_updated_at" on "public"."recurring_invoices";

drop trigger if exists "trigger_recalculate_recurring_payment_totals" on "public"."recurring_payment_items";

drop trigger if exists "trigger_update_recurring_payment_items_updated_at" on "public"."recurring_payment_items";

drop trigger if exists "trigger_set_next_recurring_payment_date" on "public"."recurring_payments";

drop trigger if exists "trigger_update_recurring_payments_updated_at" on "public"."recurring_payments";

drop trigger if exists "trigger_validate_refund_items_total" on "public"."refund_items";

drop trigger if exists "trigger_update_refund_requests_updated_at" on "public"."refund_requests";

drop trigger if exists "trigger_validate_approved_amount" on "public"."refund_requests";

drop trigger if exists "trigger_update_report_schedules_updated_at" on "public"."report_schedules";

drop trigger if exists "trigger_update_reports_updated_at" on "public"."reports";

drop trigger if exists "trigger_roles_updated_at" on "public"."roles";

drop trigger if exists "trigger_update_taxes_updated_at" on "public"."taxes";

drop trigger if exists "sync_inventory_trigger" on "public"."warehouse_inventory";

drop policy "Users can access cash movements in their company" on "public"."cash_movements";

drop policy "Users can access categories in their company" on "public"."categories";

drop policy "Users can delete cost center assignments from their company" on "public"."cost_center_assignments";

drop policy "Users can insert cost center assignments for their company" on "public"."cost_center_assignments";

drop policy "Users can update cost center assignments from their company" on "public"."cost_center_assignments";

drop policy "Users can view cost center assignments from their company" on "public"."cost_center_assignments";

drop policy "Users can insert cost center history for their company" on "public"."cost_center_history";

drop policy "Users can view cost center history from their company" on "public"."cost_center_history";

drop policy "Users can delete cost centers from their company" on "public"."cost_centers";

drop policy "Users can insert cost centers for their company" on "public"."cost_centers";

drop policy "Users can update cost centers from their company" on "public"."cost_centers";

drop policy "Users can view cost centers from their company" on "public"."cost_centers";

drop policy "Users can delete customer contacts in their company" on "public"."customer_contacts";

drop policy "Users can insert customer contacts in their company" on "public"."customer_contacts";

drop policy "Users can update customer contacts in their company" on "public"."customer_contacts";

drop policy "Users can view customer contacts from their company" on "public"."customer_contacts";

drop policy "Users can insert customer history in their company" on "public"."customer_history";

drop policy "Users can view customer history from their company" on "public"."customer_history";

drop policy "Users can delete customers in their company" on "public"."customers";

drop policy "Users can insert customers in their company" on "public"."customers";

drop policy "Users can update customers in their company" on "public"."customers";

drop policy "Users can view customers from their company" on "public"."customers";

drop policy "Users can insert delivery note history for their company" on "public"."delivery_note_history";

drop policy "Users can view delivery note history from their company" on "public"."delivery_note_history";

drop policy "Users can delete delivery note items from their company" on "public"."delivery_note_items";

drop policy "Users can insert delivery note items for their company" on "public"."delivery_note_items";

drop policy "Users can update delivery note items from their company" on "public"."delivery_note_items";

drop policy "Users can view delivery note items from their company" on "public"."delivery_note_items";

drop policy "Users can insert delivery note sale conversions for their compa" on "public"."delivery_note_sale_conversions";

drop policy "Users can view delivery note sale conversions from their compan" on "public"."delivery_note_sale_conversions";

drop policy "Users can delete delivery notes from their company" on "public"."delivery_notes";

drop policy "Users can insert delivery notes for their company" on "public"."delivery_notes";

drop policy "Users can update delivery notes from their company" on "public"."delivery_notes";

drop policy "Users can view delivery notes from their company" on "public"."delivery_notes";

drop policy "Users can delete import jobs in their company" on "public"."import_jobs";

drop policy "Users can insert import jobs in their company" on "public"."import_jobs";

drop policy "Users can update import jobs in their company" on "public"."import_jobs";

drop policy "Users can view import jobs from their company" on "public"."import_jobs";

drop policy "Users can access inventory in their company" on "public"."inventory";

drop policy "Users can delete inventory of their company" on "public"."inventory";

drop policy "Users can insert inventory for their company" on "public"."inventory";

drop policy "Users can update inventory of their company" on "public"."inventory";

drop policy "Users can view inventory of their company" on "public"."inventory";

drop policy "Users can insert numeration history for their company" on "public"."numeration_history";

drop policy "Users can view numeration history from their company" on "public"."numeration_history";

drop policy "Users can delete numerations from their company" on "public"."numerations";

drop policy "Users can insert numerations for their company" on "public"."numerations";

drop policy "Users can update numerations from their company" on "public"."numerations";

drop policy "Users can view numerations from their company" on "public"."numerations";

drop policy "Users can delete payment gateways from their company" on "public"."payment_gateways";

drop policy "Users can insert payment gateways for their company" on "public"."payment_gateways";

drop policy "Users can update payment gateways from their company" on "public"."payment_gateways";

drop policy "Users can view payment gateways from their company" on "public"."payment_gateways";

drop policy "Users can insert payment history for their company" on "public"."payment_history";

drop policy "Users can view payment history from their company" on "public"."payment_history";

drop policy "Users can delete payment items from their company" on "public"."payment_items";

drop policy "Users can insert payment items for their company" on "public"."payment_items";

drop policy "Users can update payment items from their company" on "public"."payment_items";

drop policy "Users can view payment items from their company" on "public"."payment_items";

drop policy "Users can insert payment method history for their company" on "public"."payment_method_history";

drop policy "Users can view payment method history from their company" on "public"."payment_method_history";

drop policy "Users can delete payment methods from their company" on "public"."payment_methods";

drop policy "Users can insert payment methods for their company" on "public"."payment_methods";

drop policy "Users can update payment methods from their company" on "public"."payment_methods";

drop policy "Users can view payment methods from their company" on "public"."payment_methods";

drop policy "Users can insert payment transactions for their company" on "public"."payment_transactions";

drop policy "Users can update payment transactions from their company" on "public"."payment_transactions";

drop policy "Users can view payment transactions from their company" on "public"."payment_transactions";

drop policy "Users can delete payments from their company" on "public"."payments";

drop policy "Users can insert payments for their company" on "public"."payments";

drop policy "Users can update payments from their company" on "public"."payments";

drop policy "Users can view payments from their company" on "public"."payments";

drop policy "Only admins can modify permissions" on "public"."permissions";

drop policy "Users can delete their own POS configurations" on "public"."pos_configurations";

drop policy "Users can update their own POS configurations" on "public"."pos_configurations";

drop policy "Users can view their own POS configurations" on "public"."pos_configurations";

drop policy "Users can insert print template history in their company" on "public"."print_template_history";

drop policy "Users can view print template history in their company" on "public"."print_template_history";

drop policy "Users can delete print templates in their company" on "public"."print_templates";

drop policy "Users can insert print templates in their company" on "public"."print_templates";

drop policy "Users can update print templates in their company" on "public"."print_templates";

drop policy "Users can view print templates in their company" on "public"."print_templates";

drop policy "Users can create import history for their company" on "public"."product_import_history";

drop policy "Users can update import history for their company" on "public"."product_import_history";

drop policy "Users can view import history for their company" on "public"."product_import_history";

drop policy "Users can access products in their company" on "public"."products";

drop policy "Users can insert purchase debit note history for their company" on "public"."purchase_debit_note_history";

drop policy "Users can view purchase debit note history from their company" on "public"."purchase_debit_note_history";

drop policy "Users can delete purchase debit note items from their company" on "public"."purchase_debit_note_items";

drop policy "Users can insert purchase debit note items for their company" on "public"."purchase_debit_note_items";

drop policy "Users can update purchase debit note items from their company" on "public"."purchase_debit_note_items";

drop policy "Users can view purchase debit note items from their company" on "public"."purchase_debit_note_items";

drop policy "Users can delete purchase debit note settlements from their com" on "public"."purchase_debit_note_settlements";

drop policy "Users can insert purchase debit note settlements for their comp" on "public"."purchase_debit_note_settlements";

drop policy "Users can update purchase debit note settlements from their com" on "public"."purchase_debit_note_settlements";

drop policy "Users can view purchase debit note settlements from their compa" on "public"."purchase_debit_note_settlements";

drop policy "Users can delete purchase debit notes from their company" on "public"."purchase_debit_notes";

drop policy "Users can insert purchase debit notes for their company" on "public"."purchase_debit_notes";

drop policy "Users can update purchase debit notes from their company" on "public"."purchase_debit_notes";

drop policy "Users can view purchase debit notes from their company" on "public"."purchase_debit_notes";

drop policy "Users can insert purchase invoice history for their company" on "public"."purchase_invoice_history";

drop policy "Users can view purchase invoice history from their company" on "public"."purchase_invoice_history";

drop policy "Users can delete purchase invoice items from their company" on "public"."purchase_invoice_items";

drop policy "Users can insert purchase invoice items for their company" on "public"."purchase_invoice_items";

drop policy "Users can update purchase invoice items from their company" on "public"."purchase_invoice_items";

drop policy "Users can view purchase invoice items from their company" on "public"."purchase_invoice_items";

drop policy "Users can delete purchase invoice withholdings from their compa" on "public"."purchase_invoice_withholdings";

drop policy "Users can insert purchase invoice withholdings for their compan" on "public"."purchase_invoice_withholdings";

drop policy "Users can update purchase invoice withholdings from their compa" on "public"."purchase_invoice_withholdings";

drop policy "Users can view purchase invoice withholdings from their company" on "public"."purchase_invoice_withholdings";

drop policy "Users can delete purchase invoices from their company" on "public"."purchase_invoices";

drop policy "Users can insert purchase invoices for their company" on "public"."purchase_invoices";

drop policy "Users can update purchase invoices from their company" on "public"."purchase_invoices";

drop policy "Users can view purchase invoices from their company" on "public"."purchase_invoices";

drop policy "Users can access purchases in their company" on "public"."purchases";

drop policy "Users can insert quote history for their company" on "public"."quote_history";

drop policy "Users can view quote history from their company" on "public"."quote_history";

drop policy "Users can delete quote items from their company" on "public"."quote_items";

drop policy "Users can insert quote items for their company" on "public"."quote_items";

drop policy "Users can update quote items from their company" on "public"."quote_items";

drop policy "Users can view quote items from their company" on "public"."quote_items";

drop policy "Users can delete quotes from their company" on "public"."quotes";

drop policy "Users can insert quotes for their company" on "public"."quotes";

drop policy "Users can update quotes from their company" on "public"."quotes";

drop policy "Users can view quotes from their company" on "public"."quotes";

drop policy "Users can insert received payment history for their company" on "public"."received_payment_history";

drop policy "Users can view received payment history from their company" on "public"."received_payment_history";

drop policy "Users can delete received payment items from their company" on "public"."received_payment_items";

drop policy "Users can insert received payment items for their company" on "public"."received_payment_items";

drop policy "Users can update received payment items from their company" on "public"."received_payment_items";

drop policy "Users can view received payment items from their company" on "public"."received_payment_items";

drop policy "Users can delete received payments from their company" on "public"."received_payments";

drop policy "Users can insert received payments for their company" on "public"."received_payments";

drop policy "Users can update received payments from their company" on "public"."received_payments";

drop policy "Users can view received payments from their company" on "public"."received_payments";

drop policy "Users can insert recurring invoice generations for their compan" on "public"."recurring_invoice_generations";

drop policy "Users can update recurring invoice generations from their compa" on "public"."recurring_invoice_generations";

drop policy "Users can view recurring invoice generations from their company" on "public"."recurring_invoice_generations";

drop policy "Users can delete recurring invoice items from their company" on "public"."recurring_invoice_items";

drop policy "Users can insert recurring invoice items for their company" on "public"."recurring_invoice_items";

drop policy "Users can update recurring invoice items from their company" on "public"."recurring_invoice_items";

drop policy "Users can view recurring invoice items from their company" on "public"."recurring_invoice_items";

drop policy "Users can delete recurring invoices from their company" on "public"."recurring_invoices";

drop policy "Users can insert recurring invoices for their company" on "public"."recurring_invoices";

drop policy "Users can update recurring invoices from their company" on "public"."recurring_invoices";

drop policy "Users can view recurring invoices from their company" on "public"."recurring_invoices";

drop policy "Users can insert recurring payment generations for their compan" on "public"."recurring_payment_generations";

drop policy "Users can view recurring payment generations from their company" on "public"."recurring_payment_generations";

drop policy "Users can delete recurring payment items from their company" on "public"."recurring_payment_items";

drop policy "Users can insert recurring payment items for their company" on "public"."recurring_payment_items";

drop policy "Users can update recurring payment items from their company" on "public"."recurring_payment_items";

drop policy "Users can view recurring payment items from their company" on "public"."recurring_payment_items";

drop policy "Users can delete recurring payments from their company" on "public"."recurring_payments";

drop policy "Users can insert recurring payments for their company" on "public"."recurring_payments";

drop policy "Users can update recurring payments from their company" on "public"."recurring_payments";

drop policy "Users can view recurring payments from their company" on "public"."recurring_payments";

drop policy "Users can create refund items for their company" on "public"."refund_items";

drop policy "Users can delete refund items for their company" on "public"."refund_items";

drop policy "Users can update refund items for their company" on "public"."refund_items";

drop policy "Users can view refund items for their company" on "public"."refund_items";

drop policy "Users can create refund requests for their company" on "public"."refund_requests";

drop policy "Users can delete refund requests for their company" on "public"."refund_requests";

drop policy "Users can update refund requests for their company" on "public"."refund_requests";

drop policy "Users can view refund requests for their company" on "public"."refund_requests";

drop policy "Users can insert report history in their company" on "public"."report_history";

drop policy "Users can view report history from their company" on "public"."report_history";

drop policy "Users can delete report schedules in their company" on "public"."report_schedules";

drop policy "Users can insert report schedules in their company" on "public"."report_schedules";

drop policy "Users can update report schedules in their company" on "public"."report_schedules";

drop policy "Users can view report schedules from their company" on "public"."report_schedules";

drop policy "Users can delete reports in their company" on "public"."reports";

drop policy "Users can insert reports in their company" on "public"."reports";

drop policy "Users can update reports in their company" on "public"."reports";

drop policy "Users can view reports from their company" on "public"."reports";

drop policy "Admins can manage role permissions" on "public"."role_permissions";

drop policy "Users can view role permissions" on "public"."role_permissions";

drop policy "Admins can manage roles in their company" on "public"."roles";

drop policy "Users can view roles in their company" on "public"."roles";

drop policy "Users can access sales in their company" on "public"."sales";

drop policy "Users can access settings in their company" on "public"."settings";

drop policy "Users can access shifts in their company" on "public"."shifts";

drop policy "Users can access suppliers in their company" on "public"."suppliers";

drop policy "Users can insert tax history for their company" on "public"."tax_history";

drop policy "Users can view tax history from their company" on "public"."tax_history";

drop policy "Users can delete taxes from their company" on "public"."taxes";

drop policy "Users can insert taxes for their company" on "public"."taxes";

drop policy "Users can update taxes from their company" on "public"."taxes";

drop policy "Users can view taxes from their company" on "public"."taxes";

drop policy "Users can view audit logs in their company" on "public"."user_audit_log";

drop policy "Admins can manage user roles" on "public"."user_roles";

drop policy "Users can view user roles in their company" on "public"."user_roles";

drop policy "Users can delete warehouse inventory in their company" on "public"."warehouse_inventory";

drop policy "Users can delete warehouse_inventory in their company" on "public"."warehouse_inventory";

drop policy "Users can insert warehouse inventory in their company" on "public"."warehouse_inventory";

drop policy "Users can insert warehouse_inventory in their company" on "public"."warehouse_inventory";

drop policy "Users can update warehouse inventory in their company" on "public"."warehouse_inventory";

drop policy "Users can update warehouse_inventory in their company" on "public"."warehouse_inventory";

drop policy "Users can view warehouse inventory from their company" on "public"."warehouse_inventory";

drop policy "Users can view warehouse_inventory in their company" on "public"."warehouse_inventory";

drop policy "Users can delete warehouse_movements in their company" on "public"."warehouse_movements";

drop policy "Users can insert warehouse movements in their company" on "public"."warehouse_movements";

drop policy "Users can insert warehouse_movements in their company" on "public"."warehouse_movements";

drop policy "Users can update warehouse_movements in their company" on "public"."warehouse_movements";

drop policy "Users can view warehouse movements from their company" on "public"."warehouse_movements";

drop policy "Users can view warehouse_movements in their company" on "public"."warehouse_movements";

drop policy "Users can delete warehouse transfers in their company" on "public"."warehouse_transfers";

drop policy "Users can delete warehouse_transfers in their company" on "public"."warehouse_transfers";

drop policy "Users can insert warehouse transfers in their company" on "public"."warehouse_transfers";

drop policy "Users can insert warehouse_transfers in their company" on "public"."warehouse_transfers";

drop policy "Users can update warehouse transfers in their company" on "public"."warehouse_transfers";

drop policy "Users can update warehouse_transfers in their company" on "public"."warehouse_transfers";

drop policy "Users can view warehouse transfers from their company" on "public"."warehouse_transfers";

drop policy "Users can view warehouse_transfers in their company" on "public"."warehouse_transfers";

drop policy "Users can delete warehouses in their company" on "public"."warehouses";

drop policy "Users can insert warehouses in their company" on "public"."warehouses";

drop policy "Users can update warehouses in their company" on "public"."warehouses";

drop policy "Users can view warehouses from their company" on "public"."warehouses";

drop policy "Users can view warehouses in their company" on "public"."warehouses";

alter table "public"."account_reconciliations" drop constraint "account_reconciliations_account_id_fkey";

alter table "public"."account_reconciliations" drop constraint "account_reconciliations_company_id_fkey";

alter table "public"."account_reconciliations" drop constraint "account_reconciliations_created_by_fkey";

alter table "public"."account_reconciliations" drop constraint "account_reconciliations_updated_by_fkey";

alter table "public"."account_transactions" drop constraint "account_transactions_account_id_fkey";

alter table "public"."account_transactions" drop constraint "account_transactions_company_id_fkey";

alter table "public"."account_transactions" drop constraint "account_transactions_created_by_fkey";

alter table "public"."account_transactions" drop constraint "account_transactions_related_account_id_fkey";

alter table "public"."account_transactions" drop constraint "account_transactions_updated_by_fkey";

alter table "public"."accounts" drop constraint "accounts_company_id_fkey";

alter table "public"."accounts" drop constraint "accounts_created_by_fkey";

alter table "public"."accounts" drop constraint "accounts_updated_by_fkey";

alter table "public"."audit_log" drop constraint "audit_log_user_id_fkey";

alter table "public"."cash_movements" drop constraint "cash_movements_company_id_fkey";

alter table "public"."cash_movements" drop constraint "cash_movements_created_by_fkey";

alter table "public"."cash_movements" drop constraint "cash_movements_shift_id_fkey";

alter table "public"."categories" drop constraint "categories_company_id_fkey";

alter table "public"."companies" drop constraint "companies_created_by_fkey";

alter table "public"."companies" drop constraint "companies_updated_by_fkey";

alter table "public"."cost_center_assignments" drop constraint "cost_center_assignments_company_id_fkey";

alter table "public"."cost_center_assignments" drop constraint "cost_center_assignments_cost_center_id_fkey";

alter table "public"."cost_center_history" drop constraint "cost_center_history_company_id_fkey";

alter table "public"."cost_center_history" drop constraint "cost_center_history_cost_center_id_fkey";

alter table "public"."cost_centers" drop constraint "cost_centers_company_id_fkey";

alter table "public"."cost_centers" drop constraint "cost_centers_parent_id_fkey";

alter table "public"."customer_contacts" drop constraint "customer_contacts_company_id_fkey";

alter table "public"."customer_contacts" drop constraint "customer_contacts_created_by_fkey";

alter table "public"."customer_contacts" drop constraint "customer_contacts_customer_id_fkey";

alter table "public"."customer_history" drop constraint "customer_history_company_id_fkey";

alter table "public"."customer_history" drop constraint "customer_history_created_by_fkey";

alter table "public"."customer_history" drop constraint "customer_history_customer_id_fkey";

alter table "public"."customers" drop constraint "customers_company_id_fkey";

alter table "public"."customers" drop constraint "customers_created_by_fkey";

alter table "public"."customers" drop constraint "customers_updated_by_fkey";

alter table "public"."delivery_note_history" drop constraint "delivery_note_history_changed_by_fkey";

alter table "public"."delivery_note_history" drop constraint "delivery_note_history_company_id_fkey";

alter table "public"."delivery_note_history" drop constraint "delivery_note_history_delivery_note_id_fkey";

alter table "public"."delivery_note_items" drop constraint "delivery_note_items_delivery_note_id_fkey";

alter table "public"."delivery_note_items" drop constraint "delivery_note_items_product_id_fkey";

alter table "public"."delivery_note_items" drop constraint "delivery_note_items_tax_id_fkey";

alter table "public"."delivery_note_sale_conversions" drop constraint "delivery_note_sale_conversions_company_id_fkey";

alter table "public"."delivery_note_sale_conversions" drop constraint "delivery_note_sale_conversions_converted_by_fkey";

alter table "public"."delivery_note_sale_conversions" drop constraint "delivery_note_sale_conversions_delivery_note_id_fkey";

alter table "public"."delivery_note_sale_conversions" drop constraint "delivery_note_sale_conversions_sale_id_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_cancelled_by_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_company_id_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_converted_by_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_converted_to_sale_id_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_created_by_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_customer_id_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_numeration_id_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_salesperson_id_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_updated_by_fkey";

alter table "public"."delivery_notes" drop constraint "delivery_notes_warehouse_id_fkey";

alter table "public"."import_jobs" drop constraint "import_jobs_company_id_fkey";

alter table "public"."import_jobs" drop constraint "import_jobs_created_by_fkey";

alter table "public"."inventory" drop constraint "inventory_company_id_fkey";

alter table "public"."inventory" drop constraint "inventory_product_id_fkey";

alter table "public"."inventory" drop constraint "inventory_updated_by_fkey";

alter table "public"."inventory" drop constraint "inventory_warehouse_id_fkey";

alter table "public"."inventory_movements" drop constraint "inventory_movements_company_id_fkey";

alter table "public"."inventory_movements" drop constraint "inventory_movements_created_by_fkey";

alter table "public"."inventory_movements" drop constraint "inventory_movements_product_id_fkey";

alter table "public"."numeration_history" drop constraint "numeration_history_company_id_fkey";

alter table "public"."numeration_history" drop constraint "numeration_history_numeration_id_fkey";

alter table "public"."numerations" drop constraint "numerations_company_id_fkey";

alter table "public"."payment_gateways" drop constraint "payment_gateways_company_id_fkey";

alter table "public"."payment_history" drop constraint "payment_history_changed_by_fkey";

alter table "public"."payment_history" drop constraint "payment_history_company_id_fkey";

alter table "public"."payment_history" drop constraint "payment_history_payment_id_fkey";

alter table "public"."payment_items" drop constraint "payment_items_account_id_fkey";

alter table "public"."payment_items" drop constraint "payment_items_payment_id_fkey";

alter table "public"."payment_items" drop constraint "payment_items_purchase_invoice_id_fkey";

alter table "public"."payment_method_history" drop constraint "payment_method_history_company_id_fkey";

alter table "public"."payment_method_history" drop constraint "payment_method_history_payment_method_id_fkey";

alter table "public"."payment_methods" drop constraint "payment_methods_company_id_fkey";

alter table "public"."payment_transactions" drop constraint "payment_transactions_company_id_fkey";

alter table "public"."payment_transactions" drop constraint "payment_transactions_gateway_id_fkey";

alter table "public"."payment_transactions" drop constraint "payment_transactions_payment_method_id_fkey";

alter table "public"."payments" drop constraint "payments_account_id_fkey";

alter table "public"."payments" drop constraint "payments_cancelled_by_fkey";

alter table "public"."payments" drop constraint "payments_company_id_fkey";

alter table "public"."payments" drop constraint "payments_cost_center_id_fkey";

alter table "public"."payments" drop constraint "payments_created_by_fkey";

alter table "public"."payments" drop constraint "payments_numeration_id_fkey";

alter table "public"."payments" drop constraint "payments_payment_method_id_fkey";

alter table "public"."payments" drop constraint "payments_supplier_id_fkey";

alter table "public"."payments" drop constraint "payments_updated_by_fkey";

alter table "public"."pos_configurations" drop constraint "pos_configurations_company_id_fkey";

alter table "public"."pos_configurations" drop constraint "pos_configurations_default_account_id_fkey";

alter table "public"."pos_configurations" drop constraint "pos_configurations_default_customer_id_fkey";

alter table "public"."pos_configurations" drop constraint "pos_configurations_default_numeration_id_fkey";

alter table "public"."print_template_history" drop constraint "print_template_history_company_id_fkey";

alter table "public"."print_template_history" drop constraint "print_template_history_template_id_fkey";

alter table "public"."print_templates" drop constraint "print_templates_company_id_fkey";

alter table "public"."product_import_history" drop constraint "product_import_history_company_id_fkey";

alter table "public"."products" drop constraint "products_category_id_fkey";

alter table "public"."products" drop constraint "products_company_id_fkey";

alter table "public"."products" drop constraint "products_cost_center_id_fkey";

alter table "public"."products" drop constraint "products_supplier_id_fkey";

alter table "public"."products" drop constraint "products_tax_id_fkey";

alter table "public"."products" drop constraint "products_warehouse_id_fkey";

alter table "public"."profiles" drop constraint "profiles_company_id_fkey";

alter table "public"."purchase_debit_note_history" drop constraint "purchase_debit_note_history_changed_by_fkey";

alter table "public"."purchase_debit_note_history" drop constraint "purchase_debit_note_history_company_id_fkey";

alter table "public"."purchase_debit_note_history" drop constraint "purchase_debit_note_history_purchase_debit_note_id_fkey";

alter table "public"."purchase_debit_note_items" drop constraint "purchase_debit_note_items_account_id_fkey";

alter table "public"."purchase_debit_note_items" drop constraint "purchase_debit_note_items_product_id_fkey";

alter table "public"."purchase_debit_note_items" drop constraint "purchase_debit_note_items_purchase_debit_note_id_fkey";

alter table "public"."purchase_debit_note_settlements" drop constraint "purchase_debit_note_settlements_purchase_debit_note_id_fkey";

alter table "public"."purchase_debit_note_settlements" drop constraint "purchase_debit_note_settlements_purchase_id_fkey";

alter table "public"."purchase_debit_note_settlements" drop constraint "purchase_debit_note_settlements_refund_account_id_fkey";

alter table "public"."purchase_debit_notes" drop constraint "purchase_debit_notes_cancelled_by_fkey";

alter table "public"."purchase_debit_notes" drop constraint "purchase_debit_notes_company_id_fkey";

alter table "public"."purchase_debit_notes" drop constraint "purchase_debit_notes_created_by_fkey";

alter table "public"."purchase_debit_notes" drop constraint "purchase_debit_notes_numeration_id_fkey";

alter table "public"."purchase_debit_notes" drop constraint "purchase_debit_notes_supplier_id_fkey";

alter table "public"."purchase_debit_notes" drop constraint "purchase_debit_notes_updated_by_fkey";

alter table "public"."purchase_debit_notes" drop constraint "purchase_debit_notes_warehouse_id_fkey";

alter table "public"."purchase_invoice_history" drop constraint "purchase_invoice_history_changed_by_fkey";

alter table "public"."purchase_invoice_history" drop constraint "purchase_invoice_history_company_id_fkey";

alter table "public"."purchase_invoice_history" drop constraint "purchase_invoice_history_purchase_invoice_id_fkey";

alter table "public"."purchase_invoice_items" drop constraint "purchase_invoice_items_account_id_fkey";

alter table "public"."purchase_invoice_items" drop constraint "purchase_invoice_items_product_id_fkey";

alter table "public"."purchase_invoice_items" drop constraint "purchase_invoice_items_purchase_invoice_id_fkey";

alter table "public"."purchase_invoice_items" drop constraint "purchase_invoice_items_tax_id_fkey";

alter table "public"."purchase_invoice_withholdings" drop constraint "purchase_invoice_withholdings_purchase_invoice_id_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_cancelled_by_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_company_id_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_cost_center_id_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_created_by_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_numeration_id_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_supplier_id_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_updated_by_fkey";

alter table "public"."purchase_invoices" drop constraint "purchase_invoices_warehouse_id_fkey";

alter table "public"."purchase_items" drop constraint "purchase_items_product_id_fkey";

alter table "public"."purchase_items" drop constraint "purchase_items_purchase_id_fkey";

alter table "public"."purchases" drop constraint "purchases_company_id_fkey";

alter table "public"."purchases" drop constraint "purchases_created_by_fkey";

alter table "public"."purchases" drop constraint "purchases_supplier_id_fkey";

alter table "public"."quote_history" drop constraint "quote_history_changed_by_fkey";

alter table "public"."quote_history" drop constraint "quote_history_company_id_fkey";

alter table "public"."quote_history" drop constraint "quote_history_quote_id_fkey";

alter table "public"."quote_items" drop constraint "quote_items_product_id_fkey";

alter table "public"."quote_items" drop constraint "quote_items_quote_id_fkey";

alter table "public"."quote_items" drop constraint "quote_items_tax_id_fkey";

alter table "public"."quotes" drop constraint "quotes_company_id_fkey";

alter table "public"."quotes" drop constraint "quotes_converted_by_fkey";

alter table "public"."quotes" drop constraint "quotes_converted_to_sale_id_fkey";

alter table "public"."quotes" drop constraint "quotes_created_by_fkey";

alter table "public"."quotes" drop constraint "quotes_customer_id_fkey";

alter table "public"."quotes" drop constraint "quotes_numeration_id_fkey";

alter table "public"."quotes" drop constraint "quotes_salesperson_id_fkey";

alter table "public"."quotes" drop constraint "quotes_updated_by_fkey";

alter table "public"."quotes" drop constraint "quotes_warehouse_id_fkey";

alter table "public"."received_payment_history" drop constraint "received_payment_history_changed_by_fkey";

alter table "public"."received_payment_history" drop constraint "received_payment_history_company_id_fkey";

alter table "public"."received_payment_history" drop constraint "received_payment_history_received_payment_id_fkey";

alter table "public"."received_payment_items" drop constraint "received_payment_items_account_id_fkey";

alter table "public"."received_payment_items" drop constraint "received_payment_items_received_payment_id_fkey";

alter table "public"."received_payment_items" drop constraint "received_payment_items_sale_id_fkey";

alter table "public"."received_payments" drop constraint "received_payments_account_id_fkey";

alter table "public"."received_payments" drop constraint "received_payments_cancelled_by_fkey";

alter table "public"."received_payments" drop constraint "received_payments_company_id_fkey";

alter table "public"."received_payments" drop constraint "received_payments_cost_center_id_fkey";

alter table "public"."received_payments" drop constraint "received_payments_created_by_fkey";

alter table "public"."received_payments" drop constraint "received_payments_customer_id_fkey";

alter table "public"."received_payments" drop constraint "received_payments_numeration_id_fkey";

alter table "public"."received_payments" drop constraint "received_payments_payment_method_id_fkey";

alter table "public"."received_payments" drop constraint "received_payments_updated_by_fkey";

alter table "public"."recurring_invoice_generations" drop constraint "recurring_invoice_generations_company_id_fkey";

alter table "public"."recurring_invoice_generations" drop constraint "recurring_invoice_generations_generated_by_fkey";

alter table "public"."recurring_invoice_generations" drop constraint "recurring_invoice_generations_recurring_invoice_id_fkey";

alter table "public"."recurring_invoice_generations" drop constraint "recurring_invoice_generations_sale_id_fkey";

alter table "public"."recurring_invoice_items" drop constraint "recurring_invoice_items_product_id_fkey";

alter table "public"."recurring_invoice_items" drop constraint "recurring_invoice_items_recurring_invoice_id_fkey";

alter table "public"."recurring_invoice_items" drop constraint "recurring_invoice_items_tax_id_fkey";

alter table "public"."recurring_invoices" drop constraint "recurring_invoices_company_id_fkey";

alter table "public"."recurring_invoices" drop constraint "recurring_invoices_created_by_fkey";

alter table "public"."recurring_invoices" drop constraint "recurring_invoices_customer_id_fkey";

alter table "public"."recurring_invoices" drop constraint "recurring_invoices_numeration_id_fkey";

alter table "public"."recurring_invoices" drop constraint "recurring_invoices_updated_by_fkey";

alter table "public"."recurring_invoices" drop constraint "recurring_invoices_warehouse_id_fkey";

alter table "public"."recurring_payment_generations" drop constraint "recurring_payment_generations_company_id_fkey";

alter table "public"."recurring_payment_generations" drop constraint "recurring_payment_generations_generated_by_fkey";

alter table "public"."recurring_payment_generations" drop constraint "recurring_payment_generations_payment_id_fkey";

alter table "public"."recurring_payment_generations" drop constraint "recurring_payment_generations_recurring_payment_id_fkey";

alter table "public"."recurring_payment_items" drop constraint "recurring_payment_items_account_id_fkey";

alter table "public"."recurring_payment_items" drop constraint "recurring_payment_items_purchase_invoice_id_fkey";

alter table "public"."recurring_payment_items" drop constraint "recurring_payment_items_recurring_payment_id_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_account_id_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_company_id_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_cost_center_id_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_created_by_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_numeration_id_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_payment_method_id_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_supplier_id_fkey";

alter table "public"."recurring_payments" drop constraint "recurring_payments_updated_by_fkey";

alter table "public"."refund_items" drop constraint "refund_items_product_id_fkey";

alter table "public"."refund_items" drop constraint "refund_items_refund_request_id_fkey";

alter table "public"."refund_items" drop constraint "refund_items_sale_item_id_fkey";

alter table "public"."refund_requests" drop constraint "refund_requests_company_id_fkey";

alter table "public"."refund_requests" drop constraint "refund_requests_created_by_fkey";

alter table "public"."refund_requests" drop constraint "refund_requests_processed_by_fkey";

alter table "public"."refund_requests" drop constraint "refund_requests_sale_id_fkey";

alter table "public"."refund_requests" drop constraint "refund_requests_updated_by_fkey";

alter table "public"."report_history" drop constraint "report_history_company_id_fkey";

alter table "public"."report_history" drop constraint "report_history_generated_by_fkey";

alter table "public"."report_history" drop constraint "report_history_report_id_fkey";

alter table "public"."report_schedules" drop constraint "report_schedules_company_id_fkey";

alter table "public"."report_schedules" drop constraint "report_schedules_created_by_fkey";

alter table "public"."report_schedules" drop constraint "report_schedules_report_id_fkey";

alter table "public"."report_schedules" drop constraint "report_schedules_updated_by_fkey";

alter table "public"."reports" drop constraint "reports_account_id_fkey";

alter table "public"."reports" drop constraint "reports_cashier_id_fkey";

alter table "public"."reports" drop constraint "reports_category_id_fkey";

alter table "public"."reports" drop constraint "reports_company_id_fkey";

alter table "public"."reports" drop constraint "reports_created_by_fkey";

alter table "public"."reports" drop constraint "reports_customer_id_fkey";

alter table "public"."reports" drop constraint "reports_product_id_fkey";

alter table "public"."reports" drop constraint "reports_updated_by_fkey";

alter table "public"."reports" drop constraint "reports_warehouse_id_fkey";

alter table "public"."role_permissions" drop constraint "role_permissions_permission_id_fkey";

alter table "public"."role_permissions" drop constraint "role_permissions_role_id_fkey";

alter table "public"."roles" drop constraint "roles_company_id_fkey";

alter table "public"."sale_items" drop constraint "sale_items_product_id_fkey";

alter table "public"."sale_items" drop constraint "sale_items_sale_id_fkey";

alter table "public"."sales" drop constraint "sales_account_id_fkey";

alter table "public"."sales" drop constraint "sales_cashier_id_fkey";

alter table "public"."sales" drop constraint "sales_company_id_fkey";

alter table "public"."sales" drop constraint "sales_customer_id_fkey";

alter table "public"."sales" drop constraint "sales_numeration_id_fkey";

alter table "public"."sales" drop constraint "sales_shift_id_fkey";

alter table "public"."settings" drop constraint "settings_company_id_fkey";

alter table "public"."settings" drop constraint "settings_updated_by_fkey";

alter table "public"."shifts" drop constraint "shifts_cashier_id_fkey";

alter table "public"."shifts" drop constraint "shifts_company_id_fkey";

alter table "public"."shifts" drop constraint "shifts_source_account_id_fkey";

alter table "public"."suppliers" drop constraint "suppliers_company_id_fkey";

alter table "public"."tax_history" drop constraint "tax_history_company_id_fkey";

alter table "public"."tax_history" drop constraint "tax_history_tax_id_fkey";

alter table "public"."taxes" drop constraint "taxes_company_id_fkey";

alter table "public"."user_audit_log" drop constraint "user_audit_log_user_id_fkey";

alter table "public"."user_roles" drop constraint "user_roles_role_id_fkey";

alter table "public"."user_roles" drop constraint "user_roles_user_id_fkey";

alter table "public"."user_sessions" drop constraint "user_sessions_user_id_fkey";

alter table "public"."warehouse_inventory" drop constraint "warehouse_inventory_company_id_fkey";

alter table "public"."warehouse_inventory" drop constraint "warehouse_inventory_product_id_fkey";

alter table "public"."warehouse_inventory" drop constraint "warehouse_inventory_warehouse_id_fkey";

alter table "public"."warehouse_movements" drop constraint "warehouse_movements_company_id_fkey";

alter table "public"."warehouse_movements" drop constraint "warehouse_movements_product_id_fkey";

alter table "public"."warehouse_movements" drop constraint "warehouse_movements_transfer_id_fkey";

alter table "public"."warehouse_movements" drop constraint "warehouse_movements_warehouse_id_fkey";

alter table "public"."warehouse_transfers" drop constraint "warehouse_transfers_company_id_fkey";

alter table "public"."warehouse_transfers" drop constraint "warehouse_transfers_from_warehouse_id_fkey";

alter table "public"."warehouse_transfers" drop constraint "warehouse_transfers_product_id_fkey";

alter table "public"."warehouse_transfers" drop constraint "warehouse_transfers_to_warehouse_id_fkey";

alter table "public"."warehouses" drop constraint "warehouses_company_id_fkey";

alter table "public"."print_templates" alter column "document_type" set data type public.document_type using "document_type"::text::public.document_type;

alter table "public"."print_templates" alter column "font_size_preset" set default 'NORMAL'::public.font_size;

alter table "public"."print_templates" alter column "font_size_preset" set data type public.font_size using "font_size_preset"::text::public.font_size;

alter table "public"."print_templates" alter column "font_type" set default 'HELVETICA'::public.font_type;

alter table "public"."print_templates" alter column "font_type" set data type public.font_type using "font_type"::text::public.font_type;

alter table "public"."print_templates" alter column "page_orientation" set default 'PORTRAIT'::public.page_orientation;

alter table "public"."print_templates" alter column "page_orientation" set data type public.page_orientation using "page_orientation"::text::public.page_orientation;

alter table "public"."print_templates" alter column "paper_size" set default 'A4'::public.paper_size;

alter table "public"."print_templates" alter column "paper_size" set data type public.paper_size using "paper_size"::text::public.paper_size;

alter table "public"."print_templates" alter column "template_style" set default 'CLASSIC'::public.template_style;

alter table "public"."print_templates" alter column "template_style" set data type public.template_style using "template_style"::text::public.template_style;

alter table "public"."profiles" alter column "status" set default 'ACTIVE'::public.user_status;

alter table "public"."profiles" alter column "status" set data type public.user_status using "status"::text::public.user_status;

alter table "public"."account_reconciliations" add constraint "account_reconciliations_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."account_reconciliations" validate constraint "account_reconciliations_account_id_fkey";

alter table "public"."account_reconciliations" add constraint "account_reconciliations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."account_reconciliations" validate constraint "account_reconciliations_company_id_fkey";

alter table "public"."account_reconciliations" add constraint "account_reconciliations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."account_reconciliations" validate constraint "account_reconciliations_created_by_fkey";

alter table "public"."account_reconciliations" add constraint "account_reconciliations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."account_reconciliations" validate constraint "account_reconciliations_updated_by_fkey";

alter table "public"."account_transactions" add constraint "account_transactions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."account_transactions" validate constraint "account_transactions_account_id_fkey";

alter table "public"."account_transactions" add constraint "account_transactions_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."account_transactions" validate constraint "account_transactions_company_id_fkey";

alter table "public"."account_transactions" add constraint "account_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."account_transactions" validate constraint "account_transactions_created_by_fkey";

alter table "public"."account_transactions" add constraint "account_transactions_related_account_id_fkey" FOREIGN KEY (related_account_id) REFERENCES public.accounts(id) not valid;

alter table "public"."account_transactions" validate constraint "account_transactions_related_account_id_fkey";

alter table "public"."account_transactions" add constraint "account_transactions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."account_transactions" validate constraint "account_transactions_updated_by_fkey";

alter table "public"."accounts" add constraint "accounts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."accounts" validate constraint "accounts_company_id_fkey";

alter table "public"."accounts" add constraint "accounts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."accounts" validate constraint "accounts_created_by_fkey";

alter table "public"."accounts" add constraint "accounts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."accounts" validate constraint "accounts_updated_by_fkey";

alter table "public"."audit_log" add constraint "audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."audit_log" validate constraint "audit_log_user_id_fkey";

alter table "public"."cash_movements" add constraint "cash_movements_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."cash_movements" validate constraint "cash_movements_company_id_fkey";

alter table "public"."cash_movements" add constraint "cash_movements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."cash_movements" validate constraint "cash_movements_created_by_fkey";

alter table "public"."cash_movements" add constraint "cash_movements_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE not valid;

alter table "public"."cash_movements" validate constraint "cash_movements_shift_id_fkey";

alter table "public"."categories" add constraint "categories_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."categories" validate constraint "categories_company_id_fkey";

alter table "public"."companies" add constraint "companies_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."companies" validate constraint "companies_created_by_fkey";

alter table "public"."companies" add constraint "companies_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."companies" validate constraint "companies_updated_by_fkey";

alter table "public"."cost_center_assignments" add constraint "cost_center_assignments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."cost_center_assignments" validate constraint "cost_center_assignments_company_id_fkey";

alter table "public"."cost_center_assignments" add constraint "cost_center_assignments_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE CASCADE not valid;

alter table "public"."cost_center_assignments" validate constraint "cost_center_assignments_cost_center_id_fkey";

alter table "public"."cost_center_history" add constraint "cost_center_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."cost_center_history" validate constraint "cost_center_history_company_id_fkey";

alter table "public"."cost_center_history" add constraint "cost_center_history_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE CASCADE not valid;

alter table "public"."cost_center_history" validate constraint "cost_center_history_cost_center_id_fkey";

alter table "public"."cost_centers" add constraint "cost_centers_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."cost_centers" validate constraint "cost_centers_company_id_fkey";

alter table "public"."cost_centers" add constraint "cost_centers_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL not valid;

alter table "public"."cost_centers" validate constraint "cost_centers_parent_id_fkey";

alter table "public"."customer_contacts" add constraint "customer_contacts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."customer_contacts" validate constraint "customer_contacts_company_id_fkey";

alter table "public"."customer_contacts" add constraint "customer_contacts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."customer_contacts" validate constraint "customer_contacts_created_by_fkey";

alter table "public"."customer_contacts" add constraint "customer_contacts_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."customer_contacts" validate constraint "customer_contacts_customer_id_fkey";

alter table "public"."customer_history" add constraint "customer_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."customer_history" validate constraint "customer_history_company_id_fkey";

alter table "public"."customer_history" add constraint "customer_history_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."customer_history" validate constraint "customer_history_created_by_fkey";

alter table "public"."customer_history" add constraint "customer_history_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."customer_history" validate constraint "customer_history_customer_id_fkey";

alter table "public"."customers" add constraint "customers_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."customers" validate constraint "customers_company_id_fkey";

alter table "public"."customers" add constraint "customers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."customers" validate constraint "customers_created_by_fkey";

alter table "public"."customers" add constraint "customers_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."customers" validate constraint "customers_updated_by_fkey";

alter table "public"."delivery_note_history" add constraint "delivery_note_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."delivery_note_history" validate constraint "delivery_note_history_changed_by_fkey";

alter table "public"."delivery_note_history" add constraint "delivery_note_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_note_history" validate constraint "delivery_note_history_company_id_fkey";

alter table "public"."delivery_note_history" add constraint "delivery_note_history_delivery_note_id_fkey" FOREIGN KEY (delivery_note_id) REFERENCES public.delivery_notes(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_note_history" validate constraint "delivery_note_history_delivery_note_id_fkey";

alter table "public"."delivery_note_items" add constraint "delivery_note_items_delivery_note_id_fkey" FOREIGN KEY (delivery_note_id) REFERENCES public.delivery_notes(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_note_items" validate constraint "delivery_note_items_delivery_note_id_fkey";

alter table "public"."delivery_note_items" add constraint "delivery_note_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL not valid;

alter table "public"."delivery_note_items" validate constraint "delivery_note_items_product_id_fkey";

alter table "public"."delivery_note_items" add constraint "delivery_note_items_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON DELETE SET NULL not valid;

alter table "public"."delivery_note_items" validate constraint "delivery_note_items_tax_id_fkey";

alter table "public"."delivery_note_sale_conversions" add constraint "delivery_note_sale_conversions_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_note_sale_conversions" validate constraint "delivery_note_sale_conversions_company_id_fkey";

alter table "public"."delivery_note_sale_conversions" add constraint "delivery_note_sale_conversions_converted_by_fkey" FOREIGN KEY (converted_by) REFERENCES public.profiles(id) not valid;

alter table "public"."delivery_note_sale_conversions" validate constraint "delivery_note_sale_conversions_converted_by_fkey";

alter table "public"."delivery_note_sale_conversions" add constraint "delivery_note_sale_conversions_delivery_note_id_fkey" FOREIGN KEY (delivery_note_id) REFERENCES public.delivery_notes(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_note_sale_conversions" validate constraint "delivery_note_sale_conversions_delivery_note_id_fkey";

alter table "public"."delivery_note_sale_conversions" add constraint "delivery_note_sale_conversions_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_note_sale_conversions" validate constraint "delivery_note_sale_conversions_sale_id_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_cancelled_by_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_company_id_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_converted_by_fkey" FOREIGN KEY (converted_by) REFERENCES public.profiles(id) not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_converted_by_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_converted_to_sale_id_fkey" FOREIGN KEY (converted_to_sale_id) REFERENCES public.sales(id) ON DELETE SET NULL not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_converted_to_sale_id_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_created_by_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_customer_id_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_numeration_id_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_salesperson_id_fkey" FOREIGN KEY (salesperson_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_salesperson_id_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_updated_by_fkey";

alter table "public"."delivery_notes" add constraint "delivery_notes_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL not valid;

alter table "public"."delivery_notes" validate constraint "delivery_notes_warehouse_id_fkey";

alter table "public"."import_jobs" add constraint "import_jobs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."import_jobs" validate constraint "import_jobs_company_id_fkey";

alter table "public"."import_jobs" add constraint "import_jobs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."import_jobs" validate constraint "import_jobs_created_by_fkey";

alter table "public"."inventory" add constraint "inventory_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."inventory" validate constraint "inventory_company_id_fkey";

alter table "public"."inventory" add constraint "inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."inventory" validate constraint "inventory_product_id_fkey";

alter table "public"."inventory" add constraint "inventory_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."inventory" validate constraint "inventory_updated_by_fkey";

alter table "public"."inventory" add constraint "inventory_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL not valid;

alter table "public"."inventory" validate constraint "inventory_warehouse_id_fkey";

alter table "public"."inventory_movements" add constraint "inventory_movements_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."inventory_movements" validate constraint "inventory_movements_company_id_fkey";

alter table "public"."inventory_movements" add constraint "inventory_movements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."inventory_movements" validate constraint "inventory_movements_created_by_fkey";

alter table "public"."inventory_movements" add constraint "inventory_movements_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."inventory_movements" validate constraint "inventory_movements_product_id_fkey";

alter table "public"."numeration_history" add constraint "numeration_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."numeration_history" validate constraint "numeration_history_company_id_fkey";

alter table "public"."numeration_history" add constraint "numeration_history_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE CASCADE not valid;

alter table "public"."numeration_history" validate constraint "numeration_history_numeration_id_fkey";

alter table "public"."numerations" add constraint "numerations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."numerations" validate constraint "numerations_company_id_fkey";

alter table "public"."payment_gateways" add constraint "payment_gateways_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."payment_gateways" validate constraint "payment_gateways_company_id_fkey";

alter table "public"."payment_history" add constraint "payment_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."payment_history" validate constraint "payment_history_changed_by_fkey";

alter table "public"."payment_history" add constraint "payment_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."payment_history" validate constraint "payment_history_company_id_fkey";

alter table "public"."payment_history" add constraint "payment_history_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE not valid;

alter table "public"."payment_history" validate constraint "payment_history_payment_id_fkey";

alter table "public"."payment_items" add constraint "payment_items_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."payment_items" validate constraint "payment_items_account_id_fkey";

alter table "public"."payment_items" add constraint "payment_items_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE not valid;

alter table "public"."payment_items" validate constraint "payment_items_payment_id_fkey";

alter table "public"."payment_items" add constraint "payment_items_purchase_invoice_id_fkey" FOREIGN KEY (purchase_invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE SET NULL not valid;

alter table "public"."payment_items" validate constraint "payment_items_purchase_invoice_id_fkey";

alter table "public"."payment_method_history" add constraint "payment_method_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."payment_method_history" validate constraint "payment_method_history_company_id_fkey";

alter table "public"."payment_method_history" add constraint "payment_method_history_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE CASCADE not valid;

alter table "public"."payment_method_history" validate constraint "payment_method_history_payment_method_id_fkey";

alter table "public"."payment_methods" add constraint "payment_methods_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."payment_methods" validate constraint "payment_methods_company_id_fkey";

alter table "public"."payment_transactions" add constraint "payment_transactions_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."payment_transactions" validate constraint "payment_transactions_company_id_fkey";

alter table "public"."payment_transactions" add constraint "payment_transactions_gateway_id_fkey" FOREIGN KEY (gateway_id) REFERENCES public.payment_gateways(id) not valid;

alter table "public"."payment_transactions" validate constraint "payment_transactions_gateway_id_fkey";

alter table "public"."payment_transactions" add constraint "payment_transactions_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) not valid;

alter table "public"."payment_transactions" validate constraint "payment_transactions_payment_method_id_fkey";

alter table "public"."payments" add constraint "payments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT not valid;

alter table "public"."payments" validate constraint "payments_account_id_fkey";

alter table "public"."payments" add constraint "payments_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) not valid;

alter table "public"."payments" validate constraint "payments_cancelled_by_fkey";

alter table "public"."payments" add constraint "payments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_company_id_fkey";

alter table "public"."payments" add constraint "payments_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_cost_center_id_fkey";

alter table "public"."payments" add constraint "payments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."payments" validate constraint "payments_created_by_fkey";

alter table "public"."payments" add constraint "payments_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_numeration_id_fkey";

alter table "public"."payments" add constraint "payments_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_payment_method_id_fkey";

alter table "public"."payments" add constraint "payments_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_supplier_id_fkey";

alter table "public"."payments" add constraint "payments_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."payments" validate constraint "payments_updated_by_fkey";

alter table "public"."pos_configurations" add constraint "pos_configurations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."pos_configurations" validate constraint "pos_configurations_company_id_fkey";

alter table "public"."pos_configurations" add constraint "pos_configurations_default_account_id_fkey" FOREIGN KEY (default_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."pos_configurations" validate constraint "pos_configurations_default_account_id_fkey";

alter table "public"."pos_configurations" add constraint "pos_configurations_default_customer_id_fkey" FOREIGN KEY (default_customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."pos_configurations" validate constraint "pos_configurations_default_customer_id_fkey";

alter table "public"."pos_configurations" add constraint "pos_configurations_default_numeration_id_fkey" FOREIGN KEY (default_numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."pos_configurations" validate constraint "pos_configurations_default_numeration_id_fkey";

alter table "public"."print_template_history" add constraint "print_template_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."print_template_history" validate constraint "print_template_history_company_id_fkey";

alter table "public"."print_template_history" add constraint "print_template_history_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.print_templates(id) ON DELETE CASCADE not valid;

alter table "public"."print_template_history" validate constraint "print_template_history_template_id_fkey";

alter table "public"."print_templates" add constraint "print_templates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."print_templates" validate constraint "print_templates_company_id_fkey";

alter table "public"."product_import_history" add constraint "product_import_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."product_import_history" validate constraint "product_import_history_company_id_fkey";

alter table "public"."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) not valid;

alter table "public"."products" validate constraint "products_category_id_fkey";

alter table "public"."products" add constraint "products_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."products" validate constraint "products_company_id_fkey";

alter table "public"."products" add constraint "products_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) not valid;

alter table "public"."products" validate constraint "products_cost_center_id_fkey";

alter table "public"."products" add constraint "products_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) not valid;

alter table "public"."products" validate constraint "products_supplier_id_fkey";

alter table "public"."products" add constraint "products_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) not valid;

alter table "public"."products" validate constraint "products_tax_id_fkey";

alter table "public"."products" add constraint "products_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."products" validate constraint "products_warehouse_id_fkey";

alter table "public"."profiles" add constraint "profiles_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."profiles" validate constraint "profiles_company_id_fkey";

alter table "public"."purchase_debit_note_history" add constraint "purchase_debit_note_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_debit_note_history" validate constraint "purchase_debit_note_history_changed_by_fkey";

alter table "public"."purchase_debit_note_history" add constraint "purchase_debit_note_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_debit_note_history" validate constraint "purchase_debit_note_history_company_id_fkey";

alter table "public"."purchase_debit_note_history" add constraint "purchase_debit_note_history_purchase_debit_note_id_fkey" FOREIGN KEY (purchase_debit_note_id) REFERENCES public.purchase_debit_notes(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_debit_note_history" validate constraint "purchase_debit_note_history_purchase_debit_note_id_fkey";

alter table "public"."purchase_debit_note_items" add constraint "purchase_debit_note_items_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_debit_note_items" validate constraint "purchase_debit_note_items_account_id_fkey";

alter table "public"."purchase_debit_note_items" add constraint "purchase_debit_note_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_debit_note_items" validate constraint "purchase_debit_note_items_product_id_fkey";

alter table "public"."purchase_debit_note_items" add constraint "purchase_debit_note_items_purchase_debit_note_id_fkey" FOREIGN KEY (purchase_debit_note_id) REFERENCES public.purchase_debit_notes(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_debit_note_items" validate constraint "purchase_debit_note_items_purchase_debit_note_id_fkey";

alter table "public"."purchase_debit_note_settlements" add constraint "purchase_debit_note_settlements_purchase_debit_note_id_fkey" FOREIGN KEY (purchase_debit_note_id) REFERENCES public.purchase_debit_notes(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_debit_note_settlements" validate constraint "purchase_debit_note_settlements_purchase_debit_note_id_fkey";

alter table "public"."purchase_debit_note_settlements" add constraint "purchase_debit_note_settlements_purchase_id_fkey" FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_debit_note_settlements" validate constraint "purchase_debit_note_settlements_purchase_id_fkey";

alter table "public"."purchase_debit_note_settlements" add constraint "purchase_debit_note_settlements_refund_account_id_fkey" FOREIGN KEY (refund_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_debit_note_settlements" validate constraint "purchase_debit_note_settlements_refund_account_id_fkey";

alter table "public"."purchase_debit_notes" add constraint "purchase_debit_notes_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_debit_notes" validate constraint "purchase_debit_notes_cancelled_by_fkey";

alter table "public"."purchase_debit_notes" add constraint "purchase_debit_notes_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_debit_notes" validate constraint "purchase_debit_notes_company_id_fkey";

alter table "public"."purchase_debit_notes" add constraint "purchase_debit_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_debit_notes" validate constraint "purchase_debit_notes_created_by_fkey";

alter table "public"."purchase_debit_notes" add constraint "purchase_debit_notes_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_debit_notes" validate constraint "purchase_debit_notes_numeration_id_fkey";

alter table "public"."purchase_debit_notes" add constraint "purchase_debit_notes_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_debit_notes" validate constraint "purchase_debit_notes_supplier_id_fkey";

alter table "public"."purchase_debit_notes" add constraint "purchase_debit_notes_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_debit_notes" validate constraint "purchase_debit_notes_updated_by_fkey";

alter table "public"."purchase_debit_notes" add constraint "purchase_debit_notes_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_debit_notes" validate constraint "purchase_debit_notes_warehouse_id_fkey";

alter table "public"."purchase_invoice_history" add constraint "purchase_invoice_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_invoice_history" validate constraint "purchase_invoice_history_changed_by_fkey";

alter table "public"."purchase_invoice_history" add constraint "purchase_invoice_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_invoice_history" validate constraint "purchase_invoice_history_company_id_fkey";

alter table "public"."purchase_invoice_history" add constraint "purchase_invoice_history_purchase_invoice_id_fkey" FOREIGN KEY (purchase_invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_invoice_history" validate constraint "purchase_invoice_history_purchase_invoice_id_fkey";

alter table "public"."purchase_invoice_items" add constraint "purchase_invoice_items_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_invoice_items" validate constraint "purchase_invoice_items_account_id_fkey";

alter table "public"."purchase_invoice_items" add constraint "purchase_invoice_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_invoice_items" validate constraint "purchase_invoice_items_product_id_fkey";

alter table "public"."purchase_invoice_items" add constraint "purchase_invoice_items_purchase_invoice_id_fkey" FOREIGN KEY (purchase_invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_invoice_items" validate constraint "purchase_invoice_items_purchase_invoice_id_fkey";

alter table "public"."purchase_invoice_items" add constraint "purchase_invoice_items_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_invoice_items" validate constraint "purchase_invoice_items_tax_id_fkey";

alter table "public"."purchase_invoice_withholdings" add constraint "purchase_invoice_withholdings_purchase_invoice_id_fkey" FOREIGN KEY (purchase_invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_invoice_withholdings" validate constraint "purchase_invoice_withholdings_purchase_invoice_id_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_cancelled_by_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_company_id_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_cost_center_id_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_created_by_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_numeration_id_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_supplier_id_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_updated_by_fkey";

alter table "public"."purchase_invoices" add constraint "purchase_invoices_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_invoices" validate constraint "purchase_invoices_warehouse_id_fkey";

alter table "public"."purchase_items" add constraint "purchase_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."purchase_items" validate constraint "purchase_items_product_id_fkey";

alter table "public"."purchase_items" add constraint "purchase_items_purchase_id_fkey" FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) not valid;

alter table "public"."purchase_items" validate constraint "purchase_items_purchase_id_fkey";

alter table "public"."purchases" add constraint "purchases_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."purchases" validate constraint "purchases_company_id_fkey";

alter table "public"."purchases" add constraint "purchases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."purchases" validate constraint "purchases_created_by_fkey";

alter table "public"."purchases" add constraint "purchases_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) not valid;

alter table "public"."purchases" validate constraint "purchases_supplier_id_fkey";

alter table "public"."quote_history" add constraint "quote_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."quote_history" validate constraint "quote_history_changed_by_fkey";

alter table "public"."quote_history" add constraint "quote_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."quote_history" validate constraint "quote_history_company_id_fkey";

alter table "public"."quote_history" add constraint "quote_history_quote_id_fkey" FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE not valid;

alter table "public"."quote_history" validate constraint "quote_history_quote_id_fkey";

alter table "public"."quote_items" add constraint "quote_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL not valid;

alter table "public"."quote_items" validate constraint "quote_items_product_id_fkey";

alter table "public"."quote_items" add constraint "quote_items_quote_id_fkey" FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE not valid;

alter table "public"."quote_items" validate constraint "quote_items_quote_id_fkey";

alter table "public"."quote_items" add constraint "quote_items_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON DELETE SET NULL not valid;

alter table "public"."quote_items" validate constraint "quote_items_tax_id_fkey";

alter table "public"."quotes" add constraint "quotes_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."quotes" validate constraint "quotes_company_id_fkey";

alter table "public"."quotes" add constraint "quotes_converted_by_fkey" FOREIGN KEY (converted_by) REFERENCES public.profiles(id) not valid;

alter table "public"."quotes" validate constraint "quotes_converted_by_fkey";

alter table "public"."quotes" add constraint "quotes_converted_to_sale_id_fkey" FOREIGN KEY (converted_to_sale_id) REFERENCES public.sales(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_converted_to_sale_id_fkey";

alter table "public"."quotes" add constraint "quotes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."quotes" validate constraint "quotes_created_by_fkey";

alter table "public"."quotes" add constraint "quotes_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."quotes" validate constraint "quotes_customer_id_fkey";

alter table "public"."quotes" add constraint "quotes_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_numeration_id_fkey";

alter table "public"."quotes" add constraint "quotes_salesperson_id_fkey" FOREIGN KEY (salesperson_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_salesperson_id_fkey";

alter table "public"."quotes" add constraint "quotes_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."quotes" validate constraint "quotes_updated_by_fkey";

alter table "public"."quotes" add constraint "quotes_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_warehouse_id_fkey";

alter table "public"."received_payment_history" add constraint "received_payment_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."received_payment_history" validate constraint "received_payment_history_changed_by_fkey";

alter table "public"."received_payment_history" add constraint "received_payment_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."received_payment_history" validate constraint "received_payment_history_company_id_fkey";

alter table "public"."received_payment_history" add constraint "received_payment_history_received_payment_id_fkey" FOREIGN KEY (received_payment_id) REFERENCES public.received_payments(id) ON DELETE CASCADE not valid;

alter table "public"."received_payment_history" validate constraint "received_payment_history_received_payment_id_fkey";

alter table "public"."received_payment_items" add constraint "received_payment_items_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."received_payment_items" validate constraint "received_payment_items_account_id_fkey";

alter table "public"."received_payment_items" add constraint "received_payment_items_received_payment_id_fkey" FOREIGN KEY (received_payment_id) REFERENCES public.received_payments(id) ON DELETE CASCADE not valid;

alter table "public"."received_payment_items" validate constraint "received_payment_items_received_payment_id_fkey";

alter table "public"."received_payment_items" add constraint "received_payment_items_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL not valid;

alter table "public"."received_payment_items" validate constraint "received_payment_items_sale_id_fkey";

alter table "public"."received_payments" add constraint "received_payments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT not valid;

alter table "public"."received_payments" validate constraint "received_payments_account_id_fkey";

alter table "public"."received_payments" add constraint "received_payments_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) not valid;

alter table "public"."received_payments" validate constraint "received_payments_cancelled_by_fkey";

alter table "public"."received_payments" add constraint "received_payments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."received_payments" validate constraint "received_payments_company_id_fkey";

alter table "public"."received_payments" add constraint "received_payments_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL not valid;

alter table "public"."received_payments" validate constraint "received_payments_cost_center_id_fkey";

alter table "public"."received_payments" add constraint "received_payments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."received_payments" validate constraint "received_payments_created_by_fkey";

alter table "public"."received_payments" add constraint "received_payments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."received_payments" validate constraint "received_payments_customer_id_fkey";

alter table "public"."received_payments" add constraint "received_payments_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."received_payments" validate constraint "received_payments_numeration_id_fkey";

alter table "public"."received_payments" add constraint "received_payments_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL not valid;

alter table "public"."received_payments" validate constraint "received_payments_payment_method_id_fkey";

alter table "public"."received_payments" add constraint "received_payments_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."received_payments" validate constraint "received_payments_updated_by_fkey";

alter table "public"."recurring_invoice_generations" add constraint "recurring_invoice_generations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_invoice_generations" validate constraint "recurring_invoice_generations_company_id_fkey";

alter table "public"."recurring_invoice_generations" add constraint "recurring_invoice_generations_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."recurring_invoice_generations" validate constraint "recurring_invoice_generations_generated_by_fkey";

alter table "public"."recurring_invoice_generations" add constraint "recurring_invoice_generations_recurring_invoice_id_fkey" FOREIGN KEY (recurring_invoice_id) REFERENCES public.recurring_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_invoice_generations" validate constraint "recurring_invoice_generations_recurring_invoice_id_fkey";

alter table "public"."recurring_invoice_generations" add constraint "recurring_invoice_generations_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_invoice_generations" validate constraint "recurring_invoice_generations_sale_id_fkey";

alter table "public"."recurring_invoice_items" add constraint "recurring_invoice_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_invoice_items" validate constraint "recurring_invoice_items_product_id_fkey";

alter table "public"."recurring_invoice_items" add constraint "recurring_invoice_items_recurring_invoice_id_fkey" FOREIGN KEY (recurring_invoice_id) REFERENCES public.recurring_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_invoice_items" validate constraint "recurring_invoice_items_recurring_invoice_id_fkey";

alter table "public"."recurring_invoice_items" add constraint "recurring_invoice_items_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_invoice_items" validate constraint "recurring_invoice_items_tax_id_fkey";

alter table "public"."recurring_invoices" add constraint "recurring_invoices_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_invoices" validate constraint "recurring_invoices_company_id_fkey";

alter table "public"."recurring_invoices" add constraint "recurring_invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."recurring_invoices" validate constraint "recurring_invoices_created_by_fkey";

alter table "public"."recurring_invoices" add constraint "recurring_invoices_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_invoices" validate constraint "recurring_invoices_customer_id_fkey";

alter table "public"."recurring_invoices" add constraint "recurring_invoices_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_invoices" validate constraint "recurring_invoices_numeration_id_fkey";

alter table "public"."recurring_invoices" add constraint "recurring_invoices_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."recurring_invoices" validate constraint "recurring_invoices_updated_by_fkey";

alter table "public"."recurring_invoices" add constraint "recurring_invoices_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_invoices" validate constraint "recurring_invoices_warehouse_id_fkey";

alter table "public"."recurring_payment_generations" add constraint "recurring_payment_generations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_payment_generations" validate constraint "recurring_payment_generations_company_id_fkey";

alter table "public"."recurring_payment_generations" add constraint "recurring_payment_generations_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."recurring_payment_generations" validate constraint "recurring_payment_generations_generated_by_fkey";

alter table "public"."recurring_payment_generations" add constraint "recurring_payment_generations_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_payment_generations" validate constraint "recurring_payment_generations_payment_id_fkey";

alter table "public"."recurring_payment_generations" add constraint "recurring_payment_generations_recurring_payment_id_fkey" FOREIGN KEY (recurring_payment_id) REFERENCES public.recurring_payments(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_payment_generations" validate constraint "recurring_payment_generations_recurring_payment_id_fkey";

alter table "public"."recurring_payment_items" add constraint "recurring_payment_items_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_payment_items" validate constraint "recurring_payment_items_account_id_fkey";

alter table "public"."recurring_payment_items" add constraint "recurring_payment_items_purchase_invoice_id_fkey" FOREIGN KEY (purchase_invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_payment_items" validate constraint "recurring_payment_items_purchase_invoice_id_fkey";

alter table "public"."recurring_payment_items" add constraint "recurring_payment_items_recurring_payment_id_fkey" FOREIGN KEY (recurring_payment_id) REFERENCES public.recurring_payments(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_payment_items" validate constraint "recurring_payment_items_recurring_payment_id_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_account_id_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_company_id_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_cost_center_id_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_created_by_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_numeration_id_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_payment_method_id_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_supplier_id_fkey";

alter table "public"."recurring_payments" add constraint "recurring_payments_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."recurring_payments" validate constraint "recurring_payments_updated_by_fkey";

alter table "public"."refund_items" add constraint "refund_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."refund_items" validate constraint "refund_items_product_id_fkey";

alter table "public"."refund_items" add constraint "refund_items_refund_request_id_fkey" FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id) ON DELETE CASCADE not valid;

alter table "public"."refund_items" validate constraint "refund_items_refund_request_id_fkey";

alter table "public"."refund_items" add constraint "refund_items_sale_item_id_fkey" FOREIGN KEY (sale_item_id) REFERENCES public.sale_items(id) not valid;

alter table "public"."refund_items" validate constraint "refund_items_sale_item_id_fkey";

alter table "public"."refund_requests" add constraint "refund_requests_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."refund_requests" validate constraint "refund_requests_company_id_fkey";

alter table "public"."refund_requests" add constraint "refund_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."refund_requests" validate constraint "refund_requests_created_by_fkey";

alter table "public"."refund_requests" add constraint "refund_requests_processed_by_fkey" FOREIGN KEY (processed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."refund_requests" validate constraint "refund_requests_processed_by_fkey";

alter table "public"."refund_requests" add constraint "refund_requests_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES public.sales(id) not valid;

alter table "public"."refund_requests" validate constraint "refund_requests_sale_id_fkey";

alter table "public"."refund_requests" add constraint "refund_requests_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."refund_requests" validate constraint "refund_requests_updated_by_fkey";

alter table "public"."report_history" add constraint "report_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."report_history" validate constraint "report_history_company_id_fkey";

alter table "public"."report_history" add constraint "report_history_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."report_history" validate constraint "report_history_generated_by_fkey";

alter table "public"."report_history" add constraint "report_history_report_id_fkey" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE not valid;

alter table "public"."report_history" validate constraint "report_history_report_id_fkey";

alter table "public"."report_schedules" add constraint "report_schedules_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."report_schedules" validate constraint "report_schedules_company_id_fkey";

alter table "public"."report_schedules" add constraint "report_schedules_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."report_schedules" validate constraint "report_schedules_created_by_fkey";

alter table "public"."report_schedules" add constraint "report_schedules_report_id_fkey" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE not valid;

alter table "public"."report_schedules" validate constraint "report_schedules_report_id_fkey";

alter table "public"."report_schedules" add constraint "report_schedules_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."report_schedules" validate constraint "report_schedules_updated_by_fkey";

alter table "public"."reports" add constraint "reports_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) not valid;

alter table "public"."reports" validate constraint "reports_account_id_fkey";

alter table "public"."reports" add constraint "reports_cashier_id_fkey" FOREIGN KEY (cashier_id) REFERENCES public.profiles(id) not valid;

alter table "public"."reports" validate constraint "reports_cashier_id_fkey";

alter table "public"."reports" add constraint "reports_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) not valid;

alter table "public"."reports" validate constraint "reports_category_id_fkey";

alter table "public"."reports" add constraint "reports_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."reports" validate constraint "reports_company_id_fkey";

alter table "public"."reports" add constraint "reports_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."reports" validate constraint "reports_created_by_fkey";

alter table "public"."reports" add constraint "reports_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."reports" validate constraint "reports_customer_id_fkey";

alter table "public"."reports" add constraint "reports_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."reports" validate constraint "reports_product_id_fkey";

alter table "public"."reports" add constraint "reports_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."reports" validate constraint "reports_updated_by_fkey";

alter table "public"."reports" add constraint "reports_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."reports" validate constraint "reports_warehouse_id_fkey";

alter table "public"."role_permissions" add constraint "role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_permission_id_fkey";

alter table "public"."role_permissions" add constraint "role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_role_id_fkey";

alter table "public"."roles" add constraint "roles_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."roles" validate constraint "roles_company_id_fkey";

alter table "public"."sale_items" add constraint "sale_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."sale_items" validate constraint "sale_items_product_id_fkey";

alter table "public"."sale_items" add constraint "sale_items_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES public.sales(id) not valid;

alter table "public"."sale_items" validate constraint "sale_items_sale_id_fkey";

alter table "public"."sales" add constraint "sales_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL not valid;

alter table "public"."sales" validate constraint "sales_account_id_fkey";

alter table "public"."sales" add constraint "sales_cashier_id_fkey" FOREIGN KEY (cashier_id) REFERENCES public.profiles(id) not valid;

alter table "public"."sales" validate constraint "sales_cashier_id_fkey";

alter table "public"."sales" add constraint "sales_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."sales" validate constraint "sales_company_id_fkey";

alter table "public"."sales" add constraint "sales_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."sales" validate constraint "sales_customer_id_fkey";

alter table "public"."sales" add constraint "sales_numeration_id_fkey" FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL not valid;

alter table "public"."sales" validate constraint "sales_numeration_id_fkey";

alter table "public"."sales" add constraint "sales_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES public.shifts(id) not valid;

alter table "public"."sales" validate constraint "sales_shift_id_fkey";

alter table "public"."settings" add constraint "settings_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."settings" validate constraint "settings_company_id_fkey";

alter table "public"."settings" add constraint "settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."settings" validate constraint "settings_updated_by_fkey";

alter table "public"."shifts" add constraint "shifts_cashier_id_fkey" FOREIGN KEY (cashier_id) REFERENCES public.profiles(id) not valid;

alter table "public"."shifts" validate constraint "shifts_cashier_id_fkey";

alter table "public"."shifts" add constraint "shifts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."shifts" validate constraint "shifts_company_id_fkey";

alter table "public"."shifts" add constraint "shifts_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.accounts(id) not valid;

alter table "public"."shifts" validate constraint "shifts_source_account_id_fkey";

alter table "public"."suppliers" add constraint "suppliers_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."suppliers" validate constraint "suppliers_company_id_fkey";

alter table "public"."tax_history" add constraint "tax_history_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."tax_history" validate constraint "tax_history_company_id_fkey";

alter table "public"."tax_history" add constraint "tax_history_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON DELETE CASCADE not valid;

alter table "public"."tax_history" validate constraint "tax_history_tax_id_fkey";

alter table "public"."taxes" add constraint "taxes_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."taxes" validate constraint "taxes_company_id_fkey";

alter table "public"."user_audit_log" add constraint "user_audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_audit_log" validate constraint "user_audit_log_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_role_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_sessions" add constraint "user_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_sessions" validate constraint "user_sessions_user_id_fkey";

alter table "public"."warehouse_inventory" add constraint "warehouse_inventory_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."warehouse_inventory" validate constraint "warehouse_inventory_company_id_fkey";

alter table "public"."warehouse_inventory" add constraint "warehouse_inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."warehouse_inventory" validate constraint "warehouse_inventory_product_id_fkey";

alter table "public"."warehouse_inventory" add constraint "warehouse_inventory_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE not valid;

alter table "public"."warehouse_inventory" validate constraint "warehouse_inventory_warehouse_id_fkey";

alter table "public"."warehouse_movements" add constraint "warehouse_movements_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."warehouse_movements" validate constraint "warehouse_movements_company_id_fkey";

alter table "public"."warehouse_movements" add constraint "warehouse_movements_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."warehouse_movements" validate constraint "warehouse_movements_product_id_fkey";

alter table "public"."warehouse_movements" add constraint "warehouse_movements_transfer_id_fkey" FOREIGN KEY (transfer_id) REFERENCES public.warehouse_transfers(id) not valid;

alter table "public"."warehouse_movements" validate constraint "warehouse_movements_transfer_id_fkey";

alter table "public"."warehouse_movements" add constraint "warehouse_movements_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE not valid;

alter table "public"."warehouse_movements" validate constraint "warehouse_movements_warehouse_id_fkey";

alter table "public"."warehouse_transfers" add constraint "warehouse_transfers_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."warehouse_transfers" validate constraint "warehouse_transfers_company_id_fkey";

alter table "public"."warehouse_transfers" add constraint "warehouse_transfers_from_warehouse_id_fkey" FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."warehouse_transfers" validate constraint "warehouse_transfers_from_warehouse_id_fkey";

alter table "public"."warehouse_transfers" add constraint "warehouse_transfers_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."warehouse_transfers" validate constraint "warehouse_transfers_product_id_fkey";

alter table "public"."warehouse_transfers" add constraint "warehouse_transfers_to_warehouse_id_fkey" FOREIGN KEY (to_warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."warehouse_transfers" validate constraint "warehouse_transfers_to_warehouse_id_fkey";

alter table "public"."warehouses" add constraint "warehouses_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."warehouses" validate constraint "warehouses_company_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_or_create_category(p_name text, p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_cat_id UUID;
BEGIN
  SELECT id INTO v_cat_id FROM categories WHERE company_id = p_company_id AND name = p_name AND is_active = true LIMIT 1;
  IF v_cat_id IS NULL THEN
    SELECT id INTO v_cat_id FROM categories WHERE company_id = p_company_id AND name = 'General' AND is_active = true LIMIT 1;
  END IF;
  RETURN v_cat_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_csv_product(p_company_id uuid, p_warehouse_id uuid, p_name text, p_sku text, p_barcode text, p_description text, p_category_name text, p_cost_price numeric, p_selling_price numeric, p_quantity integer, p_min_stock integer DEFAULT 2, p_max_stock integer DEFAULT 100)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_product_id UUID;
  v_category_id UUID;
  v_final_sku TEXT;
BEGIN
  v_category_id := get_or_create_category(p_category_name, p_company_id);
  
  -- Determinar SKU final
  IF p_sku IS NOT NULL AND p_sku != '' THEN
    v_final_sku := p_sku;
  ELSIF p_barcode IS NOT NULL AND p_barcode != '' THEN
    v_final_sku := p_barcode;
  ELSE
    -- Generar SKU único
    v_final_sku := 'SKU-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  -- Buscar producto existente
  IF p_sku IS NOT NULL AND p_sku != '' THEN
    SELECT id INTO v_product_id FROM products 
    WHERE company_id = p_company_id AND sku = p_sku LIMIT 1;
  END IF;
  
  IF v_product_id IS NULL AND p_barcode IS NOT NULL AND p_barcode != '' THEN
    SELECT id INTO v_product_id FROM products 
    WHERE company_id = p_company_id AND barcode = p_barcode LIMIT 1;
  END IF;
  
  IF v_product_id IS NULL THEN
    SELECT id INTO v_product_id FROM products 
    WHERE company_id = p_company_id AND name = p_name LIMIT 1;
  END IF;
  
  IF v_product_id IS NOT NULL THEN
    UPDATE products SET
      name = p_name, sku = v_final_sku, barcode = p_barcode, description = p_description,
      category_id = v_category_id, warehouse_id = p_warehouse_id,
      cost_price = p_cost_price, selling_price = p_selling_price,
      min_stock = p_min_stock, max_stock = p_max_stock,
      unit = 'unidad', is_active = true, updated_at = NOW()
    WHERE id = v_product_id;
  ELSE
    INSERT INTO products (
      company_id, name, sku, barcode, description, category_id, warehouse_id,
      cost_price, selling_price, min_stock, max_stock, unit, is_active
    ) VALUES (
      p_company_id, p_name, v_final_sku, p_barcode, p_description, v_category_id, p_warehouse_id,
      p_cost_price, p_selling_price, p_min_stock, p_max_stock, 'unidad', true
    ) RETURNING id INTO v_product_id;
  END IF;
  
  INSERT INTO warehouse_inventory (product_id, warehouse_id, quantity, company_id, last_updated)
  VALUES (v_product_id, p_warehouse_id, GREATEST(0, p_quantity), p_company_id, NOW())
  ON CONFLICT (warehouse_id, product_id) 
  DO UPDATE SET quantity = GREATEST(0, EXCLUDED.quantity), last_updated = NOW();
  
  RETURN v_product_id::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_payment_from_recurring_cron(p_recurring_payment_id uuid, p_generation_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_recurring_payment record;
    v_payment_id uuid;
    v_payment_number text;
    v_generation_date date;
    v_items record;
    v_user_id uuid;
    v_company_id uuid;
    v_numeration record;
BEGIN
    -- Para cron jobs no hay usuario autenticado
    v_user_id := NULL;
    
    -- Obtener información del pago recurrente
    SELECT * INTO v_recurring_payment
    FROM public.recurring_payments
    WHERE id = p_recurring_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pago recurrente no encontrado';
    END IF;
    
    IF v_recurring_payment.is_active = false THEN
        RAISE EXCEPTION 'El pago recurrente no está activo';
    END IF;
    
    v_company_id := v_recurring_payment.company_id;
    v_generation_date := COALESCE(p_generation_date, CURRENT_DATE);
    
    -- Generar número de pago si hay numeración
    IF v_recurring_payment.numeration_id IS NOT NULL THEN
        SELECT * INTO v_numeration
        FROM public.numerations
        WHERE id = v_recurring_payment.numeration_id;
        
        IF FOUND THEN
            SELECT public.get_next_number(
                v_company_id,
                'payment_voucher',
                v_numeration.name
            ) INTO v_payment_number;
        END IF;
    END IF;
    
    -- Si no hay número generado, crear uno básico
    IF v_payment_number IS NULL OR v_payment_number = '' THEN
        v_payment_number := 'PAG-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(v_recurring_payment.id::text, 1, 8);
    END IF;
    
    -- Crear el pago
    INSERT INTO public.payments (
        company_id,
        numeration_id,
        payment_number,
        payment_date,
        supplier_id,
        contact_name,
        account_id,
        payment_method_id,
        cost_center_id,
        currency,
        details,
        notes,
        transaction_type,
        total_amount,
        status,
        is_reconciled,
        created_by
    )
    VALUES (
        v_company_id,
        v_recurring_payment.numeration_id,
        v_payment_number,
        v_generation_date,
        v_recurring_payment.supplier_id,
        v_recurring_payment.contact_name,
        v_recurring_payment.account_id,
        v_recurring_payment.payment_method_id,
        v_recurring_payment.cost_center_id,
        v_recurring_payment.currency,
        v_recurring_payment.details,
        v_recurring_payment.notes,
        v_recurring_payment.transaction_type,
        v_recurring_payment.total_amount,
        'open',
        false,
        v_user_id
    )
    RETURNING id INTO v_payment_id;
    
    -- Crear los items del pago
    FOR v_items IN 
        SELECT * FROM public.recurring_payment_items
        WHERE recurring_payment_id = p_recurring_payment_id
        ORDER BY sort_order
    LOOP
        INSERT INTO public.payment_items (
            payment_id,
            item_type,
            purchase_invoice_id,
            account_id,
            amount_paid,
            description
        )
        VALUES (
            v_payment_id,
            v_items.item_type,
            v_items.purchase_invoice_id,
            v_items.account_id,
            v_items.amount,
            v_items.description
        );
    END LOOP;
    
    -- Actualizar última fecha de generación y próxima fecha
    UPDATE public.recurring_payments
    SET 
        last_generated_date = v_generation_date,
        next_generation_date = public.calculate_next_recurring_payment_date(
            start_date,
            day_of_month,
            frequency_months,
            v_generation_date,
            end_date
        ),
        updated_at = now()
    WHERE id = p_recurring_payment_id;
    
    -- Registrar la generación
    INSERT INTO public.recurring_payment_generations (
        recurring_payment_id,
        payment_id,
        company_id,
        scheduled_date,
        generated_date,
        status,
        generated_by
    )
    VALUES (
        p_recurring_payment_id,
        v_payment_id,
        v_company_id,
        v_generation_date,
        now(),
        'generated',
        v_user_id
    );
    
    RETURN v_payment_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Registrar error en la generación
        BEGIN
            INSERT INTO public.recurring_payment_generations (
                recurring_payment_id,
                payment_id,
                company_id,
                scheduled_date,
                generated_date,
                status,
                error_message,
                generated_by
            )
            VALUES (
                p_recurring_payment_id,
                NULL,
                COALESCE(v_company_id, (SELECT company_id FROM public.recurring_payments WHERE id = p_recurring_payment_id)),
                COALESCE(v_generation_date, CURRENT_DATE),
                now(),
                'failed',
                SQLERRM,
                v_user_id
            );
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignorar errores al registrar el error
        END;
        RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_sale_from_recurring_invoice(p_recurring_invoice_id uuid, p_generation_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_recurring_invoice record;
    v_sale_id uuid;
    v_sale_number text;
    v_generation_date date;
    v_item record;
    v_user_id uuid;
    v_company_id uuid;
    v_numeration record;
    v_customer record;
    v_warehouse_id uuid;
    v_subtotal numeric(15,2) := 0;
    v_tax_amount numeric(15,2) := 0;
    v_discount_amount numeric(15,2) := 0;
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Usar un usuario del sistema o NULL (el sistema manejará esto)
    v_user_id := NULL; -- Para cron jobs, no hay usuario autenticado
    
    -- Obtener información de la factura recurrente
    SELECT * INTO v_recurring_invoice
    FROM public.recurring_invoices
    WHERE id = p_recurring_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Factura recurrente no encontrada';
    END IF;
    
    IF v_recurring_invoice.is_active = false THEN
        RAISE EXCEPTION 'La factura recurrente no está activa';
    END IF;
    
    v_company_id := v_recurring_invoice.company_id;
    v_generation_date := COALESCE(p_generation_date, CURRENT_DATE);
    
    -- Verificar que el cliente existe
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = v_recurring_invoice.customer_id
      AND company_id = v_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente no encontrado';
    END IF;
    
    -- Obtener numeración si existe
    IF v_recurring_invoice.numeration_id IS NOT NULL THEN
        SELECT * INTO v_numeration
        FROM public.numerations
        WHERE id = v_recurring_invoice.numeration_id;
        
        IF FOUND THEN
            -- Generar número usando la función RPC
            SELECT public.get_next_number(
                v_company_id,
                'invoice',
                v_numeration.name
            ) INTO v_sale_number;
        END IF;
    END IF;
    
    -- Si no hay número generado, crear uno básico
    IF v_sale_number IS NULL OR v_sale_number = '' THEN
        v_sale_number := 'FAC-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(v_recurring_invoice.id::text, 1, 8);
    END IF;
    
    -- Calcular totales desde los items
    SELECT 
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(discount_amount), 0),
        0 -- tax_amount se calculará después si es necesario
    INTO v_subtotal, v_discount_amount, v_tax_amount
    FROM public.recurring_invoice_items
    WHERE recurring_invoice_id = p_recurring_invoice_id;
    
    v_total_amount := v_subtotal - v_discount_amount + v_tax_amount;
    
    -- Crear la venta
    INSERT INTO public.sales (
        company_id,
        customer_id,
        numeration_id,
        sale_number,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        payment_method,
        payment_status,
        status,
        notes,
        created_at,
        updated_at,
        cashier_id
    )
    VALUES (
        v_company_id,
        v_recurring_invoice.customer_id,
        v_recurring_invoice.numeration_id,
        v_sale_number,
        v_subtotal,
        v_tax_amount,
        v_discount_amount,
        v_total_amount,
        'transfer', -- Método de pago por defecto para facturas recurrentes (válido: cash, card, transfer, mixed)
        'pending', -- Pendiente de pago (a crédito)
        'completed',
        v_recurring_invoice.notes,
        v_generation_date,
        now(),
        v_user_id
    )
    RETURNING id INTO v_sale_id;
    
    -- Crear los items de la venta
    FOR v_item IN 
        SELECT * FROM public.recurring_invoice_items
        WHERE recurring_invoice_id = p_recurring_invoice_id
        ORDER BY sort_order
    LOOP
        -- Verificar que el producto existe
        IF v_item.product_id IS NOT NULL THEN
            INSERT INTO public.sale_items (
                sale_id,
                product_id,
                quantity,
                unit_price,
                discount_amount,
                total_price
            )
            VALUES (
                v_sale_id,
                v_item.product_id,
                v_item.quantity,
                v_item.unit_price,
                v_item.discount_amount,
                v_item.total_price
            );
        END IF;
    END LOOP;
    
    -- Actualizar última fecha de generación y próxima fecha
    UPDATE public.recurring_invoices
    SET 
        last_generated_date = v_generation_date,
        next_generation_date = public.calculate_next_generation_date(
            start_date,
            end_date,
            day_of_month,
            frequency_months,
            v_generation_date
        ),
        updated_at = now()
    WHERE id = p_recurring_invoice_id;
    
    -- Registrar la generación
    INSERT INTO public.recurring_invoice_generations (
        recurring_invoice_id,
        sale_id,
        company_id,
        scheduled_date,
        generated_date,
        status,
        generated_by
    )
    VALUES (
        p_recurring_invoice_id,
        v_sale_id,
        v_company_id,
        v_generation_date,
        now(),
        'generated',
        v_user_id
    );
    
    RETURN v_sale_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Registrar error en la generación
        BEGIN
            INSERT INTO public.recurring_invoice_generations (
                recurring_invoice_id,
                sale_id,
                company_id,
                scheduled_date,
                generated_date,
                status,
                error_message,
                generated_by
            )
            VALUES (
                p_recurring_invoice_id,
                NULL,
                COALESCE(v_company_id, (SELECT company_id FROM public.recurring_invoices WHERE id = p_recurring_invoice_id)),
                COALESCE(v_generation_date, CURRENT_DATE),
                now(),
                'failed',
                SQLERRM,
                v_user_id
            );
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignorar errores al registrar el error
        END;
        RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_all_recurring_items(p_process_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_process_date date;
    v_invoices_result jsonb;
    v_payments_result jsonb;
    v_result jsonb;
BEGIN
    v_process_date := COALESCE(p_process_date, CURRENT_DATE);
    
    -- Procesar facturas recurrentes
    SELECT public.process_due_recurring_invoices(v_process_date) INTO v_invoices_result;
    
    -- Procesar pagos recurrentes
    SELECT public.process_due_recurring_payments(v_process_date) INTO v_payments_result;
    
    -- Construir resultado combinado
    v_result := jsonb_build_object(
        'date', v_process_date,
        'processed_at', now(),
        'invoices', v_invoices_result,
        'payments', v_payments_result,
        'summary', jsonb_build_object(
            'total_invoices_processed', (v_invoices_result->>'processed_count')::integer,
            'total_invoices_failed', (v_invoices_result->>'failed_count')::integer,
            'total_payments_processed', (v_payments_result->>'processed_count')::integer,
            'total_payments_failed', (v_payments_result->>'failed_count')::integer
        )
    );
    
    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_due_recurring_invoices(p_process_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_process_date date;
    v_recurring_invoice record;
    v_sale_id uuid;
    v_processed_count integer := 0;
    v_failed_count integer := 0;
    v_errors jsonb := '[]'::jsonb;
    v_result jsonb;
    v_actual_generation_date date;
BEGIN
    v_process_date := COALESCE(p_process_date, CURRENT_DATE);
    
    -- Buscar todas las facturas recurrentes que deben procesarse
    -- Procesar facturas donde next_generation_date <= fecha de procesamiento
    -- Esto permite procesar facturas que se perdieron o se ejecutaron tarde
    FOR v_recurring_invoice IN
        SELECT *
        FROM public.recurring_invoices
        WHERE is_active = true
          AND next_generation_date IS NOT NULL
          AND next_generation_date <= v_process_date
          AND (end_date IS NULL OR end_date >= v_process_date)
          AND start_date <= v_process_date
    LOOP
        BEGIN
            -- Usar la fecha de próxima generación como fecha de generación real
            -- Esto asegura que la factura se genere con la fecha correcta
            v_actual_generation_date := LEAST(v_recurring_invoice.next_generation_date, v_process_date);
            
            -- Intentar generar la factura
            SELECT public.generate_sale_from_recurring_invoice(
                v_recurring_invoice.id,
                v_actual_generation_date
            ) INTO v_sale_id;
            
            v_processed_count := v_processed_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                v_errors := v_errors || jsonb_build_object(
                    'recurring_invoice_id', v_recurring_invoice.id,
                    'recurring_invoice_number', v_recurring_invoice.id::text,
                    'next_generation_date', v_recurring_invoice.next_generation_date,
                    'error', SQLERRM
                );
        END;
    END LOOP;
    
    -- Construir resultado
    v_result := jsonb_build_object(
        'date', v_process_date,
        'processed_count', v_processed_count,
        'failed_count', v_failed_count,
        'errors', v_errors
    );
    
    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_due_recurring_payments(p_process_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_process_date date;
    v_recurring_payment record;
    v_payment_id uuid;
    v_processed_count integer := 0;
    v_failed_count integer := 0;
    v_errors jsonb := '[]'::jsonb;
    v_result jsonb;
    v_actual_generation_date date;
BEGIN
    v_process_date := COALESCE(p_process_date, CURRENT_DATE);
    
    -- Buscar todos los pagos recurrentes que deben procesarse
    -- Procesar pagos donde next_generation_date <= fecha de procesamiento
    FOR v_recurring_payment IN
        SELECT *
        FROM public.recurring_payments
        WHERE is_active = true
          AND next_generation_date IS NOT NULL
          AND next_generation_date <= v_process_date
          AND (end_date IS NULL OR end_date >= v_process_date)
          AND start_date <= v_process_date
    LOOP
        BEGIN
            -- Usar la fecha de próxima generación como fecha de generación real
            v_actual_generation_date := LEAST(v_recurring_payment.next_generation_date, v_process_date);
            
            -- Intentar generar el pago
            SELECT public.generate_payment_from_recurring_cron(
                v_recurring_payment.id,
                v_actual_generation_date
            ) INTO v_payment_id;
            
            v_processed_count := v_processed_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                v_errors := v_errors || jsonb_build_object(
                    'recurring_payment_id', v_recurring_payment.id,
                    'recurring_payment_number', v_recurring_payment.id::text,
                    'next_generation_date', v_recurring_payment.next_generation_date,
                    'error', SQLERRM
                );
        END;
    END LOOP;
    
    -- Construir resultado
    v_result := jsonb_build_object(
        'date', v_process_date,
        'processed_count', v_processed_count,
        'failed_count', v_failed_count,
        'errors', v_errors
    );
    
    RETURN v_result;
END;
$function$
;


  create policy "Users can access cash movements in their company"
  on "public"."cash_movements"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can access categories in their company"
  on "public"."categories"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete cost center assignments from their company"
  on "public"."cost_center_assignments"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert cost center assignments for their company"
  on "public"."cost_center_assignments"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update cost center assignments from their company"
  on "public"."cost_center_assignments"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view cost center assignments from their company"
  on "public"."cost_center_assignments"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert cost center history for their company"
  on "public"."cost_center_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view cost center history from their company"
  on "public"."cost_center_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete cost centers from their company"
  on "public"."cost_centers"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert cost centers for their company"
  on "public"."cost_centers"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update cost centers from their company"
  on "public"."cost_centers"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view cost centers from their company"
  on "public"."cost_centers"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete customer contacts in their company"
  on "public"."customer_contacts"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert customer contacts in their company"
  on "public"."customer_contacts"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update customer contacts in their company"
  on "public"."customer_contacts"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view customer contacts from their company"
  on "public"."customer_contacts"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert customer history in their company"
  on "public"."customer_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view customer history from their company"
  on "public"."customer_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete customers in their company"
  on "public"."customers"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert customers in their company"
  on "public"."customers"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update customers in their company"
  on "public"."customers"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view customers from their company"
  on "public"."customers"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert delivery note history for their company"
  on "public"."delivery_note_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view delivery note history from their company"
  on "public"."delivery_note_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete delivery note items from their company"
  on "public"."delivery_note_items"
  as permissive
  for delete
  to public
using ((delivery_note_id IN ( SELECT delivery_notes.id
   FROM public.delivery_notes
  WHERE (delivery_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert delivery note items for their company"
  on "public"."delivery_note_items"
  as permissive
  for insert
  to public
with check ((delivery_note_id IN ( SELECT delivery_notes.id
   FROM public.delivery_notes
  WHERE (delivery_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update delivery note items from their company"
  on "public"."delivery_note_items"
  as permissive
  for update
  to public
using ((delivery_note_id IN ( SELECT delivery_notes.id
   FROM public.delivery_notes
  WHERE (delivery_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))
with check ((delivery_note_id IN ( SELECT delivery_notes.id
   FROM public.delivery_notes
  WHERE (delivery_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view delivery note items from their company"
  on "public"."delivery_note_items"
  as permissive
  for select
  to public
using ((delivery_note_id IN ( SELECT delivery_notes.id
   FROM public.delivery_notes
  WHERE (delivery_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert delivery note sale conversions for their compa"
  on "public"."delivery_note_sale_conversions"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view delivery note sale conversions from their compan"
  on "public"."delivery_note_sale_conversions"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete delivery notes from their company"
  on "public"."delivery_notes"
  as permissive
  for delete
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (status <> 'invoiced'::text) AND (is_cancelled = false)));



  create policy "Users can insert delivery notes for their company"
  on "public"."delivery_notes"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update delivery notes from their company"
  on "public"."delivery_notes"
  as permissive
  for update
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (((status <> 'invoiced'::text) AND (is_cancelled = false)) OR (status = ANY (ARRAY['pending'::text, 'partially_invoiced'::text, 'invoiced'::text])))))
with check (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (status = ANY (ARRAY['pending'::text, 'partially_invoiced'::text, 'invoiced'::text, 'cancelled'::text]))));



  create policy "Users can view delivery notes from their company"
  on "public"."delivery_notes"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete import jobs in their company"
  on "public"."import_jobs"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert import jobs in their company"
  on "public"."import_jobs"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update import jobs in their company"
  on "public"."import_jobs"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view import jobs from their company"
  on "public"."import_jobs"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can access inventory in their company"
  on "public"."inventory"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete inventory of their company"
  on "public"."inventory"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert inventory for their company"
  on "public"."inventory"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update inventory of their company"
  on "public"."inventory"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view inventory of their company"
  on "public"."inventory"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert numeration history for their company"
  on "public"."numeration_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view numeration history from their company"
  on "public"."numeration_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete numerations from their company"
  on "public"."numerations"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert numerations for their company"
  on "public"."numerations"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update numerations from their company"
  on "public"."numerations"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view numerations from their company"
  on "public"."numerations"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete payment gateways from their company"
  on "public"."payment_gateways"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert payment gateways for their company"
  on "public"."payment_gateways"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update payment gateways from their company"
  on "public"."payment_gateways"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view payment gateways from their company"
  on "public"."payment_gateways"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert payment history for their company"
  on "public"."payment_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view payment history from their company"
  on "public"."payment_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete payment items from their company"
  on "public"."payment_items"
  as permissive
  for delete
  to public
using ((payment_id IN ( SELECT payments.id
   FROM public.payments
  WHERE (payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert payment items for their company"
  on "public"."payment_items"
  as permissive
  for insert
  to public
with check ((payment_id IN ( SELECT payments.id
   FROM public.payments
  WHERE (payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update payment items from their company"
  on "public"."payment_items"
  as permissive
  for update
  to public
using ((payment_id IN ( SELECT payments.id
   FROM public.payments
  WHERE (payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view payment items from their company"
  on "public"."payment_items"
  as permissive
  for select
  to public
using ((payment_id IN ( SELECT payments.id
   FROM public.payments
  WHERE (payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert payment method history for their company"
  on "public"."payment_method_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view payment method history from their company"
  on "public"."payment_method_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete payment methods from their company"
  on "public"."payment_methods"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert payment methods for their company"
  on "public"."payment_methods"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update payment methods from their company"
  on "public"."payment_methods"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view payment methods from their company"
  on "public"."payment_methods"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert payment transactions for their company"
  on "public"."payment_transactions"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update payment transactions from their company"
  on "public"."payment_transactions"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view payment transactions from their company"
  on "public"."payment_transactions"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete payments from their company"
  on "public"."payments"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert payments for their company"
  on "public"."payments"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update payments from their company"
  on "public"."payments"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))))
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view payments from their company"
  on "public"."payments"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Only admins can modify permissions"
  on "public"."permissions"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));



  create policy "Users can delete their own POS configurations"
  on "public"."pos_configurations"
  as permissive
  for delete
  to public
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.company_id = pos_configurations.company_id) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));



  create policy "Users can update their own POS configurations"
  on "public"."pos_configurations"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.company_id = pos_configurations.company_id) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));



  create policy "Users can view their own POS configurations"
  on "public"."pos_configurations"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.company_id = pos_configurations.company_id) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));



  create policy "Users can insert print template history in their company"
  on "public"."print_template_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view print template history in their company"
  on "public"."print_template_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete print templates in their company"
  on "public"."print_templates"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert print templates in their company"
  on "public"."print_templates"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update print templates in their company"
  on "public"."print_templates"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view print templates in their company"
  on "public"."print_templates"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can create import history for their company"
  on "public"."product_import_history"
  as permissive
  for insert
  to public
with check (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (uploaded_by = auth.uid())));



  create policy "Users can update import history for their company"
  on "public"."product_import_history"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view import history for their company"
  on "public"."product_import_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can access products in their company"
  on "public"."products"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert purchase debit note history for their company"
  on "public"."purchase_debit_note_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view purchase debit note history from their company"
  on "public"."purchase_debit_note_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete purchase debit note items from their company"
  on "public"."purchase_debit_note_items"
  as permissive
  for delete
  to public
using ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert purchase debit note items for their company"
  on "public"."purchase_debit_note_items"
  as permissive
  for insert
  to public
with check ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update purchase debit note items from their company"
  on "public"."purchase_debit_note_items"
  as permissive
  for update
  to public
using ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view purchase debit note items from their company"
  on "public"."purchase_debit_note_items"
  as permissive
  for select
  to public
using ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete purchase debit note settlements from their com"
  on "public"."purchase_debit_note_settlements"
  as permissive
  for delete
  to public
using ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert purchase debit note settlements for their comp"
  on "public"."purchase_debit_note_settlements"
  as permissive
  for insert
  to public
with check ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update purchase debit note settlements from their com"
  on "public"."purchase_debit_note_settlements"
  as permissive
  for update
  to public
using ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view purchase debit note settlements from their compa"
  on "public"."purchase_debit_note_settlements"
  as permissive
  for select
  to public
using ((purchase_debit_note_id IN ( SELECT purchase_debit_notes.id
   FROM public.purchase_debit_notes
  WHERE (purchase_debit_notes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete purchase debit notes from their company"
  on "public"."purchase_debit_notes"
  as permissive
  for delete
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (is_reconciled = false)));



  create policy "Users can insert purchase debit notes for their company"
  on "public"."purchase_debit_notes"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update purchase debit notes from their company"
  on "public"."purchase_debit_notes"
  as permissive
  for update
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((is_reconciled = false) OR (status = 'cancelled'::text))));



  create policy "Users can view purchase debit notes from their company"
  on "public"."purchase_debit_notes"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert purchase invoice history for their company"
  on "public"."purchase_invoice_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view purchase invoice history from their company"
  on "public"."purchase_invoice_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete purchase invoice items from their company"
  on "public"."purchase_invoice_items"
  as permissive
  for delete
  to public
using ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert purchase invoice items for their company"
  on "public"."purchase_invoice_items"
  as permissive
  for insert
  to public
with check ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update purchase invoice items from their company"
  on "public"."purchase_invoice_items"
  as permissive
  for update
  to public
using ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view purchase invoice items from their company"
  on "public"."purchase_invoice_items"
  as permissive
  for select
  to public
using ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete purchase invoice withholdings from their compa"
  on "public"."purchase_invoice_withholdings"
  as permissive
  for delete
  to public
using ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert purchase invoice withholdings for their compan"
  on "public"."purchase_invoice_withholdings"
  as permissive
  for insert
  to public
with check ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update purchase invoice withholdings from their compa"
  on "public"."purchase_invoice_withholdings"
  as permissive
  for update
  to public
using ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view purchase invoice withholdings from their company"
  on "public"."purchase_invoice_withholdings"
  as permissive
  for select
  to public
using ((purchase_invoice_id IN ( SELECT purchase_invoices.id
   FROM public.purchase_invoices
  WHERE (purchase_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete purchase invoices from their company"
  on "public"."purchase_invoices"
  as permissive
  for delete
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (status <> 'cancelled'::text)));



  create policy "Users can insert purchase invoices for their company"
  on "public"."purchase_invoices"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update purchase invoices from their company"
  on "public"."purchase_invoices"
  as permissive
  for update
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (status <> 'cancelled'::text)));



  create policy "Users can view purchase invoices from their company"
  on "public"."purchase_invoices"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can access purchases in their company"
  on "public"."purchases"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert quote history for their company"
  on "public"."quote_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view quote history from their company"
  on "public"."quote_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete quote items from their company"
  on "public"."quote_items"
  as permissive
  for delete
  to public
using ((quote_id IN ( SELECT quotes.id
   FROM public.quotes
  WHERE (quotes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert quote items for their company"
  on "public"."quote_items"
  as permissive
  for insert
  to public
with check ((quote_id IN ( SELECT quotes.id
   FROM public.quotes
  WHERE (quotes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update quote items from their company"
  on "public"."quote_items"
  as permissive
  for update
  to public
using ((quote_id IN ( SELECT quotes.id
   FROM public.quotes
  WHERE (quotes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view quote items from their company"
  on "public"."quote_items"
  as permissive
  for select
  to public
using ((quote_id IN ( SELECT quotes.id
   FROM public.quotes
  WHERE (quotes.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete quotes from their company"
  on "public"."quotes"
  as permissive
  for delete
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (status <> 'converted'::text)));



  create policy "Users can insert quotes for their company"
  on "public"."quotes"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update quotes from their company"
  on "public"."quotes"
  as permissive
  for update
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((status <> 'converted'::text) OR ((status = 'converted'::text) AND (converted_to_sale_id IS NULL)))))
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view quotes from their company"
  on "public"."quotes"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert received payment history for their company"
  on "public"."received_payment_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view received payment history from their company"
  on "public"."received_payment_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete received payment items from their company"
  on "public"."received_payment_items"
  as permissive
  for delete
  to public
using ((received_payment_id IN ( SELECT received_payments.id
   FROM public.received_payments
  WHERE (received_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert received payment items for their company"
  on "public"."received_payment_items"
  as permissive
  for insert
  to public
with check ((received_payment_id IN ( SELECT received_payments.id
   FROM public.received_payments
  WHERE (received_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update received payment items from their company"
  on "public"."received_payment_items"
  as permissive
  for update
  to public
using ((received_payment_id IN ( SELECT received_payments.id
   FROM public.received_payments
  WHERE (received_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view received payment items from their company"
  on "public"."received_payment_items"
  as permissive
  for select
  to public
using ((received_payment_id IN ( SELECT received_payments.id
   FROM public.received_payments
  WHERE (received_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete received payments from their company"
  on "public"."received_payments"
  as permissive
  for delete
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (is_reconciled = false)));



  create policy "Users can insert received payments for their company"
  on "public"."received_payments"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update received payments from their company"
  on "public"."received_payments"
  as permissive
  for update
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((is_reconciled = false) OR (status = 'cancelled'::text))));



  create policy "Users can view received payments from their company"
  on "public"."received_payments"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert recurring invoice generations for their compan"
  on "public"."recurring_invoice_generations"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update recurring invoice generations from their compa"
  on "public"."recurring_invoice_generations"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view recurring invoice generations from their company"
  on "public"."recurring_invoice_generations"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete recurring invoice items from their company"
  on "public"."recurring_invoice_items"
  as permissive
  for delete
  to public
using ((recurring_invoice_id IN ( SELECT recurring_invoices.id
   FROM public.recurring_invoices
  WHERE (recurring_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert recurring invoice items for their company"
  on "public"."recurring_invoice_items"
  as permissive
  for insert
  to public
with check ((recurring_invoice_id IN ( SELECT recurring_invoices.id
   FROM public.recurring_invoices
  WHERE (recurring_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update recurring invoice items from their company"
  on "public"."recurring_invoice_items"
  as permissive
  for update
  to public
using ((recurring_invoice_id IN ( SELECT recurring_invoices.id
   FROM public.recurring_invoices
  WHERE (recurring_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view recurring invoice items from their company"
  on "public"."recurring_invoice_items"
  as permissive
  for select
  to public
using ((recurring_invoice_id IN ( SELECT recurring_invoices.id
   FROM public.recurring_invoices
  WHERE (recurring_invoices.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete recurring invoices from their company"
  on "public"."recurring_invoices"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert recurring invoices for their company"
  on "public"."recurring_invoices"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update recurring invoices from their company"
  on "public"."recurring_invoices"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view recurring invoices from their company"
  on "public"."recurring_invoices"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert recurring payment generations for their compan"
  on "public"."recurring_payment_generations"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view recurring payment generations from their company"
  on "public"."recurring_payment_generations"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete recurring payment items from their company"
  on "public"."recurring_payment_items"
  as permissive
  for delete
  to public
using ((recurring_payment_id IN ( SELECT recurring_payments.id
   FROM public.recurring_payments
  WHERE (recurring_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can insert recurring payment items for their company"
  on "public"."recurring_payment_items"
  as permissive
  for insert
  to public
with check ((recurring_payment_id IN ( SELECT recurring_payments.id
   FROM public.recurring_payments
  WHERE (recurring_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update recurring payment items from their company"
  on "public"."recurring_payment_items"
  as permissive
  for update
  to public
using ((recurring_payment_id IN ( SELECT recurring_payments.id
   FROM public.recurring_payments
  WHERE (recurring_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view recurring payment items from their company"
  on "public"."recurring_payment_items"
  as permissive
  for select
  to public
using ((recurring_payment_id IN ( SELECT recurring_payments.id
   FROM public.recurring_payments
  WHERE (recurring_payments.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete recurring payments from their company"
  on "public"."recurring_payments"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert recurring payments for their company"
  on "public"."recurring_payments"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update recurring payments from their company"
  on "public"."recurring_payments"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view recurring payments from their company"
  on "public"."recurring_payments"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can create refund items for their company"
  on "public"."refund_items"
  as permissive
  for insert
  to public
with check ((refund_request_id IN ( SELECT refund_requests.id
   FROM public.refund_requests
  WHERE (refund_requests.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can delete refund items for their company"
  on "public"."refund_items"
  as permissive
  for delete
  to public
using ((refund_request_id IN ( SELECT refund_requests.id
   FROM public.refund_requests
  WHERE (refund_requests.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can update refund items for their company"
  on "public"."refund_items"
  as permissive
  for update
  to public
using ((refund_request_id IN ( SELECT refund_requests.id
   FROM public.refund_requests
  WHERE (refund_requests.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can view refund items for their company"
  on "public"."refund_items"
  as permissive
  for select
  to public
using ((refund_request_id IN ( SELECT refund_requests.id
   FROM public.refund_requests
  WHERE (refund_requests.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Users can create refund requests for their company"
  on "public"."refund_requests"
  as permissive
  for insert
  to public
with check (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (created_by = auth.uid())));



  create policy "Users can delete refund requests for their company"
  on "public"."refund_requests"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update refund requests for their company"
  on "public"."refund_requests"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view refund requests for their company"
  on "public"."refund_requests"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert report history in their company"
  on "public"."report_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view report history from their company"
  on "public"."report_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete report schedules in their company"
  on "public"."report_schedules"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert report schedules in their company"
  on "public"."report_schedules"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update report schedules in their company"
  on "public"."report_schedules"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view report schedules from their company"
  on "public"."report_schedules"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete reports in their company"
  on "public"."reports"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert reports in their company"
  on "public"."reports"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update reports in their company"
  on "public"."reports"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view reports from their company"
  on "public"."reports"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Admins can manage role permissions"
  on "public"."role_permissions"
  as permissive
  for all
  to public
using (((role_id IN ( SELECT r.id
   FROM public.roles r
  WHERE (r.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));



  create policy "Users can view role permissions"
  on "public"."role_permissions"
  as permissive
  for select
  to public
using ((role_id IN ( SELECT r.id
   FROM public.roles r
  WHERE (r.company_id IN ( SELECT profiles.company_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));



  create policy "Admins can manage roles in their company"
  on "public"."roles"
  as permissive
  for all
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));



  create policy "Users can view roles in their company"
  on "public"."roles"
  as permissive
  for select
  to public
using (((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (is_system_role = true)));



  create policy "Users can access sales in their company"
  on "public"."sales"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can access settings in their company"
  on "public"."settings"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can access shifts in their company"
  on "public"."shifts"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can access suppliers in their company"
  on "public"."suppliers"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert tax history for their company"
  on "public"."tax_history"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view tax history from their company"
  on "public"."tax_history"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete taxes from their company"
  on "public"."taxes"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert taxes for their company"
  on "public"."taxes"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update taxes from their company"
  on "public"."taxes"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view taxes from their company"
  on "public"."taxes"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view audit logs in their company"
  on "public"."user_audit_log"
  as permissive
  for select
  to public
using ((user_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.company_id IN ( SELECT profiles_1.company_id
           FROM public.profiles profiles_1
          WHERE (profiles_1.id = auth.uid()))))));



  create policy "Admins can manage user roles"
  on "public"."user_roles"
  as permissive
  for all
  to public
using (((user_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.company_id IN ( SELECT profiles_1.company_id
           FROM public.profiles profiles_1
          WHERE (profiles_1.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));



  create policy "Users can view user roles in their company"
  on "public"."user_roles"
  as permissive
  for select
  to public
using ((user_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.company_id IN ( SELECT profiles_1.company_id
           FROM public.profiles profiles_1
          WHERE (profiles_1.id = auth.uid()))))));



  create policy "Users can delete warehouse inventory in their company"
  on "public"."warehouse_inventory"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete warehouse_inventory in their company"
  on "public"."warehouse_inventory"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert warehouse inventory in their company"
  on "public"."warehouse_inventory"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert warehouse_inventory in their company"
  on "public"."warehouse_inventory"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update warehouse inventory in their company"
  on "public"."warehouse_inventory"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update warehouse_inventory in their company"
  on "public"."warehouse_inventory"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view warehouse inventory from their company"
  on "public"."warehouse_inventory"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view warehouse_inventory in their company"
  on "public"."warehouse_inventory"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete warehouse_movements in their company"
  on "public"."warehouse_movements"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert warehouse movements in their company"
  on "public"."warehouse_movements"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert warehouse_movements in their company"
  on "public"."warehouse_movements"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update warehouse_movements in their company"
  on "public"."warehouse_movements"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view warehouse movements from their company"
  on "public"."warehouse_movements"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view warehouse_movements in their company"
  on "public"."warehouse_movements"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete warehouse transfers in their company"
  on "public"."warehouse_transfers"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete warehouse_transfers in their company"
  on "public"."warehouse_transfers"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert warehouse transfers in their company"
  on "public"."warehouse_transfers"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can insert warehouse_transfers in their company"
  on "public"."warehouse_transfers"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update warehouse transfers in their company"
  on "public"."warehouse_transfers"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can update warehouse_transfers in their company"
  on "public"."warehouse_transfers"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view warehouse transfers from their company"
  on "public"."warehouse_transfers"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view warehouse_transfers in their company"
  on "public"."warehouse_transfers"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can delete warehouses in their company"
  on "public"."warehouses"
  as permissive
  for delete
  to public
using (public.user_belongs_to_company(company_id));



  create policy "Users can insert warehouses in their company"
  on "public"."warehouses"
  as permissive
  for insert
  to public
with check (public.user_belongs_to_company(company_id));



  create policy "Users can update warehouses in their company"
  on "public"."warehouses"
  as permissive
  for update
  to public
using (public.user_belongs_to_company(company_id))
with check (public.user_belongs_to_company(company_id));



  create policy "Users can view warehouses from their company"
  on "public"."warehouses"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view warehouses in their company"
  on "public"."warehouses"
  as permissive
  for select
  to public
using (public.user_belongs_to_company(company_id));


CREATE TRIGGER trigger_update_account_balance AFTER INSERT OR DELETE OR UPDATE ON public.account_transactions FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

CREATE TRIGGER trigger_update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();

CREATE TRIGGER set_cash_movement_company_id_trigger BEFORE INSERT ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION public.set_cash_movement_company_id();

CREATE TRIGGER trigger_company_created AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.trigger_company_created();

CREATE TRIGGER trigger_create_default_roles_for_company AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.create_default_roles_for_new_company();

CREATE TRIGGER trigger_create_main_warehouse AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.create_main_warehouse();

CREATE TRIGGER trigger_update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_companies_updated_at();

CREATE TRIGGER trigger_update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.update_cost_centers_updated_at();

CREATE TRIGGER trigger_log_customer_changes AFTER INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.log_customer_changes();

CREATE TRIGGER trigger_update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_customers_updated_at();

CREATE TRIGGER trigger_recalculate_delivery_note_totals AFTER INSERT OR DELETE OR UPDATE ON public.delivery_note_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_delivery_note_totals();

CREATE TRIGGER trigger_update_delivery_note_items_updated_at BEFORE UPDATE ON public.delivery_note_items FOR EACH ROW EXECUTE FUNCTION public.update_delivery_note_items_updated_at();

CREATE TRIGGER trigger_update_delivery_note_status AFTER INSERT OR DELETE OR UPDATE ON public.delivery_note_items FOR EACH ROW EXECUTE FUNCTION public.update_delivery_note_status();

CREATE TRIGGER trigger_log_delivery_note_changes AFTER INSERT OR UPDATE ON public.delivery_notes FOR EACH ROW EXECUTE FUNCTION public.log_delivery_note_changes();

CREATE TRIGGER trigger_update_delivery_notes_updated_at BEFORE UPDATE ON public.delivery_notes FOR EACH ROW EXECUTE FUNCTION public.update_delivery_notes_updated_at();

CREATE TRIGGER trigger_update_import_jobs_updated_at BEFORE UPDATE ON public.import_jobs FOR EACH ROW EXECUTE FUNCTION public.update_import_jobs_updated_at();

CREATE TRIGGER trigger_update_numerations_updated_at BEFORE UPDATE ON public.numerations FOR EACH ROW EXECUTE FUNCTION public.update_numerations_updated_at();

CREATE TRIGGER trigger_update_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION public.update_payment_gateways_updated_at();

CREATE TRIGGER trigger_recalculate_payment_total AFTER INSERT OR DELETE OR UPDATE ON public.payment_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_payment_total();

CREATE TRIGGER trigger_update_purchase_invoice_paid_amount AFTER INSERT OR UPDATE ON public.payment_items FOR EACH ROW WHEN (((new.item_type = 'INVOICE'::text) AND (new.purchase_invoice_id IS NOT NULL))) EXECUTE FUNCTION public.update_purchase_invoice_paid_amount();

CREATE TRIGGER trigger_update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_payment_methods_updated_at();

CREATE TRIGGER trigger_update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.update_payment_transactions_updated_at();

CREATE TRIGGER trigger_log_payment_changes AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_payment_changes();

CREATE TRIGGER trigger_revert_account_balance_on_payment_cancellation AFTER UPDATE ON public.payments FOR EACH ROW WHEN (((new.status = 'cancelled'::text) AND (old.status <> 'cancelled'::text))) EXECUTE FUNCTION public.revert_account_balance_on_payment_cancellation();

CREATE TRIGGER trigger_revert_purchase_invoice_paid_amount AFTER UPDATE ON public.payments FOR EACH ROW WHEN (((new.status = 'cancelled'::text) AND (old.status <> 'cancelled'::text))) EXECUTE FUNCTION public.revert_purchase_invoice_paid_amount();

CREATE TRIGGER trigger_update_account_balance_on_payment AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW WHEN ((new.status <> 'cancelled'::text)) EXECUTE FUNCTION public.update_account_balance_on_payment();

CREATE TRIGGER trigger_update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_payments_updated_at();

CREATE TRIGGER trigger_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER trigger_update_pos_configurations_updated_at BEFORE UPDATE ON public.pos_configurations FOR EACH ROW EXECUTE FUNCTION public.update_pos_configurations_updated_at();

CREATE TRIGGER trigger_print_templates_updated_at BEFORE UPDATE ON public.print_templates FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER trigger_update_product_import_history_updated_at BEFORE UPDATE ON public.product_import_history FOR EACH ROW EXECUTE FUNCTION public.update_product_import_history_updated_at();

CREATE TRIGGER trigger_recalculate_purchase_debit_note_totals AFTER INSERT OR DELETE OR UPDATE ON public.purchase_debit_note_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_purchase_debit_note_totals();

CREATE TRIGGER trigger_recalculate_purchase_debit_note_settlements AFTER INSERT OR DELETE OR UPDATE ON public.purchase_debit_note_settlements FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_purchase_debit_note_settlements();

CREATE TRIGGER trigger_update_account_balance_on_debit_note_refund AFTER INSERT OR DELETE OR UPDATE ON public.purchase_debit_note_settlements FOR EACH ROW EXECUTE FUNCTION public.update_account_balance_on_debit_note_refund();

CREATE TRIGGER trigger_validate_purchase_debit_note_settlements AFTER INSERT OR UPDATE ON public.purchase_debit_note_settlements FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_debit_note_settlements();

CREATE TRIGGER trigger_log_purchase_debit_note_changes AFTER INSERT OR UPDATE ON public.purchase_debit_notes FOR EACH ROW EXECUTE FUNCTION public.log_purchase_debit_note_changes();

CREATE TRIGGER trigger_update_purchase_debit_notes_updated_at BEFORE UPDATE ON public.purchase_debit_notes FOR EACH ROW EXECUTE FUNCTION public.update_purchase_debit_notes_updated_at();

CREATE TRIGGER trigger_recalculate_purchase_invoice_totals AFTER INSERT OR DELETE OR UPDATE ON public.purchase_invoice_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_purchase_invoice_totals();

CREATE TRIGGER trigger_update_purchase_invoice_items_updated_at BEFORE UPDATE ON public.purchase_invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_purchase_invoice_items_updated_at();

CREATE TRIGGER trigger_recalculate_purchase_invoice_totals_withholdings AFTER INSERT OR DELETE OR UPDATE ON public.purchase_invoice_withholdings FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_purchase_invoice_totals();

CREATE TRIGGER trigger_log_purchase_invoice_changes AFTER INSERT OR UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.log_purchase_invoice_changes();

CREATE TRIGGER trigger_revert_inventory_on_purchase_invoice_cancellation AFTER UPDATE ON public.purchase_invoices FOR EACH ROW WHEN (((new.status = 'cancelled'::text) AND (old.status <> 'cancelled'::text))) EXECUTE FUNCTION public.revert_inventory_on_purchase_invoice_cancellation();

CREATE TRIGGER trigger_update_inventory_on_purchase_invoice_payment AFTER UPDATE OF paid_amount ON public.purchase_invoices FOR EACH ROW WHEN (((new.paid_amount > old.paid_amount) AND (new.status = 'active'::text) AND (new.is_cancelled = false))) EXECUTE FUNCTION public.update_inventory_on_purchase_invoice_payment();

CREATE TRIGGER trigger_update_purchase_invoice_payment_status BEFORE INSERT OR UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_purchase_invoice_payment_status();

CREATE TRIGGER trigger_update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_purchase_invoices_updated_at();

CREATE TRIGGER trigger_recalculate_quote_totals AFTER INSERT OR DELETE OR UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_quote_totals();

CREATE TRIGGER trigger_update_quote_items_updated_at BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.update_quote_items_updated_at();

CREATE TRIGGER trigger_calculate_quote_expiration_date BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_quote_expiration_date();

CREATE TRIGGER trigger_log_quote_changes AFTER INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.log_quote_changes();

CREATE TRIGGER trigger_update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();

CREATE TRIGGER trigger_recalculate_received_payment_total AFTER INSERT OR DELETE OR UPDATE ON public.received_payment_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_received_payment_total();

CREATE TRIGGER trigger_log_received_payment_changes AFTER INSERT OR UPDATE ON public.received_payments FOR EACH ROW EXECUTE FUNCTION public.log_received_payment_changes();

CREATE TRIGGER trigger_update_account_balance_on_payment AFTER INSERT OR DELETE OR UPDATE ON public.received_payments FOR EACH ROW EXECUTE FUNCTION public.update_account_balance_on_payment();

CREATE TRIGGER trigger_update_received_payments_updated_at BEFORE UPDATE ON public.received_payments FOR EACH ROW EXECUTE FUNCTION public.update_received_payments_updated_at();

CREATE TRIGGER trigger_recalculate_recurring_invoice_totals AFTER INSERT OR DELETE OR UPDATE ON public.recurring_invoice_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_recurring_invoice_totals();

CREATE TRIGGER trigger_update_recurring_invoice_items_updated_at BEFORE UPDATE ON public.recurring_invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_recurring_invoice_items_updated_at();

CREATE TRIGGER trigger_update_next_generation_date BEFORE INSERT OR UPDATE ON public.recurring_invoices FOR EACH ROW EXECUTE FUNCTION public.update_next_generation_date();

CREATE TRIGGER trigger_update_recurring_invoices_updated_at BEFORE UPDATE ON public.recurring_invoices FOR EACH ROW EXECUTE FUNCTION public.update_recurring_invoices_updated_at();

CREATE TRIGGER trigger_recalculate_recurring_payment_totals AFTER INSERT OR DELETE OR UPDATE ON public.recurring_payment_items FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_recurring_payment_totals();

CREATE TRIGGER trigger_update_recurring_payment_items_updated_at BEFORE UPDATE ON public.recurring_payment_items FOR EACH ROW EXECUTE FUNCTION public.update_recurring_payment_items_updated_at();

CREATE TRIGGER trigger_set_next_recurring_payment_date BEFORE INSERT OR UPDATE ON public.recurring_payments FOR EACH ROW EXECUTE FUNCTION public.set_next_recurring_payment_date();

CREATE TRIGGER trigger_update_recurring_payments_updated_at BEFORE UPDATE ON public.recurring_payments FOR EACH ROW EXECUTE FUNCTION public.update_recurring_payments_updated_at();

CREATE TRIGGER trigger_validate_refund_items_total AFTER INSERT OR UPDATE ON public.refund_items FOR EACH ROW EXECUTE FUNCTION public.validate_refund_items_total();

CREATE TRIGGER trigger_update_refund_requests_updated_at BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.update_refund_requests_updated_at();

CREATE TRIGGER trigger_validate_approved_amount BEFORE INSERT OR UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.validate_approved_amount();

CREATE TRIGGER trigger_update_report_schedules_updated_at BEFORE UPDATE ON public.report_schedules FOR EACH ROW EXECUTE FUNCTION public.update_reports_updated_at();

CREATE TRIGGER trigger_update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_reports_updated_at();

CREATE TRIGGER trigger_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER trigger_update_taxes_updated_at BEFORE UPDATE ON public.taxes FOR EACH ROW EXECUTE FUNCTION public.update_taxes_updated_at();

CREATE TRIGGER sync_inventory_trigger AFTER INSERT OR UPDATE ON public.warehouse_inventory FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_inventory();

drop policy "Users can delete import files from their company folder" on "storage"."objects";

drop policy "Users can upload import files to their company folder" on "storage"."objects";

drop policy "Users can view import files from their company folder" on "storage"."objects";


  create policy "Users can delete import files from their company folder"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'product-imports'::text) AND ((storage.foldername(name))[1] = 'imports'::text) AND ((storage.foldername(name))[2] = 'products'::text) AND ((storage.foldername(name))[3] IN ( SELECT (profiles.company_id)::text AS company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



  create policy "Users can upload import files to their company folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'product-imports'::text) AND ((storage.foldername(name))[1] = 'imports'::text) AND ((storage.foldername(name))[2] = 'products'::text) AND ((storage.foldername(name))[3] IN ( SELECT (profiles.company_id)::text AS company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



  create policy "Users can view import files from their company folder"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'product-imports'::text) AND ((storage.foldername(name))[1] = 'imports'::text) AND ((storage.foldername(name))[2] = 'products'::text) AND ((storage.foldername(name))[3] IN ( SELECT (profiles.company_id)::text AS company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



