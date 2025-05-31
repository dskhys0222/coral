import bcrypt from "bcrypt";
import { type Request, type Response, Router } from "express";
import jwt from "jsonwebtoken";

import CONFIG from "../config";
import type { JwtPayload, RefreshJwtPayload } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { User } from "../models/user";
import { getUserSchema, refreshTokenSchema } from "../schemas/user";
import { generateSecureRandomString, sendError } from "../utils";

const router = Router();

/**
 * @openapi
 * /public/register:
 *   post:
 *     summary: 新規ユーザー登録
 *     tags:
 *      - public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       409:
 *         description: Username already exists
 */
router.post(
  "/register",
  validateBody(getUserSchema()),
  async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
      const existing = await User.findOne({ username });
      if (existing) {
        sendError(res, 409, "Username already exists");
        return;
      }
      const hashed = await bcrypt.hash(password, CONFIG.security.saltRounds);
      const user = new User({ username, password: hashed });
      await user.save();
      res.status(201).json({ message: "User registered" });
    } catch (err) {
      sendError(
        res,
        500,
        "Registration failed",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

/**
 * @openapi
 * /public/login:
 *   post:
 *     summary: ログイン
 *     tags:
 *      - public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: アクセストークンとリフレッシュトークン
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: アクセストークン（短期間有効）
 *                 refreshToken:
 *                   type: string
 *                   description: リフレッシュトークン（長期間有効）
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  validateBody(getUserSchema()),
  async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username });
      if (!user) {
        sendError(res, 401, "Invalid credentials");
        return;
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        sendError(res, 401, "Invalid credentials");
        return;
      }

      // アクセストークンを生成
      const accessPayload: JwtPayload = { username };
      const accessToken = jwt.sign(accessPayload, CONFIG.jwt.secret);

      // リフレッシュトークンを生成
      const tokenId = generateSecureRandomString();
      const refreshPayload: RefreshJwtPayload = { username, tokenId };
      const refreshToken = jwt.sign(refreshPayload, CONFIG.jwt.refreshSecret);

      // リフレッシュトークンを配列に追加
      if (!user.refreshTokens) user.refreshTokens = [];
      user.refreshTokens.push({
        token: refreshToken,
        tokenId: tokenId,
        deviceInfo: req.get("User-Agent") || "Unknown",
        createdAt: new Date(),
        lastUsed: new Date(),
      });

      // 古いトークンを削除（5個以上は古いものから削除）
      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();

      res.json({ accessToken, refreshToken });
    } catch (err) {
      sendError(
        res,
        500,
        "Login failed",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

/**
 * @openapi
 * /public/refresh:
 *   post:
 *     summary: リフレッシュトークンを使用してアクセストークンを更新
 *     tags:
 *      - public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: リフレッシュトークン
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: 新しいアクセストークン
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: 新しいアクセストークン
 *       401:
 *         description: Invalid refresh token
 */
router.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
      // リフレッシュトークンを検証
      const decoded = jwt.verify(
        refreshToken,
        CONFIG.jwt.refreshSecret,
      ) as RefreshJwtPayload;

      // データベースからユーザーとリフレッシュトークンを確認
      const user = await User.findOne({
        username: decoded.username,
        "refreshTokens.token": refreshToken,
      });

      if (!user) {
        sendError(res, 401, "Invalid refresh token");
        return;
      }

      // 使用時刻を更新
      const tokenIndex = user.refreshTokens?.findIndex(
        (t) => t.token === refreshToken,
      );
      if (tokenIndex !== undefined && tokenIndex !== -1 && user.refreshTokens) {
        user.refreshTokens[tokenIndex].lastUsed = new Date();
        await user.save();
      }

      // 新しいアクセストークンを生成
      const accessPayload: JwtPayload = { username: decoded.username };
      const accessToken = jwt.sign(accessPayload, CONFIG.jwt.secret);

      res.json({ accessToken });
    } catch (err) {
      sendError(
        res,
        401,
        "Invalid refresh token",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

/**
 * @openapi
 * /public/logout:
 *   post:
 *     summary: ログアウト（リフレッシュトークンを無効化）
 *     tags:
 *      - public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: リフレッシュトークン
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: ログアウト成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  "/logout",
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
      // リフレッシュトークンを検証
      const decoded = jwt.verify(
        refreshToken,
        CONFIG.jwt.refreshSecret,
      ) as RefreshJwtPayload;

      // データベースから特定のリフレッシュトークンを削除
      await User.updateOne(
        { username: decoded.username },
        { $pull: { refreshTokens: { token: refreshToken } } },
      );

      res.json({ message: "Logged out successfully" });
    } catch (err) {
      sendError(
        res,
        401,
        "Invalid refresh token",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

/**
 * @openapi
 * /public/logout-all:
 *   post:
 *     summary: 全デバイスからログアウト（全リフレッシュトークンを無効化）
 *     tags:
 *      - public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: リフレッシュトークン
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: 全デバイスからログアウト成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  "/logout-all",
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
      // リフレッシュトークンを検証
      const decoded = jwt.verify(
        refreshToken,
        CONFIG.jwt.refreshSecret,
      ) as RefreshJwtPayload;

      // 全てのリフレッシュトークンを削除
      await User.updateOne(
        { username: decoded.username },
        { $unset: { refreshTokens: 1 } },
      );

      res.json({ message: "Logged out from all devices successfully" });
    } catch (err) {
      sendError(
        res,
        401,
        "Invalid refresh token",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

export default router;
