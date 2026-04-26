import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Facture, Tiers, Dossier, BaremeEmolument, LigneType, ModePaiement } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Receipt, Plus, X, Search, Filter, Euro, CreditCard, Check, Clock,
  AlertCircle, FileText, Calculator, Trash2, Edit3, Eye, ChevronDown,
  ChevronRight, Banknote, Download, Send
} from "lucide-react";

export default function Facturation() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [tiers, setTiers] = useState<Tiers[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [baremes, setBaremes] = useState<BaremeEmolument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tiersId: "",
    dossierId: "",
    dateEcheance: "",
    notes: "",
    lignes: [{ description: "", type: "HONORAIRE" as LigneType, quantite: 1, prixUnitaire: "", tauxTVA: 20 }]
  });

  // Payment form
  const [paiementForm, setPaiementForm] = useState({
    montant: "",
    mode: "VIREMENT" as ModePaiement,
    reference: "",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd")
  });

  // Stats
  const [stats, setStats] = useState({
    totalFacture: "0",
    totalPaye: "0",
    totalEnAttente: "0",
    facturesEnRetard: 0,
    nombreFactures: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [facturesData, tiersData, dossiersData, baremesData, statsData] = await Promise.all([
        api.get("/api/factures"),
        api.get("/api/tiers"),
        api.get("/api/dossiers"),
        api.get("/api/baremes").catch(() => []),
        api.get("/api/factures/stats/summary").catch(() => stats)
      ]);
      setFactures(facturesData);
      setTiers(tiersData);
      setDossiers(dossiersData);
      setBaremes(baremesData);
      setStats(statsData);
    } catch (err) {
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFacture = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/factures", formData);
      setFactures([response, ...factures]);
      setShowCreateModal(false);
      resetForm();
      loadData(); // Reload stats
    } catch (err: any) {
      const msg = JSON.parse(err.message);
      setError(msg.error || "Erreur lors de la création");
    }
  };

  const handleAddPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacture) return;

    try {
      const response = await api.post(`/api/factures/${selectedFacture._id}/paiements`, paiementForm);
      setFactures(factures.map(f => f._id === response._id ? response : f));
      setSelectedFacture(response);
      setShowPaiementModal(false);
      setPaiementForm({ montant: "", mode: "VIREMENT", reference: "", notes: "", date: format(new Date(), "yyyy-MM-dd") });
      loadData(); // Reload stats
    } catch (err: any) {
      const msg = JSON.parse(err.message);
      setError(msg.error || "Erreur lors de l'ajout du paiement");
    }
  };

  const handleDeleteFacture = async (id: string) => {
    if (!confirm("Supprimer cette facture ?")) return;
    try {
      await api.delete(`/api/factures/${id}`);
      setFactures(factures.filter(f => f._id !== id));
      loadData();
    } catch (err: any) {
      const msg = JSON.parse(err.message);
      setError(msg.error || "Erreur lors de la suppression");
    }
  };

  const handleEnvoyerFacture = async (facture: Facture) => {
    try {
      const response = await api.put(`/api/factures/${facture._id}`, { statut: "ENVOYEE" });
      setFactures(factures.map(f => f._id === response._id ? response : f));
    } catch (err) {
      setError("Erreur lors de l'envoi");
    }
  };

  const resetForm = () => {
    setFormData({
      tiersId: "",
      dossierId: "",
      dateEcheance: "",
      notes: "",
      lignes: [{ description: "", type: "HONORAIRE", quantite: 1, prixUnitaire: "", tauxTVA: 20 }]
    });
  };

  const addLigne = () => {
    setFormData({
      ...formData,
      lignes: [...formData.lignes, { description: "", type: "HONORAIRE", quantite: 1, prixUnitaire: "", tauxTVA: 20 }]
    });
  };

  const removeLigne = (index: number) => {
    if (formData.lignes.length <= 1) return;
    setFormData({
      ...formData,
      lignes: formData.lignes.filter((_, i) => i !== index)
    });
  };

  const updateLigne = (index: number, field: string, value: any) => {
    const newLignes = [...formData.lignes];
    (newLignes[index] as any)[field] = value;
    setFormData({ ...formData, lignes: newLignes });
  };

  const calculateTotals = () => {
    let ht = 0, tva = 0, ttc = 0;
    formData.lignes.forEach(l => {
      const prix = parseFloat(l.prixUnitaire) || 0;
      const qty = l.quantite || 1;
      const ligneHT = prix * qty;
      const ligneTVA = ligneHT * (l.tauxTVA / 100);
      ht += ligneHT;
      tva += ligneTVA;
      ttc += ligneHT + ligneTVA;
    });
    return { ht: ht.toFixed(2), tva: tva.toFixed(2), ttc: ttc.toFixed(2) };
  };

  const getStatutStyle = (statut: string) => {
    switch (statut) {
      case "PAYEE": return "bg-emerald-50 text-emerald-700";
      case "PARTIELLEMENT_PAYEE": return "bg-blue-50 text-blue-700";
      case "ENVOYEE": return "bg-indigo-50 text-indigo-700";
      case "BROUILLON": return "bg-gray-50 text-gray-600";
      case "ANNULEE": return "bg-red-50 text-red-700";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  const filteredFactures = factures.filter(f => {
    const matchSearch = f.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tiersId.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatut = !filterStatut || f.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[10px] uppercase tracking-widest opacity-40">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif italic text-3xl mb-1">Facturation</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-40">Gestion des factures et honoraires</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#141414] text-white px-4 py-3 text-[10px] uppercase font-bold tracking-wider hover:bg-[#141414]/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Facture
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-3 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={() => setError("")} className="ml-auto" aria-label="Fermer le message d'erreur"><X className="w-4 h-4 text-red-600" /></button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#141414] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-[9px] uppercase tracking-widest opacity-40">Total Facturé</p>
          </div>
          <p className="text-2xl font-bold">{parseFloat(stats.totalFacture).toLocaleString('fr-FR')} XOF</p>
        </div>

        <div className="bg-white border border-[#141414] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-50 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[9px] uppercase tracking-widest opacity-40">Total Encaissé</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{parseFloat(stats.totalPaye).toLocaleString('fr-FR')} XOF</p>
        </div>

        <div className="bg-white border border-[#141414] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-[9px] uppercase tracking-widest opacity-40">En Attente</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{parseFloat(stats.totalEnAttente).toLocaleString('fr-FR')} XOF</p>
        </div>

        <div className="bg-white border border-[#141414] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-[9px] uppercase tracking-widest opacity-40">En Retard</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.facturesEnRetard}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
          <input
            type="text"
            placeholder="Rechercher par numéro ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#141414]/20 py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-[#141414]"
          />
        </div>
        <select
          aria-label="Filtrer par statut"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="bg-white border border-[#141414]/20 px-4 py-3 text-xs focus:outline-none focus:border-[#141414]"
        >
          <option value="">Tous les statuts</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="ENVOYEE">Envoyée</option>
          <option value="PARTIELLEMENT_PAYEE">Partiellement payée</option>
          <option value="PAYEE">Payée</option>
          <option value="ANNULEE">Annulée</option>
        </select>
      </div>

      {/* Factures List */}
      <div className="bg-white border border-[#141414]">
        <div className="border-b border-[#141414] p-4 flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-widest font-bold">
            Liste des Factures ({filteredFactures.length})
          </h2>
        </div>

        <div className="divide-y divide-[#141414]/10">
          {filteredFactures.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs opacity-40">Aucune facture</p>
            </div>
          ) : (
            filteredFactures.map((facture) => {
              const isOverdue = new Date(facture.dateEcheance) < new Date() &&
                facture.statut !== "PAYEE" && facture.statut !== "ANNULEE";

              return (
                <motion.div
                  key={facture._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 hover:bg-[#F5F5F5]/50 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{facture.numero}</p>
                        <span className={`text-[8px] uppercase font-bold px-2 py-0.5 ${getStatutStyle(facture.statut)}`}>
                          {facture.statut.replace('_', ' ')}
                        </span>
                        {isOverdue && (
                          <span className="text-[8px] uppercase font-bold px-2 py-0.5 bg-red-100 text-red-700">
                            En retard
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-60">
                        {facture.tiersId.nom} {facture.tiersId.prenom || ""} •
                        Émise le {format(new Date(facture.dateEmission), 'dd/MM/yyyy', { locale: fr })} •
                        Échéance {format(new Date(facture.dateEcheance), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>

                    <div className="text-right mr-4">
                      <p className="text-lg font-bold">{parseFloat(facture.totalTTC).toLocaleString('fr-FR')} XOF</p>
                      {facture.statut === "PARTIELLEMENT_PAYEE" && (
                        <p className="text-[9px] text-amber-600">
                          Reste: {parseFloat(facture.montantRestant).toLocaleString('fr-FR')} XOF
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelectedFacture(facture); setShowDetailModal(true); }}
                        className="p-2 hover:bg-[#141414]/5 transition-colors"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {facture.statut === "BROUILLON" && (
                        <button
                          onClick={() => handleEnvoyerFacture(facture)}
                          className="p-2 hover:bg-indigo-50 text-indigo-600 transition-colors"
                          title="Envoyer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {facture.statut !== "PAYEE" && facture.statut !== "ANNULEE" && (
                        <button
                          onClick={() => { setSelectedFacture(facture); setShowPaiementModal(true); }}
                          className="p-2 hover:bg-emerald-50 text-emerald-600 transition-colors"
                          title="Enregistrer paiement"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      {facture.statut === "BROUILLON" && (
                        <button
                          onClick={() => handleDeleteFacture(facture._id)}
                          className="p-2 hover:bg-red-50 text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-[#141414] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
            >
              <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-indigo-50">
                <h2 className="font-serif italic text-xl">Nouvelle Facture</h2>
                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
              </div>

              <form onSubmit={handleCreateFacture} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  {/* Client & Dossier */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="facturation-client" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Client *</label>
                      <select
                        id="facturation-client"
                        value={formData.tiersId}
                        onChange={(e) => setFormData({ ...formData, tiersId: e.target.value })}
                        required
                        className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                      >
                        <option value="">Sélectionner un client</option>
                        {tiers.map(t => (
                          <option key={t._id} value={t._id}>{t.nom} {t.prenom || ""}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="facturation-dossier" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Dossier (optionnel)</label>
                      <select
                        id="facturation-dossier"
                        value={formData.dossierId}
                        onChange={(e) => setFormData({ ...formData, dossierId: e.target.value })}
                        className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                      >
                        <option value="">Aucun dossier</option>
                        {dossiers.map(d => (
                          <option key={d._id} value={d._id}>{d.reference}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="facturation-dateEcheance" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Date d'échéance *</label>
                    <input
                      id="facturation-dateEcheance"
                      type="date"
                      value={formData.dateEcheance}
                      onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                      required
                      className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                    />
                  </div>

                  {/* Lignes de facture */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] uppercase font-bold opacity-40">Lignes de facture</label>
                      <button
                        type="button"
                        onClick={addLigne}
                        className="text-[9px] uppercase font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        + Ajouter une ligne
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.lignes.map((ligne, index) => (
                        <div key={index} className="bg-[#F5F5F5] border border-[#141414]/10 p-4">
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-5">
                              <label htmlFor={`ligne-description-${index}`} className="block text-[8px] uppercase opacity-40 mb-1">Description</label>
                              <input
                                id={`ligne-description-${index}`}
                                type="text"
                                value={ligne.description}
                                onChange={(e) => updateLigne(index, 'description', e.target.value)}
                                required
                                placeholder="Description de la prestation"
                                className="w-full bg-white border border-[#141414]/20 p-2 text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <label htmlFor={`ligne-type-${index}`} className="block text-[8px] uppercase opacity-40 mb-1">Type</label>
                              <select
                                id={`ligne-type-${index}`}
                                value={ligne.type}
                                onChange={(e) => updateLigne(index, 'type', e.target.value)}
                                className="w-full bg-white border border-[#141414]/20 p-2 text-xs"
                              >
                                <option value="HONORAIRE">Honoraire</option>
                                <option value="EMOLUMENT">Émolument</option>
                                <option value="DEBOURS">Débours</option>
                                <option value="TAXE">Taxe</option>
                              </select>
                            </div>
                            <div className="col-span-1">
                              <label htmlFor={`ligne-quantite-${index}`} className="block text-[8px] uppercase opacity-40 mb-1">Qté</label>
                              <input
                                id={`ligne-quantite-${index}`}
                                type="number"
                                value={ligne.quantite}
                                onChange={(e) => updateLigne(index, 'quantite', parseInt(e.target.value))}
                                min="1"
                                className="w-full bg-white border border-[#141414]/20 p-2 text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <label htmlFor={`ligne-prix-${index}`} className="block text-[8px] uppercase opacity-40 mb-1">Prix HT</label>
                              <input
                                id={`ligne-prix-${index}`}
                                type="number"
                                value={ligne.prixUnitaire}
                                onChange={(e) => updateLigne(index, 'prixUnitaire', e.target.value)}
                                required
                                step="0.01"
                                placeholder="0.00"
                                className="w-full bg-white border border-[#141414]/20 p-2 text-xs"
                              />
                            </div>
                            <div className="col-span-1">
                              <label htmlFor={`ligne-tva-${index}`} className="block text-[8px] uppercase opacity-40 mb-1">TVA %</label>
                              <input
                                id={`ligne-tva-${index}`}
                                type="number"
                                value={ligne.tauxTVA}
                                onChange={(e) => updateLigne(index, 'tauxTVA', parseFloat(e.target.value))}
                                className="w-full bg-white border border-[#141414]/20 p-2 text-xs"
                              />
                            </div>
                            <div className="col-span-1 flex items-end pb-2">
                              {formData.lignes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLigne(index)}
                                  className="p-1.5 text-red-600 hover:bg-red-50"
                                  aria-label="Supprimer la ligne"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-[#141414] text-white p-4">
                    <div className="flex justify-end">
                      <div className="text-right space-y-1">
                        <p className="text-[10px] uppercase opacity-60">Total HT: <span className="font-bold text-sm ml-2">{totals.ht} XOF</span></p>
                        <p className="text-[10px] uppercase opacity-60">TVA: <span className="font-bold text-sm ml-2">{totals.tva} XOF</span></p>
                        <p className="text-xs uppercase">Total TTC: <span className="font-bold text-xl ml-2">{totals.ttc} XOF</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">Notes (optionnel)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                      placeholder="Notes ou informations complémentaires..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#141414]/10">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                    className="px-4 py-2 border border-[#141414] text-[10px] uppercase font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#141414] text-white text-[10px] uppercase font-bold"
                  >
                    Créer la facture
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedFacture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-[#141414] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
            >
              <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="font-serif italic text-xl">{selectedFacture.numero}</h2>
                  <p className="text-[10px] uppercase opacity-40">
                    {selectedFacture.tiersId.nom} {selectedFacture.tiersId.prenom || ""}
                  </p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                {/* Status & Dates */}
                <div className="flex items-center gap-4 mb-6">
                  <span className={`text-[9px] uppercase font-bold px-3 py-1 ${getStatutStyle(selectedFacture.statut)}`}>
                    {selectedFacture.statut.replace('_', ' ')}
                  </span>
                  <span className="text-xs opacity-60">
                    Émise le {format(new Date(selectedFacture.dateEmission), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                  <span className="text-xs opacity-60">
                    Échéance: {format(new Date(selectedFacture.dateEcheance), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>

                {/* Lines */}
                <div className="border border-[#141414]/10 mb-6">
                  <div className="bg-[#F5F5F5] p-3 border-b border-[#141414]/10">
                    <p className="text-[10px] uppercase font-bold">Détail des prestations</p>
                  </div>
                  <div className="divide-y divide-[#141414]/10">
                    {selectedFacture.lignes.map((ligne, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm">{ligne.description}</p>
                          <p className="text-[9px] opacity-40">{ligne.type} • Qté: {ligne.quantite}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{parseFloat(ligne.montantTTC).toFixed(2)} XOF TTC</p>
                          <p className="text-[9px] opacity-40">{parseFloat(ligne.montantHT).toFixed(2)} XOF HT + {ligne.tauxTVA}% TVA</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-[#141414] text-white p-4 mb-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase opacity-60">Montant payé</p>
                      <p className="text-lg font-bold text-emerald-400">{parseFloat(selectedFacture.montantPaye).toFixed(2)} XOF</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase opacity-60">Total HT: {parseFloat(selectedFacture.totalHT).toFixed(2)} XOF</p>
                      <p className="text-[10px] uppercase opacity-60">TVA: {parseFloat(selectedFacture.totalTVA).toFixed(2)} XOF</p>
                      <p className="text-xl font-bold">{parseFloat(selectedFacture.totalTTC).toFixed(2)} XOF TTC</p>
                      {parseFloat(selectedFacture.montantRestant) > 0 && (
                        <p className="text-[10px] uppercase text-amber-400">Reste à payer: {parseFloat(selectedFacture.montantRestant).toFixed(2)} XOF</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payments History */}
                {selectedFacture.paiements.length > 0 && (
                  <div className="border border-[#141414]/10">
                    <div className="bg-emerald-50 p-3 border-b border-[#141414]/10">
                      <p className="text-[10px] uppercase font-bold text-emerald-700">Historique des paiements</p>
                    </div>
                    <div className="divide-y divide-[#141414]/10">
                      {selectedFacture.paiements.map((p, i) => (
                        <div key={i} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{parseFloat(p.montant).toFixed(2)} XOF</p>
                              <p className="text-[9px] opacity-40">
                                {format(new Date(p.date), 'dd/MM/yyyy', { locale: fr })} • {p.mode}
                                {p.reference && ` • Réf: ${p.reference}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedFacture.statut !== "PAYEE" && selectedFacture.statut !== "ANNULEE" && (
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => { setShowDetailModal(false); setShowPaiementModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[10px] uppercase font-bold"
                    >
                      <CreditCard className="w-4 h-4" />
                      Enregistrer un paiement
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaiementModal && selectedFacture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-[#141414] w-full max-w-md shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
            >
              <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-emerald-50">
                <div>
                  <h2 className="font-serif italic text-lg">Enregistrer un paiement</h2>
                  <p className="text-[10px] uppercase opacity-40">{selectedFacture.numero}</p>
                </div>
                <button onClick={() => setShowPaiementModal(false)} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
              </div>

              <form onSubmit={handleAddPaiement} className="p-6 space-y-4">
                <div className="bg-[#F5F5F5] p-3 border border-[#141414]/10">
                  <p className="text-[10px] uppercase opacity-40">Reste à payer</p>
                  <p className="text-2xl font-bold">{parseFloat(selectedFacture.montantRestant).toFixed(2)} XOF</p>
                </div>

                <div>
                  <label htmlFor="facturation-paiement-montant" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Montant *</label>
                  <input
                    id="facturation-paiement-montant"
                    type="number"
                    value={paiementForm.montant}
                    onChange={(e) => setPaiementForm({ ...paiementForm, montant: e.target.value })}
                    required
                    step="0.01"
                    max={parseFloat(selectedFacture.montantRestant)}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="facturation-paiement-mode" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Mode de paiement *</label>
                    <select
                      id="facturation-paiement-mode"
                      value={paiementForm.mode}
                      onChange={(e) => setPaiementForm({ ...paiementForm, mode: e.target.value as ModePaiement })}
                      className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                    >
                      <option value="VIREMENT">Virement</option>
                      <option value="CHEQUE">Chèque</option>
                      <option value="CB">Carte bancaire</option>
                      <option value="ESPECES">Espèces</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="facturation-paiement-date" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Date</label>
                    <input
                      id="facturation-paiement-date"
                      type="date"
                      value={paiementForm.date}
                      onChange={(e) => setPaiementForm({ ...paiementForm, date: e.target.value })}
                      className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">Référence (optionnel)</label>
                  <input
                    type="text"
                    value={paiementForm.reference}
                    onChange={(e) => setPaiementForm({ ...paiementForm, reference: e.target.value })}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                    placeholder="N° de chèque, référence virement..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaiementModal(false)}
                    className="px-4 py-2 border border-[#141414] text-[10px] uppercase font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-600 text-white text-[10px] uppercase font-bold"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
