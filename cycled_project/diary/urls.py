from django.urls import path

from . import views

app_name="diary"
urlpatterns = [
    path("",views.UserIndexView.as_view(),name="user_index"),
    path("<int:pk>/",views.UserDetailView.as_view(),name="user_detail"),
    path("<int:pk>/<int:diary_id>/write",views.diary_write,name="diary_write"),
    
]