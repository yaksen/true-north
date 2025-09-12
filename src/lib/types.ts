

export type UserRole = 'admin' | 'manager' | 'member';
export type ProjectStatus = 'Planning' | 'In-Progress' | 'Completed' | 'On-Hold';
export type TaskStatus = 'To-Do' | 'In-Progress' | 'Done';
export type FinanceType = 'income' | 'expense';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted';
export type DiscountType = 'percentage' | 'flat';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';
export type ActivityRecordType = 
    | 'project_created'
    | 'project_updated'
    | 'task_created'
    | 'task_updated'
    | 'task_deleted'
    | 'finance_created'
    | 'finance_updated'
    | 'finance_deleted'
    | 'lead_created'
    | 'lead_updated'
    | 'lead_deleted'
    | 'category_created'
    | 'category_updated'
    | 'category_deleted'
    | 'service_created'
    | 'service_updated'
    | 'service_deleted'
    | 'package_created'
    | 'package_updated'
    | 'package_deleted'
    | 'note_added'
    | 'report_uploaded'
    | 'report_deleted'
    | 'member_invited'
    | 'member_removed'
    | 'project_deleted'
    | 'invoice_created'
    | 'invoice_updated'
    | 'invoice_deleted';


export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    photoURL?: string;
    lastLogin?: Date;
    projects: string[]; // List of project IDs the user is a member of
    createdAt: Date;
    updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerUid: string;
  private: boolean;
  members: string[]; // List of user UIDs
  currency: 'LKR' | 'USD';
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
    id: string;
    projectId: string;
    leadId?: string;
    title: string;
    description?: string;
    status: TaskStatus;
    dueDate?: Date;
    assigneeUid?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Finance {
    id: string;
    projectId: string;
    leadId?: string;
    type: FinanceType;
    amount: number;
    currency: string;
    description: string;
    date: Date;
    category?: string;
    recordedByUid: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Lead {
    id: string;
    projectId: string;
    name: string;
    email?: string;
    phone?: string;
    socials?: Record<string, string>;
    status: LeadStatus;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Category {
    id: string;
    projectId: string;
    name: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Service {
    id: string;
    projectId: string;
    name: string;
    categoryId: string;
    finishTime: string;
    priceLKR: number;
    priceUSD: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Discount {
    id: string;
    name: string;
    type: DiscountType;
    value: number; // Percentage or flat amount
}

export interface Package {
    id: string;
    projectId: string;
    name: string;
    description: string;
    services: string[]; // Array of service IDs
    priceLKR: number;
    priceUSD: number;
    duration: string;
    custom: boolean;
    discounts?: Discount[];
    createdAt: Date;
    updatedAt: Date;
}


export interface LineItem {
    id: string;
    description: string;
    quantity: number;
    priceLKR: number;
    priceUSD: number;
}

export interface Invoice {
    id: string;
    projectId: string;
    leadId: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    issueDate: Date;
    dueDate: Date;
    lineItems: LineItem[];
    discounts: Discount[];
    taxRate: number; // Percentage
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}


export interface ActivityRecord {
    id: string;
    projectId: string;
    type: ActivityRecordType;
    payload: Record<string, any>;
    actorUid: string;
    timestamp: Date;
}

export interface Note {
    id: string;
    projectId: string;
    authorUid: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Report {
    id: string;
    projectId: string;
    name: string;
    storagePath: string;
    uploadedByUid: string;
    uploadedAt: Date;
    sizeBytes: number;
    mimeType: string;
}

export interface CrmSettings {
    isSignupEnabled: boolean;
}
