
export type UserRole = 'admin' | 'manager' | 'member';
export type ProjectStatus = 'Planning' | 'In-Progress' | 'Completed' | 'On-Hold';

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    photoURL?: string;
    lastLogin?: Date;
    projects: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerUid: string;
  private: boolean;
  members: string[];
  currency: 'LKR' | 'USD';
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    status: 'todo' | 'in-progress' | 'done';
    dueDate?: Date;
    assigneeUid?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FinanceRecord {
    id: string;
    projectId: string;
    type: 'income' | 'expense';
    amount: number;
    currency: 'LKR' | 'USD';
    description: string;
    date: Date;
    leadId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Lead {
    id: string;
    projectId: string;
    name: string;
    email?: string;
    phone?: string;
    socials?: string[];
    status: 'new' | 'contacted' | 'qualified' | 'lost' | 'won';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductCategory {
    id: string;
    projectId: string;
    name: string;
}

export interface Product {
    id: string;
    projectId: string;
    name: string;
    categoryId: string;
    priceLKR: number;
    priceUSD: number;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Package {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    productIds: string[];
    priceLKR: number;
    priceUSD: number;
    isCustom: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Record {
    id: string;
    projectId: string;
    name: string;
    type: 'document' | 'spreadsheet' | 'presentation' | 'other';
    url: string; // link to file in storage or external source
    createdAt: Date;
    updatedAt: Date;
}

export interface Report {
    id: string;
    projectId: string;
    name: string;
    type: 'financial' | 'performance' | 'custom';
    url: string; // link to generated PDF in storage
    createdAt: Date;
    updatedAt: Date;
}
