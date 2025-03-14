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
from django.urls import reverse
from django.contrib.messages import constants as messages

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

# random画像用のAPI Key
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")

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
    "accounts.apps.AccountsConfig", # アカウント管理用アプリ
    "django_bootstrap5",#Bootstrap5追加
    "debug_toolbar",#Debug-toolbar追加
	# "subs",
	'ratelimit', #APIリクエスト制限
    'widget_tweaks', #HTMLの見た目調節
    'imagekit', #image周り
    'django_cleanup', #不要なファイルを削除
    'django_extensions', #仮のHttps
    # google認証
    'django.contrib.sites', # 複数のウェブサイトを1つのDjangoプロジェクトで管理するサイトフレームワーク
    'allauth', # django-allauthの基本機能
    'allauth.account', # メールアドレスとパスワードによる認証機能
    'allauth.socialaccount', # ソーシャルアカウント認証機能
    'allauth.socialaccount.providers.google', # 追加
    'django_user_agents', # user-agents導入

]

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
    'diary.auth_backends.UsernameOrEmailBackend',
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
    'allauth.account.middleware.AccountMiddleware',
    'django_user_agents.middleware.UserAgentMiddleware', # user-agent機能
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.media",#メディア追加
                'accounts.context_processors.user_agent_processor', # user-agent情報をbase.htmlに渡す
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

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

LOGIN_URL='/accounts/login/'
LOGIN_REDIRECT_URL= '/home/'
LOGOUT_REDIRECT_URL = '/'  # ログアウト後のリダイレクト先
SOCIAL_AUTH_LOGIN_REDIRECT_URL= '/home/'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / "staticfiles"  # 本番環境で `collectstatic` 実行時に使用

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
AUTH_USER_MODEL = 'accounts.User'

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = env.list("CLIANT_ID_GOOGLE_OAUTH")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = env.list("CLIANT_SECRET_KEY_GOOGLE_OAUTH")

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'EMAIL_AUTHENTICATION': True,      # 既に同じemailで登録していた場合，それに連携される
    }
}
# ユーザー認証にユーザー名とメールアドレスを使用
ACCOUNT_AUTHENTICATION_METHOD = "username_email"
# ユーザー登録にメールアドレスを必須にする
ACCOUNT_EMAIL_REQUIRED = True
# メールをユーザー固有のものにする
ACCOUNT_EMAIL_UNIQUE = True
# ユーザー名の登録を不要にする
ACCOUNT_USERNAME_REQUIRED = True
# ACCOUNT_EMAIL_VERIFICATION = "mandatory"    # 登録後、メールアドレスに確認メールが送信される
ACCOUNT_EMAIL_VERIFICATION = "none"         # メール確認を無効にする
ACCOUNT_UNIQUE_EMAIL = True     # 同じメールアドレスで複数のアカウントを作れない 
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True      # 既存のemailログイン時にsocialによりemailでログインすると自動的に連携される

ACCOUNT_RATE_LIMITS = {
    'login_failed': '5/m',  # 例えば1分間に5回のログイン試行制限
}
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

ACCOUNT_FORMS = {"signup": "accounts.forms.CustomSignupForm"}

ACCOUNT_ADAPTER = 'accounts.adapters.CustomAccountAdapter'  # アダプターの設定
SOCIALACCOUNT_ADAPTER = "accounts.adapters.CustomSocialAccountAdapter"

SOCIALACCOUNT_LOGIN_ON_GET=True     #直接ログインページに飛ぶ

# キャッシュ
# CACHES = {
#     "default": {
#         "BACKEND": "django.core.cache.backends.memcached.PyMemcacheCache",
#         "LOCATION": "127.0.0.1:11211",  # Memcached サーバーのホストとポート
#     }
# }
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",  # ローカルメモリキャッシュ
    }
}

# settings.pyにてセッションエンジンをキャッシュ使用を宣言する
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
#　キャッシュを使わない場合はNoneと記述。キャッシュを使う場合は基本的には'default'を使う
USER_AGENTS_CACHE = 'default'

MESSAGE_STORAGE = 'django.contrib.messages.storage.session.SessionStorage'
# Bootstrap に対応したメッセージタグの設定
MESSAGE_TAGS = {
    messages.DEBUG: 'secondary',
    messages.INFO: 'info',
    messages.SUCCESS: 'success',
    messages.WARNING: 'warning',
    messages.ERROR: 'danger',
}