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

export default class PostgresDriver extends DriverAbstract {
  override async createUser(options: CreateUserOptions) {
    const password = await parsePassword(options.password);
    await this.query(
      `CREATE USER "${options.username}" WITH ENCRYPTED PASSWORD '${password}';`
    );
  }

  override async createDatabase(options: CreateDatabaseOptions) {
    await this.query(`CREATE DATABASE ${options.database};`);
  }

  override async createDatabasePermission(
    options: CreateDatabasePermissionOptions
  ) {
    await this.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${options.database} TO ${options.username};`
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
      database: "postgres",
      exec: {
        throwExitCode: (error, result) =>
          !result.stderr.includes("error: connection to server"),
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
    const result = await this.query(
      `SELECT datname FROM pg_database WHERE datname = '${database}';`,
      {
        skipColumnNames: true,
        globalOptions: options?.globalOptions,
        exec: {
          throwExitCode: (error, result) =>
            !result.stderr.includes("error: connection to server"),
        },
      }
    );
    const [row] = result.stdout.split(/\r?\n/g);
    return row.trim() === database;
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

  override async checkUser(username: string) {
    const result = await this.query(
      `SELECT usename FROM pg_catalog.pg_user WHERE usename = '${username}'`,
      {
        skipColumnNames: true,
      }
    );
    const [row] = result.stdout.split(/\r?\n/g);
    return row.trim() === username;
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
      "psql",
      [
        ...(globalOptions.hostname ? ["-h", globalOptions.hostname] : []),
        ...(options.skipColumnNames ? ["-t"] : []),
        ...(options.database ? ["-d", options.database] : []),
        "-U",
        globalOptions.username,
        "-c",
        input,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: await parsePassword(globalOptions.password),
        },
      },
      {
        ...(options.exec ?? {}),
        ...(this.globalOptions.log && {
          log: true,
        }),
        logInput: options.exec?.logInput ?? input,
      }
    );
  }
}
