# デプロイメントガイド

## 本番環境への導入

### 1. 環境準備

#### 必要な環境変数

```bash
# 必須環境変数
PORT=3000
MONGO_URL=mongodb://your-mongodb-host:27017/coral
JWT_SECRET=your-very-secure-secret-key-at-least-32-characters
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-key-at-least-32-characters
NODE_ENV=production

# オプション
LOG_LEVEL=info
```

#### MongoDB設定

```bash
# MongoDB Atlas（推奨）
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/coral?retryWrites=true&w=majority

# 自前のMongoDBサーバー
MONGO_URL=mongodb://username:password@your-server:27017/coral

# レプリカセット
MONGO_URL=mongodb://host1:27017,host2:27017,host3:27017/coral?replicaSet=rs0
```

### 2. Docker デプロイメント

#### 単一コンテナでの実行

```bash
# イメージのビルド
docker build -t coral-api .

# コンテナの実行
docker run -d \
  --name coral-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGO_URL=mongodb://your-db:27017/coral \
  -e JWT_SECRET=your-secret \
  -e JWT_REFRESH_SECRET=your-refresh-secret \
  coral-api
```

#### Docker Compose を使用した実行

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGO_URL=mongodb://mongo:27017/coral
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

`.env` ファイル:

```bash
JWT_SECRET=your-very-secure-secret-key-at-least-32-characters
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-key-at-least-32-characters
MONGO_PASSWORD=your-mongo-password
```

起動:

```bash
docker-compose up -d
```

### 3. クラウドプラットフォーム

#### Railway

```bash
# Railway CLI のインストール
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init

# 環境変数の設定
railway env set NODE_ENV=production
railway env set JWT_SECRET=your-secret
railway env set JWT_REFRESH_SECRET=your-refresh-secret
railway env set MONGO_URL=your-mongodb-url

# デプロイ
railway up
```

#### Heroku

`Procfile`:

```txt
web: node dist/server.js
```

```bash
# Heroku CLI でのデプロイ
heroku create your-app-name
heroku addons:create mongolab

# 環境変数の設定
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set JWT_REFRESH_SECRET=your-refresh-secret

# デプロイ
git push heroku main
```

#### Vercel

`vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

```bash
# Vercel CLI でのデプロイ
npm i -g vercel
vercel

# 環境変数の設定（Vercel Dashboard）
# JWT_SECRET, JWT_REFRESH_SECRET, MONGO_URL
```

### 4. VPS/専用サーバー

#### PM2 を使用した管理

```bash
# PM2 のインストール
npm install -g pm2

# アプリケーションの起動
pm2 start dist/server.js --name coral-api

# 起動設定ファイル ecosystem.config.js
module.exports = {
  apps: [{
    name: 'coral-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# 設定ファイルを使用した起動
pm2 start ecosystem.config.js --env production

# 自動起動の設定
pm2 startup
pm2 save
```

#### Nginx リバースプロキシ設定

`/etc/nginx/sites-available/coral-api`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

SSL設定（Let's Encrypt使用）:

```bash
# Certbot のインストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書の取得
sudo certbot --nginx -d your-domain.com

# 自動更新の設定
sudo crontab -e
# 以下を追加
0 12 * * * /usr/bin/certbot renew --quiet
```

### 5. CI/CD パイプライン

#### GitHub Actions（既存の設定を拡張）

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # デプロイスクリプトの実行
          ./scripts/deploy.sh
```

#### デプロイスクリプト例

`scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "Starting deployment..."

# サーバーにSSH接続してデプロイ実行
ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
  cd /var/www/coral-api
  git pull origin main
  npm ci --production
  npm run build
  pm2 restart coral-api
EOF

echo "Deployment completed!"
```

### 6. 監視とログ

#### ヘルスチェックエンドポイント

```typescript
// src/routes/index.ts に追加
router.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown"
  });
});
```

#### ログ管理

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

#### 監視ツール

- **Uptime monitoring**: UptimeRobot, Pingdom
- **Application monitoring**: New Relic, DataDog
- **Error tracking**: Sentry

### 7. バックアップ戦略

#### MongoDB バックアップ

```bash
# 日次バックアップスクリプト
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGO_URL" --out="/backup/mongo_$DATE"
tar -czf "/backup/mongo_$DATE.tar.gz" "/backup/mongo_$DATE"
rm -rf "/backup/mongo_$DATE"

# 古いバックアップの削除（7日以上前）
find /backup -name "mongo_*.tar.gz" -mtime +7 -delete
```

#### 自動バックアップの設定

```bash
# crontab -e
0 2 * * * /path/to/backup_script.sh
```

### 8. セキュリティ設定

#### ファイアウォール設定

```bash
# UFW (Ubuntu)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000  # アプリケーションポートへの直接アクセスを拒否
```

#### セキュリティヘッダー

```typescript
// src/app.ts に追加
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
}));
```

### 9. パフォーマンス最適化

#### キャッシュ設定

```typescript
import redis from 'redis';

const client = redis.createClient({
  url: process.env.REDIS_URL
});

// APIレスポンスのキャッシュ
app.use('/auth/tasks', cacheMiddleware);
```

#### レート制限

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP',
});

app.use(limiter);
```

### 10. トラブルシューティング

#### よくある本番環境の問題

1. **メモリ不足**

   ```bash
   # Node.js メモリ制限の設定
   node --max-old-space-size=1024 dist/server.js
   ```

2. **MongoDB接続エラー**

   ```bash
   # 接続プールの設定
   MONGO_URL=mongodb://host:27017/coral?maxPoolSize=10&minPoolSize=2
   ```

3. **SSL証明書の期限切れ**

   ```bash
   # Let's Encrypt の自動更新確認
   sudo certbot renew --dry-run
   ```

#### ログの確認

```bash
# PM2 ログ
pm2 logs coral-api

# システムログ
sudo journalctl -u nginx
sudo tail -f /var/log/nginx/error.log

# アプリケーションログ
tail -f combined.log
```
