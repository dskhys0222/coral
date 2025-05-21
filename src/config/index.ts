export interface Config {
  port: number | string;
  mongodb: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  security: {
    saltRounds: number;
  };
}

const CONFIG: Config = {
  port: process.env.PORT || 3000,
  mongodb: {
    url: process.env.MONGO_URL || "mongodb:27017/mydb",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default_insecure_secret_for_development",
    expiresIn: "1h",
  },
  security: {
    saltRounds: 10,
  },
};

if (!process.env.JWT_SECRET) {
  console.warn(
    "警告: 環境変数JWT_SECRETが設定されていません。" +
      "開発用のデフォルトシークレットを使用します。" +
      "本番環境では必ずGitHubのシークレットなどで適切なJWT_SECRETを設定してください。",
  );
}

export default CONFIG;
