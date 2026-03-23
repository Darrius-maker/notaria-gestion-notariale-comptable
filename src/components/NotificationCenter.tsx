import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, X, Check, CheckCheck, Trash2, AlertCircle, Info,
  AlertTriangle, CheckCircle, FolderOpen, Users, Receipt, Calendar
} from "lucide-react";

interface Notification {
  _id: string;
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  categorie: "KYC" | "DOSSIER" | "FACTURE" | "RDV" | "SYSTEME";
  titre: string;
  message: string;
  lien?: string;
  lue: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await api.get("/api/notifications/unread-count");
      setUnreadCount(data.count);
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/notifications");
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n._id === id ? { ...n, lue: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/api/notifications/mark-all-read");
      setNotifications(notifications.map(n => ({ ...n, lue: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      const notif = notifications.find(n => n._id === id);
      if (notif && !notif.lue) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      setNotifications(notifications.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.lue) {
      markAsRead(notif._id);
    }
    if (notif.lien) {
      navigate(notif.lien);
      setIsOpen(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SUCCESS": return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "WARNING": return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "ERROR": return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCategorieIcon = (categorie: string) => {
    switch (categorie) {
      case "KYC": return <Users className="w-3 h-3" />;
      case "DOSSIER": return <FolderOpen className="w-3 h-3" />;
      case "FACTURE": return <Receipt className="w-3 h-3" />;
      case "RDV": return <Calendar className="w-3 h-3" />;
      default: return <Info className="w-3 h-3" />;
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "SUCCESS": return "bg-emerald-50";
      case "WARNING": return "bg-amber-50";
      case "ERROR": return "bg-red-50";
      default: return "bg-blue-50";
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 hover:bg-notaire-50 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-notaire-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-96 bg-white rounded-xl border border-notaire-200 shadow-notaire-lg z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-notaire-200 flex items-center justify-between bg-gradient-to-r from-notaire-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-notaire-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-notaire-600" />
                </div>
                <h3 className="text-sm font-semibold text-notaire-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">
                    {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 hover:bg-notaire-100 rounded-lg transition-colors"
                    title="Tout marquer comme lu"
                  >
                    <CheckCheck className="w-4 h-4 text-notaire-500" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-notaire-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-notaire-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-notaire-500">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs">Chargement...</span>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-notaire-100 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-notaire-400" />
                  </div>
                  <p className="text-xs text-notaire-400">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-notaire-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`p-4 hover:bg-notaire-50 transition-colors cursor-pointer ${
                        !notif.lue ? "bg-notaire-50/50" : ""
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeBg(notif.type)}`}>
                          {getTypeIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-sm font-semibold truncate ${!notif.lue ? "text-notaire-900" : "text-notaire-500"}`}>
                              {notif.titre}
                            </p>
                            {!notif.lue && (
                              <span className="w-2 h-2 bg-notaire-600 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-notaire-500 line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-[10px] text-notaire-400 font-medium">
                              {getCategorieIcon(notif.categorie)}
                              {notif.categorie}
                            </span>
                            <span className="text-notaire-200">•</span>
                            <span className="text-[10px] text-notaire-400">
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notif.lue && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(notif._id); }}
                              className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                              title="Marquer comme lu"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-notaire-100 bg-notaire-50">
                <p className="text-[10px] text-center text-notaire-400">
                  {notifications.length} notification{notifications.length > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
