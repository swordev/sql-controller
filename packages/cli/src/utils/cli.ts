import { grey, yellow } from "chalk";
import { spawn, SpawnOptions } from "child_process";

export type ExecExtraOptions = {
  log?: boolean;
  logInput?: string;
  onData?: (data: Buffer) => void;
  /**
   * @default true
   */
  throwExitCode?:
    | boolean
    | ((error: Error, result: ExecResult) => boolean | Error);
};

type ExecResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function exec(
  command: string,
  args: string[],
  options?: SpawnOptions,
  extraOptions: ExecExtraOptions = {}
) {
  if (extraOptions.log)
    console.log(
      "+",
      yellow(extraOptions.logInput ?? `${command} ${args.join(" ")}`)
    );
  return new Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const result: {
      exitCode: number;
      stdout: string;
      stderr: string;
    } = {
      exitCode: 0,
      stdout: "",
      stderr: "",
    };
    const p = spawn(
      command,
      args,
      Object.assign(
        {
          stdio: ["inherit", "pipe", "pipe"],
        } as SpawnOptions,
        options
      )
    );
    p.stdout?.on("data", (chunk: Buffer) => {
      result.stdout += chunk.toString();
      extraOptions.onData?.(chunk);
      if (extraOptions.log) process.stdout.write(grey(chunk.toString()));
    });
    p.stderr?.on("data", (chunk: Buffer) => {
      result.stderr += chunk.toString();
      extraOptions.onData?.(chunk);
      if (extraOptions.log) process.stdout.write(grey(chunk.toString()));
    });

    p.on("error", reject);
    p.on("close", (exitCode) => {
      result.exitCode = exitCode ?? 0;
      if (exitCode) {
        const error: Error = new Error(`Exit code: ${exitCode}`);
        let throwExitCode: Error | boolean = true;
        if (typeof extraOptions.throwExitCode === "function") {
          throwExitCode = extraOptions.throwExitCode(error, result);
        } else if (!(extraOptions.throwExitCode ?? true)) {
          throwExitCode = false;
        }
        if (throwExitCode) {
          return reject(throwExitCode instanceof Error ? throwExitCode : error);
        }
      }
      resolve(result);
    });
  });
}
