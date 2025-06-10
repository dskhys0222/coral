# セキュリティガイド

## セキュリティ概要

Coral APIは以下のセキュリティ対策を実装しています：

- JWT二重トークン認証システム
- bcryptによるパスワードハッシュ化
- Zodによる入力バリデーション
- MongoDB Injectionの防止
- CORS設定
- 適切なエラーハンドリング

## 認証・認可

### JWT トークン設計

#### アクセストークン

- **有効期限**: 15分（短期）
- **用途**: API呼び出しの認証
- **格納場所**: メモリ（推奨）またはsessionStorage
- **ペイロード**:

  ```json
  {
    "username": "user123",
    "iat": 1623456789,
    "exp": 1623457689
  }
  ```

#### リフレッシュトークン

- **有効期限**: 7日（長期）
- **用途**: アクセストークンの更新
- **格納場所**: httpOnlyクッキー（推奨）
- **ペイロード**:

  ```json
  {
    "username": "user123",
    "tokenId": "unique-token-id",
    "iat": 1623456789,
    "exp": 1624061589
  }
  ```

### トークンローテーション

1. **最大5個まで**: 1ユーザーあたり5個のリフレッシュトークンを保持
2. **古いトークンの自動削除**: 6個目のログイン時に最古のトークンを削除
3. **デバイス識別**: User-Agentを使用してデバイスを識別

## パスワードセキュリティ

### パスワードポリシー

#### 本番環境

- 最小8文字、最大100文字
- 小文字、大文字、数字を含む
- 特殊文字の使用を推奨

#### 開発・テスト環境

- 最小8文字、最大100文字
- 文字種制限なし（テスト容易性のため）

### ハッシュ化

```typescript
// bcrypt設定
const saltRounds = 10; // 2^10回の処理

// パスワードハッシュ化
const hashedPassword = await bcrypt.hash(password, saltRounds);

// パスワード検証
const isValid = await bcrypt.compare(password, hashedPassword);
```

## 入力バリデーション

### Zodスキーマによる検証

```typescript
// ユーザー名の検証
username: z
  .string()
  .min(3, "ユーザー名は3文字以上である必要があります")
  .max(50, "ユーザー名は50文字以内である必要があります")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です"
  ),

// タスクデータの検証
encryptedData: z
  .string()
  .min(1, "暗号化データが必要です")
  .max(10000, "暗号化データは10000文字以内である必要があります"),
```

### MongoDB Injection防止

- **Mongoose使用**: 自動的にサニタイゼーション
- **パラメータ化クエリ**: 動的クエリの回避
- **型安全性**: TypeScriptによる型チェック

```typescript
// 安全なクエリ例
const user = await User.findOne({ username: validatedUsername });

// 危険な例（Coral APIでは使用していない）
// const user = await User.findOne({ $where: `this.username == '${username}'` });
```

## HTTPS とトランスポートセキュリティ

### SSL/TLS設定

#### 本番環境推奨設定

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL証明書
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/private.key;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### セキュリティヘッダー

Express.jsでのHelmet.js使用例：

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## レート制限

### API レート制限

```typescript
import rateLimit from 'express-rate-limit';

// 一般API制限
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: {
    error: 'Too many requests',
    retryAfter: 900 // 15分後に再試行
  }
});

// 認証API制限（より厳格）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の認証試行
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 900
  }
});

app.use('/public/login', authLimiter);
app.use('/public/register', authLimiter);
app.use(generalLimiter);
```

## データベースセキュリティ

### MongoDB 設定

#### 接続セキュリティ

```javascript
// 本番環境推奨接続設定
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // 最大接続数
  serverSelectionTimeoutMS: 5000, // タイムアウト
  socketTimeoutMS: 45000,
  family: 4, // IPv4使用
  authSource: 'admin', // 認証データベース
  ssl: true, // SSL接続
  sslValidate: true, // SSL証明書検証
};
```

#### インデックス設定

```typescript
// ユーザー名のユニークインデックス
userSchema.index({ username: 1 }, { unique: true });

// タスクの複合インデックス（パフォーマンス向上）
taskSchema.index({ username: 1, createdAt: -1 });
```

### データ暗号化

#### 保存時暗号化

- MongoDB Atlas: 自動暗号化対応
- 自前サーバー: MongoDB Enterprise の暗号化機能

#### アプリケーションレベル暗号化

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

