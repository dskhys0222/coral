import { z } from "zod";

/**
 * ユーザー登録/ログイン用のスキーマ
 */
export const userSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上である必要があります")
    .max(50, "ユーザー名は50文字以内である必要があります")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です",
    ),
  password: z
    .string()
    .min(8, "パスワードは8文字以上である必要があります")
    .max(100, "パスワードは100文字以内である必要があります")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "パスワードには小文字、大文字、数字を含める必要があります",
    ),
});

/**
 * 開発/テスト環境用の緩いパスワード要件のスキーマ
 */
export const userSchemaLoose = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上である必要があります")
    .max(50, "ユーザー名は50文字以内である必要があります")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です",
    ),
  password: z
    .string()
    .min(8, "パスワードは8文字以上である必要があります")
    .max(100, "パスワードは100文字以内である必要があります"),
});

/**
 * 環境に応じて適切なスキーマを選択
 */
export const getUserSchema = () => {
  return process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
    ? userSchemaLoose
    : userSchema;
};

/**
 * リフレッシュトークン用のスキーマ
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "リフレッシュトークンが必要です"),
});

export type UserInput = z.infer<typeof userSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
