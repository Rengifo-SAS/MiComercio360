// Export specific types to avoid conflicts
export type { TransactionType, CreateTransactionData } from './accounts';
export type { CostCenter, CreateCostCenterData } from './cost-centers';
export type { Customer, CreateCustomerData } from './customers';
export type { Numeration, CreateNumerationData } from './numerations';
export type { PaymentMethod, PaymentGateway, CreatePaymentMethodData } from './payment-methods';
export type { PrintTemplate, CreatePrintTemplateData } from './print-templates';
export type { Product as BaseProduct, CreateProductData } from './products';
export type { RefundRequest, CreateRefundRequestData } from './refunds';
export type { Sale, CreateSaleData, CreateSaleItemData, Product as SalesProduct } from './sales';
export type { Tax, CreateTaxData } from './taxes';
export type { UserProfile, CreateUserData, UpdateUserData, UserRole, UserStatus } from './users';

// Common types used across the application
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyEntity extends BaseEntity {
  company_id: string;
}
