import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { profileAPI, authAPI, searchAPI } from "../services/api";
import { useAuthContext } from "../contexts/AuthContext";
import type { SearchResultUser } from "../services/api";
import {
  Music,
  Search,
  Bell,
  User,
  Users,
  Calendar,
  FileText,
  Plus,
  Filter,
  Eye,
  Heart,
  Volume2,
  ChevronRight,
  Settings,
  LogOut,
  Download,
  Share2,
  Clock,
  TrendingUp,
  FolderOpen,
  Shield,
} from "lucide-react";

// Define the expected response type from backend
interface BackendProfileResponse {
  id: number;
  emailAddress: string;
  enabled: boolean;
  admin: boolean;
  info: {
    displayName: string;
    bio: string;
    availability: string;
    experienceLevel: string;
  };
  instruments: string[];
  genres: string[];
}

// Project response type
interface ProjectResponse {
  id: number;
  name: string;
  founderID: number;
  description: string;
  status: string;
  creationDate: string;
  memberRoles: {
    [roleName: string]: any | null;
  };
}

function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState("discover");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: "",
    instrument: "",
    completion: 0,
    profileViews: 0,
    matches: 0,
    email: "",
  });

  // Real data states
  const [suggestedMusicians, setSuggestedMusicians] = useState<
    SearchResultUser[]
  >([]);
  const [loadingMusicians, setLoadingMusicians] = useState(false);
  const [userProjects, setUserProjects] = useState<ProjectResponse[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [departmentAnnouncements, setDepartmentAnnouncements] = useState<any[]>(
    [],
  );

  // Platform stats
  const [platformStats, setPlatformStats] = useState({
    activeMusicians: 0,
    activeProjects: 0,
    newThisWeek: 0,
  });

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Load user profile and fetch discoverable musicians
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (!isAuthenticated || !user) {
          console.log("❌ No authenticated user found, redirecting to login");
          navigate("/userinitiation");
          return;
        }

        console.log("📡 Fetching profile for ID:", user.id);
        const profileData: BackendProfileResponse =
          await profileAPI.getCurrentUserProfile(user.id);

        console.log("✅ Profile data received:", profileData);

        // Set admin status
        setIsAdmin(profileData.admin || false);

        // Calculate profile completion
        let completion = 0;
        if (profileData.info.displayName) completion += 25;
        if (profileData.instruments && profileData.instruments.length > 0)
          completion += 25;
        if (profileData.genres && profileData.genres.length > 0)
          completion += 25;
        if (profileData.info.bio) completion += 25;

        setUserProfile({
          name: profileData.info.displayName,
          instrument:
            profileData.instruments && profileData.instruments.length > 0
              ? profileData.instruments.join(", ")
              : "No instruments",
          completion: completion,
          profileViews: 0,
          matches: 0,
          email: profileData.emailAddress,
        });

        // Fetch discoverable musicians after user profile loads
        await fetchDiscoverableMusicians(
          user.id,
          profileData.instruments,
          profileData.genres,
        );

        // Fetch user's projects
        await fetchUserProjects(user.id);

        // Fetch platform stats
        await fetchPlatformStats();
      } catch (error) {
        console.error("❌ Failed to load profile:", error);
        authAPI.logout();
        navigate("/userinitiation");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadUserProfile();
    }
  }, [navigate, isAuthenticated, user, authLoading]);

  // Fetch platform statistics
  const fetchPlatformStats = async () => {
    try {
      console.log("📊 Fetching platform statistics...");

      // Fetch all users to get total count
      const allUsers = await searchAPI.searchUsers({});
      const totalMusicians = allUsers.length;

      // Fetch all projects to get total count
      const projectsResponse = await fetch(`http://localhost:80/api/projects`, {
        credentials: "include",
      });

      let totalProjects = 0;
      if (projectsResponse.ok) {
        const projects: ProjectResponse[] = await projectsResponse.json();
        totalProjects = projects.length;
      }

      // Calculate new this week (users created in last 7 days)
      // For now, we'll estimate based on total - you can enhance this later
      const newThisWeek = Math.floor(totalMusicians * 0.15); // ~15% of total as placeholder

      setPlatformStats({
        activeMusicians: totalMusicians,
        activeProjects: totalProjects,
        newThisWeek: newThisWeek,
      });

      console.log(
        `✅ Platform stats: ${totalMusicians} musicians, ${totalProjects} projects`,
      );
    } catch (error) {
      console.error("❌ Failed to fetch platform stats:", error);
      // Keep default zeros
    }
  };

  // Fetch real musicians from the database
  const fetchDiscoverableMusicians = async (
    currentUserId: number,
    userInstruments: string[],
    userGenres: string[],
  ) => {
    setLoadingMusicians(true);
    try {
      console.log("🔍 Fetching discoverable musicians...");

      // Search for users with matching instruments or genres
      // We'll try to find users that share at least one instrument or genre
      let allUsers: SearchResultUser[] = [];

      // Try searching with the user's primary instrument first
      if (userInstruments.length > 0) {
        const primaryInstrument = userInstruments[0];
        const instrumentResults = await searchAPI.searchUsers({
          instrument: primaryInstrument,
        });
        allUsers = [...instrumentResults];
      }

      // Also search with primary genre if we have few results
      if (userGenres.length > 0 && allUsers.length < 10) {
        const primaryGenre = userGenres[0];
        const genreResults = await searchAPI.searchUsers({
          genre: primaryGenre,
        });

        // Merge results, avoiding duplicates
        const existingIds = new Set(allUsers.map((u) => u.id));
        genreResults.forEach((user) => {
          if (!existingIds.has(user.id)) {
            allUsers.push(user);
          }
        });
      }

      // If still few results, do a general search
      if (allUsers.length < 5) {
        const generalResults = await searchAPI.searchUsers({});
        const existingIds = new Set(allUsers.map((u) => u.id));
        generalResults.forEach((user) => {
          if (!existingIds.has(user.id)) {
            allUsers.push(user);
          }
        });
      }

      // Filter out the current user and limit to 6 musicians
      const filteredUsers = allUsers
        .filter((musician) => musician.id !== currentUserId)
        .slice(0, 6);

      console.log(
        `✅ Found ${filteredUsers.length} discoverable musicians (excluding self)`,
      );
      setSuggestedMusicians(filteredUsers);
    } catch (error) {
      console.error("❌ Failed to fetch discoverable musicians:", error);
      // Set empty array on error
      setSuggestedMusicians([]);
    } finally {
      setLoadingMusicians(false);
    }
  };

  // Fetch user's projects
  const fetchUserProjects = async (userId: number) => {
    setLoadingProjects(true);
    try {
      console.log("🔍 Fetching projects for user ID:", userId);

      const response = await fetch(
        `http://localhost:80/api/projects?founderId=${userId}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const projects: ProjectResponse[] = await response.json();
      console.log(`✅ Found ${projects.length} projects for user`);
      setUserProjects(projects);
    } catch (error) {
      console.error("❌ Failed to fetch user projects:", error);
      setUserProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      // Force a hard navigation to clear any cached state
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback - still try to navigate
      window.location.href = "/";
    }
  };

  const handleViewProfile = () => {
    if (user?.id) {
      navigate(`/profile/${user.id}`);
    }
  };

  const handleGenerateFlyer = () => {
    console.log("Generate flyer clicked");
    // TODO: Implement flyer generation
  };

  // Helper function to get match percentage based on shared instruments/genres
  const calculateMatchPercentage = (musician: SearchResultUser): number => {
    // This is a simple calculation - you can make it more sophisticated
    // For now, use the matchPercentage from the API if available
    if (musician.matchPercentage !== undefined) {
      return musician.matchPercentage;
    }

    // Fallback: calculate based on available data
    // You could enhance this by comparing with the current user's instruments/genres
    return Math.floor(Math.random() * 20) + 75; // 75-95% range as placeholder
  };

  // Helper to get status color for project cards
  const getProjectStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-900/30 text-green-400";
      case "recruiting":
        return "bg-blue-900/30 text-blue-400";
      case "planning":
        return "bg-yellow-900/30 text-yellow-400";
      default:
        return "bg-gray-900/30 text-gray-400";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

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
                placeholder="Search musicians, projects, or ensembles..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500"
              />
            </form>
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative p-2 hover:bg-gray-800 rounded-full transition">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="font-semibold">{userProfile.name}</p>
                <p className="text-sm text-gray-400">
                  {userProfile.instrument}
                </p>
              </div>
              <button
                onClick={handleViewProfile}
                className="relative cursor-pointer"
              >
                <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-24">
              {/* User Profile Card */}
              <div className="bg-gray-900/50 rounded-2xl p-6 mb-6 border border-gray-800">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{userProfile.name}</h3>
                    <p className="text-amber-400 text-sm">Instruments:</p>
                    <p className="text-gray-300 text-sm">
                      {userProfile.instrument}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Profile Completion</span>
                      <span>{userProfile.completion}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                        style={{ width: `${userProfile.completion}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-800/50 p-3 rounded-xl">
                      <p className="text-2xl font-bold">
                        {userProfile.profileViews}
                      </p>
                      <p className="text-xs text-gray-400">Profile Views</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-xl">
                      <p className="text-2xl font-bold">
                        {userProfile.matches}
                      </p>
                      <p className="text-xs text-gray-400">Matches</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("discover")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                    activeTab === "discover"
                      ? "bg-amber-600 text-white"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <Search className="h-5 w-5" />
                  <span>Discover</span>
                </button>

                <button
                  onClick={() => setActiveTab("projects")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                    activeTab === "projects"
                      ? "bg-amber-600 text-white"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>My Projects</span>
                </button>

                <button
                  onClick={() => setActiveTab("activity")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                    activeTab === "activity"
                      ? "bg-amber-600 text-white"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span>Activity</span>
                </button>

                <button
                  onClick={() => setActiveTab("tools")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                    activeTab === "tools"
                      ? "bg-amber-600 text-white"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  <span>Tools</span>
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                    activeTab === "settings"
                      ? "bg-amber-600 text-white"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-purple-400 hover:bg-purple-900/20"
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-red-400 hover:bg-red-900/20"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Log Out</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 rounded-2xl p-8 mb-8 border border-amber-800/30">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Welcome back, {userProfile.name}!
                  </h1>
                  <p className="text-gray-300">
                    Ready to make some music? Check out your matches and latest
                    activity.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/create-project")}
                  className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition transform hover:scale-105"
                >
                  <Plus className="h-5 w-5" />
                  New Project
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "discover" && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Discover Musicians</h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate("/search")}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                    </button>
                    <div className="text-sm text-gray-400">
                      Showing {suggestedMusicians.length} matches for you
                    </div>
                  </div>
                </div>

                {loadingMusicians ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : suggestedMusicians.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggestedMusicians.map((musician) => {
                      const matchPercentage =
                        calculateMatchPercentage(musician);
                      return (
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
                                  {musician.instruments?.join(", ") ||
                                    "Musician"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm">
                              <TrendingUp className="h-3 w-3" />
                              {matchPercentage}% match
                            </div>
                          </div>

                          {musician.bio && (
                            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                              {musician.bio}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 mb-4">
                            {musician.genres?.slice(0, 3).map((g, idx) => (
                              <span
                                key={idx}
                                className="bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-xs"
                              >
                                {g}
                              </span>
                            ))}
                            {musician.genres && musician.genres.length > 3 && (
                              <span className="text-gray-400 text-xs">
                                +{musician.genres.length - 3}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 capitalize">
                              {musician.experienceLevel?.toLowerCase() ||
                                "beginner"}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${musician.id}`);
                                }}
                                className="p-2 hover:bg-gray-800 rounded-full transition"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement save functionality
                                  console.log("Save musician:", musician.id);
                                }}
                                className="p-2 hover:bg-gray-800 rounded-full transition"
                              >
                                <Heart className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${musician.id}`);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full text-sm font-medium transition"
                              >
                                Contact
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-900/30 rounded-2xl p-12 text-center border border-gray-800">
                    <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">
                      No musicians found
                    </h3>
                    <p className="text-gray-400 mb-4">
                      We couldn't find any musicians matching your profile yet.
                    </p>
                    <button
                      onClick={() => navigate("/search")}
                      className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
                    >
                      Browse All Musicians
                    </button>
                  </div>
                )}

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-amber-500/20 p-3 rounded-xl">
                        <FileText className="h-6 w-6 text-amber-400" />
                      </div>
                      <h3 className="font-bold">Generate Flyer</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      Create a printable PDF of your profile to post around
                      campus
                    </p>
                    <button
                      onClick={handleGenerateFlyer}
                      className="w-full bg-amber-600 hover:bg-amber-700 py-2 rounded-full font-medium transition"
                    >
                      Create Flyer
                    </button>
                  </div>

                  <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-amber-500/20 p-3 rounded-xl">
                        <Calendar className="h-6 w-6 text-amber-400" />
                      </div>
                      <h3 className="font-bold">Upcoming Events</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      No upcoming events scheduled
                    </p>
                    <button className="w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-full font-medium transition">
                      View Calendar
                    </button>
                  </div>

                  <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-amber-500/20 p-3 rounded-xl">
                        <Volume2 className="h-6 w-6 text-amber-400" />
                      </div>
                      <h3 className="font-bold">Audio Library</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      Upload and manage your audio samples
                    </p>
                    <button className="w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-full font-medium transition">
                      Manage Audio
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">My Projects</h2>
                  {/* Removed duplicate New Project button - now only in Welcome banner */}
                </div>

                {loadingProjects ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : userProjects.length === 0 ? (
                  <div className="bg-gray-900/30 rounded-2xl p-12 text-center border border-gray-800">
                    <FolderOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No projects yet</h3>
                    <p className="text-gray-400 mb-4">
                      Create your first project to start collaborating with
                      other musicians
                    </p>
                    <button
                      onClick={() => navigate("/create-project")}
                      className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userProjects.map((project) => {
                      const memberCount = Object.values(
                        project.memberRoles || {},
                      ).filter((member) => member !== null).length;

                      return (
                        <div
                          key={project.id}
                          className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition cursor-pointer"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold">
                              {project.name}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-sm capitalize ${getProjectStatusColor(project.status)}`}
                            >
                              {project.status}
                            </span>
                          </div>

                          <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                            {project.description}
                          </p>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                {memberCount} member
                                {memberCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/project/${project.id}`);
                              }}
                              className="text-amber-400 hover:text-amber-300 text-sm font-medium"
                            >
                              View Project{" "}
                              <ChevronRight className="h-4 w-4 inline" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Recent Activity</h2>
                <div className="bg-gray-900/30 rounded-2xl p-12 text-center border border-gray-800">
                  <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No recent activity</h3>
                  <p className="text-gray-400">
                    Activity will appear here as you interact with other
                    musicians
                  </p>
                </div>
              </div>
            )}

            {activeTab === "tools" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-amber-500/20 p-3 rounded-xl">
                        <Download className="h-8 w-8 text-amber-400" />
                      </div>
                      <h3 className="text-xl font-bold">Flyer Generator</h3>
                    </div>
                    <p className="text-gray-400 mb-6">
                      Create a printable PDF flyer of your profile to post
                      around campus.
                    </p>
                    <button
                      onClick={handleGenerateFlyer}
                      className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 py-3 rounded-full font-semibold transition"
                    >
                      Generate PDF Flyer
                    </button>
                  </div>

                  <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-amber-500/20 p-3 rounded-xl">
                        <Share2 className="h-8 w-8 text-amber-400" />
                      </div>
                      <h3 className="text-xl font-bold">Share Profile</h3>
                    </div>
                    <p className="text-gray-400 mb-6">
                      Share your profile link with other musicians or on social
                      media.
                    </p>
                    <button className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-full font-medium transition">
                      Copy Profile Link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Settings</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold text-lg mb-6">
                        Profile Settings
                      </h3>
                      <div className="space-y-4">
                        <button
                          onClick={() =>
                            user?.id &&
                            navigate(
                              `/create-profile?edit=true&userId=${user.id}`,
                            )
                          }
                          className="w-full bg-amber-600 hover:bg-amber-700 py-3 rounded-full font-medium transition"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar - Announcements */}
          <aside className="w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Department Announcements
                </h3>
                {departmentAnnouncements.length > 0 ? (
                  <div className="space-y-4">
                    {/* Announcements will be mapped here when API is ready */}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No announcements at this time
                  </p>
                )}
              </div>

              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h3 className="font-bold text-lg mb-4">Platform Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Active Musicians</span>
                    <span className="font-bold">
                      {platformStats.activeMusicians}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Active Projects</span>
                    <span className="font-bold">
                      {platformStats.activeProjects}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">New This Week</span>
                    <span className="font-bold">
                      {platformStats.newThisWeek}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-900/10 rounded-2xl p-6 border border-amber-800/30">
                <h3 className="font-bold text-lg mb-3">Need Help?</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Contact the UNCP Music Department for support or questions
                  about the platform.
                </p>
                <button className="w-full bg-amber-600 hover:bg-amber-700 py-2 rounded-full font-medium transition">
                  Get Support
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
