from django.contrib import admin

from .models import User,Diary

class DiaryInline(admin.TabularInline):
    model=Diary
    extra=3

class UserAdmin(admin.ModelAdmin):
    fieldsets=[
        (None,{"fields":["name"]}),
        ("Email Information",{"fields":["email"]})
    ]
    inlines=[DiaryInline]
    list_display=["name","date_created","date_last_login",]
    search_fields=["name",]
    
admin.site.register(User,UserAdmin)
# admin.site.register(Diary)
