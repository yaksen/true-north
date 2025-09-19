

import { CurrencyCode } from "@/context/CurrencyContext";

export type UserRole = 'admin' | 'manager' | 'member';
export type ProjectRole = 'owner' | 'editor' | 'viewer';
export type ProjectType = 'Active' | 'Passive' | 'Fun' | 'Sub';
export type TaskStatus = 'Call' | 'Meeting' | 'Project';
export type FinanceType = 'income' | 'expense';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted';
export type ChannelStatus = 'new' | 'active' | 'inactive' | 'closed';
export type DiscountType = 'percentage' | 'flat';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void' | 'partial' | 'unpaid';
export type PaymentMethod = 'cash' | 'bank transfer' | 'online' | 'other';
export type WalletTransactionType = 'add' | 'expense';
export type TaskTemplateSlot = 'morning' | 'midday' | 'night';
export type VaultItemType = 'note' | 'link' | 'prompt';

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

export interface Presence {
    online: boolean;
    lastSeen: Date;
}

export interface ProjectMember {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    role: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerUid: string; // Remains for top-level ownership check
  private: boolean;
  members: ProjectMember[];
  memberUids: string[]; // For querying
  currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
  type: ProjectType;
  emoji?: string;
  parentProjectId?: string;
  starred?: boolean;
  createdAt: Date;
  updatedAt: Date;
  timezone?: string;
}

export interface Task {
    id: string;
    projectId: string;
    parentTaskId?: string;
    leadId?: string;
    title: string;
    description?: string;
    slot: TaskTemplateSlot;
    completed: boolean;
    dueDate?: Date;
    assigneeUid?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskTemplate {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    slot: TaskTemplateSlot;
    assigneeUids: string[];
    daysOfWeek: number[]; // 0 for Sunday, 1 for Monday, etc.
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Finance {
    id: string;
    projectId: string;
    leadId?: string;
    channelId?: string;
    invoiceId?: string;
    type: FinanceType;
    amount: number; // The amount paid
    currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
    description: string;
    date: Date;
    category?: string;
    recordedByUid: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PersonalExpenseCategory {
    id: string;
    userId: string;
    name: string;
    emoji: string;
    color?: string;
    createdAt: Date;
    updatedAt: Date;
}


export interface PersonalExpense {
    id: string;
    userId: string;
    title: string;
    category: string; // Deprecated, use categoryId instead
    categoryId?: string;
    amount: number;
    currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
    date: Date;
    note?: string;
    paidFromWallet: boolean;
    createdAt: Date;
}


export interface SocialLink {
    platform: string;
    url: string;
}

export interface Lead {
    id: string;
    projectId: string;
    name: string;
    email?: string;
    phone?: string;
    socials?: SocialLink[];
    status: LeadStatus;
    notes?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Channel {
    id: string;
    projectId: string;
    name: string;
    platform: string;
    url?: string;
    status: ChannelStatus;
    notes?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Vendor {
    id: string;
    projectId: string;
    name: string;
    serviceType: string;
    contactName?: string;
    email?: string;
    phone?: string;
    notes?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Category {
    id: string;
    projectId: string;
    name: string;
    notes?: string;
    sku?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Service {
    id: string;
    projectId: string;
    name: string;
    categoryId: string;
    finishTime: string;
    price: number;
    currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
    notes?: string;
    sku?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Product {
    id: string;
    projectId: string;
    name: string;
    categoryId: string;
    quantity: number;
    price: number;
    currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
    notes?: string;
    sku?: string;
    starred?: boolean;
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
    products: string[]; // Array of product IDs
    price: number;
    currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
    duration: string;
    custom: boolean;
    discounts?: Discount[];
    discountPercentage: number;
    sku?: string;
    imageUrl?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}


export interface LineItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
}

export interface Payment {
    id: string;
    amount: number;
    date: Date;
    method: PaymentMethod;
    note?: string;
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
    payments: Payment[];
    notes?: string;
    starred?: boolean;
    createdAt: Date;
    updatedAt: Date;
}


export type ActivityRecordType = 
  | 'project_created' | 'project_updated' | 'project_deleted'
  | 'task_created' | 'task_updated' | 'task_deleted'
  | 'finance_created' | 'finance_updated' | 'finance_deleted'
  | 'lead_created' | 'lead_updated' | 'lead_deleted'
  | 'channel_created' | 'channel_updated' | 'channel_deleted'
  | 'category_created' | 'category_updated' | 'category_deleted'
  | 'service_created' | 'service_updated' | 'service_deleted'
  | 'product_created' | 'product_updated' | 'product_deleted'
  | 'package_created' | 'package_updated' | 'package_deleted'
  | 'note_added' | 'report_uploaded' | 'report_deleted'
  | 'invoice_created' | 'invoice_updated' | 'invoice_deleted'
  | 'member_invited' | 'member_added' | 'member_removed'
  | 'payment_added';

export interface ActivityRecord {
    id: string;
    projectId: string;
    type: ActivityRecordType;
    payload: Record<string, any>;
    actorUid: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Note {
    id: string;
    projectId: string;
    authorUid: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface AIPrompt {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    category?: string;
    role?: string;
    task?: string;
    constraints?: string;
    examples?: string;
    instructions?: string;
    outputFormat?: string;
    body: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}


export interface Report {
    id: string;
    projectId: string;
    name: string;
    storagePath: string;
    uploadedByUid: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CrmSettings {
    isSignupEnabled: boolean;
    revenueGoal?: number;
    goalCurrency?: CurrencyCode;
    goalReward?: string;
    goalRewardEmoji?: string;
    currency?: 'USD' | 'LKR' | 'EUR' | 'GBP';
}


export interface PersonalWallet {
    id: string;
    userId: string;
    balance: number;
    currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
    createdAt: Date;
    updatedAt: Date;
}

export interface WalletTransaction {
    id: string;
    walletId: string;
    amount: number; // Always positive
    type: WalletTransactionType;
    sourceProjectId?: string; // For 'add' type
    destinationProjectId?: string; // For 'expense' type when sent to a project
    expenseId?: string; // For 'expense' type when paying for a personal expense
    note?: string;
    timestamp: Date;
}

export interface VaultFolder {
    id: string;
    userId: string;
    name: string;
    emoji: string;
    parentId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface VaultItem {
    id: string;
    userId: string;
    folderId: string;
    type: VaultItemType;
    title: string;
    content?: string;
    description?: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    // Prompt fields
    role?: string;
    task?: string;
    constraints?: string;
    examples?: string;
    instructions?: string;
    outputFormat?: string;
}
