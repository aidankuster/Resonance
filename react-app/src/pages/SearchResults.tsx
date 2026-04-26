import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import {
  Music,
  Search,
  User,
  Eye,
  Heart,
  ChevronLeft,
  SlidersHorizontal,
  Users,
  FolderOpen,
} from "lucide-react";
import {
  searchAPI,
  profileAPI,
  type SearchResultUser,
  type SearchResultProject,
} from "../services/api";

function SearchResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"all" | "users" | "projects">(
    "all",
  );
  const [userResults, setUserResults] = useState<SearchResultUser[]>([]);
  const [projectResults, setProjectResults] = useState<SearchResultProject[]>(
    [],
  );
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    instrument: string;
  }>({
    name: "",
    instrument: "",
  });
  const [loadingUser, setLoadingUser] = useState(true);
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

  // Load current user profile
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        if (!user) {
          setLoadingUser(false);
          return;
        }
        const profile = await profileAPI.getCurrentUserProfile(user.id);
        setCurrentUser({
          name: profile.info.displayName,
          instrument:
            profile.instruments?.length > 0
              ? profile.instruments.join(", ")
              : "Musician",
        });
      } catch (error) {
        console.error("Failed to load current user:", error);
      } finally {
        setLoadingUser(false);
      }
    };
    loadCurrentUser();
  }, [user]);

  // Perform search when component mounts, filters change, or search type changes
  useEffect(() => {
    performSearch();
  }, [location.search, searchType]);

  const performSearch = async () => {
    setLoading(true);
    try {
      if (searchType === "users") {
        const results = await searchAPI.searchUsers({
          query: initialQuery || undefined,
          instrument: filters.instrument || undefined,
          genre: filters.genre || undefined,
          experienceLevel: filters.experienceLevel || undefined,
        });
        setUserResults(results);
        setProjectResults([]);
      } else if (searchType === "projects") {
        const results = await searchAPI.searchProjects({
          query: initialQuery || undefined,
          instrument: filters.instrument || undefined,
          genre: filters.genre || undefined,
        });
        setProjectResults(results);
        setUserResults([]);
      } else {
        const results = await searchAPI.searchAll({
          query: initialQuery || undefined,
          instrument: filters.instrument || undefined,
          genre: filters.genre || undefined,
          experienceLevel: filters.experienceLevel || undefined,
        });
        setUserResults(results.users || []);
        setProjectResults(results.projects || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim())
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    performSearch();
  };
  const clearFilters = () => {
    setFilters({ instrument: "", genre: "", experienceLevel: "" });
    setTimeout(() => performSearch(), 0);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalResults = userResults.length + projectResults.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recruiting":
        return "bg-blue-900/30 text-blue-400 border border-blue-800/30";
      case "planning":
        return "bg-yellow-900/30 text-yellow-400 border border-yellow-800/30";
      case "active":
        return "bg-green-900/30 text-green-400 border border-green-800/30";
      default:
        return "bg-gray-900/30 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo - Left - Links to Dashboard */}
          <Link
            to="/dashboard"
            className="flex items-center hover:opacity-80 transition"
          >
            <img src="/logo-full.png" alt="Resonance" className="h-10" />
          </Link>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search musicians, projects, instruments, or genres..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500"
              />
            </form>
          </div>

          {/* Right Side - Name, Instruments, Profile Picture */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="font-semibold">{currentUser.name || "User"}</p>
              <p className="text-sm text-gray-400">
                {currentUser.instrument || "Musician"}
              </p>
            </div>
            <button
              onClick={() => user?.id && navigate(`/profile/${user.id}`)}
              className="relative cursor-pointer"
            >
              <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center overflow-hidden">
                {user && (
                  <img
                    src={profileAPI.getProfilePictureUrl(user.id)}
                    alt={currentUser.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const icon = document.createElement("div");
                        icon.innerHTML =
                          '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                        parent.appendChild(icon.firstChild!);
                      }
                    }}
                  />
                )}
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${showFilters || activeFilterCount > 0 ? "bg-amber-600 text-white" : "bg-gray-800 hover:bg-gray-700"}`}
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
              {loading ? "Searching..." : `${totalResults} results found`}
            </p>
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setSearchType("all")}
            className={`px-4 py-2 font-medium transition flex items-center gap-2 ${searchType === "all" ? "text-amber-400 border-b-2 border-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            <Search className="h-4 w-4" />
            All
          </button>
          <button
            onClick={() => setSearchType("users")}
            className={`px-4 py-2 font-medium transition flex items-center gap-2 ${searchType === "users" ? "text-amber-400 border-b-2 border-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            <Users className="h-4 w-4" />
            Musicians
          </button>
          <button
            onClick={() => setSearchType("projects")}
            className={`px-4 py-2 font-medium transition flex items-center gap-2 ${searchType === "projects" ? "text-amber-400 border-b-2 border-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            <FolderOpen className="h-4 w-4" />
            Projects
          </button>
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
                {(searchType === "all" || searchType === "users") && (
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
                )}
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
              <>
                {(searchType === "all" || searchType === "users") &&
                  userResults.length > 0 && (
                    <>
                      {searchType === "all" && (
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <Users className="h-5 w-5 text-amber-400" />
                          Musicians
                        </h2>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {userResults.map((musician) => (
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
                              {musician.genres.slice(0, 3).map((genre, idx) => (
                                <span
                                  key={idx}
                                  className="bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-xs"
                                >
                                  {genre}
                                </span>
                              ))}
                              {musician.genres.length > 3 && (
                                <span className="text-gray-500 text-xs">
                                  +{musician.genres.length - 3}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                              <span className="text-xs text-gray-500 capitalize">
                                {musician.experienceLevel.toLowerCase()}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="p-2 hover:bg-gray-800 rounded-full transition"
                                >
                                  <Heart className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                    </>
                  )}

                {(searchType === "all" || searchType === "projects") &&
                  projectResults.length > 0 && (
                    <>
                      {searchType === "all" && (
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-amber-400" />
                          Projects
                        </h2>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projectResults.map((project) => (
                          <div
                            key={project.id}
                            className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group cursor-pointer"
                            onClick={() => navigate(`/project/${project.id}`)}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-12 w-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center">
                                  <FolderOpen className="h-6 w-6 text-amber-400" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">
                                    {project.title}
                                  </h3>
                                  <p className="text-amber-400 text-sm">
                                    by {project.founderName}
                                  </p>
                                </div>
                              </div>
                              {project.matchPercentage && (
                                <div className="flex items-center gap-1 bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm">
                                  {project.matchPercentage}% match
                                </div>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                              {project.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {project.neededInstruments
                                .slice(0, 3)
                                .map((instrument, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-blue-500/10 text-blue-300 px-3 py-1 rounded-full text-xs"
                                  >
                                    {instrument}
                                  </span>
                                ))}
                              {project.neededInstruments.length > 3 && (
                                <span className="text-gray-500 text-xs">
                                  +{project.neededInstruments.length - 3}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}
                                >
                                  {project.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {project.memberCount} members
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/project/${project.id}`);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full text-sm font-medium transition"
                              >
                                View Project
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                {!loading && totalResults === 0 && (
                  <div className="text-center py-20">
                    <div className="bg-gray-900/30 rounded-2xl p-12 max-w-md mx-auto">
                      <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-2">
                        No results found
                      </h3>
                      <p className="text-gray-400 mb-6">
                        We couldn't find any musicians or projects matching your
                        criteria
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
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default SearchResults;
