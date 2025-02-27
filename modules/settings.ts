// Modifie le fichier settings.py
export async function updateSettings(projectName: string): Promise<void> {
  const SETTINGS_FILE = `${projectName}/settings.py`;
  console.log(`⚙️  Mise à jour de ${SETTINGS_FILE}...`);

  // Lire le fichier settings.py
  let settingsContent = await Deno.readTextFile(SETTINGS_FILE);

  // Ajouter les imports
  settingsContent = `from decouple import Csv, config\n${settingsContent}`;

  // Ajouter Jazzmin au-dessus de django.contrib.admin
  settingsContent = settingsContent.replace(
    "django.contrib.admin",
    `jazzmin",\n    "django.contrib.admin`
  );

  // Ajouter django_extensions après django.contrib.admin
  settingsContent = settingsContent.replace(
    "django.contrib.admin",
    `django.contrib.admin",\n    "django_extensions`
  );

  // Mettre Django en français
  settingsContent = settingsContent.replace(
    "en-us",
    "fr-fr"
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
