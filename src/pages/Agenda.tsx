import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Dossier, Tiers } from "../types";
import { Plus, Calendar, Clock, MapPin, Users, X, AlertCircle, ChevronLeft, ChevronRight, Pencil, Trash2, Check } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { fr } from "date-fns/locale";

interface Participant {
  tiersId: { _id: string; nom: string; prenom?: string; email: string };
  present: boolean;
}

interface RendezVous {
  _id: string;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  type: "SIGNATURE" | "CONSULTATION" | "REUNION" | "ECHEANCE" | "AUTRE";
  dossierId?: { _id: string; reference: string; objet: string };
  participants: Participant[];
  lieu?: string;
  statut: "PLANIFIE" | "CONFIRME" | "TERMINE" | "ANNULE";
  notes?: string;
}

const TYPE_COLORS: Record<string, string> = {
  SIGNATURE: "bg-indigo-600",
  CONSULTATION: "bg-emerald-600",
  REUNION: "bg-amber-600",
  ECHEANCE: "bg-red-600",
  AUTRE: "bg-gray-600"
};

const TYPE_LABELS: Record<string, string> = {
  SIGNATURE: "Signature",
  CONSULTATION: "Consultation",
  REUNION: "Réunion",
  ECHEANCE: "Échéance",
  AUTRE: "Autre"
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  CONFIRME: "Confirmé",
  TERMINE: "Terminé",
  ANNULE: "Annulé"
};

