export interface UserInterface {
  _id: string;
  // Admin users list only: what the user tracks and when they last logged a value
  activity?: { stats: number; apps: number; lastActivity: string | null };
  name: string;
  forename: string;
  username: string;
  fullname: string;
  email: string;
  password?: string;
  role: string;
  createdAt: Date;
  updatedAt?: Date;
  __v?: number;
  avatar?: string;
  auth_type: string;
}
