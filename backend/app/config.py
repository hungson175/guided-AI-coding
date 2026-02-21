from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 17066
    cors_origins: str = "http://localhost:3343"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
