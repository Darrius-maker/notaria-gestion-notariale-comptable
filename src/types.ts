export type Role = "NOTAIRE" | "CLERC" | "COMPTABLE";
export type TiersType = "PHYSIQUE" | "MORALE";
export type DossierStatut = "OUVERT" | "SIGNE" | "ARCHIVE";
export type EcritureCategorie = "HONORAIRES" | "TAXES" | "DEBOURS" | "FONDS_CLIENTS";
export type Sens = "DEBIT" | "CREDIT";

export interface User {
  username: string;
  role: Role;
}

export interface Tiers {
  _id: string;
  type: TiersType;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  siret?: string;
  rib?: string;
  kycStatus: "VALIDE" | "EN_ATTENTE" | "REFUSE";
}

export interface Intervenant {
  tiersId: Tiers;
  role: string;
  quotePart: number;
}

export interface Dossier {
  _id: string;
  reference: string;
  objet: string;
  statut: DossierStatut;
  intervenants: Intervenant[];
  createdAt: string;
}

export interface Ecriture {
  _id: string;
  dossierId: string;
  date: string;
  libelle: string;
  montant: string;
  sens: Sens;
  categorie: EcritureCategorie;
}

export type DocumentType = "PIECE_IDENTITE" | "JUSTIFICATIF_DOMICILE" | "ACTE" | "CONTRAT" | "PROCURATION" | "AUTRE";

export interface Document {
  _id: string;
  nom: string;
  type: DocumentType;
  mimeType: string;
  taille: number;
  version: number;
  uploadedBy?: { username: string };
  uploadedAt: string;
  description?: string;
}

export type RendezVousType = "SIGNATURE" | "CONSULTATION" | "REUNION" | "ECHEANCE" | "AUTRE";
export type RendezVousStatut = "PLANIFIE" | "CONFIRME" | "TERMINE" | "ANNULE";

export interface RendezVous {
  _id: string;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  type: RendezVousType;
  dossierId?: { _id: string; reference: string; objet: string };
  participants: Array<{
    tiersId: { _id: string; nom: string; prenom?: string; email: string };
    present: boolean;
  }>;
  lieu?: string;
  statut: RendezVousStatut;
  notes?: string;
  createdBy?: { username: string };
  createdAt: string;
}

export type FactureStatut = "BROUILLON" | "ENVOYEE" | "PAYEE" | "PARTIELLEMENT_PAYEE" | "ANNULEE";
export type LigneType = "EMOLUMENT" | "HONORAIRE" | "DEBOURS" | "TAXE";
export type ModePaiement = "VIREMENT" | "CHEQUE" | "ESPECES" | "CB" | "AUTRE";

export interface LigneFacture {
  description: string;
  type: LigneType;
  quantite: number;
  prixUnitaire: string;
  tauxTVA: number;
  montantHT: string;
  montantTVA: string;
  montantTTC: string;
}

export interface Paiement {
  date: string;
  montant: string;
  mode: ModePaiement;
  reference?: string;
  notes?: string;
}

export interface Facture {
  _id: string;
  numero: string;
  dateEmission: string;
  dateEcheance: string;
  dossierId?: { _id: string; reference: string; objet: string };
  tiersId: { _id: string; nom: string; prenom?: string; email: string };
  lignes: LigneFacture[];
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
  statut: FactureStatut;
  paiements: Paiement[];
  montantPaye: string;
  montantRestant: string;
  notes?: string;
  createdBy?: { username: string };
  createdAt: string;
}

export interface BaremeEmolument {
  _id: string;
  code: string;
  description: string;
  categorie: "ACTE" | "FORMALITE" | "NEGOCIATION" | "CONSEIL";
  typeCalcul: "FIXE" | "PROPORTIONNEL" | "TRANCHE";
  montantFixe?: string;
  tauxProportionnel?: number;
  baseCalcul?: string;
  tranches?: Array<{ de: string; a: string; taux: number }>;
  tauxTVA: number;
}

// Études (Multi-Études / Ordre des Notaires)
export type EtudeStatut = "ACTIVE" | "SUSPENDUE" | "FERMEE";

