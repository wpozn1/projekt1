import random
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import MovieSerializer
from .models import Movie


class RandomMovieView(APIView):
    def post(self, request):
        genre_id=request.data.get('genre')
        provider_id=request.data.get('platform')
        max_length=request.data.get('max_length')

        if not all([genre_id, provider_id, max_length]):
            return Response(
                status=status.HTTP_400_BAD_REQUEST
            )

        tmdb_url = "https://api.themoviedb.org/3/discover/movie"

        params = {
            'api_key': settings.TMDB_API_KEY,
            'language': 'pl-PL',
            'watch_region': 'PL',
            'with_genres': genre_id,
            'with_watch_providers': provider_id,
            'with_runtime.lte': max_length,
            'sort_by': 'popularity.desc',
            'page': random.randint(1, 5),
        }

        try:
            response = requests.get(tmdb_url, params=params)
            response.raise_for_status()
            data = response.json()

            movies = data.get('results', [])

            if not movies:
                return Response(
                    status=status.HTTP_404_NOT_FOUND
                )

            random_movie = random.choice(movies)

            return Response({
                "title": random_movie.get('title'),
                "overview": random_movie.get('overview'),
                "release_date": random_movie.get('release_date'),
                "rating": random_movie.get('vote_average'),
                "poster_url": f"https://image.tmdb.org/t/p/w500{random_movie.get('poster_path')}"
                if random_movie.get('poster_path') else None,
            }, status=status.HTTP_200_OK)

        except requests.RequestException:
            return Response(
                status=status.HTTP_502_BAD_GATEWAY
            )

class UserLibraryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        movies = user.watched_movies.all()
        serializer = MovieSerializer(movies, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        data = request.data
        
        genre_list = data.get('genres', [])
        first_genre = genre_list[0].get('name') if genre_list else "Unknown"


        movie, created = Movie.objects.get_or_create(
            external_id=data.get('id'),
            defaults={
                'title': data.get('title'),
                'length': data.get('runtime') or 0,
                'genre': first_genre,
                'poster_path': data.get('poster_path'),
                'overview': data.get('overview'),
            }
        )
        
        request.user.watched_movies.add(movie)

        return Response({
            "message": "Film dodany!",
            "added_new_to_db": created
        }, status=201)

