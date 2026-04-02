export type User = {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  avatar?: string | null;
  createdAt?: string;
  passwordUpdatedAt?: string | null;
  twoFactorEnabled?: boolean;
  googleLinked?: boolean;
  googleEmail?: string | null;
};
