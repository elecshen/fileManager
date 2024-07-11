import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("username", "varchar(15)", (col) => col.notNull().unique())
    .addColumn("password", "varchar", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("folder")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("userId", "integer", (col) =>
      col.notNull().references("user.id"),
    )
    .addColumn("parentId", "integer", (col) => col.references("folder.id"))
    .execute();

  await db.schema
    .createTable("file")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("filepath", "varchar", (col) => col.notNull())
    .addColumn("folderId", "integer", (col) =>
      col.notNull().references("folder.id"),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("file").execute();
  await db.schema.dropTable("folder").execute();
  await db.schema.dropTable("user").execute();
}
