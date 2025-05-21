import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import CONFIG from "../config";
import { sendError } from "../utils";

// カスタムリクエストインターフェース
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * JWT認証ミドルウェア
 * @param req リクエストオブジェクト
 * @param res レスポンスオブジェクト
 * @param next 次のミドルウェア関数
 */
export function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    sendError(res, 401, "No token");
    return;
  }

  jwt.verify(token, CONFIG.jwt.secret, (err, user) => {
    if (err) {
      sendError(res, 403, "Invalid token", err);
      return;
    }
    req.user = user as JwtPayload;
    next();
  });
}
