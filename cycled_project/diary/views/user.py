from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from ..forms import *

"""______User関係______"""
class UserProfileView(LoginRequiredMixin,generic.UpdateView):
    template_name="diary/user_profile.html"
    form_class = UserEditForm

class UserEditView(LoginRequiredMixin,generic.UpdateView):
    pass
