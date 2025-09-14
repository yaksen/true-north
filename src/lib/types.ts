

import { CurrencyCode } from "@/context/CurrencyContext";

export type UserRole = 'admin' | 'manager' | 'member';
export type ProjectType = 'Active' | 'Passive' | 'Fun' | 'Sub';
export type TaskStatus = 'Call' | 'Meeting' | 'Project';
export type FinanceType = 'income' | 'expense';
export type LeadStatus = 'new' | 'contacted', 'qualified', 'lost', 'converted';
export type ChannelStatus = 'new' | 'active' | 'inactive' | 'closed';
export type DiscountType = 'percentage' | 'flat';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void' | 'partial' | 'unpaid';
export type PaymentMethod = 'cash' | 'bank transfer' | 'online' | 'other';
export type WalletTransactionType = 'add' | 'expense';
export type NotificationType =
  | 'message'
  | 'mention'
  | 'invoice'
  | 'task_assigned'
  | 'payment_received'
  | 'project_invite';
export type ChatType = 'direct' | 'project';
export type TaskTemplateSlot = 'morning' | 'midday' | 'night';

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

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerUid: string;
  private: boolean;
  members: string[]; // List of user UIDs
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
    status: TaskStatus;
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
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Finance {
    id: string;
    projectId: string;
    leadId?: string;
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

export interface PersonalExpense {
    id: string;
    userId: string;
    title: string;
    category: string;
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


export interface ActivityRecord {
    id: string;
    projectId: string;
    type: string;
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
    expenseId?: string; // For 'expense' type
    note?: string;
    timestamp: Date;
}

// Chat & Notification types
export interface Chat {
    id: string;
    type: ChatType;
    projectId?: string;
    members: string[];
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Date;
    };
    updatedAt: Date;
    createdAt: Date;
    // For UI purposes
    title?: string;
    photoURL?: string;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    createdAt: Date;
    readBy: { [userId: string]: Date };
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    isRead: boolean;
    createdAt: Date;
}
