import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { Document, DocumentType } from "../types";
import { Upload, FileText, Image, File, Trash2, Download, Eye, X, AlertCircle, Clock, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DocumentManagerProps {
  dossierId?: string;
  tiersId?: string;
  title?: string;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "PIECE_IDENTITE", label: "Pièce d'identité" },
  { value: "JUSTIFICATIF_DOMICILE", label: "Justificatif de domicile" },
  { value: "ACTE", label: "Acte notarié" },
  { value: "CONTRAT", label: "Contrat" },
  { value: "PROCURATION", label: "Procuration" },
  { value: "AUTRE", label: "Autre" }
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
};

export default function DocumentManager({ dossierId, tiersId, title = "Documents" }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ nom: string; mimeType: string; contenu: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    type: "AUTRE" as DocumentType,
    description: ""
  });

  const endpoint = dossierId
    ? `/api/dossiers/${dossierId}/documents`
    : `/api/tiers/${tiersId}/documents`;

  useEffect(() => {
    loadDocuments();
  }, [dossierId, tiersId]);

  const loadDocuments = async () => {
    try {
      const data = await api.get(endpoint);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Le fichier est trop volumineux (max 10MB)");
        return;
      }
      setUploadForm({ ...uploadForm, file });
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    setUploading(true);
    setError("");

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const contenu = base64.split(",")[1]; // Remove data:xxx;base64, prefix

        await api.post("/api/documents", {
          nom: uploadForm.file!.name,
          type: uploadForm.type,
          mimeType: uploadForm.file!.type,
          taille: uploadForm.file!.size,
          contenu,
          dossierId: dossierId || null,
          tiersId: tiersId || null,
          description: uploadForm.description
        });

        setShowUploadModal(false);
        setUploadForm({ file: null, type: "AUTRE", description: "" });
        loadDocuments();
      };

      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
        setUploading(false);
      };

      reader.readAsDataURL(uploadForm.file);
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message);
        setError(msg.error || "Erreur lors de l'upload");
      } catch {
        setError("Erreur lors de l'upload");
      }
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      const data = await api.get(`/api/documents/${doc._id}/download`);
      setPreviewDoc(data);
      setShowPreviewModal(true);
    } catch (err) {
      setError("Erreur lors du chargement du document");
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const data = await api.get(`/api/documents/${doc._id}/download`);
      const link = document.createElement("a");
      link.href = `data:${data.mimeType};base64,${data.contenu}`;
      link.download = data.nom;
      link.click();
    } catch (err) {
      setError("Erreur lors du téléchargement");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/documents/${id}`);
      setDocuments(documents.filter(d => d._id !== id));
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40">{title}</h4>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-600 hover:underline"
        >
          <Upload className="w-3 h-3" /> Ajouter
        </button>
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

      {loading ? (
        <div className="text-[10px] uppercase opacity-40 italic py-4 text-center">Chargement...</div>
      ) : documents.length === 0 ? (
        <div className="bg-[#F5F5F5] border border-[#141414]/10 p-6 text-center">
          <FileText className="w-8 h-8 opacity-20 mx-auto mb-2" />
          <p className="text-[10px] uppercase opacity-40 italic">Aucun document</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.mimeType);
            return (
              <div
                key={doc._id}
                className="flex items-center gap-3 p-3 bg-white border border-[#141414]/10 hover:border-[#141414]/30 transition-colors group"
              >
                <div className="w-10 h-10 bg-[#F5F5F5] flex items-center justify-center">
                  <Icon className="w-5 h-5 opacity-40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate">{doc.nom}</p>
                  <div className="flex items-center gap-2 text-[9px] opacity-40">
                    <span>{formatFileSize(doc.taille)}</span>
                    <span>•</span>
                    <span>{DOCUMENT_TYPES.find(t => t.value === doc.type)?.label}</span>
                    {doc.version > 1 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> v{doc.version}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(doc.mimeType.startsWith("image/") || doc.mimeType === "application/pdf") && (
                    <button
                      onClick={() => handlePreview(doc)}
                      className="p-1.5 hover:bg-[#141414]/5 rounded"
                      title="Aperçu"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 hover:bg-[#141414]/5 rounded"
                    title="Télécharger"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setDeletingId(doc._id); setShowDeleteConfirm(true); }}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#141414] w-full max-w-md shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <div className="p-4 border-b border-[#141414] flex items-center justify-between">
              <h2 className="font-serif italic text-lg">Ajouter un Document</h2>
              <button onClick={() => { setShowUploadModal(false); setUploadForm({ file: null, type: "AUTRE", description: "" }); }} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
            </div>
            <div className="p-6 space-y-4">
              {/* File Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#141414]/20 p-8 text-center cursor-pointer hover:border-[#141414]/40 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                {uploadForm.file ? (
                  <div>
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-60" />
                    <p className="text-xs font-bold">{uploadForm.file.name}</p>
                    <p className="text-[10px] opacity-40">{formatFileSize(uploadForm.file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] uppercase font-bold opacity-40">Cliquer pour sélectionner</p>
                    <p className="text-[9px] opacity-30 mt-1">Max 10MB • Images, PDF, Documents</p>
                  </div>
                )}
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">Type de document</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as DocumentType })}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-2 text-xs"
                >
                  {DOCUMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] uppercase font-bold opacity-40 mb-2">Description (optionnel)</label>
                <input
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full bg-[#F5F5F5] border border-[#141414] p-2 text-xs"
                  placeholder="Ex: Carte d'identité recto-verso"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-2 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  <p className="text-[9px] text-red-700 font-bold">{error}</p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => { setShowUploadModal(false); setUploadForm({ file: null, type: "AUTRE", description: "" }); }}
                  className="px-4 py-2 border border-[#141414] text-[10px] uppercase font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.file || uploading}
                  className="px-6 py-2 bg-[#141414] text-white text-[10px] uppercase font-bold disabled:opacity-50"
                >
                  {uploading ? "Upload..." : "Envoyer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewDoc && (
        <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#141414] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[12px_12px_0px_0px_rgba(20,20,20,1)]">
            <div className="p-4 border-b border-[#141414] flex items-center justify-between flex-shrink-0">
              <h2 className="font-serif italic text-lg truncate">{previewDoc.nom}</h2>
              <button onClick={() => { setShowPreviewModal(false); setPreviewDoc(null); }} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Fermer</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#F5F5F5]">
              {previewDoc.mimeType.startsWith("image/") ? (
                <img
                  src={`data:${previewDoc.mimeType};base64,${previewDoc.contenu}`}
                  alt={previewDoc.nom}
                  className="max-w-full mx-auto"
                />
              ) : previewDoc.mimeType === "application/pdf" ? (
                <iframe
                  src={`data:${previewDoc.mimeType};base64,${previewDoc.contenu}`}
                  className="w-full h-[70vh]"
                  title={previewDoc.nom}
                />
              ) : (
                <p className="text-center text-[10px] uppercase opacity-40">Aperçu non disponible</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white border border-[#141414] w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <div className="p-4 border-b border-[#141414]">
              <h2 className="font-serif italic text-lg text-red-600">Supprimer le document</h2>
            </div>
            <div className="p-4">
              <p className="text-xs mb-4">Cette action est irréversible. Toutes les versions seront supprimées.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
                  className="px-4 py-2 border border-[#141414] text-[10px] uppercase font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deletingId && handleDelete(deletingId)}
                  className="px-6 py-2 bg-red-600 text-white text-[10px] uppercase font-bold"
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
