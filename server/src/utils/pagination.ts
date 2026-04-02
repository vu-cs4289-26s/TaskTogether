import { Request } from 'express';

export const parsePagination = (query: Request['query'], maxLimit: number = 50) : { page: number, limit: number, skip: number } => {
    const page = Math.max(1, parseInt(query.page as string) || 1);
      const limit = Math.min(
        maxLimit,
        Math.max(1, parseInt(query.limit as string) || 20),
      );
      const skip = (page - 1) * limit;
      return { page, limit, skip };
}