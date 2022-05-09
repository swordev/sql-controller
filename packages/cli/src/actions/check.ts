import sync from "./sync";

export default async function check(options: {
  verbose?: boolean;
  configPath: string;
}) {
  return await sync({
    ...options,
    dryRun: true,
  });
}
