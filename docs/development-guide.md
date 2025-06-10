# 開発ガイド

## 開発環境のセットアップ

### 1. 前提条件

- Node.js 22以上
- npm または yarn
- Git
- VS Code（推奨）

### 2. プロジェクトのクローンとセットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd coral

# 依存関係のインストール
npm install

# 開発環境での起動
npm run dev
```

### 3. 開発用スクリプト

```bash
# 開発サーバー起動（ホットリロード対応）
npm run dev

# TypeScriptコンパイル
npm run build

# テスト実行
npm test

# リンター実行
npm run lint

# コードフォーマット
npm run format

# OpenAPI仕様書生成
npm run openapi
```

## プロジェクト構造

### ディレクトリ構成

```txt
src/
├── app.ts                  # Express アプリケーションの設定
├── server.ts               # サーバー起動・終了処理
├── config/
│   └── index.ts           # 設定管理
├── middleware/
│   ├── auth.ts            # JWT認証ミドルウェア
│   └── validation.ts      # Zodバリデーションミドルウェア
├── models/
│   ├── user.ts            # ユーザーモデル
│   └── task.ts            # タスクモデル
├── routes/
│   ├── index.ts           # ルートの統合
│   ├── public.ts          # 認証不要ルート
│   ├── swagger.ts         # Swagger設定
│   └── auth/
│       ├── auth.ts        # 認証テスト用ルート
│       └── task.ts        # タスク管理ルート
├── schemas/
│   ├── index.ts           # スキーマのエクスポート
│   ├── user.ts            # ユーザー関連スキーマ
│   └── task.ts            # タスク関連スキーマ
└── utils/
    └── index.ts           # ユーティリティ関数
```

### 設計思想

1. **レイヤー分離**: ルート、ミドルウェア、モデル、スキーマを明確に分離
2. **型安全性**: TypeScriptとZodによる厳密な型チェック
3. **セキュリティファースト**: JWT認証とバリデーションの徹底
4. **テスタビリティ**: 統合テストによる動作保証

## 新機能の追加

### 1. 新しいAPIエンドポイントの追加

#### Step 1: スキーマの定義

`src/schemas/` に新しいスキーマファイルを作成：

```typescript
// src/schemas/example.ts
import { z } from "zod";

export const createExampleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export type CreateExampleInput = z.infer<typeof createExampleSchema>;
```

#### Step 2: モデルの定義

`src/models/` に新しいモデルファイルを作成：

```typescript
// src/models/example.ts
import mongoose from "mongoose";

export interface ExampleDocument extends mongoose.Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const exampleSchema = new mongoose.Schema<ExampleDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
  },
  {
    timestamps: true,
  },
);

export const Example = mongoose.model<ExampleDocument>("Example", exampleSchema);
```

#### Step 3: ルートの定義

`src/routes/auth/` に新しいルートファイルを作成：

```typescript
// src/routes/auth/example.ts
import { Router, Response } from "express";
import { validateBody } from "../../middleware/validation";
import { createExampleSchema } from "../../schemas/example";
import { Example } from "../../models/example";
import { AuthRequest } from "../../middleware/auth";

const router = Router();

/**
 * @openapi
 * /auth/examples:
 *   post:
 *     summary: Example作成
 *     tags:
 *       - example
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExample'
 *     responses:
 *       201:
 *         description: 作成されたExample
 */
router.post(
  "/examples",
  validateBody(createExampleSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const example = new Example(req.body);
      await example.save();
      res.status(201).json(example);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
```

#### Step 4: ルートの統合

`src/routes/index.ts` に新しいルートを追加：

```typescript
import exampleRoutes from "./auth/example";

// 既存のコードに追加
router.use("/auth", exampleRoutes);
```

### 2. 新しいミドルウェアの追加

```typescript
// src/middleware/example.ts
import { Request, Response, NextFunction } from "express";

export function exampleMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // ミドルウェアのロジック
  next();
}
```

### 3. ユーティリティ関数の追加

```typescript
// src/utils/example.ts
export function exampleUtility(input: string): string {
  // ユーティリティ関数のロジック
  return input.toLowerCase();
}

// src/utils/index.ts に追加
export * from "./example";
```

## テストの書き方

### 1. 統合テストの例

```typescript
// src/routes/auth/example.test.ts
import request from "supertest";
import { describe, test, expect, beforeAll } from "vitest";
import app from "../../app";

describe("Example API", () => {
  let token = "";

  beforeAll(async () => {
    // テスト用ユーザーの作成とログイン
    const user = { username: "testuser", password: "testpass" };
    await request(app).post("/public/register").send(user);
    const res = await request(app).post("/public/login").send(user);
    token = res.body.accessToken;
  });

  test("Example作成が成功する", async () => {
    const exampleData = {
      name: "テストExample",
      description: "テスト用の説明",
    };

    const res = await request(app)
      .post("/auth/examples")
      .set("Authorization", `Bearer ${token}`)
      .send(exampleData);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(exampleData.name);
  });
});
```

### 2. テストの実行

```bash
# 全テストの実行
npm test

# 特定のファイルのテスト
npm test -- example.test.ts

# ウォッチモード
npm test -- --watch
```

## デバッグ

### 1. VS Code設定

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.ts",
      "runtimeArgs": ["-r", "tsx/cjs"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 2. ログ出力

```typescript
// 開発環境でのデバッグログ
if (process.env.NODE_ENV === "development") {
  console.log("Debug info:", data);
}
```

## コード品質

### 1. Biome設定

`biome.json` で以下が設定済み：

- フォーマッター（Prettier互換）
- リンター（ESLint互換）
- インポートの自動整理

### 2. TypeScript設定

`tsconfig.json` で厳密な型チェックが有効：

- `strict: true`
- `strictNullChecks: true`
- `forceConsistentCasingInFileNames: true`

### 3. Git Hooks

推奨されるpre-commitフック（手動設定）：

```bash
#!/bin/sh
npm run lint
npm run format
npm test
```

## パフォーマンス最適化

### 1. MongoDB最適化

- インデックスの適切な設定
- クエリの最適化
- コネクションプールの調整

### 2. Express最適化

- gzipコンプレッション
- 適切なミドルウェアの順序
- キャッシュ戦略

### 3. セキュリティ

- Helmet.jsの導入
- レート制限の実装
- 入力サニタイゼーション

## トラブルシューティング

### よくある問題

1. **MongoDB接続エラー**
   - 開発環境では自動的にMemory Serverが使用される
   - 本番環境では `MONGO_URL` 環境変数を確認

2. **JWT_SECRETの警告**
   - 開発環境では警告が表示されるが動作する
   - 本番環境では必ず環境変数を設定

3. **テストの失敗**
   - MongoDB接続の初期化を待つ
   - 各テストでのデータクリーンアップ

### デバッグツール

- MongoDB Compass - データベースの可視化
- Postman - API テスト
- VS Code REST Client - APIテスト（推奨）
