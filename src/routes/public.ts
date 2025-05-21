import bcrypt from "bcrypt";
import { type Request, type Response, Router } from "express";
import jwt from "jsonwebtoken";

import CONFIG from "../config";
import type { JwtPayload } from "../middleware/auth";
import { User } from "../models/user";
import { sendError, validateRequest } from "../utils";

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
router.post("/register", async (req: Request, res: Response) => {
  if (!validateRequest(req, res, ["username", "password"])) return;
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
});

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
 *         description: JWTトークン
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", async (req: Request, res: Response) => {
  if (!validateRequest(req, res, ["username", "password"])) return;
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
    const payload: JwtPayload = { username };
    const token = jwt.sign(payload, CONFIG.jwt.secret);
    res.json({ token });
  } catch (err) {
    sendError(
      res,
      500,
      "Login failed",
      err instanceof Error ? err : new Error(String(err)),
    );
  }
});

export default router;
