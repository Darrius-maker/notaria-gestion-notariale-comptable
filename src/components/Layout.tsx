import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { User, Dossier, Tiers } from "../types";
import { LayoutDashboard, FolderOpen, Calculator, Users, LogOut, Search, X, FileText, UserCircle, Calendar, Receipt, FileSpreadsheet, ScrollText, Building2, BarChart3 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { api } from "../services/api";
import NotificationCenter from "./NotificationCenter";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

interface SearchResult {
  type: "dossier" | "tiers";
  id: string;
  title: string;
  subtitle: string;
  status?: string;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [tiersList, setTiersList] = useState<Tiers[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Dossiers", path: "/dossiers", icon: FolderOpen },
    { label: "Actes", path: "/actes", icon: ScrollText },
    { label: "Comptabilité", path: "/comptabilite", icon: Calculator },
    { label: "Tiers", path: "/tiers", icon: Users },
    { label: "Agenda", path: "/agenda", icon: Calendar },
    { label: "Facturation", path: "/facturation", icon: Receipt },
    { label: "États", path: "/etats-comptables", icon: FileSpreadsheet },
    { label: "Études", path: "/etudes", icon: Building2 },
    { label: "Reporting", path: "/reporting", icon: BarChart3 },
  ];

  // Load data for search
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dossiersData, tiersData] = await Promise.all([
          api.get("/api/dossiers"),
          api.get("/api/tiers")
        ]);
        setDossiers(dossiersData);
        setTiersList(tiersData);
        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load search data:", err);
      }
    };
    loadData();
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim() || !dataLoaded) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search dossiers
    dossiers.forEach(d => {
      if (
        d.reference.toLowerCase().includes(query) ||
        d.objet.toLowerCase().includes(query) ||
        d.intervenants.some(int =>
          int.tiersId.nom.toLowerCase().includes(query) ||
          (int.tiersId.prenom && int.tiersId.prenom.toLowerCase().includes(query))
        )
      ) {
        results.push({
          type: "dossier",
          id: d._id,
          title: d.reference,
          subtitle: d.objet.substring(0, 50) + (d.objet.length > 50 ? "..." : ""),
          status: d.statut
        });
      }
    });

    // Search tiers
    tiersList.forEach(t => {
      const fullName = `${t.nom} ${t.prenom || ""}`.toLowerCase();
      if (
        fullName.includes(query) ||
        t.email.toLowerCase().includes(query) ||
        (t.siret && t.siret.includes(query))
      ) {
        results.push({
          type: "tiers",
          id: t._id,
          title: `${t.nom} ${t.prenom || ""}`.trim(),
          subtitle: t.email,
          status: t.kycStatus
        });
      }
    });

    setSearchResults(results.slice(0, 8)); // Limit to 8 results
    setLoading(false);
  }, [searchQuery, dossiers, tiersList, dataLoaded]);

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    if (result.type === "dossier") {
      navigate("/dossiers", { state: { selectDossier: result.id } });
    } else {
      navigate("/tiers", { state: { highlightTiers: result.id } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowResults(false);
      setSearchQuery("");
    }
  };

  return (
    <div className="min-h-screen bg-notaire-50 flex font-sans text-notaire-900">
      {/* Sidebar */}
      <aside className="w-72 border-r border-notaire-200 bg-white flex flex-col shadow-lg">
        <div className="p-6 border-b border-notaire-200 bg-gradient-to-br from-notaire-800 to-notaire-900">
          <div className="flex items-center gap-4">
            <img
              src="/logo.jpg"
              alt="Ordre des Notaires du Burkina Faso"
              className="w-14 h-14 rounded-full border-2 border-or-400 shadow-lg object-cover"
            />
            <div>
              <h1 className="font-serif italic text-xl text-white mb-0.5">NotarIA</h1>
              <p className="text-[8px] uppercase tracking-widest text-notaire-200">
                Ordre des Notaires
              </p>
              <p className="text-[8px] uppercase tracking-widest text-or-400 font-bold">
                Burkina Faso
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-notaire-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] uppercase tracking-widest text-notaire-300">Système Actif</span>
          </div>
        </div>

        {/* Global Search */}
        <div className="px-4 py-4" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-notaire-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
              onFocus={() => searchQuery && setShowResults(true)}
              onKeyDown={handleKeyDown}
              className="w-full bg-notaire-50 border border-notaire-200 rounded-lg py-2.5 pl-10 pr-8 text-xs focus:outline-none focus:border-notaire-500 focus:ring-2 focus:ring-notaire-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-notaire-400 hover:text-notaire-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchQuery && (
            <div className="absolute z-50 mt-2 w-64 bg-white border border-notaire-200 rounded-lg shadow-notaire-lg max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-xs text-notaire-500">Recherche...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-notaire-400 italic">Aucun résultat</div>
              ) : (
                <div className="divide-y divide-notaire-100">
                  {searchResults.map((result, i) => (
                    <button
                      key={`${result.type}-${result.id}-${i}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-3 hover:bg-notaire-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          result.type === "dossier" ? "bg-notaire-100 text-notaire-600" : "bg-or-100 text-or-600"
                        }`}>
                          {result.type === "dossier" ? <FileText className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-notaire-900 truncate">{result.title}</p>
                          <p className="text-[10px] text-notaire-500 truncate">{result.subtitle}</p>
                        </div>
                        {result.status && (
                          <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded ${
                            result.status === "OUVERT" || result.status === "VALIDE" ? "bg-emerald-100 text-emerald-700" :
                            result.status === "SIGNE" ? "bg-notaire-100 text-notaire-700" :
                            result.status === "EN_ATTENTE" ? "bg-or-100 text-or-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {result.status}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="p-2 bg-notaire-50 border-t border-notaire-100 rounded-b-lg">
                  <p className="text-[9px] text-center text-notaire-500">
                    {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-xs font-medium transition-all rounded-lg group",
                  isActive
                    ? "bg-gradient-to-r from-notaire-800 to-notaire-700 text-white shadow-notaire"
                    : "hover:bg-notaire-50 text-notaire-600 hover:text-notaire-800"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-or-400" : "text-notaire-400 group-hover:text-notaire-600")} />
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-or-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-notaire-200">
          <div className="bg-gradient-to-br from-notaire-50 to-notaire-100 p-4 rounded-lg border border-notaire-200 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-notaire-700 to-notaire-800 flex items-center justify-center text-white font-bold text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-notaire-900">{user.username}</p>
                <p className="text-[10px] font-medium text-notaire-500 uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-notaire-200 bg-white flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="w-1 h-6 bg-gradient-to-b from-notaire-600 to-notaire-800 rounded-full" />
            <h2 className="text-sm font-semibold text-notaire-800">
              {navItems.find(i => i.path === location.pathname)?.label || "Page"}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <NotificationCenter />
            <div className="flex items-center gap-2 text-xs text-notaire-500">
              <Calendar className="w-4 h-4 text-notaire-400" />
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-notaire-50 to-white">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
