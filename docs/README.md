# Coral API

Coral APIは、JWT認証とタスク管理機能を提供するNode.js/Express.jsベースのREST APIプロジェクトです。

## 🚀 概要

- **フレームワーク**: Node.js + Express.js
- **データベース**: MongoDB (mongoose)
- **認証**: JWT (Access Token + Refresh Token)
- **バリデーション**: Zod
- **テスト**: Vitest
- **API仕様書**: OpenAPI/Swagger
- **言語**: TypeScript
- **リンター**: Biome

## 📋 機能

### 認証機能

- ユーザー登録・ログイン
- JWT認証（アクセストークン + リフレッシュトークン）
- 複数デバイス対応
- セキュアなログアウト機能

### タスク管理

- 暗号化されたタスクデータの CRUD 操作
- ユーザー毎のタスク分離

### セキュリティ

- bcryptによるパスワードハッシュ化
- JWT トークンローテーション
- リフレッシュトークンの自動削除（最大5個まで保持）

## 🔧 セットアップ

### 前提条件

- Node.js 22以上
- MongoDB（本番環境）または開発用にMongoDB Memory Server

### インストール

```bash
# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build

# 開発環境での起動
npm run dev

# 本番環境での起動
npm start
```

### 環境変数

```bash
# 本番環境で必須
PORT=3000
MONGO_URL=mongodb://localhost:27017/coral
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# 開発環境では自動的にdefault値が使用されます
```

## 📚 API エンドポイント

### 認証不要エンドポイント (`/public`)

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/public/register` | ユーザー登録 |
| POST | `/public/login` | ログイン |
| POST | `/public/refresh` | アクセストークン更新 |
| POST | `/public/logout` | ログアウト |
| POST | `/public/logout-all` | 全デバイスからログアウト |

### 認証必要エンドポイント (`/auth`)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/auth` | 認証テスト |
| GET | `/auth/tasks` | タスク一覧取得 |
| POST | `/auth/tasks` | タスク新規作成 |
| PUT | `/auth/tasks/:id` | タスク更新 |
| DELETE | `/auth/tasks/:id` | タスク削除 |

### API仕様書

開発サーバー起動後、以下のURLでSwagger UIにアクセスできます：

- <http://localhost:3000/openapi>

## 🧪 テスト

```bash
# テスト実行
npm test

# リンター実行
npm run lint

# コードフォーマット
npm run format
```

## 🐳 Docker対応

```bash
# Dockerイメージのビルド
docker build -t coral-api .

# コンテナの実行
docker run -p 3000:3000 coral-api
```

## 📁 プロジェクト構造

```txt
coral/
├── src/
│   ├── app.ts              # Express アプリケーション設定
│   ├── server.ts           # サーバー起動・終了処理
│   ├── config/             # 設定ファイル
│   ├── middleware/         # ミドルウェア（認証・バリデーション）
│   ├── models/             # MongoDB モデル
│   ├── routes/             # ルート定義
│   ├── schemas/            # Zod バリデーションスキーマ
│   └── utils/              # ユーティリティ関数
├── scripts/                # スクリプト（OpenAPI生成など）
├── docs/                   # ドキュメント
├── .github/workflows/      # CI/CD設定
└── dist/                   # コンパイル済みファイル
```

## 🔐 セキュリティ考慮事項

- パスワードはbcryptでハッシュ化
- JWTシークレットは環境変数で管理
- リフレッシュトークンは複数デバイス対応
- 古いリフレッシュトークンの自動削除
- CORS設定済み

## 📖 関連ドキュメント

- [📚 API詳細仕様](./api-reference.md) - REST API エンドポイントの詳細な仕様
- [🛠️ 開発ガイド](./development-guide.md) - ローカル開発環境のセットアップと開発手順
- [🚀 デプロイメントガイド](./deployment-guide.md) - 本番環境への導入とCI/CD設定
- [🔐 セキュリティガイド](./security-guide.md) - セキュリティ対策とベストプラクティス
- [📋 ドキュメント一覧](./index.md) - 全ドキュメントの概要と読み進める順序

## 🤝 コントリビューション

1. プロジェクトをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ⚖️ ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。
