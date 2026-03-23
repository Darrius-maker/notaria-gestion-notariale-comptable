import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Dossier, Tiers, Ecriture, DossierStatut, Intervenant } from "../types";
import { Plus, Search, Filter, ChevronRight, X, Calculator, Calendar, Tag, ArrowUpRight, ArrowDownLeft, Pencil, Trash2, AlertCircle, ChevronDown } from "lucide-react";
import IntervenantsManager from "../components/IntervenantsManager";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import DocumentManager from "../components/DocumentManager";

interface IntervenantForm {
  tiersId: string;
  role: string;
  quotePart: number;
}

interface FormIntervenants {
  intervenants: Intervenant[];
}

type DateFilter = "all" | "today" | "week" | "month" | "custom";

export default function Dossiers() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [tiersList, setTiersList] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [solde, setSolde] = useState<string | null>(null);
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DossierStatut | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    reference: "",
    objet: "",
    statut: "OUVERT" as "OUVERT" | "SIGNE" | "ARCHIVE",
    intervenants: [] as Intervenant[]
  });

  useEffect(() => {
    loadDossiers();
    loadTiers();
  }, []);

  useEffect(() => {
    if (selectedDossier) {
      fetchDossierDetails(selectedDossier._id);
    } else {
      setSolde(null);
      setEcritures([]);
    }
  }, [selectedDossier]);

  const loadDossiers = async () => {
    try {
      const data = await api.get("/api/dossiers");
      setDossiers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTiers = async () => {
    try {
      const data = await api.get("/api/tiers");
      setTiersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDossierDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const [soldeData, ecrituresData] = await Promise.all([
        api.get(`/api/dossiers/${id}/solde`),
        api.get(`/api/dossiers/${id}/ecritures`)
      ]);
      setSolde(soldeData.solde);
      setEcritures(ecrituresData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const resetForm = () => {
    setFormData({
      reference: "",
      objet: "",
      statut: "OUVERT",
      intervenants: []
    });
    setEditMode(false);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (dossier: Dossier) => {
    setFormData({
      reference: dossier.reference,
      objet: dossier.objet,
      statut: dossier.statut,
      intervenants: dossier.intervenants
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setError("");
    try {
      // Convert Intervenant[] to API format
      const apiData = {
        ...formData,
        intervenants: formData.intervenants.map(int => ({
          tiersId: int.tiersId._id,
          role: int.role,
          quotePart: int.quotePart
        }))
      };

      if (editMode && selectedDossier) {
        const updated = await api.put(`/api/dossiers/${selectedDossier._id}`, apiData);
        setDossiers(dossiers.map(d => d._id === selectedDossier._id ? updated : d));
        setSelectedDossier(updated);
      } else {
        const created = await api.post("/api/dossiers", apiData);
        setDossiers([created, ...dossiers]);
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
    try {
      await api.delete(`/api/dossiers/${id}`);
      setDossiers(dossiers.filter(d => d._id !== id));
      if (selectedDossier?._id === id) {
        setSelectedDossier(null);
      }
      setShowDeleteConfirm(false);
      setDeletingId(null);
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de la suppression");
      } catch {
        setError("Erreur lors de la suppression");
      }
    }
  };

  
  // Filter logic
  const filteredDossiers = dossiers.filter(d => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesRef = d.reference.toLowerCase().includes(query);
      const matchesObjet = d.objet.toLowerCase().includes(query);
      const matchesIntervenant = d.intervenants.some(int =>
        int.tiersId.nom.toLowerCase().includes(query) ||
        (int.tiersId.prenom && int.tiersId.prenom.toLowerCase().includes(query))
      );
      if (!matchesRef && !matchesObjet && !matchesIntervenant) return false;
    }

    // Status filter
    if (statusFilter !== "ALL" && d.statut !== statusFilter) return false;

    // Date filter
    const dossierDate = new Date(d.createdAt);
    const now = new Date();

    switch (dateFilter) {
      case "today":
        if (!isAfter(dossierDate, startOfDay(now)) || !isBefore(dossierDate, endOfDay(now))) return false;
        break;
      case "week":
        if (!isAfter(dossierDate, subDays(now, 7))) return false;
        break;
      case "month":
        if (!isAfter(dossierDate, subMonths(now, 1))) return false;
        break;
      case "custom":
        if (customDateFrom && isBefore(dossierDate, new Date(customDateFrom))) return false;
        if (customDateTo && isAfter(dossierDate, endOfDay(new Date(customDateTo)))) return false;
        break;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDateFilter("all");
    setCustomDateFrom("");
    setCustomDateTo("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "ALL" || dateFilter !== "all";

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
            <input
              type="text"
              placeholder="RECHERCHER (REF, OBJET, CLIENT)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#141414] py-2 pl-9 pr-4 text-[10px] focus:outline-none w-72"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border text-[10px] uppercase tracking-widest font-bold transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                : 'border-[#141414] hover:bg-[#141414]/5'
            }`}
          >
            <Filter className="w-3 h-3" />
            Filtres
            {hasActiveFilters && (
              <span className="w-4 h-4 bg-indigo-600 text-white rounded-full text-[8px] flex items-center justify-center">
                {(statusFilter !== "ALL" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0) + (searchQuery ? 1 : 0)}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] uppercase tracking-widest font-bold text-red-600 hover:underline"
            >
              Effacer
            </button>
          )}
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-[#141414] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#141414]/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4" />
          Nouveau Dossier
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-[#141414] p-6 space-y-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-3">Statut</label>
                  <div className="flex flex-wrap gap-2">
                    {["ALL", "OUVERT", "SIGNE", "ARCHIVE"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status as DossierStatut | "ALL")}
                        className={`px-3 py-1.5 text-[9px] uppercase font-bold border transition-colors ${
                          statusFilter === status
                            ? status === "OUVERT" ? 'bg-emerald-600 text-white border-emerald-600' :
                              status === "SIGNE" ? 'bg-blue-600 text-white border-blue-600' :
                              status === "ARCHIVE" ? 'bg-gray-600 text-white border-gray-600' :
                              'bg-[#141414] text-white border-[#141414]'
                            : 'border-[#141414]/20 hover:border-[#141414]'
                        }`}
                      >
                        {status === "ALL" ? "Tous" : status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-3">Période</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "all", label: "Toutes" },
                      { value: "today", label: "Aujourd'hui" },
                      { value: "week", label: "7 jours" },
                      { value: "month", label: "30 jours" },
                      { value: "custom", label: "Personnalisé" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDateFilter(option.value as DateFilter)}
                        className={`px-3 py-1.5 text-[9px] uppercase font-bold border transition-colors ${
                          dateFilter === option.value
                            ? 'bg-[#141414] text-white border-[#141414]'
                            : 'border-[#141414]/20 hover:border-[#141414]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                {dateFilter === "custom" && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold opacity-40 mb-3">Dates</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="flex-1 bg-[#F5F5F5] border border-[#141414]/20 p-2 text-xs"
                      />
                      <span className="text-xs opacity-40 self-center">à</span>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="flex-1 bg-[#F5F5F5] border border-[#141414]/20 p-2 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#141414]/10">
                <p className="text-[10px] opacity-40">
                  {filteredDossiers.length} dossier{filteredDossiers.length > 1 ? 's' : ''} trouvé{filteredDossiers.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-[#141414]">
        <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_100px] border-b border-[#141414] bg-[#F5F5F5]">
          <div className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Ref</div>
          <div className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Objet</div>
          <div className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Date</div>
          <div className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Intervenants</div>
          <div className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Statut</div>
          <div className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Actions</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[10px] uppercase tracking-[0.2em] opacity-40">Chargement des données...</div>
        ) : filteredDossiers.length === 0 ? (
          <div className="p-12 text-center text-[10px] uppercase tracking-[0.2em] opacity-40 italic">
            {hasActiveFilters ? "Aucun dossier ne correspond aux filtres" : "Aucun dossier trouvé"}
          </div>
        ) : (
          <div className="divide-y divide-[#141414]/10">
            {filteredDossiers.map((d) => (
              <div
                key={d._id}
                className={`grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_100px] items-center hover:bg-[#F5F5F5] transition-colors group ${selectedDossier?._id === d._id ? 'bg-[#F5F5F5]' : ''}`}
              >
                <div
                  className="p-4 font-mono text-[11px] font-bold cursor-pointer"
                  onClick={() => setSelectedDossier(d)}
                >
                  {d.reference}
                </div>
                <div
                  className="p-4 text-xs font-semibold cursor-pointer"
                  onClick={() => setSelectedDossier(d)}
                >
                  {d.objet}
                </div>
                <div className="p-4 text-[10px] opacity-60">
                  {format(new Date(d.createdAt), 'dd MMM yyyy', { locale: fr })}
                </div>
                <div className="p-4">
                  <div className="flex -space-x-2">
                    {d.intervenants.slice(0, 3).map((int, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-[#141414] text-white border border-white flex items-center justify-center text-[8px] font-bold uppercase" title={int.tiersId.nom}>
                        {int.tiersId.nom.substring(0, 2)}
                      </div>
                    ))}
                    {d.intervenants.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-[#F5F5F5] border border-[#141414]/10 flex items-center justify-center text-[8px] font-bold">
                        +{d.intervenants.length - 3}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 border ${
                    d.statut === 'OUVERT' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    d.statut === 'SIGNE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    'bg-gray-50 text-gray-700 border-gray-100'
                  }`}>
                    {d.statut}
                  </span>
                </div>
                <div className="p-4 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedDossier(d); openEditModal(d); }}
                    className="p-2 hover:bg-[#141414]/10 rounded transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingId(d._id); setShowDeleteConfirm(true); }}
                    className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setSelectedDossier(d)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedDossier && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDossier(null)}
              className="fixed inset-0 bg-[#141414]/20 backdrop-blur-[2px] z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[450px] bg-white border-l border-[#141414] z-50 shadow-[-20px_0px_40px_rgba(0,0,0,0.05)] flex flex-col"
            >
              <div className="p-6 border-b border-[#141414] flex items-center justify-between bg-[#F5F5F5]">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1">Détails du dossier</p>
                  <h2 className="font-mono text-lg font-bold">{selectedDossier.reference}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(selectedDossier)}
                    className="p-2 hover:bg-[#141414]/10 rounded-full transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedDossier(null)}
                    className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Header Info */}
                <section className="space-y-4">
                  <h3 className="font-serif italic text-2xl leading-tight">{selectedDossier.objet}</h3>
                  <div className="flex flex-wrap gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border ${
                      selectedDossier.statut === 'OUVERT' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      selectedDossier.statut === 'SIGNE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-50 text-gray-700 border-gray-100'
                    }`}>
                      {selectedDossier.statut}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] border border-[#141414]/10 text-[10px] font-bold uppercase tracking-widest">
                      <Calendar className="w-3 h-3 opacity-40" />
                      {format(new Date(selectedDossier.createdAt), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                </section>

                {/* Accounting Summary */}
                <section className="bg-[#141414] text-white p-6 shadow-[8px_8px_0px_0px_rgba(20,20,20,0.1)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 opacity-60">
                      <Calculator className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Solde Actuel</span>
                    </div>
                    <Tag className="w-4 h-4 opacity-30" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif italic">
                      {loadingDetails ? "..." : solde || "0.00"}
                    </span>
                    <span className="text-sm opacity-60 font-mono">EUR</span>
                  </div>
                  <p className="mt-4 text-[9px] uppercase tracking-[0.2em] opacity-40">Fonds tiers disponibles</p>
                </section>

                {/* Bookkeeping Entries */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#141414] pb-2">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40">Dernières Écritures</h4>
                    <span className="text-[10px] font-mono opacity-40">{ecritures.length}</span>
                  </div>
                  <div className="space-y-2">
                    {loadingDetails ? (
                      <div className="text-[10px] uppercase opacity-40 italic py-4">Chargement des flux...</div>
                    ) : ecritures.length === 0 ? (
                      <div className="text-[10px] uppercase opacity-40 italic py-4">Aucune écriture enregistrée</div>
                    ) : (
                      ecritures.map((e) => (
                        <div key={e._id} className="flex items-center gap-3 p-3 bg-white border border-[#141414]/5">
                          <div className={`w-8 h-8 flex items-center justify-center ${e.sens === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {e.sens === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold truncate">{e.libelle}</p>
                            <p className="text-[9px] opacity-40 uppercase">{format(new Date(e.date), 'dd/MM/yy')}</p>
                          </div>
                          <div className={`text-right font-mono text-[11px] font-bold ${e.sens === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {e.sens === 'CREDIT' ? '+' : '-'}{parseFloat(e.montant.toString()).toFixed(2)}€
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Participants */}
                <section className="space-y-4">
                  <IntervenantsManager
                    intervenants={selectedDossier.intervenants}
                    tiersList={tiersList}
                    onChange={() => {}}
                    readOnly={true}
                  />
                </section>

                {/* Documents */}
                <section className="space-y-4 border-t border-[#141414]/10 pt-6">
                  <DocumentManager dossierId={selectedDossier._id} title="Documents du Dossier" />
                </section>

                {/* Actions */}
                <section className="pt-4 space-y-3">
                  <button className="w-full py-4 bg-[#141414] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#141414]/90 transition-colors">
                    Accéder au dossier complet
                  </button>
                  <button className="w-full py-4 border border-[#141414] text-[10px] uppercase tracking-widest font-bold hover:bg-[#F5F5F5] transition-colors">
                    Générer un état comptable
                  </button>
                  <button
                    onClick={() => { setDeletingId(selectedDossier._id); setShowDeleteConfirm(true); }}
                    className="w-full py-4 border border-red-200 text-red-600 text-[10px] uppercase tracking-widest font-bold hover:bg-red-50 transition-colors"
                  >
                    Supprimer ce dossier
                  </button>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#141414] w-full max-w-2xl shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
            <div className="p-6 border-b border-[#141414] flex items-center justify-between">
              <h2 className="font-serif italic text-2xl">{editMode ? 'Modifier le Dossier' : 'Nouveau Dossier'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">Référence</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                    placeholder="Ex: VENTE-2024-001"
                    disabled={editMode}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">Statut</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({...formData, statut: e.target.value as any})}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                  >
                    <option value="OUVERT">OUVERT</option>
                    <option value="SIGNE">SIGNÉ</option>
                    <option value="ARCHIVE">ARCHIVÉ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">Objet du dossier</label>
                <textarea
                  value={formData.objet}
                  onChange={(e) => setFormData({...formData, objet: e.target.value})}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs h-24"
                  placeholder="Description détaillée de l'acte..."
                ></textarea>
              </div>

              <IntervenantsManager
                intervenants={formData.intervenants}
                tiersList={tiersList}
                onChange={(newIntervenants) => setFormData({...formData, intervenants: newIntervenants})}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <p className="text-[11px] text-red-700 font-bold uppercase italic">{error}</p>
                </div>
              )}

              <div className="pt-6 flex justify-end gap-4">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-3 border border-[#141414] text-[10px] uppercase font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-[#141414] text-white text-[10px] uppercase font-bold"
                >
                  {editMode ? 'Enregistrer' : 'Créer le dossier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
            <div className="p-6 border-b border-[#141414]">
              <h2 className="font-serif italic text-xl text-red-600">Confirmer la suppression</h2>
            </div>
            <div className="p-6">
              <p className="text-sm mb-6">
                Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action supprimera également toutes les écritures associées et est irréversible.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
                  className="px-6 py-3 border border-[#141414] text-[10px] uppercase font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deletingId && handleDelete(deletingId)}
                  className="px-8 py-3 bg-red-600 text-white text-[10px] uppercase font-bold"
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
