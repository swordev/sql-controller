import check from "./actions/check";
import start from "./actions/start";
import sync from "./actions/sync";
import { red } from "chalk";
import { program } from "commander";

export type GlobalOptions = {
  verbose: boolean;
  configPath: string;
};

function getGlobalOptions(): GlobalOptions {
  const options = program.opts() as GlobalOptions;
  return options;
}

function makeAction(cb: (...args: unknown[]) => Promise<unknown>) {
  return async (...args: unknown[]) => {
    try {
      const result: {
        exitCode?: number;
      } = (await cb(...args)) as never;
      if (typeof result?.exitCode === "number") process.exit(result.exitCode);
    } catch (error) {
      console.error(red((error as Error).stack));
      process.exit(1);
    }
  };
}

export default () => {
  const pkgPath = __filename.endsWith(".ts")
    ? `${__dirname}/../package.json`
    : `${__dirname}/package.json`;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(pkgPath) as {
    name: string;
    version: string;
  };
  program.name(pkg.name);
  program.version(pkg.version);

  program
    .option("-v,--verbose")
    .option(
      "-c,--config-path [path]",
      "Config path",
      "./sql-controller.config.json",
    );
  program.command("check").action(
    makeAction(async () => {
      const globalOptions = getGlobalOptions();
      return await check(globalOptions);
    }),
  );
  program.command("start").action(
    makeAction(async () => {
      const globalOptions = getGlobalOptions();
      return await start(globalOptions);
    }),
  );
  program.command("sync").action(
    makeAction(async () => {
      const globalOptions = getGlobalOptions();
      return await sync(globalOptions);
    }),
  );
  return program;
};
