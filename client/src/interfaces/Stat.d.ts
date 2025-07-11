import { IntegrationInterface } from "./Integration";

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
}
