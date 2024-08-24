from typing import Any
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm,UserChangeForm,AuthenticationForm
from django.contrib.auth.hashers import make_password,check_password
from django import forms
from django.forms.renderers import BaseRenderer
from django.forms.utils import ErrorList

from diary.models import *

"""___FormSet用のMixin"""
class ModelFormWithFormSetMixin:
    def __init__(self, *args, **kwargs):
        super(ModelFormWithFormSetMixin, self).__init__(*args, **kwargs)
        self.formset = self.formset_class(
            instance=self.instance,
            data=self.data if self.is_bound else None,
        )

    def is_valid(self):
        if self.formset.is_valid():
            print("Formset is valid")
        else:
            print(self.formset)
            for form in self.formset:
                if form.is_valid():
                    print('success')
                else:
                    print('OUT')
        return super(ModelFormWithFormSetMixin, self).is_valid() and self.formset.is_valid()

    def save(self, commit=True):
        saved_instance = super(ModelFormWithFormSetMixin, self).save(commit)
        self.formset.save(commit)
        return saved_instance

class SignupForm(UserCreationForm):
    '''     定義文      '''
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs={"placeholder":"ユーザー名を入力"}
        self.fields["email"].widget.attrs={"placeholder":"メールアドレスを入力"}
        self.fields["password1"].widget.attrs={"placeholder":"パスワードを入力"}
        self.fields["password2"].widget.attrs={"placeholder":"パスワードを再入力"}

        self.fields['password1'].label = 'パスワード'
        self.fields['password2'].label = '確認用パスワード'

        self.fields['password1'].help_text = ''
        self.fields['password2'].help_text = ''

        self.fields['email'].required = True

    class Meta:
        model = get_user_model()
        fields=["username","email","password1","password2"]
        labels = {
            "username": "ユーザー名",
            "email": "メールアドレス",
        }
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
        return value
    #email
    def clean_email(self):
        value = self.cleaned_data['email']
        return value
    #password
    def clean_password(self):
        value = self.cleaned_data['password1']
        return value
    #フォーム全体
    def clean(self):
        password = self.cleaned_data['password1']
        password2 = self.cleaned_data['password2']
        if password != password2:
            self.add_error('password2', 'パスワードと確認用パスワードが一致しません。')
        super().clean()
    
class SigninForm(AuthenticationForm):
    # username_or_email = CharField(label='ユーザー名またはメールアドレス')
    class Meta:
        model = get_user_model()
        fields=["username","password",]

"""___Address関連___"""
class AddressSearchForm(forms.Form):
    keyword = forms.CharField(
                        label="",
                        max_length=64,
                        widget=forms.TextInput(attrs={"placeholder":" 地名・施設名・駅名など"})
                        )
    
class LocationForm(forms.ModelForm):
    class Meta:
        model = Location
        fields = ["lat","lon","state","display","label"]

LocationFormSet = forms.inlineformset_factory(
        Diary,
        Location,
        form=LocationForm,
        extra=0,
        can_delete=True,
        max_num=5,
        validate_max=True,
        min_num=1,
        validate_min=True
)

class LocationCoordForm(forms.ModelForm):
    class Meta:
        model = Location
        fields = ["lat","lon",]
    
"""___User関連___"""
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

"""___Diary関連___"""
class DiaryForm(ModelFormWithFormSetMixin, forms.ModelForm):
    formset_class = LocationFormSet
    keyword = forms.CharField(
                    label="",
                    max_length=64,
                    widget=forms.TextInput(attrs={"placeholder":" 地名・施設名・駅名など"})
                    )
    def __init__(self, *args, **kwargs):
        # viewsでrequestを使用可能にする
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)

    class Meta:
        model=Diary
        fields=["date","comment"]
        labels = {
            "date": "サイクリング日時",
            "comment": "コメント",
        }
        help_texts = {
            "date": "サイクリングに行った日を入力",
            "comment": "",
        }
        widgets = {
            "date": forms.DateInput(attrs={"id": "id_date_field",}), 
        }

    def clean_date(self):
        date = self.cleaned_data["date"]
        user = self.request.user
        # フォームのインスタンスが新規作成か更新かを判定
        if self.instance.pk:
            # 更新の場合は他のインスタンスの重複をチェック
            if Diary.objects.filter(date=date, user=user).exclude(pk=self.instance.pk).exists():
                self.add_error('date',"この日時のサイクリング日記はすでに存在します。")
        else:
            # 新規作成の場合はすべてのインスタンスの重複をチェック
            if Diary.objects.filter(date=date, user=user).exists():
                self.add_error('date',"この日時のサイクリング日記はすでに存在します。")
        return date
    