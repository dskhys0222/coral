import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";

/**
 * エラーレスポンスを送信する関数
 * @param {object} res - レスポンスオブジェクト
 * @param {number} status - HTTPステータスコード
 * @param {string} message - エラーメッセージ
 * @param {Error | object} [err] - エラーオブジェクトまたは詳細情報（ログ出力用）
 */
export const sendError = (
  res: Response,
  status: number,
  message: string,
  err?: Error | object,
): Response => {
  if (err) {
    console.error(`Error (${status}): ${message}`, err);
  }

  // バリデーションエラーの詳細情報がある場合は含める
  const responseBody: { message: string; details?: unknown } = { message };
  if (err && typeof err === "object" && "details" in err) {
    responseBody.details = err.details;
  }

  return res.status(status).json(responseBody);
};

/**
 * 暗号学的に安全なランダム文字列を生成
 * @param length バイト長
 * @returns ランダム文字列（hex形式）
 */
export const generateSecureRandomString = (length = 32) => {
  return randomBytes(length).toString("hex");
};
