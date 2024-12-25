from allauth.account import views
from django.urls import reverse_lazy
from django.contrib.auth.views import LoginView,LogoutView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect

class CustomSigninView(views.LoginView):
    # template_name="diary/signin.html"
    # form_class=SigninForm
    success_url=reverse_lazy("diary:home")
    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('diary:home')  # 'home' にリダイレクト
        return super().get(request, *args, **kwargs)

class CustomSignoutView(LoginRequiredMixin,views.LogoutView):
    # template_name="diary/signout.html"
    pass

class CustomSignupView(views.SignupView):
    def form_valid(self, form):
        response = super().form_valid(form)
        # フォームが有効な場合の追加処理をここに記述
        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # 必要に応じて追加のコンテキストデータをここで設定
        context["extra_data"] = "Some extra data"
        return context

    def get_success_url(self):
        # サインアップ成功後のリダイレクト先をカスタマイズする場合はここで設定
        return super().get_success_url()