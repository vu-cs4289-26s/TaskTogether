export interface WikiSection {
  id: string;
  slug: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: { id: string; name: string } | null;
}
