const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const API_URL = 'http://127.0.0.1:8000/api/';
const MAX_DRAWS = 5;

let currentMovie = null;
let watchlist = [];
let drawCount = 0;
let isLoginMode = true;

function updateTime(val) {
    const el = document.getElementById('time-val');
    if (el) el.innerText = val;
}

function toggleSelect(el) {
    el.classList.toggle('selected');
}



function showSummary() {
    const time = document.getElementById('time-slider').value;

    const platformsEl = document.querySelectorAll('#view-platforms .selected');
    const platforms = Array.from(platformsEl).map(el => el.innerText).join(', ') || 'All';

    const genresEl = document.querySelectorAll('#genre-grid .selected');
    const genres = Array.from(genresEl).map(el => el.innerText).join(', ') || 'All';

    const summaryTime = document.getElementById('summary-time');
    const summaryPlatforms = document.getElementById('summary-platforms');
    const summaryGenres = document.getElementById('summary-genres');

    if(summaryTime) summaryTime.innerText = time;
    if(summaryPlatforms) summaryPlatforms.innerText = platforms;
    if(summaryGenres) summaryGenres.innerText = genres;

    nextView('view-summary');
}

async function fetchMovies() {
    if (drawCount >= MAX_DRAWS) {
        alert("You have reached the limit of 5 draws.");
        return;
    }

    const slider = document.getElementById('time-slider');
    const maxLength = slider ? slider.value : 110;

    const genreIds = Array.from(document.querySelectorAll('#genre-grid .selected'))
        .map(el => el.getAttribute('data-id')).join(',');

    const providerIds = Array.from(document.querySelectorAll('#view-platforms .selected'))
        .map(el => el.getAttribute('data-id')).join(',');

    try {
        const response = await fetch(`${API_URL}match/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                genre: genreIds,
                platform: providerIds,
                max_length: maxLength
            })
        });

        if (response.ok) {
            const randomMovie = await response.json();
            drawCount++;
            updateDrawButton();
            displayMovie(randomMovie);
        } else if (response.status === 404) {
            alert("No movies found for these criteria.");
        } else {
            throw new Error(`Server returned status: ${response.status}`);
        }

    } catch (error) {
        console.error("API error:", error);
        alert("Network error. Make sure your Django server is running!");
    }
}

function updateDrawButton() {
    const btn = document.getElementById('btn-draw-again');
    if (!btn) return;

    const remaining = MAX_DRAWS - drawCount;
    btn.innerText = remaining > 0
        ? `🔄 Draw again (remaining: ${remaining})`
        : "🚫 Limit reached";

    if (remaining <= 0) {
        btn.style.opacity = "0.5";
        btn.disabled = true;
    }
}

function displayMovie(movie) {
    currentMovie = movie;
    document.getElementById('res-title').innerText = movie.title;

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'NR';
    document.getElementById('res-rating').innerText = `★ ${rating}`;

    document.getElementById('res-desc').innerText = movie.overview || "No description available.";
    document.getElementById('res-meta').innerText = `${movie.release_date ? movie.release_date.split('-')[0] : 'No date'} • Film`;

    const poster = movie.poster_path ? (IMG_URL + movie.poster_path) : 'https://placehold.co/500x750/222/FFF?text=No+Poster';
    document.getElementById('res-img').style.backgroundImage = `url('${poster}')`;

    nextView('view-result');
}

async function saveMovie() {
    const btn = document.getElementById('btn-draw-again');
    if (!currentMovie) return;

    // TODO: Change to HTTPS Cookies before deploy
    const token = localStorage.getItem('accessToken');
    if (!token) {
        alert("You must log in to save a movie!");
        toggleModal();
        return;
    }

    if (watchlist.find(m => m.id === currentMovie.id)) {
        alert("This movie is already on your list!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}library/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id: currentMovie.id,
                title: currentMovie.title,
                runtime: currentMovie.runtime || 0,
                genre_ids: currentMovie.genre_ids || [],
                poster_path: currentMovie.poster_path,
                overview: currentMovie.overview,
            })
        });

        if (response.ok) {
            watchlist.push({
                id: currentMovie.id,
                title: currentMovie.title,
                poster_path: currentMovie.poster_path
            });

            if(btn) {
                btn.disabled = true;
                btn.innerText = "✅ You already chose your movie!";
                btn.style.opacity = "0.5";
            }

            updateWatchlistUI();
            alert(`Movie "${currentMovie.title}" has been saved to your account!`);
        } else {
            const errorData = await response.json();
            alert("Server error: " + (errorData.detail || "Failed to save the movie"));
        }
    } catch (error) {
        console.error("API connection error:", error);
        alert("Network error. Check if the Django server is running.");
    }
}

function updateWatchlistUI() {
    const listEl = document.getElementById('watchlist-items');
    const countEl = document.getElementById('watchlist-count');

    if (watchlist.length === 0) {
        if(listEl) listEl.innerHTML = '<p style="color: #666; font-size: 13px;">Your list is empty</p>';
        if(countEl) countEl.style.display = 'none';
    } else {
        if(listEl) {
            listEl.innerHTML = watchlist.map(m => {
                const poster = m.poster_path ? (IMG_URL + m.poster_path) : 'https://placehold.co/100x150/222/FFF?text=No+Poster';
                return `
                <li style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #333;">
                    <img src="${poster}" alt="${m.title}" style="width: 50px; height: 75px; border-radius: 5px; object-fit: cover;">
                    <div style="font-weight: 600; font-size: 14px;">${m.title}</div>
                </li>
                `;
            }).join('');
        }

        if(countEl) {
            countEl.innerText = watchlist.length;
            countEl.style.display = watchlist.length > 0 ? 'flex' : 'none';
        }
    }
}

function toggleWatchlist() {
    const modal = document.getElementById('watchlist-modal');
    if(modal) modal.classList.toggle('active');
}

function createBackgroundIcons() {
    const bgContainer = document.getElementById('bg-animation');
    if (!bgContainer) return;

    const icons = ['🎬', '🍿', '⭐', '🎭', '🎥', '🎞️', '💎', '🌟'];
    const numberOfIcons = 20;

    for (let i = 0; i < numberOfIcons; i++) {
        const item = document.createElement('div');
        item.className = 'bg-item';
        item.innerText = icons[Math.floor(Math.random() * icons.length)];

        const startPos = Math.random() * 100;
        const duration = 15 + Math.random() * 20;
        const delay = Math.random() * 20;
        const size = 25 + Math.random() * 40;
        const blurValue = Math.random() * 5 + 2;

        item.style.left = startPos + '%';
        item.style.fontSize = size + 'px';
        item.style.animationDuration = duration + 's';
        item.style.animationDelay = '-' + delay + 's';
        item.style.filter = `blur(${blurValue}px)`;
        item.style.opacity = Math.random() * 0.5 + 0.1;

        bgContainer.appendChild(item);
    }
}

function toggleModal(){
    const modal = document.getElementById('loginModal');
    if(modal) modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function switchMode(event) {
    event.preventDefault();
    isLoginMode = !isLoginMode;

    document.getElementById('modalTitle').innerText = isLoginMode ? 'Log in' : 'Register';
    document.getElementById('submitBtn').innerText = isLoginMode ? 'Log in' : 'Register';

    const switchLink = event.target;
    switchLink.innerText = isLoginMode ? 'Register' : 'Log in';
    switchLink.parentElement.firstChild.textContent = isLoginMode ? "Don't have an account? " : 'Already have an account? ';
}

async function handleAuth(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isLoginMode) {
        await loginUser(email, password);
    } else {
        await registerUser(email, password);
    }
}

async function loginUser(email, password) {
    const response = await fetch(`${API_URL}auth/jwt/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        alert('Logged in successfully!');
        loadMyMovies();
        toggleModal();
        location.reload();
    } else {
        alert('Login error: ' + (data.detail || 'Check your credentials'));
    }
}

async function registerUser(email, password) {
    const response = await fetch(`${API_URL}auth/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            username: email.split('@')[0],
            password: password,
            re_password: password
        })
    });

    if (response.ok) {
        alert('Account created! You can now log in.');
        isLoginMode = false;
        switchMode({ preventDefault: () => {} });
    } else {
        const data = await response.json();
        alert('Registration error: ' + JSON.stringify(data));
    }
}

function logoutUser() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    alert("Logged out successfully!");
    location.reload();
}

async function loadMyMovies() {
    const token = localStorage.getItem('accessToken');
    const loginBtn = document.querySelector('.login-btn-top');

    if (!token) return;

    if (loginBtn) {
        loginBtn.innerText = 'Log out';
        loginBtn.onclick = logoutUser;
    }

    try {
        const response = await fetch(`${API_URL}library/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const moviesFromBackend = await response.json();

            watchlist = moviesFromBackend.map(movie => {
                return {
                    id: movie.external_id,
                    title: movie.title,
                    poster_path: movie.poster_path,
                };
            });

            updateWatchlistUI();
            console.log("Library loaded from database");
        }
    } catch (error) {
        console.error("Error fetching library:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMyMovies();
});

window.addEventListener('DOMContentLoaded', createBackgroundIcons);