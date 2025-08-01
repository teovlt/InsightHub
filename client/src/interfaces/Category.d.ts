export interface CategoryInterface {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  createdAt: Date;
  stats: StatInterface[];
}
