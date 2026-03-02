import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

function ProfileCreation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [instruments, setInstruments] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/instruments")
      .then((res) => res.json())
      .then((data) => setInstruments(data))
      .catch((err) => console.error("Failed to fetch instruments:", err));

    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => setGenres(data))
      .catch((err) => console.error("Failed to fetch genres:", err));
  }, []);

  const [formData, setFormData] = useState({
    // Account fields
    email: "",
    password: "",
    confirmPassword: "",

    // Profile fields
    displayName: "",
    bio: "",
    instruments: [] as string[],
    genres: [] as string[],
    experienceLevel: "",
    availability: "",
    profilePicture: null as File | null, // profile picture
    audioSamples: [] as File[],
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
    const emailRegex = /^[^\s@]+@bravemail\.uncp\.edu$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return (
          validateEmail(formData.email) &&
          validatePassword(formData.password) &&
          formData.password === formData.confirmPassword
        );
      case 2:
        return (
          formData.displayName.trim() !== "" && formData.instruments.length > 0
        );
      case 3:
        return formData.genres.length >= 1 && formData.experienceLevel !== "";
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

    if (step === 1) {
      if (!formData.email) {
        errors.email = "Email is required";
      } else if (!validateEmail(formData.email)) {
        errors.email = "Must be a valid @bravemail.uncp.edu email";
      }

      if (!formData.password) {
        errors.password = "Password is required";
      } else if (!validatePassword(formData.password)) {
        errors.password =
          "Password must be at least 8 characters with uppercase, lowercase, and number";
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (step === 2) {
      if (formData.instruments.length === 0) {
        errors.instruments = "Please select at least one instrument";
      }
    }

    if (step === 3) {
      if (formData.genres.length === 0) {
        errors.genres = "Please select at least one genre";
      }
      if (!formData.experienceLevel) {
        errors.experienceLevel = "Please select your experience level";
      }
    }

    setFormErrors(errors);
    return Object.values(errors).every((error) => error === "");
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.audioSamples.length <= 3) {
      setFormData((prev) => ({
        ...prev,
        audioSamples: [...prev.audioSamples, ...files],
      }));
    }
  };

  const handleProfilePictureUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        profilePicture: file,
      }));
    }
  };

  const removeAudioSample = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      audioSamples: prev.audioSamples.filter((_, i) => i !== index),
    }));
  };

  const handleNextStep = () => {
    if (validateCurrentStep() && validateStep()) {
      setStep(step + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step !== 4) {
      return;
    }

    if (!validateStep()) {
      alert("Please complete all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalFormData = {
        accountInfo: {
          email: formData.email,
        },
        profileInfo: {
          displayName: formData.displayName,
          instruments: formData.instruments,
          genres: formData.genres,
          experienceLevel: formData.experienceLevel,
          bio: formData.bio,
          availability: formData.availability,
          hasProfilePicture: !!formData.profilePicture,
          audioSampleCount: formData.audioSamples.length,
        },
        submittedAt: new Date().toISOString(),
      };

      console.log("Submitting Profile Data:", finalFormData);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating profile:", error);
      alert("There was an error creating your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step !== 4) {
      e.preventDefault();
      if (validateStep()) {
        handleNextStep();
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  UNCP Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full bg-gray-900 border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500 ${
                      formErrors.email ? "border-red-500" : "border-gray-700"
                    }`}
                    placeholder="your.name@bravemail.uncp.edu"
                    required
                  />
                </div>
                {formErrors.email ? (
                  <p className="text-sm text-red-400 mt-1">
                    {formErrors.email}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">
                    Must use your UNCP @bravemail.uncp.edu email
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    className={`w-full bg-gray-900 border rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-amber-500 ${
                      formErrors.password ? "border-red-500" : "border-gray-700"
                    }`}
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

              <div>
                <label className="block text-sm font-medium mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    className={`w-full bg-gray-900 border rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-amber-500 ${
                      formErrors.confirmPassword
                        ? "border-red-500"
                        : "border-gray-700"
                    }`}
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                Display Name and Instruments
              </h3>
              <p className="text-gray-400">
                Set your display name and select all instruments that you play
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    handleInputChange("displayName", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                  placeholder="How other musicians will see you"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Instruments You Play *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select all that apply (at least one required)
                </p>
                <div className="flex flex-wrap gap-2">
                  {instruments.map((instr) => (
                    <button
                      key={instr}
                      type="button"
                      onClick={() => {
                        const updated = formData.instruments.includes(instr)
                          ? formData.instruments.filter((i) => i !== instr)
                          : [...formData.instruments, instr];
                        handleInputChange("instruments", updated);
                      }}
                      className={`px-4 py-2 rounded-full transition ${
                        formData.instruments.includes(instr)
                          ? "bg-amber-600 text-white"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">Musical Identity</h3>
              <p className="text-gray-400">Tell us about your musical style</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Favorite Genres *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select at least 1 genre that defines your style (up to 5)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => {
                        const updated = formData.genres.includes(genre)
                          ? formData.genres.filter((g) => g !== genre)
                          : formData.genres.length < 5
                            ? [...formData.genres, genre]
                            : formData.genres;
                        handleInputChange("genres", updated);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.genres.includes(genre)
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      <span className="font-medium">{genre}</span>
                    </button>
                  ))}
                </div>
                {formErrors.genres && (
                  <p className="text-sm text-red-400 mt-2">
                    {formErrors.genres}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Experience Level *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {experienceLevels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        handleInputChange("experienceLevel", level)
                      }
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.experienceLevel === level
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-gray-700 hover:border-gray-500"
                      }`}
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

              <div>
                <label className="block text-sm font-medium mb-2">
                  Musical Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-amber-500"
                  placeholder="Tell us about your musical journey, influences, and what you're looking for..."
                  maxLength={255}
                />
                <p className="text-sm text-gray-500 mt-2 text-right">
                  {formData.bio.length}/255
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">Showcase Your Talent</h3>
              <p className="text-gray-400">
                Add a profile picture and audio samples (optional but
                recommended)
              </p>
            </div>

            <div className="space-y-6">
              {/* Profile Picture Section */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Profile Picture
                </label>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
                      {formData.profilePicture ? (
                        <img
                          src={URL.createObjectURL(formData.profilePicture)}
                          alt="Profile preview"
                          className="h-full w-full object-cover"
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
                      Upload a profile photo
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, or GIF • Max 5MB • Square image recommended
                    </p>
                    <input
                      type="file"
                      id="profile-picture"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                    {formData.profilePicture && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            profilePicture: null,
                          }))
                        }
                        className="text-xs text-red-400 hover:text-red-300 mt-2"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audio Samples Section */}
              <div className="border-2 border-dashed border-gray-700 rounded-2xl p-8 text-center hover:border-amber-500 transition">
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/*"
                  multiple
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-semibold mb-2">
                    Upload Audio Samples
                  </h4>
                  <p className="text-gray-500 mb-4">
                    MP3, WAV, or M4A files • Max 3 files, 50MB each
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("audio-upload")?.click()
                    }
                    className="bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-full font-medium transition"
                  >
                    Choose Files
                  </button>
                </label>
              </div>

              {formData.audioSamples.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">
                    Uploaded Samples ({formData.audioSamples.length}/3)
                  </h4>
                  {formData.audioSamples.map((file, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-amber-500/20 p-3 rounded-lg">
                          <Headphones className="h-6 w-6 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAudioSample(index)}
                        className="text-gray-400 hover:text-red-400 p-2"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Availability
                </label>
                <textarea
                  value={formData.availability}
                  onChange={(e) =>
                    handleInputChange("availability", e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                  placeholder="e.g., 'Available for jam sessions on weekends', 'Looking for weekly rehearsals'"
                  rows={3}
                  maxLength={255}
                />
                <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                  <span>
                    Let others know when you're available to collaborate
                  </span>
                  <span>{formData.availability.length}/255</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

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
          onClick={() => navigate("/")}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to Home
        </button>
      </nav>

      {/* Progress Bar */}
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= s ? "bg-amber-600" : "bg-gray-800"
                  }`}
                >
                  {step > s ? (
                    <div className="w-4 h-4 bg-amber-200 rounded-full" />
                  ) : (
                    <span className="font-bold">{s}</span>
                  )}
                </div>
                {s < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step > s ? "bg-amber-600" : "bg-gray-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-amber-400">Step {step} of 4</div>
        </div>

        {/* Form Container */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-800">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              {step === 1
                ? "Create Your Account"
                : "Create Your Musician Profile"}
            </h1>
            <p className="text-gray-400">
              {step === 1
                ? "Start by setting up your account with UNCP credentials"
                : "Complete your profile to start collaborating with UNCP musicians"}
            </p>
          </div>

          <div>
            {renderStep()}

            <div className="flex justify-between mt-12 pt-8 border-t border-gray-800">
              {step > 1 ? (
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
                  onClick={handleNextStep}
                  className="bg-amber-600 hover:bg-amber-700 px-8 py-3 rounded-full font-semibold transition"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? "Completing Profile..." : "Complete Profile"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Preview */}
        <div className="mt-12 bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Preview
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <h4 className="font-semibold mb-2">Basic Info</h4>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center overflow-hidden">
                    {formData.profilePicture ? (
                      <img
                        src={URL.createObjectURL(formData.profilePicture)}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-amber-400 text-lg">
                      {formData.displayName || "Your Name"}
                    </p>
                  </div>
                </div>
                {formData.instruments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-400">Plays:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.instruments.map((inst) => (
                        <span
                          key={inst}
                          className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full text-xs"
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <h4 className="font-semibold mb-2">Genres & Experience</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                  {formData.genres.length > 3 && (
                    <span className="text-gray-400 text-sm">
                      +{formData.genres.length - 3} more
                    </span>
                  )}
                </div>
                <p className="text-gray-400">
                  {formData.experienceLevel || "Experience level"}
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Headphones className="h-5 w-5" />
                  Audio Samples
                </h4>
                {formData.audioSamples.length > 0 ? (
                  <div className="space-y-3">
                    {formData.audioSamples.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg"
                      >
                        <Volume2 className="h-4 w-4 text-amber-400" />
                        <span className="text-sm truncate flex-1">
                          {file.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No audio samples yet</p>
                )}
              </div>
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

export default ProfileCreation;
