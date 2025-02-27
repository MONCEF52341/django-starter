@echo off
setlocal enabledelayedexpansion

:: Vérification des dépendances
where pipenv >nul 2>&1
if %errorlevel% neq 0 (
    echo pipenv n'est pas installé. Installez-le avec 'pip install pipenv'.
    exit /b 1
)

:: Nom du projet Django
set PROJECT_NAME=main

echo 🛠️  Initialisation du projet Django...

:: Initialisation de pipenv et installation des dépendances
pipenv install django django-extensions django-jazzmin python-decouple
if %errorlevel% neq 0 exit /b %errorlevel%
pipenv install flake8 black isort pytest pytest-django django-silk django-debug-toolbar --dev
if %errorlevel% neq 0 exit /b %errorlevel%

:: Création du projet Django
pipenv run django-admin startproject %PROJECT_NAME% .
if %errorlevel% neq 0 exit /b %errorlevel%

:: Modification de settings.py
set SETTINGS_FILE=%PROJECT_NAME%\settings.py
echo ⚙️  Mise à jour de %SETTINGS_FILE%...

:: Ajout de l'import decouple
powershell -Command "(Get-Content '%SETTINGS_FILE%') | ForEach-Object { $_ -replace '^import os$', 'import os\nfrom decouple import Csv, config\nfrom pathlib import Path' } | Set-Content '%SETTINGS_FILE%'"

:: Ajout de jazzmin et django_extensions
powershell -Command "(Get-Content '%SETTINGS_FILE%') | ForEach-Object { $_ -replace 'django.contrib.admin', 'jazzmin\',\n    'django.contrib.admin' } | Set-Content '%SETTINGS_FILE%'"
powershell -Command "(Get-Content '%SETTINGS_FILE%') | ForEach-Object { $_ -replace '    '\''django.contrib.admin'\'',', '    '\''django_extensions'\'',\n    '\''django.contrib.admin'\'',\n    '\''jazzmin'\'',' } | Set-Content '%SETTINGS_FILE%'"

:: Remplacement de la configuration DATABASES
powershell -Command "(Get-Content '%SETTINGS_FILE%') -replace 'DATABASES = {.*?}' -replace '(?s)DATABASES = {.*?}', '' | Set-Content temp.py"
echo. >> "%SETTINGS_FILE%"
echo DATABASES = ^( >> "%SETTINGS_FILE%"
echo     "default": ^( >> "%SETTINGS_FILE%"
echo         "ENGINE": config^("DB_ENGINE", default="django.db.backends.sqlite3"^), >> "%SETTINGS_FILE%"
echo         "NAME": config^("DB_NAME", default=BASE_DIR / "db.sqlite3"^), >> "%SETTINGS_FILE%"
echo     ^) >> "%SETTINGS_FILE%"
echo ^) >> "%SETTINGS_FILE%"

:: Remplacement SECRET_KEY, DEBUG et ALLOWED_HOSTS
powershell -Command "(Get-Content '%SETTINGS_FILE%') -replace '^SECRET_KEY = .*','SECRET_KEY = config(\"SECRET_KEY\")' | Set-Content '%SETTINGS_FILE%'"
powershell -Command "(Get-Content '%SETTINGS_FILE%') -replace '^DEBUG = .*','DEBUG = config(\"DEBUG\", default=False, cast=bool)' | Set-Content '%SETTINGS_FILE%'"
powershell -Command "(Get-Content '%SETTINGS_FILE%') -replace '^ALLOWED_HOSTS = .*','ALLOWED_HOSTS = config(\"ALLOWED_HOSTS\", cast=Csv())' | Set-Content '%SETTINGS_FILE%'"

