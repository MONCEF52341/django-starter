// Importation des modules
import { parseArguments } from "./modules/args.ts";
import { checkDependencies } from "./modules/deps-checker.ts";
import { initProject } from "./modules/project.ts";
import { updateSettings } from "./modules/settings.ts";
import { updateUrls } from "./modules/urls.ts";
import { createConfigFiles } from "./modules/config.ts";
import { finalizeSetup } from "./modules/setup.ts";

// Fonction principale
async function main(): Promise<void> {
  try {
    // Récupérer les arguments de ligne de commande
    const { projectName } = parseArguments();

    // Exécuter le workflow d'installation
    await checkDependencies();
    await initProject(projectName);
    await updateSettings(projectName);
    await updateUrls(projectName);
    await createConfigFiles(projectName);
    await finalizeSetup(projectName);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`❌ Erreur: ${error.message}`);
    } else {
      console.error(`❌ Une erreur inconnue s'est produite: ${String(error)}`);
    }
    Deno.exit(1);
  }
}

// Exécution de la fonction principale
await main();