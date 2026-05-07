from django.urls import path
from .views import RandomMovieView

urlpatterns = [
    path('match/', RandomMovieView.as_view(), name='movie_match'),
]