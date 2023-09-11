import { Password, RootAccount } from "../utils/self/config";
import { readFile } from "fs/promises";

export async function parsePassword(password: Password) {
  return typeof password === "string"
    ? password
    : (await readFile(password.path)).toString();
}

export type GlobalOptions = RootAccount & {
  log?: boolean;
};

export type CreateUserOptions = {
  username: string;
  password: Password;
  root?: boolean;
};

export type CreateDatabaseOptions = {
  database: string;
  charset?: string;
  collate?: string;
};

export type CreateDatabasePermissionOptions = {
  username: string;
  database: string;
  /**
   * @default ["ALL"]
   */
  type?: string[];
  /**
   * @default "%"
   */
  host?: string;
};

export type CheckLoginOptions = {
  hostname: string | undefined;
  username: string;
  password: Password;
  log?: boolean;
};

export type CheckDatabasePermissionOptions = CheckLoginOptions & {
  database: string;
};

export abstract class DriverAbstract {
  constructor(readonly globalOptions: GlobalOptions) {}
  abstract createUser(options: CreateUserOptions): Promise<void>;
  abstract createDatabase(options: CreateDatabaseOptions): Promise<void>;
  abstract createDatabasePermission(
    options: CreateDatabasePermissionOptions
  ): Promise<void>;
  abstract checkLogin(options: CheckLoginOptions): Promise<boolean>;
  abstract checkDatabase(database: string): Promise<boolean>;
  abstract checkDatabasePermission(
    options: CheckDatabasePermissionOptions
  ): Promise<boolean>;
  abstract checkUser(username: string): Promise<boolean>;
  abstract query(input: string): Promise<unknown>;
}
