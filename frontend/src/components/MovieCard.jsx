import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/api";

// Notice we added 'userSavedIds' to the props!
const MovieCard = ({ movie, onClick, userSavedIds }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);

  // --- NEW: Sync the buttons with the database memory ---
  useEffect(() => {
    // If we have loaded the user's saved IDs, check if this movie is in them!
    if (userSavedIds) {
      // We use ?.includes just in case the arrays haven't fully loaded yet
      setIsLiked(userSavedIds.liked?.includes(movie.id) || false);
      setInWatchLater(userSavedIds.watchLater?.includes(movie.id) || false);
    }
  }, [userSavedIds, movie.id]);

  const safeGenres = movie?.genres?.join(", ") || "N/A";
  const safeRating = movie?.rating ? movie.rating.toFixed(1) : "0.0";
  const mediaType = movie?.type ? movie.type.toUpperCase() : "MOVIE";

  // DYNAMIC BADGE COLORS: Blue for Movie, Purple for TV Show
  const isMovie = mediaType === "MOVIE";
  const badgeColors = isMovie
    ? "bg-blue-600/90 text-blue-50 border-blue-400/30 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
    : "bg-purple-600/90 text-purple-50 border-purple-400/30 shadow-[0_0_10px_rgba(147,51,234,0.3)]";

  // --- NEW: Action Handlers ---
  const handleLike = async (e) => {
    e.stopPropagation(); // Prevents the card's main onClick from firing
    try {
      await fetchWithAuth(`/movies/${movie.id}/like`, { method: "POST" });
      setIsLiked(!isLiked);
    } catch (error) {
      alert("Please log in to like movies.");
    }
  };

  const handleWatchLater = async (e) => {
    e.stopPropagation();
    try {
      await fetchWithAuth(`/movies/${movie.id}/watch-later`, {
        method: "POST",
      });
      setInWatchLater(!inWatchLater);
    } catch (error) {
      alert("Please log in to save movies.");
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-brand-card rounded-2xl overflow-hidden group cursor-pointer border border-zinc-800 transition-all duration-500 hover:-translate-y-3 hover:shadow-neon hover:border-brand-accent flex flex-col h-full relative"
    >
      {/* Visual Header */}
      <div className="h-56 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black relative p-5 flex flex-col justify-end border-b border-zinc-800/50">
        {/* Dynamic Media Type Badge */}
        <div
          className={`absolute top-4 left-4 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border backdrop-blur-md ${badgeColors}`}
        >
          {mediaType}
        </div>

        {/* Release Year */}
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-zinc-300 text-xs font-black px-3 py-1 rounded-full border border-white/10">
          {movie?.release_year || "N/A"}
        </div>

        <h3
          className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg"
          title={movie?.title}
        >
          {movie?.title || "Unknown Title"}
        </h3>
      </div>

      {/* Simplified Footer */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <p className="line-clamp-1 text-xs mb-3">
          <span className="text-zinc-500 uppercase tracking-wider font-bold">
            Genres{" "}
          </span>
          <span className="text-zinc-300 ml-2">{safeGenres}</span>
        </p>

        {/* NEW: Action Buttons Row */}
        <div className="flex space-x-2 mb-4 border-t border-zinc-800/60 pt-3">
          <button
            onClick={handleLike}
            title="Like this movie"
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all border ${
              isLiked
                ? "bg-red-500/10 text-red-500 border-red-500/50"
                : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {isLiked ? "❤️ Liked" : "🤍 Like"}
          </button>

          <button
            onClick={handleWatchLater}
            title="Add to Watch Later"
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all border ${
              inWatchLater
                ? "bg-blue-500/10 text-blue-400 border-blue-500/50"
                : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {inWatchLater ? "🔖 Saved" : "➕ Watch Later"}
          </button>
        </div>

        <div className="flex justify-between items-center mt-auto">
          <div className="flex items-center space-x-1">
            <span className="text-yellow-500 text-sm">★</span>
            <span className="text-white font-bold text-sm">{safeRating}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-brand-accent group-hover:text-white transition-colors">
            View Details →
          </span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
