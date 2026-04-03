import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/api";

// --- NEW HELPER COMPONENT (DRY Principle) ---
// We extract the scrolling row UI so we don't copy-paste it 3 times!
const RecommendationRow = ({ title, icon, data, subtitleFn, onSelect }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mb-8">
      <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-3 flex items-center gap-2">
        {icon} {title}
      </h4>
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
        {data.map((rec) => (
          <div
            key={rec.id}
            onClick={() => onSelect(rec)}
            className="min-w-[160px] max-w-[160px] bg-zinc-900 rounded-xl p-3 border border-zinc-800 snap-start flex-shrink-0 hover:border-brand-accent transition-colors flex flex-col cursor-pointer"
          >
            <div className="h-28 bg-zinc-800 rounded-lg mb-3 relative">
              <span className="absolute top-2 left-2 text-[8px] font-black bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded text-white uppercase tracking-wider">
                {rec.type}
              </span>
              <span className="absolute bottom-2 right-2 text-[9px] font-black bg-black/80 px-1.5 py-0.5 rounded text-white">
                {rec.release_year}
              </span>
            </div>
            <h5
              className="text-white text-sm font-bold line-clamp-1 mb-1"
              title={rec.title}
            >
              {rec.title}
            </h5>
            <p className="text-[10px] text-zinc-500 font-medium line-clamp-1 uppercase tracking-wider">
              {subtitleFn(rec)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const MovieModal = ({ movie, onClose, onMovieSelect, userSavedIds }) => {
  const [prediction, setPrediction] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [recs, setRecs] = useState({ director: [], cast: [], similar: [] });
  const [loadingRecs, setLoadingRecs] = useState(true);

  // Review State
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewStatus, setReviewStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewsData, setReviewsData] = useState({
    overall_sentiment: "Loading...",
    reviews: [],
  });
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Action Button State
  const [isLiked, setIsLiked] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);

  // Sync the buttons with the database memory
  useEffect(() => {
    if (userSavedIds && movie) {
      setIsLiked(userSavedIds.liked?.includes(movie.id) || false);
      setInWatchLater(userSavedIds.watchLater?.includes(movie.id) || false);
    }
  }, [userSavedIds, movie]);

  // Main Movie Load Effect
  useEffect(() => {
    if (!movie) return;

    setPrediction(null);
    setReviewContent("");
    setReviewRating(0);
    setReviewStatus(null);

    const modalContainer = document.getElementById("modal-scroll-container");
    if (modalContainer) {
      modalContainer.scrollTo({ top: 0, behavior: "smooth" });
    }

    setLoadingRecs(true);
    fetch(`http://localhost:8000/api/movies/${movie.id}/recommendations`)
      .then((res) => res.json())
      .then((data) => {
        setRecs(data);
        setLoadingRecs(false);
      })
      .catch((err) => console.error("Failed to load recommendations", err));

    setLoadingReviews(true);
    fetch(`http://localhost:8000/api/movies/${movie.id}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        setReviewsData(data);
        setLoadingReviews(false);
      })
      .catch((err) => console.error("Failed to load reviews", err));
  }, [movie]);

  const handleBackdropClick = (e) => {
    if (e.target.id === "modal-backdrop") onClose();
  };

  const handleLike = async () => {
    try {
      await fetchWithAuth(`/movies/${movie.id}/like`, { method: "POST" });
      setIsLiked(!isLiked);
    } catch (error) {
      alert("Please log in to like movies.");
    }
  };

  const handleWatchLater = async () => {
    try {
      await fetchWithAuth(`/movies/${movie.id}/watch-later`, {
        method: "POST",
      });
      setInWatchLater(!inWatchLater);
    } catch (error) {
      alert("Please log in to save movies.");
    }
  };

  const runAiPredictor = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("http://localhost:8000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: movie?.title,
          budget: movie?.budget,
          popularity: movie?.popularity,
          vote_count: movie?.vote_count,
        }),
      });
      const data = await response.json();
      setPrediction(data);
    } catch (error) {
      console.error("AI Analysis Failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewContent.trim() || reviewRating === 0) return;

    setIsSubmitting(true);
    setReviewStatus(null);

    try {
      await fetchWithAuth(`/movies/${movie.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          content: reviewContent,
          rating: reviewRating,
        }),
      });
      setReviewStatus({ type: "success", text: "Review posted successfully!" });
      setReviewContent("");
      setReviewRating(0);

      fetch(`http://localhost:8000/api/movies/${movie.id}/reviews`)
        .then((res) => res.json())
        .then((data) => setReviewsData(data));
    } catch (error) {
      setReviewStatus({
        type: "error",
        text: "Must be logged in to leave a review.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "N/A";
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    return `$${amount.toLocaleString()}`;
  };

  if (!movie) return null;

  return (
    <div
      id="modal-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div
        id="modal-scroll-container"
        className="bg-[#121212] border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar scroll-smooth"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 hover:bg-brand-accent text-white p-2 rounded-full transition-colors z-10"
        >
          ✕
        </button>

        {/* Cinematic Header */}
        <div className="h-56 sm:h-72 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black relative p-6 sm:p-10 flex flex-col justify-end border-b border-zinc-800">
          <div className="flex gap-3 mb-3">
            <span className="bg-white/10 text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md">
              {movie.release_year || "N/A"}
            </span>
            <span className="bg-yellow-500/20 text-yellow-500 text-xs font-black px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
              ★ {movie.rating ? movie.rating.toFixed(1) : "N/A"}
            </span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight drop-shadow-lg">
            {movie.title}
          </h2>
        </div>

        {/* Core Details */}
        <div className="p-6 sm:p-10">
          <p className="text-zinc-300 text-lg mb-8 leading-relaxed">
            {movie.description || "No overview available for this title."}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 bg-black/40 p-5 rounded-2xl border border-zinc-800/50">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                Language
              </p>
              <p className="text-sm font-medium text-white">
                {movie?.language?.toUpperCase() || "EN"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                Popularity
              </p>
              <p className="text-sm font-medium text-white">
                {movie?.popularity?.toFixed(0) || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                Budget
              </p>
              <p className="text-sm font-medium text-white">
                {formatCurrency(movie?.budget)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                Box Office
              </p>
              <p className="text-sm font-medium text-emerald-400">
                {formatCurrency(movie?.revenue)}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-8 text-sm">
            <p>
              <span className="text-zinc-500 uppercase tracking-wider font-bold text-xs mr-3">
                Director
              </span>{" "}
              <span className="text-zinc-200">
                {movie?.directors?.join(", ") || "N/A"}
              </span>
            </p>
            <p>
              <span className="text-zinc-500 uppercase tracking-wider font-bold text-xs mr-3">
                Cast
              </span>{" "}
              <span className="text-zinc-200">
                {movie?.actors?.join(", ") || "N/A"}
              </span>
            </p>
            <p>
              <span className="text-zinc-500 uppercase tracking-wider font-bold text-xs mr-3">
                Genres
              </span>{" "}
              <span className="text-zinc-200">
                {movie?.genres?.join(", ") || "N/A"}
              </span>
            </p>
          </div>

          {/* LARGE ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-zinc-800">
            <button
              onClick={handleLike}
              className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                isLiked
                  ? "bg-red-500/10 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {isLiked ? "❤️ Liked" : "🤍 Like this Title"}
            </button>

            <button
              onClick={handleWatchLater}
              className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                inWatchLater
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {inWatchLater ? "🔖 Saved for Later" : "➕ Add to Watch Later"}
            </button>
          </div>

          {/* AI Predictor Section */}
          <div className="mt-8 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full">
              {prediction ? (
                <div className="p-4 bg-brand-accent/10 rounded-xl border border-brand-accent/30 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-brand-accent uppercase tracking-widest font-black mb-1">
                      AI Forecast Complete
                    </p>
                    <p className="text-xl font-bold text-white">
                      {prediction.prediction}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                      Confidence
                    </p>
                    <p className="text-lg font-bold text-brand-accent">
                      {prediction.confidence}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Run the machine learning model to predict commercial success.
                </p>
              )}
            </div>
            <button
              onClick={runAiPredictor}
              disabled={isAnalyzing}
              className={`w-full sm:w-auto px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 ${isAnalyzing ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-accent text-white hover:bg-brand-accent/80 shadow-[0_0_20px_rgba(225,29,72,0.4)]"}`}
            >
              {isAnalyzing ? "Processing..." : "Run AI Engine"}
            </button>
          </div>

          {/* WRITE A REVIEW SECTION */}
          <div className="mt-8 pt-8 border-t border-zinc-800">
            <h3 className="text-xl font-black text-white mb-4">
              Leave a Review
            </h3>
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold mr-2">
                  Rating:
                </span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl transition-colors ${star <= reviewRating ? "text-yellow-500" : "text-zinc-700 hover:text-yellow-500/50"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="What did you think of this movie?"
                className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-brand-accent resize-none min-h-[100px]"
              />
              <div className="flex items-center justify-between mt-4">
                <div>
                  {reviewStatus && (
                    <span
                      className={`text-sm font-bold ${reviewStatus.type === "success" ? "text-emerald-500" : "text-red-500"}`}
                    >
                      {reviewStatus.text}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleReviewSubmit}
                  disabled={
                    isSubmitting || !reviewContent.trim() || reviewRating === 0
                  }
                  className="bg-white text-black hover:bg-zinc-200 px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Posting..." : "Post Review"}
                </button>
              </div>
            </div>
          </div>

          {/* COMMUNITY SENTIMENT & REVIEWS SECTION */}
          <div className="mt-8 pt-8 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">Community Pulse</h3>
              {!loadingReviews && reviewsData.reviews.length > 0 && (
                <div className="bg-brand-accent/20 border border-brand-accent/50 px-4 py-1.5 rounded-full flex items-center gap-2">
                  <span className="text-[10px] text-brand-accent uppercase tracking-widest font-black">
                    Overall Sentiment:
                  </span>
                  <span className="text-sm font-bold text-white">
                    {reviewsData.overall_sentiment}
                  </span>
                </div>
              )}
            </div>

            {loadingReviews ? (
              <p className="text-sm text-zinc-500">
                Analyzing community sentiment...
              </p>
            ) : reviewsData.reviews.length === 0 ? (
              <p className="text-sm text-zinc-500 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50 text-center">
                No transmissions found. Be the first to leave a review!
              </p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {reviewsData.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors"
                  >
                    {/* Header: Rating & NLP Badge */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-zinc-400 uppercase">
                          {rev.author_name ? rev.author_name.charAt(0) : "U"}
                        </div>
                        <span className="text-yellow-500 text-sm font-black flex tracking-widest">
                          {"★".repeat(rev.rating)}
                          {"☆".repeat(5 - rev.rating)}
                        </span>
                      </div>

                      {/* Individual Sentiment Badge */}
                      <span
                        className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full border 
                        ${rev.color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}
                        ${rev.color === "red" ? "bg-red-500/10 text-red-400 border-red-500/20" : ""}
                        ${rev.color === "zinc" ? "bg-zinc-800 text-zinc-400 border-zinc-700" : ""}
                      `}
                      >
                        {rev.sentiment_badge}
                      </span>
                    </div>

                    {/* The Comment */}
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      "{rev.content}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* THE 3 RECOMMENDATION ROWS (Now DRY and optimized!) */}
          {!loadingRecs && (
            <div className="mt-12 pt-8 border-t border-zinc-800">
              <h3 className="text-2xl font-black text-white mb-8">
                Related Transmissions
              </h3>

              <RecommendationRow
                title="Similar Vibes"
                icon="📖"
                data={recs.similar}
                onSelect={onMovieSelect}
                subtitleFn={(rec) => rec.genres?.join(", ") || "N/A"}
              />

              <RecommendationRow
                title="The Director's Cut"
                icon="🎬"
                data={recs.director}
                onSelect={onMovieSelect}
                subtitleFn={(rec) =>
                  `Dir. ${rec.directors?.join(", ") || "N/A"}`
                }
              />

              <RecommendationRow
                title="Familiar Faces"
                icon="🎭"
                data={recs.cast}
                onSelect={onMovieSelect}
                subtitleFn={(rec) => rec.actors?.join(", ") || "N/A"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieModal;
