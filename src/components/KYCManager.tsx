import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Tiers, Document } from "../types";
import { ShieldCheck, ShieldAlert, ShieldX, Check, X, AlertCircle, Clock, FileText, Link2, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface KYCChecklistItem {
  item: string;
  checked: boolean;
  documentId?: { _id: string; nom: string; type: string; uploadedAt: string };
  verifiedBy?: { username: string };
  verifiedAt?: string;
  expiresAt?: string;
  notes?: string;
}

interface KYCData {
  kycStatus: "VALIDE" | "EN_ATTENTE" | "REFUSE";
  kycChecklist: KYCChecklistItem[];
  kycLastVerified?: string;
  kycVerifiedBy?: { username: string };
  kycNotes?: string;
}

interface KYCManagerProps {
  tiers: Tiers;
  documents: Document[];
  onStatusChange?: (newStatus: string) => void;
}

export default function KYCManager({ tiers, documents, onStatusChange }: KYCManagerProps) {
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validateAction, setValidateAction] = useState<"VALIDE" | "REFUSE">("VALIDE");
  const [validateNotes, setValidateNotes] = useState("");

  useEffect(() => {
    loadKYC();
  }, [tiers._id]);

  const loadKYC = async () => {
    try {
      const data = await api.get(`/api/tiers/${tiers._id}/kyc`);
      setKycData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckItem = async (index: number, checked: boolean) => {
    if (!kycData) return;

    try {
      await api.put(`/api/tiers/${tiers._id}/kyc/item/${index}`, { checked });
      const updatedChecklist = [...kycData.kycChecklist];
      updatedChecklist[index].checked = checked;
      setKycData({ ...kycData, kycChecklist: updatedChecklist });
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de la mise à jour");
      } catch {
        setError("Erreur lors de la mise à jour");
      }
    }
  };

  const handleLinkDocument = async (index: number, documentId: string) => {
    if (!kycData) return;

    try {
      await api.put(`/api/tiers/${tiers._id}/kyc/item/${index}`, { documentId });
      loadKYC(); // Reload to get populated document
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de la liaison");
      } catch {
        setError("Erreur lors de la liaison");
      }
    }
  };

  const handleSetExpiry = async (index: number, expiresAt: string) => {
    if (!kycData) return;

    try {
      await api.put(`/api/tiers/${tiers._id}/kyc/item/${index}`, { expiresAt: expiresAt || null });
      loadKYC();
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de la mise à jour");
      } catch {
        setError("Erreur lors de la mise à jour");
      }
    }
  };

  const handleValidate = async () => {
    try {
      const result = await api.put(`/api/tiers/${tiers._id}/kyc/validate`, {
        status: validateAction,
        notes: validateNotes
      });
      setKycData(prev => prev ? { ...prev, ...result } : prev);
      setShowValidateModal(false);
      setValidateNotes("");
      onStatusChange?.(validateAction);
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de la validation");
      } catch {
        setError("Erreur lors de la validation");
      }
    }
  };

  const getStatusIcon = () => {
    switch (kycData?.kycStatus) {
      case "VALIDE": return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case "REFUSE": return <ShieldX className="w-5 h-5 text-red-600" />;
      default: return <ShieldAlert className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusColor = () => {
    switch (kycData?.kycStatus) {
      case "VALIDE": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "REFUSE": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  const allChecked = kycData?.kycChecklist.every(item => item.checked) || false;
  const checkedCount = kycData?.kycChecklist.filter(item => item.checked).length || 0;
  const totalCount = kycData?.kycChecklist.length || 0;

  if (loading) {
    return <div className="text-[10px] uppercase opacity-40 italic py-4 text-center">Chargement KYC...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className={`p-4 border ${getStatusColor()} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="text-[10px] uppercase font-bold">Statut KYC</p>
            <p className="text-xs font-bold uppercase">{kycData?.kycStatus}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] opacity-60">{checkedCount}/{totalCount} vérifiés</p>
          {kycData?.kycLastVerified && (
            <p className="text-[8px] opacity-40">
              Dernière vérification: {format(new Date(kycData.kycLastVerified), 'dd/MM/yyyy', { locale: fr })}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-2 flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-red-600" />
          <p className="text-[9px] text-red-700 font-bold">{error}</p>
          <button onClick={() => setError("")} className="ml-auto">
            <X className="w-3 h-3 text-red-600" />
          </button>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-3">
        <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40">Checklist de vérification</h4>
        {kycData?.kycChecklist.map((item, index) => (
          <div
            key={index}
            className={`p-4 border transition-colors ${
              item.checked ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-[#141414]/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleCheckItem(index, !item.checked)}
                className={`w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                  item.checked
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-[#141414]/30 hover:border-[#141414]'
                }`}
              >
                {item.checked && <Check className="w-3 h-3" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${item.checked ? 'line-through opacity-60' : ''}`}>
                  {item.item}
                </p>

                {/* Linked Document */}
                {item.documentId ? (
                  <div className="flex items-center gap-2 mt-2 text-[9px] text-indigo-600">
                    <FileText className="w-3 h-3" />
                    <span>{item.documentId.nom}</span>
                  </div>
                ) : (
                  <div className="mt-2">
                    <select
                      onChange={(e) => e.target.value && handleLinkDocument(index, e.target.value)}
                      className="text-[9px] bg-[#F5F5F5] border border-[#141414]/10 px-2 py-1"
                      value=""
                    >
                      <option value="">Lier un document...</option>
                      {documents.map(doc => (
                        <option key={doc._id} value={doc._id}>{doc.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Expiry Date */}
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-3 h-3 opacity-40" />
                  <input
                    type="date"
                    value={item.expiresAt ? item.expiresAt.split('T')[0] : ''}
                    onChange={(e) => handleSetExpiry(index, e.target.value)}
                    className="text-[9px] bg-transparent border-b border-[#141414]/10 focus:outline-none"
                    placeholder="Date d'expiration"
                  />
                  {item.expiresAt && (
                    <span className={`text-[8px] px-1.5 py-0.5 ${
                      new Date(item.expiresAt) <= new Date()
                        ? 'bg-red-100 text-red-600'
                        : new Date(item.expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {new Date(item.expiresAt) <= new Date()
                        ? 'Expiré'
                        : `Expire ${formatDistanceToNow(new Date(item.expiresAt), { locale: fr, addSuffix: true })}`
                      }
                    </span>
                  )}
                </div>

                {/* Verification Info */}
                {item.verifiedBy && item.verifiedAt && (
                  <p className="text-[8px] opacity-40 mt-2">
                    Vérifié par {item.verifiedBy.username} le {format(new Date(item.verifiedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#141414]/10">
        <button
          onClick={() => { setValidateAction("VALIDE"); setShowValidateModal(true); }}
          disabled={!allChecked}
          className="flex-1 py-3 bg-emerald-600 text-white text-[10px] uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 inline mr-2" />
          Valider KYC
        </button>
        <button
          onClick={() => { setValidateAction("REFUSE"); setShowValidateModal(true); }}
          className="flex-1 py-3 bg-red-600 text-white text-[10px] uppercase font-bold hover:bg-red-700 transition-colors"
        >
          <ShieldX className="w-4 h-4 inline mr-2" />
          Refuser KYC
        </button>
      </div>

      {/* Notes */}
      {kycData?.kycNotes && (
        <div className="bg-[#F5F5F5] p-3 border border-[#141414]/10">
          <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Notes de vérification</p>
          <p className="text-xs">{kycData.kycNotes}</p>
        </div>
      )}

      {/* Validate Modal */}
      {showValidateModal && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`bg-white border w-full max-w-md shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] ${
            validateAction === "VALIDE" ? 'border-emerald-600' : 'border-red-600'
          }`}>
            <div className={`p-4 border-b ${
              validateAction === "VALIDE" ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
            } flex items-center justify-between`}>
              <h2 className="font-serif italic text-lg">
                {validateAction === "VALIDE" ? "Valider le KYC" : "Refuser le KYC"}
              </h2>
              <button onClick={() => setShowValidateModal(false)} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm">
                {validateAction === "VALIDE"
                  ? `Vous êtes sur le point de valider le KYC pour ${tiers.nom} ${tiers.prenom || ''}.`
                  : `Vous êtes sur le point de refuser le KYC pour ${tiers.nom} ${tiers.prenom || ''}.`
                }
              </p>

              <div>
                <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">
                  Notes {validateAction === "REFUSE" ? "(obligatoire)" : "(optionnel)"}
                </label>
                <textarea
                  value={validateNotes}
                  onChange={(e) => setValidateNotes(e.target.value)}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-2 text-xs h-20"
                  placeholder={validateAction === "REFUSE" ? "Motif du refus..." : "Commentaires..."}
                  required={validateAction === "REFUSE"}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowValidateModal(false)}
                  className="px-4 py-2 border border-[#141414] text-[10px] uppercase font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidate}
                  disabled={validateAction === "REFUSE" && !validateNotes}
                  className={`px-6 py-2 text-white text-[10px] uppercase font-bold disabled:opacity-50 ${
                    validateAction === "VALIDE" ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
