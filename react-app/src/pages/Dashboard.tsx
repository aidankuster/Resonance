import { useState, useEffect, useRef } from "react";
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
  Volume2,
  ChevronRight,
  ChevronLeft,
  Settings,
  LogOut,
  Download,
  Share2,
  Clock,
  TrendingUp,
  FolderOpen,
  Shield,
  Award,
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

// Notification type
interface NotificationItem {
  id: string;
  type: "new_user" | "new_project" | "application" | "project_update";
  message: string;
  link?: string;
  time: string;
  read: boolean;
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
    email: "",
    experienceLevel: "",
    genres: [] as string[],
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
  });

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Flyer state
  const [showFlyerModal, setShowFlyerModal] = useState(false);
  const [flyerMessage, setFlyerMessage] = useState("");

  // Calendar state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarAnnouncements, setCalendarAnnouncements] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notification-area")) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showNotifications]);

  // Generate notifications when suggested musicians or projects change
  useEffect(() => {
    if (suggestedMusicians.length > 0 || userProjects.length > 0) {
      generateNotifications(suggestedMusicians, userProjects);
    }
  }, [suggestedMusicians, userProjects, platformStats]);

  // Load user profile and fetch discoverable musicians
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (!isAuthenticated || !user) {
          navigate("/userinitiation");
          return;
        }

        const profileData: BackendProfileResponse =
          await profileAPI.getCurrentUserProfile(user.id);
        setIsAdmin(profileData.admin || false);

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
          email: profileData.emailAddress,
          experienceLevel: profileData.info.experienceLevel || "BEGINNER",
          genres: profileData.genres || [],
        });

        await fetchDiscoverableMusicians(
          user.id,
          profileData.instruments,
          profileData.genres,
        );
        await fetchUserProjects(user.id);

        fetch("/api/announcements", { credentials: "include" })
          .then((res) => res.json())
          .then((data) => setDepartmentAnnouncements(data))
          .catch(() => {});

        await fetchPlatformStats();
      } catch (error) {
        console.error("Failed to load profile:", error);
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

  const generateNotifications = (
    musicians: SearchResultUser[],
    projects: ProjectResponse[],
  ) => {
    const items: NotificationItem[] = [];
    musicians.slice(0, 2).forEach((musician) => {
      items.push({
        id: `user-${musician.id}`,
        type: "new_user",
        message: `${musician.displayName} joined the platform`,
        link: `/profile/${musician.id}`,
        time: "Recently",
        read: false,
      });
    });
    projects.slice(0, 2).forEach((project) => {
      items.push({
        id: `project-${project.id}`,
        type: "new_project",
        message: `New project "${project.name}" is recruiting`,
        link: `/project/${project.id}`,
        time: "Recently",
        read: false,
      });
    });
    if (musicians.length > 0 || projects.length > 0) {
      items.push({
        id: `milestone-${Date.now()}`,
        type: "project_update",
        message: `Platform now has ${platformStats.activeMusicians} musicians and ${platformStats.activeProjects} projects`,
        time: "Today",
        read: false,
      });
    }
    setNotifications(items);
  };

  const fetchPlatformStats = async () => {
    try {
      const allUsers = await searchAPI.searchUsers({});
      const projectsResponse = await fetch(`/api/projects`, {
        credentials: "include",
      });
      let totalProjects = 0;
      if (projectsResponse.ok) {
        const projects: ProjectResponse[] = await projectsResponse.json();
        totalProjects = projects.length;
      }
      setPlatformStats({
        activeMusicians: allUsers.length,
        activeProjects: totalProjects,
      });
    } catch (error) {
      console.error("Failed to fetch platform stats:", error);
    }
  };

  const fetchDiscoverableMusicians = async (
    currentUserId: number,
    userInstruments: string[],
    userGenres: string[],
  ) => {
    setLoadingMusicians(true);
    try {
      let allUsers: SearchResultUser[] = [];
      if (userInstruments.length > 0) {
        const instrumentResults = await searchAPI.searchUsers({
          instrument: userInstruments[0],
        });
        allUsers = [...instrumentResults];
      }
      if (userGenres.length > 0 && allUsers.length < 10) {
        const genreResults = await searchAPI.searchUsers({
          genre: userGenres[0],
        });
        const existingIds = new Set(allUsers.map((u) => u.id));
        genreResults.forEach((user) => {
          if (!existingIds.has(user.id)) allUsers.push(user);
        });
      }
      if (allUsers.length < 5) {
        const generalResults = await searchAPI.searchUsers({});
        const existingIds = new Set(allUsers.map((u) => u.id));
        generalResults.forEach((user) => {
          if (!existingIds.has(user.id)) allUsers.push(user);
        });
      }
      setSuggestedMusicians(
        allUsers.filter((m) => m.id !== currentUserId).slice(0, 6),
      );
    } catch (error) {
      setSuggestedMusicians([]);
    } finally {
      setLoadingMusicians(false);
    }
  };

  const handleViewCalendar = () => {
    const events = departmentAnnouncements.filter((a: any) => a.eventDate);
    setCalendarAnnouncements(events);
    setShowCalendarModal(true);
  };

  const fetchUserProjects = async (userId: number) => {
    setLoadingProjects(true);
    try {
      const response = await fetch(`/api/projects?founderId=${userId}`, {
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(`Failed to fetch projects: ${response.status}`);
      setUserProjects(await response.json());
    } catch (error) {
      setUserProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    window.location.href = "/";
  };
  const handleViewProfile = () => {
    if (user?.id) navigate(`/profile/${user.id}`);
  };
  const handleGenerateFlyer = () => {
    setFlyerMessage("");
    setShowFlyerModal(true);
  };
  const handleManageAudio = () => {
    if (user?.id) navigate(`/create-profile?edit=true&userId=${user.id}#step4`);
  };
  const handleCopyProfileLink = () => {
    if (user?.id) {
      navigator.clipboard
        .writeText(`http://localhost/profile/${user.id}`)
        .then(() => alert("Profile link copied!"))
        .catch(() => {});
    }
  };
  const formatExperienceLevel = (level: string) =>
    level ? level.charAt(0) + level.slice(1).toLowerCase() : "Beginner";
  const calculateMatchPercentage = (musician: SearchResultUser): number =>
    musician.matchPercentage ?? Math.floor(Math.random() * 20) + 75;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src="/logo-full.png" alt="Resonance" className="h-10" />
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
            <div className="notification-area relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-800 rounded-full transition"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-800">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-lg">Notifications</h3>
                      <button
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((n) => ({ ...n, read: true })),
                          )
                        }
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        Mark all read
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            if (notification.link) navigate(notification.link);
                            setNotifications((prev) =>
                              prev.map((n) =>
                                n.id === notification.id
                                  ? { ...n, read: true }
                                  : n,
                              ),
                            );
                            setShowNotifications(false);
                          }}
                          className={`w-full text-left p-4 border-b border-gray-800/50 hover:bg-gray-800/50 transition flex items-start gap-3 ${!notification.read ? "bg-amber-900/10" : ""}`}
                        >
                          <div
                            className={`p-2 rounded-lg flex-shrink-0 ${notification.type === "new_user" ? "bg-blue-500/20" : notification.type === "new_project" ? "bg-green-500/20" : notification.type === "application" ? "bg-purple-500/20" : "bg-amber-500/20"}`}
                          >
                            {notification.type === "new_user" && (
                              <User className="h-4 w-4 text-blue-400" />
                            )}
                            {notification.type === "new_project" && (
                              <FolderOpen className="h-4 w-4 text-green-400" />
                            )}
                            {notification.type === "application" && (
                              <FileText className="h-4 w-4 text-purple-400" />
                            )}
                            {notification.type === "project_update" && (
                              <TrendingUp className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${!notification.read ? "font-medium text-white" : "text-gray-300"}`}
                            >
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-amber-500 rounded-full flex-shrink-0 mt-2"></div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No notifications yet
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-800 text-center">
                    <button
                      onClick={() => {
                        setNotifications([]);
                        setShowNotifications(false);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-400"
                    >
                      Clear all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center overflow-hidden">
                  {user && (
                    <img
                      src={profileAPI.getProfilePictureUrl(user.id)}
                      alt={userProfile.name}
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
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-gray-900/50 rounded-2xl p-6 mb-6 border border-gray-800">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center overflow-hidden">
                    {user ? (
                      <img
                        src={profileAPI.getProfilePictureUrl(user.id)}
                        alt={userProfile.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const icon = document.createElement("div");
                            icon.innerHTML =
                              '<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                            parent.appendChild(icon.firstChild!);
                          }
                        }}
                      />
                    ) : (
                      <User className="h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{userProfile.name}</h3>
                    <p className="text-amber-400 text-sm">Instruments:</p>
                    <p className="text-gray-300 text-sm">
                      {userProfile.instrument}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
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
                  <div className="bg-gray-800/50 p-3 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-4 w-4 text-amber-400" />
                      <p className="text-xs text-gray-400">Experience Level</p>
                    </div>
                    <p className="font-medium text-amber-300">
                      {formatExperienceLevel(userProfile.experienceLevel)}
                    </p>
                  </div>
                  {userProfile.genres.length > 0 && (
                    <div className="bg-gray-800/50 p-3 rounded-xl">
                      <p className="text-xs text-gray-400 mb-2">Genres</p>
                      <div className="flex flex-wrap gap-1">
                        {userProfile.genres.slice(0, 3).map((genre, idx) => (
                          <span
                            key={idx}
                            className="bg-amber-500/10 text-amber-300 px-2 py-1 rounded-full text-xs"
                          >
                            {genre}
                          </span>
                        ))}
                        {userProfile.genres.length > 3 && (
                          <span className="text-gray-400 text-xs">
                            +{userProfile.genres.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("discover")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === "discover" ? "bg-amber-600 text-white" : "hover:bg-gray-800"}`}
                >
                  <Search className="h-5 w-5" />
                  <span>Discover</span>
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === "projects" ? "bg-amber-600 text-white" : "hover:bg-gray-800"}`}
                >
                  <Users className="h-5 w-5" />
                  <span>My Projects</span>
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === "activity" ? "bg-amber-600 text-white" : "hover:bg-gray-800"}`}
                >
                  <Clock className="h-5 w-5" />
                  <span>Activity</span>
                </button>
                <button
                  onClick={() => setActiveTab("tools")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === "tools" ? "bg-amber-600 text-white" : "hover:bg-gray-800"}`}
                >
                  <FileText className="h-5 w-5" />
                  <span>Tools</span>
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === "settings" ? "bg-amber-600 text-white" : "hover:bg-gray-800"}`}
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
            <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 rounded-2xl p-8 mb-8 border border-amber-800/30">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Welcome back, {userProfile.name}!
                  </h1>
                  <p className="text-gray-300">
                    Ready to make some music? Check out your matches or create
                    your own project.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/create-project")}
                  className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition transform hover:scale-105"
                >
                  <Plus className="h-5 w-5" />
                  New Project
                </button>
              </div>
            </div>

            {activeTab === "discover" && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Discover Musicians</h2>
                  <div className="flex items-center gap-4">
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
                    {suggestedMusicians.map((musician) => (
                      <div
                        key={musician.id}
                        className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group cursor-pointer"
                        onClick={() => navigate(`/profile/${musician.id}`)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center overflow-hidden">
                              <img
                                src={profileAPI.getProfilePictureUrl(
                                  musician.id,
                                )}
                                alt={musician.displayName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const icon = document.createElement("div");
                                    icon.innerHTML =
                                      '<svg class="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                                    parent.appendChild(icon.firstChild!);
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">
                                {musician.displayName}
                              </h3>
                              <p className="text-amber-400 text-sm">
                                {musician.instruments?.join(", ") || "Musician"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm">
                            <TrendingUp className="h-3 w-3" />
                            {calculateMatchPercentage(musician)}% match
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
                          <div></div>
                        </div>
                      </div>
                    ))}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                    <FileText className="h-6 w-6 text-amber-400 mb-3" />
                    <h3 className="font-bold mb-2">Generate Flyer</h3>
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
                    <Calendar className="h-6 w-6 text-amber-400 mb-3" />
                    <h3 className="font-bold mb-2">Upcoming Events</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      No upcoming events scheduled
                    </p>
                    <button
                      onClick={handleViewCalendar}
                      className="w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-full font-medium transition"
                    >
                      View Calendar
                    </button>
                  </div>
                  <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                    <Volume2 className="h-6 w-6 text-amber-400 mb-3" />
                    <h3 className="font-bold mb-2">Audio Library</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Upload and manage your audio samples
                    </p>
                    <button
                      onClick={handleManageAudio}
                      className="w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-full font-medium transition"
                    >
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
                <DashboardActivity
                  userProjects={userProjects}
                  currentUserId={user?.id || 0}
                />
              </div>
            )}

            {activeTab === "tools" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                    <Download className="h-8 w-8 text-amber-400 mb-3" />
                    <h3 className="text-xl font-bold mb-2">Flyer Generator</h3>
                    <p className="text-gray-400 mb-6">
                      Create a printable PDF flyer of your profile to post
                      around campus.
                    </p>
                    <button
                      onClick={handleGenerateFlyer}
                      className="w-full bg-amber-600 hover:bg-amber-700 py-3 rounded-full font-semibold transition"
                    >
                      Generate PDF Flyer
                    </button>
                  </div>
                  <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                    <Share2 className="h-8 w-8 text-amber-400 mb-3" />
                    <h3 className="text-xl font-bold mb-2">Share Profile</h3>
                    <p className="text-gray-400 mb-6">
                      Share your profile link with other musicians or on social
                      media.
                    </p>
                    <button
                      onClick={handleCopyProfileLink}
                      className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-full font-medium transition"
                    >
                      Copy Profile Link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Settings</h2>
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h3 className="font-bold text-lg mb-6">Profile Settings</h3>
                  <button
                    onClick={() =>
                      user?.id &&
                      navigate(`/create-profile?edit=true&userId=${user.id}`)
                    }
                    className="w-full bg-amber-600 hover:bg-amber-700 py-3 rounded-full font-medium transition"
                  >
                    Edit Profile
                  </button>
                </div>
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h3 className="font-bold text-lg mb-6">Account Security</h3>
                  <button
                    onClick={() => navigate("/change-password")}
                    className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-full font-medium transition"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Department Announcements
                </h3>
                {departmentAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {departmentAnnouncements.map((a: any) => (
                      <div
                        key={a.id}
                        className="bg-gray-800/30 rounded-xl p-3 border border-gray-700 relative"
                      >
                        <h4 className="font-medium text-amber-400 text-sm pr-20">
                          {a.subject}
                        </h4>
                        <p className="text-gray-300 text-xs mt-1">
                          {a.content}
                        </p>
                        {a.link && (
                          <a
                            href={a.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-3 right-3 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-full transition"
                          >
                            More Info →
                          </a>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          {a.eventDate
                            ? new Date(
                                a.eventDate + "T12:00:00",
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : new Date(a.date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
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
                </div>
              </div>
              <div className="bg-amber-900/10 rounded-2xl p-6 border border-amber-800/30">
                <h3 className="font-bold text-lg mb-3">Need Help?</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Contact the UNCP Music Department for support or questions
                  about the platform.
                </p>
                <a href="mailto:music@uncp.edu">
                  <button className="w-full bg-amber-600 hover:bg-amber-700 py-2 rounded-full font-medium transition">
                    Get Support
                  </button>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Flyer Generator Modal */}
      {showFlyerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-lg w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Generate Flyer</h2>
              <button
                onClick={() => setShowFlyerModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Add a custom message to your flyer to attract other musicians:
            </p>
            <div className="mb-6">
              <input
                type="text"
                value={flyerMessage}
                onChange={(e) => setFlyerMessage(e.target.value)}
                placeholder='e.g., "Looking for a guitarist!" or "Available for jazz ensembles"'
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {flyerMessage.length}/100
              </p>
            </div>
            <div
              className="bg-white text-black rounded-xl p-8 mb-6 flyer-content print-area"
              id="flyer-content"
              style={{ minHeight: "500px" }}
            >
              <div className="text-center border-b-2 border-amber-500 pb-6 mb-6">
                <h2 className="text-3xl font-bold text-amber-600">Resonance</h2>
                <p className="text-base text-gray-500">
                  UNCP Music Collaboration Platform
                </p>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-full bg-amber-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user && (
                    <img
                      src={
                        profileAPI.getProfilePictureUrl(user.id) +
                        "?t=" +
                        Date.now()
                      }
                      alt={userProfile.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{userProfile.name}</h3>
                  <p className="text-amber-600 text-base">
                    {userProfile.instrument}
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 font-semibold">
                    EXPERIENCE
                  </p>
                  <p className="text-lg">
                    {formatExperienceLevel(userProfile.experienceLevel)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold">
                    INSTRUMENTS
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {userProfile.instrument.split(", ").map((inst, idx) => (
                      <span
                        key={idx}
                        className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm"
                      >
                        {inst}
                      </span>
                    ))}
                  </div>
                </div>
                {userProfile.genres.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">
                      GENRES
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {userProfile.genres.map((genre, idx) => (
                        <span
                          key={idx}
                          className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 font-semibold">EMAIL</p>
                  <p className="text-lg text-amber-600">{userProfile.email}</p>
                </div>
              </div>
              {flyerMessage && (
                <div className="bg-amber-100 border-2 border-amber-400 rounded-lg p-4 text-center mb-6">
                  <p className="text-amber-800 font-bold text-xl">
                    {flyerMessage}
                  </p>
                </div>
              )}
              <div className="text-center border-t border-gray-300 pt-6">
                <p className="text-base text-gray-500">
                  Find me on Resonance - UNCP's music collaboration platform
                </p>
                <p className="text-base text-amber-600 font-medium mt-2">
                  resonance.uncp.edu/profile/{user?.id}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFlyerModal(false)}
                className="flex-1 px-4 py-3 rounded-full border border-gray-700 hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const fc =
                    document.getElementById("flyer-content")?.innerHTML;
                  const pw = window.open("", "_blank");
                  if (pw && fc) {
                    pw.document.write(
                      `<html><head><title>Resonance Flyer - ${userProfile.name}</title><script src="https://cdn.tailwindcss.com"></script><style>@media print{body{margin:0;padding:20px;display:flex;align-items:center;justify-content:center;min-height:100vh}@page{size:letter;margin:.25in}.flyer-container{max-width:100%;width:100%}}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}.flyer-container{max-width:650px;width:100%}</style></head><body><div class="flyer-container">${fc}</div></body></html>`,
                    );
                    pw.document.close();
                    pw.focus();
                    setTimeout(() => {
                      pw.print();
                    }, 500);
                  }
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 px-4 py-3 rounded-full font-semibold transition flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Print Flyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6 text-amber-400" />
                Events Calendar
              </h2>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else setCurrentMonth(currentMonth - 1);
                }}
                className="p-2 hover:bg-gray-800 rounded-full transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-bold">
                {new Date(currentYear, currentMonth).toLocaleDateString(
                  "en-US",
                  { month: "long", year: "numeric" },
                )}
              </h3>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else setCurrentMonth(currentMonth + 1);
                }}
                className="p-2 hover:bg-gray-800 rounded-full transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs text-gray-500 font-medium py-1"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const daysInMonth = new Date(
                  currentYear,
                  currentMonth + 1,
                  0,
                ).getDate();
                const firstDayOfWeek = new Date(
                  currentYear,
                  currentMonth,
                  1,
                ).getDay();
                const days = [];
                for (let i = 0; i < firstDayOfWeek; i++) {
                  days.push(<div key={`empty-${i}`} className="h-10"></div>);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasEvent = calendarAnnouncements.some(
                    (a: any) => a.eventDate === dateStr,
                  );
                  const isToday =
                    new Date().toDateString() ===
                    new Date(currentYear, currentMonth, day).toDateString();
                  days.push(
                    <div
                      key={day}
                      className={`h-10 flex flex-col items-center justify-center rounded-lg text-sm relative cursor-default ${isToday ? "bg-amber-600/30 border border-amber-500/50" : ""} ${hasEvent ? "border border-amber-500 bg-amber-500/20" : ""}`}
                      title={
                        hasEvent
                          ? calendarAnnouncements
                              .filter((a: any) => a.eventDate === dateStr)
                              .map((a: any) => a.subject)
                              .join(", ")
                          : ""
                      }
                    >
                      <span
                        className={`${hasEvent ? "text-amber-300 font-bold" : "text-gray-300"} ${isToday ? "text-white" : ""}`}
                      >
                        {day}
                      </span>
                      {hasEvent && (
                        <span className="absolute bottom-1 w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                      )}
                    </div>,
                  );
                }
                return days;
              })()}
            </div>
            <div className="mt-6">
              <h4 className="font-semibold text-sm mb-3">Upcoming Events</h4>
              {calendarAnnouncements.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {calendarAnnouncements
                    .filter(
                      (a: any) =>
                        new Date(a.eventDate) >=
                        new Date(new Date().setHours(0, 0, 0, 0)),
                    )
                    .sort(
                      (a: any, b: any) =>
                        new Date(a.eventDate).getTime() -
                        new Date(b.eventDate).getTime(),
                    )
                    .slice(0, 5)
                    .map((a: any) => (
                      <div
                        key={a.id}
                        className="bg-gray-800/50 rounded-lg p-3 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-amber-400">
                            {a.subject}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(
                              a.eventDate + "T12:00:00",
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        {a.link && (
                          <a
                            href={a.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded-full transition"
                          >
                            Info
                          </a>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  No upcoming events
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCalendarModal(false)}
              className="w-full mt-4 bg-gray-800 hover:bg-gray-700 py-2 rounded-full font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

// Activity component for the Activity tab
const DashboardActivity = ({
  userProjects,
  currentUserId,
}: {
  userProjects: ProjectResponse[];
  currentUserId: number;
}) => {
  const [joinedProjects, setJoinedProjects] = useState<
    { project: ProjectResponse; role: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJoinedProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects`, {
          credentials: "include",
        });
        if (response.ok) {
          const allProjects: ProjectResponse[] = await response.json();
          const joined: { project: ProjectResponse; role: string }[] = [];
          allProjects.forEach((project) => {
            if (project.founderID === currentUserId) return;
            Object.entries(project.memberRoles || {}).forEach(
              ([roleName, member]) => {
                if (member && member.id === currentUserId)
                  joined.push({ project, role: roleName });
              },
            );
          });
          setJoinedProjects(joined);
        }
      } catch (error) {
        console.error("Failed to fetch joined projects:", error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUserId > 0) fetchJoinedProjects();
  }, [currentUserId]);

  const allActivities = [
    ...userProjects.map((p) => ({
      id: `created-${p.id}`,
      type: "created_project" as const,
      title: p.name,
      description: p.description,
      date: p.creationDate,
      status: p.status,
      memberCount: Object.values(p.memberRoles || {}).filter((m) => m !== null)
        .length,
      link: `/project/${p.id}`,
    })),
    ...joinedProjects.map((jp) => ({
      id: `joined-${jp.project.id}-${jp.role}`,
      type: "joined_project" as const,
      title: jp.project.name,
      description: jp.project.description,
      date: jp.project.creationDate,
      status: jp.project.status,
      role: jp.role,
      memberCount: Object.values(jp.project.memberRoles || {}).filter(
        (m) => m !== null,
      ).length,
      link: `/project/${jp.project.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  if (allActivities.length === 0)
    return (
      <div className="bg-gray-900/30 rounded-2xl p-12 text-center border border-gray-800">
        <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">No recent activity</h3>
        <p className="text-gray-400">
          Activity will appear here as you interact with other musicians
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      {allActivities.map((activity) => (
        <div
          key={activity.id}
          className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 hover:border-amber-500/30 transition cursor-pointer"
          onClick={() => navigate(activity.link)}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-2 rounded-lg flex-shrink-0 mt-1 ${activity.type === "created_project" ? "bg-green-500/20" : "bg-purple-500/20"}`}
            >
              {activity.type === "created_project" ? (
                <FolderOpen className="h-5 w-5 text-green-400" />
              ) : (
                <Users className="h-5 w-5 text-purple-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {activity.type === "created_project" ? (
                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                    Created
                  </span>
                ) : (
                  <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full">
                    Joined as {activity.role}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs capitalize ${activity.status === "active" ? "bg-green-900/30 text-green-400" : activity.status === "recruiting" ? "bg-blue-900/30 text-blue-400" : "bg-yellow-900/30 text-yellow-400"}`}
                >
                  {activity.status}
                </span>
              </div>
              <h3 className="font-bold text-lg text-amber-400">
                {activity.title}
              </h3>
              {activity.description && (
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {activity.memberCount} member
                  {activity.memberCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(activity.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
