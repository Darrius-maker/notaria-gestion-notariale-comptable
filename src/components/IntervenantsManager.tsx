import { useState, useEffect } from "react";
import { Tiers, Intervenant } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, X, UserPlus, Trash2, AlertCircle, Check,
  User, Building2, Percent, ChevronDown, ChevronUp, Edit3
} from "lucide-react";

// Rôles disponibles avec descriptions
const ROLES_DISPONIBLES = [
  { value: "VENDEUR", label: "Vendeur", description: "Partie cédante du bien", categorie: "PARTIE" },
  { value: "ACQUEREUR", label: "Acquéreur", description: "Partie acquérant le bien", categorie: "PARTIE" },
  { value: "DONATEUR", label: "Donateur", description: "Partie effectuant la donation", categorie: "PARTIE" },
  { value: "DONATAIRE", label: "Donataire", description: "Partie bénéficiaire de la donation", categorie: "PARTIE" },
  { value: "EMPRUNTEUR", label: "Emprunteur", description: "Partie contractant le prêt", categorie: "PARTIE" },
  { value: "CAUTION", label: "Caution", description: "Garant de l'emprunt", categorie: "PARTIE" },
  { value: "MANDANT", label: "Mandant", description: "Partie donnant procuration", categorie: "PARTIE" },
  { value: "MANDATAIRE", label: "Mandataire", description: "Partie recevant procuration", categorie: "PARTIE" },
  { value: "HERITIER", label: "Héritier", description: "Bénéficiaire de la succession", categorie: "PARTIE" },
  { value: "CONJOINT", label: "Conjoint", description: "Époux/Épouse d'une partie", categorie: "PARTIE" },
  { value: "USUFRUITIER", label: "Usufruitier", description: "Titulaire de l'usufruit", categorie: "PARTIE" },
  { value: "NU_PROPRIETAIRE", label: "Nu-propriétaire", description: "Titulaire de la nue-propriété", categorie: "PARTIE" },
  { value: "BANQUE", label: "Banque", description: "Établissement prêteur", categorie: "TIERS" },
  { value: "AGENT_IMMOBILIER", label: "Agent immobilier", description: "Intermédiaire de la transaction", categorie: "TIERS" },
  { value: "SYNDIC", label: "Syndic", description: "Gestionnaire de copropriété", categorie: "TIERS" },
  { value: "GEOMETRE", label: "Géomètre", description: "Expert en bornage/division", categorie: "TIERS" },
  { value: "EXPERT", label: "Expert", description: "Expert technique", categorie: "TIERS" },
  { value: "TEMOIN", label: "Témoin", description: "Témoin de l'acte", categorie: "TIERS" },
  { value: "AUTRE", label: "Autre", description: "Autre intervenant", categorie: "AUTRE" }
];

interface IntervenantsManagerProps {
  intervenants: Intervenant[];
  tiersList: Tiers[];
  onChange: (intervenants: Intervenant[]) => void;
  readOnly?: boolean;
}

