import express from "express";
import mongoose from "mongoose";

import CONFIG from "./config";
import routes from "./routes";

const app = express();

// ミドルウェア
app.use(express.json());

// ルート
app.use(routes);

// MongoDB接続
(async () => {
  const mongoUrl = await CONFIG.getMongoUrl();
  console.debug("MongoDB URL: ", mongoUrl);
  mongoose
    .connect(mongoUrl)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error: ", err));
})();

export default app;
