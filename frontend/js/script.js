const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const MAX_DRAWS = 3; 

const API_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000/api/'
    : 'https://streammatch-f2b8.onrender.com/api/';

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
    const platforms = Array.from(platformsEl).map(el => el.innerText).join(', ') || 'Any';
    const genresEl = document.querySelectorAll('#genre-grid .selected');
    const genres = Array.from(genresEl).map(el => el.innerText).join(', ') || 'Any';

    document.getElementById('summary-time').innerText = time;
    document.getElementById('summary-platforms').innerText = platforms;
    document.getElementById('summary-genres').innerText = genres;

    nextView('view-summary');
}

function nextView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    const header = document.getElementById('main-header');
    header.style.display = (viewId === 'view-start' || viewId === 'view-result') ? 'none' : 'block';

    updateProgress(viewId);
}

function updateProgress(viewId) {
    const blocks = {
        'view-time': ['time-block'],
        'view-platforms': ['time-block', 'streaming-block'],
        'view-genres': ['time-block', 'streaming-block', 'genres-block'],
        'view-summary': ['time-block', 'streaming-block', 'genres-block', 'summary-block']
    };

    document.querySelectorAll('.grid-item.block').forEach(el => el.style.backgroundColor = '#36454F');
    
    if (blocks[viewId]) {
        blocks[viewId].forEach(id => {
            const block = document.getElementById(id);
            if(block) block.style.backgroundColor = 'var(--accent-color)';
        });
    }
}

async function fetchMovies() {
    if (drawCount >= MAX_DRAWS) return;

    let btn = document.querySelector('.view.active .btn-primary');
    if (!btn) btn = document.getElementById('btn-draw-again');

    const originalText = btn ? btn.innerText : "";
    if(btn) {
        btn.innerText = "Searching...";
        btn.disabled = true;
    }

    const slider = document.getElementById('time-slider');
    const maxLength = slider ? slider.value : 110;

    const genreIds = Array.from(document.querySelectorAll('#genre-grid .selected'))
        .map(el => el.getAttribute('data-id')).join(',');

    const providerIds = Array.from(document.querySelectorAll('#view-platforms .selected'))
        .map(el => el.getAttribute('data-id')).join('|');

    try {
        const response = await fetch(`${API_URL}match/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ genre: genreIds, platform: providerIds, max_length: maxLength })
        });

        if (response.ok) {
            const randomMovie = await response.json();
            drawCount++;
            updateDrawButton();
            displayMovie(randomMovie);
        } else {
            alert('No movies found. Try wider criteria!');
        }
    } catch (error) {
        console.error("API error:", error);
    } finally {
        if(btn) {
            btn.innerText = originalText;
            btn.disabled = false;
            if(drawCount > 0) updateDrawButton();
        }
    }
}

function updateDrawButton() {
    const btn = document.getElementById('btn-draw-again');
    if (!btn) return;
    const remaining = MAX_DRAWS - drawCount;
    btn.innerText = remaining > 0 ? `Reroll (remaining: ${remaining})` : "Limit reached";
    btn.disabled = remaining <= 0;
}

function displayMovie(movie) {
    currentMovie = movie;
    const titleEl = document.getElementById('res-title');
    const ratingEl = document.getElementById('res-rating');
    const descEl = document.getElementById('res-desc');
    const metaEl = document.getElementById('res-meta');
    const imgEl = document.getElementById('res-img');

    if(titleEl) titleEl.innerText = movie.title;
    if(ratingEl) ratingEl.innerText = `★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'}`;
    if(descEl) descEl.innerText = movie.overview || "No description available.";
    if(metaEl) metaEl.innerText = `${movie.release_date ? movie.release_date.split('-')[0] : 'No date'} • Movie`;

    const poster = movie.poster_path ? (IMG_URL + movie.poster_path) : 'https://placehold.co/500x750/222/FFF?text=No+Poster';
    if(imgEl) imgEl.style.backgroundImage = `url('${poster}')`;

    const saveBtn = document.getElementById('wybieram-film');
    if(saveBtn) {
        saveBtn.innerText = "Add to Watchlist";
        saveBtn.style.opacity = "1";
        saveBtn.style.pointerEvents = "auto";
    }

    nextView('view-result');
}

async function saveMovie() {
    if (!currentMovie) return;
    const token = localStorage.getItem('accessToken');
    const saveBtn = document.getElementById('wybieram-film');

    if (!token) {
        alert("Log in to save!");
        toggleModal();
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
                external_id: currentMovie.id,
                title: currentMovie.title,
                length: 0,
                genre: currentMovie.genre_ids ? currentMovie.genre_ids.join(', ') : "Unknown",
                poster_path: currentMovie.poster_path,
                overview: currentMovie.overview,
            })
        });

        if (response.ok) {
            watchlist.push({ id: currentMovie.id, title: currentMovie.title, poster_path: currentMovie.poster_path });
            if(saveBtn) {
                saveBtn.innerText = "Saved!";
                saveBtn.style.opacity = "0.5";
                saveBtn.style.pointerEvents = "none";
            }
            updateWatchlistUI();
        }
    } catch (error) {
        console.error("Save error:", error);
    }
}

