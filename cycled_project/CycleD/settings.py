"""
プロジェクトのDjango設定。
プロジェクト全体の設定を行う

このファイルの詳細については、以下を参照してください。
https://docs.djangoproject.com/en/5.0/topics/settings/

設定とその値の完全なリストについては、以下を参照してください。
https://docs.djangoproject.com/en/5.0/ref/settings/
"""

from pathlib import Path
import environ
import os

#プロジェクトのベースフォルダを示す（今回の場合、/workspaces/MyDjango/CycleD_project）
BASE_DIR = Path(__file__).resolve().parent.parent

# .envファイルを読み込む
env =environ.Env()
env.read_env(BASE_DIR.joinpath('.env'))
# SECURITY WARNING: don't run with debug turned on in production!
#Trueの時はブラウザにエラーメッセジがでる　当然本番ではFalseに
SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG')
#Cliant ID
CLIANT_ID_YAHOO = env('CLIANT_ID_YAHOO')

#media用
MEDIA_ROOT=BASE_DIR.joinpath("media")
MEDIA_URL="/media/"

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = "default"

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
	'corsheaders',
    
    "diary.apps.DiaryConfig",
    "django_bootstrap5",#Bootstrap5追加
    "debug_toolbar",#Debug-toolbar追加
	# "subs",
	'ratelimit', #APIリクエスト制限
    'widget_tweaks', #HTMLの見た目調節
    'imagekit', #image周り
    'django_cleanup', #不要なファイルを削除
    'django_extensions', #仮のHttps
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    
    "debug_toolbar.middleware.DebugToolbarMiddleware",#Debug-toolbar
	'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',#session機能
]

ROOT_URLCONF = "CycleD.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.media",#メディア追加
            ],
        },
    },
]

WSGI_APPLICATION = "CycleD.wsgi.application"

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = "ja"

TIME_ZONE = "Asia/Tokyo"

USE_I18N = True

USE_TZ = True

SESSION_COOKIE_AGE = 60 * 60 * 24 * 1
SESSION_SAVE_EVERY_REQUEST = True

LOGIN_URL='diary:signin'
LOGIN_REDIRECT_URL='diary:home'
LOGOUT_REDIRECT_URL='diary:signout'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = "/static/"

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

#debug-toolbar

INTERNAL_IPS=[
    "127.0.0.1",
]

DEBUG_TOOLBAR_CONFIG={
    "SHOW_TOOLBAR_CALLBACK": lambda request: True,
}

# ユーザーモデル変更
AUTH_USER_MODEL = 'diary.User'

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
