import { Role, TiersType, DossierStatut, EcritureCategorie } from "./types";

export const ROLES: Role[] = ["NOTAIRE", "CLERC", "COMPTABLE"];
export const TIERS_TYPES: TiersType[] = ["PHYSIQUE", "MORALE"];
export const DOSSIER_STATUTS: DossierStatut[] = ["OUVERT", "SIGNE", "ARCHIVE"];
export const ECRITURE_CATEGORIES: EcritureCategorie[] = ["HONORAIRES", "TAXES", "DEBOURS", "FONDS_CLIENTS"];

export const COLORS = {
  NOTAIRE: "bg-indigo-600",
  CLERC: "bg-emerald-600",
  COMPTABLE: "bg-amber-600",
};
