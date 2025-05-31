import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import app from "./app";
import type { TaskDocument } from "./models/task";

beforeAll(async () => {
  // MongoDB接続を待つ
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      mongoose.connection.on("connected", resolve);
      mongoose.connection.on("open", resolve);
      // 既に接続済みの場合のために短いタイムアウトを設定
      setTimeout(resolve, 100);
    });
  }
}, 30000); // 30秒のタイムアウト

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
  }, 15000);

  test("同じユーザー名で登録すると409", async () => {
    const res = await request(app).post("/public/register").send(user);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username already exists");
  }, 15000);

  test("ログイン成功でトークンを取得できる", async () => {
    const res = await request(app).post("/public/login").send(user);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    token = res.body.accessToken;
  }, 15000);
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
    token = res.body.accessToken;

    // 他ユーザーを1回だけ作成しトークン取得
    const otherUser = { username: "otheruser", password: "otherpass" };
    await request(app).post("/public/register").send(otherUser);
    const otherRes = await request(app).post("/public/login").send(otherUser);
    otherToken = otherRes.body.accessToken;
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

describe("リフレッシュトークンAPI", () => {
  const user = { username: "refreshuser", password: "refreshpass" };
  let accessToken = "";
  let refreshToken = "";

  beforeAll(async () => {
    // ユーザー登録
    await request(app).post("/public/register").send(user);

    // ログインしてトークンを取得
    const res = await request(app).post("/public/login").send(user);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });
  test("リフレッシュトークンでアクセストークンを更新できる", async () => {
    const res = await request(app)
      .post("/public/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    // 新しいアクセストークンで認証できることを確認
    const newAccessToken = res.body.accessToken;
    const authRes = await request(app)
      .get("/auth")
      .set("Authorization", `Bearer ${newAccessToken}`);
    expect(authRes.status).toBe(200);
    expect(authRes.text).toContain(`Hello ${user.username}`);
  });

  test("無効なリフレッシュトークンは401エラー", async () => {
    const res = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid refresh token");
  });

  test("ログアウトでリフレッシュトークンが無効化される", async () => {
    // ログアウト
    const logoutRes = await request(app)
      .post("/public/logout")
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe("Logged out successfully");

    // ログアウト後はリフレッシュトークンが使用できない
    const refreshRes = await request(app)
      .post("/public/refresh")
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toBe("Invalid refresh token");
  });

  test("リフレッシュトークンなしでリフレッシュ要求は400エラー", async () => {
    const res = await request(app).post("/public/refresh").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("バリデーションエラー");
    expect(res.body.details).toBeDefined();
    expect(res.body.details[0].field).toBe("refreshToken");
    expect(res.body.details[0].message).toBe("Required");
  });
});

describe("複数デバイス対応API", () => {
  const user = { username: "multideviceuser", password: "multidevicepass" };
  let device1AccessToken = "";
  let device1RefreshToken = "";
  let device2AccessToken = "";
  let device2RefreshToken = "";
  let device3AccessToken = "";
  let device3RefreshToken = "";

  beforeAll(async () => {
    // ユーザー登録
    await request(app).post("/public/register").send(user);
  });

  test("複数のデバイスから同時ログインできる", async () => {
    // デバイス1からログイン
    const device1Login = await request(app)
      .post("/public/login")
      .set("User-Agent", "Device1-Chrome/99.0")
      .send(user);

    expect(device1Login.status).toBe(200);
    expect(device1Login.body.accessToken).toBeDefined();
    expect(device1Login.body.refreshToken).toBeDefined();
    device1AccessToken = device1Login.body.accessToken;
    device1RefreshToken = device1Login.body.refreshToken;

    // デバイス2からログイン
    const device2Login = await request(app)
      .post("/public/login")
      .set("User-Agent", "Device2-Safari/15.0")
      .send(user);

    expect(device2Login.status).toBe(200);
    expect(device2Login.body.accessToken).toBeDefined();
    expect(device2Login.body.refreshToken).toBeDefined();
    device2AccessToken = device2Login.body.accessToken;
    device2RefreshToken = device2Login.body.refreshToken;

    // デバイス3からログイン
    const device3Login = await request(app)
      .post("/public/login")
      .set("User-Agent", "Device3-Firefox/100.0")
      .send(user);

    expect(device3Login.status).toBe(200);
    expect(device3Login.body.accessToken).toBeDefined();
    expect(device3Login.body.refreshToken).toBeDefined();
    device3AccessToken = device3Login.body.accessToken;
    device3RefreshToken = device3Login.body.refreshToken;

    // 全てのトークンが異なることを確認
    expect(device1RefreshToken).not.toBe(device2RefreshToken);
    expect(device2RefreshToken).not.toBe(device3RefreshToken);
    expect(device1RefreshToken).not.toBe(device3RefreshToken);
  });

  test("各デバイスのリフレッシュトークンが独立して動作する", async () => {
    // デバイス1のリフレッシュトークンでアクセストークンを更新
    const device1Refresh = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device1RefreshToken });

    expect(device1Refresh.status).toBe(200);
    expect(device1Refresh.body.accessToken).toBeDefined();

    // デバイス2のリフレッシュトークンでアクセストークンを更新
    const device2Refresh = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device2RefreshToken });

    expect(device2Refresh.status).toBe(200);
    expect(device2Refresh.body.accessToken).toBeDefined();

    // デバイス3のリフレッシュトークンでアクセストークンを更新
    const device3Refresh = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device3RefreshToken });

    expect(device3Refresh.status).toBe(200);
    expect(device3Refresh.body.accessToken).toBeDefined();
  });

  test("特定のデバイスからログアウトしても他のデバイスは影響を受けない", async () => {
    // デバイス2からログアウト
    const logoutRes = await request(app)
      .post("/public/logout")
      .send({ refreshToken: device2RefreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe("Logged out successfully");

    // デバイス2のリフレッシュトークンは無効になる
    const device2RefreshFail = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device2RefreshToken });

    expect(device2RefreshFail.status).toBe(401);
    expect(device2RefreshFail.body.message).toBe("Invalid refresh token");

    // デバイス1とデバイス3のリフレッシュトークンは有効のまま
    const device1RefreshSuccess = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device1RefreshToken });

    expect(device1RefreshSuccess.status).toBe(200);
    expect(device1RefreshSuccess.body.accessToken).toBeDefined();

    const device3RefreshSuccess = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device3RefreshToken });

    expect(device3RefreshSuccess.status).toBe(200);
    expect(device3RefreshSuccess.body.accessToken).toBeDefined();
  });

  test("全デバイスからログアウトすると全てのリフレッシュトークンが無効化される", async () => {
    // 全デバイスからログアウト
    const logoutAllRes = await request(app)
      .post("/public/logout-all")
      .send({ refreshToken: device1RefreshToken });

    expect(logoutAllRes.status).toBe(200);
    expect(logoutAllRes.body.message).toBe(
      "Logged out from all devices successfully",
    );

    // 全てのリフレッシュトークンが無効になる
    const device1RefreshFail = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device1RefreshToken });

    expect(device1RefreshFail.status).toBe(401);
    expect(device1RefreshFail.body.message).toBe("Invalid refresh token");

    const device3RefreshFail = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: device3RefreshToken });

    expect(device3RefreshFail.status).toBe(401);
    expect(device3RefreshFail.body.message).toBe("Invalid refresh token");
  });

  test("6個以上のデバイスでログインすると古いトークンが削除される", async () => {
    // 新しいユーザーを作成
    const testUser = { username: "tokenrotationuser", password: "testpass" };
    await request(app).post("/public/register").send(testUser);

    const tokens = [];

    // 6個のデバイスでログイン
    for (let i = 1; i <= 6; i++) {
      const loginRes = await request(app)
        .post("/public/login")
        .set("User-Agent", `Device${i}`)
        .send(testUser);

      expect(loginRes.status).toBe(200);
      tokens.push(loginRes.body.refreshToken);
    }

    // 最初のトークン（最も古い）は削除されているはず
    const firstTokenRefresh = await request(app)
      .post("/public/refresh")
      .send({ refreshToken: tokens[0] });

    expect(firstTokenRefresh.status).toBe(401);
    expect(firstTokenRefresh.body.message).toBe("Invalid refresh token");

    // 最新の5個のトークンは有効であるべき
    for (let i = 1; i < 6; i++) {
      const tokenRefresh = await request(app)
        .post("/public/refresh")
        .send({ refreshToken: tokens[i] });

      expect(tokenRefresh.status).toBe(200);
      expect(tokenRefresh.body.accessToken).toBeDefined();
    }
  });

  test("無効なリフレッシュトークンで全デバイスログアウトは401エラー", async () => {
    const res = await request(app)
      .post("/public/logout-all")
      .send({ refreshToken: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid refresh token");
  });

  test("リフレッシュトークンなしで全デバイスログアウトは400エラー", async () => {
    const res = await request(app).post("/public/logout-all").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("バリデーションエラー");
    expect(res.body.details).toBeDefined();
    expect(res.body.details[0].field).toBe("refreshToken");
    expect(res.body.details[0].message).toBe("Required");
  });
});
