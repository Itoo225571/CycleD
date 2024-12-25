from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("signup/", views.CustomSignupView.as_view(), name="signup"),
    path("signin/", views.CustomSigninView.as_view(), name="signin"),
    path("signout/", views.CustomSignoutView.as_view(), name="signout"),
]