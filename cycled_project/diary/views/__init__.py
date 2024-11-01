from .address import AddressUserView,AddressDiaryNewView,AddressDiaryEditView
from .base import TopView,BaseView,HomeView
from .diary import DiaryListView,DiaryNewView,DiaryEditView,DiaryDeleteView,DiaryPhotoView,sendDairies,Photos2LocationsView
from .signin import SigninView,SignoutView,SignupView
from .weather import ajax_location2weather,WeatherView
from .user import UserEditView,UserProfileView