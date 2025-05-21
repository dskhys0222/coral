import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import app from "./app";
import type { TaskDocument } from "./models/task";

afterAll(async () => {
  await mongoose.connection
    .close()
    .then(() => console.log("MongoDB connection closed"));
});

describe("ユーザー登録API", () => {
  const user = { username: "testuser", password: "testpass" };
  let token = "";

  test("ユーザー登録に成功する", async () => {
    const res = await request(app).post("/public/register").send(user);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered");
  });

  test("同じユーザー名で登録すると409", async () => {
    const res = await request(app).post("/public/register").send(user);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username already exists");
  });

  test("ログイン成功でトークンを取得できる", async () => {
    const res = await request(app).post("/public/login").send(user);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });
});

describe("タスクAPI", () => {
  let token = "";
  let createdTaskId = "";
  const user = { username: "taskuser", password: "taskpass" };
  const encryptedData = "dummy-encrypted-data";
  let otherToken = "";

  beforeAll(async () => {
    // ユーザー登録＆ログイン
    await request(app).post("/public/register").send(user);
    const res = await request(app).post("/public/login").send(user);
    token = res.body.token;

    // 他ユーザーを1回だけ作成しトークン取得
    const otherUser = { username: "otheruser", password: "otherpass" };
    await request(app).post("/public/register").send(otherUser);
    const loginRes = await request(app).post("/public/login").send(otherUser);
    otherToken = loginRes.body.token;
  });

  test("タスク新規作成", async () => {
    const res = await request(app)
      .post("/auth/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ encryptedData });
    expect(res.status).toBe(201);
    expect(res.body.encryptedData).toBe(encryptedData);
    expect(res.body.username).toBe(user.username);
    createdTaskId = res.body._id;
  });

  test("タスク一覧取得", async () => {
    const res = await request(app)
      .get("/auth/tasks")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((t: { _id: string }) => t._id === createdTaskId)).toBe(
      true,
    );
  });

  test("タスク更新", async () => {
    const updatedData = "updated-encrypted-data";
    const res = await request(app)
      .put(`/auth/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ encryptedData: updatedData });
    expect(res.status).toBe(200);
    expect(res.body.encryptedData).toBe(updatedData);
  });

  test("タスク削除", async () => {
    const res = await request(app)
      .delete(`/auth/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Task deleted");
  });

  test("認証なしでタスク新規作成は401", async () => {
    const res = await request(app)
      .post("/auth/tasks")
      .send({ encryptedData: "x" });
    expect(res.status).toBe(401);
  });

  test("認証なしでタスク一括取得は401", async () => {
    const res = await request(app).get("/auth/tasks");
    expect(res.status).toBe(401);
  });

  test("認証なしでタスク更新は401", async () => {
    const res = await request(app)
      .put("/auth/tasks/dummyid")
      .send({ encryptedData: "x" });
    expect(res.status).toBe(401);
  });

  test("認証なしでタスク削除は401", async () => {
    const res = await request(app).delete("/auth/tasks/dummyid");
    expect(res.status).toBe(401);
  });

  test("他ユーザーのタスクは取得できない", async () => {
    const res = await request(app)
      .get("/auth/tasks")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((x: TaskDocument) => x._id === createdTaskId)).toBe(
      false,
    );
  });

  test("他ユーザーのタスクは更新できない", async () => {
    const res = await request(app)
      .put(`/auth/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ encryptedData: "hacked" });
    expect(res.status).toBe(404);
  });

  test("他ユーザーのタスクは削除できない", async () => {
    const res = await request(app)
      .delete(`/auth/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});
