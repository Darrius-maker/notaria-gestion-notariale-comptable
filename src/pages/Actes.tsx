import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Acte, TypeActe, Dossier, Tiers, ActeStatut, CategorieActe } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Search, Filter, Eye, Pencil, Trash2, X,
  CheckCircle, Clock, AlertCircle, FileSignature, Archive,
  ChevronRight, Users, Calendar, History, Send, Check, XCircle
} from "lucide-react";

const STATUT_CONFIG: Record<ActeStatut, { label: string; color: string; bgColor: string }> = {
  BROUILLON: { label: "Brouillon", color: "text-gray-600", bgColor: "bg-gray-100" },
  EN_REVISION: { label: "En révision", color: "text-amber-600", bgColor: "bg-amber-100" },
  VALIDE: { label: "Validé", color: "text-blue-600", bgColor: "bg-blue-100" },
  EN_SIGNATURE: { label: "En signature", color: "text-purple-600", bgColor: "bg-purple-100" },
  PARTIELLEMENT_SIGNE: { label: "Partiellement signé", color: "text-orange-600", bgColor: "bg-orange-100" },
  SIGNE: { label: "Signé", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  ENREGISTRE: { label: "Enregistré", color: "text-teal-600", bgColor: "bg-teal-100" },
  PUBLIE: { label: "Publié", color: "text-indigo-600", bgColor: "bg-indigo-100" },
  ARCHIVE: { label: "Archivé", color: "text-notaire-600", bgColor: "bg-notaire-100" }
};

const CATEGORIE_LABELS: Record<CategorieActe, string> = {
  IMMOBILIER: "Immobilier",
  FAMILLE: "Famille",
  SUCCESSION: "Succession",
  SOCIETE: "Société",
  PRET: "Prêt",
  PROCURATION: "Procuration",
  AUTRE: "Autre"
};

export default function ActesPage() {
  const [actes, setActes] = useState<Acte[]>([]);
  const [typesActes, setTypesActes] = useState<TypeActe[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [tiers, setTiers] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [filterCategorie, setFilterCategorie] = useState<string>("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedActe, setSelectedActe] = useState<Acte | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    typeActe: "",
    dossierId: "",
    titre: "",
    objet: "",
    contenu: "",
    parties: [] as Array<{ tiersId: string; qualite: string; signatureRequise: boolean }>
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [actesData, typesData, dossiersData, tiersData] = await Promise.all([
        api.get("/api/actes"),
        api.get("/api/types-actes"),
        api.get("/api/dossiers"),
        api.get("/api/tiers")
      ]);
      setActes(actesData);
      setTypesActes(typesData);
      setDossiers(dossiersData);
      setTiers(tiersData);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const seedTypesActes = async () => {
    try {
      await api.post("/api/types-actes/seed", {});
      const typesData = await api.get("/api/types-actes");
      setTypesActes(typesData);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      typeActe: "",
      dossierId: "",
      titre: "",
      objet: "",
      contenu: "",
      parties: []
    });
  };

  const handleCreateActe = async () => {
    setError("");
    try {
      const created = await api.post("/api/actes", formData);
      setActes([created, ...actes]);
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      const msg = JSON.parse(err.message);
      setError(msg.error || "Erreur lors de la création");
    }
  };

  const handleChangeStatut = async (acteId: string, newStatut: ActeStatut, commentaire?: string) => {
    try {
      const updated = await api.put(`/api/actes/${acteId}/statut`, {
        statut: newStatut,
        commentaire
      });
      setActes(actes.map(a => a._id === acteId ? updated : a));
      if (selectedActe?._id === acteId) {
        setSelectedActe(updated);
      }
    } catch (err: any) {
      const msg = JSON.parse(err.message);
      setError(msg.error || "Erreur lors du changement de statut");
    }
  };

  const handleDelete = async (acteId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet acte ?")) return;
    try {
      await api.delete(`/api/actes/${acteId}`);
      setActes(actes.filter(a => a._id !== acteId));
    } catch (err: any) {
      const msg = JSON.parse(err.message);
      setError(msg.error || "Erreur lors de la suppression");
    }
  };

  const openDetailModal = async (acte: Acte) => {
    try {
      const fullActe = await api.get(`/api/actes/${acte._id}`);
      setSelectedActe(fullActe);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const addParty = () => {
    setFormData({
      ...formData,
      parties: [...formData.parties, { tiersId: "", qualite: "", signatureRequise: true }]
    });
  };

  const removeParty = (index: number) => {
    setFormData({
      ...formData,
      parties: formData.parties.filter((_, i) => i !== index)
    });
  };

  const updateParty = (index: number, field: string, value: any) => {
    const newParties = [...formData.parties];
    (newParties[index] as any)[field] = value;
    setFormData({ ...formData, parties: newParties });
  };

  // Filter actes
  const filteredActes = actes.filter(acte => {
    const matchSearch = !searchQuery ||
      acte.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acte.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acte.dossierId as any)?.reference?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatut = !filterStatut || acte.statut === filterStatut;

    const matchCategorie = !filterCategorie ||
      (acte.typeActe as any)?.categorie === filterCategorie;

    return matchSearch && matchStatut && matchCategorie;
  });

  // Stats
  const stats = {
    total: actes.length,
    brouillons: actes.filter(a => a.statut === "BROUILLON").length,
    enCours: actes.filter(a => ["EN_REVISION", "VALIDE", "EN_SIGNATURE", "PARTIELLEMENT_SIGNE"].includes(a.statut)).length,
    signes: actes.filter(a => ["SIGNE", "ENREGISTRE", "PUBLIE", "ARCHIVE"].includes(a.statut)).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-notaire-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Chargement des actes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-notaire-100 shadow-notaire">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-notaire-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-notaire-600" />
            </div>
            <div>
              <p className="text-xs text-notaire-500">Total Actes</p>
              <p className="text-2xl font-bold text-notaire-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-notaire-100 shadow-notaire">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-notaire-500">Brouillons</p>
              <p className="text-2xl font-bold text-notaire-900">{stats.brouillons}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-notaire-100 shadow-notaire">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-notaire-500">En cours</p>
              <p className="text-2xl font-bold text-notaire-900">{stats.enCours}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-notaire-100 shadow-notaire">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-notaire-500">Signés</p>
              <p className="text-2xl font-bold text-notaire-900">{stats.signes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-notaire-400" />
            <input
              type="text"
              placeholder="Rechercher un acte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-notaire-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-notaire-500"
            />
          </div>

          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="bg-white border-2 border-notaire-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-notaire-500"
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filterCategorie}
            onChange={(e) => setFilterCategorie(e.target.value)}
            className="bg-white border-2 border-notaire-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-notaire-500"
            aria-label="Filtrer par catégorie"
          >
            <option value="">Toutes catégories</option>
            {Object.entries(CATEGORIE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {typesActes.length === 0 && (
            <button
              onClick={seedTypesActes}
              className="px-4 py-3 rounded-xl border-2 border-notaire-200 text-sm font-semibold text-notaire-700 hover:bg-notaire-50"
            >
              Initialiser Types
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={typesActes.length === 0 || dossiers.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-notaire-800 to-notaire-700 text-white text-sm font-semibold rounded-xl hover:from-notaire-700 hover:to-notaire-600 shadow-notaire disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Nouvel Acte
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError("")} className="ml-auto" aria-label="Fermer le message d'erreur">
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Actes List */}
      <div className="bg-white rounded-xl border border-notaire-100 shadow-notaire overflow-hidden">
        <div className="grid grid-cols-[1fr_150px_150px_120px_100px_80px] border-b border-notaire-100 bg-notaire-50">
          <div className="p-4 text-xs font-semibold text-notaire-500">Acte</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Type</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Dossier</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Statut</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Date</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Actions</div>
        </div>

        <div className="divide-y divide-notaire-100">
          {filteredActes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-notaire-200 mx-auto mb-3" />
              <p className="text-sm text-notaire-400">
                {actes.length === 0 ? "Aucun acte créé" : "Aucun résultat pour ces filtres"}
              </p>
            </div>
          ) : (
            filteredActes.map((acte) => {
              const config = STATUT_CONFIG[acte.statut];
              return (
                <div
                  key={acte._id}
                  className="grid grid-cols-[1fr_150px_150px_120px_100px_80px] items-center hover:bg-notaire-50 transition-colors group"
                >
                  <div className="p-4">
                    <p className="text-sm font-semibold text-notaire-900">{acte.reference}</p>
                    <p className="text-xs text-notaire-500 truncate">{acte.titre}</p>
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-notaire-100 text-notaire-700">
                      {(acte.typeActe as any)?.nom || "-"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-notaire-700">
                      {(acte.dossierId as any)?.reference || "-"}
                    </p>
                  </div>
                  <div className="p-4">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="p-4 text-xs text-notaire-500">
                    {format(new Date(acte.dateCreation), 'dd/MM/yy', { locale: fr })}
                  </div>
                  <div className="p-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openDetailModal(acte)}
                      className="p-2 hover:bg-notaire-100 rounded-lg transition-colors"
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4 text-notaire-500" />
                    </button>
                    {acte.statut === "BROUILLON" && (
                      <button
                        onClick={() => handleDelete(acte._id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-notaire-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-notaire-lg overflow-hidden"
            >
              <div className="p-6 border-b border-notaire-100 bg-gradient-to-r from-notaire-50 to-white flex items-center justify-between">
                <h2 className="font-serif italic text-2xl text-notaire-900">Nouvel Acte</h2>
                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-2 hover:bg-notaire-100 rounded-lg" aria-label="Fermer le modal de création">
                  <X className="w-5 h-5 text-notaire-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="typeActe" className="block text-xs font-semibold text-notaire-700 mb-2">Type d'acte *</label>
                    <select
                      id="typeActe"
                      value={formData.typeActe}
                      onChange={(e) => setFormData({ ...formData, typeActe: e.target.value })}
                      className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm focus:outline-none focus:border-notaire-500"
                    >
                      <option value="">Sélectionner...</option>
                      {typesActes.map(t => (
                        <option key={t._id} value={t._id}>{t.nom} ({CATEGORIE_LABELS[t.categorie]})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dossierId" className="block text-xs font-semibold text-notaire-700 mb-2">Dossier associé *</label>
                    <select
                      id="dossierId"
                      value={formData.dossierId}
                      onChange={(e) => setFormData({ ...formData, dossierId: e.target.value })}
                      className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm focus:outline-none focus:border-notaire-500"
                    >
                      <option value="">Sélectionner...</option>
                      {dossiers.filter(d => d.statut === "OUVERT").map(d => (
                        <option key={d._id} value={d._id}>{d.reference} - {d.objet.substring(0, 30)}...</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Titre de l'acte *</label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm focus:outline-none focus:border-notaire-500"
                    placeholder="Ex: Vente de la propriété située..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Objet</label>
                  <textarea
                    value={formData.objet}
                    onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm focus:outline-none focus:border-notaire-500"
                    rows={2}
                    placeholder="Description de l'acte..."
                  />
                </div>

                {/* Parties */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-notaire-700">Parties à l'acte</label>
                    <button
                      type="button"
                      onClick={addParty}
                      className="text-xs font-semibold text-notaire-600 hover:text-notaire-800 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Ajouter
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.parties.map((party, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-notaire-50 rounded-lg">
                        <label htmlFor={`tiers-${index}`} className="sr-only">Tiers pour la partie {index + 1}</label>
                        <select
                          id={`tiers-${index}`}
                          value={party.tiersId}
                          onChange={(e) => updateParty(index, "tiersId", e.target.value)}
                          className="flex-1 bg-white border border-notaire-200 rounded-lg p-2 text-sm"
                        >
                          <option value="">Sélectionner un tiers...</option>
                          {tiers.map(t => (
                            <option key={t._id} value={t._id}>{t.nom} {t.prenom || ""}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={party.qualite}
                          onChange={(e) => updateParty(index, "qualite", e.target.value)}
                          placeholder="Qualité (ex: Vendeur)"
                          className="w-32 bg-white border border-notaire-200 rounded-lg p-2 text-sm"
                        />
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={party.signatureRequise}
                            onChange={(e) => updateParty(index, "signatureRequise", e.target.checked)}
                            className="rounded border-notaire-300"
                          />
                          Signature
                        </label>
                        <button onClick={() => removeParty(index)} className="p-1 hover:bg-red-100 rounded" aria-label="Supprimer cette partie">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-notaire-100 flex justify-end gap-4">
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-6 py-3 rounded-lg border-2 border-notaire-200 text-sm font-semibold text-notaire-700 hover:bg-notaire-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateActe}
                  disabled={!formData.typeActe || !formData.dossierId || !formData.titre}
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-notaire-800 to-notaire-700 text-white text-sm font-semibold hover:from-notaire-700 hover:to-notaire-600 disabled:opacity-50"
                >
                  Créer l'acte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedActe && (
          <div className="fixed inset-0 bg-notaire-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-notaire-lg overflow-hidden"
            >
              <div className="p-6 border-b border-notaire-100 bg-gradient-to-r from-notaire-50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-notaire-500 mb-1">{selectedActe.reference}</p>
                    <h2 className="font-serif italic text-2xl text-notaire-900">{selectedActe.titre}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUT_CONFIG[selectedActe.statut].bgColor} ${STATUT_CONFIG[selectedActe.statut].color}`}>
                        {STATUT_CONFIG[selectedActe.statut].label}
                      </span>
                      <span className="text-xs text-notaire-500">
                        {(selectedActe.typeActe as any)?.nom}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-notaire-100 rounded-lg" aria-label="Fermer le modal de détails">
                    <X className="w-5 h-5 text-notaire-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 divide-x divide-notaire-100">
                  {/* Main Info */}
                  <div className="col-span-2 p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-notaire-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-notaire-500" /> Informations
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-notaire-500">Dossier</p>
                          <p className="font-medium">{(selectedActe.dossierId as any)?.reference}</p>
                        </div>
                        <div>
                          <p className="text-xs text-notaire-500">Date de création</p>
                          <p className="font-medium">{format(new Date(selectedActe.dateCreation), 'dd MMMM yyyy', { locale: fr })}</p>
                        </div>
                        {selectedActe.dateSignature && (
                          <div>
                            <p className="text-xs text-notaire-500">Date de signature</p>
                            <p className="font-medium">{format(new Date(selectedActe.dateSignature), 'dd MMMM yyyy', { locale: fr })}</p>
                          </div>
                        )}
                        {selectedActe.minuteNumero && (
                          <div>
                            <p className="text-xs text-notaire-500">N° Minute</p>
                            <p className="font-medium">{selectedActe.minuteNumero}</p>
                          </div>
                        )}
                      </div>
                      {selectedActe.objet && (
                        <div className="mt-4">
                          <p className="text-xs text-notaire-500">Objet</p>
                          <p className="text-sm mt-1">{selectedActe.objet}</p>
                        </div>
                      )}
                    </div>

                    {/* Parties */}
                    <div>
                      <h3 className="text-sm font-semibold text-notaire-900 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-notaire-500" /> Parties ({selectedActe.parties.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedActe.parties.map((party, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-notaire-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-notaire-200 flex items-center justify-center text-xs font-bold text-notaire-700">
                                {party.tiersId?.nom?.charAt(0) || "?"}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{party.tiersId?.nom} {party.tiersId?.prenom || ""}</p>
                                <p className="text-xs text-notaire-500">{party.qualite}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {party.signatureRequise && (
                                party.signatureVerifiee ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    <Check className="w-3 h-3" /> Signé
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                    <Clock className="w-3 h-3" /> En attente
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Workflow Actions */}
                    <div>
                      <h3 className="text-sm font-semibold text-notaire-900 mb-3">Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedActe.statut === "BROUILLON" && (
                          <button
                            onClick={() => handleChangeStatut(selectedActe._id, "EN_REVISION")}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
                          >
                            <Send className="w-4 h-4" /> Soumettre pour révision
                          </button>
                        )}
                        {selectedActe.statut === "EN_REVISION" && (
                          <>
                            <button
                              onClick={() => handleChangeStatut(selectedActe._id, "VALIDE")}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                            >
                              <Check className="w-4 h-4" /> Valider
                            </button>
                            <button
                              onClick={() => handleChangeStatut(selectedActe._id, "BROUILLON")}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                            >
                              <XCircle className="w-4 h-4" /> Renvoyer en brouillon
                            </button>
                          </>
                        )}
                        {selectedActe.statut === "VALIDE" && (
                          <button
                            onClick={() => handleChangeStatut(selectedActe._id, "EN_SIGNATURE")}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200"
                          >
                            <FileSignature className="w-4 h-4" /> Passer en signature
                          </button>
                        )}
                        {selectedActe.statut === "SIGNE" && (
                          <button
                            onClick={() => handleChangeStatut(selectedActe._id, "ENREGISTRE")}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200"
                          >
                            <CheckCircle className="w-4 h-4" /> Marquer comme enregistré
                          </button>
                        )}
                        {(selectedActe.statut === "ENREGISTRE" || selectedActe.statut === "PUBLIE") && (
                          <button
                            onClick={() => handleChangeStatut(selectedActe._id, "ARCHIVE")}
                            className="flex items-center gap-2 px-4 py-2 bg-notaire-100 text-notaire-700 rounded-lg text-sm font-medium hover:bg-notaire-200"
                          >
                            <Archive className="w-4 h-4" /> Archiver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* History */}
                  <div className="p-6">
                    <h3 className="text-sm font-semibold text-notaire-900 mb-4 flex items-center gap-2">
                      <History className="w-4 h-4 text-notaire-500" /> Historique
                    </h3>
                    <div className="space-y-4">
                      {selectedActe.historique?.slice().reverse().map((h, i) => (
                        <div key={i} className="relative pl-6 pb-4 border-l-2 border-notaire-200 last:pb-0">
                          <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-notaire-300" />
                          <p className="text-xs font-medium text-notaire-900">{h.action}</p>
                          <p className="text-[10px] text-notaire-500">{h.commentaire}</p>
                          <p className="text-[10px] text-notaire-400 mt-1">
                            {format(new Date(h.date), 'dd/MM/yy HH:mm', { locale: fr })}
                            {h.userId && ` • ${(h.userId as any).username}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
