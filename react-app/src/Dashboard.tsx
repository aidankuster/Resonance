import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("discover");
  const [userProfile] = useState({
    name: "Aidan Kuster",
    instrument: "Guitar & Piano",
    status: "Active",
    genre: "Jazz, Rock, Fusion",
    completion: 85,
    profileViews: 42,
    matches: 7,
  });

  const [recentActivity] = useState([
    {
      id: 1,
      user: "Maya Rodriguez",
      action: "viewed your profile",
      time: "2 hours ago",
      instrument: "Violin",
    },
    {
      id: 2,
      user: "Jordan Smith",
      action: "saved your profile",
      time: "1 day ago",
      instrument: "Drums",
    },
    {
      id: 3,
      user: "Taylor Kim",
      action: "contacted you",
      time: "2 days ago",
      instrument: "Saxophone",
    },
  ]);

  const [suggestedMusicians] = useState([
    {
      id: 1,
      name: "Jamie Lee",
      instrument: "Bass",
      genre: "Jazz, Funk",
      match: 92,
      status: "Available",
    },
    {
      id: 2,
      name: "Riley Patel",
      instrument: "Drums",
      genre: "Rock, Metal",
      match: 87,
      status: "Open to collab",
    },
    {
      id: 3,
      name: "Casey Jordan",
      instrument: "Vocals",
      genre: "R&B, Soul",
      match: 95,
      status: "Looking for band",
    },
    {
      id: 4,
      name: "Morgan Wells",
      instrument: "Saxophone",
      genre: "Jazz, Blues",
      match: 84,
      status: "Available",
    },
  ]);

  const [userProjects] = useState([
    {
      id: 1,
      title: "Jazz Fusion Quartet",
      role: "Guitarist",
      status: "Recruiting",
      members: 3,
      needed: ["Piano", "Drums"],
    },
    {
      id: 2,
      title: "Rock Band Project",
      role: "Founder",
      status: "Active",
      members: 4,
      needed: ["Bass"],
    },
    {
      id: 3,
      title: "Electronic Collaboration",
      role: "Producer",
      status: "Planning",
      members: 2,
      needed: ["Synth", "Vocals"],
    },
  ]);

  const [departmentAnnouncements] = useState([
    {
      id: 1,
      title: "Spring Ensemble Auditions",
      date: "Mar 15, 2026",
      type: "official",
      urgent: true,
    },
    {
      id: 2,
      title: "Recording Studio Hours Extended",
      date: "Ongoing",
      type: "info",
      urgent: false,
    },
    {
      id: 3,
      title: "Music Dept. Scholarship Deadline",
      date: "Apr 1, 2026",
      type: "deadline",
      urgent: true,
    },
  ]);

  const handleLogout = () => {
    // Should clear auth tokens here
    navigate("/");
  };

  const handleViewProfile = () => {
    // Navigate to user's profile page (to be implemented)
    // navigate('/profile/me');
    console.log("View profile clicked");
  };

  const handleGenerateFlyer = () => {
    // Implement flyer generation logic here
    console.log("Generate flyer clicked");
  };

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
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search musicians, projects, or ensembles..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500"
              />
            </div>
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
                    <p className="text-amber-400">{userProfile.instrument}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-400">
                        {userProfile.status}
                      </span>
                    </div>
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
                <button className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition">
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
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                      <Filter className="h-4 w-4" />
                      Filters
                    </button>
                    <div className="text-sm text-gray-400">
                      Showing 24 matches near you
                    </div>
                  </div>
                </div>

                {/* Suggested Musicians Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {suggestedMusicians.map((musician) => (
                    <div
                      key={musician.id}
                      className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-amber-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">
                              {musician.name}
                            </h3>
                            <p className="text-amber-400">
                              {musician.instrument}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm">
                          <TrendingUp className="h-3 w-3" />
                          {musician.match}% match
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {musician.genre.split(", ").map((g, idx) => (
                          <span
                            key={idx}
                            className="bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-sm"
                          >
                            {g}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {musician.status}
                        </span>
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-gray-800 rounded-full transition">
                            <Eye className="h-5 w-5" />
                          </button>
                          <button className="p-2 hover:bg-gray-800 rounded-full transition">
                            <Heart className="h-5 w-5" />
                          </button>
                          <button className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full text-sm font-medium transition">
                            Contact
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
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
                      3 music department events this week
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
                      Manage your uploaded audio samples
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
                  <button className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition">
                    <Plus className="h-5 w-5" />
                    New Project
                  </button>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userProjects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold">{project.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            project.status === "Active"
                              ? "bg-green-900/30 text-green-400"
                              : project.status === "Recruiting"
                                ? "bg-blue-900/30 text-blue-400"
                                : "bg-yellow-900/30 text-yellow-400"
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">
                            Your Role
                          </p>
                          <p className="font-medium text-amber-400">
                            {project.role}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-400 mb-2">
                            Currently Needed
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {project.needed.map((instrument, idx) => (
                              <span
                                key={idx}
                                className="bg-gray-800 px-3 py-1 rounded-full text-sm"
                              >
                                {instrument}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {project.members} members
                            </span>
                          </div>
                          <button className="text-amber-400 hover:text-amber-300 text-sm font-medium">
                            View Details{" "}
                            <ChevronRight className="h-4 w-4 inline" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Recent Activity</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Activity Feed */}
                  <div className="lg:col-span-2 space-y-6">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="h-12 w-12 bg-gray-800 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-semibold">{activity.user}</p>
                                <p className="text-gray-400">
                                  {activity.instrument}
                                </p>
                              </div>
                              <span className="text-sm text-gray-500">
                                {activity.time}
                              </span>
                            </div>
                            <p className="mt-2">
                              <span className="text-amber-400">
                                {activity.user}
                              </span>{" "}
                              {activity.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stats Sidebar */}
                  <div className="space-y-6">
                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4">Activity Summary</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Profile Views</span>
                          <span className="font-bold">42</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">
                            Saved Your Profile
                          </span>
                          <span className="font-bold">18</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Contacted You</span>
                          <span className="font-bold">7</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">You Contacted</span>
                          <span className="font-bold">12</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4">Top Genres Viewed</h3>
                      <div className="space-y-3">
                        {["Jazz", "Rock", "Fusion", "Classical"].map(
                          (genre, idx) => (
                            <div
                              key={genre}
                              className="flex justify-between items-center"
                            >
                              <span>{genre}</span>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${80 - idx * 15}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-400">
                                  {80 - idx * 15}%
                                </span>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tools" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Tools</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Flyer Generator */}
                  <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-amber-500/20 p-3 rounded-xl">
                        <Download className="h-8 w-8 text-amber-400" />
                      </div>
                      <h3 className="text-xl font-bold">Flyer Generator</h3>
                    </div>
                    <p className="text-gray-400 mb-6">
                      Create a printable PDF flyer of your profile to post
                      around campus. Perfect for bulletin boards and notice
                      areas.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Custom Message
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 'Looking for jazz drummer!'"
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <button
                        onClick={handleGenerateFlyer}
                        className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 py-3 rounded-full font-semibold transition"
                      >
                        Generate PDF Flyer
                      </button>
                    </div>
                  </div>

                  {/* Share Profile */}
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
                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-xl p-4">
                        <p className="text-sm text-gray-400 mb-2">
                          Your Profile Link
                        </p>
                        <div className="flex items-center justify-between">
                          <code className="text-amber-400 truncate">
                            https://resonance.uncp.edu/profile/aidan-kuster
                          </code>
                          <button className="text-amber-400 hover:text-amber-300">
                            Copy
                          </button>
                        </div>
                      </div>
                      <button className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-full font-medium transition">
                        Share on Social Media
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">Settings</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Profile Settings */}
                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold text-lg mb-6">
                        Profile Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Profile Visibility
                          </label>
                          <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500">
                            <option>Public - Anyone can find me</option>
                            <option>Private - Only I can see my profile</option>
                            <option>Limited - Only UNCP music students</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Notification Preferences
                          </label>
                          <div className="space-y-3">
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="rounded bg-gray-800"
                                defaultChecked
                              />
                              <span>Email notifications for new messages</span>
                            </label>
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="rounded bg-gray-800"
                                defaultChecked
                              />
                              <span>Profile view alerts</span>
                            </label>
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="rounded bg-gray-800"
                              />
                              <span>Weekly digest of new projects</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Settings */}
                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold text-lg mb-6">
                        Account Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            UNCP Email
                          </label>
                          <input
                            type="email"
                            value="aak012@bravemail.uncp.edu"
                            disabled
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-400"
                          />
                        </div>
                        <button className="text-red-400 hover:text-red-300 text-sm font-medium">
                          Request Account Deletion
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="space-y-6">
                    <div className="bg-red-900/10 rounded-2xl p-6 border border-red-800/30">
                      <h3 className="font-bold text-lg mb-4 text-red-400">
                        Danger Zone
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">
                        These actions cannot be undone.
                      </p>
                      <button className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 py-3 rounded-full font-medium transition">
                        Delete All Audio Uploads
                      </button>
                    </div>

                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                      <h3 className="font-bold text-lg mb-4">Export Data</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Download all your Resonance data.
                      </p>
                      <button className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-full font-medium transition">
                        Export My Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar - Announcements */}
          <aside className="w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Department Announcements */}
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Department Announcements
                </h3>
                <div className="space-y-4">
                  {departmentAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`p-4 rounded-xl border ${
                        announcement.urgent
                          ? "bg-red-900/10 border-red-800/30"
                          : "bg-gray-800/30 border-gray-700"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{announcement.title}</h4>
                        {announcement.urgent && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span className="capitalize">{announcement.type}</span>
                        <span>{announcement.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h3 className="font-bold text-lg mb-4">Platform Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Active Musicians</span>
                    <span className="font-bold">247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Active Projects</span>
                    <span className="font-bold">42</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">New This Week</span>
                    <span className="font-bold">18</span>
                  </div>
                  <div className="pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400">
                      You're in the top 15% of active users!
                    </p>
                  </div>
                </div>
              </div>

              {/* Help & Support */}
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
