import Fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";

import dirRoutes from "./routes/dir";
import { swaggerOptions, swaggerUiOptions } from "./config/swagger";
import { migrate } from "./utils/migrate";
import { authRoutes } from "./routes/auth";

// migrate("up");

try {
  const fastify = Fastify({ logger: true });

  fastify.register(import("@fastify/swagger"), swaggerOptions);
  fastify.register(import("@fastify/swagger-ui"), swaggerUiOptions);
  fastify.register(fastifyMultipart);
  fastify.register(authRoutes);
  fastify.register(dirRoutes, { prefix: "/folder" });

  fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.swagger();
    fastify.log.info(`Server listening at ${address}`);
  });
} catch (err) {
  console.log(err);
}
