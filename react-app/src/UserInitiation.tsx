import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Music,
  LogIn,
  UserPlus,
  ChevronLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

function UserInitiation() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState({
    email: "",
    password: "",
  });

  const handleLoginChange = (field: string, value: string) => {
    setLoginData((prev) => ({ ...prev, [field]: value }));
    if (loginErrors[field as keyof typeof loginErrors]) {
      setLoginErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateLogin = () => {
    const errors = {
      email: "",
      password: "",
    };
    let isValid = true;

    if (!loginData.email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!loginData.email.endsWith("@bravemail.uncp.edu")) {
      errors.email = "Must use UNCP email";
      isValid = false;
    }

    if (!loginData.password) {
      errors.password = "Password is required";
      isValid = false;
    }

    setLoginErrors(errors);
    return isValid;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateLogin()) {
      // Should authenticate here
      console.log("Logging in with:", loginData);
      navigate("/dashboard");
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

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Welcome to <span className="text-amber-500">Resonance</span>
          </h1>
          <p className="text-xl text-gray-300">
            Join the UNCP music community or log in to continue your musical
            journey
          </p>
        </div>

        {!showLogin ? (
          /* Option Cards - Initial View */
          <div className="grid md:grid-cols-2 gap-8">
            {/* Login Card */}
            <div
              onClick={() => setShowLogin(true)}
              className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-800 hover:border-amber-500 cursor-pointer transition transform hover:scale-105 text-center group"
            >
              <div className="bg-amber-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-amber-500/30 transition">
                <LogIn className="h-10 w-10 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Log In</h2>
              <p className="text-gray-400 mb-6">
                Already have an account? Log in with your UNCP email
              </p>
              <div className="text-amber-400 font-medium">Continue →</div>
            </div>

            {/* Sign Up Card */}
            <div
              onClick={() => navigate("/create-profile")}
              className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 backdrop-blur-sm rounded-3xl p-8 border border-amber-800/30 hover:border-amber-500 cursor-pointer transition transform hover:scale-105 text-center group"
            >
              <div className="bg-amber-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-amber-500/30 transition">
                <UserPlus className="h-10 w-10 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Create Account</h2>
              <p className="text-gray-400 mb-6">
                New to Resonance? Set up your musician profile in minutes
              </p>
              <div className="text-amber-400 font-medium">Get Started →</div>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-800">
            <button
              onClick={() => setShowLogin(false)}
              className="text-gray-400 hover:text-white flex items-center gap-2 mb-8"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to options
            </button>

            <h2 className="text-3xl font-bold mb-2">Log In</h2>
            <p className="text-gray-400 mb-8">
              Enter your UNCP email and password to continue
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  UNCP Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => handleLoginChange("email", e.target.value)}
                    className={`w-full bg-gray-900 border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-amber-500 ${
                      loginErrors.email ? "border-red-500" : "border-gray-700"
                    }`}
                    placeholder="your.name@bravemail.uncp.edu"
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-sm text-red-400 mt-1">
                    {loginErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) =>
                      handleLoginChange("password", e.target.value)
                    }
                    className={`w-full bg-gray-900 border rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-amber-500 ${
                      loginErrors.password
                        ? "border-red-500"
                        : "border-gray-700"
                    }`}
                    placeholder="Enter your password"
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
                {loginErrors.password && (
                  <p className="text-sm text-red-400 mt-1">
                    {loginErrors.password}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 py-4 rounded-xl font-bold text-lg transition transform hover:scale-105"
                >
                  Log In
                </button>
              </div>

              <div className="text-center mt-6">
                <span className="text-gray-400">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => navigate("/create-profile")}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  Sign up here
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-sm mt-12">
          By continuing, you agree to Resonance's Terms of Service and Privacy
          Policy
        </p>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-800 py-8">
        <div className="container mx-auto px-6 text-center text-amber-400">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Music className="h-6 w-6 text-amber-500" />
              <span className="text-xl font-bold">Resonance</span>
            </div>
            <div className="text-sm">© 2026 Resonance Team</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default UserInitiation;
