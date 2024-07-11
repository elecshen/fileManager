import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import argon2 from "argon2";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import db from "../config/db";
import * as fs from "fs/promises";
import config from "../config/config";

const authRoutes = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post("/register", async (request, reply) => {
    const { username, password } = request.body as {
      username: string;
      password: string;
    };
    const hashedPassword = await argon2.hash(password);

    const user = await db
      .insertInto("user")
      .values({ username, password: hashedPassword })
      .returning(["id"])
      .executeTakeFirst();

    await db
      .insertInto("folder")
      .values({ name: username, userId: user!.id, parentId: null })
      .execute();

    await fs.mkdir(`./uploads/${user!.id}`, { recursive: true });

    reply.send({ id: user!.id });
  });

  fastify.post("/login", async (request, reply) => {
    const { username, password } = request.body as {
      username: string;
      password: string;
    };
    const user = await db
      .selectFrom("user")
      .selectAll()
      .where("username", "=", username)
      .executeTakeFirst();

    if (!user || !(await argon2.verify(user.password, password))) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret as Secret, {
      expiresIn: config.jwt.accessExpiresIn,
    });
    reply.send({ token });
  });
};

const authMiddleware = (
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) => {
  const token = request.headers.authorization?.split(" ")[1];

  if (!token) {
    reply.status(401).send({ message: "Authorization token missing" });
    return;
  }
  const decoded = verify(token);
  if (typeof decoded === "string") {
    reply.status(401).send({ message: decoded });
  } else {
    request.user = decoded;
    done();
  }
};

function verify(token: string): JwtPayload | string {
  try {
    return jwt.verify(token, config.jwt.secret as Secret);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return "Token has expired";
    } else if (err instanceof jwt.JsonWebTokenError) {
      return "Invalid token";
    } else {
      return "Token verification failed";
    }
  }
}

export { authRoutes, authMiddleware };
