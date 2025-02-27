import { parseArgs } from "./deps.ts";

export function parseArguments(): { projectName: string } {
  const args = parseArgs(Deno.args, {
    string: ["name"],
    default: { name: "main" },
  });

  return {
    projectName: args.name,
  };
}
