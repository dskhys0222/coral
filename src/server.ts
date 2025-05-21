import mongoose from "mongoose";
import app from "./app";
import CONFIG from "./config";

// サーバー起動
const server = app.listen(CONFIG.port, () => {
  console.log(`Server running at http://localhost:${CONFIG.port}`);
});

// 終了処理の管理（SIGTERM シグナルハンドリング）
process.on("SIGTERM", () => {
  console.log(
    "SIGTERM シグナルを受信しました。アプリケーションを優雅に終了します...",
  );

  // HTTPサーバーをシャットダウン
  server.close(() => {
    console.log("HTTPサーバーを停止しました。");

    // MongoDBコネクションを閉じる
    mongoose.connection.close().then(() => {
      console.log("MongoDBコネクションを閉じました。");
      console.log("アプリケーションを終了します。");
      process.exit(0);
    });
  });

  // 10秒後に強制終了（タイムアウト）
  setTimeout(() => {
    console.error("優雅な終了に失敗しました。強制終了します。");
    process.exit(1);
  }, 10000);
});
