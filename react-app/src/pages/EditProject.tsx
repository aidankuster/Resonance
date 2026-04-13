import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import {
  Music,
  ChevronLeft,
  Users,
  Plus,
  X,
  Trash2,
  Save,
  Info,
  AlertCircle,
  Loader,
} from "lucide-react";

interface ProjectRole {
  id: string;
  instrument: string;
  description: string;
  isFilled: boolean;
}

interface ProjectData {
  id: number;
  name: string;
  founderID: number;
  description: string;
  status: string;
  creationDate: string;
  memberRoles: {
    [roleName: string]: {
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
    } | null;
  };
}

function EditProject() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);

  const availableInstruments = [
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

  const [projectData, setProjectData] = useState({
    projectName: "",
    description: "",
    status: "planning" as "active" | "planning" | "recruiting",
  });

  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [newRole, setNewRole] = useState({
    instrument: "",
    description: "",
  });
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [formErrors, setFormErrors] = useState({
    projectName: "",
    description: "",
    roles: "",
  });

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          setError("No project ID provided");
          return;
        }

        if (!isAuthenticated || !user) {
          navigate("/userinitiation");
          return;
        }

        console.log("Loading project for editing, ID:", id);

        const response = await fetch(`/api/projects/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Project not found");
          }
          throw new Error(`Failed to load project: ${response.status}`);
        }

        const data: ProjectData = await response.json();

        // Check if current user is the founder
        if (data.founderID !== user.id) {
          setError("You don't have permission to edit this project");
          return;
        }

        setProject(data);

        // Populate form with existing data
        setProjectData({
          projectName: data.name,
          description: data.description,
          status: data.status.toLowerCase() as
            | "active"
            | "planning"
            | "recruiting",
        });

        // Convert memberRoles to roles array (excluding Founder and filled roles)
        const existingRoles: ProjectRole[] = [];
        Object.entries(data.memberRoles).forEach(([roleName, account]) => {
          if (roleName !== "Founder" && account === null) {
            existingRoles.push({
              id: `${roleName}-${Date.now()}-${Math.random()}`,
              instrument: roleName,
              description: `Looking for a ${roleName} player`,
              isFilled: false,
            });
          }
        });
        setRoles(existingRoles);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError(err instanceof Error ? err.message : "Could not load project");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, navigate, isAuthenticated, user]);

  // Get status-specific helper text and colors
  const getStatusInfo = () => {
    switch (projectData.status) {
      case "planning":
        return {
          color: "yellow",
          bgColor: "bg-yellow-900/20",
          borderColor: "border-yellow-800/30",
          textColor: "text-yellow-300",
          icon: <Info className="h-5 w-5 text-yellow-400" />,
          description:
            "Planning phase - roles are being defined. You can add roles later.",
        };
      case "recruiting":
        return {
          color: "blue",
          bgColor: "bg-blue-900/20",
          borderColor: "border-blue-800/30",
          textColor: "text-blue-300",
          icon: <Users className="h-5 w-5 text-blue-400" />,
          description:
            "Recruiting phase - actively looking for musicians to fill these roles.",
        };
      case "active":
        return {
          color: "green",
          bgColor: "bg-green-900/20",
          borderColor: "border-green-800/30",
          textColor: "text-green-300",
          icon: <Music className="h-5 w-5 text-green-400" />,
          description:
            "Active phase - project is underway with all roles filled.",
        };
    }
  };

  const statusInfo = getStatusInfo();

  const validateForm = () => {
    const errors = {
      projectName: "",
      description: "",
      roles: "",
    };
    let isValid = true;

    if (!projectData.projectName.trim()) {
      errors.projectName = "Project name is required";
      isValid = false;
    }

    if (!projectData.description.trim()) {
      errors.description = "Project description is required";
      isValid = false;
    }

    if (projectData.status !== "planning" && roles.length === 0) {
      errors.roles = "Add at least one role to recruit";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (
    field: string,
    value: string | "active" | "planning" | "recruiting",
  ) => {
    setProjectData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAddRole = () => {
    if (!newRole.instrument) {
      alert("Please select an instrument");
      return;
    }

    // Check if role already exists
    if (roles.some((r) => r.instrument === newRole.instrument)) {
      alert("This role already exists");
      return;
    }

    const role: ProjectRole = {
      id: Date.now().toString(),
      instrument: newRole.instrument,
      description:
        newRole.description || `Looking for a ${newRole.instrument} player`,
      isFilled: false,
    };

    setRoles([...roles, role]);
    setNewRole({ instrument: "", description: "" });
    setShowRoleForm(false);

    if (formErrors.roles) {
      setFormErrors((prev) => ({ ...prev, roles: "" }));
    }
  };

  const handleRemoveRole = (roleId: string) => {
    setRoles(roles.filter((r) => r.id !== roleId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!isAuthenticated || !user || !project) {
      alert("You must be logged in to edit a project");
      navigate("/userinitiation");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("projectName", projectData.projectName);
      formData.append("description", projectData.description);
      formData.append("status", projectData.status);

      if (projectData.status !== "planning" && roles.length > 0) {
        formData.append(
          "roles",
          JSON.stringify(
            roles.map((role) => ({
              instrument: role.instrument,
              description: role.description,
            })),
          ),
        );
      }

      console.log("Updating project...");

      const response = await fetch(
        `/api/projects/${project.id}`,
        {
          method: "PUT",
          body: formData,
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", response.status, errorText);
        throw new Error(
          `Failed to update project: ${response.status} - ${errorText}`,
        );
      }

      console.log("Project updated successfully");

      // Show success message
      alert("Project updated successfully!");

      // Navigate back to project page
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error("Error updating project:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update project. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (project) {
      navigate(`/project/${project.id}`);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-16 w-16 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
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
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Music className="h-8 w-8 text-amber-500" />
          <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Resonance
          </span>
        </div>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to Project
        </button>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-800">
          <h1 className="text-3xl font-bold mb-2">Edit Project</h1>
          <p className="text-gray-400 mb-8">
            Update your project details and roles
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-amber-400">
                Project Details
              </h2>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectData.projectName}
                  onChange={(e) =>
                    handleInputChange("projectName", e.target.value)
                  }
                  className={`w-full bg-gray-900 border rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 ${
                    formErrors.projectName
                      ? "border-red-500"
                      : "border-gray-700"
                  }`}
                  placeholder="e.g., Jazz Fusion Quartet"
                />
                {formErrors.projectName && (
                  <p className="text-sm text-red-400 mt-1">
                    {formErrors.projectName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  value={projectData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={4}
                  className={`w-full bg-gray-900 border rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 ${
                    formErrors.description
                      ? "border-red-500"
                      : "border-gray-700"
                  }`}
                  placeholder="Describe your project, musical style, goals, and what you're looking for..."
                />
                {formErrors.description && (
                  <p className="text-sm text-red-400 mt-1">
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={projectData.status}
                  onChange={(e) =>
                    handleInputChange(
                      "status",
                      e.target.value as "active" | "planning" | "recruiting",
                    )
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                >
                  <option value="recruiting">Recruiting</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                </select>
              </div>

              {/* Status Info Box */}
              <div
                className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-xl p-4 flex items-start gap-3`}
              >
                {statusInfo.icon}
                <div>
                  <p className={`${statusInfo.textColor} text-sm font-medium`}>
                    {projectData.status === "planning" && "Planning Phase"}
                    {projectData.status === "recruiting" && "Recruiting Phase"}
                    {projectData.status === "active" && "Active Phase"}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {statusInfo.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Roles Needed - Only show for recruiting/active */}
            {(projectData.status === "recruiting" ||
              projectData.status === "active") && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-amber-400">
                    Roles Needed *
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowRoleForm(true)}
                    className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Add Role
                  </button>
                </div>

                {formErrors.roles && (
                  <p className="text-sm text-red-400">{formErrors.roles}</p>
                )}

                {/* Role Form */}
                {showRoleForm && (
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Add New Role</h3>
                      <button
                        type="button"
                        onClick={() => setShowRoleForm(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Instrument
                        </label>
                        <select
                          value={newRole.instrument}
                          onChange={(e) =>
                            setNewRole({
                              ...newRole,
                              instrument: e.target.value,
                            })
                          }
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">Select an instrument</option>
                          {availableInstruments.map((instrument) => (
                            <option key={instrument} value={instrument}>
                              {instrument}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={newRole.description}
                          onChange={(e) =>
                            setNewRole({
                              ...newRole,
                              description: e.target.value,
                            })
                          }
                          placeholder="e.g., Looking for jazz piano experience"
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddRole}
                        className="w-full bg-amber-600 hover:bg-amber-700 py-3 rounded-xl font-medium transition"
                      >
                        Add to Project
                      </button>
                    </div>
                  </div>
                )}

                {/* Roles List */}
                {roles.length > 0 && (
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="bg-gray-800/30 rounded-xl p-4 border border-gray-700 flex justify-between items-start"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-amber-400">
                              {role.instrument}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                projectData.status === "active"
                                  ? "bg-green-900/30 text-green-400"
                                  : "bg-blue-900/30 text-blue-400"
                              }`}
                            >
                              {projectData.status === "active"
                                ? "Filled"
                                : "Open"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {role.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(role.id)}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {roles.length === 0 && !showRoleForm && (
                  <div className="text-center py-8 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
                    <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">
                      No roles added yet. Click "Add Role" to start recruiting.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Planning Phase Message */}
            {projectData.status === "planning" && (
              <div className="bg-yellow-900/10 rounded-2xl p-6 border border-yellow-800/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-yellow-300 mb-2">
                      Planning Phase
                    </h3>
                    <p className="text-gray-300 text-sm">
                      You're in the planning phase. You can update the project
                      now and add specific roles later once you've decided what
                      you need.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 rounded-full border border-gray-700 hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-8 py-3 rounded-full font-bold transition ${
                  isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-5 w-5 inline animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 inline mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
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

export default EditProject;