// データ暗号化
export function encryptData(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  cipher.setAAD(Buffer.from('additional-data'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// データ復号化
export function decryptData(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipher(algorithm, secretKey);
  
  decipher.setAAD(Buffer.from('additional-data'));
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

## ログとモニタリング

### セキュリティイベントのログ

```typescript
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'security.log',
      level: 'warn'
    })
  ]
});

// 認証失敗のログ
securityLogger.warn('Authentication failed', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  username: req.body.username,
  timestamp: new Date()
});

// 異常なAPI呼び出しのログ
securityLogger.error('Suspicious API call', {
  ip: req.ip,
  endpoint: req.path,
  method: req.method,
  timestamp: new Date()
});
```

### 監視項目

1. **認証関連**
   - 連続ログイン失敗
   - 異常なトークン使用パターン
   - 新規デバイスからのアクセス

2. **API使用**
   - 異常なリクエスト頻度
   - 予期しないエンドポイントへのアクセス
   - 大量データの送信

3. **エラーパターン**
   - 400系エラーの急増
   - 500系エラーの発生
   - データベース接続エラー

## インシデント対応

### セキュリティインシデント検知

```typescript
// 異常検知の例
function detectAnomalousActivity(req: Request, res: Response, next: NextFunction) {
  const userIP = req.ip;
  const recentAttempts = getRecentFailedAttempts(userIP);
  
  if (recentAttempts > 10) {
    securityLogger.alert('Potential brute force attack', {
      ip: userIP,
      attempts: recentAttempts,
      timestamp: new Date()
    });
    
    // IPアドレスの一時ブロック
    blockIP(userIP, 3600); // 1時間ブロック
    return res.status(429).json({ error: 'IP temporarily blocked' });
  }
  
  next();
}
```

### インシデント対応手順

1. **検知**
   - 自動アラート
   - ログ監視
   - ユーザー報告

2. **初期対応**
   - 影響範囲の特定
   - 緊急対応（IP ブロック、サービス停止など）
   - ステークホルダーへの通知

3. **調査・分析**
   - ログの詳細分析
   - 攻撃経路の特定
   - 影響を受けたデータの特定

4. **復旧・対策**
   - セキュリティパッチの適用
   - パスワードリセット（必要に応じて）
   - システムの修復

5. **事後対応**
   - インシデントレポート作成
   -再発防止策の実装
   - プロセスの改善

## 環境変数とシークレット管理

### 推奨事項

1. **絶対にコードにハードコードしない**
2. **環境ごとに異なるシークレットを使用**
3. **定期的なローテーション**
4. **最小権限の原則**

### シークレット管理ツール

#### AWS Secrets Manager

```typescript
import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<string> {
  const result = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return result.SecretString!;
}
```

#### HashiCorp Vault

```typescript
import vault from 'node-vault';

const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

async function getVaultSecret(path: string): Promise<any> {
  const result = await vaultClient.read(path);
  return result.data;
}
```

### .env ファイルの管理

```bash
# 開発環境用 .env.development
NODE_ENV=development
JWT_SECRET=dev-secret-not-for-production
JWT_REFRESH_SECRET=dev-refresh-secret-not-for-production

# 本番環境用 .env.production（リポジトリには含めない）
NODE_ENV=production
JWT_SECRET=production-super-secure-secret-key-at-least-32-characters
JWT_REFRESH_SECRET=production-super-secure-refresh-secret-key-at-least-32-characters
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/coral
```

## 定期的なセキュリティタスク

### 日次

- [ ] セキュリティログの確認
- [ ] 異常なアクセスパターンの確認
- [ ] エラーレートの監視

### 週次

- [ ] 依存関係の脆弱性スキャン (`npm audit`)
- [ ] アクセスログの分析
- [ ] 未使用のリフレッシュトークンのクリーンアップ

### 月次

- [ ] セキュリティパッチの適用
- [ ] SSL証明書の有効期限確認
- [ ] バックアップの復旧テスト
- [ ] インシデント対応手順の見直し

### 四半期

- [ ] シークレットローテーション
- [ ] セキュリティ監査
- [ ] ペネトレーションテスト
- [ ] セキュリティポリシーの見直し

## コンプライアンス

### GDPR対応

- ユーザーデータの削除要求への対応
- データ処理の透明性
- 適切な同意取得

### データ保護

- 最小限のデータ収集
- データの適切な分類
- アクセス制御の実装
