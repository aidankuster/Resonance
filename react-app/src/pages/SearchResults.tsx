import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Music,
  Search,
  Bell,
  User,
  Eye,
  Heart,
  ChevronLeft,
  SlidersHorizontal,
} from "lucide-react";
import { searchAPI, type SearchResultUser } from "../services/api";

function SearchResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [filters, setFilters] = useState({
    instrument: "",
    genre: "",
    experienceLevel: "",
  });

  const instruments = [
    "All Instruments",
    "Piano",
    "Guitar",
    "Violin",
    "Drums",
    "Saxophone",
    "Voice",
    "Bass",
    "Cello",
    "Trumpet",
    "Flute",
    "Clarinet",
    "Viola",
    "Harp",
    "Synthesizer",
    "Ukulele",
  ];

  const genreOptions = [
    "All Genres",
    "Jazz",
    "Classical",
    "Rock",
    "Fusion",
    "Funk",
    "R&B",
    "Soul",
    "Latin",
    "Folk",
    "Metal",
    "Blues",
    "Country",
    "Electronic",
    "Hip Hop",
    "Pop",
  ];

  const experienceLevels = [
    "All Levels",
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "PROFESSIONAL",
  ];

  // Perform search when component mounts or filters change
  useEffect(() => {
    performSearch();
  }, [location.search]); // Re-run when URL query changes

  const performSearch = async () => {
    setLoading(true);
    try {
      const results = await searchAPI.searchUsers({
        query: initialQuery || undefined,
        instrument: filters.instrument || undefined,
        genre: filters.genre || undefined,
        experienceLevel: filters.experienceLevel || undefined,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      // Show error message to user
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search query
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    performSearch();
  };

  const clearFilters = () => {
    setFilters({
      instrument: "",
      genre: "",
      experienceLevel: "",
    });
    // Re-run search with cleared filters
    setTimeout(() => performSearch(), 0);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Music className="h-8 w-8 text-amber-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
              Resonance
            </span>
          </div>

          <div className="flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search musicians, instruments, or genres..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500"
              />
            </form>
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative p-2 hover:bg-gray-800 rounded-full transition">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-3"
            >
              <div className="text-right">
                <p className="font-semibold">Aidan Kuster</p>
                <p className="text-sm text-gray-400">Guitar & Piano</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Search Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-800 rounded-full transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">
              Search Results for "{initialQuery}"
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
                showFilters || activeFilterCount > 0
                  ? "bg-amber-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white text-amber-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <p className="text-sm text-gray-400">
              {loading
                ? "Searching..."
                : `${searchResults.length} results found`}
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <aside className="w-72 flex-shrink-0">
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 sticky top-24">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Filters</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-amber-400 hover:text-amber-300"
                  >
                    Clear all
                  </button>
                </div>

                {/* Instrument Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Instrument
                  </label>
                  <select
                    value={filters.instrument}
                    onChange={(e) =>
                      setFilters({ ...filters, instrument: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                  >
                    {instruments.map((inst) => (
                      <option
                        key={inst}
                        value={inst === "All Instruments" ? "" : inst}
                      >
                        {inst}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Genre Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Genre
                  </label>
                  <select
                    value={filters.genre}
                    onChange={(e) =>
                      setFilters({ ...filters, genre: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                  >
                    {genreOptions.map((genre) => (
                      <option
                        key={genre}
                        value={genre === "All Genres" ? "" : genre}
                      >
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Level Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Experience Level
                  </label>
                  <select
                    value={filters.experienceLevel}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        experienceLevel: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                  >
                    {experienceLevels.map((level) => (
                      <option
                        key={level}
                        value={level === "All Levels" ? "" : level}
                      >
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleApplyFilters}
                  className="w-full bg-amber-600 hover:bg-amber-700 py-3 rounded-xl font-medium transition"
                >
                  Apply Filters
                </button>
              </div>
            </aside>
          )}

          {/* Results Grid */}
          <main className={`flex-1 ${showFilters ? "" : "max-w-6xl mx-auto"}`}>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((musician) => (
                  <div
                    key={musician.id}
                    className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group cursor-pointer"
                    onClick={() => navigate(`/profile/${musician.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">
                            {musician.displayName}
                          </h3>
                          <p className="text-amber-400 text-sm">
                            {musician.instruments.join(", ")}
                          </p>
                        </div>
                      </div>
                      {musician.matchPercentage && (
                        <div className="flex items-center gap-1 bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm">
                          {musician.matchPercentage}% match
                        </div>
                      )}
                    </div>

                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                      {musician.bio}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {musician.genres.map((genre, idx) => (
                        <span
                          key={idx}
                          className="bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-xs"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 capitalize">
                          {musician.experienceLevel.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Save", musician.id);
                          }}
                          className="p-2 hover:bg-gray-800 rounded-full transition"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("View", musician.id);
                          }}
                          className="p-2 hover:bg-gray-800 rounded-full transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results State */}
            {!loading && searchResults.length === 0 && (
              <div className="text-center py-20">
                <div className="bg-gray-900/30 rounded-2xl p-12 max-w-md mx-auto">
                  <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No results found</h3>
                  <p className="text-gray-400 mb-6">
                    We couldn't find any musicians matching your criteria
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilters({
                        instrument: "",
                        genre: "",
                        experienceLevel: "",
                      });
                      navigate("/search");
                    }}
                    className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default SearchResults;
