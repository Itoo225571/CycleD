from django.apps import AppConfig
import threading

class DiaryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "diary"

    def ready(self):
        from diary.ap_scheduler import start,delete_tempImages
        import diary.signals
        start()
        threading.Timer(10.0, delete_tempImages).start()  # 10秒後に実行
        