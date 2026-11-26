const PROXY_URL = "https://kino-proxy-l2vyd26cd-bears20.vercel.app";
const KINOPOISK_SEARCH_API =
  "https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword";
const KINOPOISK_POPULAR_API =
  "https://kinopoiskapiunofficial.tech/api/v2.2/films/collections?type=TOP_POPULAR_MOVIES&page=1";
const CACHE_KEY = "kinoloft_popular_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000;

let isSearching = false;

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
    return (data.films || []).map((film) => ({
      id: film.filmId,
      title: film.nameRu || film.nameEn || "Без названия",
      year: film.year || "",
      rating: film.rating || "",
      poster:
        film.posterUrlPreview ||
        "https://via.placeholder.com/180x260/1c1512/ff9b00?text=No+Poster",
    }));
  } catch (e) {
    console.error("Ошибка поиска:", e);
    return [];
  }
}

async function getPopularMovies() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_TTL) {
      return parsed.data;
    }
  }

  try {
    const data = await fetchJson(KINOPOISK_POPULAR_API);
    const movies = (data.items || []).map((film) => ({
      id: film.kinopoiskId,
      title: film.nameRu || film.nameEn || "Без названия",
      year: film.year || "",
      rating: film.ratingKinopoisk || "",
      poster:
        film.posterUrlPreview ||
        "https://via.placeholder.com/180x260/1c1512/ff9b00?text=No+Poster",
    }));

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: movies,
      }),
    );
    return movies;
  } catch (e) {
    console.error("Ошибка загрузки популярного:", e);
    return [];
  }
}

function createMovieCard(movie) {
  return `
    <div class="movie-card">
      <img src="${movie.poster}" alt="${movie.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/180x260/1c1512/ff9b00?text=No+Poster'">
      <div class="info">
        <h3 title="${movie.title}">${movie.title}</h3>
        <p class="meta">
          ${movie.year ? `<span>${movie.year}</span>` : ""}
          ${movie.rating ? `<span class="rating-badge">★ ${movie.rating}</span>` : ""}
        </p>
        <button class="watch-btn" data-id="${movie.id}" data-title="${movie.title}">Смотреть</button>
      </div>
    </div>
  `;
}

function renderMovies(container, movies) {
  if (!movies || movies.length === 0) {
    container.innerHTML = '<p class="no-results">Ничего не найдено.</p>';
    return;
  }
  container.innerHTML = movies.map(createMovieCard).join("");
}

// --- Логика сохранения состояния (sessionStorage) ---
function saveSearchState(query, movies) {
  sessionStorage.setItem("kinoloft_search_query", query);
  sessionStorage.setItem("kinoloft_search_results", JSON.stringify(movies));
}

function clearSearchState() {
  sessionStorage.removeItem("kinoloft_search_query");
  sessionStorage.removeItem("kinoloft_search_results");
  sessionStorage.removeItem("kinoloft_scroll_y");
}

function restoreSearchState() {
  const query = sessionStorage.getItem("kinoloft_search_query");
  const resultsJson = sessionStorage.getItem("kinoloft_search_results");

  if (query && resultsJson) {
    const movies = JSON.parse(resultsJson);
    if (movies.length > 0) {
      searchInput.value = query;
      emptyState.classList.add("hidden");
      popularSection.classList.add("hidden");
      resultsSection.classList.remove("hidden");
      renderMovies(resultsGrid, movies);

      const scrollY = sessionStorage.getItem("kinoloft_scroll_y");
      if (scrollY) {
        setTimeout(() => window.scrollTo(0, parseInt(scrollY)), 50);
      }
      return true;
    }
  }
  return false;
}

// --- Обработчики ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".watch-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  const title = btn.dataset.title;
  if (!id) return;

  // Сохраняем позицию скролла перед уходом на плеер
  sessionStorage.setItem("kinoloft_scroll_y", window.scrollY);

  const params = new URLSearchParams({ id, title });
  window.location.href = `player.html?${params.toString()}`;
});

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const clearBtn = document.getElementById("clear-search");
const resultsSection = document.getElementById("results-section");
const resultsGrid = document.getElementById("results-grid");
const noResults = document.getElementById("no-results");
const emptyState = document.getElementById("empty-state");
const popularSection = document.getElementById("popular-section");
const popularGrid = document.getElementById("popular-grid");

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query || isSearching) return;

  isSearching = true;
  searchBtn.disabled = true;

  emptyState.classList.add("hidden");
  popularSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");
  resultsGrid.innerHTML = '<div class="loader">Поиск...</div>';
  noResults.classList.add("hidden");

  const movies = await searchMovies(query);

  if (movies.length === 0) {
    resultsGrid.innerHTML = "";
    noResults.classList.remove("hidden");
    clearSearchState();
  } else {
    renderMovies(resultsGrid, movies);
    saveSearchState(query, movies);
  }

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  isSearching = false;
  searchBtn.disabled = false;
}

function clearSearch() {
  clearSearchState();
  searchInput.value = "";
  resultsSection.classList.add("hidden");
  resultsGrid.innerHTML = "";
  noResults.classList.add("hidden");
  emptyState.classList.remove("hidden");
  popularSection.classList.remove("hidden");
  searchInput.focus();
}

searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") performSearch();
});

if (clearBtn) {
  clearBtn.addEventListener("click", clearSearch);
}

const removeAds = () => {
  document
    .querySelectorAll(".ad-banner, [data-ad], ins.adsbygoogle")
    .forEach((el) => el.remove());
};

let adBlockTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(adBlockTimeout);
  adBlockTimeout = setTimeout(removeAds, 200);
});

document.addEventListener("DOMContentLoaded", async () => {
  removeAds();

  // Пытаемся восстановить поиск. Если не получилось — грузим популярное.
  const isRestored = restoreSearchState();

  if (!isRestored) {
    try {
      const popularMovies = await getPopularMovies();
      renderMovies(popularGrid, popularMovies);
    } catch (err) {
      popularGrid.innerHTML =
        '<p class="no-results">Не удалось загрузить популярные фильмы.</p>';
    }
  }
});

// Сброс поиска при клике на логотип (возврат на главную)
const brandLogo = document.querySelector(".brand");
if (brandLogo) {
  brandLogo.addEventListener("click", () => {
    clearSearchState();
  });
}

window.addEventListener("load", () => {
  observer.observe(document.body, { childList: true, subtree: true });
});
