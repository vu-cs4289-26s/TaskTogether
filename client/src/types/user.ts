export type User = {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  avatar?: string | null;
  createdAt?: string;
<<<<<<< HEAD
  avatar?: string | null;
  timezone?: string | null;
  timezoneAuto?: boolean;
=======
  passwordUpdatedAt?: string | null;
  twoFactorEnabled?: boolean;
>>>>>>> 15f88a7d0137f480220f7edd8ffa355f2c3a1fac
};