import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

dotenv.config();
const env = dotenv.config({ path: "postgres.secret.env", override: true });
dotenvExpand.expand(env);

interface DbConfig {
  host: string | undefined;
  port: number | undefined;
  user: string | undefined;
  password: string | undefined;
  database: string | undefined;
}

interface JWTConfig {
  secret: string | undefined;
  accessExpiresIn: string | undefined;
}

interface Config {
  db: DbConfig;
  jwt: JWTConfig;
}

const config: Config = {
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  },
};

export default config;
