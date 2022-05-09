import { readFile } from "fs/promises";
import { isAbsolute, join } from "path";

export async function parseJsonFile<T = unknown>(path: string) {
  path = isAbsolute(path) ? path : join(process.cwd(), path);
  return JSON.parse((await readFile(path)).toString()) as T;
}
