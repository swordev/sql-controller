import { checkDiff, Config, parseFile } from "../utils/self/config";
import sync from "./sync";
import { green, grey, red } from "chalk";
import { watch } from "chokidar";

type StartOptions = {
  verbose?: boolean;
  configPath: string;
};

async function run(options: StartOptions, lastConfig?: Config) {
  let config!: Config;
  let result: { exitCode: number } | undefined;

  try {
    config = await parseFile(options.configPath);
  } catch (error) {
    throw new Error(`Invalid config file: ${(error as Error).message}`);
  }

  try {
    if (!lastConfig || checkDiff(lastConfig, config)) {
      if (lastConfig) console.info(`Changes detected`);
      result = await sync(options);
    }
  } catch (error) {
    throw new Error(`Sync error: ${error}`);
  }

  return [result, config] as const;
}

export default async function start(options: {
  verbose?: boolean;
  configPath: string;
}) {
  let lastConfig: Config;

  console.info(grey("Syncing..."));

  const safeSync = async () => {
    try {
      const [result, config] = await run(options, lastConfig);
      lastConfig = config;
      if (!result?.exitCode) console.info(green("Synced successfully"));
    } catch (error) {
      console.error(red(error));
    }
  };

  await safeSync();

  console.info(grey("Watching changes..."));

  const watcher = watch(options.configPath, {
    ignoreInitial: true,
    usePolling: true,
  });

  return new Promise((resolve, reject) =>
    watcher.on("error", reject).on("all", safeSync)
  );
}
