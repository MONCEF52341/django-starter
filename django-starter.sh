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

# Remplacement de SECRET_KEY, DEBUG et ALLOWED_HOSTS
sed -i 's/^SECRET_KEY = .*/SECRET_KEY = config("SECRET_KEY")/' "$SETTINGS_FILE"
sed -i 's/^DEBUG = .*/DEBUG = config("DEBUG", default=False, cast=bool)/' "$SETTINGS_FILE"
sed -i 's/^ALLOWED_HOSTS = .*/ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())/' "$SETTINGS_FILE"

# Ajout des configurations STATIC et MEDIA
cat <<EOL >> "$SETTINGS_FILE"

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
EOL

# Modification de urls.py
URLS_FILE="$PROJECT_NAME/urls.py"

echo "🔗 Mise à jour de $URLS_FILE..."
cat <<EOL > "$URLS_FILE"
from django.conf import settings
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
EOL

# Création du fichier .flake8
echo "📄 Création du fichier .flake8..."
cat <<EOL > .flake8
[flake8]
max-line-length = 88
exclude = migrations, __pycache__, manage.py, settings.py
EOL

# Création du fichier pytest.ini
echo "📄 Création du fichier pytest.ini..."
cat <<EOL > pytest.ini
[pytest]
DJANGO_SETTINGS_MODULE = main.settings
python_files = tests.py test_*.py *_tests.py
EOL


# Création du fichier .env
echo "📄 Création du fichier .env..."
cat <<EOL > .env
DEBUG=True
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
EOL

pipenv requirements --exclude-markers > requirements.txt

pipenv run python manage.py makemigrations
pipenv run python manage.py migrate