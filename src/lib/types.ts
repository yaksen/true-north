

export type LeadState = 'new' | 'contacted' | 'interested' | 'lost' | 'converted';
export type UserRole = 'admin' | 'manager';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type PackageCategory = 'fixed' | 'custom';
export type DiscountType = 'percentage' | 'flat';
export type ProjectStatus = 'Planning' | 'In-Progress' | 'Completed' | 'On-Hold';

export type ActivityCategory = 'Sales' | 'Expenses' | 'Tasks' | 'Customer Service' | 'HR & Team';

export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    phoneNumber?: string;
    photoURL?: string;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CrmSettings {
    isSignupEnabled: boolean;
    maxLeads: number;
    maxTasks: number;
    counters?: {
        leadId: number;
        packageId: number;
    }
}

export interface Project extends BaseEntity {
    name: string;
    description?: string;
    ownerUid: string;
    private: boolean;
    members: string[];
    currency: 'LKR' | 'USD';
    status: ProjectStatus;
}

export interface Note {
    id: string;
    content: string;
    createdBy: string;
    authorName: string;
    authorPhotoURL?: string;
    createdAt: any;
}

export interface Attachment {
    id: string;
    url: string;
    description: string;
    fileName: string;
    uploadedBy: string;
    createdAt: any;
}


export interface Lead extends BaseEntity {
  leadId: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  socials: string[];
  state: LeadState;
  notes: string;
}

export interface Category extends BaseEntity {
  name: string;
  notes: string;
}

export interface Service extends BaseEntity {
  name: string;
  categoryId: string;
  finishingTime: string;
  priceLKR: number;
  priceUSD: number;
  notes: string;
}

export interface Discount {
  id: string;
  type: DiscountType;
  value: number;
  label: string;
}

export interface Package extends BaseEntity {
  packageId: string;
  name: string;
  description: string;
  serviceIds: string[];
  priceLKR: number;
  priceUSD: number;
  duration: string;
  category: PackageCategory;
  discounts?: Discount[];
}

export interface Action<T extends ActivityCategory = ActivityCategory> extends BaseEntity {
  category: T;
  status: string;
  assignedTo: string;
  date?: Date;
  deadline?: Date;
  notes?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  projectId?: string;
  parentTaskId?: string;
  details: T extends 'Sales' ? SalesDetails :
           T extends 'Expenses' ? ExpenseDetails :
           T extends 'Tasks' ? TaskDetails :
           T extends 'Customer Service' ? CustomerServiceDetails :
           T extends 'HR & Team' ? HRDetails :
           any;
}

export interface SalesDetails {
    leadId: string;
    productOrService: string;
    amount: number;
}

export interface ExpenseDetails {
    expenseType: 'Marketing' | 'Operations' | 'HR' | 'Other';
    amount: number;
}

export interface TaskDetails {
    description: string;
    relatedLeadId?: string;
}

export interface CustomerServiceDetails {
    leadId: string;
    issueType: 'Complaint' | 'Request' | 'Feedback';
}

export interface HRDetails {
    teamMember: string;
    actionType: 'Recruitment' | 'Training' | 'Performance Review';
}


export interface Transaction extends BaseEntity {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    date: Date;
    description: string;
    relatedInvoiceId?: string;
    relatedActionId?: string;
    projectId?: string;
}


export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  priceLKR: number;
  priceUSD: number;
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string;
  leadId: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  lineItems: LineItem[];
  discounts?: Discount[];
  taxRate: number;
  subtotalLKR: number;
  subtotalUSD: number;
totalLKR: number;
  totalUSD: number;
  notes?: string;
  paymentInstructions?: string;
  projectId?: string;
}
