import mongoose from "mongoose";

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
