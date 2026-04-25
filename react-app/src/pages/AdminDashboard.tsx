import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { profileAPI, authAPI } from "../services/api";
import {
  Music,
  User,
  Users,
  Trash2,
  AlertCircle,
  Shield,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Home,
  Flag,
  Megaphone,
} from "lucide-react";

interface UserData {
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

interface ProjectData {
  id: number;
  name: string;
  founderID: number;
  description: string;
  status: string;
  creationDate: string;
}

interface ReportData {
  id: number;
  reporterId: number;
  reportedId: number;
  reason: string;
  status: string;
  timestamp: string;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userProjects, setUserProjects] = useState<ProjectData[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    totalProjects: 0,
  });
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);
  const [filterAdmin, setFilterAdmin] = useState<boolean | null>(null);

  // Reports
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

  // Tabs
  const [activeAdminTab, setActiveAdminTab] = useState<
    "users" | "reports" | "announcements"
  >("users");

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        if (!isAuthenticated || !user) {
          navigate("/userinitiation");
          return;
        }

        const profileData = await profileAPI.getCurrentUserProfile(user.id);

        if (!profileData.admin) {
          navigate("/dashboard");
          return;
        }

        await loadAllData();
        await fetchReports();
        await fetchAnnouncements();
      } catch (error) {
        console.error("Failed to load admin data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminAndLoadData();
    }
  }, [navigate, isAuthenticated, user, authLoading]);

  const loadAllData = async () => {
    setError(null);

    try {
      const usersResponse = await fetch("/api/admin/users", {
        credentials: "include",
      });

      if (!usersResponse.ok)
        throw new Error(`Failed to fetch users: ${usersResponse.status}`);

      const usersData: UserData[] = await usersResponse.json();
      setUsers(usersData);
      setFilteredUsers(usersData);

      const activeUsers = usersData.filter((u) => u.enabled).length;
      const adminUsers = usersData.filter((u) => u.admin).length;

      const projectsResponse = await fetch("/api/projects", {
        credentials: "include",
      });

      let totalProjects = 0;
      if (projectsResponse.ok) {
        const projectsData: ProjectData[] = await projectsResponse.json();
        totalProjects = projectsData.length;
      }

      setStats({
        totalUsers: usersData.length,
        activeUsers,
        adminUsers,
        totalProjects,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load data.");
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const response = await fetch("/api/reports", { credentials: "include" });
      if (response.ok) setReports(await response.json());
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements", { credentials: "include" });
      if (res.ok) setAnnouncements(await res.json());
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementSubject.trim() || !announcementContent.trim()) return;
    const fd = new FormData();
    fd.append("subject", announcementSubject);
    fd.append("content", announcementContent);
    fd.append("link", announcementLink);
    fd.append("eventDate", announcementEventDate);
    await fetch("/api/announcements", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    setAnnouncementSubject("");
    setAnnouncementContent("");
    setAnnouncementLink("");
    setAnnouncementEventDate("");
    await fetchAnnouncements();
  };

  const handleDeleteAnnouncement = async (id: number) => {
    await fetch(`/api/announcements/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await fetchAnnouncements();
  };

  const [announcementEventDate, setAnnouncementEventDate] = useState("");

  const handleUpdateReportStatus = async (reportId: number, status: string) => {
    try {
      const formData = new FormData();
      formData.append("status", status);
      await fetch(`/api/reports/${reportId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      await fetchReports();
    } catch (error) {
      console.error("Failed to update report:", error);
    }
  };

  const [announcementLink, setAnnouncementLink] = useState("");

  const handleViewReportedUser = async (reportedId: number) => {
    const reportedUser = users.find((u) => u.id === reportedId);
    if (reportedUser) {
      setActiveAdminTab("users");
      setSelectedUser(reportedUser);
      await loadUserProjects(reportedUser.id);
    }
  };

  const loadUserProjects = async (userId: number) => {
    try {
      const response = await fetch(`/api/projects?founderId=${userId}`, {
        credentials: "include",
      });
      if (response.ok) setUserProjects(await response.json());
      else setUserProjects([]);
    } catch (error) {
      setUserProjects([]);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, filterEnabled, filterAdmin);
  };

  const applyFilters = (
    query: string,
    enabled: boolean | null,
    admin: boolean | null,
  ) => {
    let filtered = [...users];
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.info.displayName?.toLowerCase().includes(lowerQuery) ||
          user.emailAddress.toLowerCase().includes(lowerQuery) ||
          user.instruments.some((i) => i.toLowerCase().includes(lowerQuery)) ||
          user.genres.some((g) => g.toLowerCase().includes(lowerQuery)),
      );
    }
    if (enabled !== null)
      filtered = filtered.filter((user) => user.enabled === enabled);
    if (admin !== null)
      filtered = filtered.filter((user) => user.admin === admin);
    setFilteredUsers(filtered);
  };

  const handleFilterEnabled = (enabled: boolean | null) => {
    setFilterEnabled(enabled);
    applyFilters(searchQuery, enabled, filterAdmin);
  };
  const handleFilterAdmin = (admin: boolean | null) => {
    setFilterAdmin(admin);
    applyFilters(searchQuery, filterEnabled, admin);
  };
  const handleSelectUser = async (user: UserData) => {
    setSelectedUser(user);
    await loadUserProjects(user.id);
  };
  const handleDeleteClick = (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setFilteredUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
        setUserProjects([]);
      }
      setStats((prev) => ({
        ...prev,
        totalUsers: prev.totalUsers - 1,
        activeUsers: userToDelete.enabled
          ? prev.activeUsers - 1
          : prev.activeUsers,
        adminUsers: userToDelete.admin ? prev.adminUsers - 1 : prev.adminUsers,
      }));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleUserStatus = async (user: UserData) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to toggle user status");
      const updatedUser = await response.json();
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
      setFilteredUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updatedUser : u)),
      );
      if (selectedUser?.id === user.id) setSelectedUser(updatedUser);
      setStats((prev) => ({
        ...prev,
        activeUsers: updatedUser.enabled
          ? prev.activeUsers + 1
          : prev.activeUsers - 1,
      }));
    } catch (error) {
      alert("Failed to update user status");
    }
  };

  const pendingReportsCount = reports.filter(
    (r) => r.status === "PENDING",
  ).length;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 rounded-2xl p-8 border border-red-800/30">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={loadAllData}
                className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-full font-medium transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white">
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            to="/dashboard"
            className="flex items-center hover:opacity-80 transition"
          >
            <img src="/logo-full.png" alt="Resonance" className="h-10" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-sm border border-purple-800/30 flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Admin Mode
            </span>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Home className="h-5 w-5" />
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveAdminTab("users")}
            className={`px-6 py-3 font-medium transition relative ${activeAdminTab === "users" ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveAdminTab("reports")}
            className={`px-6 py-3 font-medium transition relative ${activeAdminTab === "reports" ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            Reports{" "}
            {pendingReportsCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingReportsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveAdminTab("announcements")}
            className={`px-6 py-3 font-medium transition relative ${activeAdminTab === "announcements" ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            <Megaphone className="h-4 w-4 inline mr-1" />
            Announcements
          </button>
        </div>

        {/* Users Tab */}
        {activeAdminTab === "users" && (
          <div className="flex gap-8">
            <aside className="w-96 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-400" />
                    Platform Overview
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-amber-400">
                        {stats.totalUsers}
                      </p>
                      <p className="text-xs text-gray-400">Total Users</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {stats.activeUsers}
                      </p>
                      <p className="text-xs text-gray-400">Active Users</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-purple-400">
                        {stats.adminUsers}
                      </p>
                      <p className="text-xs text-gray-400">Admins</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {stats.totalProjects}
                      </p>
                      <p className="text-xs text-gray-400">Projects</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search users..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={
                        filterEnabled === null ? "" : filterEnabled.toString()
                      }
                      onChange={(e) =>
                        handleFilterEnabled(
                          e.target.value === ""
                            ? null
                            : e.target.value === "true",
                        )
                      }
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </select>
                    <select
                      value={filterAdmin === null ? "" : filterAdmin.toString()}
                      onChange={(e) =>
                        handleFilterAdmin(
                          e.target.value === ""
                            ? null
                            : e.target.value === "true",
                        )
                      }
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All Roles</option>
                      <option value="true">Admins</option>
                      <option value="false">Users</option>
                    </select>
                    <button
                      onClick={loadAllData}
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                      title="Refresh"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <p className="text-sm text-gray-400">
                      Showing {filteredUsers.length} of {users.length} users
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No users found
                      </p>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          className={`w-full p-4 text-left hover:bg-gray-800/50 transition border-b border-gray-800 last:border-b-0 ${selectedUser?.id === u.id ? "bg-amber-900/30 border-l-4 border-l-amber-500" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-amber-400" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {u.info.displayName || "Unnamed User"}
                                </p>
                                <p className="text-xs text-gray-400 truncate max-w-48">
                                  {u.emailAddress}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {u.admin && (
                                <Shield className="h-4 w-4 text-purple-400" />
                              )}
                              {u.enabled ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-400" />
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </aside>
            <main className="flex-1">
              {selectedUser ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-900/20 to-amber-900/20 rounded-2xl p-6 border border-purple-800/30">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center">
                          <User className="h-8 w-8" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">
                            {selectedUser.info.displayName || "Unnamed User"}
                          </h2>
                          <p className="text-gray-400">
                            {selectedUser.emailAddress}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleUserStatus(selectedUser)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedUser.enabled ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}
                        >
                          {selectedUser.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(selectedUser)}
                          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete User
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-amber-400" />
                        Profile Info
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-400">User ID</p>
                          <p className="font-mono">{selectedUser.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Status</p>
                          {selectedUser.enabled ? (
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Active
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1">
                              <XCircle className="h-4 w-4" />
                              Disabled
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Role</p>
                          {selectedUser.admin ? (
                            <span className="text-purple-400 flex items-center gap-1">
                              <Shield className="h-4 w-4" />
                              Administrator
                            </span>
                          ) : (
                            <span className="text-gray-400">Standard User</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">
                            Experience Level
                          </p>
                          <p className="capitalize">
                            {selectedUser.info.experienceLevel?.toLowerCase() ||
                              "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Availability</p>
                          <p>{selectedUser.info.availability || "Not set"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Music className="h-5 w-5 text-amber-400" />
                        Musical Profile
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-400 mb-2">
                            Instruments
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedUser.instruments.length > 0 ? (
                              selectedUser.instruments.map((inst, idx) => (
                                <span
                                  key={idx}
                                  className="bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-xs"
                                >
                                  {inst}
                                </span>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">
                                No instruments listed
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Genres</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedUser.genres.length > 0 ? (
                              selectedUser.genres.map((genre, idx) => (
                                <span
                                  key={idx}
                                  className="bg-blue-500/10 text-blue-300 px-3 py-1 rounded-full text-xs"
                                >
                                  {genre}
                                </span>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">
                                No genres listed
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Bio</p>
                          <p className="text-sm">
                            {selectedUser.info.bio || "No bio provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-400" />
                      Projects ({userProjects.length})
                    </h3>
                    {userProjects.length > 0 ? (
                      <div className="space-y-3">
                        {userProjects.map((project) => (
                          <div
                            key={project.id}
                            className="bg-gray-800/30 rounded-xl p-4 border border-gray-700"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{project.name}</h4>
                                <p className="text-sm text-gray-400 mt-1">
                                  {project.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full capitalize ${project.status === "active" ? "bg-green-900/30 text-green-400" : project.status === "recruiting" ? "bg-blue-900/30 text-blue-400" : "bg-yellow-900/30 text-yellow-400"}`}
                                >
                                  {project.status}
                                </span>
                                <button
                                  onClick={() =>
                                    navigate(`/project/${project.id}`)
                                  }
                                  className="text-amber-400 hover:text-amber-300 text-sm"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No projects created
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900/30 rounded-2xl p-12 text-center border border-gray-800">
                  <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Select a User</h3>
                  <p className="text-gray-400">
                    Choose a user from the list to view their details and manage
                    their account
                  </p>
                </div>
              )}
            </main>
          </div>
        )}

        {/* Reports Tab */}
        {activeAdminTab === "reports" && (
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-400" />
              User Reports
            </h2>
            {loadingReports ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-gray-800/30 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${report.status === "PENDING" ? "bg-yellow-900/30 text-yellow-400" : report.status === "RESOLVED" ? "bg-green-900/30 text-green-400" : "bg-gray-900/30 text-gray-400"}`}
                          >
                            {report.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            Report #{report.id}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          {report.reason}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Reporter ID: {report.reporterId}</span>
                          <span>Reported ID: {report.reportedId}</span>
                          <span>
                            {new Date(report.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {report.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleViewReportedUser(report.reportedId)
                            }
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full text-xs"
                          >
                            View User
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateReportStatus(report.id, "RESOLVED")
                            }
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-full text-xs"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateReportStatus(report.id, "DISMISSED")
                            }
                            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded-full text-xs"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No reports</p>
            )}
          </div>
        )}

        {/* Announcements Tab */}
        {activeAdminTab === "announcements" && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-400" />
                Create Announcement
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={announcementSubject}
                  onChange={(e) => setAnnouncementSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                />
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  rows={4}
                  placeholder="Announcement content..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 resize-none"
                />
                <input
                  type="url"
                  value={announcementLink}
                  onChange={(e) => setAnnouncementLink(e.target.value)}
                  placeholder="Link (optional) - https://uncp.edu/event..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="date"
                  value={announcementEventDate}
                  onChange={(e) => setAnnouncementEventDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleCreateAnnouncement}
                  className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-semibold transition"
                >
                  Post Announcement
                </button>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">All Announcements</h2>
              {announcements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No announcements
                </p>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="bg-gray-800/30 rounded-xl p-4 border border-gray-700 mb-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-amber-400">
                          {a.subject}
                        </h3>
                        <p className="text-gray-300 text-sm mt-2">
                          {a.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(a.date).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md border border-red-800/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-900/30 p-3 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-red-400">
                Confirm Delete
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {userToDelete.info.displayName}
              </span>{" "}
              ({userToDelete.emailAddress})?
            </p>
            <p className="text-sm text-red-400 mb-6">
              This action cannot be undone. All user data will be permanently
              deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-3 rounded-full border border-gray-700 hover:bg-gray-800 transition"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-full font-medium transition flex items-center justify-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 border-t border-gray-800 py-8">
        <div className="container mx-auto px-6 text-center text-amber-400">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Music className="h-6 w-6 text-amber-500" />
              <span className="text-xl font-bold">Resonance</span>
            </div>
            <div className="text-sm">
              © 2026 Resonance Team • UNCP Music Department
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;
