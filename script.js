// --- 1. Настройки ---
const PROXY_URL = "https://silent-heart-1e6a.warsmaxger.workers.dev";
const KINOPOISK_SEARCH_API =
  "https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword";

// --- 2. Fetch helper ---
async function fetchJson(url) {
  const proxied = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxied);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function searchMovies(keyword) {
  try {
    const data = await fetchJson(
      `${KINOPOISK_SEARCH_API}?keyword=${encodeURIComponent(keyword)}&page=1`,
    );
    return data.films || [];
  } catch (e) {
    console.error("Ошибка поиска:", e);
    return [];
  }
}

// --- 3. Карточка фильма ---
function createMovieCard(movie) {
  const title = movie.nameRu || movie.nameEn || "Без названия";
  const poster =
    movie.posterUrlPreview ||
    "https://via.placeholder.com/180x260/1c1512/ff9b00?text=No+Poster";
  const year = movie.year || "";
  const rating = movie.rating || "";

  return `
    <div class="movie-card">
      <img src="${poster}" alt="${title}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/180x260/1c1512/ff9b00?text=No+Poster'">
      <div class="info">
        <h3 title="${title}">${title}</h3>
        <p class="meta">
          ${year ? `<span>${year}</span>` : ""}
          ${rating ? `<span class="rating-badge">★ ${rating}</span>` : ""}
        </p>
        <button class="watch-btn" data-id="${movie.filmId}" data-title="${title}">Смотреть</button>
      </div>
    </div>
  `;
}

function renderMovies(container, movies) {
  container.innerHTML = movies.map(createMovieCard).join("");
}

// --- 4. Плеер (открываем player.html в новой вкладке) ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".watch-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  const title = btn.dataset.title;
  if (!id) return;
  const params = new URLSearchParams({ id, title });
  window.open(`player.html?${params.toString()}`, "_blank");
});

// --- 5. Поиск ---
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const clearBtn = document.getElementById("clear-search");
const resultsSection = document.getElementById("results-section");
const resultsGrid = document.getElementById("results-grid");
const noResults = document.getElementById("no-results");
const emptyState = document.getElementById("empty-state");

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  emptyState.classList.add("hidden");
  resultsSection.classList.remove("hidden");
  resultsGrid.innerHTML = '<div class="loader">Поиск...</div>';
  noResults.classList.add("hidden");

  const movies = await searchMovies(query);

  if (movies.length === 0) {
    resultsGrid.innerHTML = "";
    noResults.classList.remove("hidden");
  } else {
    renderMovies(resultsGrid, movies);
  }

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearSearch() {
  searchInput.value = "";
  resultsSection.classList.add("hidden");
  resultsGrid.innerHTML = "";
  noResults.classList.add("hidden");
  emptyState.classList.remove("hidden");
  searchInput.focus();
}

searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") performSearch();
});
clearBtn.addEventListener("click", clearSearch);
