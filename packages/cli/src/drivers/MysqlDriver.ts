import { exec, ExecExtraOptions } from "../utils/cli";
import {
  CreateDatabaseOptions,
  CreateUserOptions,
  GlobalOptions,
  CreateDatabasePermissionOptions,
  CheckLoginOptions,
  parsePassword,
  DriverAbstract,
  CheckDatabasePermissionOptions,
} from "./DriverAbstract";

export default class MysqlDriver extends DriverAbstract {
  override async createUser(options: CreateUserOptions) {
    const password = await parsePassword(options.password);
    const { username } = options;
    await this.query(
      `CREATE USER '${username}'@'%' IDENTIFIED BY '${password}';`
    );
    if (options.root)
      await this.query(
        `GRANT ALL PRIVILEGES ON *.* TO '${username}'@'%' WITH GRANT OPTION;`
      );
  }

  override async createDatabase(options: CreateDatabaseOptions) {
    const charsetExpr = options.charset
      ? ` CHARACTER SET ${options.charset}`
      : "";
    const collateExpr = options.collate ? ` COLLATE ${options.collate}` : "";
    await this.query(
      `CREATE DATABASE ${options.database} ${charsetExpr}${collateExpr};`
    );
  }

  override async createDatabasePermission(
    options: CreateDatabasePermissionOptions
  ) {
    await this.query(
      `GRANT ${options.type?.join(", ") ?? "ALL"} ON ${
        options.database
      }.* TO '${options.username}'@'${options.host ?? "%"}';`
    );
  }

  override async checkLogin(options: CheckLoginOptions) {
    const password = await parsePassword(options.password);
    const result = await this.query(`SELECT 'success' AS result`, {
      globalOptions: {
        ...this.globalOptions,
        hostname: options.hostname,
        username: options.username,
        password,
        log: options.log,
      },
      exec: {
        throwExitCode: (error, result) =>
          !result.stderr.includes("Access denied for user"),
      },
    });
    return result.exitCode ? false : true;
  }

  override async checkDatabase(
    database: string,
    options?: {
      globalOptions?: GlobalOptions;
    }
  ) {
    const result = await this.query(`SHOW DATABASES LIKE '${database}';`, {
      skipColumnNames: true,
      globalOptions: options?.globalOptions,
      exec: {
        throwExitCode: (error, result) =>
          !result.stderr.includes("Access denied for user"),
      },
    });
    const [row] = result.stdout.split(/\r?\n/g);
    return row === database;
  }

  override async checkUser(username: string) {
    const result = await this.query(
      `SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = '${username}') AS 'exists'`,
      {
        skipColumnNames: true,
      }
    );
    const [row] = result.stdout.split(/\r?\n/g);
    return row === "1";
  }

  override async checkDatabasePermission(
    options: CheckDatabasePermissionOptions
  ) {
    return await this.checkDatabase(options.database, {
      globalOptions: {
        ...this.globalOptions,
        ...options,
      },
    });
  }

  override async query(
    input: string,
    options: {
      database?: string;
      globalOptions?: GlobalOptions;
      skipColumnNames?: boolean;
      exec?: ExecExtraOptions;
    } = {}
  ) {
    const globalOptions = options.globalOptions || this.globalOptions;
    return await exec(
      "mysql",
      [
        ...(options.skipColumnNames ? ["-N"] : []),
        ...(globalOptions.hostname ? ["-h", globalOptions.hostname] : []),
        "-u",
        globalOptions.username,
        "-p" + (await parsePassword(globalOptions.password)),
        "-e",
        input,
      ],
      {},
      {
        ...(options.exec ?? {}),
        ...(this.globalOptions.log && {
          log: true,
        }),
        //logInput: options.exec?.logInput ?? input,
      }
    );
  }
}
