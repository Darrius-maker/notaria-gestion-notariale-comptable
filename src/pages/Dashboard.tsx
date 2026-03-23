import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  TrendingUp, Users, FileText, AlertCircle, Calendar, Euro, Clock,
  FolderOpen, ShieldCheck, ShieldAlert, Receipt, ArrowRight, Activity,
  ChevronRight, PieChart, BarChart3
} from "lucide-react";

interface DashboardStats {
  dossiers: {
    total: number;
    byStatus: { OUVERT: number; SIGNE: number; ARCHIVE: number };
  };
  tiers: {
    total: number;
    byKYC: { VALIDE: number; EN_ATTENTE: number; REFUSE: number };
  };
  comptabilite: {
    totalFonds: string;
    nombreEcritures: number;
  };
  facturation: {
    totalFacture: string;
    totalPaye: string;
    enAttente: string;
  };
  monthlyRevenue: Array<{ month: string; year: number; revenue: string }>;
  prochainRdvs: any[];
}

interface Activity {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  user: string;
  timestamp: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [kycAlerts, setKycAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, activitiesData, alertsData] = await Promise.all([
        api.get("/api/dashboard/stats"),
        api.get("/api/dashboard/activities"),
        api.get("/api/kyc/alerts").catch(() => [])
      ]);
      setStats(statsData);
      setActivities(activitiesData);
      setKycAlerts(alertsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE: "Création",
      UPDATE: "Modification",
      DELETE: "Suppression",
      UPLOAD: "Upload",
      KYC_VALIDATE: "Validation KYC",
      KYC_REJECT: "Refus KYC",
      PAYMENT: "Paiement"
    };
    return labels[action] || action;
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      Dossier: "Dossier",
      Tiers: "Tiers",
      Ecriture: "Écriture",
      Document: "Document",
      Facture: "Facture"
    };
    return labels[entity] || entity;
  };

  // Calculate max revenue for chart scaling
  const maxRevenue = stats?.monthlyRevenue
    ? Math.max(...stats.monthlyRevenue.map(m => parseFloat(m.revenue)), 1)
    : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-notaire-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Chargement du tableau de bord...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif italic text-3xl text-notaire-900 mb-1">Tableau de Bord</h1>
          <p className="text-sm text-notaire-500">
            Vue d'ensemble de l'activité
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-notaire-200 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-notaire-600">{format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}</span>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-notaire cursor-pointer hover:shadow-notaire-lg transition-all border border-notaire-100"
          onClick={() => navigate("/dossiers")}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-notaire-100 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-notaire-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-notaire-300" />
          </div>
          <p className="text-xs font-semibold text-notaire-500 mb-1">Dossiers</p>
          <p className="text-3xl font-serif italic text-notaire-900">{stats?.dossiers.total || 0}</p>
          <div className="mt-3 flex gap-2">
            <span className="text-[9px] font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {stats?.dossiers.byStatus.OUVERT || 0} ouverts
            </span>
            <span className="text-[9px] font-medium px-2 py-1 rounded-full bg-notaire-100 text-notaire-700">
              {stats?.dossiers.byStatus.SIGNE || 0} signés
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-notaire cursor-pointer hover:shadow-notaire-lg transition-all border border-notaire-100"
          onClick={() => navigate("/tiers")}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-or-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-or-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-notaire-300" />
          </div>
          <p className="text-xs font-semibold text-notaire-500 mb-1">Clients / Tiers</p>
          <p className="text-3xl font-serif italic text-notaire-900">{stats?.tiers.total || 0}</p>
          <div className="mt-3 flex gap-2">
            <span className="text-[9px] font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {stats?.tiers.byKYC.VALIDE || 0} validés
            </span>
            {(stats?.tiers.byKYC.EN_ATTENTE || 0) > 0 && (
              <span className="text-[9px] font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                {stats?.tiers.byKYC.EN_ATTENTE} en attente
              </span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-notaire-800 to-notaire-900 text-white rounded-xl p-6 shadow-notaire-lg cursor-pointer"
          onClick={() => navigate("/comptabilite")}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Euro className="w-6 h-6 text-or-400" />
            </div>
            <ChevronRight className="w-5 h-5 text-notaire-400" />
          </div>
          <p className="text-xs font-semibold text-notaire-300 mb-1">Fonds Tiers</p>
          <p className="text-3xl font-serif italic">
            {parseFloat(stats?.comptabilite.totalFonds || "0").toLocaleString('fr-FR')} €
          </p>
          <p className="mt-3 text-xs text-notaire-400">{stats?.comptabilite.nombreEcritures || 0} écritures</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-notaire cursor-pointer hover:shadow-notaire-lg transition-all border border-notaire-100"
          onClick={() => navigate("/facturation")}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-emerald-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-notaire-300" />
          </div>
          <p className="text-xs font-semibold text-notaire-500 mb-1">Facturation</p>
          <p className="text-3xl font-serif italic text-notaire-900">
            {parseFloat(stats?.facturation.enAttente || "0").toLocaleString('fr-FR')} €
          </p>
          <p className="mt-3 text-xs text-notaire-400">en attente de paiement</p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="col-span-2 bg-white rounded-xl p-6 shadow-notaire border border-notaire-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-notaire-100 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-notaire-600" />
              </div>
              <h3 className="text-sm font-semibold text-notaire-900">Honoraires mensuels</h3>
            </div>
            <span className="text-xs text-notaire-400 bg-notaire-50 px-3 py-1 rounded-full">6 derniers mois</span>
          </div>

          <div className="h-48 flex items-end gap-4">
            {stats?.monthlyRevenue.map((month, i) => {
              const height = (parseFloat(month.revenue) / maxRevenue) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-notaire-50 rounded-t-lg relative" style={{ height: '160px' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="absolute bottom-0 w-full bg-gradient-to-t from-notaire-700 to-notaire-500 rounded-t-lg"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-notaire-700">{month.month}</p>
                    <p className="text-[10px] text-notaire-400">{parseFloat(month.revenue).toLocaleString('fr-FR')} €</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dossiers Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-notaire border border-notaire-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-or-100 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-or-600" />
            </div>
            <h3 className="text-sm font-semibold text-notaire-900">Répartition Dossiers</h3>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {(() => {
                  const total = stats?.dossiers.total || 1;
                  const ouvert = (stats?.dossiers.byStatus.OUVERT || 0) / total * 100;
                  const signe = (stats?.dossiers.byStatus.SIGNE || 0) / total * 100;
                  const archive = (stats?.dossiers.byStatus.ARCHIVE || 0) / total * 100;

                  let offset = 0;
                  const segments = [
                    { value: ouvert, color: "#16a34a" },
                    { value: signe, color: "#1e3a8a" },
                    { value: archive, color: "#9CA3AF" }
                  ];

                  return segments.map((seg, i) => {
                    const segment = (
                      <circle
                        key={i}
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="3.5"
                        strokeDasharray={`${seg.value} ${100 - seg.value}`}
                        strokeDashoffset={-offset}
                        className="drop-shadow-sm"
                      />
                    );
                    offset += seg.value;
                    return segment;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-2xl font-bold text-notaire-900">{stats?.dossiers.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-notaire-50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-notaire-600">Ouverts</span>
              </div>
              <span className="text-xs font-bold text-notaire-900">{stats?.dossiers.byStatus.OUVERT || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-notaire-50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-notaire-800" />
                <span className="text-xs text-notaire-600">Signés</span>
              </div>
              <span className="text-xs font-bold text-notaire-900">{stats?.dossiers.byStatus.SIGNE || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-notaire-50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-xs text-notaire-600">Archivés</span>
              </div>
              <span className="text-xs font-bold text-notaire-900">{stats?.dossiers.byStatus.ARCHIVE || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-6 shadow-notaire border border-notaire-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-notaire-100 flex items-center justify-center">
                <Activity className="w-4 h-4 text-notaire-600" />
              </div>
              <h3 className="text-sm font-semibold text-notaire-900">Activités récentes</h3>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-xs text-notaire-400 italic text-center py-4">Aucune activité</p>
            ) : (
              activities.slice(0, 6).map((activity) => (
                <div key={activity._id} className="flex items-start gap-3 pb-3 border-b border-notaire-100 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-notaire-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-notaire-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-notaire-900 truncate">
                      {getActionLabel(activity.action)} {getEntityLabel(activity.entity)}
                    </p>
                    <p className="text-[10px] text-notaire-400">
                      {activity.user} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KYC Alerts */}
        <div className="bg-white rounded-xl p-6 shadow-notaire border border-notaire-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-notaire-900">Alertes KYC</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">
              {kycAlerts.length}
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {kycAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-xs text-emerald-600 font-semibold">Aucune alerte</p>
              </div>
            ) : (
              kycAlerts.slice(0, 5).map((alert, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === "expired" ? "border-red-500 bg-red-50" :
                    alert.type === "expiring" ? "border-amber-500 bg-amber-50" :
                    "border-notaire-500 bg-notaire-50"
                  }`}
                >
                  <p className="text-xs font-semibold text-notaire-900">{alert.tiersName}</p>
                  <p className="text-[10px] text-notaire-500">{alert.message}</p>
                </div>
              ))
            )}
          </div>

          {kycAlerts.length > 0 && (
            <button
              onClick={() => navigate("/tiers")}
              className="mt-4 w-full py-2.5 rounded-lg border-2 border-notaire-200 text-xs font-semibold text-notaire-700 hover:bg-notaire-50 transition-colors flex items-center justify-center gap-2"
            >
              Voir tous les tiers
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl p-6 shadow-notaire border border-notaire-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-notaire-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-notaire-600" />
              </div>
              <h3 className="text-sm font-semibold text-notaire-900">Prochains RDV</h3>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(stats?.prochainRdvs?.length || 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-12 h-12 rounded-full bg-notaire-100 flex items-center justify-center mb-2">
                  <Clock className="w-6 h-6 text-notaire-400" />
                </div>
                <p className="text-xs text-notaire-400">Aucun rendez-vous à venir</p>
              </div>
            ) : (
              stats?.prochainRdvs.map((rdv: any) => (
                <div key={rdv._id} className="flex items-start gap-3 pb-3 border-b border-notaire-100 last:border-0">
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                    rdv.type === "SIGNATURE" ? "bg-notaire-100" : "bg-notaire-50"
                  }`}>
                    <p className="text-sm font-bold text-notaire-900">{format(new Date(rdv.dateDebut), 'dd')}</p>
                    <p className="text-[8px] uppercase text-notaire-500 font-medium">{format(new Date(rdv.dateDebut), 'MMM', { locale: fr })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-notaire-900 truncate">{rdv.titre}</p>
                    <p className="text-[10px] text-notaire-400">
                      {format(new Date(rdv.dateDebut), 'HH:mm')} • {rdv.type}
                    </p>
                    {rdv.dossierId && (
                      <p className="text-[10px] text-notaire-600 font-medium">{rdv.dossierId.reference}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => navigate("/agenda")}
            className="mt-4 w-full py-2.5 rounded-lg bg-gradient-to-r from-notaire-700 to-notaire-600 text-white text-xs font-semibold hover:from-notaire-600 hover:to-notaire-500 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            Voir l'agenda
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
