import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import {
  Music,
  Upload,
  Trash2,
  ChevronLeft,
  User,
  Headphones,
  Volume2,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  genresAPI,
  instrumentsAPI,
  profileAPI,
  authAPI,
  audioAPI,
} from "../services/api";
import type { AudioFileResponse } from "../services/api";
import type { AccountFormData, ProfileFormData } from "../types/usertypes";
import type { Genre, Instrument } from "../types/apitypes";

function ProfileCreation() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isEditing = queryParams.get("edit") === "true";
  const editUserId = queryParams.get("userId");

  const { login } = useAuthContext();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [existingProfilePictureUrl, setExistingProfilePictureUrl] = useState<
    string | null
  >(null);
  const [existingAudioFiles, setExistingAudioFiles] = useState<
    AudioFileResponse[]
  >([]);
  const [audioFilesToDelete, setAudioFilesToDelete] = useState<string[]>([]);

  const [availableInstruments, setAvailableInstruments] = useState<
    Instrument[]
  >([]);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);

  const [accountData, setAccountData] = useState<AccountFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [profileData, setProfileData] = useState<ProfileFormData>({
    displayName: "",
    bio: "",
    instruments: [],
    genres: [],
    experienceLevel: "",
    availability: "",
    profilePicture: null,
    audioSamples: [],
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    instruments: "",
    genres: "",
    experienceLevel: "",
  });

  const experienceLevels = [
    "Beginner",
    "Intermediate",
    "Advanced",
    "Professional",
  ];

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@uncp\.edu$/;
    const emailRegex2 = /^[^\s@]+@bravemail\.uncp\.edu$/;
    return emailRegex.test(email) || emailRegex2.test(email);
  };

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (isEditingMode) return true;
        return (
          validateEmail(accountData.email) &&
          validatePassword(accountData.password) &&
          accountData.password === accountData.confirmPassword
        );
      case 2:
        return (
          profileData.displayName.trim() !== "" &&
          profileData.instruments.length > 0
        );
      case 3:
        return (
          profileData.genres.length >= 1 && profileData.experienceLevel !== ""
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const validateCurrentStep = () => {
    const errors = {
      email: "",
      password: "",
      confirmPassword: "",
      instruments: "",
      genres: "",
      experienceLevel: "",
    };

    if (step === 1 && !isEditingMode) {
      if (!accountData.email) {
        errors.email = "Email is required";
      } else if (!validateEmail(accountData.email)) {
        errors.email = "Must be a valid @bravemail.uncp.edu or @uncp.edu email";
      }

      if (!accountData.password) {
        errors.password = "Password is required";
      } else if (!validatePassword(accountData.password)) {
        errors.password =
          "Password must be at least 8 characters with uppercase, lowercase, and number";
      }

      if (!accountData.confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (accountData.password !== accountData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (step === 2) {
      if (profileData.instruments.length === 0) {
        errors.instruments = "Please select at least one instrument";
      }
    }

    if (step === 3) {
      if (profileData.genres.length === 0) {
        errors.genres = "Please select at least one genre";
      }
      if (!profileData.experienceLevel) {
        errors.experienceLevel = "Please select your experience level";
      }
    }

    setFormErrors(errors);
    return Object.values(errors).every((error) => error === "");
  };

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch genres from backend
        const genres = await genresAPI.getAll();
        setAvailableGenres(genres);

        // Fetch instruments from backend
        const instruments = await instrumentsAPI.getAll();
        setAvailableInstruments(instruments);

        // Check if we're in edit mode
        if (isEditing && editUserId) {
          const userIdNum = parseInt(editUserId);
          setUserId(userIdNum);
          setIsEditingMode(true);

          // Fetch existing profile data
          const profile = await profileAPI.getCurrentUserProfile(userIdNum);

          // Populate profile data with existing values
          setProfileData({
            displayName: profile.info.displayName || "",
            bio: profile.info.bio || "",
            instruments: profile.instruments || [],
            genres: profile.genres || [],
            experienceLevel: profile.info.experienceLevel?.toLowerCase() || "",
            availability: profile.info.availability || "",
            profilePicture: null,
            audioSamples: [],
          });

          // Load existing profile picture URL
          setExistingProfilePictureUrl(
            `${profileAPI.getProfilePictureUrl(userIdNum)}?t=${Date.now()}`,
          );

          // Load existing audio files
          try {
            const audioFiles = await audioAPI.getUserAudioFiles();
            setExistingAudioFiles(audioFiles);
          } catch (error) {
            console.error("Failed to load audio files:", error);
          }

          // Skip step 1 since user already has an account
          setStep(2);
        }

        setFetchError(null);
      } catch (error) {
        console.error("Failed to fetch data from backend:", error);
        setFetchError("Could not load data. Please try again later.");

        // Fallback to static data if backend is unavailable
        setAvailableGenres([
          "Classical",
          "Jazz",
          "Rock",
          "Pop",
          "Hip Hop",
          "R&B",
          "Electronic",
          "Folk",
          "Metal",
          "Blues",
          "Country",
          "Funk",
          "Soul",
          "Latin",
          "World",
          "Musical Theatre",
          "Film Score",
        ]);

        setAvailableInstruments([
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
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isEditing, editUserId]);

  const handleAccountChange = (field: string, value: string) => {
    setAccountData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleProfileChange = (
    field: string,
    value: string | string[] | File | null,
  ) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalExisting =
      existingAudioFiles.length + profileData.audioSamples.length;
    const availableSlots = 3 - totalExisting;

    if (files.length > availableSlots) {
      alert(
        `You can only upload ${availableSlots} more audio file(s). Maximum is 3 total.`,
      );
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("audio/")) {
        alert(`${file.name} is not an audio file`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 50MB.`);
        return;
      }
    }

    setProfileData((prev) => ({
      ...prev,
      audioSamples: [...prev.audioSamples, ...files],
    }));
  };

  const handleProfilePictureUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      setProfileData((prev) => ({
        ...prev,
        profilePicture: file,
      }));
    }
  };

  const removeAudioSample = (index: number) => {
    setProfileData((prev) => ({
      ...prev,
      audioSamples: prev.audioSamples.filter((_, i) => i !== index),
    }));
  };

  const removeExistingAudioFile = (uuid: string) => {
    setAudioFilesToDelete((prev) => [...prev, uuid]);
    setExistingAudioFiles((prev) => prev.filter((file) => file.uuid !== uuid));
  };

  const handleNextStep = () => {
    if (validateCurrentStep() && validateStep()) {
      setStep(step + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      const response = await authAPI.register(
        accountData.email,
        accountData.password,
        accountData.confirmPassword,
      );
      console.log("Account created successfully:", response);
      setUserId(response.id);
      setStep(step + 1);
    } catch (error: any) {
      console.error("Error creating account:", error);
      alert(
        error.message ||
          "There was an error creating your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async () => {
    const targetUserId = isEditingMode ? parseInt(editUserId!) : userId;

    if (!targetUserId) {
      alert("User ID not found. Please try again.");
      navigate("/userinitiation");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("display_name", profileData.displayName);
      formData.append("bio", profileData.bio || "");
      formData.append("availability", profileData.availability || "");
      formData.append(
        "experience_level",
        profileData.experienceLevel.toUpperCase(),
      );
      [...profileData.instruments, ...profileData.genres].forEach((tag) => {
        formData.append("tag", tag);
      });
      profileData.audioSamples.forEach((file) => {
        formData.append("audioSamples", file);
      });

      const response = await profileAPI.updateProfile(targetUserId, formData);
      console.log("Profile updated successfully:", response);

      if (!isEditingMode) {
        try {
          await login(accountData.email, accountData.password);
          console.log("Auto-login successful");
        } catch (loginError) {
          console.warn(
            "Auto-login failed, user can login manually:",
            loginError,
          );
        }
      }

      if (profileData.profilePicture) {
        try {
          await profileAPI.uploadProfilePicture(profileData.profilePicture);
          console.log("Profile picture uploaded successfully");
        } catch (picError: any) {
          console.error("Failed to upload profile picture:", picError);
          alert(
            `Profile saved, but profile picture upload failed: ${picError.message}. You can try uploading it again from your profile.`,
          );
        }
      }

      for (const uuid of audioFilesToDelete) {
        try {
          await audioAPI.deleteAudioFile(uuid);
          console.log(`Deleted audio file: ${uuid}`);
        } catch (error) {
          console.error(`Failed to delete audio file ${uuid}:`, error);
        }
      }

      for (const audioFile of profileData.audioSamples) {
        try {
          await audioAPI.uploadAudioFile(audioFile);
          console.log(`Uploaded audio file: ${audioFile.name}`);
        } catch (error: any) {
          console.error(
            `Failed to upload audio file ${audioFile.name}:`,
            error,
          );
          alert(`Some audio files failed to upload: ${error.message}`);
        }
      }

      navigate(`/profile/${targetUserId}`);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(
        error.message ||
          "There was an error updating your profile. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step !== 4) {
      e.preventDefault();
      if (validateStep()) {
        if (step === 1 && !isEditingMode) {
          handleRegister();
        } else {
          handleNextStep();
        }
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 rounded-2xl p-8 border border-red-800/30">
            <p className="text-red-400 mb-4">{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-full font-medium transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        if (isEditingMode) return null;
        return (
          <div>
            <div>
              <label className="block text-sm font-medium mb-2">
                UNCP Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={accountData.email}
                  onChange={(e) => handleAccountChange("email", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full bg-gray-900 border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500 ${formErrors.email ? "border-red-500" : "border-gray-700"}`}
                  placeholder="your.name@bravemail.uncp.edu"
                  required
                />
              </div>
              {formErrors.email ? (
                <p className="text-sm text-red-400 mt-1">{formErrors.email}</p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  Must use your UNCP @bravemail.uncp.edu or @uncp.edu email
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={accountData.password}
                  onChange={(e) =>
                    handleAccountChange("password", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  className={`w-full bg-gray-900 border rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-amber-500 ${formErrors.password ? "border-red-500" : "border-gray-700"}`}
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-400 mt-1">
                  {formErrors.password}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, and a
                number
              </p>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={accountData.confirmPassword}
                  onChange={(e) =>
                    handleAccountChange("confirmPassword", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  className={`w-full bg-gray-900 border rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-amber-500 ${formErrors.confirmPassword ? "border-red-500" : "border-gray-700"}`}
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-sm text-red-400 mt-1">
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h3 className="text-xl font-bold mb-4">
              Display Name and Instruments
            </h3>
            <p className="text-gray-400 mb-6">
              Set your display name and select all instruments that you play
            </p>

            <div>
              <label className="block text-sm font-medium mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) =>
                  handleProfileChange("displayName", e.target.value)
                }
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                placeholder="How other musicians will see you"
                required
              />
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                Instruments You Play *
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Select all that apply (at least one required)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableInstruments.map((instr) => (
                  <button
                    key={instr}
                    type="button"
                    onClick={() => {
                      const updated = profileData.instruments.includes(instr)
                        ? profileData.instruments.filter((i) => i !== instr)
                        : [...profileData.instruments, instr];
                      handleProfileChange("instruments", updated);
                    }}
                    className={`px-4 py-2 rounded-full transition ${profileData.instruments.includes(instr) ? "bg-amber-600 text-white" : "bg-gray-800 hover:bg-gray-700"}`}
                  >
                    {instr}
                  </button>
                ))}
              </div>
              {formErrors.instruments && (
                <p className="text-sm text-red-400 mt-2">
                  {formErrors.instruments}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h3 className="text-xl font-bold mb-4">Musical Identity</h3>
            <p className="text-gray-400 mb-6">
              Tell us about your musical style
            </p>

            <div>
              <label className="block text-sm font-medium mb-2">
                Favorite Genres *
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Select at least 1 genre that defines your style (up to 5)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      const updated = profileData.genres.includes(genre)
                        ? profileData.genres.filter((g) => g !== genre)
                        : profileData.genres.length < 5
                          ? [...profileData.genres, genre]
                          : profileData.genres;
                      handleProfileChange("genres", updated);
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-sm ${profileData.genres.includes(genre) ? "border-amber-500 bg-amber-500/10" : "border-gray-700 hover:border-gray-500"}`}
                  >
                    <span className="font-medium">{genre}</span>
                  </button>
                ))}
              </div>
              {formErrors.genres && (
                <p className="text-sm text-red-400 mt-2">{formErrors.genres}</p>
              )}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                Experience Level *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {experienceLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      handleProfileChange("experienceLevel", level)
                    }
                    className={`p-3 rounded-xl border-2 transition-all text-sm ${profileData.experienceLevel === level ? "border-amber-500 bg-amber-500/10" : "border-gray-700 hover:border-gray-500"}`}
                  >
                    <span className="font-medium">{level}</span>
                  </button>
                ))}
              </div>
              {formErrors.experienceLevel && (
                <p className="text-sm text-red-400 mt-2">
                  {formErrors.experienceLevel}
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                Musical Bio
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => handleProfileChange("bio", e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-amber-500 resize-none"
                placeholder="Tell us about your musical journey, influences, and what you're looking for..."
                maxLength={255}
              />
              <p className="text-sm text-gray-500 mt-2 text-right">
                {profileData.bio.length}/255
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h3 className="text-xl font-bold mb-4">Showcase Your Talent</h3>
            <p className="text-gray-400 mb-6">
              Add a profile picture and audio samples (optional but recommended)
            </p>

            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Profile Picture
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
                    {profileData.profilePicture ? (
                      <img
                        src={URL.createObjectURL(profileData.profilePicture)}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : existingProfilePictureUrl ? (
                      <img
                        src={existingProfilePictureUrl}
                        alt="Current profile"
                        className="h-full w-full object-cover"
                        onError={() => setExistingProfilePictureUrl(null)}
                      />
                    ) : (
                      <User className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("profile-picture")?.click()
                    }
                    className="absolute -bottom-2 -right-2 bg-amber-600 hover:bg-amber-700 rounded-full p-2 transition"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">
                    {existingProfilePictureUrl && !profileData.profilePicture
                      ? "Change profile photo"
                      : "Upload a profile photo"}
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, or GIF • Max 5MB
                  </p>
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                  {profileData.profilePicture && (
                    <button
                      type="button"
                      onClick={() =>
                        setProfileData((prev) => ({
                          ...prev,
                          profilePicture: null,
                        }))
                      }
                      className="text-xs text-red-400 hover:text-red-300 mt-2"
                    >
                      Remove new photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Audio Samples */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">
                Audio Samples (
                {existingAudioFiles.length + profileData.audioSamples.length}/3)
              </h4>

              {existingAudioFiles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {existingAudioFiles.map((file) => (
                    <div
                      key={file.uuid}
                      className="bg-gray-800 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-green-500/20 p-2 rounded-lg flex-shrink-0">
                          <Headphones className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded{" "}
                            {new Date(file.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                        <audio
                          controls
                          src={audioAPI.getAudioFileUrl(file.uuid)}
                          className="h-8 w-32"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingAudioFile(file.uuid)}
                        className="text-gray-400 hover:text-red-400 p-2 ml-2 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {profileData.audioSamples.length > 0 && (
                <div className="space-y-2 mb-4">
                  {profileData.audioSamples.map((file, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-500/20 p-2 rounded-lg">
                          <Headphones className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • New
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAudioSample(index)}
                        className="text-gray-400 hover:text-red-400 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {existingAudioFiles.length + profileData.audioSamples.length <
                3 && (
                <div className="border-2 border-dashed border-gray-700 rounded-2xl p-6 text-center hover:border-amber-500 transition">
                  <input
                    type="file"
                    id="audio-upload"
                    accept="audio/*"
                    multiple
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <h4 className="font-semibold mb-1">Upload Audio Samples</h4>
                    <p className="text-gray-500 text-sm mb-3">
                      MP3, WAV, or M4A • Max 3 total, 50MB each
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("audio-upload")?.click()
                      }
                      className="bg-gray-800 hover:bg-gray-700 px-5 py-2 rounded-full text-sm font-medium transition"
                    >
                      Choose Files
                    </button>
                  </label>
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                Availability
              </label>
              <textarea
                value={profileData.availability}
                onChange={(e) =>
                  handleProfileChange("availability", e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 resize-none"
                placeholder="e.g., 'Available for jam sessions on weekends'"
                rows={3}
                maxLength={255}
              />
              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                <span>Let others know when you're available</span>
                <span>{profileData.availability.length}/255</span>
              </div>
            </div>
          </div>
        );
    }
  };

  // Profile Preview Component (always visible on the right)
  const ProfilePreview = () => (
    <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800 sticky top-24">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <User className="h-5 w-5" />
        Profile Preview
      </h3>
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="font-semibold mb-3">Basic Info</h4>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profileData.profilePicture ? (
                <img
                  src={URL.createObjectURL(profileData.profilePicture)}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : existingProfilePictureUrl ? (
                <img
                  src={existingProfilePictureUrl}
                  alt="Current profile"
                  className="h-full w-full object-cover"
                  onError={() => setExistingProfilePictureUrl(null)}
                />
              ) : (
                <User className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-amber-400 text-lg font-medium">
                {profileData.displayName || "Your Name"}
              </p>
            </div>
          </div>
          {profileData.instruments.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Plays:</p>
              <div className="flex flex-wrap gap-1">
                {profileData.instruments.map((inst) => (
                  <span
                    key={inst}
                    className="bg-amber-500/10 text-amber-300 px-2 py-1 rounded-full text-xs"
                  >
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="font-semibold mb-2">Genres & Experience</h4>
          <div className="flex flex-wrap gap-1 mb-3">
            {profileData.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="bg-amber-500/10 text-amber-300 px-2 py-1 rounded-full text-xs"
              >
                {genre}
              </span>
            ))}
            {profileData.genres.length > 3 && (
              <span className="text-gray-400 text-xs">
                +{profileData.genres.length - 3} more
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {profileData.experienceLevel || "Experience level not set"}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Audio Samples
          </h4>
          {existingAudioFiles.length + profileData.audioSamples.length > 0 ? (
            <div className="space-y-2">
              {existingAudioFiles.map((file) => (
                <div
                  key={file.uuid}
                  className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg"
                >
                  <Volume2 className="h-3 w-3 text-green-400 flex-shrink-0" />
                  <span className="text-xs truncate">{file.fileName}</span>
                </div>
              ))}
              {profileData.audioSamples.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg"
                >
                  <Volume2 className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No audio samples yet</p>
          )}
        </div>
      </div>
    </div>
  );

  const pageTitle = isEditingMode
    ? "Edit Your Profile"
    : "Create Your Musician Profile";
  const pageSubtitle = isEditingMode
    ? "Update your information to keep your profile current"
    : "Complete your profile to start collaborating with UNCP musicians";
  const submitButtonText = isEditingMode ? "Save Changes" : "Complete Profile";

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
          onClick={() =>
            navigate(isEditingMode ? `/profile/${editUserId}` : "/")
          }
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </nav>

      <div className="container mx-auto px-6 max-w-6xl">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isEditingMode
              ? [2, 3, 4].map((actualStep, index) => {
                  const displayNumber = index + 1;
                  const isActive = step >= actualStep;
                  const isCompleted = step > actualStep;
                  return (
                    <div key={actualStep} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? "bg-amber-600" : "bg-gray-800"}`}
                      >
                        {isCompleted ? (
                          <div className="w-4 h-4 bg-amber-200 rounded-full" />
                        ) : (
                          <span className="font-bold">{displayNumber}</span>
                        )}
                      </div>
                      {actualStep < 4 && (
                        <div
                          className={`w-12 h-1 mx-2 ${isCompleted ? "bg-amber-600" : "bg-gray-800"}`}
                        />
                      )}
                    </div>
                  );
                })
              : [1, 2, 3, 4].map((s) => {
                  const isActive = step >= s;
                  const isCompleted = step > s;
                  return (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? "bg-amber-600" : "bg-gray-800"}`}
                      >
                        {isCompleted ? (
                          <div className="w-4 h-4 bg-amber-200 rounded-full" />
                        ) : (
                          <span className="font-bold">{s}</span>
                        )}
                      </div>
                      {s < 4 && (
                        <div
                          className={`w-12 h-1 mx-2 ${isCompleted ? "bg-amber-600" : "bg-gray-800"}`}
                        />
                      )}
                    </div>
                  );
                })}
          </div>
          <div className="text-amber-400">
            Step {isEditingMode ? step - 1 : step} of {isEditingMode ? 3 : 4}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-800">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">{pageTitle}</h1>
                <p className="text-gray-400">{pageSubtitle}</p>
              </div>

              <div>
                {renderStep()}

                <div className="flex justify-between mt-10 pt-6 border-t border-gray-800">
                  {(step > 1 && !isEditingMode) ||
                  (isEditingMode && step > 2) ? (
                    <button
                      type="button"
                      onClick={handlePreviousStep}
                      className="px-8 py-3 rounded-full border border-gray-700 hover:bg-gray-800 transition"
                    >
                      Previous
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={
                        step === 1 && !isEditingMode
                          ? handleRegister
                          : handleNextStep
                      }
                      disabled={isSubmitting}
                      className="bg-amber-600 hover:bg-amber-700 px-8 py-3 rounded-full font-semibold transition disabled:opacity-50"
                    >
                      {step === 1 && !isEditingMode
                        ? isSubmitting
                          ? "Creating Account..."
                          : "Continue"
                        : "Continue"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUpdateProfile}
                      disabled={isSubmitting}
                      className={`bg-amber-600 hover:bg-amber-700 px-8 py-3 rounded-full font-bold text-lg transition ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      {isSubmitting ? "Saving..." : submitButtonText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Preview */}
          <div className="lg:col-span-1">
            <ProfilePreview />
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

export default ProfileCreation;
