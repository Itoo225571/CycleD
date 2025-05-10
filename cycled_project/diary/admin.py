from django.contrib import admin

from .models import Diary,Location,Coin,TempImage

# インラインの設定
# これをしないと、子要素の編集が同時にできないゾ
class LocationInline(admin.TabularInline):
    model = Location
    extra = 1
    
class DiaryAdmin(admin.ModelAdmin):
    inlines = [LocationInline,]

admin.site.register(Diary,DiaryAdmin)
