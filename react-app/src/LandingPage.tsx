import { Music, Users, Calendar, Search, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

function App() {
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
        <div className="hidden md:flex space-x-8">
          <a href="#" className="hover:text-amber-400 transition">
            Discover
          </a>
          <a href="#" className="hover:text-amber-400 transition">
            How It Works
          </a>
          <a
            href="https://www.uncp.edu"
            className="hover:text-amber-400 transition"
          >
            UNCP
          </a>
          <a
            href="https://www.uncp.edu/academics/colleges-and-schools/college-of-arts-and-sciences/music/index.html"
            className="hover:text-amber-400 transition"
          >
            Moore Hall
          </a>
        </div>
        <Link to="/userinitiation">
          <button className="bg-amber-600 hover:bg-yellow-700 px-6 py-2 rounded-full font-semibold transition">
            Get Started
          </button>
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Welcome to <span className="text-amber-500">Resonance</span>
        </h1>
        <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
          Connect with UNCP music students to form ensembles, collaborate on
          projects, and create unique & exciting musical experiences.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center mb-20">
          <button className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-yellow-700 hover:to-amber-700 px-8 py-4 rounded-full text-lg font-bold flex items-center justify-center gap-2 transition">
            Find Musicians <ChevronRight className="h-5 w-5" />
          </button>
          <button className="bg-gray-900 hover:bg-gray-700 px-8 py-4 rounded-full text-lg font-bold transition">
            Join Ensemble
          </button>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto bg-gray-900 rounded-2xl p-2 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 flex items-center gap-3 px-4 py-3">
            <Search className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by instrument, genre, or username..."
              className="bg-transparent w-full focus:outline-none text-lg"
            />
          </div>
          <div className="flex items-center gap-4 px-4">
            <button className="bg-amber-600 hover:bg-yellow-700 px-6 py-3 rounded-full font-semibold">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">
          Why Use Resonance?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 rounded-2xl p-8 hover:bg-amber-900 transition">
            <div className="bg-amber-700/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
              <Users className="h-7 w-7 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Verified Students</h3>
            <p className="text-gray-300">
              Connect exclusively with verified UNCP music students. Build your
              network and create new opportunities.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-8 hover:bg-amber-900 transition">
            <div className="bg-amber-700/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
              <Calendar className="h-7 w-7 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Smart Matching</h3>
            <p className="text-gray-300">
              An algorithm that suggests perfect matches based on instrument,
              skill level, and genre preferences.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-8 hover:bg-amber-900 transition">
            <div className="bg-amber-700/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
              <Music className="h-7 w-7 text-yellow-400" />
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
        <Link to="/userinitiation">
          <button className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-amber-700 px-10 py-4 rounded-full text-lg font-bold transition transform hover:scale-105">
            Create Free Account
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
