import { parsePassword, DriverAbstract } from "../drivers/DriverAbstract";
import { createDriver } from "../drivers/createDriver";
import { checkSafePassword, parseFile } from "../utils/self/config";
import { green, cyan, grey, red } from "chalk";

function log(
  type: "error" | "success" | "info" | "debug",
  alias: string,
  message: string
) {
  const colorize = {
    error: red,
    success: green,
    debug: grey,
    info: cyan,
  }[type];
  const text = `[${alias}] ${colorize(message)}`;
  if (type === "error") {
    console.info(text);
  } else {
    console.error(text);
  }
}

export default async function sync(options: {
  verbose?: boolean;
  dryRun?: boolean;
  configPath: string;
}) {
  const config = await parseFile(options.configPath);
  const drivers: Record<string, DriverAbstract> = {};
  const successRootAccount: Record<string, boolean> = {};
  let success = true;

  for (const alias in config.rootAccount) {
    const rootAccount = config.rootAccount[alias];
    const driver = (drivers[alias] = createDriver(rootAccount.driver, {
      ...rootAccount,
      log: options.verbose,
    }));
    if (
      await driver.checkLogin({
        hostname: rootAccount.hostname,
        username: rootAccount.username,
        password: rootAccount.password,
        log: options.verbose,
      })
    ) {
      successRootAccount[alias] = true;
    } else {
      log("error", alias, "Invalid root password");
    }
  }

  for (const alias in config.accounts) {
    if (!successRootAccount[alias]) continue;
    const rootAccount = config.rootAccount[alias];
    if (!rootAccount) {
      log("error", alias, "Root account not found");
      continue;
    }
    const driver = drivers[alias];
    const accounts = config.accounts[alias].sort(
      (a, b) => (b.createDatabase ? 1 : 0) - (a.createDatabase ? 1 : 0)
    );
    for (const account of accounts) {
      log("info", alias, `Syncing ${account.username}`);

      const existsUser = await driver.checkUser(account.username);

      if (existsUser) {
        if (
          await driver.checkLogin({
            hostname: rootAccount.hostname,
            username: account.username,
            password: account.password,
          })
        ) {
          log("debug", alias, "User already exist");
        } else {
          success = false;
          log("error", alias, "Invalid password");
        }
      } else {
        if (options.dryRun) {
          success = false;
          log("error", alias, "User is not created");
        } else {
          const password = await parsePassword(account.password);
          if (config.allowUnsafePassword || checkSafePassword(password)) {
            await driver.createUser({
              username: account.username,
              password: password,
            });
            log("success", alias, "User created");
          } else {
            log("error", alias, "User password is unsafe");
          }
        }
      }

      const database = account.database ?? account.username;

      if (account.createDatabase) {
        const existsDatabase = await driver.checkDatabase(database);
        if (existsDatabase) {
          log("debug", alias, "Database already exists");
        } else {
          if (options.dryRun) {
            success = false;
            log("error", alias, "Database is not created");
          } else {
            await driver.createDatabase({
              database,
              charset: account.databaseCharset,
              collate: account.databaseCollate,
            });
            log("info", alias, "Database created");
          }
        }
      }

      if (account.createDatabasePermission ?? account.createDatabase) {
        const databasePermission = await driver.checkDatabasePermission({
          database,
          hostname: rootAccount.hostname,
          username: account.username,
          password: account.password,
        });
        if (databasePermission) {
          log("debug", alias, `Database permission already created`);
        } else {
          if (options.dryRun) {
            success = false;
            log("error", alias, "Database permission is not created");
          } else {
            await driver.createDatabasePermission({
              database,
              username: account.username,
            });
            log("info", alias, `Database permission created`);
          }
        }
      }
    }
  }
  return { exitCode: success ? 0 : 1 };
}
