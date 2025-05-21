import { type Request, type Response, Router } from "express";
import authRoutes from "./auth";
import { swaggerSpec, swaggerUi } from "./swagger";

const router = Router();

// Swagger UI
router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ホームページ
router.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// 認証関連のルートをマウント
router.use("/", authRoutes);

export default router;
