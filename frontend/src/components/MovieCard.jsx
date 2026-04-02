import React from 'react';

// Notice we added 'onClick' to the props!
const MovieCard = ({ movie, onClick }) => {
  const safeGenres = movie?.genres?.join(', ') || 'N/A';
  const safeRating = movie?.rating ? movie.rating.toFixed(1) : "0.0";
  const mediaType = movie?.type ? movie.type.toUpperCase() : "MOVIE";

  // DYNAMIC BADGE COLORS: Blue for Movie, Purple for TV Show
  const isMovie = mediaType === "MOVIE";
  const badgeColors = isMovie 
    ? "bg-blue-600/90 text-blue-50 border-blue-400/30 shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
    : "bg-purple-600/90 text-purple-50 border-purple-400/30 shadow-[0_0_10px_rgba(147,51,234,0.3)]";

  return (
    <div 
      onClick={onClick}
      className="bg-brand-card rounded-2xl overflow-hidden group cursor-pointer border border-zinc-800 transition-all duration-500 hover:-translate-y-3 hover:shadow-neon hover:border-brand-accent flex flex-col h-full relative"
    >
      
      {/* Visual Header */}
      <div className="h-56 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black relative p-5 flex flex-col justify-end border-b border-zinc-800/50">
        
        {/* Dynamic Media Type Badge */}
        <div className={`absolute top-4 left-4 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border backdrop-blur-md ${badgeColors}`}>
          {mediaType}
        </div>

        {/* Release Year */}
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-zinc-300 text-xs font-black px-3 py-1 rounded-full border border-white/10">
          {movie?.release_year || "N/A"}
        </div>
        
        <h3 className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg" title={movie?.title}>
          {movie?.title || "Unknown Title"}
        </h3>
      </div>

      {/* Simplified Footer */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <p className="line-clamp-1 text-xs mb-4"><span className="text-zinc-500 uppercase tracking-wider font-bold">Genres </span> 
          <span className="text-zinc-300 ml-2">{safeGenres}</span>
        </p>

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