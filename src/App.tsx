import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { User } from "./types";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Dossiers from "./pages/Dossiers";
import Comptabilite from "./pages/Comptabilite";
import TiersPage from "./pages/Tiers";
import Agenda from "./pages/Agenda";
import Facturation from "./pages/Facturation";
import EtatsComptables from "./pages/EtatsComptables";
import Actes from "./pages/Actes";
import Etudes from "./pages/Etudes";
import Reporting from "./pages/Reporting";
import Layout from "./components/Layout";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData: User, token: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login onLogin={login} />} 
        />
        
        <Route element={user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dossiers" element={<Dossiers />} />
          <Route path="/comptabilite" element={<Comptabilite />} />
          <Route path="/tiers" element={<TiersPage />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/facturation" element={<Facturation />} />
          <Route path="/etats-comptables" element={<EtatsComptables />} />
          <Route path="/actes" element={<Actes />} />
          <Route path="/etudes" element={<Etudes />} />
          <Route path="/reporting" element={<Reporting />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
