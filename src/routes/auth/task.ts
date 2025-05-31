import { type Response, Router } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validation";
import { Task } from "../../models/task";
import {
  createTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from "../../schemas/task";
import { sendError } from "../../utils";

const router = Router();

/**
 * @openapi
 * /auth/tasks:
 *   get:
 *     summary: タスク一覧取得
 *     tags:
 *      - task
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: タスク一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: 認証エラー
 */
router.get("/tasks", async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    sendError(
      res,
      500,
      "Failed to fetch tasks",
      err instanceof Error ? err : new Error(String(err)),
    );
  }
});

/**
 * @openapi
 * /auth/tasks:
 *   post:
 *     summary: タスク新規作成
 *     tags:
 *      - task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               encryptedData:
 *                 type: string
 *     responses:
 *       201:
 *         description: 作成されたタスク
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: encryptedDataが未指定
 *       401:
 *         description: 認証エラー
 */
router.post(
  "/tasks",
  validateBody(createTaskSchema),
  async (req: AuthRequest, res: Response) => {
    const { encryptedData } = req.body;
    const username = req.user?.username;

    try {
      const task = new Task({ username, encryptedData });
      await task.save();
      res.status(201).json(task);
    } catch (err) {
      sendError(
        res,
        500,
        "Failed to create task",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

/**
 * @openapi
 * /auth/tasks/{id}:
 *   put:
 *     summary: タスク更新
 *     tags:
 *      - task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: タスクID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               encryptedData:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新後のタスク
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: encryptedDataが未指定
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: タスクが存在しない
 */
router.put(
  "/tasks/:id",
  validateParams(taskIdSchema),
  validateBody(updateTaskSchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { encryptedData } = req.body;

    try {
      const task = await Task.findByIdAndUpdate(
        id,
        { encryptedData },
        { new: true },
      );
      if (!task) {
        sendError(res, 404, "Task not found");
        return;
      }
      res.json(task);
    } catch (err) {
      sendError(
        res,
        500,
        "Failed to update task",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

/**
 * @openapi
 * /auth/tasks/{id}:
 *   delete:
 *     summary: タスク削除
 *     tags:
 *      - task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: タスクID
 *     responses:
 *       200:
 *         description: 削除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: タスクが存在しない
 */
router.delete(
  "/tasks/:id",
  validateParams(taskIdSchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const task = await Task.findByIdAndDelete(id);
      if (!task) {
        sendError(res, 404, "Task not found");
        return;
      }
      res.json({ message: "Task deleted" });
    } catch (err) {
      sendError(
        res,
        500,
        "Failed to delete task",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  },
);

export default router;
