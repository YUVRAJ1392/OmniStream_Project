import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/api";

// --- NEW HELPER COMPONENT (DRY Principle) ---
const ProfileMovieItem = ({ movie, onClick, hoverColorClass, badgeNode }) => (
  <div
    onClick={() => onClick(movie)}
    className={`bg-black/40 border border-zinc-800/50 p-4 rounded-xl flex justify-between items-center transition-colors cursor-pointer ${hoverColorClass}`}
  >
    <span className="font-bold text-sm truncate pr-4">{movie.title}</span>
    {badgeNode}
  </div>
);

const UserProfile = ({ onMovieClick }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchWithAuth("/users/me");
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login"; // Redirect to login page
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      await fetchWithAuth(`/reviews/${reviewId}`, {
        method: "DELETE",
      });

      setProfile((prevProfile) => ({
        ...prevProfile,
        reviews: prevProfile.reviews.filter((review) => review.id !== reviewId),
      }));
    } catch (error) {
      alert("Failed to delete review. Please try again.");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex justify-center items-center">
        <div className="text-brand-accent animate-pulse font-bold tracking-widest uppercase">
          Loading Profile...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] flex justify-center items-center flex-col gap-4">
        <div className="text-red-500 font-bold">{error}</div>
        <button
          onClick={handleLogout}
          className="text-zinc-400 hover:text-white underline"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 sm:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* --- HEADER SECTION --- */}
        <div className="bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl -z-10"></div>

          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-brand-accent text-white flex justify-center items-center text-4xl font-black shadow-[0_0_20px_rgba(225,29,72,0.4)]">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-2">
                {profile.name}
              </h1>
              <p className="text-zinc-400 font-medium tracking-wide">
                {profile.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="border border-zinc-700 hover:border-red-500 hover:text-red-500 text-zinc-300 px-6 py-2 rounded-lg font-bold text-sm transition-all duration-300"
          >
            Sign Out
          </button>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LIKED MOVIES (Optimized Mapping) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
              <span className="text-red-500">❤️</span> Liked Transmissions
            </h2>
            {profile.liked_movies.length === 0 ? (
              <p className="text-zinc-500 text-sm">No liked movies yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.liked_movies.map((movie) => (
                  <ProfileMovieItem
                    key={movie.id}
                    movie={movie}
                    onClick={onMovieClick}
                    hoverColorClass="hover:border-brand-accent/50"
                    badgeNode={
                      <span className="text-yellow-500 text-xs font-black bg-yellow-500/10 px-2 py-1 rounded">
                        ★ {movie.rating ? movie.rating.toFixed(1) : "N/A"}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* WATCH LATER (Optimized Mapping) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
              <span className="text-blue-500">🔖</span> Watch Later
            </h2>
            {profile.watch_later_movies.length === 0 ? (
              <p className="text-zinc-500 text-sm">Your queue is empty.</p>
            ) : (
              <div className="space-y-3">
                {profile.watch_later_movies.map((movie) => (
                  <ProfileMovieItem
                    key={movie.id}
                    movie={movie}
                    onClick={onMovieClick}
                    hoverColorClass="hover:border-blue-500/50"
                    badgeNode={
                      <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                        Saved
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* REVIEWS */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
              <span className="text-brand-accent">✍️</span> Your Reviews
            </h2>
            {profile.reviews.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                You haven't reviewed any movies yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-black/40 border border-zinc-800/50 p-5 rounded-xl flex flex-col gap-3 group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                        Movie ID: {review.movie_id}{" "}
                      </span>
                      <span className="text-yellow-500 text-sm tracking-widest">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed italic">
                      "{review.content}"
                    </p>

                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-zinc-800/50">
                      <span className="text-[10px] text-zinc-600 font-bold">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>

                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white px-2.5 py-1 rounded uppercase tracking-widest font-bold transition-colors opacity-80 hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
