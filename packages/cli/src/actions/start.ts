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
  let syncing = false;
  let synced = false;

  const safeSync = async () => {
    syncing = true;
    console.info(grey("Syncing..."));
    try {
      const [result, config] = await run(options, lastConfig);
      lastConfig = config;
      if (!result?.exitCode) {
        synced = true;
        console.info(green("Synced successfully"));
      } else {
        synced = false;
      }
    } catch (error) {
      synced = false;
      console.error(red(error));
    } finally {
      syncing = false;
    }
  };

  await safeSync();

  console.info(grey("Watching changes..."));

  const watcher = watch(options.configPath, {
    ignoreInitial: true,
    usePolling: true,
  });

  const interval = setInterval(async () => {
    if (!syncing && !synced) await safeSync();
  }, 30_000);

  try {
    await new Promise((resolve, reject) =>
      watcher.on("error", reject).on("all", safeSync)
    );
  } finally {
    clearInterval(interval);
  }
}
