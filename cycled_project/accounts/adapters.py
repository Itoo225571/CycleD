from allauth.account.adapter import DefaultAccountAdapter
from django.core.exceptions import ValidationError

class CustomAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        # サインアップを許可する
        return True

    def clean_username(self, username, shallow=False):
        if username == 'admin':
            raise ValidationError('この名前は許可されていません')
        return super().clean_username(username, shallow)