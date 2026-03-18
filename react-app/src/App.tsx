import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ProfileCreation from "./pages/ProfileCreation";
import UserInitiation from "./pages/UserInitiation";
import Dashboard from "./pages/Dashboard";
import SearchResults from "./pages/SearchResults";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/userinitiation" element={<UserInitiation />} />
        <Route path="/create-profile" element={<ProfileCreation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<SearchResults />} />
      </Routes>
    </Router>
  );
}

export default App;
