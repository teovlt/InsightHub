import { IntegrationInterface } from "./Integration";

export type StatType = "number" | "duration" | "text";

export interface StatGoal {
  target: number;
  deadline?: string;
}

export interface StatInterface {
  _id: string;
  name: string;
  description?: string;
  value: string;
  unit?: string;
  hided: boolean;
  integrationId?: IntegrationInterface["_id"];
  integrationStatId?: string;
  categoryId: string; // Category ID
  user: string; // User ID
  createdAt: Date;
  updatedAt?: string;
  type?: StatType;
  numericValue?: number | null;
  pinned?: boolean;
  goal?: StatGoal;
}

export interface StatHistoryPoint {
  _id: string;
  value: string;
  numericValue: number | null;
  createdAt: string;
}

// Stats returned by /stats/overview carry their category instead of its id
export interface StatCategoryRef {
  _id: string;
  name: string;
  color: string;
  icon: string;
}

export type StatWithCategory = Omit<StatInterface, "categoryId"> & { categoryId: StatCategoryRef };

export interface StatsOverview {
  pinned: (StatWithCategory & { history: StatHistoryPoint[] })[];
  goals: StatWithCategory[];
  recent: (StatWithCategory & { current: boolean })[];
}
