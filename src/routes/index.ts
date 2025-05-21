import { type Request, type Response, Router } from "express";
import authRoutes from "./auth";

const router = Router();

// ホームページ
router.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// 認証関連のルートをマウント
router.use("/", authRoutes);

export default router;
