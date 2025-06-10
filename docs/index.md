# docs/

このディレクトリには、Coral API プロジェクトの包括的なドキュメントが含まれています。

## ドキュメント一覧

### 📋 [README.md](./README.md)

プロジェクトの概要、セットアップ手順、基本的な使用方法

**対象読者**: 開発者、プロジェクトマネージャー、新規参加者

### 📚 [API詳細仕様 (api-reference.md)](./api-reference.md)

REST API エンドポイントの詳細な仕様とリクエスト/レスポンス例

**対象読者**: フロントエンド開発者、API利用者、QAエンジニア

### 🛠️ [開発ガイド (development-guide.md)](./development-guide.md)

ローカル開発環境のセットアップ、プロジェクト構造、新機能の追加方法

**対象読者**: バックエンド開発者、新規開発メンバー

### 🚀 [デプロイメントガイド (deployment-guide.md)](./deployment-guide.md)

本番環境への導入方法、Docker、クラウドプラットフォーム、CI/CD設定

**対象読者**: DevOpsエンジニア、インフラ担当者、プロジェクトマネージャー

### 🔐 [セキュリティガイド (security-guide.md)](./security-guide.md)

セキュリティ対策、認証システム、脆弱性対応、インシデント対応

**対象読者**: セキュリティエンジニア、開発者、運用担当者

## 読み進める順序

### 新規参加者向け

1. **README.md** - プロジェクト全体の理解
2. **development-guide.md** - 開発環境のセットアップ
3. **api-reference.md** - API仕様の理解
4. **security-guide.md** - セキュリティ要件の理解

### フロントエンド開発者向け

1. **README.md** - プロジェクト概要
2. **api-reference.md** - API仕様の詳細
3. **security-guide.md** - 認証フローの理解

### DevOps/インフラ担当者向け

1. **README.md** - プロジェクト概要
2. **deployment-guide.md** - デプロイメント手順
3. **security-guide.md** - セキュリティ設定

### セキュリティ監査担当者向け

1. **README.md** - プロジェクト概要
2. **security-guide.md** - セキュリティ実装の詳細
3. **api-reference.md** - API設計の確認

## 更新方針

- 機能追加時は関連するドキュメントを必ず更新
- API変更時は `api-reference.md` を最優先で更新
- セキュリティ要件の変更時は `security-guide.md` を更新
- デプロイ手順の変更時は `deployment-guide.md` を更新

## 外部リンク

- [Swagger UI (開発環境)](http://localhost:3000/openapi) - 実際のAPI仕様書
- [GitHub リポジトリ](https://github.com/your-org/coral) - ソースコード
- [CI/CDパイプライン](https://github.com/your-org/coral/actions) - ビルドステータス

## フィードバック

ドキュメントに関するフィードバックや改善提案は、以下の方法でお寄せください：

- GitHub Issues での報告
- プルリクエストでの改善提案
- Slack チャンネル `#coral-api` での質問

## ライセンス

このドキュメントは MIT ライセンスの下で公開されています。
