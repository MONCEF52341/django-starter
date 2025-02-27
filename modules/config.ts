// Crée les fichiers de configuration
export async function createConfigFiles(projectName: string): Promise<void> {
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
DJANGO_SETTINGS_MODULE = ${projectName}.settings
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
