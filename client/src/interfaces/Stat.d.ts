export interface StatInterface {
  _id: string;
  name: string;
  description?: string;
  value: string;
  unit?: string;
  hided: boolean;
  categoryId: string; // Category ID
  user: string; // User ID
  createdAt: Date;
}
