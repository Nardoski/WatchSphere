
// Enhanced WatchSphere JavaScript
const API_KEY = '913219c9e9d90cf47023e3599324e1f2';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem = null;

async function fetchTrending(type) {
  try {
    const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error(`Error fetching trending ${type}:`, error);
    return [];
  }
}

async function fetchTrendingAnime() {
  let allResults = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
      const data = await res.json();
      const filtered = data.results.filter(item =>
        item.original_language === 'ja' && item.genre_ids.includes(16)
      );
      allResults = allResults.concat(filtered);
    }
  } catch (error) {
    console.error('Error fetching anime:', error);
  }
  return allResults;
}

function displayBanner(item) {
  const banner = document.getElementById('banner');
  const title = document.getElementById('banner-title');
  if (item?.backdrop_path) {
    banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  }
  title.textContent = item.title || item.name || 'Featured';
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p>No content available at the moment. Please try again later.</p>';
  } else {
    items.forEach(item => {
      if (!item.poster_path) return;
      const img = document.createElement('img');
      img.src = `${IMG_URL}${item.poster_path}`;
      img.alt = item.title || item.name;
      img.loading = 'lazy';
      img.onclick = () => showDetails(item);
      container.appendChild(img);
    });
  }
}

function showDetails(item) {
  currentItem = item;
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';
  document.getElementById('modal-image').src = `${IMG_URL}${item.poster_path}`;
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
  changeServer();
  document.getElementById('modal').style.display = 'flex';
}

function changeServer() {
  const server = document.getElementById('server').value;
  const type = currentItem?.media_type === 'movie' ? 'movie' : 'tv';
  let embedURL = '';

  switch (server) {
    case 'vidsrc.cc':
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;
    case 'vidsrc.me':
      embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
      break;
    case 'player.videasy.net':
      embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
      break;
  }

  const iframe = document.getElementById('modal-video');
  iframe.src = embedURL;

  iframe.onload = () => {
    // Handle successful load
  };

  iframe.onerror = () => {
    alert('Error loading the video. Please try again with a different server.');
  };
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
}

function openSearchModal() {
  const modal = document.getElementById('search-modal');
  modal.style.display = 'flex';
  const input = document.getElementById('search-input');
  input.focus();
}

function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}

async function searchTMDB() {
  const query = document.getElementById('search-input').value.trim();
  const container = document.getElementById('search-results');

  if (!query) {
    container.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    container.innerHTML = '';

    data.results.forEach(item => {
      if (!item.poster_path) return;
      const img = document.createElement('img');
      img.src = `${IMG_URL}${item.poster_path}`;
      img.alt = item.title || item.name;
      img.loading = 'lazy';
      img.onclick = () => {
        closeSearchModal();
        showDetails(item);
      };
      container.appendChild(img);
    });
  } catch (error) {
    console.error('Search failed:', error);
  }
}

function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.classList.toggle('active');
}

async function init() {
  const [movies, tvShows, anime] = await Promise.all([
    fetchTrending('movie'),
    fetchTrending('tv'),
    fetchTrendingAnime()
  ]);

  displayBanner(movies[Math.floor(Math.random() * movies.length)]);
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');
}

document.addEventListener('DOMContentLoaded', init);
