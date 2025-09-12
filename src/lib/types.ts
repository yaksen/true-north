

export type UserRole = 'admin' | 'manager' | 'member';
export type ProjectStatus = 'Planning' | 'In-Progress' | 'Completed' | 'On-Hold';

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

// Define other types as they are built
export interface Task {
    id: string;
    projectId: string;
    // ... other fields
}

export interface FinanceRecord {
    id: string;
    projectId: string;
    // ... other fields
}

export interface Lead {
    id: string;
    projectId: string;
    // ... other fields
}

export interface Product {
    id: string;
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
generating a new report
    projectId: string;
    // ... other fields
}
