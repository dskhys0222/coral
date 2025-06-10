# API詳細仕様

## 認証フロー

### JWT認証システム

Coral APIは、セキュアな二重トークン認証システムを採用しています：

- **アクセストークン**: 短期間有効（15分）、API呼び出しに使用
- **リフレッシュトークン**: 長期間有効（7日）、アクセストークンの更新に使用

### 認証フロー図

```txt
1. ユーザー登録・ログイン
   ↓
2. アクセストークン + リフレッシュトークン取得
   ↓
3. API呼び出し（アクセストークンをヘッダーに含める）
   ↓
4. アクセストークン期限切れ時
   ↓
5. リフレッシュトークンで新しいアクセストークンを取得
   ↓
6. 手順3に戻る
```

## エンドポイント詳細

### 1. ユーザー登録

**POST** `/public/register`

```json
// リクエスト
{
  "username": "testuser",
  "password": "SecurePass123"
}

// レスポンス (201)
{
  "message": "User registered"
}

// エラー (409)
{
  "message": "Username already exists"
}
```

**バリデーション規則:**

- ユーザー名: 3-50文字、英数字・アンダースコア・ハイフンのみ
- パスワード: 8-100文字、本番環境では小文字・大文字・数字を含む必要

### 2. ログイン

**POST** `/public/login`

```json
// リクエスト
{
  "username": "testuser",
  "password": "SecurePass123"
}

// レスポンス (200)
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// エラー (401)
{
  "message": "Invalid credentials"
}
```

### 3. アクセストークン更新

**POST** `/public/refresh`

```json
// リクエスト
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// レスポンス (200)
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}

// エラー (401)
{
  "message": "Invalid refresh token"
}
```

### 4. ログアウト

**POST** `/public/logout`

```json
// リクエスト
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// レスポンス (200)
{
  "message": "Logged out successfully"
}
```

### 5. 全デバイスからログアウト

**POST** `/public/logout-all`

```json
// リクエスト
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// レスポンス (200)
{
  "message": "Logged out from all devices successfully"
}
```

### 6. タスク一覧取得

**GET** `/auth/tasks`

```bash
# ヘッダー
Authorization: Bearer <access_token>
```

```json
// レスポンス (200)
[
  {
    "_id": "60d5ec49f1b2c8b1a8e4c123",
    "username": "testuser",
    "encryptedData": "encrypted-task-data",
    "createdAt": "2023-06-01T10:30:00.000Z",
    "updatedAt": "2023-06-01T10:30:00.000Z"
  }
]
```

### 7. タスク新規作成

**POST** `/auth/tasks`

```bash
# ヘッダー
Authorization: Bearer <access_token>
```

```json
// リクエスト
{
  "encryptedData": "暗号化されたタスクデータ"
}

// レスポンス (201)
{
  "_id": "60d5ec49f1b2c8b1a8e4c123",
  "username": "testuser",
  "encryptedData": "暗号化されたタスクデータ",
  "createdAt": "2023-06-01T10:30:00.000Z",
  "updatedAt": "2023-06-01T10:30:00.000Z"
}
```

### 8. タスク更新

**PUT** `/auth/tasks/:id`

```bash
# ヘッダー
Authorization: Bearer <access_token>
```

```json
// リクエスト
{
  "encryptedData": "更新された暗号化データ"
}

// レスポンス (200)
{
  "_id": "60d5ec49f1b2c8b1a8e4c123",
  "username": "testuser",
  "encryptedData": "更新された暗号化データ",
  "createdAt": "2023-06-01T10:30:00.000Z",
  "updatedAt": "2023-06-01T11:00:00.000Z"
}

// エラー (404)
{
  "message": "Task not found"
}
```

### 9. タスク削除

**DELETE** `/auth/tasks/:id`

```bash
# ヘッダー
Authorization: Bearer <access_token>
```

```json
// レスポンス (200)
{
  "message": "Task deleted"
}

// エラー (404)
{
  "message": "Task not found"
}
```

## エラーハンドリング

### 共通エラーレスポンス

```json
{
  "message": "エラーメッセージ",
  "details": {
    // バリデーションエラーの場合、詳細情報
  }
}
```

### HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | バリデーションエラー |
| 401 | 認証エラー |
| 403 | 認可エラー |
| 404 | リソースが見つからない |
| 409 | 競合エラー（ユーザー名重複など） |
| 500 | サーバーエラー |

## リクエスト例

### cURLを使用した例

```bash
# ユーザー登録
curl -X POST http://localhost:3000/public/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# ログイン
curl -X POST http://localhost:3000/public/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# タスク一覧取得（要認証）
curl -X GET http://localhost:3000/auth/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# タスク作成（要認証）
curl -X POST http://localhost:3000/auth/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"encryptedData":"your-encrypted-data"}'
```

## セキュリティ要件

### ヘッダー

- `Authorization: Bearer <access_token>` - 認証が必要なエンドポイントで必須
- `Content-Type: application/json` - JSON形式のリクエストで必須

### レート制限

現在実装されていませんが、本番環境では以下の制限を推奨：

- 登録・ログイン: 1分間に5回まで
- API呼び出し: 1分間に100回まで

### CORS設定

すべてのオリジンからのアクセスを許可（開発環境）
本番環境では適切なオリジン制限を設定してください。
