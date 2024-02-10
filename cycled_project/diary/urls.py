from django.urls import path

from . import views

app_name="diary"
urlpatterns = [
    path("",views.user_index,name="user_index"),
    path("user_specifics/<int:user_id>/",views.diary_detail,name="user_detail"),
    
]