import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import * as fs from "fs/promises";
import db, { SelectedFolder } from "../config/db";
import { authMiddleware } from "./auth";
import { MultipartFile, MultipartValue } from "@fastify/multipart";

function getFolder(folderId: number, userId: number) {
  return db
    .selectFrom("folder")
    .selectAll()
    .where("id", "=", folderId)
    .where("userId", "=", userId)
    .executeTakeFirst();
}

function getRootFolder(userId: number) {
  return db
    .selectFrom("folder")
    .selectAll()
    .where("parentId", "is", null)
    .where("userId", "=", userId)
    .executeTakeFirst();
}

const routes = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get("/", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    let { folderId } = request.query as { folderId?: number };

    let folder: SelectedFolder | undefined;
    if (folderId) {
      folder = await getFolder(folderId, userId);
    } else {
      folder = await getRootFolder(userId);
    }
    if (!folder) {
      return reply.code(404).send({ error: "Folder not found" });
    }

    const folders = await db
      .selectFrom("folder")
      .select(["id", "name"])
      .where("parentId", "=", folder.id)
      .where("userId", "=", userId)
      .execute();

    const files = await db
      .selectFrom("file")
      .select(["id", "name"])
      .where("folderId", "=", folder.id)
      .execute();

    reply.send({
      currentDir: { id: folder.id, name: folder.name },
      folders,
      files,
    });
  });

  fastify.post("/", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const { name, parentId } = request.body as {
      name: string;
      parentId: number;
    };

    const folder = await getFolder(parentId, userId);
    if (!folder) {
      return reply.code(404).send({ error: "Folder not found" });
    }
    const newfolder = await db
      .insertInto("folder")
      .values({ name, userId, parentId: folder.id })
      .returning(["id"])
      .executeTakeFirst();

    reply.send({ id: newfolder!.id });
  });

  fastify.put(
    "/:folderId",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { userId } = request.user;
      const { folderId } = request.params as { folderId: number };
      const { newName, newParentId } = request.body as {
        newName?: string;
        newParentId?: number;
      };

      const folder = await getFolder(folderId, userId);
      if (!folder) {
        return reply.code(404).send({ error: "Folder not found" });
      }
      if (folder.parentId === null) {
        return reply.code(400).send({ error: "Folder cannot be edited" });
      }

      if (newName) {
        await db
          .updateTable("folder")
          .set({ name: newName })
          .where("id", "=", folderId)
          .execute();
      }

      if (newParentId) {
        await db
          .updateTable("folder")
          .set({ parentId: newParentId })
          .where("id", "=", folderId)
          .execute();
      }

      reply.send({ id: folder.id });
    },
  );

  fastify.delete(
    "/:folderId",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { userId } = request.user;
      const { folderId } = request.params as { folderId: number };

      const folder = await getFolder(folderId, userId);
      if (!folder) {
        return reply.code(404).send({ error: "Folder not found" });
      }
      if (folder.parentId === null) {
        return reply.code(400).send({ error: "Folder cannot be deleted" });
      }

      const folders = await db
        .withRecursive("r", (cte) =>
          cte
            .selectFrom("folder")
            .select(["folder.id", "folder.parentId"])
            .where("folder.id", "=", folder.id)
            .unionAll(
              cte
                .selectFrom("folder")
                .select(["folder.id", "folder.parentId"])
                .innerJoin("r", "folder.parentId", "r.id"),
            ),
        )
        .selectFrom("r")
        .select(["r.id"])
        .execute();

      const files = await db
        .selectFrom("file")
        .select(["id", "filepath"])
        .where(
          "file.folderId",
          "in",
          folders.map((result) => result.id),
        )
        .execute();

      for (const file of files) {
        await fs.rm(file.filepath);
      }
      if (files.length !== 0) {
        await db
          .deleteFrom("file")
          .where(
            "id",
            "in",
            files.map((file) => file.id),
          )
          .execute();
      }
      if (folders.length !== 0) {
        await db
          .deleteFrom("folder")
          .where(
            "id",
            "in",
            folders.map((folder) => folder.id),
          )
          .execute();
      }

      reply.send({ id: folder.id });
    },
  );

  fastify.post(
    "/files",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { userId } = request.user;
      const data = await request.file();
      if (!data || !("folderId" in data.fields) || !("file" in data.fields)) {
        return reply.code(400).send({ error: "Bad request: values missing" });
      }
      const folderId = (data.fields.folderId as MultipartValue).value as number;

      const folder = await getFolder(folderId, userId);
      if (!folder) {
        return reply.code(404).send({ error: "Folder not found" });
      }

      const filePath = `./uploads/${userId}/${Date.now()}_${data.filename}`;
      await fs.writeFile(filePath, (data.fields.file as MultipartFile).file);

      const fileId = await db
        .insertInto("file")
        .values({ name: data.filename, filepath: filePath, folderId })
        .returning(["id"])
        .executeTakeFirst();

      reply.send({ id: fileId?.id });
    },
  );

  fastify.delete(
    "/files/:fileId",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { userId } = request.user;
      const { fileId } = request.params as { fileId: number };

      const file = await db
        .selectFrom("file")
        .selectAll()
        .where("id", "=", fileId)
        .executeTakeFirst();
      if (!file) {
        return reply.code(404).send({ error: "File not found" });
      }
      const folder = await getFolder(file.folderId, userId);
      if (!folder) {
        return reply.code(404).send({ error: "File not found" });
      }

      await db.deleteFrom("file").where("id", "=", file.id).execute();

      await fs.rm(file.filepath);

      reply.send({ id: file.id });
    },
  );
};

export default routes;
