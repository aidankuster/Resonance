import { useState } from "react";
import { Music, Users, Calendar, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";

function App() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-black text-white">
      {/* Navigation - Styled like Dashboard */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo - Left */}
          <Link
            to="/"
            className="flex items-center space-x-3 hover:opacity-80 transition"
          >
            <Music className="h-8 w-8 text-amber-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
              Resonance
            </span>
          </Link>

          {/* Navigation Links - Center */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#how-it-works"
              className="text-gray-300 hover:text-amber-400 transition font-medium"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-gray-300 hover:text-amber-400 transition font-medium"
            >
              Discover
            </a>
            <a
              href="https://www.uncp.edu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-amber-400 transition font-medium"
            >
              UNCP
            </a>
            <a
              href="https://www.uncp.edu/academics/colleges-and-schools/college-of-arts-and-sciences/music/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-amber-400 transition font-medium"
            >
              Moore Hall
            </a>
          </div>

          {/* Auth Button - Right */}
          <Link to={isAuthenticated ? "/dashboard" : "/userinitiation"}>
            <button className="bg-amber-600 hover:bg-amber-700 px-6 py-2.5 rounded-full font-semibold transition">
              {isAuthenticated ? "Dashboard" : "Get Started"}
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Welcome to <span className="text-amber-500">Resonance</span>
        </h1>
        <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
          Connect with UNCP music students to form ensembles, collaborate on
          projects, and create unique & exciting musical experiences.
        </p>
        <Link to={isAuthenticated ? "/dashboard" : "/userinitiation"}>
          <button className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-10 py-4 rounded-full text-lg font-bold transition transform hover:scale-105 inline-flex items-center gap-2">
            Get Started <ChevronRight className="h-5 w-5" />
          </button>
        </Link>
      </section>

      {/* How It Works - Moved above Features */}
      <section id="how-it-works" className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-amber-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-amber-400">1</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Create Profile</h3>
            <p className="text-gray-400">
              Sign up with your UNCP email and showcase your musical talents
            </p>
          </div>
          <div className="text-center">
            <div className="bg-amber-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-amber-400">2</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Find Musicians</h3>
            <p className="text-gray-400">
              Search and discover other musicians that match your style
            </p>
          </div>
          <div className="text-center">
            <div className="bg-amber-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-amber-400">3</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Make Music</h3>
            <p className="text-gray-400">
              Form ensembles, collaborate, and create amazing music together
            </p>
          </div>
        </div>
      </section>

      {/* Features - Why Use Resonance? */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">
          Why Use Resonance?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 hover:bg-gray-800/70 transition border border-gray-800">
            <div className="bg-amber-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
              <Users className="h-7 w-7 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Verified Students</h3>
            <p className="text-gray-300">
              Connect exclusively with verified UNCP music students. Build your
              network and create new opportunities.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 hover:bg-gray-800/70 transition border border-gray-800">
            <div className="bg-amber-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
              <Calendar className="h-7 w-7 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Smart Matching</h3>
            <p className="text-gray-300">
              An algorithm that suggests perfect matches based on instrument,
              skill level, and genre preferences.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 hover:bg-gray-800/70 transition border border-gray-800">
            <div className="bg-amber-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
              <Music className="h-7 w-7 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Performance Ready</h3>
            <p className="text-gray-300">
              From casual jam sessions to formal recitals. Find opportunities
              that match your musical goals.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">
          Join the Resonance Community!
        </h2>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Join the Resonance community and find musicians at UNCP already
          creating amazing music together.
        </p>
        <Link to={isAuthenticated ? "/dashboard" : "/userinitiation"}>
          <button className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-10 py-4 rounded-full text-lg font-bold transition transform hover:scale-105">
            {isAuthenticated ? "Dashboard" : "Create Free Account"}
          </button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
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

export default App;
