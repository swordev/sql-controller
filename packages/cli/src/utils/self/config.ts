import { parseJsonFile } from "../fs";
import Ajv from "ajv";
import { JSONSchema7 } from "json-schema";

const ajv = new Ajv();

export const configSchema: JSONSchema7 = {
  definitions: {
    password: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["path"],
          properties: {
            path: { type: "string" },
          },
        },
      ],
    },
    rootAccount: {
      type: "object",
      additionalProperties: false,
      required: ["username", "password", "driver"],
      properties: {
        hostname: { type: "string" },
        username: { type: "string" },
        password: { $ref: "#/definitions/password" },
        driver: { enum: ["mysql", "postgres"] },
      },
    },
    account: {
      type: "object",
      additionalProperties: false,
      required: ["username", "password"],
      properties: {
        username: { type: "string" },
        password: { $ref: "#/definitions/password" },
        createDatabase: { type: "boolean" },
        createDatabasePermission: { type: "boolean" },
        database: { type: "string" },
        databaseCharset: { type: "string" },
        databaseCollate: { type: "string" },
      },
    },
  },
  type: "object",
  required: ["rootAccount", "accounts"],
  additionalProperties: false,
  properties: {
    rootAccount: {
      type: "object",
      patternProperties: {
        ".+": { $ref: "#/definitions/rootAccount" },
      },
    },
    allowUnsafePassword: { type: "boolean" },
    accounts: {
      type: "object",
      patternProperties: {
        ".+": {
          type: "array",
          items: {
            $ref: "#/definitions/account",
          },
        },
      },
    },
  },
};

export type Driver = "mysql" | "postgres";

export type RootAccount = {
  hostname?: string;
  username: string;
  password: Password;
  driver: Driver;
};

export type Account = {
  username: string;
  password: Password;
  root?: boolean;
  createDatabase?: boolean;
  /**
   * @default createDatabase
   */
  createDatabasePermission?: boolean;
  /**
   * @default username
   */
  database?: string;
  databaseCharset?: string;
  databaseCollate?: string;
};

export type Password = string | { path: string };

export type Config = {
  allowUnsafePassword?: boolean;
  rootAccount: Record<string, RootAccount>;
  accounts: Record<string, Account[]>;
};

export async function parseFile(path: string) {
  const json = await parseJsonFile<Config>(path);
  const valid = ajv.validate(configSchema, json);
  if (!valid)
    throw new Error(`Invalid config: ${JSON.stringify(ajv.errors, null, 2)}`);
  return json;
}

export function checkDiff(config1: Config, config2: Config) {
  return JSON.stringify(config1) !== JSON.stringify(config2);
}

export function checkSafePassword(password: string) {
  return typeof password === "string" && password.length >= 16;
}
