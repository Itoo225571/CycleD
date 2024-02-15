from django.urls import path

from . import views

app_name="diary"
urlpatterns = [
    path("",views.UserIndexView.as_view(),name="user_index"),
    path("<int:pk>/",views.UserDetailView.as_view(),name="user_detail"),
    path("<int:pk>/<int:diary_id>/update",views.DiaryUpdateView.as_view(),name="diary_update"),
    path("<int:user_id>/<int:diary_id>/write",views.diary_write,name="diary_write"),
    path("<int:user_id>/create",views.DiaryCreateView.as_view(),name="diary_create"),
    path("<int:user_id>/write",views.diary_write,name="diary_write"),
]