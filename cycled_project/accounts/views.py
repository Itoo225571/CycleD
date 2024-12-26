from allauth.account import views
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from .forms import CustomLoginForm,CustomSignupForm

class CustomLoginView(views.LoginView):
    template_name="accounts/login.html"
    form_class=CustomLoginForm
    success_url=reverse_lazy("diary:home")
    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('diary:home')  # 'home' にリダイレクト
        return super().get(request, *args, **kwargs)

class CustomLogoutView(LoginRequiredMixin,views.LogoutView):
    # template_name="diary/logout.html"
    pass

class CustomSignupView(views.SignupView):
    form_class = CustomSignupForm
    template_name="accounts/signup.html"
    def form_valid(self, form):
        response = super().form_valid(form)
        # フォームが有効な場合の追加処理をここに記述
        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context

    def get_success_url(self):
        # サインアップ成功後のリダイレクト先をカスタマイズする場合はここで設定
        return super().get_success_url()