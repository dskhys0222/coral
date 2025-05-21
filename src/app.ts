import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import CONFIG from "./config";
import routes from "./routes";

const app = express();

// ミドルウェア
app.use(express.json());
app.use(cors());

// ルート
app.use(routes);

// MongoDB接続
(async () => {
  const mongoUrl = await CONFIG.getMongoUrl();
  mongoose
    .connect(mongoUrl)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error: ", err));
})();

export default app;
