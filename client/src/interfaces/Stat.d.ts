import { IntegrationInterface } from "./Integration";

export type StatType = "number" | "duration" | "text";

export type GoalDirection = "increase" | "decrease";

export interface StatGoal {
  target: number;
  deadline?: string;
  direction?: GoalDirection; // missing on goals saved before directions existed: "increase"
  start?: number;
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

// Change over the last 7 days; better follows the goal direction (lower is better for "decrease" goals)
export interface WeekChange {
  from: number;
  to: number;
  delta: number;
  percent: number | null;
  better: boolean;
}

export type GoalPaceStatus = "reached" | "on_track" | "behind" | "no_deadline" | "stalled";

export interface OverviewMoment {
  kind: "record" | "badge";
  at: string;
  // record
  value?: number;
  previous?: number;
  stat?: Pick<StatWithCategory, "_id" | "name" | "unit" | "type" | "categoryId">;
  // badge
  achievementId?: string;
  tier?: "bronze" | "silver" | "gold";
  icon?: string;
}

export interface StatsOverview {
  week: { values: number; activeDays: number; streak: { current: number; best: number; today: boolean } };
  highlights: (StatWithCategory & { week: WeekChange })[];
  pinned: (StatWithCategory & { history: StatHistoryPoint[]; week: WeekChange | null; best: number | null })[];
  goals: (StatWithCategory & { pace: { status: GoalPaceStatus; eta: string | null } })[];
  toLog: (StatWithCategory & { daysAgo: number })[];
  moments: OverviewMoment[];
  nextBadge: { id: string; icon: string; progress: number; next: { tier: "bronze" | "silver" | "gold"; threshold: number } } | null;
  onboarding: { connectedApps: number; stats: number; goals: number; done: boolean };
}

export type DashboardPeriod = "7d" | "30d" | "90d" | "1y";

export interface ActivityDay {
  date: string; // YYYY-MM-DD in the viewer's time zone
  manual: number;
  synced: number;
}

export interface CategoryActivity extends StatCategoryRef {
  stats: number;
  updates: number;
}

export interface StatsAnalytics {
  period: DashboardPeriod;
  activity: ActivityDay[];
  categories: CategoryActivity[];
}
