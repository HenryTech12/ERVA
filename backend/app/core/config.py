from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ERVA Backend"
    app_version: str = "0.1.0"

    # Comma-separated list of allowed frontend origins, e.g.
    # "https://erva.vercel.app,https://erva-git-main-yourteam.vercel.app"
    allowed_origins: str = "http://localhost:5173,http://localhost:4173"
    # Optional regex to also allow Vercel preview deployment URLs, e.g.
    # "https://erva-.*\.vercel\.app"
    allowed_origin_regex: str = ""

    postgres_url: str = "postgresql+psycopg://erva:erva@postgres:5432/erva"
    redis_url: str = "redis://redis:6379/0"

    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "erva_password"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # --- STRIPE CONFIGURATION ---
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    # Stripe Connect account ID to receive quarantine transfers (test mode)
    stripe_quarantine_destination: str = ""

settings = Settings()