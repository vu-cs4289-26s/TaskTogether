import { Response } from 'express';

export const sendSuccess = (res: Response, data: unknown = null, statusCode = 200) => {
  res.status(statusCode).json({ status: 'success', data });
};

export const sendError = (res: Response, statusCode: number, code: string, message: string) => {
  res.status(statusCode).json({
    status: 'error',
    error: { code, message },
  });
};

export const sendPaginated = (
  res: Response,
  data: unknown,
  meta: { page: number; limit: number; total: number },
) => {
  res.json({
    status: 'success',
    data,
    meta: { ...meta, totalPages: Math.ceil(meta.total / meta.limit) },
  });
};
