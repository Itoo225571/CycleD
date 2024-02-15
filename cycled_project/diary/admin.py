from django.contrib import admin

from .models import User,Diary

class DiaryInline(admin.TabularInline):
    model=Diary
    extra=3

class UserAdmin(admin.ModelAdmin):
    # fields=["name","email_address",]
    fieldsets=[
        (None,{"fields":["name"]}),
        ("Email Information",{"fields":["email_address"]})
    ]
    inlines=[DiaryInline]
    list_display=["name","creation_date","last_login_date",]
    search_fields=["name",]
    
admin.site.register(User,UserAdmin)
# admin.site.register(Diary)
