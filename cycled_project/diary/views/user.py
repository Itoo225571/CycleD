from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin

from ..models import Diary

"""______User関係______"""
class UserProfileView(LoginRequiredMixin,generic.TemplateView):
    template_name="diary/user_profile.html"
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user  # 現在ログインしているユーザーを取得
        context['user'] = user  # ユーザー情報をテンプレートに渡す
        return context

class UserEditView(LoginRequiredMixin,generic.UpdateView):
    pass
