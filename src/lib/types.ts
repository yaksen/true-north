export type LeadState = 'new' | 'contacted' | 'interested' | 'lost' | 'converted';

export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: Date;
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
