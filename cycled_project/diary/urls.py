from django.urls import path

from . import views

app_name="diary"
# urlpatterns = [
#     path("",views.UserIndexView.as_view(),name="user_index"),
#     path("<int:pk>/",views.UserDetailView.as_view(),name="user_detail"),
#     path("<int:pk>/<int:diary_id>/update",views.DiaryUpdateView.as_view(),name="diary_update"),
#     path("<int:user_id>/<int:diary_id>/write",views.diary_write,name="diary_write"),
#     path("<int:user_id>/create",views.DiaryCreateView.as_view(),name="diary_create"),
#     path("<int:user_id>/write",views.diary_write,name="diary_write"),
    
# ]

urlpatterns = [
    path("",views.top,name="top"),
    path("home/",views.home,name="home"),
    
    path("signin/",views.signin,name="signin"),
    path("signup/",views.signup,name="signup"),
    path("signout/",views.signout,name="signout"),
    
    path("user/<int:user_id>/",views.user_profile,name="user_profile"),
    path("user/edit/<int:user_id>/",views.user_edit,name="user_edit"),
    
    path("diary/<int:user_id>/",views.diary,name="diary"),
    path("diary/<int:user_id>/new/",views.diary_new,name="diary_new"),
    path("diary/<int:user_id>/edit/<int:diary_id>",views.diary_edit,name="diary_edit"),
    path("diary/<int:user_id>/delete/<int:diary_id>",views.diary_delete,name="diary_delete"),
    
    path("calendar/<int:user_id>",views.calendar,name="calendar"),    
]

