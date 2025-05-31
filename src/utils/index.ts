import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";

/**
 * エラーレスポンスを送信する関数
 * @param {object} res - レスポンスオブジェクト
 * @param {number} status - HTTPステータスコード
 * @param {string} message - エラーメッセージ
 * @param {Error} [err] - エラーオブジェクト（ログ出力用）
 */
export const sendError = (
  res: Response,
  status: number,
  message: string,
  err?: Error,
): Response => {
  if (err) {
    console.error(`Error (${status}): ${message}`, err);
  }
  return res.status(status).json({ message });
};

/**
 * リクエストデータのバリデーション
 * @param {object} req - リクエストオブジェクト
 * @param {object} res - レスポンスオブジェクト
 * @param {Array} fields - 必須フィールドの配列
 * @returns {boolean} バリデーション結果
 */
export const validateRequest = (
  req: Request,
  res: Response,
  fields: string[],
): boolean => {
  for (const field of fields) {
    if (!req.body[field]) {
      sendError(res, 400, `${field} is required`);
      return false;
    }
  }
  return true;
};

/**
 * 暗号学的に安全なランダム文字列を生成
 * @param length バイト長
 * @returns ランダム文字列（hex形式）
 */
export const generateSecureRandomString = (length = 32) => {
  return randomBytes(length).toString("hex");
};
