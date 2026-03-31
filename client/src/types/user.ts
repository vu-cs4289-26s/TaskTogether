export type User = {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  createdAt?: string;
  avatar?: string | null;
  timezone?: string | null;
  timezoneAuto?: boolean;
};