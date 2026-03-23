import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlobalStats, ReportingData } from "../types";

export default function Reporting() {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [reportingData, setReportingData] = useState<ReportingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState({
    debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    fin: new Date().toISOString().split("T")[0],
  });
  const [periodePreset, setPeriodePreset] = useState<string>("annee");

  const fetchGlobalStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reporting/global", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGlobalStats(data);
    } catch (error) {
      console.error("Erreur chargement stats globales:", error);
    }
  };

  const fetchReportingData = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        debut: periode.debut,
        fin: periode.fin,
      });
      const res = await fetch(`/api/reporting?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReportingData(data);
    } catch (error) {
      console.error("Erreur chargement reporting:", error);
    }
  };

  useEffect(() => {
    Promise.all([fetchGlobalStats(), fetchReportingData()]).finally(() =>
      setLoading(false)
    );
  }, []);

  useEffect(() => {
    fetchReportingData();
  }, [periode]);

  const handlePresetChange = (preset: string) => {
    setPeriodePreset(preset);
    const now = new Date();
    let debut: Date;
    const fin = now;

    switch (preset) {
      case "mois":
        debut = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "trimestre":
        debut = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case "semestre":
        debut = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
        break;
      case "annee":
      default:
        debut = new Date(now.getFullYear(), 0, 1);
        break;
    }

    setPeriode({
      debut: debut.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0],
    });
  };

  const formatMontant = (montant: string | undefined) => {
    if (!montant) return "0 FCFA";
    const num = parseFloat(montant);
    return new Intl.NumberFormat("fr-FR").format(num) + " FCFA";
  };

  const categorieColors: Record<string, string> = {
    IMMOBILIER: "bg-blue-500",
    FAMILLE: "bg-pink-500",
    SUCCESSION: "bg-purple-500",
    SOCIETE: "bg-green-500",
    PRET: "bg-amber-500",
    PROCURATION: "bg-cyan-500",
    AUTRE: "bg-gray-500",
  };

  const statutColors: Record<string, string> = {
    BROUILLON: "bg-gray-400",
    EN_REVISION: "bg-blue-400",
    VALIDE: "bg-cyan-400",
    EN_SIGNATURE: "bg-amber-400",
    PARTIELLEMENT_SIGNE: "bg-orange-400",
    SIGNE: "bg-green-400",
    ENREGISTRE: "bg-teal-400",
    PUBLIE: "bg-indigo-400",
    ARCHIVE: "bg-slate-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-notaire-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-500 mt-1">
            Statistiques et reporting de l'activité notariale
          </p>
        </div>

        {/* Sélecteur de période */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          {["mois", "trimestre", "semestre", "annee"].map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                periodePreset === preset
                  ? "bg-notaire-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {preset === "mois"
                ? "Ce mois"
                : preset === "trimestre"
                ? "Trimestre"
                : preset === "semestre"
                ? "Semestre"
                : "Année"}
            </button>
          ))}
        </div>
      </div>

      {/* Période personnalisée */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Du</label>
            <input
              type="date"
              value={periode.debut}
              onChange={(e) => {
                setPeriode({ ...periode, debut: e.target.value });
                setPeriodePreset("");
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Au</label>
            <input
              type="date"
              value={periode.fin}
              onChange={(e) => {
                setPeriode({ ...periode, fin: e.target.value });
                setPeriodePreset("");
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-notaire-500 focus:border-notaire-500"
            />
          </div>
        </div>
      </div>

      {/* Statistiques Globales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-notaire-500 to-notaire-700 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-notaire-100">
                  Études Notariales
                </p>
                <p className="text-3xl font-bold mt-1">
                  {globalStats.nombreEtudes}
                </p>
                <p className="text-sm text-notaire-200 mt-1">
                  {globalStats.etudesActives} actives
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Dossiers</p>
                <p className="text-3xl font-bold mt-1">
                  {globalStats.nombreDossiers}
                </p>
                <p className="text-sm text-blue-200 mt-1">
                  {globalStats.dossiersOuverts} ouverts
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">Actes</p>
                <p className="text-3xl font-bold mt-1">
                  {globalStats.nombreActes}
                </p>
                <p className="text-sm text-green-200 mt-1">
                  {globalStats.actesSignes} signés
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-100">
                  Chiffre d'Affaires
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatMontant(globalStats.totalChiffreAffaires).replace(" FCFA", "")}
                </p>
                <p className="text-sm text-amber-200 mt-1">FCFA</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Indicateurs KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tiers</h3>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {globalStats?.nombreTiers || 0}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {globalStats?.tiersKYCValide || 0} KYC validés
              </p>
            </div>
            <div className="w-16 h-16">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#eee"
                  strokeWidth="3"
                />
                <path
                  className="circle"
                  strokeDasharray={`${
                    globalStats?.nombreTiers
                      ? ((globalStats.tiersKYCValide / globalStats.nombreTiers) * 100).toFixed(0)
                      : 0
                  }, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-sm font-medium text-gray-500 mb-2">Recouvrement</h3>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {globalStats?.tauxRecouvrement || "0%"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatMontant(globalStats?.totalPaye)} payés
              </p>
            </div>
            <div className="flex-1 ml-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-notaire-500 rounded-full transition-all"
                  style={{
                    width: globalStats?.tauxRecouvrement || "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Activité Période
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-notaire-600">
                {reportingData?.activite.nombreDossiers || 0}
              </p>
              <p className="text-xs text-gray-500">Dossiers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {reportingData?.activite.nombreActes || 0}
              </p>
              <p className="text-xs text-gray-500">Actes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {reportingData?.activite.nombreFactures || 0}
              </p>
              <p className="text-xs text-gray-500">Factures</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par catégorie */}
        {reportingData?.actesByCategorie && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">
              Actes par Catégorie
            </h3>
            <div className="space-y-3">
              {((Object.entries(reportingData.actesByCategorie) as [string, number][])).map(
                ([categorie, count]) => {
                  const total = (Object.values(reportingData.actesByCategorie) as number[]).reduce(
                    (a, b) => a + b,
                    0
                  );
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
                  return (
                    <div key={categorie}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{categorie}</span>
                        <span className="font-medium text-gray-900">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${categorieColors[categorie] || "bg-gray-500"} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </motion.div>
        )}

        {/* Répartition par statut */}
        {globalStats?.actesByStatut && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Actes par Statut</h3>
            <div className="space-y-3">
              {((Object.entries(globalStats.actesByStatut) as [string, number][])).map(([statut, count]) => {
                const total = (Object.values(globalStats.actesByStatut) as number[]).reduce(
                  (a, b) => a + b,
                  0
                );
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
                return (
                  <div key={statut}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {statut.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statutColors[statut] || "bg-gray-500"} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Tendance Mensuelle */}
      {reportingData?.monthlyTrend && reportingData.monthlyTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Tendance Mensuelle</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex items-end justify-between gap-2 h-64">
                {reportingData.monthlyTrend.map((month, index) => {
                  const maxValue = Math.max(
                    ...reportingData.monthlyTrend.map((m) =>
                      Math.max(m.dossiers, m.actes, m.factures)
                    )
                  );
                  const scale = maxValue > 0 ? 200 / maxValue : 0;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div className="flex items-end gap-1 h-52">
                        <div
                          className="w-4 bg-notaire-400 rounded-t transition-all"
                          style={{ height: `${month.dossiers * scale}px` }}
                          title={`Dossiers: ${month.dossiers}`}
                        />
                        <div
                          className="w-4 bg-green-400 rounded-t transition-all"
                          style={{ height: `${month.actes * scale}px` }}
                          title={`Actes: ${month.actes}`}
                        />
                        <div
                          className="w-4 bg-blue-400 rounded-t transition-all"
                          style={{ height: `${month.factures * scale}px` }}
                          title={`Factures: ${month.factures}`}
                        />
                      </div>
                      <span className="text-xs text-gray-500 transform -rotate-45">
                        {month.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-notaire-400 rounded" />
                  <span className="text-sm text-gray-600">Dossiers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded" />
                  <span className="text-sm text-gray-600">Actes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded" />
                  <span className="text-sm text-gray-600">Factures</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Synthèse Financière */}
      {reportingData?.financier && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            Synthèse Financière - Période
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Honoraires</p>
              <p className="text-lg font-semibold text-notaire-600">
                {formatMontant(reportingData.financier.totalHonoraires).replace(" FCFA", "")}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Taxes</p>
              <p className="text-lg font-semibold text-red-600">
                {formatMontant(reportingData.financier.totalTaxes).replace(" FCFA", "")}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Débours</p>
              <p className="text-lg font-semibold text-amber-600">
                {formatMontant(reportingData.financier.totalDebours).replace(" FCFA", "")}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Fonds Clients</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatMontant(reportingData.financier.totalFondsClients).replace(" FCFA", "")}
              </p>
            </div>
            <div className="text-center p-4 bg-notaire-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Facturé</p>
              <p className="text-lg font-semibold text-notaire-600">
                {formatMontant(reportingData.financier.totalFacture).replace(" FCFA", "")}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Payé</p>
              <p className="text-lg font-semibold text-green-600">
                {formatMontant(reportingData.financier.totalPaye).replace(" FCFA", "")}
              </p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Recouvrement</p>
              <p className="text-lg font-semibold text-amber-600">
                {reportingData.financier.tauxRecouvrement}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            // Générer un export CSV
            const data = {
              periode,
              globalStats,
              reportingData,
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `rapport-${periode.debut}-${periode.fin}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-notaire-600 text-white rounded-lg hover:bg-notaire-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter le Rapport
        </button>
      </div>
    </div>
  );
}
