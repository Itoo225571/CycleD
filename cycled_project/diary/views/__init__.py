from .address import AddressUserView
from .base import TopView,CacheMixin
from .diary import DiaryPhotoView,Photos2LocationsView,HomeView,CalendarView,DiaryDeleteView
from .diary import sendDairies,delete_all_diaries,diary_edit_noPK,diary_delete_noPK,good_for_diary
from .weather import ajax_location2weather,WeatherView
