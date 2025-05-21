import bcrypt from "bcrypt";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

// インターフェース定義
interface UserDocument extends mongoose.Document {
  username: string;
  password: string;
}

interface Config {
  port: number | string;
  mongodb: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  security: {
    saltRounds: number;
  };
}

// カスタムリクエストインターフェース
interface AuthRequest extends Request {
  user?: JwtPayload;
}

// アプリケーション設定
const CONFIG: Config = {
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
      "本番環境では必ずGitHubのシークレットなどで適切なJWT_SECRETを設定してください。",
  );
}

// Express アプリケーション
const app = express();

// ユーザースキーマとモデル
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model<UserDocument>("User", userSchema);

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
const sendError = (
  res: Response,
  status: number,
  message: string,
  err?: Error,
): Response => {
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
const validateRequest = (
  req: Request,
  res: Response,
  fields: string[],
): boolean => {
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
function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    sendError(res, 401, "No token");
    return;
  }

  jwt.verify(token, CONFIG.jwt.secret, (err, user) => {
    if (err) {
      sendError(res, 403, "Invalid token", err);
      return;
    }
    req.user = user as JwtPayload;
    next();
  });
}

// ルート定義
// --- 公開ルート ---
// ホームページ
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// ユーザー登録
app.post("/register", async (req: Request, res: Response) => {
  if (!validateRequest(req, res, ["username", "password"])) {
    return;
  }

  const { username, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, CONFIG.security.saltRounds);
    const user = new User({ username, password: hashed });
    await user.save();
    res.status(201).json({ message: "User registered" });
    return;
  } catch (err) {
    // MongooseのDuplicateKey Errorをチェック
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      sendError(res, 409, "Username already exists");
      return;
    }
    sendError(
      res,
      500,
      "Registration failed",
      err instanceof Error ? err : new Error(String(err)),
    );
    return;
  }
});

// ログイン
app.post("/login", async (req: Request, res: Response) => {
  if (!validateRequest(req, res, ["username", "password"])) {
    return;
  }

  const { username, password } = req.body;

  try {
    // ユーザー検索
    const user = await User.findOne({ username });
    if (!user) {
      sendError(res, 401, "Invalid credentials");
      return;
    }

    // パスワード検証
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      sendError(res, 401, "Invalid credentials");
      return;
    }

    // JWTトークン生成
    const payload = { username: user.username };
    const secretKey = CONFIG.jwt.secret;
    const token = jwt.sign(payload, secretKey);

    res.json({ token });
    return;
  } catch (err) {
    sendError(
      res,
      500,
      "Login failed",
      err instanceof Error ? err : new Error(String(err)),
    );
    return;
  }
});

// ログアウト（クライアント側でトークン破棄）
app.post("/logout", (req: Request, res: Response) => {
  // JWTはサーバー側で無効化できないため、クライアントでトークンを削除
  res.json({ message: "Logged out (token deleted on client)" });
});

// --- 認証が必要なルート ---
// 認証済みユーザーのみアクセス可
app.get("/auth", auth, (req: AuthRequest, res: Response) => {
  res.send(`Hello ${req.user?.username}`);
});

// サーバー起動
const server = app.listen(CONFIG.port, () => {
  console.log(`Server running at http://localhost:${CONFIG.port}`);
});

// 終了処理の管理（SIGTERM シグナルハンドリング）
process.on("SIGTERM", () => {
  console.log(
    "SIGTERM シグナルを受信しました。アプリケーションを優雅に終了します...",
  );

  // HTTPサーバーをシャットダウン
  server.close(() => {
    console.log("HTTPサーバーを停止しました。");

    // MongoDBコネクションを閉じる
    mongoose.connection.close().then(() => {
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

export default app;
