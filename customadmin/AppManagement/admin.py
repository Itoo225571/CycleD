from django.contrib import admin

# from .models import モデルクラス
# admin.site.register(モデルクラス,ModelAdminのサブクラス)で管理(admin)画面で管理するモデルクラスを登録

#ここでサブクラスの設定を行うことで、表示するものを決める
class SubModelAdmin(admin.ModelAdmin):
    list_display=("__str__","author")

from .models import Book,Author,Score
admin.site.register(Book)
admin.site.register(Author)
admin.site.register(Score)
