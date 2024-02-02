from django.contrib import admin

from MyApp0.models import Book,Evaluation
#管理サイトの編集

class BookAdmin(admin.ModelAdmin):
    list_display=("id","name","publish","page",)
    list_display_links=("id","name",)
    
class EvaluationAdmin(admin.ModelAdmin):
    list_display=("id","star","comment",)
    list_display_links=("id","star","comment",)
    raw_id_fields=("book",)

admin.site.register(Book,BookAdmin)
admin.site.register(Evaluation,EvaluationAdmin)