

export type LeadState = 'new' | 'contacted' | 'interested' | 'lost' | 'converted';
export type TaskStatus = 'pending' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type UserRole = 'admin' | 'manager';

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
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CrmSettings {
    isSignupEnabled: boolean;
    maxLeads: number;
    maxTasks: number;
}

export interface Lead extends BaseEntity {
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

export interface Package extends BaseEntity {
  name: string;
  description: string;
  serviceIds: string[];
  priceLKR: number;
  priceUSD: number;
  duration: string;
}

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  subtasks?: Subtask[];
  obstacles?: string[];
  tips?: string[];
}