:: Ajout des configurations STATIC et MEDIA
echo. >> "%SETTINGS_FILE%"
echo :: STATIC FILES >> "%SETTINGS_FILE%"
echo STATIC_URL = "static/" >> "%SETTINGS_FILE%"
echo STATICFILES_DIRS = [BASE_DIR / "static"] >> "%SETTINGS_FILE%"
echo STATIC_ROOT = BASE_DIR / "staticfiles" >> "%SETTINGS_FILE%"
echo. >> "%SETTINGS_FILE%"
echo :: MEDIA FILES >> "%SETTINGS_FILE%"
echo MEDIA_URL = "/media/" >> "%SETTINGS_FILE%"
echo MEDIA_ROOT = BASE_DIR / "media" >> "%SETTINGS_FILE%"
echo. >> "%SETTINGS_FILE%"
echo :: Dev Tools >> "%SETTINGS_FILE%"
echo if DEBUG: >> "%SETTINGS_FILE%"
echo     INSTALLED_APPS += [ >> "%SETTINGS_FILE%"
echo         "debug_toolbar", >> "%SETTINGS_FILE%"
echo         "silk", >> "%SETTINGS_FILE%"
echo     ] >> "%SETTINGS_FILE%"
echo. >> "%SETTINGS_FILE%"
echo     MIDDLEWARE = [ >> "%SETTINGS_FILE%"
echo         "debug_toolbar.middleware.DebugToolbarMiddleware", >> "%SETTINGS_FILE%"
echo         "silk.middleware.SilkyMiddleware", >> "%SETTINGS_FILE%"
echo     ] + MIDDLEWARE >> "%SETTINGS_FILE%"
echo. >> "%SETTINGS_FILE%"
echo     INTERNAL_IPS = ["127.0.0.1"] >> "%SETTINGS_FILE%"
echo. >> "%SETTINGS_FILE%"
echo     :: Silk Config >> "%SETTINGS_FILE%"
echo     SILKY_PYTHON_PROFILER = True >> "%SETTINGS_FILE%"
echo     SILKY_AUTHENTICATION = False >> "%SETTINGS_FILE%"
echo     SILKY_AUTHORISATION = False >> "%SETTINGS_FILE%"

:: Modification de urls.py
set URLS_FILE=%PROJECT_NAME%\urls.py
echo 🔗 Mise à jour de %URLS_FILE%...
echo from django.conf import settings > "%URLS_FILE%"
echo from django.contrib import admin >> "%URLS_FILE%"
echo from django.urls import include, path >> "%URLS_FILE%"
echo. >> "%URLS_FILE%"
echo urlpatterns = [ >> "%URLS_FILE%"
echo     path("admin/", admin.site.urls), >> "%URLS_FILE%"
echo ] >> "%URLS_FILE%"
echo. >> "%URLS_FILE%"
echo if settings.DEBUG: >> "%URLS_FILE%"
echo     import debug_toolbar >> "%URLS_FILE%"
echo     from django.conf.urls.static import static >> "%URLS_FILE%"
echo. >> "%URLS_FILE%"
echo     urlpatterns += [path("__debug__/", include(debug_toolbar.urls))] >> "%URLS_FILE%"
echo     urlpatterns += [path("silk/", include("silk.urls", namespace="silk"))] >> "%URLS_FILE%"
echo     urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) >> "%URLS_FILE%"
echo     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) >> "%URLS_FILE%"

:: Création des fichiers de configuration
echo 📄 Création du fichier .flake8...
echo [flake8] > .flake8
echo max-line-length = 88 >> .flake8
echo exclude = migrations, __pycache__, manage.py, settings.py >> .flake8

echo 📄 Création du fichier pytest.ini...
echo [pytest] > pytest.ini
echo DJANGO_SETTINGS_MODULE = main.settings >> pytest.ini
echo python_files = tests.py test_*.py *_tests.py >> pytest.ini

echo 📄 Création du fichier .env...
echo DEBUG=True > .env
echo SECRET_KEY="django-insecure-x=ak0e3g*40827oz!lla93#^_!atgjko72b&5b%lo^f1geq@(!" >> .env
echo ALLOWED_HOSTS=127.0.0.1,localhost >> .env
echo. >> .env
echo DB_ENGINE=django.db.backends.sqlite3 >> .env
echo DB_NAME=db.sqlite3 >> .env

mkdir static

pipenv requirements --exclude-markers > requirements.txt

pipenv run python manage.py makemigrations
pipenv run python manage.py migrate

:: Création du superutilisateur
echo Création du superutilisateur...
echo from django.contrib.auth import get_user_model > temp_create_superuser.py
echo User = get_user_model() >> temp_create_superuser.py
echo if not User.objects.filter(username="admin").exists(): >> temp_create_superuser.py
echo     User.objects.create_superuser("admin", "admin@example.com", "admin") >> temp_create_superuser.py
echo     print("✅ Superutilisateur 'admin' créé avec succès.") >> temp_create_superuser.py
echo else: >> temp_create_superuser.py
echo     print("⚠️  Le superutilisateur 'admin' existe déjà.") >> temp_create_superuser.py

pipenv run python manage.py shell < temp_create_superuser.py
del temp_create_superuser.py

pipenv run black .
pipenv run isort .

echo ✅ Projet Django configuré avec succès !
endlocal