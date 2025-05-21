import bcrypt from "bcrypt";
import { type Request, type Response, Router } from "express";
import jwt from "jsonwebtoken";

import CONFIG from "../config";
import { type AuthRequest, auth } from "../middleware/auth";
import { User } from "../models/user";
import { sendError, validateRequest } from "../utils";

const router = Router();

/**
 * ユーザー登録エンドポイント
 */
router.post("/register", async (req: Request, res: Response) => {
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

/**
 * ログインエンドポイント
 */
router.post("/login", async (req: Request, res: Response) => {
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

/**
 * ログアウトエンドポイント（クライアント側でトークン破棄）
 */
router.post("/logout", (req: Request, res: Response) => {
  // JWTはサーバー側で無効化できないため、クライアントでトークンを削除
  res.json({ message: "Logged out (token deleted on client)" });
});

/**
 * 認証テスト用エンドポイント
 */
router.get("/auth", auth, (req: AuthRequest, res: Response) => {
  res.send(`Hello ${req.user?.username}`);
});

export default router;
