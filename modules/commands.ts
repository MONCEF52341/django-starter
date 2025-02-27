import { CommandOptions } from "./deps.ts";

// Fonction pour exécuter des commandes shell
export async function runCommand(cmd: string, options: CommandOptions = {}): Promise<string> {
  const isWindows = Deno.build.os === "windows";
  let command: string[];
  let cmdStr: string;

  if (isWindows) {
    cmdStr = cmd;
    command = ["cmd", "/c"];
  } else {
    cmdStr = cmd;
    command = ["sh", "-c"];
  }

  const process = new Deno.Command(command[0], {
    args: [...command.slice(1), cmdStr],
    stdout: "piped",
    stderr: "piped",
    cwd: options.cwd,
  });

  const { code, stdout, stderr } = await process.output();
  const output = new TextDecoder().decode(stdout);
  const error = new TextDecoder().decode(stderr);

  if (code !== 0) {
    throw new Error(`Command failed: ${cmd}\nError: ${error}`);
  }

  return output;
}
