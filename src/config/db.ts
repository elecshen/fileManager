import {
  Generated,
  Insertable,
  Selectable,
  Updateable,
  Kysely,
  PostgresDialect,
} from "kysely";
import { Pool } from "pg";
import config from "./config";

const pgDialect = new PostgresDialect({
  pool: new Pool(config.db),
});

interface User {
  id: Generated<number>;
  username: string;
  password: string;
}

export type SelectedUser = Selectable<User>;
export type NewUser = Insertable<User>;
export type UserUpdate = Updateable<User>;

interface Folder {
  id: Generated<number>;
  name: string;
  userId: number;
  parentId: number | null;
}

export type SelectedFolder = Selectable<Folder>;
export type NewFolder = Insertable<Folder>;
export type FolderUpdate = Updateable<Folder>;

interface File {
  id: Generated<number>;
  name: string;
  filepath: string;
  folderId: number;
}

export type SelectedFile = Selectable<File>;
export type NewFile = Insertable<File>;
export type FileUpdate = Updateable<File>;

interface DB {
  user: User;
  folder: Folder;
  file: File;
}

const db = new Kysely<DB>({
  dialect: pgDialect,
  log(event) {
    if (event.level === "query") {
      console.log(event.query.sql);
      console.log(event.query.parameters);
    }
  },
});

export default db;
