from typing import Any
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm,UserChangeForm,AuthenticationForm
from django.contrib.auth.hashers import make_password,check_password
from django import forms
from django.forms.renderers import BaseRenderer
from django.forms.utils import ErrorList

from diary.models import *
from subs.photo_info.photo_info import heic2jpeg
from pathlib import Path

"""___FormSet用のMixin"""
class ModelFormWithFormSetMixin:
    def __init__(self, *args, **kwargs):
        super(ModelFormWithFormSetMixin, self).__init__(*args, **kwargs)
        self.formset = self.formset_class(
            instance=self.instance,
            data=self.data if self.is_bound else None,
        )

    def is_valid(self):
        valid = super(ModelFormWithFormSetMixin, self).is_valid()
        if not valid:
            print("Form is not valid")
            for field, errors in self.errors.items():
                error_messages = ', '.join([str(e) for e in errors])  # エラーメッセージを結合
                print(f"Field '{field}' has the following errors: {error_messages}")

        formset_valid = self.formset.is_valid()
        if not formset_valid:
            print("Formset is not valid")
            # フォームセット全体のエラーを表示
            non_form_errors = self.formset.non_form_errors()
            if non_form_errors:
                
                print("Formset non-form errors:")
                for error in non_form_errors:
                    print(f"  {error}")
            # フォームセットのエラーを表示
            for form in self.formset:
                for field, errors in form.errors.items():
                    print(f"Errors in form {form.prefix}, field {field}: {errors}")
        return valid and formset_valid

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
    index_of_Diary = forms.IntegerField(required=False, widget=forms.HiddenInput())
    class Meta:
        model = Location
        fields = ["lat","lon","state","display","label","image","index_of_Diary"]
        widgets = {
            'image': forms.ClearableFileInput(attrs={'accept': 'image/*, .heic'}),
        }
    # heic画像をjpegとして保存する
    def save(self, commit=True):
        instance = super().save(commit=False)
        image_file = self.cleaned_data.get('image')
        if image_file:
            fname = Path(image_file.name)
            new_file_name = fname.with_suffix('.jpg')
            if image_file and image_file.name.lower().endswith('.heic'):
                # HEIC形式の画像をJPEGに変換
                jpeg_file = heic2jpeg(image_file)
                instance.image.save(new_file_name, jpeg_file, save=False)
        if commit:
            instance.save()
        return instance

LocationFormSet = forms.inlineformset_factory(
        Diary,
        Location,
        form=LocationForm,
        extra=0,
        can_delete=True,
        max_num=5*2,
        validate_max=True,
        min_num=1,
        validate_min=True,
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
                    required=False,
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
        # widgets = {
        #     # "date": forms.DateInput(attrs={"id": "id_date_field","type": "hidden"}), 
        #     "date": forms.DateInput(attrs={"id": "id_date_field"}), 
        # }

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
    
    def clean(self):
        cleaned_data = super().clean()
        # フォームセットのバリデーションを実行
        formset_valid = self.formset.is_valid()
        # フォームセットのエラーをフォームに追加する
        if not formset_valid:
            non_form_errors = self.formset.non_form_errors()
            if non_form_errors:
                for error in non_form_errors:
                    self.add_error(None, error)
            for form in self.formset:
                for error in form.non_field_errors():
                    self.add_error(None, error)
        # 少なくとも1つのフォームが有効であることを確認
        has_valid_data = any(form.cleaned_data for form in self.formset)
        if not has_valid_data:
            self.add_error(None, "少なくとも1つのロケーションを追加してください。")
        return cleaned_data


class BaseDiaryFormSet(forms.BaseModelFormSet):
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)

    def get_form_kwargs(self,index):
        kwargs = super().get_form_kwargs(index)
        kwargs['request'] = self.request
        return kwargs

DiaryFormSet = forms.modelformset_factory(
    Diary,
    form=DiaryForm,
    formset=BaseDiaryFormSet,
    extra=0,  
    # can_delete=True,  
    min_num=1,
    validate_min=True,
    max_num=10,
    validate_max=True,
)

class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True
    def __init__(self, attrs=None):
        if attrs is None:
            attrs = {'accept': 'image/*,image/heic'}
        else:
            attrs.update({'accept': 'image/*,image/heic'})
        super().__init__(attrs)
    
class MultipleFileField(forms.FileField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultipleFileInput())
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single_file_clean = super().clean
        allowed_mime_types = ['image/jpeg', 'image/png', 'image/gif', 'image/heic',]
        if isinstance(data, (list, tuple)):
            result = []
            for d in data:
                file = single_file_clean(d, initial)
                if file.content_type not in allowed_mime_types:
                    raise forms.ValidationError(f"{file.name} は許可されていないファイルタイプです。")
                result.append(file)
        else:
            file = single_file_clean(data, initial)
            if file.content_type not in allowed_mime_types:
                raise forms.ValidationError(f"{file.name} は許可されていないファイルタイプです。")
            result = file
        return result
    
class PhotoForm(forms.Form):
    images = MultipleFileField(label='写真を選択', required=False)
    def __init__(self, *args, **kwargs):
        # viewsでrequestを使用可能にする
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)