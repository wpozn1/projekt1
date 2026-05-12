import random
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from .serializers import MovieSerializer
from .models import Movie
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class RandomMovieView(APIView):
    authentication_classes = [JWTAuthentication]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def post(self, request):
        genre_id = request.data.get('genre', '')
        provider_id = request.data.get('platform', '')
        max_length = request.data.get('max_length', 110)
        
        excluded_from_frontend = request.data.get('excluded', [])
        
        excluded_from_db = []
        if request.user.is_authenticated:
            excluded_from_db = list(request.user.watched_movies.values_list('external_id', flat=True))

        all_excluded = set(list(map(str, excluded_from_db)) + list(map(str, excluded_from_frontend)))

        tmdb_url = "https://api.themoviedb.org/3/discover/movie"
        params = {
            'api_key': settings.TMDB_API_KEY,
            'language': 'en-US',
            'watch_region': 'US',
            'sort_by': 'popularity.desc',
            'vote_average.gte': 7.0,
            'vote_count.gte': 100,
        }

        if genre_id:
            params['with_genres'] = str(genre_id).replace(',', '|')
        if provider_id:
            params['with_watch_providers'] = str(provider_id).replace(',', '|')
        if max_length:
            params['with_runtime.lte'] = max_length

        try:
            params['page'] = 1
            initial_response = requests.get(tmdb_url, params=params)
            initial_response.raise_for_status()
            data = initial_response.json()

            total_pages = min(data.get('total_pages', 1), 30)
            random_movie = None
            movies = [] # Definiujemy tu, żeby była dostępna dla fallbacku

            # PĘTLA 1: Próba znalezienia unikalnego filmu
            for _ in range(3):
                random_page = random.randint(1, total_pages)
                params['page'] = random_page

                response = requests.get(tmdb_url, params=params)
                response.raise_for_status()
                movies = response.json().get('results', [])

                random.shuffle(movies)

                for m in movies:
                    m_id = str(m.get('id'))
                    if m_id in all_excluded:
                        continue
                    
                    random_movie = m
                    break
                
                if random_movie:
                    break

            # --- LOGIKA FALLBACKU (POZA PĘTLĄ) ---
            is_fallback = False
            if not random_movie:
                if movies:
                    random_movie = random.choice(movies)
                    is_fallback = True
                else:
                    return Response({"detail": "Brak filmów dla tych filtrów!"}, status=404)

            # --- ODPOWIEDŹ Z FLAGĄ ---
            return Response({
                "id": random_movie.get('id'),
                "title": random_movie.get('title'),
                "overview": random_movie.get('overview'),
                "release_date": random_movie.get('release_date'),
                "vote_average": random_movie.get('vote_average'),
                "poster_path": random_movie.get('poster_path'),
                "genre_ids": random_movie.get('genre_ids', []),
                "is_fallback": is_fallback  # <--- KONIECZNIE TO DODAJ
            }, status=status.HTTP_200_OK)

        except requests.RequestException:
            return Response(status=status.HTTP_502_BAD_GATEWAY)

class UserLibraryView(generics.ListCreateAPIView):
    serializer_class = MovieSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.watched_movies.all()

    def perform_create(self, serializer):
        data = serializer.validated_data

        movie, created = Movie.objects.get_or_create(
            external_id=data.get('external_id'),
            defaults={
                'title': data.get('title'),
                'length': data.get('length') or 0,
                'genre': data.get('genre') or "Unknown",
                'poster_path': data.get('poster_path', ''),
                'overview': data.get('overview', ''),
            }
        )

        self.request.user.watched_movies.add(movie)


