import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import CONFIG from "../config";
import { sendError } from "../utils";

export interface JwtPayload {
  username: string;
  iat?: number;
  exp?: number;
}

export interface RefreshJwtPayload {
  username: string;
  tokenId: string; // リフレッシュトークンの一意識別子
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * JWT認証ミドルウェア（アクセストークン用）
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

/**
 * リフレッシュトークン検証関数
 * @param token リフレッシュトークン
 * @returns 検証結果のペイロードまたはnull
 */
export function verifyRefreshToken(token: string): RefreshJwtPayload | null {
  try {
    return jwt.verify(token, CONFIG.jwt.refreshSecret) as RefreshJwtPayload;
  } catch {
    return null;
  }
}
