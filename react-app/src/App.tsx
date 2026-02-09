// App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import ProfileCreation from "./ProfileCreation";
import Dashboard from "./Dashboard"; // Add this import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create-profile" element={<ProfileCreation />} />
        <Route path="/dashboard" element={<Dashboard />} />{" "}
        {/* Add this route */}
      </Routes>
    </Router>
  );
}

export default App;
