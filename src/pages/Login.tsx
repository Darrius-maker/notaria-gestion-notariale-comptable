import React, { useState } from "react";
import { User } from "../types";
import { Lock, User as UserIcon, Shield } from "lucide-react";

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-notaire-900 via-notaire-800 to-notaire-900 flex items-center justify-center p-4 font-sans">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo Card */}
        <div className="bg-white rounded-t-2xl p-8 text-center border-b-4 border-or-500">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/logo.jpg"
              alt="Ordre des Notaires du Burkina Faso"
              className="w-24 h-24 rounded-full border-4 border-notaire-800 shadow-lg object-cover"
            />
          </div>
          <h1 className="font-serif italic text-3xl text-notaire-900 mb-1">NotarIA</h1>
          <p className="text-xs font-semibold text-notaire-600 uppercase tracking-widest mb-1">
            Gestion Notariale & Comptable
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-notaire-500">
            <span className="w-8 h-px bg-notaire-200" />
            <span className="uppercase tracking-wider">Ordre des Notaires du Burkina Faso</span>
            <span className="w-8 h-px bg-notaire-200" />
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-b-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-notaire-700 mb-2">
                Identifiant
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-notaire-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg py-3.5 pl-12 pr-4 text-notaire-900 focus:outline-none focus:border-notaire-500 focus:bg-white transition-all"
                  placeholder="Votre identifiant"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-notaire-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-notaire-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg py-3.5 pl-12 pr-4 text-notaire-900 focus:outline-none focus:border-notaire-500 focus:bg-white transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
                <Shield className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Erreur d'authentification</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-notaire-800 to-notaire-700 text-white py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:from-notaire-700 hover:to-notaire-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connexion en cours...
                </span>
              ) : "Se Connecter"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-notaire-100">
            <div className="flex items-center justify-center gap-2 text-notaire-400">
              <Shield className="w-4 h-4" />
              <p className="text-[10px] uppercase tracking-wider">
                Accès sécurisé réservé au personnel autorisé
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-notaire-300">
            &copy; {new Date().getFullYear()} Ordre des Notaires du Burkina Faso
          </p>
          <p className="text-[10px] text-notaire-400 mt-1">
            Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
