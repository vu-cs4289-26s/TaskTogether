export interface WikiSection {
    id: string;
    slug: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: { id: string; name: string } | null;
}
