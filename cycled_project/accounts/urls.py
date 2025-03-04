from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("signup/", views.CustomSignupView.as_view(), name="signup"),
    path("login/", views.CustomLoginView.as_view(), name="login"),
    path("logout/", views.CustomLogoutView.as_view(), name="logout"),
    path("leave/",views.UserLeaveView.as_view(),name="leave"),

    # path("user/",views.UserProfileView.as_view(),name="mypage"),
    path("setting/",views.UserSettingView.as_view(),name="setting"),
    path("user/edit/",views.UserEditView.as_view(),name="user_edit"),

    path("password/change/",views.CustomPasswordChangeView.as_view(),name="password_change"),
    path("password/set/",views.CustomPasswordSetView.as_view(),name="password_set"),
]