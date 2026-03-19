import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ProfileCreation from "./pages/ProfileCreation";
import UserInitiation from "./pages/UserInitiation";
import Dashboard from "./pages/Dashboard";
import SearchResults from "./pages/SearchResults";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/userinitiation" element={<UserInitiation />} />
          <Route path="/create-profile" element={<ProfileCreation />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/search" element={<SearchResults />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
