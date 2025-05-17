// 必要なモジュールのインポート
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// アプリケーション設定
const CONFIG = {
  port: process.env.PORT || 3000,
  mongodb: {
    url: process.env.MONGO_URL || "mongodb:27017/mydb",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default_insecure_secret_for_development",
    expiresIn: "1h",
  },
  security: {
    saltRounds: 10,
  },
};

// JWTシークレットが環境変数から設定されていない場合、警告を表示
if (!process.env.JWT_SECRET) {
  console.warn(
    "警告: 環境変数JWT_SECRETが設定されていません。" +
      "開発用のデフォルトシークレットを使用します。" +
      "本番環境では必ずGitHubのシークレットなどで適切なJWT_SECRETを設定してください。"
  );
}

// Express アプリケーション
const app = express();

// ユーザースキーマとモデル
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

// ミドルウェア
app.use(express.json());

// 共通ユーティリティ関数
/**
 * エラーレスポンスを送信する関数
 * @param {object} res - レスポンスオブジェクト
 * @param {number} status - HTTPステータスコード
 * @param {string} message - エラーメッセージ
 * @param {Error} [err] - エラーオブジェクト（ログ出力用）
 */
const sendError = (res, status, message, err) => {
  if (err) {
    console.error(`Error (${status}): ${message}`, err);
  }
  return res.status(status).json({ message });
};

/**
 * リクエストデータのバリデーション
 * @param {object} req - リクエストオブジェクト
 * @param {object} res - レスポンスオブジェクト
 * @param {Array} fields - 必須フィールドの配列
 * @returns {boolean} バリデーション結果
 */
const validateRequest = (req, res, fields) => {
  for (const field of fields) {
    if (!req.body[field]) {
      sendError(res, 400, `${field} is required`);
      return false;
    }
  }
  return true;
};

// MongoDB接続
mongoose
  .connect(CONFIG.mongodb.url)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error: ", err));

// JWT認証ミドルウェア
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return sendError(res, 401, "No token");
  }

  jwt.verify(token, CONFIG.jwt.secret, (err, user) => {
    if (err) {
      return sendError(res, 403, "Invalid token", err);
    }
    req.user = user;
    next();
  });
}

// ルート定義
// --- 公開ルート ---
// ホームページ
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ユーザー登録
app.post("/register", async (req, res) => {
  if (!validateRequest(req, res, ["username", "password"])) {
    return;
  }

  const { username, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, CONFIG.security.saltRounds);
    const user = new User({ username, password: hashed });
    await user.save();
    return res.status(201).json({ message: "User registered" });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 409, "Username already exists");
    }
    return sendError(res, 500, "Registration failed", err);
  }
});

// ログイン
app.post("/login", async (req, res) => {
  if (!validateRequest(req, res, ["username", "password"])) {
    return;
  }

  const { username, password } = req.body;

  try {
    // ユーザー検索
    const user = await User.findOne({ username });
    if (!user) {
      return sendError(res, 401, "Invalid credentials");
    }

    // パスワード検証
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return sendError(res, 401, "Invalid credentials");
    }

    // JWTトークン生成
    const token = jwt.sign({ username: user.username }, CONFIG.jwt.secret, {
      expiresIn: CONFIG.jwt.expiresIn,
    });

    return res.json({ token });
  } catch (err) {
    return sendError(res, 500, "Login failed", err);
  }
});

// ログアウト（クライアント側でトークン破棄）
app.post("/logout", (req, res) => {
  // JWTはサーバー側で無効化できないため、クライアントでトークンを削除
  res.json({ message: "Logged out (token deleted on client)" });
});

// --- 認証が必要なルート ---
// 認証済みユーザーのみアクセス可
app.get("/auth", auth, (req, res) => {
  res.send(`Hello ${req.user.username}`);
});

// サーバー起動
const server = app.listen(CONFIG.port, () => {
  console.log(`Server running at http://localhost:${CONFIG.port}`);
});

// 終了処理の管理（SIGTERM シグナルハンドリング）
process.on("SIGTERM", () => {
  console.log(
    "SIGTERM シグナルを受信しました。アプリケーションを優雅に終了します..."
  );

  // HTTPサーバーをシャットダウン
  server.close(() => {
    console.log("HTTPサーバーを停止しました。");

    // MongoDBコネクションを閉じる
    mongoose.connection.close(false, () => {
      console.log("MongoDBコネクションを閉じました。");
      console.log("アプリケーションを終了します。");
      process.exit(0);
    });
  });

  // 10秒後に強制終了（タイムアウト）
  setTimeout(() => {
    console.error("優雅な終了に失敗しました。強制終了します。");
    process.exit(1);
  }, 10000);
});
