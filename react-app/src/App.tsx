// App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import ProfileCreation from "./ProfileCreation";
import UserInitiation from "./UserInitiation";
import Dashboard from "./Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/userinitiation" element={<UserInitiation />} />
        <Route path="/create-profile" element={<ProfileCreation />} />
        <Route path="/dashboard" element={<Dashboard />} />{" "}
      </Routes>
    </Router>
  );
}

export default App;
