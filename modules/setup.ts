import { ensureDir } from "./deps.ts";
import { runCommand } from "./commands.ts";

// Finalise la configuration
export async function finalizeSetup(projectName: string): Promise<void> {
  // Créer le dossier static
  await ensureDir("static");

  // Générer le fichier requirements.txt
  console.log("📝 Génération du fichier de dépendances !");
  await runCommand("pipenv requirements --exclude-markers > requirements.txt");

  // Exécuter les migrations
  console.log("🛢️ Migration de la database !");
  await runCommand("pipenv run python manage.py makemigrations");
  await runCommand("pipenv run python manage.py migrate");

  // Créer le superutilisateur admin
  const adminScript = `
from django.contrib.auth import get_user_model

User = get_user_model()
if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser("admin", "admin@example.com", "admin")
    print("✅ Superutilisateur 'admin' créé avec succès.")
else:
    print("⚠️  Le superutilisateur 'admin' existe déjà.")
`;
  console.log("🛡️  Création d'un compte administrateur !");
  await Deno.writeTextFile("create_admin.py", adminScript);
  await runCommand("pipenv run python manage.py shell < create_admin.py");
  await Deno.remove("create_admin.py");

  // Formatter le code
  console.log("🖊️ Formattage du code !");
  await runCommand("pipenv run black .");
  await runCommand("pipenv run isort .");

  console.log("✅ Projet Django configuré avec succès !");
}
