// Hub — маркетплейс заказов для монтажников

export type HubOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type HubResponseStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type HubCategory = 'slabotochka' | 'electrika' | 'svyaz' | 'videokontrol' | 'skud' | 'ops' | 'other';

export const HUB_CATEGORIES: Record<HubCategory, string> = {
  slabotochka: 'Слаботочные системы',
  electrika: 'Электрика',
  svyaz: 'Связь и интернет',
  videokontrol: 'Видеонаблюдение',
  skud: 'СКУД',
  ops: 'ОПС (пожарная сигнализация)',
  other: 'Другое',
};

export interface HubOrderFile {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface HubEstimateItem {
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

export interface HubAiEstimate {
  totalCost: number;
  items: HubEstimateItem[];
  currency: string;
  recommendedBudget: { min: number; max: number };
  summary: string;
}

export interface HubOrder {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userRating?: number;
  title: string;
  description: string;
  city: string;
  category: HubCategory;
  files: HubOrderFile[];
  aiEstimate: HubAiEstimate | null;
  status: HubOrderStatus;
  budget: { min: number; max: number };
  deadline: string;
  responseCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HubResponse {
  id: string;
  orderId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userRating?: number;
  message: string;
  proposedPrice: number;
  proposedDeadline: string;
  status: HubResponseStatus;
  creditsSpent: number;
  createdAt: Date;
}

export interface HubReview {
  id: string;
  orderId: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  rating: number;
  comment: string;
  role: 'contractor' | 'client';
  createdAt: Date;
}

export interface HubFilters {
  query?: string;
  city?: string;
  category?: HubCategory;
  budgetMin?: number;
  budgetMax?: number;
  status?: HubOrderStatus;
  sortBy?: 'newest' | 'budget_asc' | 'budget_desc' | 'deadline';
}
