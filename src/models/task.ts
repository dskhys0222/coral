import mongoose from "mongoose";

/**
 * @openapi
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: タスクID
 *         username:
 *           type: string
 *           description: ユーザー名
 *         encryptedData:
 *           type: string
 *           description: 暗号化データ
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 作成日時
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新日時
 */
export interface TaskDocument extends mongoose.Document {
  username: string;
  encryptedData: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new mongoose.Schema<TaskDocument>(
  {
    username: { type: String, required: true },
    encryptedData: { type: String, required: true },
  },
  {
    timestamps: true, // createdAt, updatedAt を自動付与
  },
);

export const Task = mongoose.model<TaskDocument>("Task", taskSchema);
