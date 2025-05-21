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
 */
// インターフェース定義
export interface UserDocument extends mongoose.Document {
  username: string;
  password: string;
}

// ユーザースキーマとモデル
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

export const User = mongoose.model<UserDocument>("User", userSchema);
