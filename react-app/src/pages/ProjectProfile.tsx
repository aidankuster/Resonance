import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import {
  Music,
  ChevronLeft,
  User,
  Users,
  Calendar,
  Mail,
  Heart,
  Share2,
  Flag,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  X,
  Guitar,
  Piano,
  Drum,
  Mic,
  Volume2,
} from "lucide-react";

interface ProjectRole {
  id: number;
  projectId: number;
  instrument: string;
  description: string;
  isFilled: boolean;
  filledByUserId?: number;
}

interface ProjectMember {
  userId: number;
  userName: string;
  role: string;
  joinedAt: string;
}

interface ProjectData {
  id: number;
  projectName: string;
  description: string;
  status: string;
  founderId: number;
  founderName: string;
  founderEmail: string;
  memberCount: number;
  roles: ProjectRole[];
  members?: ProjectMember[];
  createdAt: string;
}

function ProjectProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "applications"
  >("overview");
  const currentUserId = user?.id || null;

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          setError("No project ID provided");
          return;
        }

        console.log("Loading project with ID:", id);

        // Fetch project from backend
        const response = await fetch(`http://localhost:80/api/projects/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Project not found");
          }
          throw new Error(`Failed to load project: ${response.status}`);
        }

        const data = await response.json();
        console.log("Project data received:", data);
        setProject(data);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError(err instanceof Error ? err.message : "Could not load project");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id]);

  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "recruiting":
        return {
          label: "Recruiting",
          color: "text-blue-400",
          bgColor: "bg-blue-900/20",
          borderColor: "border-blue-800/30",
          icon: <Users className="h-5 w-5" />,
          description: "Actively looking for musicians to fill open roles",
        };
      case "planning":
        return {
          label: "Planning",
          color: "text-yellow-400",
          bgColor: "bg-yellow-900/20",
          borderColor: "border-yellow-800/30",
          icon: <Clock className="h-5 w-5" />,
          description: "Project is in planning phase. Roles are being defined.",
        };
      case "active":
        return {
          label: "Active",
          color: "text-green-400",
          bgColor: "bg-green-900/20",
          borderColor: "border-green-800/30",
          icon: <CheckCircle className="h-5 w-5" />,
          description: "Project is active and underway",
        };
      default:
        return {
          label: status || "Unknown",
          color: "text-gray-400",
          bgColor: "bg-gray-900/20",
          borderColor: "border-gray-800/30",
          icon: <AlertCircle className="h-5 w-5" />,
          description: "Project status unknown",
        };
    }
  };

  const getInstrumentIcon = (instrument: string) => {
    const lower = instrument.toLowerCase();
    if (lower.includes("piano")) return <Piano className="h-4 w-4" />;
    if (lower.includes("guitar")) return <Guitar className="h-4 w-4" />;
    if (lower.includes("drum")) return <Drum className="h-4 w-4" />;
    if (lower.includes("voice") || lower.includes("vocal"))
      return <Mic className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 rounded-2xl p-8 border border-red-800/30">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
            <p className="text-gray-400 mb-6">
              {error ||
                "The project you're looking for doesn't exist or has been removed."}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(project.status);
  const isFounder = currentUserId === project.founderId;
  const openRoles = project.roles?.filter((role) => !role.isFilled) || [];
  const filledRoles = project.roles?.filter((role) => role.isFilled) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Music className="h-8 w-8 text-amber-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
              Resonance
            </span>
          </div>
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
        {/* Project Header */}
        <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 rounded-3xl p-8 mb-8 border border-amber-800/30">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-4xl font-bold">{project.projectName}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}
                >
                  <span className="flex items-center gap-1">
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Created by {project.founderName}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created {formatDate(project.createdAt)}
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {project.memberCount} members
                </span>
              </div>

              <p className="text-gray-300 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {isFounder ? (
                <button className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium flex items-center gap-2 transition">
                  <Settings className="h-5 w-5" />
                  Manage Project
                </button>
              ) : (
                <a
                  href={`mailto:${project.founderEmail}`}
                  className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium flex items-center gap-2 transition"
                >
                  <Mail className="h-5 w-5" />
                  Contact Founder
                </a>
              )}
              <button className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition">
                <Heart className="h-5 w-5" />
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-full transition">
                <Flag className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Info Box */}
        <div
          className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-2xl p-4 mb-8 flex items-start gap-3`}
        >
          {statusInfo.icon}
          <div>
            <p className={`${statusInfo.color} font-medium`}>
              {statusInfo.label} Phase
            </p>
            <p className="text-gray-400 text-sm">{statusInfo.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-medium transition relative ${
              activeTab === "overview"
                ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-6 py-3 font-medium transition relative ${
              activeTab === "members"
                ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Members ({project.memberCount})
          </button>
          {project.status === "recruiting" && (
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-6 py-3 font-medium transition relative ${
                activeTab === "applications"
                  ? "text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Apply to Join
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "overview" && (
              <>
                {/* Open Roles */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-400" />
                    Open Roles
                  </h2>
                  {openRoles.length > 0 ? (
                    <div className="space-y-4">
                      {openRoles.map((role) => (
                        <div
                          key={role.id}
                          className="bg-gray-800/30 rounded-xl p-4 border border-gray-700 hover:border-amber-500/30 transition"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getInstrumentIcon(role.instrument)}
                              <h3 className="font-semibold text-lg">
                                {role.instrument}
                              </h3>
                            </div>
                            <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full">
                              Open
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">
                            {role.description}
                          </p>
                          <button
                            onClick={() => setActiveTab("applications")}
                            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full text-sm font-medium transition"
                          >
                            Apply Now
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      No open roles at the moment
                    </p>
                  )}
                </div>

                {/* Filled Roles */}
                {filledRoles.length > 0 && (
                  <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      Filled Roles
                    </h2>
                    <div className="space-y-3">
                      {filledRoles.map((role) => (
                        <div
                          key={role.id}
                          className="bg-gray-800/30 rounded-xl p-3 border border-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            {getInstrumentIcon(role.instrument)}
                            <span className="font-medium">
                              {role.instrument}
                            </span>
                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
                              Filled
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "members" && (
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  Team Members
                </h2>
                <div className="space-y-3">
                  {/* Founder */}
                  <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{project.founderName}</p>
                        <p className="text-sm text-amber-400">Founder</p>
                      </div>
                    </div>
                  </div>

                  {/* Other members would go here */}
                  <p className="text-gray-500 italic text-center py-4">
                    Member list will be populated as musicians join the project
                  </p>
                </div>
              </div>
            )}

            {activeTab === "applications" && (
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-amber-400" />
                  Apply to Join
                </h2>
                <p className="text-gray-400 mb-6">
                  Select a role you'd like to apply for. The project founder
                  will receive your application via email.
                </p>
                <div className="space-y-4">
                  {openRoles.map((role) => (
                    <div
                      key={role.id}
                      className="bg-gray-800/30 rounded-xl p-4 border border-gray-700 hover:border-amber-500/30 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getInstrumentIcon(role.instrument)}
                          <h3 className="font-semibold">{role.instrument}</h3>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">
                        {role.description}
                      </p>
                      <a
                        href={`mailto:${project.founderEmail}?subject=Application for ${project.projectName} - ${role.instrument}&body=Hi, I'm interested in the ${role.instrument} position for your project "${project.projectName}".%0D%0A%0D%0AHere's a bit about me:%0D%0A- I play: [your instruments]%0D%0A- My genres: [your genres]%0D%0A- My experience level: [your level]%0D%0A%0D%0ALooking forward to hearing from you!%0D%0A%0D%0ABest regards,%0D%0A[Your name]`}
                        className="block w-full bg-amber-600 hover:bg-amber-700 text-center px-4 py-2 rounded-full text-sm font-medium transition"
                      >
                        Apply for {role.instrument}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Stats */}
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4">Project Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Roles</span>
                  <span className="font-semibold">
                    {project.roles?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Filled Positions</span>
                  <span className="font-semibold text-green-400">
                    {filledRoles.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Open Positions</span>
                  <span className="font-semibold text-blue-400">
                    {openRoles.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Team Size</span>
                  <span className="font-semibold">{project.memberCount}</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail className="h-5 w-5 text-amber-400" />
                  <a
                    href={`mailto:${project.founderEmail}`}
                    className="hover:text-amber-400 transition"
                  >
                    Contact Project Founder
                  </a>
                </div>
              </div>
            </div>

            {/* Similar Projects */}
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4">Similar Projects</h3>
              <p className="text-sm text-gray-500">
                Based on instruments and genres
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
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

export default ProjectProfile;
