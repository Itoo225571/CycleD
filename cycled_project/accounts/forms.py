from django.contrib.auth import get_user_model,authenticate
from django.contrib.auth.forms import UserCreationForm,UserChangeForm,AuthenticationForm
from allauth.account.forms import SignupForm,LoginForm
from django import forms

from .models import User

class CustomSignupForm(SignupForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop('password2', None)  # パスワード確認欄を削除

        self.fields["username"].widget.attrs={"placeholder":"ユーザー名を入力"}
        self.fields["email"].widget.attrs={"placeholder":"メールアドレスを入力"}
        self.fields["password1"].widget.attrs={"placeholder":"パスワードを入力",'data-toggle': 'password','autocomplete': 'off'}

        self.fields['email'].required = True
        for _, field in self.fields.items():
            field.widget.attrs['class'] = 'form-control'

    '''     以下検証       '''
    def clean_username(self):
        value = self.cleaned_data['username']
        min_length=3
        if len(value) < min_length:
            raise forms.ValidationError('%(min_length)s文字以上で入力してください', params={'min_length':min_length})
        if get_user_model().objects.filter(username=value).exists():
            raise forms.ValidationError("この名前は既に使用されています。他の名前を使用してください。")
        return value
    def clean_email(self):
        value = self.cleaned_data['email']
        if '@' not in value:
            raise forms.ValidationError('正しいメールアドレスを入力してください')
        return value
    def clean_password(self):
        value = self.cleaned_data['password1']
        if len(value) < 8:
            raise forms.ValidationError('パスワードは8文字以上で入力してください')
        return value
    
class CustomLoginForm(LoginForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['login'].label = 'ユーザー名またはメールアドレス'  # ラベルを変更
        self.fields['remember'].label = '次回以降自動でログインする'  # ラベルを変更

class UserDynamicForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['icon', 'username', 'email']

    def __init__(self, *args, **kwargs):
        dynamic_fields = kwargs.pop('dynamic_fields', None)
        super(UserDynamicForm, self).__init__(*args, **kwargs)
        if dynamic_fields:
            self.fields = {field: self.fields[field] for field in dynamic_fields}
