from django.contrib import admin

# from .models import モデルクラス
# admin.site.register(モデルクラス,ModelAdminのサブクラス)で管理(admin)画面で管理するモデルクラスを登録

from .models import Book,Author,Score

#ここでサブクラスの設定を行うことで、表示するものを決める
class BookAdmin(admin.ModelAdmin):
    list_display=("__str__","author","publish","is_favorite")    

class ScoreAdmin(admin.ModelAdmin):
    list_display=("book","score")
    exclude=("score",)
    
    #saveする際の設定
    def save_model(self,request,obj,form,change):
        obj.score=(obj.art+obj.story)/2
        super().save_model(request,obj,form,change)


admin.site.register(Book,BookAdmin)
admin.site.register(Author)
admin.site.register(Score,ScoreAdmin)
