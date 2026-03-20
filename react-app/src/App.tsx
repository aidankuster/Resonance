import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ProfileCreation from "./pages/ProfileCreation";
import UserInitiation from "./pages/UserInitiation";
import Dashboard from "./pages/Dashboard";
import SearchResults from "./pages/SearchResults";
import ProjectCreation from "./pages/ProjectCreation";
import UserProfile from "./pages/UserProfile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/userinitiation" element={<UserInitiation />} />
        <Route path="/create-profile" element={<ProfileCreation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/create-project" element={<ProjectCreation />} />
        <Route path="/profile/:id" element={<UserProfile />} />
      </Routes>
    </Router>
  );
}

export default App;
