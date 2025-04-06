from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms import HiddenInput
from ..forms import DiaryForm,AddressSearchForm,AddressForm

import uuid

class CalendarView(LoginRequiredMixin, generic.TemplateView):
    template_name="diary/calendar.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['mock_uuid'] = uuid.uuid4() # 仮のPK
        # is_public を HiddenInput にする
        context['diary'] = DiaryForm(widgets={"is_public": HiddenInput()})
        
        context['addressseach_form'] = AddressSearchForm()
        context['addressselect_form'] = AddressForm()
        return context