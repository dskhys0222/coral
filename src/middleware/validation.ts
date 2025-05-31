import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { sendError } from "../utils";

/**
 * Zodスキーマを使ってリクエストボディをバリデーションするミドルウェア
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      sendError(res, 400, "バリデーションエラー", {
        details: errors,
      });
      return;
    }

    // バリデーション済みのデータでリクエストボディを置き換え
    req.body = result.data;
    next();
  };
}

/**
 * Zodスキーマを使ってリクエストパラメータをバリデーションするミドルウェア
 */
export function validateParams<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      sendError(res, 400, "パラメータバリデーションエラー", {
        details: errors,
      });
      return;
    }

    // バリデーション済みのデータでリクエストパラメータを置き換え
    req.params = result.data;
    next();
  };
}

/**
 * Zodスキーマを使ってクエリパラメータをバリデーションするミドルウェア
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      sendError(res, 400, "クエリパラメータバリデーションエラー", {
        details: errors,
      });
      return;
    }

    // バリデーション済みのデータでクエリパラメータを置き換え
    req.query = result.data;
    next();
  };
}
