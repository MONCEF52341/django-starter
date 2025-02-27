import { runCommand } from "./commands.ts";

// Initialise le projet Django avec pipenv
export async function initProject(projectName: string): Promise<void> {
  console.log("🛠️  Initialisation du projet Django...");

  // Installation des dépendances
  console.log("Téléchargement des Dépendences (c'est long parce qu'elles sont lockées) ...");
  await runCommand("pipenv install django django-extensions django-jazzmin python-decouple");
  await runCommand("pipenv install flake8 black isort pytest pytest-django django-silk django-debug-toolbar --dev");

  // Création du projet Django
  await runCommand(`pipenv run django-admin startproject ${projectName} .`);
}
