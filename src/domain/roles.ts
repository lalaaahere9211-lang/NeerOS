import { UserRole } from '../types/domain';

export type DomainCapability =
  | 'VIEW_DASHBOARD'
  | 'CUSTOMER_VIEW'
  | 'CUSTOMER_MANAGE' // create, edit, deactivate
  | 'DELIVERY_ENTRY'
  | 'DELIVERY_VIEW_ALL'
  | 'PRODUCT_MANAGE'
  | 'STOCK_ADJUSTMENT'
  | 'JAR_AUDIT_ADJUSTMENT'
  | 'PAYMENT_ENTRY'
  | 'PAYMENT_REVERSAL'
  | 'BILL_GENERATE'
  | 'REPORTS_VIEW'
  | 'SETTINGS_MANAGE'
  | 'BACKUP_RESTORE';

const ROLE_CAPABILITIES: Record<UserRole, DomainCapability[]> = {
  OWNER: [
    'VIEW_DASHBOARD',
    'CUSTOMER_VIEW',
    'CUSTOMER_MANAGE',
    'DELIVERY_ENTRY',
    'DELIVERY_VIEW_ALL',
    'PRODUCT_MANAGE',
    'STOCK_ADJUSTMENT',
    'JAR_AUDIT_ADJUSTMENT',
    'PAYMENT_ENTRY',
    'PAYMENT_REVERSAL',
    'BILL_GENERATE',
    'REPORTS_VIEW',
    'SETTINGS_MANAGE',
    'BACKUP_RESTORE',
  ],
  OFFICE: [
    'VIEW_DASHBOARD',
    'CUSTOMER_VIEW',
    'CUSTOMER_MANAGE',
    'DELIVERY_ENTRY',
    'DELIVERY_VIEW_ALL',
    'STOCK_ADJUSTMENT',
    'JAR_AUDIT_ADJUSTMENT',
    'PAYMENT_ENTRY',
    'BILL_GENERATE',
    'REPORTS_VIEW',
  ],
  DELIVERY: [
    'CUSTOMER_VIEW',
    'DELIVERY_ENTRY',
    'PAYMENT_ENTRY',
  ],
};

export function hasCapability(role: UserRole, capability: DomainCapability): boolean {
  const capabilities = ROLE_CAPABILITIES[role];
  return capabilities ? capabilities.includes(capability) : false;
}
