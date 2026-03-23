import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Etude, EtudeStatut, GlobalStats } from "../types";

interface EtudeForm {
  nom: string;
  adresse: {
    rue: string;
    ville: string;
    codePostal: string;
    pays: string;
  };
  telephone: string;
  email: string;
  siteWeb: string;
  numeroOrdre: string;
  notaireTitulaire: string;
  statut: EtudeStatut;
}

const initialForm: EtudeForm = {
  nom: "",
  adresse: {
    rue: "",
    ville: "",
    codePostal: "",
    pays: "Burkina Faso",
  },
  telephone: "",
  email: "",
  siteWeb: "",
  numeroOrdre: "",
  notaireTitulaire: "",
  statut: "ACTIVE",
};

export default function Etudes() {
  const [etudes, setEtudes] = useState<Etude[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<Array<{ _id: string; username: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEtude, setSelectedEtude] = useState<Etude | null>(null);
  const [editingEtude, setEditingEtude] = useState<Etude | null>(null);
  const [form, setForm] = useState<EtudeForm>(initialForm);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("");
  const [villeFilter, setVilleFilter] = useState<string>("");

  const fetchEtudes = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statutFilter) params.append("statut", statutFilter);
      if (villeFilter) params.append("ville", villeFilter);

      const res = await fetch(`/api/etudes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEtudes(data);
    } catch (error) {
      console.error("Erreur chargement études:", error);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reporting/global", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGlobalStats(data);
    } catch (error) {
      console.error("Erreur chargement stats globales:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.filter((u: { role: string }) => u.role === "NOTAIRE"));
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
    }
  };

  useEffect(() => {
    Promise.all([fetchEtudes(), fetchGlobalStats(), fetchUsers()]).finally(() =>
      setLoading(false)
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEtudes();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statutFilter, villeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = editingEtude
        ? `/api/etudes/${editingEtude._id}`
        : "/api/etudes";
      const method = editingEtude ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          notaireTitulaire: form.notaireTitulaire || undefined,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setForm(initialForm);
        setEditingEtude(null);
        fetchEtudes();
        fetchGlobalStats();
      }
    } catch (error) {
      console.error("Erreur sauvegarde étude:", error);
    }
  };

  const handleEdit = (etude: Etude) => {
    setEditingEtude(etude);
    setForm({
      nom: etude.nom,
      adresse: {
        rue: etude.adresse?.rue || "",
        ville: etude.adresse?.ville || "",
        codePostal: etude.adresse?.codePostal || "",
        pays: etude.adresse?.pays || "Burkina Faso",
      },
      telephone: etude.telephone || "",
      email: etude.email || "",
      siteWeb: etude.siteWeb || "",
      numeroOrdre: etude.numeroOrdre || "",
      notaireTitulaire: etude.notaireTitulaire?._id || "",
      statut: etude.statut,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette étude ?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/etudes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchEtudes();
        fetchGlobalStats();
      }
    } catch (error) {
      console.error("Erreur suppression étude:", error);
    }
  };

  const handleViewDetails = async (etude: Etude) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/etudes/${etude._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSelectedEtude(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Erreur chargement détails:", error);
    }
  };

  const refreshEtudeStats = async (etudeId: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/etudes/${etudeId}/stats`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEtudes();
      if (selectedEtude?._id === etudeId) {
        handleViewDetails(selectedEtude);
      }
    } catch (error) {
      console.error("Erreur rafraîchissement stats:", error);
    }
  };

  const getStatutBadge = (statut: EtudeStatut) => {
    const styles: Record<EtudeStatut, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      SUSPENDUE: "bg-amber-100 text-amber-800",
      FERMEE: "bg-red-100 text-red-800",
    };
    const labels: Record<EtudeStatut, string> = {
      ACTIVE: "Active",
      SUSPENDUE: "Suspendue",
      FERMEE: "Fermée",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[statut]}`}>
        {labels[statut]}
      </span>
    );
  };

  const formatMontant = (montant: string | undefined) => {
    if (!montant) return "0 FCFA";
    const num = parseFloat(montant);
    return new Intl.NumberFormat("fr-FR").format(num) + " FCFA";
  };

  const villes = [...new Set(etudes.map((e) => e.adresse?.ville).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-notaire-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supervision des Études
          </h1>
          <p className="text-gray-500 mt-1">
            Gestion et supervision des études notariales
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEtude(null);
            setForm(initialForm);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-notaire-600 text-white rounded-lg hover:bg-notaire-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle Étude
        </button>
      </div>

      {/* Statistiques Globales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Études</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {globalStats.nombreEtudes}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {globalStats.etudesActives} actives
                </p>
              </div>
              <div className="p-3 bg-notaire-100 rounded-lg">
                <svg className="w-6 h-6 text-notaire-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Dossiers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {globalStats.nombreDossiers}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {globalStats.dossiersOuverts} ouverts
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Actes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {globalStats.nombreActes}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {globalStats.actesSignes} signés
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Chiffre d'Affaires</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatMontant(globalStats.totalChiffreAffaires)}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Recouvrement: {globalStats.tauxRecouvrement}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Rechercher une étude..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
              />
            </div>
          </div>
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDUE">Suspendue</option>
            <option value="FERMEE">Fermée</option>
          </select>
          <select
            value={villeFilter}
            onChange={(e) => setVilleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
          >
            <option value="">Toutes les villes</option>
            {villes.map((ville) => (
              <option key={ville} value={ville}>
                {ville}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des Études */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {etudes.map((etude, index) => (
            <motion.div
              key={etude._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{etude.nom}</h3>
                    {etude.numeroOrdre && (
                      <p className="text-sm text-gray-500">N° {etude.numeroOrdre}</p>
                    )}
                  </div>
                  {getStatutBadge(etude.statut)}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {etude.adresse?.ville && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{etude.adresse.ville}</span>
                    </div>
                  )}
                  {etude.notaireTitulaire && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Me {etude.notaireTitulaire.username}</span>
                    </div>
                  )}
                  {etude.telephone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{etude.telephone}</span>
                    </div>
                  )}
                </div>

                {/* Stats de l'étude */}
                {(etude.liveStats || etude.stats) && (
                  <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-notaire-600">
                        {etude.liveStats?.nombreDossiers ?? etude.stats?.nombreDossiers ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">Dossiers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-notaire-600">
                        {etude.liveStats?.nombreActes ?? etude.stats?.nombreActes ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">Actes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-notaire-600">
                        {formatMontant(etude.liveStats?.chiffreAffaires ?? etude.stats?.chiffreAffaires).replace(" FCFA", "")}
                      </p>
                      <p className="text-xs text-gray-500">CA</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleViewDetails(etude)}
                    className="flex-1 px-3 py-2 text-sm text-notaire-600 hover:bg-notaire-50 rounded-lg transition-colors"
                  >
                    Détails
                  </button>
                  <button
                    onClick={() => handleEdit(etude)}
                    className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => refreshEtudeStats(etude._id)}
                    className="p-2 text-gray-400 hover:text-notaire-600 hover:bg-notaire-50 rounded-lg transition-colors"
                    title="Rafraîchir les stats"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {etudes.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Aucune étude trouvée
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer une nouvelle étude.
          </p>
        </div>
      )}

      {/* Modal Création/Édition */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEtude ? "Modifier l'Étude" : "Nouvelle Étude"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'étude *
                    </label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro Ordre
                    </label>
                    <input
                      type="text"
                      value={form.numeroOrdre}
                      onChange={(e) => setForm({ ...form, numeroOrdre: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                      placeholder="ONB-2024-XXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={form.statut}
                      onChange={(e) => setForm({ ...form, statut: e.target.value as EtudeStatut })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDUE">Suspendue</option>
                      <option value="FERMEE">Fermée</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notaire Titulaire
                    </label>
                    <select
                      value={form.notaireTitulaire}
                      onChange={(e) => setForm({ ...form, notaireTitulaire: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                    >
                      <option value="">Sélectionner un notaire</option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          Me {user.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site Web
                    </label>
                    <input
                      type="url"
                      value={form.siteWeb}
                      onChange={(e) => setForm({ ...form, siteWeb: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                      placeholder="https://"
                    />
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Adresse</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={form.adresse.rue}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            adresse: { ...form.adresse, rue: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                        placeholder="Rue"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={form.adresse.ville}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            adresse: { ...form.adresse, ville: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                        placeholder="Ville"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={form.adresse.codePostal}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            adresse: { ...form.adresse, codePostal: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
                        placeholder="Code Postal"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-notaire-600 text-white rounded-lg hover:bg-notaire-700 transition-colors"
                  >
                    {editingEtude ? "Mettre à jour" : "Créer l'Étude"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Détails */}
      <AnimatePresence>
        {showDetailModal && selectedEtude && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedEtude.nom}
                  </h2>
                  {selectedEtude.numeroOrdre && (
                    <p className="text-sm text-gray-500">
                      N° Ordre: {selectedEtude.numeroOrdre}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatutBadge(selectedEtude.statut)}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Informations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Coordonnées
                    </h3>
                    <div className="space-y-2">
                      {selectedEtude.adresse && (
                        <p className="text-sm text-gray-700">
                          {[
                            selectedEtude.adresse.rue,
                            selectedEtude.adresse.codePostal,
                            selectedEtude.adresse.ville,
                            selectedEtude.adresse.pays,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {selectedEtude.telephone && (
                        <p className="text-sm text-gray-700">
                          Tél: {selectedEtude.telephone}
                        </p>
                      )}
                      {selectedEtude.email && (
                        <p className="text-sm text-gray-700">
                          Email: {selectedEtude.email}
                        </p>
                      )}
                      {selectedEtude.siteWeb && (
                        <a
                          href={selectedEtude.siteWeb}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-notaire-600 hover:underline"
                        >
                          {selectedEtude.siteWeb}
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Notaire Titulaire
                    </h3>
                    {selectedEtude.notaireTitulaire ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-notaire-100 rounded-full flex items-center justify-center">
                          <span className="text-notaire-600 font-medium">
                            {selectedEtude.notaireTitulaire.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Me {selectedEtude.notaireTitulaire.username}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedEtude.notaireTitulaire.role}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Non assigné</p>
                    )}
                  </div>
                </div>

                {/* Statistiques en temps réel */}
                {selectedEtude.liveStats && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                      Statistiques en temps réel
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-notaire-600">
                          {selectedEtude.liveStats.nombreDossiers}
                        </p>
                        <p className="text-xs text-gray-500">Dossiers</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedEtude.liveStats.dossiersOuverts}
                        </p>
                        <p className="text-xs text-gray-500">Ouverts</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {selectedEtude.liveStats.nombreActes}
                        </p>
                        <p className="text-xs text-gray-500">Actes</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                          {selectedEtude.liveStats.actesEnCours}
                        </p>
                        <p className="text-xs text-gray-500">En cours</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-lg font-bold text-notaire-600">
                          {formatMontant(selectedEtude.liveStats.chiffreAffaires).replace(" FCFA", "")}
                        </p>
                        <p className="text-xs text-gray-500">Chiffre d'Affaires</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Métadonnées */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Créée le{" "}
                      {new Date(selectedEtude.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    {selectedEtude.dateCreation && (
                      <span>
                        Date officielle: {new Date(selectedEtude.dateCreation).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => refreshEtudeStats(selectedEtude._id)}
                    className="px-4 py-2 text-notaire-600 hover:bg-notaire-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rafraîchir
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedEtude);
                    }}
                    className="px-4 py-2 bg-notaire-600 text-white rounded-lg hover:bg-notaire-700 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleDelete(selectedEtude._id);
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
