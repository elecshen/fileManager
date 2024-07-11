import { SwaggerOptions } from "@fastify/swagger";
import { FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import { join } from "node:path";
import { OpenAPIV3 } from "openapi-types";
// @ts-ignore
import SwaggerJSDoc from "swagger-jsdoc";

const swaggerDocument = SwaggerJSDoc({
  definition: {
    openapi: "3.1.0",
    info: {
      title: "File Management API",
      version: "1.0.0",
    },
  },
  apis: [join(process.cwd() + `/external/documentation/**/*.yaml`)],
});

export const swaggerOptions: SwaggerOptions = {
  mode: "static",
  specification: {
    document: swaggerDocument as OpenAPIV3.Document,
  },
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "none",
  },
};
