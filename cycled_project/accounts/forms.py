from django.contrib.auth import get_user_model,authenticate
from django.contrib.auth.forms import UserCreationForm,UserChangeForm,AuthenticationForm
from allauth.account.forms import SignupForm
from django import forms

class CustomSignupForm(SignupForm):
    '''     定義文      '''
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs={"placeholder":"ユーザー名を入力"}
        self.fields["email"].widget.attrs={"placeholder":"メールアドレスを入力"}
        self.fields["password1"].widget.attrs={"placeholder":"パスワードを入力"}
        self.fields["password2"].widget.attrs={"placeholder":"パスワードを再入力"}

        self.fields['password1'].help_text = ''
        self.fields['password2'].help_text = ''

        self.fields['email'].required = True
        for _, field in self.fields.items():
            field.widget.attrs['class'] = 'form-control'

    class Meta:
        model = get_user_model()
        fields=["username","email","password1","password2"]
        help_texts = {
            "username": "",
            "email": "",
        }

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
    def clean(self):
        password = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password != password2:
            self.add_error('password2', 'パスワードと確認用パスワードが一致しません。')
        super().clean()
    
class SigninForm(AuthenticationForm):
    username_or_email = forms.CharField(label='ユーザー名またはメールアドレス',max_length=64)
    def __init__(self, *args, **kwargs):
        super(SigninForm, self).__init__(*args, **kwargs)
        self.fields.pop('username', None) #username除外
        self.fields["username_or_email"].widget.attrs={"placeholder":"ユーザー名またはメールアドレスを入力"}
        self.fields["password"].widget.attrs={"placeholder":"パスワードを入力"}
        for _, field in self.fields.items():
            field.widget.attrs['class'] = 'form-control'

    class Meta:
        model = get_user_model()
        fields = ["username_or_email", "password"]

class UserEditForm(UserChangeForm):
    class Meta:
        model = get_user_model()
        fields = ["username","email","password"]
        labels = {
            "username": "ユーザー名",
            "email": "メールアドレス",
            "password": "パスワード",
        }
        help_texts = {
            "username": "",
            "email": "",
            "password": "",
        }