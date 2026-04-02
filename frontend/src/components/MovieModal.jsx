import React, { useState, useEffect } from "react";

const MovieModal = ({ movie, onClose }) => {
  const [prediction, setPrediction] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Updated state to match the 3 Colab rows
  const [recs, setRecs] = useState({ director: [], cast: [], similar: [] });
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    if (!movie) return;
    setLoadingRecs(true);
    fetch(`http://localhost:8000/api/movies/${movie.id}/recommendations`)
      .then((res) => res.json())
      .then((data) => {
        setRecs(data);
        setLoadingRecs(false);
      })
      .catch((err) => console.error("Failed to load recommendations", err));
  }, [movie]);

  const handleBackdropClick = (e) => {
    if (e.target.id === "modal-backdrop") onClose();
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
      <div className="bg-[#121212] border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar">
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

          {/* THE 3 RECOMMENDATION ROWS */}
          {!loadingRecs && (
            <div className="mt-12 pt-8 border-t border-zinc-800">
              <h3 className="text-2xl font-black text-white mb-8">
                Related Transmissions
              </h3>

              {/* ROW 1: Similar Genres (Moved to Top) */}
              {recs.similar.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                    📖 Similar Vibes
                  </h4>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {recs.similar.map((rec) => (
                      <div
                        key={rec.id}
                        className="min-w-[160px] max-w-[160px] bg-zinc-900 rounded-xl p-3 border border-zinc-800 snap-start flex-shrink-0 hover:border-brand-accent transition-colors flex flex-col"
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
                        {/* Highlights the Genre */}
                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1 uppercase tracking-wider">
                          {rec.genres?.join(", ") || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ROW 2: Director */}
              {recs.director.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                    🎬 The Director's Cut
                  </h4>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {recs.director.map((rec) => (
                      <div
                        key={rec.id}
                        className="min-w-[160px] max-w-[160px] bg-zinc-900 rounded-xl p-3 border border-zinc-800 snap-start flex-shrink-0 hover:border-brand-accent transition-colors flex flex-col"
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
                        {/* Highlights the Director */}
                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">
                          Dir. {rec.directors?.join(", ") || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ROW 3: Cast */}
              {recs.cast.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                    🎭 Familiar Faces
                  </h4>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {recs.cast.map((rec) => (
                      <div
                        key={rec.id}
                        className="min-w-[160px] max-w-[160px] bg-zinc-900 rounded-xl p-3 border border-zinc-800 snap-start flex-shrink-0 hover:border-brand-accent transition-colors flex flex-col"
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
                        {/* Highlights the Cast */}
                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">
                          {rec.actors?.join(", ") || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieModal;
