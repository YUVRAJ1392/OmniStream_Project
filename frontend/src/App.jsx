import { useState, useEffect } from "react";
import MovieCard from "./components/MovieCard";
import MovieModal from "./components/MovieModal";
import Auth from "./components/Auth";
import UserProfile from "./components/UserProfile";
import { fetchWithAuth } from "./utils/api";

function App() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");

  // NEW: State to toggle between the main app and the user profile
  const [view, setView] = useState("home"); // can be "home" or "profile"

  // Check browser memory on first load
  useEffect(() => {
    const token = localStorage.getItem("omnistream_token");
    const storedUser = localStorage.getItem("omnistream_user");
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUserName(storedUser);
    }
  }, []);

  const handleAuthSuccess = (name) => {
    setUserName(name);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("omnistream_token");
    localStorage.removeItem("omnistream_user");
    // Also clear the standard token we used in our api.js helper
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUserName("");
    setView("home");
  };

  // --- APPLICATION STATE ---
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [filterType, setFilterType] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const buildFetchUrl = (currentLimit, currentSkip) => {
    let url = `http://localhost:8000/api/movies?limit=${currentLimit}&skip=${currentSkip}`;
    if (searchInput) url += `&search=${searchInput}`;
    if (filterType) url += `&type=${filterType}`;
    if (filterGenre) url += `&genre=${filterGenre}`;
    if (filterYear) url += `&year=${filterYear}`;
    return url;
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    setSkip(0);
    setHasMore(true);

    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      const currentLimit =
        searchInput || filterType || filterGenre || filterYear ? 100 : 12;

      fetch(buildFetchUrl(currentLimit, 0))
        .then((response) => response.json())
        .then((data) => {
          setMovies(data);
          setHasMore(data.length === currentLimit);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching movies:", error);
          setLoading(false);
        });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, filterType, filterGenre, filterYear, isAuthenticated]);

  const loadMoreMovies = () => {
    setLoadingMore(true);
    const currentLimit =
      searchInput || filterType || filterGenre || filterYear ? 100 : 12;
    const nextSkip = skip + currentLimit;

    fetch(buildFetchUrl(currentLimit, nextSkip))
      .then((response) => response.json())
      .then((data) => {
        setMovies((prevMovies) => [...prevMovies, ...data]);
        setSkip(nextSkip);
        setHasMore(data.length === currentLimit);
        setLoadingMore(false);
      })
      .catch((error) => {
        console.error("Error loading more movies:", error);
        setLoadingMore(false);
      });
  };

  const hasActiveFilters = filterType || filterGenre || filterYear;
  const availableGenres = [
    "Action",
    "Sci-Fi",
    "Comedy",
    "Drama",
    "Horror",
    "Romance",
    "Thriller",
  ];
  const availableYears = ["2024", "2023", "2022", "2021", "2020", "2019"];

  // --- NEW: USER SAVED DATA MEMORY ---
  const [userSavedIds, setUserSavedIds] = useState({ liked: [], watchLater: [] });

  // When the user logs in, fetch their profile and remember the IDs of movies they liked
  useEffect(() => {
    if (isAuthenticated) {
      fetchWithAuth('/users/me')
        .then(data => {
          setUserSavedIds({
            liked: data.liked_movies.map(m => m.id),
            watchLater: data.watch_later_movies.map(m => m.id)
          });
        })
        .catch(err => console.error("Could not fetch user saved lists", err));
    }
  }, [isAuthenticated]);

  // --- THE GATEKEEPER ---
  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // --- THE MAIN APPLICATION ---
  return (
    <div className="min-h-screen bg-brand-dark font-sans text-brand-text selection:bg-brand-accent selection:text-white pb-20 relative">
      {/* GLOBAL NAVIGATION BAR */}
      <nav className="bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Clicking the logo returns you to home */}
          <h1
            onClick={() => setView("home")}
            className="text-3xl font-black tracking-tighter text-white cursor-pointer hover:opacity-80 transition-opacity"
          >
            OMNI<span className="text-brand-accent">STREAM</span>
          </h1>

          <div className="flex items-center gap-4 border border-zinc-800 bg-zinc-900/50 rounded-full pl-4 pr-1 py-1">
            <span className="text-xs text-zinc-400 font-medium hidden sm:inline-block tracking-wider">
              AGENT{" "}
              <span className="text-white font-bold ml-1">
                {userName.toUpperCase()}
              </span>
            </span>

            {/* NEW: View Toggle Button */}
            <button
              onClick={() => setView(view === "home" ? "profile" : "home")}
              className="text-[10px] font-black text-white uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-all"
            >
              {view === "home" ? "Profile" : "Home"}
            </button>

            <button
              onClick={handleLogout}
              className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/10 hover:bg-brand-accent hover:text-white px-3 py-1.5 rounded-full transition-all"
            >
              Disconnect
            </button>
          </div>
        </div>
      </nav>

      {/* --- DYNAMIC VIEW RENDERING --- */}
      {view === "profile" ? (
        // NEW: Passed the setSelectedMovie function down as a prop
        <UserProfile onMovieClick={setSelectedMovie} />
      ) : (
        // Render the Standard Home Component
        <main className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
          <div className="mb-12 text-center max-w-4xl mx-auto">
            <h2 className="text-5xl font-black text-white mb-8 tracking-tight">
              Predict the next <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-orange-500">
                global blockbuster.
              </span>
            </h2>

            {/* THE COMMAND CENTER */}
            <div className="bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-sm flex gap-4 relative z-40">
              <div className="flex-1 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <input
                  type="text"
                  placeholder="Search movies, directors, or genres..."
                  className="relative w-full bg-zinc-900 text-white text-md font-medium border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all placeholder-zinc-500"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`relative h-full px-6 flex items-center justify-center rounded-2xl border transition-all duration-300 ${
                    showFilters
                      ? "bg-brand-accent border-brand-accent text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                      : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>

                  {hasActiveFilters && (
                    <span className="absolute top-3 right-4 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full"></span>
                  )}
                </button>

                {showFilters && (
                  <div className="absolute right-0 top-full mt-4 w-80 sm:w-96 bg-[#121212] border border-zinc-700 rounded-2xl p-6 shadow-2xl z-50 animate-fade-in origin-top-right">
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">
                        Filters
                      </h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="text-zinc-500 hover:text-white text-xs font-bold"
                      >
                        Close ✕
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
                          Media Type
                        </label>
                        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                          <button
                            onClick={() => setFilterType("")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterType === "" ? "bg-zinc-700 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setFilterType("MOVIE")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterType === "MOVIE" ? "bg-blue-600 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            Movies
                          </button>
                          <button
                            onClick={() => setFilterType("TV SHOW")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterType === "TV SHOW" ? "bg-purple-600 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            TV Shows
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
                          Genre
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {availableGenres.map((genre) => (
                            <button
                              key={genre}
                              onClick={() =>
                                setFilterGenre(
                                  filterGenre === genre ? "" : genre,
                                )
                              }
                              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                                filterGenre === genre
                                  ? "bg-brand-accent/20 border-brand-accent text-brand-accent shadow-[0_0_10px_rgba(225,29,72,0.3)]"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                              }`}
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
                          Release Year
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {availableYears.map((year) => (
                            <button
                              key={year}
                              onClick={() =>
                                setFilterYear(filterYear === year ? "" : year)
                              }
                              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                                filterYear === year
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                              }`}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setFilterType("");
                          setFilterGenre("");
                          setFilterYear("");
                          setShowFilters(false);
                        }}
                        className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {(searchInput || filterType || filterGenre || filterYear) && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {filterType && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/30 flex items-center gap-2 shadow-lg">
                    Type: {filterType}{" "}
                    <button
                      onClick={() => setFilterType("")}
                      className="hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {filterGenre && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-brand-accent/20 text-brand-accent px-3 py-1.5 rounded-full border border-brand-accent/30 flex items-center gap-2 shadow-lg">
                    Genre: {filterGenre}{" "}
                    <button
                      onClick={() => setFilterGenre("")}
                      className="hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {filterYear && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-2 shadow-lg">
                    Year: {filterYear}{" "}
                    <button
                      onClick={() => setFilterYear("")}
                      className="hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">
              {searchInput || filterType || filterGenre || filterYear
                ? "Filtered Results"
                : "Trending Catalog"}
            </h3>
            <span className="text-sm font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full">
              {movies.length} Loaded
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-32 bg-brand-card/30 rounded-3xl border border-zinc-800 border-dashed">
              <p className="text-zinc-500 text-xl font-medium">
                No transmissions found matching those filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onClick={() => setSelectedMovie(movie)}
                    userSavedIds={userSavedIds}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-16 flex justify-center">
                  <button
                    onClick={loadMoreMovies}
                    disabled={loadingMore}
                    className="group relative px-8 py-4 bg-zinc-900 text-white font-black uppercase tracking-widest text-sm rounded-full border border-zinc-700 hover:border-brand-accent transition-all duration-300 overflow-hidden shadow-xl"
                  >
                    <div className="absolute inset-0 w-0 bg-brand-accent transition-all duration-[400ms] ease-out group-hover:w-full"></div>
                    <span className="relative flex items-center gap-2">
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Extracting...
                        </>
                      ) : (
                        "Load More Data ↓"
                      )}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* NEW LOCATION: Modal is now down here, outside the main view logic! */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onMovieSelect={setSelectedMovie}
          userSavedIds={userSavedIds}
        />
      )}
    </div>
  );
}

export default App;