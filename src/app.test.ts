import mongoose from "mongoose";
import request from "supertest";
import { afterAll, describe, expect, test } from "vitest";
import app from "./app";

describe("内部結合テスト: 認証API", () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  const user = { username: "testuser", password: "testpass" };
  let token = "";

  test("ユーザー登録に成功する", async () => {
    const res = await request(app).post("/register").send(user);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered");
  });

  test("同じユーザー名で登録すると409", async () => {
    const res = await request(app).post("/register").send(user);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username already exists");
  });

  test("ログイン成功でトークンを取得できる", async () => {
    const res = await request(app).post("/login").send(user);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test("認証付きエンドポイントにアクセスできる", async () => {
    const res = await request(app)
      .get("/auth")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(user.username);
  });

  test("トークンなしで認証付きエンドポイントは401", async () => {
    const res = await request(app).get("/auth");
    expect(res.status).toBe(401);
  });
});
