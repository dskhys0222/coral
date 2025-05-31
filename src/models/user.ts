import mongoose from "mongoose";

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ユーザーID
 *         username:
 *           type: string
 *           description: ユーザー名
 *         password:
 *           type: string
 *           description: パスワード（ハッシュ化）
 *         refreshTokens:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: リフレッシュトークン
 *               tokenId:
 *                 type: string
 *                 description: トークンID
 *               deviceInfo:
 *                 type: string
 *                 description: デバイス情報
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *               lastUsed:
 *                 type: string
 *                 format: date-time
 */

// リフレッシュトークン情報のインターフェース
export interface RefreshTokenInfo {
  token: string;
  tokenId: string;
  deviceInfo?: string;
  createdAt: Date;
  lastUsed: Date;
}

// インターフェース定義
export interface UserDocument extends mongoose.Document {
  username: string;
  password: string;
  refreshTokens?: RefreshTokenInfo[];
}

// ユーザースキーマとモデル
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  refreshTokens: [
    {
      token: { type: String, required: true },
      tokenId: { type: String, required: true },
      deviceInfo: { type: String },
      createdAt: { type: Date, default: Date.now },
      lastUsed: { type: Date, default: Date.now },
    },
  ],
});

export const User = mongoose.model<UserDocument>("User", userSchema);
