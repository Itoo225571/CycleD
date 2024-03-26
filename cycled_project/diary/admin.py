from django.contrib import admin

from .models import User,Diary

class DiaryInline(admin.TabularInline):
    model=Diary
    extra=1

class UserAdmin(admin.ModelAdmin):
    fieldsets=[
        (None,{"fields":["username"]}),
        ("Email Information",{"fields":["email"]}),
        ("パスワード",{"fields":["password"]}),
        ("アイコン選択",{"fields":["icon"]}),
    ]
    inlines=[DiaryInline]
    list_display=["username",]
    search_fields=["username",]
    
admin.site.register(User,UserAdmin)
# admin.site.register(Diary)
