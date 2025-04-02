from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    def ready(self):
        import accounts.signals  # ここで signals.py を読み込む
        from .ap_scheduler import start
        start()