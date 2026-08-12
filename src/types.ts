export type DepartmentType = 'SALES' | 'MANAGEMENT';

export type RoleType = 
  | 'Sales Associate' 
  | 'Sales Assistant/Picker' 
  | 'Confirmation Team' 
  | 'Customer Care' 
  | 'CEO' 
  | 'Pharmacist' 
  | 'Supervisor';

export type LogPermission = 
  | 'online_orders'
  | 'sales_invoice_error'
  | 'customer_complaint'
  | 'picker_error'
  | 'customer_care_offense'
  | 'confirmation_error';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  department: DepartmentType;
  role: RoleType;
  createdAt: string;
  permissions?: LogPermission[];
}

export const ALL_PERMISSIONS: LogPermission[] = [
  'online_orders',
  'sales_invoice_error',
  'customer_complaint',
  'picker_error',
  'customer_care_offense',
  'confirmation_error'
];

export const PERMISSION_LABELS: Record<LogPermission, string> = {
  online_orders: 'Online Customer Orders Log',
  sales_invoice_error: 'Sales Invoice Error Log',
  customer_complaint: 'Customer Complaint Log',
  picker_error: 'Picker Mistakes Log',
  customer_care_offense: 'Customer Care Offense Log',
  confirmation_error: 'Confirmation Error Log'
};

/**
 * Helper to check whether a user has privilege for a specific module/log.
 * Admin and Management users have full access unless specifically overridden.
 */
export function hasPermission(profile: UserProfile | null, perm: LogPermission): boolean {
  if (!profile) return false;

  // Master Admin or Management default access
  if (
    profile.uid === '8jCULC5vGBey4j7gNgZ4FwXRas63' || 
    profile.department === 'MANAGEMENT' || 
    ['CEO', 'Pharmacist', 'Supervisor'].includes(profile.role)
  ) {
    if (!profile.permissions || profile.permissions.length === 0) return true;
  }

  // If explicit permissions list exists, check membership
  if (Array.isArray(profile.permissions) && profile.permissions.length > 0) {
    return profile.permissions.includes(perm);
  }

  // Fallback defaults by role if permissions have not been explicitly modified by Admin yet
  switch (profile.role) {
    case 'Confirmation Team':
      return perm === 'confirmation_error' || perm === 'online_orders';
    case 'Sales Assistant/Picker':
      return perm === 'picker_error' || perm === 'online_orders';
    case 'Sales Associate':
      return perm === 'sales_invoice_error' || perm === 'online_orders';
    case 'Customer Care':
      return perm === 'customer_care_offense' || perm === 'customer_complaint' || perm === 'online_orders';
    default:
      return true; // Default allow all if unmapped
  }
}

export type LogType = 
  | 'sales_invoice_error' 
  | 'customer_complaint' 
  | 'picker_error' 
  | 'customer_care_offense' 
  | 'confirmation_error';

export interface BaseLog {
  id: string;
  logType: LogType;
  loggedBy: string;
  loggedByName: string;
  createdAt: string;
  status: 'Pending' | 'Resolved' | 'Investigating';
  resolvedAt?: string;
  notes?: string;
}

export interface SalesInvoiceErrorLog extends BaseLog {
  logType: 'sales_invoice_error';
  salesAssociate: string; // Name of Sales Associate who committed error
  invoiceNumber: string;
  errorDescription: string;
  financialImpact: number; // e.g. error in dollars/currency
  errorType: 
    | 'Invoicing a different product from what was presented.'
    | 'Invoicing a different strength of a drug from what was presented.'
    | 'Overbilling.'
    | 'Underbilling.'
    | 'Failing to invoice an item that was presented by the customer.'
    | 'Scanning, resulting in an incorrect item being invoiced (Inventory Errors during item creation)'
    | 'Others';
}

export interface CustomerComplaintLog extends BaseLog {
  logType: 'customer_complaint';
  customerName: string;
  customerPhone?: string;
  invoiceNumber?: string;
  complaintDetails: string;
  severity: 'Low' | 'Medium' | 'High';
  category: 'Delay' | 'Wrong Item Delivered' | 'Bad Attitude' | 'Damaged Product' | 'Billing Error' | 'Other';
  responsibleStaff?: string; // staff dropdown
}

export interface PickerErrorLog extends BaseLog {
  logType: 'picker_error';
  pickerName: string; // Sales Assistant / Picker Name
  orderId: string;
  errorDetails: string;
  errorCategory: 
    | 'Picking very short-dated products for customers without obtaining their confirmation.'
    | 'Picking damaged products.'
    | 'Picking the wrong product.'
    | 'Failure to document out-of-stock items after picking.'
    | 'Documenting available items as unavailable.'
    | 'Failure to label the trolley properly after picking.'
    | 'Abandoning the trolley in the showroom after picking.'
    | 'Failure to record the finish time, invoice number, invoicing staff, and out-of-stock sign-out in the order book.'
    | 'Failure to submit the invoice number to Customer Care or the appropriate personnel after picking, resulting in the invoice not being shared with the customer.';
}

export interface CustomerCareOffenseLog extends BaseLog {
  logType: 'customer_care_offense';
  agentName: string; // Customer Care Agent Name
  offenseDetails: string;
  severity: 'Minor' | 'Major' | 'Critical';
  offenseType: 
    | 'Delayed processing of customer orders.'
    | 'Failure to follow up with customers after receiving their orders.'
    | 'Customer Care desk left vacant, resulting in customers being left waiting or unattended to'
    | 'Others';
}

export interface ConfirmationErrorLog extends BaseLog {
  logType: 'confirmation_error';
  confirmationStaffName: string; // Confirmation Team member
  invoiceOrOrderId: string;
  errorDetails: string;
  errorCategory: 
    | 'Over-supplying'
    | 'Under-supplying'
    | 'Failure to supply invoiced items due to oversight'
    | 'Supplying the wrong product Brand'
    | 'Supplying the wrong strength'
    | 'Supplying the wrong size or pack presentation'
    | 'Failure to write a "DO NOT FORGET COLD CHAIN" note on the invoice for cold-chain products'
    | 'Improper or no labelling and numbering of cartons after confirmation'
    | 'Improper packing of products inside cartons, leading to product damage and customer complaints'
    | 'Others';
}

export interface OnlineOrderLog {
  id: string;
  loggedBy: string;
  loggedByName: string;
  createdAt: string; // ISO string
  staffName: string; // Staff Name attending to the order
  customerName: string; // Customer Name
  startTime: string; // Start time string, e.g. "09:30 AM" or "2026-08-04T09:30"
  finishTime: string; // Finish time of order, e.g. "09:55 AM"
  invoiceNumber: string; // Invoice number
  invoicerName: string; // Name of the invoicer
  outOfStockItems?: string; // Name of out of stock item(s)
  durationMinutes?: number; // Handling duration in minutes
  status?: 'Completed' | 'In Progress' | 'Pending' | 'Cancelled';
  channel?: 'WhatsApp' | 'Phone Call' | 'Website / Portal' | 'Walk-in / Showroom' | 'Other';
  notes?: string;
}

export type LogRecord = 
  | SalesInvoiceErrorLog 
  | CustomerComplaintLog 
  | PickerErrorLog 
  | CustomerCareOffenseLog 
  | ConfirmationErrorLog;
