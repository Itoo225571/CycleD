from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.core.exceptions import MultipleObjectsReturned

class UsernameOrEmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            # ユーザー名またはメールアドレスでユーザーを取得
            if '@' in username:
                user = UserModel.objects.get(email=username)
            else:
                user = UserModel.objects.get(username=username)
        except UserModel.DoesNotExist:
            return None
        except MultipleObjectsReturned:
            # メールアドレスが複数のユーザーに対応する場合（通常は起きないはずですが、万が一のエラー処理）
            return None

        # パスワードが正しいかチェック
        if user.check_password(password):
            return user
        return None  # パスワードが間違っている場合は None を返す

    def get_user(self, user_id):
        UserModel = get_user_model()
        try:
            return UserModel.objects.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None