from django.contrib import admin

from MyApp0.models import Book,Evaluation
#管理サイトの編集

class BookAdmin(admin.ModelAdmin):
    list_display=("name","publish",)
    list_display_links=("name",)
    
class EvaluationAdmin(admin.ModelAdmin):
    list_display=("book","star","comment",)
    list_display_links=("book","star","comment",)
    raw_id_fields=("book",)

admin.site.register(Book,BookAdmin)
admin.site.register(Evaluation,EvaluationAdmin)