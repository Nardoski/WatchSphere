const API_KEY = '913219c9e9d90cf47023e3599324e1f2';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;

// Fetch functions
async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return (await res.json()).results;
}
async function fetchTrendingAnime() {
  let all = [];
  for (let page=1; page<=3; page++) {
    const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const data = await res.json();
    all = all.concat(
      data.results.filter(item => item.original_language==='ja' && item.genre_ids.includes(16))
    );
  }
  return all;
}

// Display helpers
function displayBanner(item) {
  document.getElementById('banner').style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById('banner-title').textContent = item.title || item.name;
}
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

// Modal controls
function showDetails(item) {
  currentItem = item;
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview;
  document.getElementById('modal-image').src = `${IMG_URL}${item.poster_path}`;
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average/2));
  changeServer();
  document.getElementById('modal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
}
function changeServer() {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type==='movie'?'movie':'tv';
  let url;
  if (server==='vidsrc.cc') url = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  else if (server==='vidsrc.me') url = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
  else url = `https://player.videasy.net/${type}/${currentItem.id}`;
  document.getElementById('modal-video').src = url;
}

// Search functionality
async function searchAll() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  const results = data.results.filter(r=> r.poster_path);
  displayList(results, 'search-results');
  document.getElementById('search-row').style.display = results.length? 'block':'none';
}

document.getElementById('search-button').addEventListener('click', searchAll);
document.getElementById('search-input').addEventListener('keypress', e=> {
  if (e.key === 'Enter') searchAll();
});

// Initialize page
async function init() {
  const movies = await fetchTrending('movie');
  const tv = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();
  displayBanner(movies[Math.floor(Math.random()*movies.length)]);
  displayList(movies, 'movies-list');
  displayList(tv, 'tvshows-list');
  displayList(anime, 'anime-list');
}

init();
