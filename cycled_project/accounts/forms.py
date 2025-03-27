from allauth.account.forms import SignupForm,LoginForm,AddEmailForm
from allauth.account.models import EmailAddress
from django import forms
from django.conf import settings

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
    
class CustomLoginForm(LoginForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['login'].label = 'ユーザー名またはメールアドレス'  # ラベルを変更
        self.fields['remember'].label = '次回以降自動でログインする'  # ラベルを変更

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
        label="退会することを確認しました",
        widget=forms.CheckboxInput(attrs={"class": "form-check-input"}),
    )
class AllauthUserLeaveForm(forms.Form):
    confirm = forms.BooleanField(
        required=True,
        label="退会することを確認しました",
        widget=forms.CheckboxInput(attrs={"class": "form-check-input"}),
    )

class CustomEmailForm(AddEmailForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["email"].widget.attrs.update({
            "placeholder": "新しいメールアドレスを入力",
        })
        if settings.ACCOUNT_EMAIL_VERIFICATION in ["mandatory", "optional"]:
            # 確認メールが送信される旨のメッセージ
            verification_message = "<li>入力されたメールアドレスに確認メールが送信されます。</li>"
        else: verification_message = None
        # 有効期限を設定
        expiry_message = f"<li>確認メールの有効期限は {settings.ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS} 日です。</li>"
        
        # help_text にリストを追加
        self.fields["email"].help_text = f"<ul>{verification_message} {expiry_message}</ul>"