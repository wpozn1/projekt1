const API_KEY = 'TWÓJ_KLUCZ_API'; // Wklej swój klucz z themoviedb.org
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

function updateTime(val) {
    document.getElementById('time-val').innerText = val;
}

function toggleSelect(el) {
    el.classList.toggle('selected');
}

function nextView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    const header = document.getElementById('main-header');
    if (viewId === 'view-start' || viewId === 'view-result') {
        header.style.display = 'none';
    } else {
        header.style.display = 'block';
        updateDots(viewId);
    }
}

function updateDots(viewId) {
    const dots = ['dot-1', 'dot-2', 'dot-3', 'dot-4'];
    dots.forEach(d => document.getElementById(d).classList.remove('active'));
    if (viewId === 'view-time') document.getElementById('dot-1').classList.add('active');
    if (viewId === 'view-platforms') document.getElementById('dot-2').classList.add('active');
    if (viewId === 'view-genres') document.getElementById('dot-3').classList.add('active');
}

async function fetchMovies() {
    const maxRuntime = document.getElementById('time-slider').value;
    const genreIds = Array.from(document.querySelectorAll('#genre-grid .selected'))
        .map(el => el.getAttribute('data-id')).join(',');

    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pl-PL&sort_by=popularity.desc&with_genres=${genreIds}&with_runtime.lte=${maxRuntime}&page=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
            displayMovie(randomMovie);
        } else {
            alert("Brak filmów dla tych kryteriów. Spróbuj zwiększyć czas.");
        }
    } catch (error) {
        console.error("Błąd API:", error);
    }
}

function displayMovie(movie) {
    document.getElementById('res-title').innerText = movie.title;
    document.getElementById('res-rating').innerText = `★ ${movie.vote_average}`;
    document.getElementById('res-desc').innerText = movie.overview || "Opis niedostępny.";
    document.getElementById('res-meta').innerText = `${movie.release_date.split('-')[0]} • Film`;

    const poster = movie.poster_path ? (IMG_URL + movie.poster_path) : 'https://via.placeholder.com/500x750?text=Brak+Okładki';
    document.getElementById('res-img').style.backgroundImage = `url('${poster}')`;

    nextView('view-result');
}