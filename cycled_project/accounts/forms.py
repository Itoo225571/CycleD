from allauth.account.forms import SignupForm,LoginForm,AddEmailForm,ResetPasswordForm
from allauth.account.models import EmailAddress
from django import forms
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.safestring import mark_safe

from .models import User

# email に help_text等 を追加する関数
def set_email(email_field):
    if settings.ACCOUNT_EMAIL_VERIFICATION in ["mandatory", "optional"]:
        verification_message = "<li>入力されたメールアドレスに確認メールが送信されます。</li>"
    else:
        verification_message = ""
    expiry_message = f"<li>確認メールの有効期限は {settings.ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS} 日です。</li>"
    html = f"<ul style='margin-bottom:0;'>{verification_message} {expiry_message}</ul>"
    
    email_field.help_text = mark_safe(html)
    email_field.widget.attrs.update({'placeholder': 'メールアドレスを入力'})

class CustomSignupForm(SignupForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop('password2', None)  # パスワード確認欄を削除

        self.fields["username"].widget.attrs={"placeholder":"ユーザー名を入力"}
        self.fields["password1"].widget.attrs={"placeholder":"パスワードを入力",'data-toggle': 'password','autocomplete': 'off'}
        set_email(self.fields["email"])

        self.fields['email'].required = True
        for _, field in self.fields.items():
            field.widget.attrs['class'] = 'form-control'
    
class CustomLoginForm(LoginForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['login'].label = 'ユーザー名またはメールアドレス'  # ラベルを変更
        self.fields['remember'].label = '次回以降自動でログインする'  # ラベルを変更
        self.fields['password'].help_text = ''

class UserUsernameForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username']
class UserIconForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['icon']
class UserSettingForm(forms.ModelForm):
    # アイコンの選択肢をラジオボタンで表示
    icon = forms.ChoiceField(
        widget=forms.RadioSelect,
        choices=User.ICON_CHOICES,
        label="アイコン画像"
    )
    form_map = {
        'icon': UserIconForm,
        'username': UserUsernameForm
    }
    class Meta:
        model = User
        fields = ['icon', 'username']
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

class UserLeaveForm(forms.Form):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'パスワードを入力','autocomplete': 'off'}),
        label="パスワード",
    )
    confirm = forms.BooleanField(
        required=True,
        label="以上に同意して退会します",
        widget=forms.CheckboxInput(attrs={"class": "form-check-input"}),
    )
class AllauthUserLeaveForm(forms.Form):
    confirm = forms.BooleanField(
        required=True,
        label="以上に同意して退会します",
        widget=forms.CheckboxInput(attrs={"class": "form-check-input"}),
    )

class CustomEmailForm(AddEmailForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        set_email(self.fields["email"])

class CustomResetPasswordForm(ResetPasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        set_email(self.fields["email"])

    """カスタムパスワードリセットフォーム（存在しないメールにエラーを出す）"""
    def clean_email(self):
        email = super().clean_email()
        if not EmailAddress.objects.filter(email=email, verified=True).exists():
            self.add_error("email","このメールアドレスは登録されていません。")
        return email