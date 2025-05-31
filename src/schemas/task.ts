import { z } from "zod";

/**
 * タスク作成用のスキーマ
 */
export const createTaskSchema = z.object({
  encryptedData: z
    .string()
    .min(1, "暗号化データが必要です")
    .max(10000, "暗号化データは10000文字以内である必要があります"),
});

/**
 * タスク更新用のスキーマ
 */
export const updateTaskSchema = z.object({
  encryptedData: z
    .string()
    .min(1, "暗号化データが必要です")
    .max(10000, "暗号化データは10000文字以内である必要があります"),
});

/**
 * タスクID用のスキーマ
 */
export const taskIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "無効なタスクIDです"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskIdInput = z.infer<typeof taskIdSchema>;
