from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.core.exceptions import ValidationError
from django.shortcuts import redirect

class CustomAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        # サインアップを許可する
        return True

    def clean_username(self, username, shallow=False):
        if username == 'admin':
            raise ValidationError('この名前は許可されていません')
        return super().clean_username(username, shallow)

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    pass