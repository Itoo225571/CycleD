from django import template
from django.utils import timezone

register = template.Library()

@register.filter
# Gets the name of the passed in field on the passed in object
def verbose_name(the_object, the_field):
    return the_object._meta.get_field(the_field).verbose_name