import { runCommand } from "./commands.ts";

// Vérifie si pipenv est installé
export async function checkDependencies(): Promise<void> {
  try {
    await runCommand("pipenv --version");
    console.log("✅ Pipenv est installé");
  } catch (_error) {
    console.error("❌ Pipenv n'est pas installé. Installez-le avec 'pip install pipenv'.");
    Deno.exit(1);
  }
}
