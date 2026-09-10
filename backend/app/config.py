import os
from pathlib import Path
from dotenv import load_dotenv

# Charger le .env situé à la racine du backend, peu importe le cwd
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Les variables SUPABASE_URL et SUPABASE_KEY doivent être définies dans le fichier .env")