export default function IntervenantsManager({
  intervenants,
  tiersList,
  onChange,
  readOnly = false
}: IntervenantsManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    tiersId: "",
    role: "",
    quotePart: 100
  });

  const totalQuoteParts = intervenants.reduce((sum, i) => sum + (i.quotePart || 0), 0);

  const handleAdd = () => {
    if (!formData.tiersId || !formData.role) {
      setError("Veuillez sélectionner un tiers et un rôle");
      return;
    }

    // Vérifier si le tiers est déjà intervenant avec ce rôle
    const exists = intervenants.some(
      i => i.tiersId._id === formData.tiersId && i.role === formData.role
    );
    if (exists) {
      setError("Ce tiers a déjà ce rôle dans le dossier");
      return;
    }

    const selectedTiers = tiersList.find(t => t._id === formData.tiersId);
    if (!selectedTiers) return;

    const newIntervenant: Intervenant = {
      tiersId: selectedTiers,
      role: formData.role,
      quotePart: formData.quotePart
    };

    if (editIndex !== null) {
      const updated = [...intervenants];
      updated[editIndex] = newIntervenant;
      onChange(updated);
    } else {
      onChange([...intervenants, newIntervenant]);
    }

    resetForm();
  };

  const handleRemove = (index: number) => {
    onChange(intervenants.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number) => {
    const intervenant = intervenants[index];
    setFormData({
      tiersId: intervenant.tiersId._id,
      role: intervenant.role,
      quotePart: intervenant.quotePart || 0
    });
    setEditIndex(index);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({ tiersId: "", role: "", quotePart: 100 });
    setShowAddModal(false);
    setEditIndex(null);
    setError("");
  };

  const getRoleInfo = (roleValue: string) => {
    return ROLES_DISPONIBLES.find(r => r.value === roleValue);
  };

  const groupedIntervenants = {
    PARTIE: intervenants.filter(i => getRoleInfo(i.role)?.categorie === "PARTIE"),
    TIERS: intervenants.filter(i => getRoleInfo(i.role)?.categorie === "TIERS"),
    AUTRE: intervenants.filter(i => !getRoleInfo(i.role) || getRoleInfo(i.role)?.categorie === "AUTRE")
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 opacity-40" />
          <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-40">
            Intervenants ({intervenants.length})
          </h3>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-[9px] uppercase font-bold text-indigo-600 hover:text-indigo-800"
          >
            <UserPlus className="w-3 h-3" />
            Ajouter
          </button>
        )}
      </div>

      {/* Quote-parts indicator */}
      {intervenants.length > 0 && (
        <div className="bg-[#F5F5F5] p-3 border border-[#141414]/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] uppercase opacity-40">Répartition des quote-parts</p>
            <p className={`text-[10px] font-bold ${totalQuoteParts === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {totalQuoteParts}%
            </p>
          </div>
          <div className="h-2 bg-white border border-[#141414]/10 overflow-hidden flex">
            {intervenants.map((intervenant, index) => {
              const colors = [
                'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
                'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500'
              ];
              return (
                <div
                  key={index}
                  className={`${colors[index % colors.length]} transition-all`}
                  style={{ width: `${intervenant.quotePart}%` }}
                  title={`${intervenant.tiersId.nom}: ${intervenant.quotePart}%`}
                />
              );
            })}
          </div>
          {totalQuoteParts !== 100 && (
            <p className="text-[8px] text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Le total des quote-parts devrait être de 100%
            </p>
          )}
        </div>
      )}

      {/* Grouped List */}
      {intervenants.length === 0 ? (
        <div className="bg-[#F5F5F5] p-6 text-center border border-dashed border-[#141414]/20">
          <Users className="w-6 h-6 mx-auto mb-2 opacity-20" />
          <p className="text-[10px] uppercase opacity-40">Aucun intervenant</p>
          {!readOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-[9px] uppercase font-bold text-indigo-600"
            >
              + Ajouter un intervenant
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Parties principales */}
          {groupedIntervenants.PARTIE.length > 0 && (
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-30 mb-2">Parties à l'acte</p>
              <div className="space-y-2">
                {groupedIntervenants.PARTIE.map((intervenant, index) => {
                  const originalIndex = intervenants.findIndex(i => i === intervenant);
                  const roleInfo = getRoleInfo(intervenant.role);
                  return (
                    <IntervenantCard
                      key={originalIndex}
                      intervenant={intervenant}
                      roleInfo={roleInfo}
                      onEdit={() => handleEdit(originalIndex)}
                      onRemove={() => handleRemove(originalIndex)}
                      readOnly={readOnly}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Tiers intervenants */}
          {groupedIntervenants.TIERS.length > 0 && (
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-30 mb-2">Tiers intervenants</p>
              <div className="space-y-2">
                {groupedIntervenants.TIERS.map((intervenant, index) => {
                  const originalIndex = intervenants.findIndex(i => i === intervenant);
                  const roleInfo = getRoleInfo(intervenant.role);
                  return (
                    <IntervenantCard
                      key={originalIndex}
                      intervenant={intervenant}
                      roleInfo={roleInfo}
                      onEdit={() => handleEdit(originalIndex)}
                      onRemove={() => handleRemove(originalIndex)}
                      readOnly={readOnly}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Autres */}
          {groupedIntervenants.AUTRE.length > 0 && (
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-30 mb-2">Autres</p>
              <div className="space-y-2">
                {groupedIntervenants.AUTRE.map((intervenant, index) => {
                  const originalIndex = intervenants.findIndex(i => i === intervenant);
                  const roleInfo = getRoleInfo(intervenant.role);
                  return (
                    <IntervenantCard
                      key={originalIndex}
                      intervenant={intervenant}
                      roleInfo={roleInfo}
                      onEdit={() => handleEdit(originalIndex)}
                      onRemove={() => handleRemove(originalIndex)}
                      readOnly={readOnly}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
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
              <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-indigo-50">
                <h2 className="font-serif italic text-lg">
                  {editIndex !== null ? "Modifier l'intervenant" : "Ajouter un intervenant"}
                </h2>
                <button onClick={resetForm} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">
                  Fermer
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 p-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    <p className="text-[9px] text-red-700">{error}</p>
                    <button onClick={() => setError("")} className="ml-auto">
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                )}

                {/* Tiers Selection */}
                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">
                    Tiers *
                  </label>
                  <select
                    value={formData.tiersId}
                    onChange={(e) => setFormData({ ...formData, tiersId: e.target.value })}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                  >
                    <option value="">Sélectionner un tiers</option>
                    {tiersList.map(tiers => (
                      <option key={tiers._id} value={tiers._id}>
                        {tiers.type === "PHYSIQUE" ? (
                          `${tiers.nom} ${tiers.prenom || ""}`
                        ) : (
                          `${tiers.nom} (Société)`
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">
                    Rôle *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 text-sm"
                  >
                    <option value="">Sélectionner un rôle</option>
                    <optgroup label="Parties à l'acte">
                      {ROLES_DISPONIBLES.filter(r => r.categorie === "PARTIE").map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Tiers intervenants">
                      {ROLES_DISPONIBLES.filter(r => r.categorie === "TIERS").map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Autre">
                      {ROLES_DISPONIBLES.filter(r => r.categorie === "AUTRE").map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Quote-part */}
                <div>
                  <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">
                    Quote-part (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.quotePart}
                      onChange={(e) => setFormData({ ...formData, quotePart: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.quotePart}
                      onChange={(e) => setFormData({ ...formData, quotePart: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-[#F5F5F5] border border-[#141414] p-2 text-sm text-center"
                    />
                    <span className="text-sm font-bold">%</span>
                  </div>
                </div>

                {/* Preview */}
                {formData.tiersId && formData.role && (
                  <div className="bg-indigo-50 p-3 border border-indigo-100">
                    <p className="text-[9px] uppercase opacity-40 mb-1">Aperçu</p>
                    <p className="text-sm font-bold">
                      {tiersList.find(t => t._id === formData.tiersId)?.nom}{" "}
                      {tiersList.find(t => t._id === formData.tiersId)?.prenom || ""}
                    </p>
                    <p className="text-xs opacity-60">
                      {getRoleInfo(formData.role)?.label} • {formData.quotePart}%
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-[#141414]/10">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-[#141414] text-[10px] uppercase font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="px-6 py-2 bg-[#141414] text-white text-[10px] uppercase font-bold"
                  >
                    {editIndex !== null ? "Modifier" : "Ajouter"}
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

// Intervenant Card Component
function IntervenantCard({
  intervenant,
  roleInfo,
  onEdit,
  onRemove,
  readOnly,
  key
}: {
  intervenant: Intervenant;
  roleInfo: typeof ROLES_DISPONIBLES[0] | undefined;
  onEdit: () => void;
  onRemove: () => void;
  readOnly: boolean;
  key?: any;
}) {
  return (
    <div className="bg-white border border-[#141414]/10 p-3 flex items-center gap-3 hover:border-[#141414]/30 transition-colors">
      <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${
        intervenant.tiersId.type === "PHYSIQUE" ? "bg-indigo-50" : "bg-amber-50"
      }`}>
        {intervenant.tiersId.type === "PHYSIQUE" ? (
          <User className="w-4 h-4 text-indigo-600" />
        ) : (
          <Building2 className="w-4 h-4 text-amber-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">
          {intervenant.tiersId.nom} {intervenant.tiersId.prenom || ""}
        </p>
        <p className="text-[9px] opacity-50">
          {roleInfo?.label || intervenant.role}
          {roleInfo?.description && ` • ${roleInfo.description}`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-[#F5F5F5] px-2 py-1 flex items-center gap-1">
          <Percent className="w-3 h-3 opacity-40" />
          <span className="text-xs font-bold">{intervenant.quotePart || 0}</span>
        </div>

        {!readOnly && (
          <>
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-[#F5F5F5] transition-colors"
              title="Modifier"
            >
              <Edit3 className="w-3.5 h-3.5 opacity-40" />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-red-50 text-red-600 transition-colors"
              title="Retirer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
