import { type Response, Router } from "express";

import type { AuthRequest } from "../../middleware/auth";

const router = Router();

/**
 * @openapi
 * /auth:
 *   get:
 *     summary: 認証テスト用エンドポイント
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hello + ユーザー名
 *       401:
 *         description: No token
 *       403:
 *         description: Invalid token
 */
router.get("/", (req: AuthRequest, res: Response) => {
  res.send(`Hello ${req.user?.username}`);
});

export default router;
