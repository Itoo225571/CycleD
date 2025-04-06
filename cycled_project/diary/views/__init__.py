from .address import AddressUserView,AddressSearchView,AddressCurrentPositionView
# from .address import address_search,get_current_address
from .base import TopView,CacheMixin
from .diary import DiaryPhotoView,Photos2LocationsView,DiaryDeleteView
from .diary import sendDairies,delete_all_diaries,diary_edit_noPK,diary_delete_noPK
from .weather import WeatherView
from .calendar import CalendarView
from .map import MapView

from .home import HomeView,GoodViewSet