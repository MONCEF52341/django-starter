// django_setup.ts
import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";

// Analyse des arguments
const args = parse(Deno.args, {
  string: ["name"],
  default: { name: "main" },
});

const PROJECT_NAME = args.name;

// Fonction pour exécuter des commandes shell
async function runCommand(cmd: string, options: { cwd?: string } = {}): Promise<string> {
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

// Vérifie si pipenv est installé
async function checkDependencies(): Promise<void> {
  try {
    await runCommand("pipenv --version");
    console.log("✅ Pipenv est installé");
  } catch (_error) {
    console.error("❌ Pipenv n'est pas installé. Installez-le avec 'pip install pipenv'.");
    Deno.exit(1);
  }
}

// Initialise le projet Django avec pipenv
async function initProject(): Promise<void> {
  console.log("🛠️  Initialisation du projet Django...");

  // Installation des dépendances
  await runCommand("pipenv install django django-extensions django-jazzmin python-decouple");
  await runCommand("pipenv install flake8 black isort pytest pytest-django django-silk django-debug-toolbar --dev");

  // Création du projet Django
  await runCommand(`pipenv run django-admin startproject ${PROJECT_NAME} .`);
}

// Modifie le fichier settings.py
async function updateSettings(): Promise<void> {
  const SETTINGS_FILE = `${PROJECT_NAME}/settings.py`;
  console.log(`⚙️  Mise à jour de ${SETTINGS_FILE}...`);

  // Lire le fichier settings.py
  let settingsContent = await Deno.readTextFile(SETTINGS_FILE);

  // Ajouter les imports
  settingsContent = `from decouple import Csv, config\n${settingsContent}`;

  // Ajouter Jazzmin au-dessus de django.contrib.admin
  settingsContent = settingsContent.replace(
    /'django.contrib.admin'/,
    `'jazzmin',\n    'django.contrib.admin'`
  );

  // Ajouter django_extensions
  settingsContent = settingsContent.replace(
    /'django.contrib.admin',/,
    `'django.contrib.admin',\n    'django_extensions',`
  );

  // Remplacer la configuration DATABASES
  const databasesRegex = /DATABASES = \{[^}]*\}/s;
  const newDatabases = `DATABASES = {
    "default": {
        "ENGINE": config("DB_ENGINE", default="django.db.backends.sqlite3"),
        "NAME": config("DB_NAME", default=BASE_DIR / "db.sqlite3"),
        #'USER': config('DB_USER', default=''),
        #'PASSWORD': config('DB_PASSWORD', default=''),
        #'HOST': config('DB_HOST', default='localhost'),
        #'PORT': config('DB_PORT', default=''),
}`;
  settingsContent = settingsContent.replace(databasesRegex, newDatabases);

  // Remplacer SECRET_KEY, DEBUG et ALLOWED_HOSTS
  settingsContent = settingsContent.replace(
    /SECRET_KEY = .*/,
    `SECRET_KEY = config("SECRET_KEY")`
  );
  settingsContent = settingsContent.replace(
    /DEBUG = .*/,
    `DEBUG = config("DEBUG", default=False, cast=bool)`
  );
  settingsContent = settingsContent.replace(
    /ALLOWED_HOSTS = .*/,
    `ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())`
  );

  // Ajouter les configurations STATIC et MEDIA
  settingsContent += `
# STATIC FILES (CSS, JS, Images)
STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

# MEDIA FILES (fichiers uploadés par les utilisateurs)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Dev Tools
if DEBUG:
    INSTALLED_APPS += [
        "debug_toolbar",
        "silk",
    ]

    MIDDLEWARE = [
        "debug_toolbar.middleware.DebugToolbarMiddleware",
        "silk.middleware.SilkyMiddleware",
    ] + MIDDLEWARE

    INTERNAL_IPS = ["127.0.0.1"]

    # Silk Config (optionnel)
    SILKY_PYTHON_PROFILER = True
    SILKY_AUTHENTICATION = False
    SILKY_AUTHORISATION = False
`;

  // Écrire le fichier mis à jour
  await Deno.writeTextFile(SETTINGS_FILE, settingsContent);
}

// Modifie le fichier urls.py
async function updateUrls(): Promise<void> {
  const URLS_FILE = `${PROJECT_NAME}/urls.py`;
  console.log(`🔗 Mise à jour de ${URLS_FILE}...`);

  const urlsContent = `from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
]

if settings.DEBUG:
    import debug_toolbar
    from django.conf.urls.static import static

    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
    urlpatterns += [path("silk/", include("silk.urls", namespace="silk"))]
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
`;

  await Deno.writeTextFile(URLS_FILE, urlsContent);
}

// Crée les fichiers de configuration
async function createConfigFiles(): Promise<void> {
  // Fichier .flake8
  console.log("📄 Création du fichier .flake8...");
  const flake8Content = `[flake8]
max-line-length = 88
exclude = migrations, __pycache__, manage.py, settings.py
`;
  await Deno.writeTextFile(".flake8", flake8Content);

  // Fichier pytest.ini
  console.log("📄 Création du fichier pytest.ini...");
  const pytestContent = `[pytest]
DJANGO_SETTINGS_MODULE = ${PROJECT_NAME}.settings
python_files = tests.py test_*.py *_tests.py
`;
  await Deno.writeTextFile("pytest.ini", pytestContent);

  // Fichier .env
  console.log("📄 Création du fichier .env...");
  const envContent = `DEBUG=True
SECRET_KEY="django-insecure-x=ak0e3g*40827oz!lla93#^_!atgjko72b&5b%lo^f1geq@(!"
ALLOWED_HOSTS=127.0.0.1,localhost

DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# Exemple pour PostgreSQL (au cas où)
# DB_ENGINE=django.db.backends.postgresql
# DB_NAME=nom_de_la_db
# DB_USER=utilisateur
# DB_PASSWORD=mot_de_passe
# DB_HOST=localhost
# DB_PORT=5432
`;
  await Deno.writeTextFile(".env", envContent);
}

// Finalise la configuration
async function finalizeSetup(): Promise<void> {
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

// Fonction principale
async function main(): Promise<void> {
  try {
    await checkDependencies();
    await initProject();
    await updateSettings();
    await updateUrls();
    await createConfigFiles();
    await finalizeSetup();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`❌ Erreur: ${error.message}`);
    } else {
      console.error(`❌ Une erreur inconnue s'est produite: ${String(error)}`);
    }
    Deno.exit(1);
  }
}

await main();