export interface Etude {
  _id: string;
  nom: string;
  adresse: {
    rue?: string;
    ville?: string;
    codePostal?: string;
    pays: string;
  };
  telephone?: string;
  email?: string;
  siteWeb?: string;
  numeroOrdre?: string;
  notaireTitulaire?: { _id: string; username: string; role: string };
  dateCreation?: string;
  statut: EtudeStatut;
  stats?: {
    nombreDossiers: number;
    nombreActes: number;
    chiffreAffaires: string;
    lastUpdated?: string;
  };
  liveStats?: {
    nombreDossiers: number;
    nombreActes: number;
    chiffreAffaires: string;
    dossiersOuverts: number;
    actesEnCours: number;
  };
  createdAt: string;
}

// Types d'Actes
export type CategorieActe = "IMMOBILIER" | "FAMILLE" | "SUCCESSION" | "SOCIETE" | "PRET" | "PROCURATION" | "AUTRE";

export interface DocumentRequis {
  nom: string;
  obligatoire: boolean;
  description?: string;
}

export interface TypeActe {
  _id: string;
  code: string;
  nom: string;
  categorie: CategorieActe;
  description?: string;
  documentsRequis: DocumentRequis[];
  modeleContenu?: string;
  dureeConservation: number;
  emolumentsBase?: BaremeEmolument;
  actif: boolean;
  createdAt: string;
}

// Actes Notariés
export type ActeStatut =
  | "BROUILLON"
  | "EN_REVISION"
  | "VALIDE"
  | "EN_SIGNATURE"
  | "PARTIELLEMENT_SIGNE"
  | "SIGNE"
  | "ENREGISTRE"
  | "PUBLIE"
  | "ARCHIVE";

export type SignatureType = "PHYSIQUE" | "ELECTRONIQUE";

export interface PartieActe {
  tiersId: { _id: string; nom: string; prenom?: string; email?: string; telephone?: string; type: TiersType; kycStatus: string };
  qualite: string;
  signatureRequise: boolean;
  signatureDate?: string;
  signatureType?: SignatureType;
  signatureVerifiee: boolean;
}

export interface HistoriqueActe {
  action: string;
  statut: ActeStatut;
  date: string;
  userId?: { _id: string; username: string };
  commentaire?: string;
}

export interface Acte {
  _id: string;
  reference: string;
  typeActe: { _id: string; nom: string; code: string; categorie: CategorieActe } | TypeActe;
  dossierId: { _id: string; reference: string; objet: string; statut?: DossierStatut };
  etudeId?: { _id: string; nom: string; adresse?: { ville?: string } };
  titre: string;
  objet?: string;
  contenu?: string;
  statut: ActeStatut;
  parties: PartieActe[];
  historique: HistoriqueActe[];
  dateCreation: string;
  dateValidation?: string;
  dateSignature?: string;
  dateEnregistrement?: string;
  dateArchivage?: string;
  minuteNumero?: string;
  montantTransaction?: string;
  documents?: Document[];
  notes?: string;
  redacteur?: { _id: string; username: string };
  notaireSignataire?: { _id: string; username: string };
  createdBy?: { _id: string; username: string };
  updatedAt: string;
}

// Reporting
export interface GlobalStats {
  nombreEtudes: number;
  etudesActives: number;
  nombreDossiers: number;
  dossiersOuverts: number;
  nombreActes: number;
  actesSignes: number;
  nombreTiers: number;
  tiersKYCValide: number;
  totalChiffreAffaires: string;
  totalPaye: string;
  tauxRecouvrement: string;
  actesByStatut: Record<string, number>;
  monthlyActivity: Array<{ month: string; count: number }>;
}

export interface ReportingData {
  periode: { debut: string; fin: string };
  activite: {
    nombreDossiers: number;
    nombreActes: number;
    nombreFactures: number;
    actesSignes: number;
  };
  financier: {
    totalHonoraires: string;
    totalTaxes: string;
    totalDebours: string;
    totalFondsClients: string;
    totalFacture: string;
    totalPaye: string;
    tauxRecouvrement: string;
  };
  actesByCategorie: Record<string, number>;
  monthlyTrend: Array<{ month: string; dossiers: number; actes: number; factures: number }>;
}
