import { type Request, type Response, Router } from "express";
import { auth } from "../middleware/auth";
import authRoutes from "./auth/auth";
import taskRoutes from "./auth/task";
import publicRoutes from "./public";
import { swaggerSpec, swaggerUi } from "./swagger";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// OpenAPI
router.use("/openapi", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// public: 認証不要API
router.use("/public", publicRoutes);

// auth: 認証必須API
router.use("/auth", auth);
router.use("/auth", authRoutes);
router.use("/auth", taskRoutes);

export default router;
