# Vérification des dépendances
if ! command -v pipenv &> /dev/null
then
    echo "pipenv n'est pas installé. Installez-le avec 'pip install pipenv'."
    exit 1
fi

# Nom du projet Django
PROJECT_NAME="main"

echo "🛠️  Initialisation du projet Django..."

# Initialisation de pipenv et installation des dépendances
pipenv install django django-extensions django-jazzmin python-decouple
pipenv install flake8 black isort pytest pytest-django django-silk django-debug-toolbar --dev

# Création du projet Django
pipenv run django-admin startproject $PROJECT_NAME .

# Modification de settings.py
SETTINGS_FILE="$PROJECT_NAME/settings.py"
echo "⚙️  Mise à jour de $SETTINGS_FILE..."

# Importation de decouple en haut du fichier
sed -i "1s|^|from decouple import Csv, config\n|" "$SETTINGS_FILE"


# Ajout de "jazzmin" au-dessus de "django.contrib.admin"
awk '/django\.contrib\.admin/ {print "    '\''jazzmin'\'',"}1' "$SETTINGS_FILE" > temp && mv temp "$SETTINGS_FILE"

# Ajout de "django_extensions"
sed -i "/'django.contrib.admin'/a \    'django_extensions'," "$SETTINGS_FILE"


# Remplacement de la configuration DATABASES
sed -i "/DATABASES = {/,+6d" "$SETTINGS_FILE"
cat <<EOL >> "$SETTINGS_FILE"

DATABASES = {
    "default": {
        "ENGINE": config("DB_ENGINE", default="django.db.backends.sqlite3"),
        "NAME": config("DB_NAME", default=BASE_DIR / "db.sqlite3"),
        #'USER': config('DB_USER', default=''),
        #'PASSWORD': config('DB_PASSWORD', default=''),
        #'HOST': config('DB_HOST', default='localhost'),
        #'PORT': config('DB_PORT', default=''),
    }
}
EOL