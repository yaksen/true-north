
export type UserRole = 'admin' | 'manager' | 'member';
export type ProjectStatus = 'Planning' | 'In-Progress' | 'Completed' | 'On-Hold';
export type TaskStatus = 'To-Do' | 'In-Progress' | 'Done';
export type FinanceType = 'income' | 'expense';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted';

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
    description: string;
    date: Date;
    category?: string;
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


export interface Product {
    id:string;
    projectId: string;
    // ... other fields
}

export interface Package {
    id: string;
    projectId: string;
    // ... other fields
}

export interface Record {
    id: string;
    projectId: string;
    // ... other fields
}

export interface Report {
    id: string;
    projectId: string;
    // ... other fields
}

export interface CrmSettings {
    isSignupEnabled: boolean;
}
