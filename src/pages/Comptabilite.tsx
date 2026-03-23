import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Ecriture, Dossier } from "../types";
import { Calculator, ArrowUpRight, ArrowDownLeft, Plus, AlertCircle, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Comptabilite() {
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<string>("");
  const [solde, setSolde] = useState<string>("0.00");
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingEcriture, setEditingEcriture] = useState<Ecriture | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    dossierId: "",
    montant: "",
    sens: "CREDIT" as "DEBIT" | "CREDIT",
    libelle: "",
    categorie: "FONDS_CLIENTS"
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDossier) {
      loadSolde(selectedDossier);
      loadEcritures(selectedDossier);
    } else {
      setEcritures([]);
      setSolde("0.00");
    }
  }, [selectedDossier]);

  const loadData = async () => {
    try {
      const dossiersData = await api.get("/api/dossiers");
      setDossiers(dossiersData);
      if (dossiersData.length > 0) {
        setSelectedDossier(dossiersData[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSolde = async (id: string) => {
    try {
      const data = await api.get(`/api/dossiers/${id}/solde`);
      setSolde(data.solde);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEcritures = async (id: string) => {
    try {
      const data = await api.get(`/api/dossiers/${id}/ecritures`);
      setEcritures(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      dossierId: selectedDossier || "",
      montant: "",
      sens: "CREDIT",
      libelle: "",
      categorie: "FONDS_CLIENTS"
    });
    setEditMode(false);
    setEditingEcriture(null);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setFormData(prev => ({ ...prev, dossierId: selectedDossier }));
    setShowEntryModal(true);
  };

  const openEditModal = (e: Ecriture) => {
    setFormData({
      dossierId: e.dossierId,
      montant: parseFloat(e.montant.toString()).toFixed(2),
      sens: e.sens,
      libelle: e.libelle,
      categorie: e.categorie
    });
    setEditingEcriture(e);
    setEditMode(true);
    setShowEntryModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editMode && editingEcriture) {
        const updated = await api.put(`/api/ecritures/${editingEcriture._id}`, formData);
        setEcritures(ecritures.map(ec => ec._id === editingEcriture._id ? updated : ec));
      } else {
        const created = await api.post("/api/ecritures", formData);
        if (formData.dossierId === selectedDossier) {
          setEcritures([created, ...ecritures]);
        }
      }
      setShowEntryModal(false);
      if (formData.dossierId === selectedDossier) {
        loadSolde(selectedDossier);
      }
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
      await api.delete(`/api/ecritures/${id}`);
      setEcritures(ecritures.filter(e => e._id !== id));
      loadSolde(selectedDossier);
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

  const getDossierReference = (dossierId: string) => {
    const dossier = dossiers.find(d => d._id === dossierId);
    return dossier ? dossier.reference : dossierId;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-xl border border-notaire-100 p-5 flex items-center gap-4 shadow-notaire">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-notaire-100 to-notaire-50 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-notaire-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-notaire-500">Solde Dossier Sélectionné</p>
              <p className={`text-2xl font-serif italic ${parseFloat(solde) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {solde} €
              </p>
            </div>
          </div>

          <select
            value={selectedDossier}
            onChange={(e) => setSelectedDossier(e.target.value)}
            className="bg-white border-2 border-notaire-200 rounded-xl p-4 text-sm font-semibold text-notaire-900 focus:outline-none focus:border-notaire-500"
          >
            <option value="">Sélectionner un dossier...</option>
            {dossiers.map(d => (
              <option key={d._id} value={d._id}>{d.reference} - {d.objet.substring(0, 20)}...</option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          disabled={!selectedDossier}
          className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-notaire-800 to-notaire-700 text-white text-sm font-semibold rounded-xl hover:from-notaire-700 hover:to-notaire-600 shadow-notaire disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Écriture
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

      <div className="bg-white rounded-xl border border-notaire-100 shadow-notaire overflow-hidden">
        <div className="p-6 border-b border-notaire-100 bg-gradient-to-r from-notaire-50 to-white flex items-center justify-between">
          <h3 className="font-serif italic text-xl text-notaire-900">Grand Livre</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-notaire-500">Dossier:</span>
            <span className="text-xs font-semibold text-notaire-900 bg-notaire-100 px-3 py-1 rounded-lg">
              {selectedDossier ? getDossierReference(selectedDossier) : "Aucun"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[100px_1fr_120px_120px_120px_80px] border-b border-notaire-100 bg-notaire-50">
          <div className="p-4 text-xs font-semibold text-notaire-500">Date</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Libellé</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Catégorie</div>
          <div className="p-4 text-xs font-semibold text-notaire-500 text-right">Débit</div>
          <div className="p-4 text-xs font-semibold text-notaire-500 text-right">Crédit</div>
          <div className="p-4 text-xs font-semibold text-notaire-500">Actions</div>
        </div>

        <div className="divide-y divide-notaire-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="flex items-center justify-center gap-3 text-notaire-500">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">Chargement...</span>
              </div>
            </div>
          ) : !selectedDossier ? (
            <div className="p-12 text-center">
              <Calculator className="w-12 h-12 text-notaire-200 mx-auto mb-3" />
              <p className="text-sm text-notaire-400">Sélectionnez un dossier pour voir les écritures</p>
            </div>
          ) : ecritures.length === 0 ? (
            <div className="p-12 text-center">
              <Plus className="w-12 h-12 text-notaire-200 mx-auto mb-3" />
              <p className="text-sm text-notaire-400">Aucune écriture pour ce dossier</p>
            </div>
          ) : (
            ecritures.map((item) => (
              <div key={item._id} className="grid grid-cols-[100px_1fr_120px_120px_120px_80px] items-center hover:bg-notaire-50 transition-colors group">
                <div className="p-4 text-xs font-mono text-notaire-500">
                  {format(new Date(item.date), 'dd/MM/yy', { locale: fr })}
                </div>
                <div className="p-4 text-sm font-medium text-notaire-900 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.sens === 'CREDIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {item.sens === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  {item.libelle}
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-notaire-100 text-notaire-700">
                    {item.categorie}
                  </span>
                </div>
                <div className="p-4 text-sm font-mono text-right text-red-600">
                  {item.sens === 'DEBIT' ? `${parseFloat(item.montant.toString()).toFixed(2)} €` : "-"}
                </div>
                <div className="p-4 text-sm font-mono text-right text-emerald-600">
                  {item.sens === 'CREDIT' ? `${parseFloat(item.montant.toString()).toFixed(2)} €` : "-"}
                </div>
                <div className="p-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 hover:bg-notaire-100 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4 text-notaire-500" />
                  </button>
                  <button
                    onClick={() => { setDeletingId(item._id); setShowDeleteConfirm(true); }}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        {ecritures.length > 0 && (
          <div className="grid grid-cols-[100px_1fr_120px_120px_120px_80px] border-t border-notaire-200 bg-notaire-50">
            <div className="p-4"></div>
            <div className="p-4 text-sm font-bold text-notaire-900">Total</div>
            <div className="p-4"></div>
            <div className="p-4 text-sm font-mono text-right font-bold text-red-600">
              {ecritures.filter(e => e.sens === 'DEBIT').reduce((sum, e) => sum + parseFloat(e.montant.toString()), 0).toFixed(2)} €
            </div>
            <div className="p-4 text-sm font-mono text-right font-bold text-emerald-600">
              {ecritures.filter(e => e.sens === 'CREDIT').reduce((sum, e) => sum + parseFloat(e.montant.toString()), 0).toFixed(2)} €
            </div>
            <div className="p-4"></div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-notaire-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-notaire-lg overflow-hidden">
            <div className="p-6 border-b border-notaire-100 bg-gradient-to-r from-notaire-50 to-white flex items-center justify-between">
              <h2 className="font-serif italic text-2xl text-notaire-900">{editMode ? 'Modifier l\'Écriture' : 'Saisie Comptable'}</h2>
              <button onClick={() => { setShowEntryModal(false); resetForm(); }} className="p-2 hover:bg-notaire-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-notaire-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-notaire-700 mb-2">Dossier</label>
                <select
                  required
                  value={formData.dossierId}
                  onChange={(e) => setFormData({...formData, dossierId: e.target.value})}
                  className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                  disabled={editMode}
                >
                  <option value="">Sélectionner...</option>
                  {dossiers.map(d => <option key={d._id} value={d._id}>{d.reference}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Montant (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.montant}
                    onChange={(e) => setFormData({...formData, montant: e.target.value})}
                    className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm font-mono text-notaire-900 focus:outline-none focus:border-notaire-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-notaire-700 mb-2">Sens</label>
                  <div className="flex rounded-lg overflow-hidden border-2 border-notaire-200">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, sens: "CREDIT"})}
                      className={`flex-1 py-3 text-xs font-bold transition-colors ${formData.sens === 'CREDIT' ? 'bg-emerald-600 text-white' : 'bg-white text-notaire-600'}`}
                    >
                      Crédit
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, sens: "DEBIT"})}
                      className={`flex-1 py-3 text-xs font-bold transition-colors ${formData.sens === 'DEBIT' ? 'bg-red-600 text-white' : 'bg-white text-notaire-600'}`}
                    >
                      Débit
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-notaire-700 mb-2">Libellé de l'écriture</label>
                <input
                  type="text"
                  required
                  value={formData.libelle}
                  onChange={(e) => setFormData({...formData, libelle: e.target.value})}
                  className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                  placeholder="Ex: Provision sur frais..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-notaire-700 mb-2">Catégorie</label>
                <select
                  required
                  value={formData.categorie}
                  onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                  className="w-full bg-notaire-50 border-2 border-notaire-200 rounded-lg p-3 text-sm text-notaire-900 focus:outline-none focus:border-notaire-500"
                >
                  <option value="FONDS_CLIENTS">Fonds Clients</option>
                  <option value="HONORAIRES">Honoraires</option>
                  <option value="TAXES">Taxes</option>
                  <option value="DEBOURS">Débours</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <div className="pt-6 flex justify-end gap-4">
                <button type="button" onClick={() => { setShowEntryModal(false); resetForm(); }} className="px-6 py-3 rounded-lg border-2 border-notaire-200 text-sm font-semibold text-notaire-700 hover:bg-notaire-50 transition-colors">Annuler</button>
                <button type="submit" className="px-8 py-3 rounded-lg bg-gradient-to-r from-notaire-800 to-notaire-700 text-white text-sm font-semibold hover:from-notaire-700 hover:to-notaire-600 transition-all">
                  {editMode ? 'Enregistrer' : 'Valider l\'écriture'}
                </button>
              </div>
            </form>
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
                Êtes-vous sûr de vouloir supprimer cette écriture ? Cette action est irréversible.
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                Note: La suppression d'un crédit peut être refusée si elle rend le solde négatif.
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
    </div>
  );
}
