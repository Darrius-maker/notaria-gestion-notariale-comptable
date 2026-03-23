import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Tiers } from "../types";
import { UserPlus, Search, ShieldCheck, ShieldAlert, Mail, Phone, FileText, Pencil, Trash2, X, AlertCircle, CreditCard, FolderOpen, ShieldX } from "lucide-react";
import DocumentManager from "../components/DocumentManager";
import KYCManager from "../components/KYCManager";
import { Document } from "../types";

export default function TiersPage() {
  const [tiers, setTiers] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingTiers, setEditingTiers] = useState<Tiers | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedTiersForDocs, setSelectedTiersForDocs] = useState<Tiers | null>(null);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [selectedTiersForKYC, setSelectedTiersForKYC] = useState<Tiers | null>(null);
  const [tiersDocuments, setTiersDocuments] = useState<Document[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    type: "PHYSIQUE" as "PHYSIQUE" | "MORALE",
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    siret: "",
    rib: "",
    kycStatus: "EN_ATTENTE" as "VALIDE" | "EN_ATTENTE" | "REFUSE"
  });

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const data = await api.get("/api/tiers");
      setTiers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "PHYSIQUE",
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      siret: "",
      rib: "",
      kycStatus: "EN_ATTENTE"
    });
    setEditMode(false);
    setEditingTiers(null);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (t: Tiers) => {
    setFormData({
      type: t.type,
      nom: t.nom,
      prenom: t.prenom || "",
      email: t.email,
      telephone: t.telephone || "",
      siret: t.siret || "",
      rib: t.rib || "",
      kycStatus: t.kycStatus
    });
    setEditingTiers(t);
    setEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setError("");
    try {
      if (editMode && editingTiers) {
        const updated = await api.put(`/api/tiers/${editingTiers._id}`, formData);
        setTiers(tiers.map(t => t._id === editingTiers._id ? updated : t));
      } else {
        const created = await api.post("/api/tiers", formData);
        setTiers([created, ...tiers]);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de l'opération");
      } catch {
        setError("Erreur lors de l'opération");
      }
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await api.delete(`/api/tiers/${id}`);
      setTiers(tiers.filter(t => t._id !== id));
      setShowDeleteConfirm(false);
      setDeletingId(null);
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de la suppression");
      } catch {
        setError("Erreur lors de la suppression");
      }
      setShowDeleteConfirm(false);
    }
  };

  const openKYCModal = async (t: Tiers) => {
    setSelectedTiersForKYC(t);
    try {
      const docs = await api.get(`/api/tiers/${t._id}/documents`);
      setTiersDocuments(docs);
    } catch (err) {
      setTiersDocuments([]);
    }
    setShowKYCModal(true);
  };

  const handleKYCStatusChange = (newStatus: string) => {
    if (selectedTiersForKYC) {
      setTiers(tiers.map(t =>
        t._id === selectedTiersForKYC._id
          ? { ...t, kycStatus: newStatus as Tiers["kycStatus"] }
          : t
      ));
    }
  };

  const filteredTiers = tiers.filter(t => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.nom.toLowerCase().includes(query) ||
      (t.prenom && t.prenom.toLowerCase().includes(query)) ||
      t.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-notaire-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border-2 border-notaire-200 rounded-xl py-3 pl-12 pr-4 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500 focus:ring-2 focus:ring-notaire-500/20 w-80 transition-all"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-notaire-800 to-notaire-700 text-white text-sm font-semibold rounded-xl hover:from-notaire-700 hover:to-notaire-600 shadow-notaire transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Nouvelle Fiche Client
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button onClick={() => setError("")} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="flex items-center justify-center gap-3 text-notaire-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Chargement...</span>
            </div>
          </div>
        ) : filteredTiers.length === 0 ? (
          <div className="col-span-full p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-notaire-100 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-notaire-400" />
            </div>
            <p className="text-sm text-notaire-500">
              {searchQuery ? "Aucun résultat pour cette recherche" : "Aucun client enregistré"}
            </p>
          </div>
        ) : (
          filteredTiers.map((t) => (
            <div key={t._id} className="bg-white rounded-xl border border-notaire-100 p-6 group hover:shadow-notaire-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-notaire-100 to-notaire-50 flex items-center justify-center text-lg">
                  {t.type === 'MORALE' ? '🏢' : '👤'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openKYCModal(t)}
                    className={`text-[10px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${
                      t.kycStatus === 'VALIDE' ? 'bg-emerald-100 text-emerald-700' :
                      t.kycStatus === 'REFUSE' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {t.kycStatus === 'VALIDE' ? <ShieldCheck className="w-3.5 h-3.5" /> :
                     t.kycStatus === 'REFUSE' ? <ShieldX className="w-3.5 h-3.5" /> :
                     <ShieldAlert className="w-3.5 h-3.5" />}
                    KYC {t.kycStatus}
                  </button>
                </div>
              </div>

              <h3 className="font-serif italic text-xl text-notaire-900 mb-1">{t.nom} {t.prenom}</h3>
              <p className="text-xs font-medium text-notaire-400 mb-4">{t.type}</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-notaire-500">
                  <Mail className="w-4 h-4 text-notaire-400" /> {t.email}
                </div>
                {t.telephone && (
                  <div className="flex items-center gap-2 text-xs text-notaire-500">
                    <Phone className="w-4 h-4 text-notaire-400" /> {t.telephone}
                  </div>
                )}
                {t.siret && (
                  <div className="flex items-center gap-2 text-xs text-notaire-500">
                    <FileText className="w-4 h-4 text-notaire-400" /> SIRET: {t.siret}
                  </div>
                )}
                {t.rib && (
                  <div className="flex items-center gap-2 text-xs text-notaire-500">
                    <CreditCard className="w-4 h-4 text-notaire-400" /> RIB: {t.rib.substring(0, 10)}...
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-notaire-100">
                <button className="flex-1 py-2.5 rounded-lg border border-notaire-200 text-xs font-semibold text-notaire-700 hover:bg-notaire-50 flex items-center justify-center gap-1.5 transition-colors">
                  <FolderOpen className="w-4 h-4" /> Dossiers
                </button>
                <button
                  onClick={() => { setSelectedTiersForDocs(t); setShowDocumentsModal(true); }}
                  className="flex-1 py-2.5 rounded-lg border border-notaire-200 text-xs font-semibold text-notaire-700 hover:bg-notaire-50 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Documents
                </button>
                <button
                  onClick={() => openEditModal(t)}
                  className="p-2.5 rounded-lg border border-notaire-200 text-notaire-600 hover:bg-notaire-50 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setDeletingId(t._id); setShowDeleteConfirm(true); }}
                  className="p-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-notaire-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-notaire-lg overflow-hidden">
            <div className="p-6 border-b border-notaire-100 bg-gradient-to-r from-notaire-50 to-white flex items-center justify-between">
              <h2 className="font-serif italic text-2xl text-notaire-900">{editMode ? 'Modifier le Client' : 'Nouvelle Fiche Client'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-notaire-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-notaire-500" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Type de client</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                  >
                    <option value="PHYSIQUE">Personne Physique</option>
                    <option value="MORALE">Personne Morale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Statut KYC</label>
                  <select
                    value={formData.kycStatus}
                    onChange={(e) => setFormData({...formData, kycStatus: e.target.value as any})}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                  >
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="VALIDE">Validé</option>
                    <option value="REFUSE">Refusé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">
                    {formData.type === 'MORALE' ? 'Raison Sociale' : 'Nom'}
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                  />
                </div>
                {formData.type === 'PHYSIQUE' && (
                  <div>
                    <label className="block text-xs font-semibold text-notaire-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                      className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                  />
                </div>
              </div>

              {formData.type === 'MORALE' && (
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">SIRET</label>
                  <input
                    type="text"
                    value={formData.siret}
                    onChange={(e) => setFormData({...formData, siret: e.target.value})}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                    placeholder="14 chiffres"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-notaire-700 mb-2">RIB / IBAN</label>
                <input
                  type="text"
                  value={formData.rib}
                  onChange={(e) => setFormData({...formData, rib: e.target.value})}
                  className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 font-mono focus:outline-none focus:border-notaire-500"
                  placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <div className="pt-6 flex justify-end gap-4">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-3 rounded-lg border-2 border-notaire-200 text-sm font-semibold text-notaire-700 hover:bg-notaire-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-notaire-800 to-notaire-700 text-white text-sm font-semibold hover:from-notaire-700 hover:to-notaire-600 transition-all"
                >
                  {editMode ? 'Enregistrer' : 'Créer le client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-notaire-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-notaire-lg overflow-hidden">
            <div className="p-6 border-b border-notaire-100 bg-red-50">
              <h2 className="font-serif italic text-xl text-red-600">Confirmer la suppression</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-notaire-700 mb-6">
                Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                Note: Un client associé à des dossiers ne peut pas être supprimé.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
                  className="px-6 py-3 rounded-lg border-2 border-notaire-200 text-sm font-semibold text-notaire-700 hover:bg-notaire-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deletingId && handleDelete(deletingId)}
                  className="px-8 py-3 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocumentsModal && selectedTiersForDocs && (
        <div className="fixed inset-0 bg-notaire-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-notaire-lg overflow-hidden">
            <div className="p-6 border-b border-notaire-100 bg-gradient-to-r from-notaire-50 to-white flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-serif italic text-2xl text-notaire-900">Documents</h2>
                <p className="text-xs font-medium text-notaire-500 mt-1">
                  {selectedTiersForDocs.nom} {selectedTiersForDocs.prenom}
                </p>
              </div>
              <button
                onClick={() => { setShowDocumentsModal(false); setSelectedTiersForDocs(null); }}
                className="p-2 hover:bg-notaire-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-notaire-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <DocumentManager tiersId={selectedTiersForDocs._id} title="Documents KYC & Pièces justificatives" />
            </div>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      {showKYCModal && selectedTiersForKYC && (
        <div className="fixed inset-0 bg-notaire-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-notaire-lg overflow-hidden">
            <div className="p-6 border-b border-notaire-100 bg-gradient-to-r from-notaire-50 to-white flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-serif italic text-2xl text-notaire-900">Vérification KYC</h2>
                <p className="text-xs font-medium text-notaire-500 mt-1">
                  {selectedTiersForKYC.nom} {selectedTiersForKYC.prenom} • {selectedTiersForKYC.type}
                </p>
              </div>
              <button
                onClick={() => { setShowKYCModal(false); setSelectedTiersForKYC(null); setTiersDocuments([]); }}
                className="p-2 hover:bg-notaire-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-notaire-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <KYCManager
                tiers={selectedTiersForKYC}
                documents={tiersDocuments}
                onStatusChange={handleKYCStatusChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
