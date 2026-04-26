import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import {
  Music,
  ChevronLeft,
  User,
  Mail,
  Calendar,
  FolderOpen,
  Volume2,
  Headphones,
  Award,
  FileText,
  Tag,
  Star,
  Share2,
  Flag,
  Users,
  TrendingUp,
  Camera,
  Play,
  Pause,
  Search,
  Bell,
} from "lucide-react";
import { profileAPI, audioAPI } from "../services/api";
import type { AudioFileResponse } from "../services/api";

interface UserProfileData {
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

function UserProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "projects" | "activity">(
    "about",
  );
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null,
  );

  // user projects
  const [userProjects, setUserProjects] = useState<ProjectData[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // similar musicians
  const [similarMusicians, setSimilarMusicians] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Audio samples state
  const [audioFiles, setAudioFiles] = useState<AudioFileResponse[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // reports
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // User profile data for nav bar
  const [navUserProfile, setNavUserProfile] = useState({
    name: "",
    instrument: "",
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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

  useEffect(() => {
    if (profile && currentUserProfile) {
      const items: NotificationItem[] = [];
      if (userProjects.length > 0) {
        items.push({
          id: "projects-count",
          type: "project_update",
          message: `You have ${userProjects.length} active project${userProjects.length !== 1 ? "s" : ""}`,
          link: "/dashboard",
          time: "Now",
          read: false,
        });
      }
      if (audioFiles.length > 0) {
        items.push({
          id: "audio-count",
          type: "project_update",
          message: `You have ${audioFiles.length} audio sample${audioFiles.length !== 1 ? "s" : ""} uploaded`,
          link: "/dashboard",
          time: "Now",
          read: false,
        });
      }
      setNotifications(items);
    }
  }, [userProjects, audioFiles]);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          setError("No user ID provided");
          return;
        }

        // First, load the profile being viewed (always public)
        const profileData = await profileAPI.getCurrentUserProfile(
          parseInt(id),
        );
        setProfile(profileData);

        // Load audio files for this user
        await loadAudioFiles(parseInt(id));
        // Load projects for this user
        await fetchUserProjects(parseInt(id));
        // Load similar musicians for this user
        await fetchSimilarMusicians(
          parseInt(id),
          profileData.instruments,
          profileData.genres,
        );

        // If user is authenticated, also load their own profile for nav bar
        if (isAuthenticated && user) {
          try {
            const currentUserData = await profileAPI.getCurrentUserProfile(
              user.id,
            );
            setCurrentUserProfile(currentUserData);
            setNavUserProfile({
              name: currentUserData.info.displayName,
              instrument:
                currentUserData.instruments &&
                currentUserData.instruments.length > 0
                  ? currentUserData.instruments.join(", ")
                  : "No instruments",
            });
          } catch (err) {
            console.error("Failed to load current user profile:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (err instanceof Error && err.message.includes("404")) {
          setError("Profile not found");
        } else {
          setError("Could not load user profile. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();

    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [id, isAuthenticated, user]);

  useEffect(() => {
    if (profile) {
      setProfilePictureUrl(
        `${profileAPI.getProfilePictureUrl(profile.id)}?t=${Date.now()}`,
      );
    }
  }, [profile]);

  const loadAudioFiles = async (userId: number) => {
    setLoadingAudio(true);
    try {
      if (isOwnProfile) {
        const files = await audioAPI.getUserAudioFiles();
        setAudioFiles(files);
      } else {
        try {
          const files = await audioAPI.getUserAudioFiles();
          setAudioFiles(files.filter((f: any) => f.uploaderId === userId));
        } catch {
          setAudioFiles([]);
        }
      }
    } catch (error) {
      console.error("Failed to load audio files:", error);
      setAudioFiles([]);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handlePlayAudio = (uuid: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (currentlyPlaying === uuid) {
      setCurrentlyPlaying(null);
      return;
    }

    const audioUrl = audioAPI.getAudioFileUrl(uuid);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setCurrentlyPlaying(null);
      audioRef.current = null;
    };

    audio.onerror = (e) => {
      console.error("Failed to load audio:", e);
      setCurrentlyPlaying(null);
      audioRef.current = null;
    };

    audio.play().catch((err) => {
      console.error("Failed to play audio:", err);
      setCurrentlyPlaying(null);
      audioRef.current = null;
    });

    setCurrentlyPlaying(uuid);
  };

  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      setUploadingPicture(true);
      await profileAPI.uploadProfilePicture(file);
      setProfilePictureUrl(
        `${profileAPI.getProfilePictureUrl(profile.id)}?t=${Date.now()}`,
      );
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setUploadingPicture(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim() || !profile) return;

    setReportSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("account_id", profile.id.toString());
      formData.append("reason", reportReason);

      const response = await fetch("/api/reports", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to submit report");

      alert("Report submitted successfully. An admin will review it.");
      setShowReportModal(false);
      setReportReason("");
    } catch (error) {
      console.error("Failed to submit report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const fetchUserProjects = async (userId: number) => {
    setLoadingProjects(true);
    try {
      const response = await fetch(`/api/projects?founderId=${userId}`, {
        credentials: "include",
      });

      if (!response.ok)
        throw new Error(`Failed to fetch projects: ${response.status}`);

      const projects: ProjectData[] = await response.json();
      setUserProjects(projects);
    } catch (error) {
      console.error("Failed to fetch user projects:", error);
      setUserProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return "text-green-400 bg-green-900/20";
      case "INTERMEDIATE":
        return "text-blue-400 bg-blue-900/20";
      case "ADVANCED":
        return "text-purple-400 bg-purple-900/20";
      case "PROFESSIONAL":
        return "text-amber-400 bg-amber-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  const fetchSimilarMusicians = async (
    userId: number,
    instruments: string[],
    genres: string[],
  ) => {
    setLoadingSimilar(true);
    try {
      let similar: any[] = [];

      if (instruments.length > 0) {
        const instrumentResults = await fetch(
          `/api/search?instrument=${encodeURIComponent(instruments[0])}&type=users`,
          { credentials: "include" },
        );
        if (instrumentResults.ok) {
          const data = await instrumentResults.json();
          similar = [...(data.users || [])];
        }
      }

      if (genres.length > 0 && similar.length < 5) {
        const genreResults = await fetch(
          `/api/search?genre=${encodeURIComponent(genres[0])}&type=users`,
          { credentials: "include" },
        );
        if (genreResults.ok) {
          const data = await genreResults.json();
          const existingIds = new Set(similar.map((u: any) => u.id));
          (data.users || []).forEach((user: any) => {
            if (!existingIds.has(user.id)) similar.push(user);
          });
        }
      }

      const filtered = similar.filter((u: any) => u.id !== userId).slice(0, 5);
      setSimilarMusicians(filtered);
    } catch (error) {
      console.error("Failed to fetch similar musicians:", error);
      setSimilarMusicians([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const formatExperienceLevel = (level: string) => {
    if (!level) return "Not specified";
    return level.charAt(0) + level.slice(1).toLowerCase();
  };

  const handleShareProfile = () => {
    if (!profile) return;
    const profileLink = `http://localhost/profile/${profile.id}`;
    navigator.clipboard
      .writeText(profileLink)
      .then(() => alert("Profile link copied to clipboard!"))
      .catch(() => alert("Failed to copy link: " + profileLink));
  };

  const getMessageLink = () => {
    if (!profile || !currentUserProfile) return "#";

    const senderName = currentUserProfile.info.displayName;
    const subject = `Resonance: Collaboration request from ${senderName}`;
    const senderInstruments = currentUserProfile.instruments?.length
      ? currentUserProfile.instruments.join(", ")
      : "Various instruments";
    const senderGenres = currentUserProfile.genres?.length
      ? currentUserProfile.genres.join(", ")
      : "Various genres";

    const body =
      `Hi ${profile.info.displayName},\n\n` +
      `I came across your profile on Resonance and I'm interested in potentially collaborating with you.\n\n` +
      `A bit about me:\n` +
      `• Instruments: ${senderInstruments}\n` +
      `• Genres: ${senderGenres}\n` +
      `• Experience: ${formatExperienceLevel(currentUserProfile.info.experienceLevel)}\n\n` +
      `I think we could create some great music together! Would you be interested in connecting to discuss further?\n\n` +
      `Looking forward to hearing from you,\n` +
      `${senderName}\n${currentUserProfile.emailAddress}\n\n` +
      `---\nSent via Resonance - UNCP Music Collaboration Platform`;

    return `mailto:${profile.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const isOwnProfile =
    currentUserProfile && profile && currentUserProfile.id === profile.id;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 rounded-2xl p-8 border border-red-800/30">
            <User className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
            <p className="text-gray-400 mb-6">
              {error || "This user profile doesn't exist or is private."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                placeholder="Search musicians, projects, or ensembles..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500"
              />
            </form>
          </div>

          {/* Right Side - Name/Instruments, Profile Picture */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="font-semibold">{navUserProfile.name}</p>
              <p className="text-sm text-gray-400">
                {navUserProfile.instrument}
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
                    alt={navUserProfile.name}
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

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 rounded-3xl p-8 mb-8 border border-amber-800/30">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center overflow-hidden">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt={profile.info.displayName}
                    className="h-full w-full object-cover"
                    onError={() => setProfilePictureUrl(null)}
                  />
                ) : (
                  <User className="h-16 w-16 text-white" />
                )}
              </div>
              {profile.enabled && (
                <div className="absolute bottom-2 right-2 h-4 w-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
              )}
              {isOwnProfile && (
                <label
                  htmlFor="profile-picture-upload"
                  className="absolute bottom-0 right-0 h-10 w-10 bg-amber-600 hover:bg-amber-700 rounded-full flex items-center justify-center cursor-pointer transition border-2 border-gray-900"
                >
                  {uploadingPicture ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                  <input
                    id="profile-picture-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                    disabled={uploadingPicture}
                  />
                </label>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">
                    {profile.info.displayName}
                  </h1>
                  <div className="flex flex-wrap gap-3 items-center">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getExperienceLevelColor(profile.info.experienceLevel)}`}
                    >
                      <Award className="h-4 w-4 inline mr-1" />
                      {formatExperienceLevel(profile.info.experienceLevel)}
                    </span>
                    {profile.info.availability && (
                      <span className="text-sm text-gray-400">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {profile.info.availability}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {isAuthenticated && !isOwnProfile ? (
                    <a
                      href={getMessageLink()}
                      className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium flex items-center gap-2 transition"
                    >
                      <Mail className="h-5 w-5" />
                      Message
                    </a>
                  ) : isAuthenticated && isOwnProfile ? (
                    <button
                      onClick={() =>
                        navigate(
                          `/create-profile?edit=true&userId=${profile.id}`,
                        )
                      }
                      className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium flex items-center gap-2 transition"
                    >
                      <User className="h-5 w-5" />
                      Edit Profile
                    </button>
                  ) : null}
                  {isAuthenticated && !isOwnProfile && (
                    <>
                      <button
                        onClick={handleShareProfile}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition"
                        title="Copy profile link"
                      >
                        <Share2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition"
                        title="Report user"
                      >
                        <Flag className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats*/}
              <div className="grid grid-cols-4 gap-4 mt-6 max-w-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {profile.instruments?.length || 0}
                  </p>
                  <p className="text-xs text-gray-400">Instruments</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {profile.genres?.length || 0}
                  </p>
                  <p className="text-xs text-gray-400">Genres</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {userProjects.length}
                  </p>
                  <p className="text-xs text-gray-400">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {audioFiles.length}
                  </p>
                  <p className="text-xs text-gray-400">Audio</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("about")}
            className={`px-6 py-3 font-medium transition relative ${activeTab === "about" ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-6 py-3 font-medium transition relative ${activeTab === "projects" ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-6 py-3 font-medium transition relative ${activeTab === "activity" ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400" : "text-gray-400 hover:text-white"}`}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "about" && (
              <>
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-4">About</h2>
                  <p className="text-gray-300 leading-relaxed">
                    {profile.info.bio || "This user hasn't added a bio yet."}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Music className="h-5 w-5 text-amber-400" />
                    Instruments
                  </h2>
                  {profile.instruments && profile.instruments.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {profile.instruments.map((instrument, idx) => (
                        <span
                          key={idx}
                          className="bg-amber-500/10 text-amber-300 px-4 py-2 rounded-full text-sm border border-amber-500/20"
                        >
                          {instrument}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      No instruments listed
                    </p>
                  )}
                </div>
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-amber-400" />
                    Genres
                  </h2>
                  {profile.genres && profile.genres.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {profile.genres.map((genre, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-500/10 text-blue-300 px-4 py-2 rounded-full text-sm border border-blue-500/20"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No genres listed</p>
                  )}
                </div>
              </>
            )}

            {activeTab === "projects" && (
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold mb-4">Projects</h2>
                {loadingProjects ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : userProjects.length > 0 ? (
                  <div className="space-y-4">
                    {userProjects.map((project) => {
                      const memberCount = Object.values(
                        project.memberRoles || {},
                      ).filter((m) => m !== null).length;
                      return (
                        <div
                          key={project.id}
                          className="bg-gray-800/30 rounded-xl p-4 border border-gray-700 hover:border-amber-500/30 transition cursor-pointer"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-bold">
                              {project.name}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs capitalize ${project.status === "active" ? "bg-green-900/30 text-green-400" : project.status === "recruiting" ? "bg-blue-900/30 text-blue-400" : "bg-yellow-900/30 text-yellow-400"}`}
                            >
                              {project.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                            {project.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {memberCount} member{memberCount !== 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(
                                project.creationDate,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No projects to display yet</p>
                    {isOwnProfile && (
                      <button
                        onClick={() => navigate("/create-project")}
                        className="mt-4 bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
                      >
                        Create Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                {userProjects.length > 0 || audioFiles.length > 0 ? (
                  <div className="space-y-3">
                    {userProjects.map((project) => (
                      <div
                        key={`project-${project.id}`}
                        className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-amber-500/30 transition cursor-pointer"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <div className="bg-green-500/20 p-2 rounded-lg flex-shrink-0 mt-1">
                          <FolderOpen className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            Created project{" "}
                            <span className="font-medium text-amber-400">
                              {project.name}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(project.creationDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs capitalize ${project.status === "active" ? "bg-green-900/30 text-green-400" : project.status === "recruiting" ? "bg-blue-900/30 text-blue-400" : "bg-yellow-900/30 text-yellow-400"}`}
                            >
                              {project.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {
                                Object.values(project.memberRoles || {}).filter(
                                  (m) => m !== null,
                                ).length
                              }{" "}
                              members
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {audioFiles.map((file) => (
                      <div
                        key={`audio-${file.uuid}`}
                        className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700"
                      >
                        <div className="bg-amber-500/20 p-2 rounded-lg flex-shrink-0 mt-1">
                          <Volume2 className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            Uploaded audio sample{" "}
                            <span className="font-medium text-amber-400">
                              {file.fileName}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(file.uploadDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAudio(file.uuid);
                            }}
                            className="mt-2 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                          >
                            {currentlyPlaying === file.uuid ? (
                              <>
                                <Pause className="h-3 w-3" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                Play sample
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Star className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No recent activity</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail className="h-5 w-5 text-amber-400" />
                  <a
                    href={`mailto:${profile.emailAddress}`}
                    className="hover:text-amber-400 transition"
                  >
                    {profile.emailAddress}
                  </a>
                </div>
                {profile.info.availability && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Calendar className="h-5 w-5 text-amber-400" />
                    <span>{profile.info.availability}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Headphones className="h-5 w-5 text-amber-400" />
                Audio Samples
                {audioFiles.length > 0 && (
                  <span className="text-xs bg-amber-600 px-2 py-0.5 rounded-full">
                    {audioFiles.length}
                  </span>
                )}
              </h3>
              {loadingAudio ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
                </div>
              ) : audioFiles.length > 0 ? (
                <div className="space-y-3">
                  {audioFiles.map((file) => (
                    <div
                      key={file.uuid}
                      className="bg-gray-800/30 rounded-xl p-3 border border-gray-700 hover:border-amber-500/30 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="bg-green-500/20 p-2 rounded-lg flex-shrink-0">
                            <Volume2 className="h-4 w-4 text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-medium truncate"
                              title={file.fileName}
                            >
                              {file.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(file.uploadDate)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePlayAudio(file.uuid)}
                          className={`ml-3 p-2 rounded-full transition flex-shrink-0 ${currentlyPlaying === file.uuid ? "bg-amber-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}
                          title={
                            currentlyPlaying === file.uuid ? "Pause" : "Play"
                          }
                        >
                          {currentlyPlaying === file.uuid ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Volume2 className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No audio samples yet</p>
                  {isOwnProfile && (
                    <button
                      onClick={() =>
                        navigate(
                          `/create-profile?edit=true&userId=${profile.id}`,
                        )
                      }
                      className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition"
                    >
                      Add audio samples to your profile
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4">Similar Musicians</h3>
              {loadingSimilar ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-amber-500"></div>
                </div>
              ) : similarMusicians.length > 0 ? (
                <div className="space-y-2">
                  {similarMusicians.map((musician: any) => (
                    <button
                      key={musician.id}
                      onClick={() => navigate(`/profile/${musician.id}`)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800/50 transition text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={profileAPI.getProfilePictureUrl(musician.id)}
                          alt={musician.displayName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {musician.displayName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {musician.instruments?.slice(0, 2).join(", ") ||
                            "Musician"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  No similar musicians found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && profile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-red-800/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-900/30 p-3 rounded-full">
                <Flag className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold">Report User</h2>
            </div>
            <p className="text-gray-400 mb-4">
              You are reporting{" "}
              <span className="font-semibold text-white">
                {profile.info.displayName}
              </span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Reason for report *
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 resize-none"
                placeholder="Describe why you're reporting this user..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {reportReason.length}/500
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                className="flex-1 px-4 py-3 rounded-full border border-gray-700 hover:bg-gray-800 transition"
                disabled={reportSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportReason.trim() || reportSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-full font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reportSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