function updateWatchlistUI() {
    const listEl = document.getElementById('watchlist-items');
    const countEl = document.getElementById('watchlist-count');

    if (!listEl || !countEl) return;

    if (watchlist.length === 0) {
        listEl.innerHTML = '<p style="color: #666; font-size: 13px; text-align:center;">Your list is empty</p>';
        countEl.style.display = 'none';
    } else {
        listEl.innerHTML = watchlist.map(m => {
            const poster = m.poster_path ? (IMG_URL + m.poster_path) : 'https://placehold.co/100x150/222/FFF?text=No+Poster';
            return `
            <li style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #333;">
                <img src="${poster}" alt="${m.title}" style="width: 50px; height: 75px; border-radius: 8px; object-fit: cover;">
                <div style="font-weight: 600; font-size: 14px;">${m.title}</div>
            </li>`;
        }).join('');
        countEl.innerText = watchlist.length;
        countEl.style.display = 'flex';
    }
}

function toggleWatchlist() { 
    const modal = document.getElementById('watchlist-modal');
    if(modal) modal.classList.toggle('active'); 
}

function toggleModal() {
    const modal = document.getElementById('loginModal');
    if(modal) modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function switchMode(event) {
    event.preventDefault();
    isLoginMode = !isLoginMode;
    const title = document.getElementById('modalTitle');
    const btn = document.getElementById('submitBtn');
    if(title) title.innerText = isLoginMode ? 'Log in' : 'Register';
    if(btn) btn.innerText = isLoginMode ? 'Log in' : 'Register';
    const link = event.target;
    if(link) {
        link.innerText = isLoginMode ? 'Register' : 'Log in';
        if(link.previousElementSibling) link.previousElementSibling.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
    }
}

async function handleAuth(event) {
    event.preventDefault();
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('password');
    if(!emailEl || !passEl) return;
    const email = emailEl.value;
    const password = passEl.value;
    if (isLoginMode) await loginUser(email, password); else await registerUser(email, password);
}

async function loginUser(email, password) {
    const btn = document.getElementById('submitBtn');
    if(btn) btn.innerText = "Please wait...";
    try {
        const response = await fetch(`${API_URL}auth/jwt/create/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);
            await loadMyMovies();
            toggleModal();
        } else alert('Error: ' + (data.detail || 'Check data'));
    } catch(e) { alert("Server error"); }
    finally { if(btn) btn.innerText = isLoginMode ? "Log in" : "Register"; }
}

async function registerUser(email, password) {
    try {
        const response = await fetch(`${API_URL}auth/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username: email.split('@')[0], password, re_password: password })
        });
        if (response.ok) {
            alert("Registered! Now log in.");
            switchMode({ preventDefault: () => {}, target: document.querySelector('.switch-text a') });
        } else {
            const data = await response.json();
            alert('Error: ' + JSON.stringify(data));
        }
    } catch(e) { alert("Server error"); }
}

function logoutUser() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    location.reload();
}

async function loadMyMovies() {
    const token = localStorage.getItem('accessToken');
    const loginBtn = document.querySelector('.login-btn-top');
    if (!token) return;
    if (loginBtn) { loginBtn.innerText = 'Log out'; loginBtn.onclick = logoutUser; }
    try {
        const response = await fetch(`${API_URL}library/`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            watchlist = data.map(m => ({ id: m.external_id, title: m.title, poster_path: m.poster_path }));
            updateWatchlistUI();
        }
    } catch (e) { console.error("Load error:", e); }
}

document.addEventListener('DOMContentLoaded', () => { loadMyMovies(); });
