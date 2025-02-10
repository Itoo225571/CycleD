from django import template
from django.utils import timezone

register = template.Library()

@register.filter
def days_ago(value):
    if not value:
        return ''

    diff_in_time = timezone.now().date() - value
    diff_in_days = diff_in_time.days  # 日単位で差を取得

    if diff_in_days == 0:
        return '今日'
    elif diff_in_days == 1:
        return '昨日'
    elif diff_in_days >= 30:
        return '30日以上前'
    else:
        return f'{diff_in_days}日前'
