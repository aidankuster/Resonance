import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import {
  Music,
  ChevronLeft,
  User,
  Mail,
  Calendar,
  Heart,
  Volume2,
  Headphones,
  Award,
  Tag,
  Star,
  Share2,
  Flag,
  Users,
  Camera,
} from "lucide-react";
import { profileAPI } from "../services/api";

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

        // If user is authenticated, also load their own profile for comparison
        if (isAuthenticated && user) {
          try {
            const currentUserData = await profileAPI.getCurrentUserProfile(
              user.id,
            );
            setCurrentUserProfile(currentUserData);
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
  }, [id, isAuthenticated, user]);

  useEffect(() => {
    // Load profile picture whenever profile changes
    if (profile) {
      setProfilePictureUrl(
        `${profileAPI.getProfilePictureUrl(profile.id)}?t=${Date.now()}`,
      );
    }
  }, [profile]);

  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      setUploadingPicture(true);
      await profileAPI.uploadProfilePicture(file);

      // Reload profile picture with cache-busting timestamp
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

  const formatExperienceLevel = (level: string) => {
    if (!level) return "Not specified";
    return level.charAt(0) + level.slice(1).toLowerCase();
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
      `${senderName}\n` +
      `${currentUserProfile.emailAddress}\n\n` +
      `---\n` +
      `Sent via Resonance - UNCP Music Collaboration Platform`;

    return `mailto:${profile.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Check if this is the current user's own profile
  const isOwnProfile =
    currentUserProfile && profile && currentUserProfile.id === profile.id;

  // No redirects - show profile page for everyone
  // The Dashboard link is in the navigation, users can click there if they want

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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center space-x-3 hover:opacity-80 transition"
          >
            <Music className="h-8 w-8 text-amber-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
              Resonance
            </span>
          </Link>

          {/* Dashboard link for authenticated users */}
          {isAuthenticated && (
            <button
              onClick={() => navigate("/dashboard")}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Users className="h-5 w-5" />
              Dashboard
            </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white flex items-center gap-2"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </button>
        </div>
      </nav>

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
                      <button className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition">
                        <Heart className="h-5 w-5" />
                      </button>
                      <button className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition">
                        <Share2 className="h-5 w-5" />
                      </button>
                      <button className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition">
                        <Flag className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-6 max-w-md">
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
                  <p className="text-2xl font-bold text-amber-400">0</p>
                  <p className="text-xs text-gray-400">Projects</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("about")}
            className={`px-6 py-3 font-medium transition relative ${
              activeTab === "about"
                ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-6 py-3 font-medium transition relative ${
              activeTab === "projects"
                ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-6 py-3 font-medium transition relative ${
              activeTab === "activity"
                ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "about" && (
              <>
                {/* Bio */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-4">About</h2>
                  <p className="text-gray-300 leading-relaxed">
                    {profile.info.bio || "This user hasn't added a bio yet."}
                  </p>
                </div>

                {/* Instruments */}
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

                {/* Genres */}
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
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No projects to display yet</p>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                <div className="text-center py-12">
                  <Star className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No recent activity</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
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

            {/* Audio Samples (placeholder) */}
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Headphones className="h-5 w-5 text-amber-400" />
                Audio Samples
              </h3>
              <div className="text-center py-4">
                <Volume2 className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No audio samples yet</p>
              </div>
            </div>

            {/* Similar Musicians (placeholder) */}
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4">Similar Musicians</h3>
              <p className="text-sm text-gray-500">
                Based on instruments and genres
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