export default function Agenda() {
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [tiersList, setTiersList] = useState<Tiers[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    dateDebut: "",
    heureDebut: "09:00",
    dateFin: "",
    heureFin: "10:00",
    type: "CONSULTATION" as RendezVous["type"],
    dossierId: "",
    participants: [] as string[],
    lieu: "",
    statut: "PLANIFIE" as RendezVous["statut"],
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const [rdvData, dossiersData, tiersData] = await Promise.all([
        api.get(`/api/rendez-vous?start=${start.toISOString()}&end=${end.toISOString()}`),
        api.get("/api/dossiers"),
        api.get("/api/tiers")
      ]);

      setRendezVous(rdvData);
      setDossiers(dossiersData);
      setTiersList(tiersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setFormData({
      titre: "",
      description: "",
      dateDebut: today,
      heureDebut: "09:00",
      dateFin: today,
      heureFin: "10:00",
      type: "CONSULTATION",
      dossierId: "",
      participants: [],
      lieu: "",
      statut: "PLANIFIE",
      notes: ""
    });
    setEditMode(false);
    setError("");
  };

  const openCreateModal = (date?: Date) => {
    resetForm();
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      setFormData(prev => ({ ...prev, dateDebut: dateStr, dateFin: dateStr }));
    }
    setShowModal(true);
  };

  const openEditModal = (rdv: RendezVous) => {
    const dateDebut = new Date(rdv.dateDebut);
    const dateFin = new Date(rdv.dateFin);

    setFormData({
      titre: rdv.titre,
      description: rdv.description || "",
      dateDebut: format(dateDebut, "yyyy-MM-dd"),
      heureDebut: format(dateDebut, "HH:mm"),
      dateFin: format(dateFin, "yyyy-MM-dd"),
      heureFin: format(dateFin, "HH:mm"),
      type: rdv.type,
      dossierId: rdv.dossierId?._id || "",
      participants: rdv.participants.map(p => p.tiersId._id),
      lieu: rdv.lieu || "",
      statut: rdv.statut,
      notes: rdv.notes || ""
    });
    setEditMode(true);
    setSelectedRdv(rdv);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setError("");

    const dateDebut = new Date(`${formData.dateDebut}T${formData.heureDebut}`);
    const dateFin = new Date(`${formData.dateFin}T${formData.heureFin}`);

    const payload = {
      titre: formData.titre,
      description: formData.description,
      dateDebut,
      dateFin,
      type: formData.type,
      dossierId: formData.dossierId || null,
      participants: formData.participants.map(id => ({ tiersId: id, present: false })),
      lieu: formData.lieu,
      statut: formData.statut,
      notes: formData.notes
    };

    try {
      if (editMode && selectedRdv) {
        const updated = await api.put(`/api/rendez-vous/${selectedRdv._id}`, payload);
        setRendezVous(rendezVous.map(r => r._id === selectedRdv._id ? updated : r));
      } else {
        const created = await api.post("/api/rendez-vous", payload);
        setRendezVous([...rendezVous, created]);
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

  const handleDelete = async () => {
    if (!selectedRdv) return;
    try {
      await api.delete(`/api/rendez-vous/${selectedRdv._id}`);
      setRendezVous(rendezVous.filter(r => r._id !== selectedRdv._id));
      setShowDeleteConfirm(false);
      setSelectedRdv(null);
    } catch (err) {
      setError("Erreur lors de la suppression");
    }
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getRdvsForDay = (day: Date) => {
    return rendezVous.filter(rdv => isSameDay(new Date(rdv.dateDebut), day));
  };

  const dayRdvs = selectedDate ? getRdvsForDay(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 border border-[#141414] hover:bg-[#141414]/5"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-serif italic text-2xl min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 border border-[#141414] hover:bg-[#141414]/5"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-[10px] uppercase font-bold text-indigo-600 hover:underline"
          >
            Aujourd'hui
          </button>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-6 py-3 bg-[#141414] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#141414]/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4" />
          Nouveau RDV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="col-span-2 bg-white border border-[#141414]">
          {/* Week days header */}
          <div className="grid grid-cols-7 border-b border-[#141414] bg-[#F5F5F5]">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
              <div key={day} className="p-3 text-center text-[10px] uppercase font-bold opacity-40">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayRdvsList = getRdvsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[100px] p-2 border-b border-r border-[#141414]/10 cursor-pointer transition-colors ${
                    !isCurrentMonth ? 'bg-[#F5F5F5]/50 opacity-40' :
                    isSelected ? 'bg-indigo-50' :
                    isToday(day) ? 'bg-amber-50' :
                    'hover:bg-[#F5F5F5]'
                  }`}
                >
                  <div className={`text-xs font-bold mb-1 ${
                    isToday(day) ? 'text-amber-600' : ''
                  }`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayRdvsList.slice(0, 3).map(rdv => (
                      <div
                        key={rdv._id}
                        onClick={(e) => { e.stopPropagation(); setSelectedRdv(rdv); }}
                        className={`text-[8px] px-1.5 py-0.5 text-white truncate ${TYPE_COLORS[rdv.type]} ${
                          rdv.statut === "ANNULE" ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        {format(new Date(rdv.dateDebut), "HH:mm")} {rdv.titre}
                      </div>
                    ))}
                    {dayRdvsList.length > 3 && (
                      <div className="text-[8px] opacity-40 text-center">
                        +{dayRdvsList.length - 3} autres
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          <div className="bg-white border border-[#141414] p-4">
            <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-4">
              {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : "Sélectionnez une date"}
            </h3>

            {selectedDate && (
              <>
                {dayRdvs.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 mx-auto opacity-20 mb-2" />
                    <p className="text-[10px] opacity-40 italic">Aucun rendez-vous</p>
                    <button
                      onClick={() => openCreateModal(selectedDate)}
                      className="mt-4 text-[10px] uppercase font-bold text-indigo-600 hover:underline"
                    >
                      + Ajouter un RDV
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayRdvs.map(rdv => (
                      <div
                        key={rdv._id}
                        onClick={() => setSelectedRdv(rdv)}
                        className={`p-3 border cursor-pointer hover:shadow-md transition-shadow ${
                          rdv.statut === "ANNULE" ? 'opacity-50 border-gray-200' : 'border-[#141414]/10'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 mt-1.5 rounded-full ${TYPE_COLORS[rdv.type]}`} />
                          <div className="flex-1">
                            <p className={`text-xs font-bold ${rdv.statut === "ANNULE" ? 'line-through' : ''}`}>
                              {rdv.titre}
                            </p>
                            <p className="text-[10px] opacity-60">
                              {format(new Date(rdv.dateDebut), "HH:mm")} - {format(new Date(rdv.dateFin), "HH:mm")}
                            </p>
                            {rdv.dossierId && (
                              <p className="text-[9px] text-indigo-600 mt-1">{rdv.dossierId.reference}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Selected RDV Details */}
          {selectedRdv && (
            <div className="bg-white border border-[#141414] p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`text-[8px] px-2 py-0.5 text-white ${TYPE_COLORS[selectedRdv.type]}`}>
                    {TYPE_LABELS[selectedRdv.type]}
                  </span>
                  <h3 className="font-serif italic text-lg mt-2">{selectedRdv.titre}</h3>
                </div>
                <button onClick={() => setSelectedRdv(null)} aria-label="Fermer les détails">
                  <X className="w-4 h-4 opacity-40 hover:opacity-100" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 opacity-60">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(selectedRdv.dateDebut), "EEEE d MMMM yyyy", { locale: fr })}
                  <br />
                  {format(new Date(selectedRdv.dateDebut), "HH:mm")} - {format(new Date(selectedRdv.dateFin), "HH:mm")}
                </div>

                {selectedRdv.lieu && (
                  <div className="flex items-center gap-2 opacity-60">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedRdv.lieu}
                  </div>
                )}

                {selectedRdv.participants.length > 0 && (
                  <div className="flex items-start gap-2 opacity-60">
                    <Users className="w-3.5 h-3.5 mt-0.5" />
                    <div>
                      {selectedRdv.participants.map((p, i) => (
                        <div key={i}>{p.tiersId.nom} {p.tiersId.prenom}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#141414]/10">
                  <span className={`text-[9px] px-2 py-1 border ${
                    selectedRdv.statut === "CONFIRME" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    selectedRdv.statut === "TERMINE" ? "bg-blue-50 text-blue-700 border-blue-100" :
                    selectedRdv.statut === "ANNULE" ? "bg-red-50 text-red-700 border-red-100" :
                    "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {STATUS_LABELS[selectedRdv.statut]}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-[#141414]/10">
                <button
                  onClick={() => openEditModal(selectedRdv)}
                  className="flex-1 py-2 border border-[#141414] text-[9px] uppercase font-bold hover:bg-[#141414]/5"
                >
                  <Pencil className="w-3 h-3 inline mr-1" /> Modifier
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2 border border-red-200 text-red-600 text-[9px] uppercase font-bold hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" /> Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#141414] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
            <div className="p-6 border-b border-[#141414] flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-serif italic text-2xl">{editMode ? "Modifier le RDV" : "Nouveau Rendez-vous"}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label htmlFor="agenda-titre" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Titre</label>
                <input
                  id="agenda-titre"
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                  placeholder="Ex: Signature acte de vente"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="agenda-type" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Type</label>
                  <select
                    id="agenda-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="agenda-statut" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Statut</label>
                  <select
                    id="agenda-statut"
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="agenda-date-debut" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Date début</label>
                  <div className="flex gap-2">
                    <input
                      id="agenda-date-debut"
                      type="date"
                      value={formData.dateDebut}
                      onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                      className="flex-1 bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                    />
                    <input
                      id="agenda-heure-debut"
                      type="time"
                      aria-label="Heure de début"
                      value={formData.heureDebut}
                      onChange={(e) => setFormData({ ...formData, heureDebut: e.target.value })}
                      className="w-24 bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="agenda-date-fin" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Date fin</label>
                  <div className="flex gap-2">
                    <input
                      id="agenda-date-fin"
                      type="date"
                      value={formData.dateFin}
                      onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                      className="flex-1 bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                    />
                    <input
                      id="agenda-heure-fin"
                      type="time"
                      aria-label="Heure de fin"
                      value={formData.heureFin}
                      onChange={(e) => setFormData({ ...formData, heureFin: e.target.value })}
                      className="w-24 bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="agenda-dossier" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Dossier associé</label>
                <select
                  id="agenda-dossier"
                  value={formData.dossierId}
                  onChange={(e) => setFormData({ ...formData, dossierId: e.target.value })}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                >
                  <option value="">Aucun dossier</option>
                  {dossiers.map(d => (
                    <option key={d._id} value={d._id}>{d.reference} - {d.objet.substring(0, 30)}...</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="agenda-participants" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Participants</label>
                <select
                  id="agenda-participants"
                  multiple
                  value={formData.participants}
                  onChange={(e) => setFormData({
                    ...formData,
                    participants: Array.from((e.target as HTMLSelectElement).selectedOptions, o => o.value)
                  })}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs h-24"
                >
                  {tiersList.map(t => (
                    <option key={t._id} value={t._id}>{t.nom} {t.prenom}</option>
                  ))}
                </select>
                <p className="text-[9px] opacity-40 mt-1">Ctrl+clic pour sélectionner plusieurs participants</p>
              </div>
              <div>
                <label htmlFor="agenda-lieu" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Lieu</label>
                <input
                  id="agenda-lieu"
                  type="text"
                  value={formData.lieu}
                  onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs"
                  placeholder="Ex: Bureau du notaire"
                />
              </div>

              <div>
                <label htmlFor="agenda-notes" className="block text-[10px] uppercase font-bold opacity-40 mb-2">Notes</label>
                <textarea
                  id="agenda-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-xs h-20"
                  placeholder="Notes internes..."
                />
              </div>

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
                  {editMode ? "Enregistrer" : "Créer le RDV"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
            <div className="p-6 border-b border-[#141414]">
              <h2 className="font-serif italic text-xl text-red-600">Supprimer le rendez-vous</h2>
            </div>
            <div className="p-6">
              <p className="text-sm mb-6">Êtes-vous sûr de vouloir supprimer ce rendez-vous ?</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 border border-[#141414] text-[10px] uppercase font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
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
