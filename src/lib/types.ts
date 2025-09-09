

export type LeadState = 'new' | 'contacted' | 'interested' | 'lost' | 'converted';
export type ActionStatus = 'pending' | 'in-progress' | 'completed';
export type ActionPriority = 'low' | 'medium' | 'high';
export type UserRole = 'admin' | 'manager';
export type ActionType = 'call' | 'visit' | 'sale' | 'follow-up' | 'other';
export type DiscountType = 'percentage' | 'flat';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: Date;
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
}

export interface SocialLink {
    id: string;
    platform: string;
    url: string;
    icon: string;
}

export interface Lead extends BaseEntity {
  name: string;
  phoneNumbers: string[];
  emails: string[];
  socialLinks?: SocialLink[];
  socials: string[];
  state: LeadState;
  notes: string;
  tags?: string[];
  lastContacted?: Date;
  totalSpent?: number;
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
  name: string;
  description: string;
  serviceIds: string[];
  priceLKR: number;
  priceUSD: number;
  duration: string;
  discounts?: Discount[];
}

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Action extends BaseEntity {
  title: string;
  description?: string;
  status: ActionStatus;
  priority: ActionPriority;
  type: ActionType;
  leadId?: string; // Links action to a customer/lead
  assignedTo?: string; // User ID of the assignee
  relatedInvoiceId?: string;
  tags?: string[];
  dueDate?: Date;
  subtasks?: Subtask[];
  obstacles?: string[];
  tips?: string[];
  updatedAt: Date;
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
  taxRate: number; // as a percentage, e.g., 15 for 15%
  subtotalLKR: number;
  subtotalUSD: number;
  totalLKR: number;
  totalUSD: number;
  notes?: string;
  paymentInstructions?: string;
}

export interface PdfTemplate {
    id: string;
    name: string;
    htmlTemplate: string;
    cssOverrides?: string;
    headerLogoUrl?: string;
    brandColor?: string;
    defaultSize: 'A4' | 'card';
}
