from django.urls import path

from . import views

app_name="diary"
urlpatterns = [
    path("user",views.user_index,name="user_index"),
    path("user/<int:user_id>/",views.user_detail,name="user_detail"),
    
]