from .address import AddressUserView
from .base import TopView,CacheMixin,BaseContextMixin
from .diary import DiaryPhotoView,Photos2LocationsView,HomeView,CalendarView
from .diary import sendDairies,delete_all_diaries,diary_edit_noPK,diary_delete_noPK,DiaryDeleteView
from .weather import ajax_location2weather,WeatherView
