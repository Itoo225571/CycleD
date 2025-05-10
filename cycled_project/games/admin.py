from django.contrib import admin

from .models import NIKIRunUserInfo

class NIKIRunUserInfoAdmin(admin.ModelAdmin):
    pass

admin.site.register(NIKIRunUserInfo,NIKIRunUserInfoAdmin)
