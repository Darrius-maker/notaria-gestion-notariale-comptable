import { useState, useEffect } from "react";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileSpreadsheet, Download, Filter, Calendar, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, ChevronRight, RefreshCw, Printer, FileText,
  Building2, Euro, ChevronDown, BarChart3
} from "lucide-react";

interface Resume {
  totalDebits: string;
  totalCredits: string;
  solde: string;
  parCategorie: Array<{
    categorie: string;
    debit: string;
    credit: string;
    solde: string;
  }>;
  nombreEcritures: number;
}

interface JournalEntry {
  date: string;
  entries: Array<{
    _id: string;
    dossier: string;
    libelle: string;
    montant: string;
    sens: "DEBIT" | "CREDIT";
    categorie: string;
  }>;
  totalDebit: string;
  totalCredit: string;
}

interface BalanceDossier {
  dossierId: string;
  reference: string;
  objet: string;
  statut: string;
  debit: string;
  credit: string;
  solde: string;
  nombreEcritures: number;
}

type TabType = "resume" | "journal" | "balance" | "export";

export default function EtatsComptables() {
  const [activeTab, setActiveTab] = useState<TabType>("resume");
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [dateFin, setDateFin] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Data states
  const [resume, setResume] = useState<Resume | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [balance, setBalance] = useState<BalanceDossier[]>([]);

  // Export state
  const [exportType, setExportType] = useState<"ecritures" | "balance" | "factures">("ecritures");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateDebut, dateFin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = `dateDebut=${dateDebut}&dateFin=${dateFin}`;
      const [resumeData, journalData, balanceData] = await Promise.all([
        api.get(`/api/comptabilite/resume?${params}`),
        api.get(`/api/comptabilite/journal?${params}`),
        api.get("/api/comptabilite/balance-dossiers")
      ]);
      setResume(resumeData);
      setJournal(journalData);
      setBalance(balanceData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = `type=${exportType}&dateDebut=${dateDebut}&dateFin=${dateFin}`;
      const result = await api.get(`/api/comptabilite/export?${params}`);

      // Convert to CSV
      if (result.data.length === 0) {
        alert("Aucune donnée à exporter");
        return;
      }

      const headers = Object.keys(result.data[0]);
      const csvContent = [
        headers.join(";"),
        ...result.data.map((row: any) => headers.map(h => `"${row[h] || ""}"`).join(";"))
      ].join("\n");

      // Download
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${exportType}_${dateDebut}_${dateFin}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const getCategorieLabel = (cat: string) => {
    const labels: Record<string, string> = {
      HONORAIRES: "Honoraires",
      TAXES: "Taxes & Droits",
      DEBOURS: "Débours",
      FONDS_CLIENTS: "Fonds Clients"
    };
    return labels[cat] || cat;
  };

  const tabs = [
    { id: "resume" as TabType, label: "Résumé", icon: BarChart3 },
    { id: "journal" as TabType, label: "Journal", icon: FileText },
    { id: "balance" as TabType, label: "Balance", icon: Building2 },
    { id: "export" as TabType, label: "Export", icon: Download }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif italic text-3xl mb-1">États Comptables</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-40">Rapports et exports comptables</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border border-[#141414] text-[10px] uppercase font-bold hover:bg-[#F5F5F5]"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-white border border-[#141414] p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 opacity-40" />
            <span className="text-[10px] uppercase font-bold opacity-40">Période:</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="bg-[#F5F5F5] border border-[#141414]/20 px-3 py-2 text-xs"
            />
            <span className="text-xs opacity-40">à</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="bg-[#F5F5F5] border border-[#141414]/20 px-3 py-2 text-xs"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            {[
              { label: "Ce mois", start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
              { label: "Mois dernier", start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
              { label: "3 mois", start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(new Date()) }
            ].map((period) => (
              <button
                key={period.label}
                onClick={() => {
                  setDateDebut(format(period.start, "yyyy-MM-dd"));
                  setDateFin(format(period.end, "yyyy-MM-dd"));
                }}
                className="px-3 py-1.5 text-[9px] uppercase font-bold border border-[#141414]/20 hover:border-[#141414] transition-colors"
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#141414]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-[10px] uppercase font-bold tracking-wider border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#141414] bg-white"
                  : "border-transparent hover:bg-[#F5F5F5]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[10px] uppercase tracking-widest opacity-40">Chargement...</div>
        </div>
      ) : (
        <>
          {/* Resume Tab */}
          {activeTab === "resume" && resume && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-[#141414] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-50 flex items-center justify-center">
                      <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest opacity-40">Total Crédits</p>
                      <p className="text-2xl font-bold text-emerald-600">{parseFloat(resume.totalCredits).toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#141414] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-50 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest opacity-40">Total Débits</p>
                      <p className="text-2xl font-bold text-red-600">{parseFloat(resume.totalDebits).toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#141414] text-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                      <Euro className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest opacity-60">Solde Période</p>
                      <p className="text-2xl font-bold">{parseFloat(resume.solde).toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                  <p className="text-[9px] uppercase opacity-40">{resume.nombreEcritures} écritures</p>
                </div>
              </div>

              {/* By Category */}
              <div className="bg-white border border-[#141414]">
                <div className="p-4 border-b border-[#141414] bg-[#F5F5F5]">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold">Répartition par catégorie</h3>
                </div>
                <div className="divide-y divide-[#141414]/10">
                  {resume.parCategorie.map((cat) => {
                    const solde = parseFloat(cat.solde);
                    return (
                      <div key={cat.categorie} className="p-4 flex items-center">
                        <div className="w-40">
                          <p className="text-sm font-bold">{getCategorieLabel(cat.categorie)}</p>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div className="text-right">
                            <p className="text-[9px] uppercase opacity-40">Crédits</p>
                            <p className="text-sm font-mono text-emerald-600">+{parseFloat(cat.credit).toLocaleString('fr-FR')} €</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase opacity-40">Débits</p>
                            <p className="text-sm font-mono text-red-600">-{parseFloat(cat.debit).toLocaleString('fr-FR')} €</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase opacity-40">Solde</p>
                            <p className={`text-sm font-mono font-bold ${solde >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {solde >= 0 ? '+' : ''}{solde.toLocaleString('fr-FR')} €
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Journal Tab */}
          {activeTab === "journal" && (
            <div className="bg-white border border-[#141414]">
              <div className="p-4 border-b border-[#141414] bg-[#F5F5F5] flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-widest font-bold">Journal des écritures</h3>
                <span className="text-[10px] font-mono opacity-40">{journal.reduce((s, j) => s + j.entries.length, 0)} écritures</span>
              </div>

              {journal.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs opacity-40">Aucune écriture sur cette période</p>
                </div>
              ) : (
                <div className="divide-y divide-[#141414]">
                  {journal.map((day) => (
                    <div key={day.date}>
                      {/* Date Header */}
                      <div className="bg-[#F5F5F5] px-4 py-2 flex items-center justify-between">
                        <p className="text-[10px] uppercase font-bold">
                          {format(new Date(day.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                        </p>
                        <div className="flex gap-4 text-[9px] font-mono">
                          <span className="text-emerald-600">+{day.totalCredit} €</span>
                          <span className="text-red-600">-{day.totalDebit} €</span>
                        </div>
                      </div>

                      {/* Entries */}
                      <div className="divide-y divide-[#141414]/10">
                        {day.entries.map((entry) => (
                          <div key={entry._id} className="px-4 py-3 flex items-center gap-4">
                            <div className={`w-8 h-8 flex items-center justify-center ${
                              entry.sens === "CREDIT" ? "bg-emerald-50" : "bg-red-50"
                            }`}>
                              {entry.sens === "CREDIT" ? (
                                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{entry.libelle}</p>
                              <p className="text-[9px] opacity-40">{entry.dossier} • {entry.categorie}</p>
                            </div>
                            <div className={`text-right font-mono font-bold ${
                              entry.sens === "CREDIT" ? "text-emerald-600" : "text-red-600"
                            }`}>
                              {entry.sens === "CREDIT" ? "+" : "-"}{entry.montant} €
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Balance Tab */}
          {activeTab === "balance" && (
            <div className="bg-white border border-[#141414]">
              <div className="p-4 border-b border-[#141414] bg-[#F5F5F5] flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-widest font-bold">Balance par dossier</h3>
                <span className="text-[10px] font-mono opacity-40">{balance.length} dossiers</span>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[1fr_2fr_100px_120px_120px_120px] border-b border-[#141414] bg-[#FAFAFA] text-[9px] uppercase font-bold opacity-40">
                <div className="p-3">Référence</div>
                <div className="p-3">Objet</div>
                <div className="p-3">Statut</div>
                <div className="p-3 text-right">Débits</div>
                <div className="p-3 text-right">Crédits</div>
                <div className="p-3 text-right">Solde</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#141414]/10">
                {balance.map((d) => {
                  const solde = parseFloat(d.solde);
                  return (
                    <div key={d.dossierId} className="grid grid-cols-[1fr_2fr_100px_120px_120px_120px] items-center hover:bg-[#F5F5F5]/50">
                      <div className="p-3">
                        <p className="text-xs font-mono font-bold">{d.reference}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-xs truncate">{d.objet}</p>
                      </div>
                      <div className="p-3">
                        <span className={`text-[8px] uppercase font-bold px-2 py-0.5 ${
                          d.statut === "OUVERT" ? "bg-emerald-50 text-emerald-700" :
                          d.statut === "SIGNE" ? "bg-blue-50 text-blue-700" :
                          "bg-gray-50 text-gray-600"
                        }`}>
                          {d.statut}
                        </span>
                      </div>
                      <div className="p-3 text-right font-mono text-sm text-red-600">
                        {parseFloat(d.debit).toLocaleString('fr-FR')} €
                      </div>
                      <div className="p-3 text-right font-mono text-sm text-emerald-600">
                        {parseFloat(d.credit).toLocaleString('fr-FR')} €
                      </div>
                      <div className={`p-3 text-right font-mono text-sm font-bold ${solde >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {solde >= 0 ? '+' : ''}{solde.toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Row */}
              <div className="grid grid-cols-[1fr_2fr_100px_120px_120px_120px] border-t-2 border-[#141414] bg-[#141414] text-white">
                <div className="p-3 col-span-3">
                  <p className="text-[10px] uppercase font-bold">Total</p>
                </div>
                <div className="p-3 text-right font-mono text-sm">
                  {balance.reduce((s, d) => s + parseFloat(d.debit), 0).toLocaleString('fr-FR')} €
                </div>
                <div className="p-3 text-right font-mono text-sm">
                  {balance.reduce((s, d) => s + parseFloat(d.credit), 0).toLocaleString('fr-FR')} €
                </div>
                <div className="p-3 text-right font-mono text-sm font-bold">
                  {balance.reduce((s, d) => s + parseFloat(d.solde), 0).toLocaleString('fr-FR')} €
                </div>
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === "export" && (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white border border-[#141414] p-6 space-y-6">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-4">Type d'export</h3>
                  <div className="space-y-2">
                    {[
                      { value: "ecritures", label: "Journal des écritures", desc: "Toutes les écritures de la période" },
                      { value: "balance", label: "Balance des dossiers", desc: "Solde de chaque dossier" },
                      { value: "factures", label: "Liste des factures", desc: "Toutes les factures émises" }
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${
                          exportType === opt.value
                            ? "border-[#141414] bg-[#F5F5F5]"
                            : "border-[#141414]/10 hover:border-[#141414]/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="exportType"
                          value={opt.value}
                          checked={exportType === opt.value}
                          onChange={(e) => setExportType(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-bold">{opt.label}</p>
                          <p className="text-[10px] opacity-40">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#141414]/10">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-[#141414] text-white text-[10px] uppercase font-bold disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${exporting ? "animate-bounce" : ""}`} />
                    {exporting ? "Export en cours..." : "Télécharger CSV"}
                  </button>
                </div>
              </div>

              <div className="bg-[#F5F5F5] border border-[#141414]/10 p-6">
                <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-4">Informations</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 opacity-40" />
                    <div>
                      <p className="font-bold">Format CSV</p>
                      <p className="text-[10px] opacity-60">Compatible Excel, Google Sheets</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 opacity-40" />
                    <div>
                      <p className="font-bold">Période sélectionnée</p>
                      <p className="text-[10px] opacity-60">
                        {format(new Date(dateDebut), 'dd/MM/yyyy', { locale: fr })} - {format(new Date(dateFin), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-amber-50 border border-amber-100">
                  <p className="text-[10px] uppercase font-bold text-amber-700 mb-1">Note</p>
                  <p className="text-xs text-amber-700">
                    Les exports sont générés en temps réel avec les données actuelles de la base.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
