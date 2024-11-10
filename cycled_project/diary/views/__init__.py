from .address import AddressUserView,AddressDiaryNewView,AddressDiaryEditView
from .base import TopView,BaseView
from .diary import DiaryNewView,DiaryEditView,DiaryDeleteView,DiaryPhotoView,sendDairies,delete_all_diaries,Photos2LocationsView,HomeView,CalendarView
from .signin import SigninView,SignoutView,SignupView
from .weather import ajax_location2weather,WeatherView
from .user import UserEditView,UserProfileView