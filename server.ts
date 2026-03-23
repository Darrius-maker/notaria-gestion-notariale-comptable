import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Decimal128 } from "bson";
import path from "path";

// --- MODELS ---

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["NOTAIRE", "CLERC", "COMPTABLE"], required: true },
});

const TiersSchema = new mongoose.Schema({
  type: { type: String, enum: ["PHYSIQUE", "MORALE"], required: true },
  nom: { type: String, required: true },
  prenom: String,
  email: { type: String, required: true },
  telephone: String,
  siret: String,
  rib: String,
  kycStatus: { type: String, enum: ["VALIDE", "EN_ATTENTE", "REFUSE"], default: "EN_ATTENTE" },
  kycChecklist: [{
    item: { type: String, required: true },
    checked: { type: Boolean, default: false },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    expiresAt: Date,
    notes: String
  }],
  kycLastVerified: Date,
  kycVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  kycNotes: String
});

const DossierSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  objet: { type: String, required: true },
  statut: { type: String, enum: ["OUVERT", "SIGNE", "ARCHIVE"], default: "OUVERT" },
  intervenants: [{
    tiersId: { type: mongoose.Schema.Types.ObjectId, ref: "Tiers" },
    role: String,
    quotePart: Number
  }],
  createdAt: { type: Date, default: Date.now },
});

const EcritureSchema = new mongoose.Schema({
  dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true, index: true },
  date: { type: Date, default: Date.now },
  libelle: { type: String, required: true },
  montant: { type: mongoose.Schema.Types.Decimal128, required: true },
  sens: { type: String, enum: ["DEBIT", "CREDIT"], required: true },
  categorie: { type: String, enum: ["HONORAIRES", "TAXES", "DEBOURS", "FONDS_CLIENTS"], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: String,
  entity: String,
  entityId: mongoose.Schema.Types.ObjectId,
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

const DocumentSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  type: { type: String, enum: ["PIECE_IDENTITE", "JUSTIFICATIF_DOMICILE", "ACTE", "CONTRAT", "PROCURATION", "AUTRE"], required: true },
  mimeType: { type: String, required: true },
  taille: { type: Number, required: true },
  contenu: { type: String, required: true }, // Base64 encoded
  dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier" },
  tiersId: { type: mongoose.Schema.Types.ObjectId, ref: "Tiers" },
  version: { type: Number, default: 1 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" }, // For versioning
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploadedAt: { type: Date, default: Date.now },
  description: String,
});

const RendezVousSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: String,
  dateDebut: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  type: { type: String, enum: ["SIGNATURE", "CONSULTATION", "REUNION", "ECHEANCE", "AUTRE"], required: true },
  dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier" },
  participants: [{
    tiersId: { type: mongoose.Schema.Types.ObjectId, ref: "Tiers" },
    present: { type: Boolean, default: false }
  }],
  lieu: String,
  rappels: [{
    type: { type: String, enum: ["EMAIL", "SMS", "NOTIFICATION"] },
    delai: Number,
    envoye: { type: Boolean, default: false }
  }],
  statut: { type: String, enum: ["PLANIFIE", "CONFIRME", "TERMINE", "ANNULE"], default: "PLANIFIE" },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});

const FactureSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  dateEmission: { type: Date, default: Date.now },
  dateEcheance: { type: Date, required: true },
  dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier" },
  tiersId: { type: mongoose.Schema.Types.ObjectId, ref: "Tiers", required: true },
  lignes: [{
    description: { type: String, required: true },
    type: { type: String, enum: ["EMOLUMENT", "HONORAIRE", "DEBOURS", "TAXE"], required: true },
    quantite: { type: Number, default: 1 },
    prixUnitaire: { type: mongoose.Schema.Types.Decimal128, required: true },
    tauxTVA: { type: Number, default: 20 },
    montantHT: { type: mongoose.Schema.Types.Decimal128, required: true },
    montantTVA: { type: mongoose.Schema.Types.Decimal128, required: true },
    montantTTC: { type: mongoose.Schema.Types.Decimal128, required: true }
  }],
  totalHT: { type: mongoose.Schema.Types.Decimal128, required: true },
  totalTVA: { type: mongoose.Schema.Types.Decimal128, required: true },
  totalTTC: { type: mongoose.Schema.Types.Decimal128, required: true },
  statut: {
    type: String,
    enum: ["BROUILLON", "ENVOYEE", "PAYEE", "PARTIELLEMENT_PAYEE", "ANNULEE"],
    default: "BROUILLON"
  },
  paiements: [{
    date: { type: Date, default: Date.now },
    montant: { type: mongoose.Schema.Types.Decimal128, required: true },
    mode: { type: String, enum: ["VIREMENT", "CHEQUE", "ESPECES", "CB", "AUTRE"], required: true },
    reference: String,
    notes: String
  }],
  montantPaye: { type: mongoose.Schema.Types.Decimal128, default: Decimal128.fromString("0") },
  montantRestant: { type: mongoose.Schema.Types.Decimal128 },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});

// Barème des émoluments notariaux (simplifié)
const BaremeEmolumentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  categorie: { type: String, enum: ["ACTE", "FORMALITE", "NEGOCIATION", "CONSEIL"], required: true },
  typeCalcul: { type: String, enum: ["FIXE", "PROPORTIONNEL", "TRANCHE"], required: true },
  // Pour type FIXE
  montantFixe: { type: mongoose.Schema.Types.Decimal128 },
  // Pour type PROPORTIONNEL
  tauxProportionnel: Number,
  baseCalcul: String, // ex: "PRIX_VENTE", "VALEUR_BIEN"
  // Pour type TRANCHE
  tranches: [{
    de: { type: mongoose.Schema.Types.Decimal128 },
    a: { type: mongoose.Schema.Types.Decimal128 },
    taux: Number
  }],
  tauxTVA: { type: Number, default: 20 },
  actif: { type: Boolean, default: true }
});

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["INFO", "WARNING", "ERROR", "SUCCESS"], default: "INFO" },
  categorie: { type: String, enum: ["KYC", "DOSSIER", "FACTURE", "RDV", "SYSTEME"], required: true },
  titre: { type: String, required: true },
  message: { type: String, required: true },
  lien: String,
  lue: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Étude notariale (Office)
const EtudeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  adresse: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: { type: String, default: "Burkina Faso" }
  },
  telephone: String,
  email: String,
  siteWeb: String,
  numeroOrdre: { type: String, unique: true }, // Numéro d'inscription à l'Ordre
  notaireTitulaire: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  dateCreation: Date,
  statut: { type: String, enum: ["ACTIVE", "SUSPENDUE", "FERMEE"], default: "ACTIVE" },
  // Statistiques agrégées (calculées périodiquement)
  stats: {
    nombreDossiers: { type: Number, default: 0 },
    nombreActes: { type: Number, default: 0 },
    chiffreAffaires: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    lastUpdated: Date
  },
  createdAt: { type: Date, default: Date.now }
});

// Types d'actes notariés
const TypeActeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  nom: { type: String, required: true },
  categorie: {
    type: String,
    enum: ["IMMOBILIER", "FAMILLE", "SUCCESSION", "SOCIETE", "PRET", "PROCURATION", "AUTRE"],
    required: true
  },
  description: String,
  documentsRequis: [{
    nom: String,
    obligatoire: { type: Boolean, default: true },
    description: String
  }],
  modeleContenu: String, // Template HTML/Markdown pour le contenu de l'acte
  dureeConservation: { type: Number, default: 75 }, // En années (minutier)
  emolumentsBase: { type: mongoose.Schema.Types.ObjectId, ref: "BaremeEmolument" },
  actif: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Acte notarié
const ActeSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  typeActe: { type: mongoose.Schema.Types.ObjectId, ref: "TypeActe", required: true },
  dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true },
  etudeId: { type: mongoose.Schema.Types.ObjectId, ref: "Etude" },
  titre: { type: String, required: true },
  objet: String,
  contenu: String, // Contenu de l'acte (HTML/Markdown)
  // Workflow
  statut: {
    type: String,
    enum: [
      "BROUILLON",       // En cours de rédaction
      "EN_REVISION",     // Soumis pour révision
      "VALIDE",          // Validé par le notaire
      "EN_SIGNATURE",    // En attente de signatures
      "PARTIELLEMENT_SIGNE", // Certaines signatures obtenues
      "SIGNE",           // Toutes signatures obtenues
      "ENREGISTRE",      // Enregistré aux impôts
      "PUBLIE",          // Publié (si applicable)
      "ARCHIVE"          // Archivé au minutier
    ],
    default: "BROUILLON"
  },
  // Parties prenantes à l'acte
  parties: [{
    tiersId: { type: mongoose.Schema.Types.ObjectId, ref: "Tiers" },
    qualite: String, // Ex: "Vendeur", "Acquéreur", "Témoin"
    signatureRequise: { type: Boolean, default: true },
    signatureDate: Date,
    signatureType: { type: String, enum: ["PHYSIQUE", "ELECTRONIQUE"] },
    signatureVerifiee: { type: Boolean, default: false }
  }],
  // Historique du workflow
  historique: [{
    action: String,
    statut: String,
    date: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    commentaire: String
  }],
  // Dates importantes
  dateCreation: { type: Date, default: Date.now },
  dateValidation: Date,
  dateSignature: Date, // Date de dernière signature
  dateEnregistrement: Date,
  dateArchivage: Date,
  // Informations complémentaires
  minuteNumero: String, // Numéro dans le minutier
  montantTransaction: { type: mongoose.Schema.Types.Decimal128 }, // Pour calcul émoluments
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  notes: String,
  // Métadonnées
  redacteur: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notaireSignataire: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Tiers = mongoose.model("Tiers", TiersSchema);
const Notification = mongoose.model("Notification", NotificationSchema);
const Dossier = mongoose.model("Dossier", DossierSchema);
const Ecriture = mongoose.model("Ecriture", EcritureSchema);
const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
const Document = mongoose.model("Document", DocumentSchema);
const RendezVous = mongoose.model("RendezVous", RendezVousSchema);
const Facture = mongoose.model("Facture", FactureSchema);
const BaremeEmolument = mongoose.model("BaremeEmolument", BaremeEmolumentSchema);
const Etude = mongoose.model("Etude", EtudeSchema);
const TypeActe = mongoose.model("TypeActe", TypeActeSchema);
const Acte = mongoose.model("Acte", ActeSchema);

// --- SERVER SETUP ---

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/notaria";
  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-notary-key@12233843734734734837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483748374837483";

  // Connect to MongoDB (Optional: handle failure gracefully for demo)
  mongoose.connect(MONGODB_URI).then(async () => {
    console.log("Connected to MongoDB");
    // Seed initial user if none exists
    const count = await User.countDocuments();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const admin = await User.create({
        username: "admin",
        password: hashedPassword,
        role: "NOTAIRE"
      });
      console.log("Initial user created: admin / admin123");

      // Seed Tiers
      const client1 = await Tiers.create({
        type: "PHYSIQUE",
        nom: "DUPONT",
        prenom: "Jean",
        email: "jean.dupont@email.com",
        telephone: "0123456789",
        kycStatus: "VALIDE"
      });

      const client2 = await Tiers.create({
        type: "MORALE",
        nom: "SCI IMMO PLUS",
        email: "contact@immoplus.fr",
        siret: "12345678901234",
        kycStatus: "VALIDE"
      });

      // Seed Dossiers
      const dossier1 = await Dossier.create({
        reference: "VENTE-2024-001",
        objet: "Vente Maison de Campagne - Famille Martin",
        statut: "OUVERT",
        intervenants: [
          { tiersId: client1._id, role: "ACQUÉREUR", quotePart: 100 }
        ]
      });

      const dossier2 = await Dossier.create({
        reference: "PROCURATION-2024-042",
        objet: "Procuration Générale - SCI IMMO PLUS",
        statut: "SIGNE",
        intervenants: [
          { tiersId: client2._id, role: "MANDANT", quotePart: 100 }
        ]
      });

      // Seed Ecritures
      await Ecriture.create({
        dossierId: dossier1._id,
        libelle: "Provision sur frais de vente",
        montant: Decimal128.fromString("2500.00"),
        sens: "CREDIT",
        categorie: "FONDS_CLIENTS",
        createdBy: admin._id
      });

      await Ecriture.create({
        dossierId: dossier1._id,
        libelle: "Honoraires de rédaction d'acte",
        montant: Decimal128.fromString("450.00"),
        sens: "DEBIT",
        categorie: "HONORAIRES",
        createdBy: admin._id
      });

      await Ecriture.create({
        dossierId: dossier2._id,
        libelle: "Frais de dossier procuration",
        montant: Decimal128.fromString("150.00"),
        sens: "CREDIT",
        categorie: "FONDS_CLIENTS",
        createdBy: admin._id
      });
      console.log("Fake data seeded successfully");
    }
  }).catch(err => console.error("MongoDB connection error:", err));

  // --- MIDDLEWARES ---

  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const audit = (action: string, entity: string) => async (req: any, res: any, next: any) => {
    const originalSend = res.send;
    res.send = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        AuditLog.create({
          userId: req.user.id,
          action,
          entity,
          entityId: req.params.id || body._id,
          newValue: req.body,
          timestamp: new Date()
        }).catch(console.error);
      }
      return originalSend.apply(res, arguments as any);
    };
    next();
  };

  // --- API ROUTES ---

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { username: user.username, role: user.role } });
  });

  app.get("/api/dossiers", authenticate, async (req, res) => {
    const dossiers = await Dossier.find().populate("intervenants.tiersId");
    res.json(dossiers);
  });

  app.get("/api/dossiers/:id/ecritures", authenticate, async (req, res) => {
    const ecritures = await Ecriture.find({ dossierId: req.params.id }).sort({ date: -1 });
    res.json(ecritures);
  });

  app.get("/api/dossiers/:id/solde", authenticate, async (req, res) => {
    const ecritures = await Ecriture.find({ dossierId: req.params.id });
    let solde = 0;
    ecritures.forEach(e => {
      const val = parseFloat(e.montant.toString());
      if (e.sens === "CREDIT") solde += val;
      else solde -= val;
    });
    res.json({ solde: solde.toFixed(2) });
  });

  app.post("/api/ecritures", authenticate, audit("CREATE", "Ecriture"), async (req, res) => {
    const { dossierId, montant, sens, libelle, categorie } = req.body;
    const valMontant = parseFloat(montant);

    if (sens === "DEBIT") {
      const ecritures = await Ecriture.find({ dossierId });
      let soldeActuel = 0;
      ecritures.forEach(e => {
        const val = parseFloat(e.montant.toString());
        if (e.sens === "CREDIT") soldeActuel += val;
        else soldeActuel -= val;
      });

      if (soldeActuel < valMontant) {
        return res.status(400).json({ error: "Solde insuffisant pour débiter ce dossier." });
      }
    }

    const ecriture = await Ecriture.create({
      dossierId,
      montant: Decimal128.fromString(montant),
      sens,
      libelle,
      categorie,
      createdBy: (req as any).user.id
    });
    res.json(ecriture);
  });

  app.get("/api/tiers", authenticate, async (req, res) => {
    const tiers = await Tiers.find();
    res.json(tiers);
  });

  app.post("/api/tiers", authenticate, audit("CREATE", "Tiers"), async (req, res) => {
    const tiers = await Tiers.create(req.body);
    res.json(tiers);
  });

  app.put("/api/tiers/:id", authenticate, async (req, res) => {
    try {
      const oldTiers = await Tiers.findById(req.params.id);
      const tiers = await Tiers.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!tiers) return res.status(404).json({ error: "Tiers non trouvé" });

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "UPDATE",
        entity: "Tiers",
        entityId: req.params.id,
        oldValue: oldTiers,
        newValue: tiers,
        timestamp: new Date()
      });

      res.json(tiers);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  // KYC Checklist items by tiers type
  const KYC_CHECKLIST = {
    PHYSIQUE: [
      "Pièce d'identité en cours de validité",
      "Justificatif de domicile de moins de 3 mois",
      "Relevé d'identité bancaire (RIB)"
    ],
    MORALE: [
      "Extrait Kbis de moins de 3 mois",
      "Statuts de la société",
      "Pièce d'identité du représentant légal",
      "Justificatif de domicile du siège social",
      "Relevé d'identité bancaire (RIB)"
    ]
  };

  // Get KYC status and checklist for a tiers
  app.get("/api/tiers/:id/kyc", authenticate, async (req, res) => {
    try {
      const tiers = await Tiers.findById(req.params.id)
        .populate("kycChecklist.documentId", "nom type uploadedAt")
        .populate("kycChecklist.verifiedBy", "username")
        .populate("kycVerifiedBy", "username");

      if (!tiers) return res.status(404).json({ error: "Tiers non trouvé" });

      // Initialize checklist if empty
      if (!tiers.kycChecklist || tiers.kycChecklist.length === 0) {
        const defaultItems = KYC_CHECKLIST[tiers.type as keyof typeof KYC_CHECKLIST] || [];
        await Tiers.findByIdAndUpdate(req.params.id, {
          kycChecklist: defaultItems.map(item => ({
            item,
            checked: false,
            notes: ""
          }))
        });
        // Reload tiers with populated fields
        const updatedTiers = await Tiers.findById(req.params.id)
          .populate("kycChecklist.documentId", "nom type uploadedAt")
          .populate("kycChecklist.verifiedBy", "username")
          .populate("kycVerifiedBy", "username");

        return res.json({
          kycStatus: updatedTiers!.kycStatus,
          kycChecklist: updatedTiers!.kycChecklist,
          kycLastVerified: updatedTiers!.kycLastVerified,
          kycVerifiedBy: updatedTiers!.kycVerifiedBy,
          kycNotes: updatedTiers!.kycNotes
        });
      }

      res.json({
        kycStatus: tiers.kycStatus,
        kycChecklist: tiers.kycChecklist,
        kycLastVerified: tiers.kycLastVerified,
        kycVerifiedBy: tiers.kycVerifiedBy,
        kycNotes: tiers.kycNotes
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération du KYC" });
    }
  });

  // Update KYC checklist item
  app.put("/api/tiers/:id/kyc/item/:index", authenticate, async (req, res) => {
    try {
      const { checked, documentId, expiresAt, notes } = req.body;
      const tiers = await Tiers.findById(req.params.id);

      if (!tiers) return res.status(404).json({ error: "Tiers non trouvé" });

      const index = parseInt(req.params.index);
      if (index < 0 || index >= (tiers.kycChecklist?.length || 0)) {
        return res.status(400).json({ error: "Index invalide" });
      }

      tiers.kycChecklist![index].checked = checked;
      if (documentId !== undefined) tiers.kycChecklist![index].documentId = documentId;
      if (expiresAt !== undefined) tiers.kycChecklist![index].expiresAt = expiresAt;
      if (notes !== undefined) tiers.kycChecklist![index].notes = notes;

      if (checked) {
        tiers.kycChecklist![index].verifiedBy = (req as any).user.id;
        tiers.kycChecklist![index].verifiedAt = new Date();
      }

      await tiers.save();

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "KYC_UPDATE",
        entity: "Tiers",
        entityId: req.params.id,
        newValue: { item: tiers.kycChecklist![index].item, checked },
        timestamp: new Date()
      });

      res.json(tiers.kycChecklist![index]);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  // Validate or reject KYC
  app.put("/api/tiers/:id/kyc/validate", authenticate, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const tiers = await Tiers.findById(req.params.id);

      if (!tiers) return res.status(404).json({ error: "Tiers non trouvé" });

      if (status === "VALIDE") {
        // Check if all items are checked
        const allChecked = tiers.kycChecklist?.every(item => item.checked);
        if (!allChecked) {
          return res.status(400).json({ error: "Tous les éléments doivent être vérifiés pour valider le KYC" });
        }
      }

      tiers.kycStatus = status;
      tiers.kycNotes = notes;
      tiers.kycLastVerified = new Date();
      tiers.kycVerifiedBy = (req as any).user.id;
      await tiers.save();

      await AuditLog.create({
        userId: (req as any).user.id,
        action: status === "VALIDE" ? "KYC_VALIDATE" : "KYC_REJECT",
        entity: "Tiers",
        entityId: req.params.id,
        newValue: { status, notes },
        timestamp: new Date()
      });

      res.json({
        kycStatus: tiers.kycStatus,
        kycLastVerified: tiers.kycLastVerified,
        kycNotes: tiers.kycNotes
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la validation" });
    }
  });

  // Get KYC alerts (expired or expiring documents)
  app.get("/api/kyc/alerts", authenticate, async (req, res) => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const tiersWithAlerts = await Tiers.find({
        $or: [
          { kycStatus: "EN_ATTENTE" },
          { "kycChecklist.expiresAt": { $lte: thirtyDaysFromNow } }
        ]
      }).select("nom prenom type kycStatus kycChecklist");

      const alerts: any[] = [];

      tiersWithAlerts.forEach(tiers => {
        if (tiers.kycStatus === "EN_ATTENTE") {
          alerts.push({
            type: "pending",
            tiersId: tiers._id,
            tiersName: `${tiers.nom} ${tiers.prenom || ""}`.trim(),
            message: "KYC en attente de validation"
          });
        }

        tiers.kycChecklist?.forEach(item => {
          if (item.expiresAt) {
            const expiresAt = new Date(item.expiresAt);
            const now = new Date();
            if (expiresAt <= now) {
              alerts.push({
                type: "expired",
                tiersId: tiers._id,
                tiersName: `${tiers.nom} ${tiers.prenom || ""}`.trim(),
                message: `${item.item} expiré`,
                expiresAt: item.expiresAt
              });
            } else if (expiresAt <= thirtyDaysFromNow) {
              alerts.push({
                type: "expiring",
                tiersId: tiers._id,
                tiersName: `${tiers.nom} ${tiers.prenom || ""}`.trim(),
                message: `${item.item} expire bientôt`,
                expiresAt: item.expiresAt
              });
            }
          }
        });
      });

      res.json(alerts);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des alertes" });
    }
  });

  app.delete("/api/tiers/:id", authenticate, async (req, res) => {
    try {
      const tiers = await Tiers.findById(req.params.id);
      if (!tiers) return res.status(404).json({ error: "Tiers non trouvé" });

      // Vérifier si le tiers est utilisé dans un dossier
      const dossiersWithTiers = await Dossier.find({ "intervenants.tiersId": req.params.id });
      if (dossiersWithTiers.length > 0) {
        return res.status(400).json({
          error: `Ce tiers est associé à ${dossiersWithTiers.length} dossier(s). Suppression impossible.`
        });
      }

      await Tiers.findByIdAndDelete(req.params.id);

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "DELETE",
        entity: "Tiers",
        entityId: req.params.id,
        oldValue: tiers,
        timestamp: new Date()
      });

      res.json({ success: true, message: "Tiers supprimé" });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // --- DOSSIERS CRUD ---

  app.post("/api/dossiers", authenticate, audit("CREATE", "Dossier"), async (req, res) => {
    try {
      const dossier = await Dossier.create(req.body);
      const populatedDossier = await Dossier.findById(dossier._id).populate("intervenants.tiersId");
      res.json(populatedDossier);
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(400).json({ error: "Cette référence existe déjà" });
      }
      res.status(500).json({ error: "Erreur lors de la création" });
    }
  });

  app.put("/api/dossiers/:id", authenticate, async (req, res) => {
    try {
      const oldDossier = await Dossier.findById(req.params.id);
      const dossier = await Dossier.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("intervenants.tiersId");
      if (!dossier) return res.status(404).json({ error: "Dossier non trouvé" });

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "UPDATE",
        entity: "Dossier",
        entityId: req.params.id,
        oldValue: oldDossier,
        newValue: dossier,
        timestamp: new Date()
      });

      res.json(dossier);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/dossiers/:id", authenticate, async (req, res) => {
    try {
      const dossier = await Dossier.findById(req.params.id);
      if (!dossier) return res.status(404).json({ error: "Dossier non trouvé" });

      // Supprimer les écritures associées
      await Ecriture.deleteMany({ dossierId: req.params.id });
      await Dossier.findByIdAndDelete(req.params.id);

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "DELETE",
        entity: "Dossier",
        entityId: req.params.id,
        oldValue: dossier,
        timestamp: new Date()
      });

      res.json({ success: true, message: "Dossier et écritures associées supprimés" });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // --- ECRITURES CRUD ---

  app.put("/api/ecritures/:id", authenticate, async (req, res) => {
    try {
      const oldEcriture = await Ecriture.findById(req.params.id);
      if (!oldEcriture) return res.status(404).json({ error: "Écriture non trouvée" });

      const { montant, sens } = req.body;
      const valMontant = parseFloat(montant);

      // Si on change le sens en DEBIT ou augmente le montant d'un DEBIT, vérifier le solde
      if (sens === "DEBIT") {
        const ecritures = await Ecriture.find({ dossierId: oldEcriture.dossierId, _id: { $ne: req.params.id } });
        let soldeActuel = 0;
        ecritures.forEach(e => {
          const val = parseFloat(e.montant.toString());
          if (e.sens === "CREDIT") soldeActuel += val;
          else soldeActuel -= val;
        });

        if (soldeActuel < valMontant) {
          return res.status(400).json({ error: "Solde insuffisant pour cette modification" });
        }
      }

      const updateData = {
        ...req.body,
        montant: Decimal128.fromString(montant)
      };

      const ecriture = await Ecriture.findByIdAndUpdate(req.params.id, updateData, { new: true });

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "UPDATE",
        entity: "Ecriture",
        entityId: req.params.id,
        oldValue: oldEcriture,
        newValue: ecriture,
        timestamp: new Date()
      });

      res.json(ecriture);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/ecritures/:id", authenticate, async (req, res) => {
    try {
      const ecriture = await Ecriture.findById(req.params.id);
      if (!ecriture) return res.status(404).json({ error: "Écriture non trouvée" });

      // Si c'est un CREDIT, vérifier que la suppression ne rend pas le solde négatif
      if (ecriture.sens === "CREDIT") {
        const ecritures = await Ecriture.find({ dossierId: ecriture.dossierId, _id: { $ne: req.params.id } });
        let soldeApres = 0;
        ecritures.forEach(e => {
          const val = parseFloat(e.montant.toString());
          if (e.sens === "CREDIT") soldeApres += val;
          else soldeApres -= val;
        });

        if (soldeApres < 0) {
          return res.status(400).json({ error: "Impossible de supprimer: le solde deviendrait négatif" });
        }
      }

      await Ecriture.findByIdAndDelete(req.params.id);

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "DELETE",
        entity: "Ecriture",
        entityId: req.params.id,
        oldValue: ecriture,
        timestamp: new Date()
      });

      res.json({ success: true, message: "Écriture supprimée" });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // --- RENDEZ-VOUS API ---

  app.get("/api/rendez-vous", authenticate, async (req, res) => {
    try {
      const { start, end, dossierId } = req.query;
      const filter: any = {};

      if (start && end) {
        filter.dateDebut = { $gte: new Date(start as string), $lte: new Date(end as string) };
      }
      if (dossierId) {
        filter.dossierId = dossierId;
      }

      const rdvs = await RendezVous.find(filter)
        .populate("dossierId", "reference objet")
        .populate("participants.tiersId", "nom prenom email")
        .populate("createdBy", "username")
        .sort({ dateDebut: 1 });

      res.json(rdvs);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  app.get("/api/rendez-vous/upcoming/list", authenticate, async (req, res) => {
    try {
      const now = new Date();
      const rdvs = await RendezVous.find({
        dateDebut: { $gte: now },
        statut: { $in: ["PLANIFIE", "CONFIRME"] }
      })
        .populate("dossierId", "reference")
        .populate("participants.tiersId", "nom prenom")
        .sort({ dateDebut: 1 })
        .limit(5);

      res.json(rdvs);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  app.get("/api/rendez-vous/:id", authenticate, async (req, res) => {
    try {
      const rdv = await RendezVous.findById(req.params.id)
        .populate("dossierId", "reference objet")
        .populate("participants.tiersId", "nom prenom email telephone")
        .populate("createdBy", "username");

      if (!rdv) return res.status(404).json({ error: "Rendez-vous non trouvé" });
      res.json(rdv);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  app.post("/api/rendez-vous", authenticate, async (req, res) => {
    try {
      const rdv = await RendezVous.create({
        ...req.body,
        createdBy: (req as any).user.id
      });

      const populated = await RendezVous.findById(rdv._id)
        .populate("dossierId", "reference objet")
        .populate("participants.tiersId", "nom prenom email")
        .populate("createdBy", "username");

      res.json(populated);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la création" });
    }
  });

  app.put("/api/rendez-vous/:id", authenticate, async (req, res) => {
    try {
      const rdv = await RendezVous.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .populate("dossierId", "reference objet")
        .populate("participants.tiersId", "nom prenom email")
        .populate("createdBy", "username");

      if (!rdv) return res.status(404).json({ error: "Rendez-vous non trouvé" });
      res.json(rdv);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/rendez-vous/:id", authenticate, async (req, res) => {
    try {
      const rdv = await RendezVous.findById(req.params.id);
      if (!rdv) return res.status(404).json({ error: "Rendez-vous non trouvé" });

      await RendezVous.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: "Rendez-vous supprimé" });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // --- DOCUMENTS API ---

  // Get documents for a dossier
  app.get("/api/dossiers/:id/documents", authenticate, async (req, res) => {
    try {
      const documents = await Document.find({
        dossierId: req.params.id,
        parentId: null // Only get latest versions
      }).populate("uploadedBy", "username").sort({ uploadedAt: -1 });

      // Don't send the full content in list view
      const docs = documents.map(d => ({
        _id: d._id,
        nom: d.nom,
        type: d.type,
        mimeType: d.mimeType,
        taille: d.taille,
        version: d.version,
        uploadedBy: d.uploadedBy,
        uploadedAt: d.uploadedAt,
        description: d.description
      }));

      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des documents" });
    }
  });

  // Get documents for a tiers
  app.get("/api/tiers/:id/documents", authenticate, async (req, res) => {
    try {
      const documents = await Document.find({
        tiersId: req.params.id,
        parentId: null
      }).populate("uploadedBy", "username").sort({ uploadedAt: -1 });

      const docs = documents.map(d => ({
        _id: d._id,
        nom: d.nom,
        type: d.type,
        mimeType: d.mimeType,
        taille: d.taille,
        version: d.version,
        uploadedBy: d.uploadedBy,
        uploadedAt: d.uploadedAt,
        description: d.description
      }));

      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des documents" });
    }
  });

  // Upload document
  app.post("/api/documents", authenticate, async (req, res) => {
    try {
      const { nom, type, mimeType, taille, contenu, dossierId, tiersId, description } = req.body;

      if (!dossierId && !tiersId) {
        return res.status(400).json({ error: "Un dossier ou un tiers doit être spécifié" });
      }

      // Check file size (max 10MB in base64)
      if (contenu && contenu.length > 13333333) { // ~10MB in base64
        return res.status(400).json({ error: "Le fichier est trop volumineux (max 10MB)" });
      }

      const document = await Document.create({
        nom,
        type,
        mimeType,
        taille,
        contenu,
        dossierId: dossierId || null,
        tiersId: tiersId || null,
        description,
        uploadedBy: (req as any).user.id
      });

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "UPLOAD",
        entity: "Document",
        entityId: document._id,
        newValue: { nom, type, taille },
        timestamp: new Date()
      });

      res.json({
        _id: document._id,
        nom: document.nom,
        type: document.type,
        mimeType: document.mimeType,
        taille: document.taille,
        version: document.version,
        uploadedAt: document.uploadedAt,
        description: document.description
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de l'upload du document" });
    }
  });

  // Get document content (download)
  app.get("/api/documents/:id/download", authenticate, async (req, res) => {
    try {
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document non trouvé" });
      }

      res.json({
        nom: document.nom,
        mimeType: document.mimeType,
        contenu: document.contenu
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du téléchargement" });
    }
  });

  // Update document (new version)
  app.put("/api/documents/:id", authenticate, async (req, res) => {
    try {
      const oldDoc = await Document.findById(req.params.id);
      if (!oldDoc) {
        return res.status(404).json({ error: "Document non trouvé" });
      }

      const { nom, contenu, mimeType, taille, description } = req.body;

      // Archive the old version
      oldDoc.parentId = oldDoc._id;
      await Document.create({
        ...oldDoc.toObject(),
        _id: undefined,
        parentId: oldDoc._id
      });

      // Update the current document
      const updated = await Document.findByIdAndUpdate(req.params.id, {
        nom: nom || oldDoc.nom,
        contenu: contenu || oldDoc.contenu,
        mimeType: mimeType || oldDoc.mimeType,
        taille: taille || oldDoc.taille,
        description: description !== undefined ? description : oldDoc.description,
        version: oldDoc.version + 1,
        uploadedBy: (req as any).user.id,
        uploadedAt: new Date()
      }, { new: true });

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "UPDATE",
        entity: "Document",
        entityId: req.params.id,
        oldValue: { version: oldDoc.version },
        newValue: { version: updated!.version },
        timestamp: new Date()
      });

      res.json({
        _id: updated!._id,
        nom: updated!.nom,
        type: updated!.type,
        mimeType: updated!.mimeType,
        taille: updated!.taille,
        version: updated!.version,
        uploadedAt: updated!.uploadedAt,
        description: updated!.description
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", authenticate, async (req, res) => {
    try {
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document non trouvé" });
      }

      // Delete all versions
      await Document.deleteMany({
        $or: [
          { _id: req.params.id },
          { parentId: req.params.id }
        ]
      });

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "DELETE",
        entity: "Document",
        entityId: req.params.id,
        oldValue: { nom: document.nom, type: document.type },
        timestamp: new Date()
      });

      res.json({ success: true, message: "Document supprimé" });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // Get document versions
  app.get("/api/documents/:id/versions", authenticate, async (req, res) => {
    try {
      const versions = await Document.find({
        $or: [
          { _id: req.params.id },
          { parentId: req.params.id }
        ]
      }).populate("uploadedBy", "username").sort({ version: -1 });

      const docs = versions.map(d => ({
        _id: d._id,
        nom: d.nom,
        version: d.version,
        taille: d.taille,
        uploadedBy: d.uploadedBy,
        uploadedAt: d.uploadedAt
      }));

      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des versions" });
    }
  });

  // --- FACTURES API ---

  // Generate next invoice number
  const generateFactureNumber = async () => {
    const year = new Date().getFullYear();
    const lastFacture = await Facture.findOne({
      numero: new RegExp(`^FAC-${year}-`)
    }).sort({ numero: -1 });

    if (lastFacture) {
      const lastNum = parseInt(lastFacture.numero.split('-')[2]);
      return `FAC-${year}-${String(lastNum + 1).padStart(4, '0')}`;
    }
    return `FAC-${year}-0001`;
  };

  // Get all factures
  app.get("/api/factures", authenticate, async (req, res) => {
    try {
      const { statut, tiersId, dossierId } = req.query;
      const filter: any = {};

      if (statut) filter.statut = statut;
      if (tiersId) filter.tiersId = tiersId;
      if (dossierId) filter.dossierId = dossierId;

      const factures = await Facture.find(filter)
        .populate("dossierId", "reference objet")
        .populate("tiersId", "nom prenom email")
        .populate("createdBy", "username")
        .sort({ dateEmission: -1 });

      res.json(factures);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Get facture by ID
  app.get("/api/factures/:id", authenticate, async (req, res) => {
    try {
      const facture = await Facture.findById(req.params.id)
        .populate("dossierId", "reference objet")
        .populate("tiersId", "nom prenom email telephone")
        .populate("createdBy", "username");

      if (!facture) return res.status(404).json({ error: "Facture non trouvée" });
      res.json(facture);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Create facture
  app.post("/api/factures", authenticate, async (req, res) => {
    try {
      const { tiersId, dossierId, dateEcheance, lignes, notes } = req.body;

      // Calculate totals
      let totalHT = 0;
      let totalTVA = 0;
      let totalTTC = 0;

      const lignesCalculees = lignes.map((ligne: any) => {
        const prixUnit = parseFloat(ligne.prixUnitaire);
        const quantite = ligne.quantite || 1;
        const tauxTVA = ligne.tauxTVA ?? 20;

        const montantHT = prixUnit * quantite;
        const montantTVA = montantHT * (tauxTVA / 100);
        const montantTTC = montantHT + montantTVA;

        totalHT += montantHT;
        totalTVA += montantTVA;
        totalTTC += montantTTC;

        return {
          ...ligne,
          prixUnitaire: Decimal128.fromString(prixUnit.toFixed(2)),
          quantite,
          tauxTVA,
          montantHT: Decimal128.fromString(montantHT.toFixed(2)),
          montantTVA: Decimal128.fromString(montantTVA.toFixed(2)),
          montantTTC: Decimal128.fromString(montantTTC.toFixed(2))
        };
      });

      const numero = await generateFactureNumber();

      const facture = await Facture.create({
        numero,
        tiersId,
        dossierId: dossierId || null,
        dateEcheance: new Date(dateEcheance),
        lignes: lignesCalculees,
        totalHT: Decimal128.fromString(totalHT.toFixed(2)),
        totalTVA: Decimal128.fromString(totalTVA.toFixed(2)),
        totalTTC: Decimal128.fromString(totalTTC.toFixed(2)),
        montantRestant: Decimal128.fromString(totalTTC.toFixed(2)),
        notes,
        createdBy: (req as any).user.id
      });

      const populated = await Facture.findById(facture._id)
        .populate("dossierId", "reference objet")
        .populate("tiersId", "nom prenom email")
        .populate("createdBy", "username");

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "CREATE",
        entity: "Facture",
        entityId: facture._id,
        newValue: { numero, totalTTC },
        timestamp: new Date()
      });

      res.json(populated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la création" });
    }
  });

  // Update facture
  app.put("/api/factures/:id", authenticate, async (req, res) => {
    try {
      const facture = await Facture.findById(req.params.id);
      if (!facture) return res.status(404).json({ error: "Facture non trouvée" });

      // Cannot modify paid invoices
      if (facture.statut === "PAYEE") {
        return res.status(400).json({ error: "Impossible de modifier une facture payée" });
      }

      const { lignes, dateEcheance, notes, statut } = req.body;

      // If status change only
      if (statut && !lignes) {
        facture.statut = statut;
        await facture.save();

        const updated = await Facture.findById(req.params.id)
          .populate("dossierId", "reference objet")
          .populate("tiersId", "nom prenom email")
          .populate("createdBy", "username");

        return res.json(updated);
      }

      // Recalculate totals if lignes changed
      if (lignes) {
        let totalHT = 0;
        let totalTVA = 0;
        let totalTTC = 0;

        const lignesCalculees = lignes.map((ligne: any) => {
          const prixUnit = parseFloat(ligne.prixUnitaire);
          const quantite = ligne.quantite || 1;
          const tauxTVA = ligne.tauxTVA ?? 20;

          const montantHT = prixUnit * quantite;
          const montantTVA = montantHT * (tauxTVA / 100);
          const montantTTC = montantHT + montantTVA;

          totalHT += montantHT;
          totalTVA += montantTVA;
          totalTTC += montantTTC;

          return {
            ...ligne,
            prixUnitaire: Decimal128.fromString(prixUnit.toFixed(2)),
            quantite,
            tauxTVA,
            montantHT: Decimal128.fromString(montantHT.toFixed(2)),
            montantTVA: Decimal128.fromString(montantTVA.toFixed(2)),
            montantTTC: Decimal128.fromString(montantTTC.toFixed(2))
          };
        });

        facture.lignes = lignesCalculees;
        facture.totalHT = Decimal128.fromString(totalHT.toFixed(2));
        facture.totalTVA = Decimal128.fromString(totalTVA.toFixed(2));
        facture.totalTTC = Decimal128.fromString(totalTTC.toFixed(2));

        const montantPaye = parseFloat(facture.montantPaye?.toString() || "0");
        facture.montantRestant = Decimal128.fromString((totalTTC - montantPaye).toFixed(2));
      }

      if (dateEcheance) facture.dateEcheance = new Date(dateEcheance);
      if (notes !== undefined) facture.notes = notes;

      await facture.save();

      const updated = await Facture.findById(req.params.id)
        .populate("dossierId", "reference objet")
        .populate("tiersId", "nom prenom email")
        .populate("createdBy", "username");

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  // Delete facture
  app.delete("/api/factures/:id", authenticate, async (req, res) => {
    try {
      const facture = await Facture.findById(req.params.id);
      if (!facture) return res.status(404).json({ error: "Facture non trouvée" });

      // Cannot delete paid invoices
      if (facture.statut === "PAYEE" || facture.statut === "PARTIELLEMENT_PAYEE") {
        return res.status(400).json({ error: "Impossible de supprimer une facture avec des paiements" });
      }

      await Facture.findByIdAndDelete(req.params.id);

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "DELETE",
        entity: "Facture",
        entityId: req.params.id,
        oldValue: { numero: facture.numero },
        timestamp: new Date()
      });

      res.json({ success: true, message: "Facture supprimée" });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // Add payment to facture
  app.post("/api/factures/:id/paiements", authenticate, async (req, res) => {
    try {
      const facture = await Facture.findById(req.params.id);
      if (!facture) return res.status(404).json({ error: "Facture non trouvée" });

      if (facture.statut === "PAYEE") {
        return res.status(400).json({ error: "Cette facture est déjà entièrement payée" });
      }

      if (facture.statut === "ANNULEE") {
        return res.status(400).json({ error: "Impossible d'ajouter un paiement à une facture annulée" });
      }

      const { montant, mode, reference, notes, date } = req.body;
      const montantPaiement = parseFloat(montant);
      const montantRestant = parseFloat(facture.montantRestant?.toString() || "0");

      if (montantPaiement > montantRestant) {
        return res.status(400).json({ error: `Le montant dépasse le reste à payer (${montantRestant.toFixed(2)} €)` });
      }

      facture.paiements.push({
        date: date ? new Date(date) : new Date(),
        montant: Decimal128.fromString(montantPaiement.toFixed(2)),
        mode,
        reference,
        notes
      });

      const nouveauMontantPaye = parseFloat(facture.montantPaye?.toString() || "0") + montantPaiement;
      facture.montantPaye = Decimal128.fromString(nouveauMontantPaye.toFixed(2));
      facture.montantRestant = Decimal128.fromString((montantRestant - montantPaiement).toFixed(2));

      // Update status
      if (parseFloat(facture.montantRestant.toString()) <= 0) {
        facture.statut = "PAYEE";
      } else {
        facture.statut = "PARTIELLEMENT_PAYEE";
      }

      await facture.save();

      await AuditLog.create({
        userId: (req as any).user.id,
        action: "PAYMENT",
        entity: "Facture",
        entityId: req.params.id,
        newValue: { montant: montantPaiement, mode },
        timestamp: new Date()
      });

      const updated = await Facture.findById(req.params.id)
        .populate("dossierId", "reference objet")
        .populate("tiersId", "nom prenom email")
        .populate("createdBy", "username");

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de l'ajout du paiement" });
    }
  });

  // --- BAREME EMOLUMENTS API ---

  // Get all barèmes
  app.get("/api/baremes", authenticate, async (req, res) => {
    try {
      const baremes = await BaremeEmolument.find({ actif: true }).sort({ categorie: 1, code: 1 });
      res.json(baremes);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Calculate emolument from bareme
  app.post("/api/baremes/calculer", authenticate, async (req, res) => {
    try {
      const { baremeId, baseValue } = req.body;
      const bareme = await BaremeEmolument.findById(baremeId);

      if (!bareme) return res.status(404).json({ error: "Barème non trouvé" });

      let montant = 0;
      const valeurBase = parseFloat(baseValue);

      switch (bareme.typeCalcul) {
        case "FIXE":
          montant = parseFloat(bareme.montantFixe?.toString() || "0");
          break;
        case "PROPORTIONNEL":
          montant = valeurBase * ((bareme.tauxProportionnel || 0) / 100);
          break;
        case "TRANCHE":
          if (bareme.tranches) {
            for (const tranche of bareme.tranches) {
              const de = parseFloat(tranche.de?.toString() || "0");
              const a = parseFloat(tranche.a?.toString() || "999999999999");
              if (valeurBase > de) {
                const assiette = Math.min(valeurBase, a) - de;
                montant += assiette * ((tranche.taux || 0) / 100);
              }
            }
          }
          break;
      }

      const tauxTVA = bareme.tauxTVA || 20;
      const montantTVA = montant * (tauxTVA / 100);
      const montantTTC = montant + montantTVA;

      res.json({
        bareme: bareme.description,
        montantHT: montant.toFixed(2),
        tauxTVA,
        montantTVA: montantTVA.toFixed(2),
        montantTTC: montantTTC.toFixed(2)
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du calcul" });
    }
  });

  // Seed default baremes if none exist
  app.post("/api/baremes/seed", authenticate, async (req, res) => {
    try {
      const count = await BaremeEmolument.countDocuments();
      if (count > 0) {
        return res.json({ message: "Barèmes déjà initialisés" });
      }

      const defaultBaremes = [
        {
          code: "VENTE-PROP",
          description: "Émoluments proportionnels - Vente immobilière",
          categorie: "ACTE",
          typeCalcul: "TRANCHE",
          tranches: [
            { de: Decimal128.fromString("0"), a: Decimal128.fromString("6500"), taux: 3.870 },
            { de: Decimal128.fromString("6500"), a: Decimal128.fromString("17000"), taux: 1.596 },
            { de: Decimal128.fromString("17000"), a: Decimal128.fromString("60000"), taux: 1.064 },
            { de: Decimal128.fromString("60000"), a: Decimal128.fromString("999999999"), taux: 0.799 }
          ],
          tauxTVA: 20
        },
        {
          code: "PROCURATION",
          description: "Procuration authentique",
          categorie: "ACTE",
          typeCalcul: "FIXE",
          montantFixe: Decimal128.fromString("26.41"),
          tauxTVA: 20
        },
        {
          code: "CONSEIL-H",
          description: "Consultation juridique (par heure)",
          categorie: "CONSEIL",
          typeCalcul: "FIXE",
          montantFixe: Decimal128.fromString("150.00"),
          tauxTVA: 20
        },
        {
          code: "FORMALITE-PUB",
          description: "Formalité de publicité foncière",
          categorie: "FORMALITE",
          typeCalcul: "FIXE",
          montantFixe: Decimal128.fromString("55.00"),
          tauxTVA: 20
        },
        {
          code: "NEGOC-IMMO",
          description: "Négociation immobilière",
          categorie: "NEGOCIATION",
          typeCalcul: "PROPORTIONNEL",
          tauxProportionnel: 3,
          baseCalcul: "PRIX_VENTE",
          tauxTVA: 20
        }
      ];

      await BaremeEmolument.insertMany(defaultBaremes);
      res.json({ success: true, message: "Barèmes initialisés" });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de l'initialisation" });
    }
  });

  // --- NOTIFICATIONS API ---

  app.get("/api/notifications", authenticate, async (req, res) => {
    try {
      const { unreadOnly } = req.query;
      const filter: any = {
        $or: [
          { userId: (req as any).user.id },
          { userId: null } // Global notifications
        ]
      };

      if (unreadOnly === "true") {
        filter.lue = false;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(50);

      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.get("/api/notifications/unread-count", authenticate, async (req, res) => {
    try {
      const count = await Notification.countDocuments({
        $or: [
          { userId: (req as any).user.id },
          { userId: null }
        ],
        lue: false
      });
      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.put("/api/notifications/:id/read", authenticate, async (req, res) => {
    try {
      await Notification.findByIdAndUpdate(req.params.id, { lue: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.put("/api/notifications/mark-all-read", authenticate, async (req, res) => {
    try {
      await Notification.updateMany(
        {
          $or: [
            { userId: (req as any).user.id },
            { userId: null }
          ],
          lue: false
        },
        { lue: true }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.delete("/api/notifications/:id", authenticate, async (req, res) => {
    try {
      await Notification.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erreur" });
    }
  });

  // Helper function to create notifications
  const createNotification = async (data: {
    userId?: string;
    type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
    categorie: "KYC" | "DOSSIER" | "FACTURE" | "RDV" | "SYSTEME";
    titre: string;
    message: string;
    lien?: string;
  }) => {
    await Notification.create(data);
  };

  // --- DASHBOARD API ---

  app.get("/api/dashboard/stats", authenticate, async (req, res) => {
    try {
      const [dossiers, tiers, ecritures, factures, rdvs] = await Promise.all([
        Dossier.find(),
        Tiers.find(),
        Ecriture.find(),
        Facture.find(),
        RendezVous.find({ dateDebut: { $gte: new Date() }, statut: { $in: ["PLANIFIE", "CONFIRME"] } }).limit(5)
          .populate("dossierId", "reference")
          .populate("participants.tiersId", "nom prenom")
      ]);

      // Calculate totals
      let totalFonds = 0;
      ecritures.forEach(e => {
        const montant = parseFloat(e.montant.toString());
        if (e.sens === "CREDIT") totalFonds += montant;
        else totalFonds -= montant;
      });

      let totalFacture = 0;
      let totalPaye = 0;
      factures.forEach(f => {
        totalFacture += parseFloat(f.totalTTC.toString());
        totalPaye += parseFloat(f.montantPaye?.toString() || "0");
      });

      // Dossiers by status
      const dossiersByStatus = {
        OUVERT: dossiers.filter(d => d.statut === "OUVERT").length,
        SIGNE: dossiers.filter(d => d.statut === "SIGNE").length,
        ARCHIVE: dossiers.filter(d => d.statut === "ARCHIVE").length
      };

      // Tiers by KYC status
      const tiersByKYC = {
        VALIDE: tiers.filter(t => t.kycStatus === "VALIDE").length,
        EN_ATTENTE: tiers.filter(t => t.kycStatus === "EN_ATTENTE").length,
        REFUSE: tiers.filter(t => t.kycStatus === "REFUSE").length
      };

      // Monthly revenue (last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthEcritures = ecritures.filter(e => {
          const eDate = new Date(e.date);
          return eDate >= startOfMonth && eDate <= endOfMonth && e.categorie === "HONORAIRES";
        });

        let revenue = 0;
        monthEcritures.forEach(e => {
          const montant = parseFloat(e.montant.toString());
          if (e.sens === "CREDIT") revenue += montant;
        });

        monthlyRevenue.push({
          month: startOfMonth.toLocaleString('fr-FR', { month: 'short' }),
          year: startOfMonth.getFullYear(),
          revenue: revenue.toFixed(2)
        });
      }

      res.json({
        dossiers: {
          total: dossiers.length,
          byStatus: dossiersByStatus
        },
        tiers: {
          total: tiers.length,
          byKYC: tiersByKYC
        },
        comptabilite: {
          totalFonds: totalFonds.toFixed(2),
          nombreEcritures: ecritures.length
        },
        facturation: {
          totalFacture: totalFacture.toFixed(2),
          totalPaye: totalPaye.toFixed(2),
          enAttente: (totalFacture - totalPaye).toFixed(2)
        },
        monthlyRevenue,
        prochainRdvs: rdvs
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du calcul" });
    }
  });

  app.get("/api/dashboard/activities", authenticate, async (req, res) => {
    try {
      const activities = await AuditLog.find()
        .populate("userId", "username")
        .sort({ timestamp: -1 })
        .limit(10);

      res.json(activities.map(a => ({
        _id: a._id,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        user: (a.userId as any)?.username || "Système",
        timestamp: a.timestamp
      })));
    } catch (err) {
      res.status(500).json({ error: "Erreur" });
    }
  });

  // --- ETATS COMPTABLES API ---

  // Get global accounting summary
  app.get("/api/comptabilite/resume", authenticate, async (req, res) => {
    try {
      const { dateDebut, dateFin } = req.query;
      const filter: any = {};

      if (dateDebut && dateFin) {
        filter.date = {
          $gte: new Date(dateDebut as string),
          $lte: new Date(dateFin as string)
        };
      }

      const ecritures = await Ecriture.find(filter).populate("dossierId", "reference objet");

      let totalDebits = 0;
      let totalCredits = 0;
      const parCategorie: Record<string, { debit: number; credit: number }> = {
        HONORAIRES: { debit: 0, credit: 0 },
        TAXES: { debit: 0, credit: 0 },
        DEBOURS: { debit: 0, credit: 0 },
        FONDS_CLIENTS: { debit: 0, credit: 0 }
      };

      ecritures.forEach(e => {
        const montant = parseFloat(e.montant.toString());
        if (e.sens === "CREDIT") {
          totalCredits += montant;
          parCategorie[e.categorie].credit += montant;
        } else {
          totalDebits += montant;
          parCategorie[e.categorie].debit += montant;
        }
      });

      res.json({
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        solde: (totalCredits - totalDebits).toFixed(2),
        parCategorie: Object.entries(parCategorie).map(([cat, vals]) => ({
          categorie: cat,
          debit: vals.debit.toFixed(2),
          credit: vals.credit.toFixed(2),
          solde: (vals.credit - vals.debit).toFixed(2)
        })),
        nombreEcritures: ecritures.length
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du calcul" });
    }
  });

  // Get all ecritures with filters for export
  app.get("/api/comptabilite/ecritures", authenticate, async (req, res) => {
    try {
      const { dateDebut, dateFin, categorie, sens, dossierId } = req.query;
      const filter: any = {};

      if (dateDebut && dateFin) {
        filter.date = {
          $gte: new Date(dateDebut as string),
          $lte: new Date(dateFin as string)
        };
      }
      if (categorie) filter.categorie = categorie;
      if (sens) filter.sens = sens;
      if (dossierId) filter.dossierId = dossierId;

      const ecritures = await Ecriture.find(filter)
        .populate("dossierId", "reference objet")
        .populate("createdBy", "username")
        .sort({ date: -1 });

      res.json(ecritures);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Get journal entries for a period
  app.get("/api/comptabilite/journal", authenticate, async (req, res) => {
    try {
      const { dateDebut, dateFin } = req.query;
      const filter: any = {};

      if (dateDebut && dateFin) {
        filter.date = {
          $gte: new Date(dateDebut as string),
          $lte: new Date(dateFin as string)
        };
      }

      const ecritures = await Ecriture.find(filter)
        .populate("dossierId", "reference")
        .sort({ date: 1 });

      // Group by date
      const journal: Record<string, any[]> = {};
      ecritures.forEach(e => {
        const dateKey = new Date(e.date).toISOString().split('T')[0];
        if (!journal[dateKey]) journal[dateKey] = [];
        journal[dateKey].push({
          _id: e._id,
          dossier: (e.dossierId as any)?.reference || "N/A",
          libelle: e.libelle,
          montant: parseFloat(e.montant.toString()).toFixed(2),
          sens: e.sens,
          categorie: e.categorie
        });
      });

      res.json(Object.entries(journal).map(([date, entries]) => ({
        date,
        entries,
        totalDebit: entries.filter(e => e.sens === "DEBIT").reduce((s, e) => s + parseFloat(e.montant), 0).toFixed(2),
        totalCredit: entries.filter(e => e.sens === "CREDIT").reduce((s, e) => s + parseFloat(e.montant), 0).toFixed(2)
      })));
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Get balance per dossier
  app.get("/api/comptabilite/balance-dossiers", authenticate, async (req, res) => {
    try {
      const dossiers = await Dossier.find().select("reference objet statut");
      const results = [];

      for (const dossier of dossiers) {
        const ecritures = await Ecriture.find({ dossierId: dossier._id });
        let debit = 0, credit = 0;
        ecritures.forEach(e => {
          const montant = parseFloat(e.montant.toString());
          if (e.sens === "CREDIT") credit += montant;
          else debit += montant;
        });

        results.push({
          dossierId: dossier._id,
          reference: dossier.reference,
          objet: dossier.objet,
          statut: dossier.statut,
          debit: debit.toFixed(2),
          credit: credit.toFixed(2),
          solde: (credit - debit).toFixed(2),
          nombreEcritures: ecritures.length
        });
      }

      res.json(results.sort((a, b) => parseFloat(b.solde) - parseFloat(a.solde)));
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du calcul" });
    }
  });

  // Export data as CSV format (returned as JSON for frontend to process)
  app.get("/api/comptabilite/export", authenticate, async (req, res) => {
    try {
      const { type, dateDebut, dateFin } = req.query;
      const filter: any = {};

      if (dateDebut && dateFin) {
        filter.date = {
          $gte: new Date(dateDebut as string),
          $lte: new Date(dateFin as string)
        };
      }

      let data: any[] = [];

      switch (type) {
        case "ecritures":
          const ecritures = await Ecriture.find(filter)
            .populate("dossierId", "reference")
            .sort({ date: 1 });
          data = ecritures.map(e => ({
            Date: new Date(e.date).toLocaleDateString('fr-FR'),
            Dossier: (e.dossierId as any)?.reference || "",
            Libelle: e.libelle,
            Categorie: e.categorie,
            Sens: e.sens,
            Montant: parseFloat(e.montant.toString()).toFixed(2)
          }));
          break;

        case "balance":
          const dossiers = await Dossier.find();
          for (const d of dossiers) {
            const ecrs = await Ecriture.find({ dossierId: d._id });
            let debit = 0, credit = 0;
            ecrs.forEach(e => {
              const m = parseFloat(e.montant.toString());
              if (e.sens === "CREDIT") credit += m;
              else debit += m;
            });
            data.push({
              Reference: d.reference,
              Objet: d.objet,
              Statut: d.statut,
              Debits: debit.toFixed(2),
              Credits: credit.toFixed(2),
              Solde: (credit - debit).toFixed(2)
            });
          }
          break;

        case "factures":
          const factures = await Facture.find()
            .populate("tiersId", "nom prenom");
          data = factures.map(f => ({
            Numero: f.numero,
            Date: new Date(f.dateEmission).toLocaleDateString('fr-FR'),
            Client: `${(f.tiersId as any)?.nom || ""} ${(f.tiersId as any)?.prenom || ""}`.trim(),
            TotalHT: parseFloat(f.totalHT.toString()).toFixed(2),
            TotalTVA: parseFloat(f.totalTVA.toString()).toFixed(2),
            TotalTTC: parseFloat(f.totalTTC.toString()).toFixed(2),
            Paye: parseFloat(f.montantPaye?.toString() || "0").toFixed(2),
            Statut: f.statut
          }));
          break;
      }

      res.json({ data, type, period: { dateDebut, dateFin } });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de l'export" });
    }
  });

  // Get factures statistics
  app.get("/api/factures/stats/summary", authenticate, async (req, res) => {
    try {
      const factures = await Facture.find();

      let totalFacture = 0;
      let totalPaye = 0;
      let totalEnAttente = 0;
      let facturesEnRetard = 0;
      const now = new Date();

      factures.forEach(f => {
        const ttc = parseFloat(f.totalTTC.toString());
        const paye = parseFloat(f.montantPaye?.toString() || "0");

        totalFacture += ttc;
        totalPaye += paye;

        if (f.statut !== "PAYEE" && f.statut !== "ANNULEE") {
          totalEnAttente += (ttc - paye);
          if (f.dateEcheance < now) {
            facturesEnRetard++;
          }
        }
      });

      res.json({
        totalFacture: totalFacture.toFixed(2),
        totalPaye: totalPaye.toFixed(2),
        totalEnAttente: totalEnAttente.toFixed(2),
        facturesEnRetard,
        nombreFactures: factures.length
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
    }
  });

  // =============================================
  // ÉTUDES (Multi-Études / Ordre des Notaires)
  // =============================================

  // Get all études
  app.get("/api/etudes", authenticate, async (req, res) => {
    try {
      const etudes = await Etude.find()
        .populate("notaireTitulaire", "username role")
        .sort({ nom: 1 });
      res.json(etudes);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des études" });
    }
  });

  // Get single étude with stats
  app.get("/api/etudes/:id", authenticate, async (req, res) => {
    try {
      const etude = await Etude.findById(req.params.id)
        .populate("notaireTitulaire", "username role");
      if (!etude) return res.status(404).json({ error: "Étude non trouvée" });

      // Calculate live stats
      const dossiers = await Dossier.find({ etudeId: etude._id });
      const actes = await Acte.find({ etudeId: etude._id });
      const factures = await Facture.find();

      let chiffreAffaires = 0;
      factures.forEach(f => {
        chiffreAffaires += parseFloat(f.totalTTC.toString());
      });

      res.json({
        ...etude.toObject(),
        liveStats: {
          nombreDossiers: dossiers.length,
          nombreActes: actes.length,
          chiffreAffaires: chiffreAffaires.toFixed(2),
          dossiersOuverts: dossiers.filter(d => d.statut === "OUVERT").length,
          actesEnCours: actes.filter(a => !["ARCHIVE", "SIGNE"].includes(a.statut)).length
        }
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Create étude
  app.post("/api/etudes", authenticate, async (req, res) => {
    try {
      const etude = await Etude.create(req.body);
      res.status(201).json(etude);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update étude
  app.put("/api/etudes/:id", authenticate, async (req, res) => {
    try {
      const etude = await Etude.findByIdAndUpdate(
        req.params.id,
        { ...req.body },
        { new: true }
      ).populate("notaireTitulaire", "username role");
      if (!etude) return res.status(404).json({ error: "Étude non trouvée" });
      res.json(etude);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete étude
  app.delete("/api/etudes/:id", authenticate, async (req, res) => {
    try {
      // Check if étude has dossiers or actes
      const dossiersCount = await Dossier.countDocuments({ etudeId: req.params.id });
      const actesCount = await Acte.countDocuments({ etudeId: req.params.id });

      if (dossiersCount > 0 || actesCount > 0) {
        return res.status(400).json({
          error: "Impossible de supprimer une étude avec des dossiers ou actes associés"
        });
      }

      await Etude.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // Get études statistics for Ordre dashboard
  app.get("/api/etudes/stats/global", authenticate, async (req, res) => {
    try {
      const etudes = await Etude.find();
      const dossiers = await Dossier.find();
      const actes = await Acte.find();
      const factures = await Facture.find();
      const tiers = await Tiers.find();

      // Calculate global stats
      let totalChiffreAffaires = 0;
      let totalPaye = 0;
      factures.forEach(f => {
        totalChiffreAffaires += parseFloat(f.totalTTC.toString());
        totalPaye += parseFloat(f.montantPaye?.toString() || "0");
      });

      // Actes by status
      const actesByStatut: Record<string, number> = {};
      actes.forEach(a => {
        actesByStatut[a.statut] = (actesByStatut[a.statut] || 0) + 1;
      });

      // Monthly activity (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyActivity = await Acte.aggregate([
        { $match: { dateCreation: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$dateCreation" },
              month: { $month: "$dateCreation" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      res.json({
        nombreEtudes: etudes.length,
        etudesActives: etudes.filter(e => e.statut === "ACTIVE").length,
        nombreDossiers: dossiers.length,
        dossiersOuverts: dossiers.filter(d => d.statut === "OUVERT").length,
        nombreActes: actes.length,
        actesSignes: actes.filter(a => a.statut === "SIGNE" || a.statut === "ARCHIVE").length,
        nombreTiers: tiers.length,
        tiersKYCValide: tiers.filter(t => t.kycStatus === "VALIDE").length,
        totalChiffreAffaires: totalChiffreAffaires.toFixed(2),
        totalPaye: totalPaye.toFixed(2),
        tauxRecouvrement: totalChiffreAffaires > 0
          ? ((totalPaye / totalChiffreAffaires) * 100).toFixed(1)
          : "0",
        actesByStatut,
        monthlyActivity: monthlyActivity.map(m => ({
          month: `${m._id.month}/${m._id.year}`,
          count: m.count
        }))
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
    }
  });

  // =============================================
  // TYPES D'ACTES
  // =============================================

  // Get all types d'actes
  app.get("/api/types-actes", authenticate, async (req, res) => {
    try {
      const types = await TypeActe.find({ actif: true })
        .populate("emolumentsBase")
        .sort({ categorie: 1, nom: 1 });
      res.json(types);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Get single type d'acte
  app.get("/api/types-actes/:id", authenticate, async (req, res) => {
    try {
      const type = await TypeActe.findById(req.params.id)
        .populate("emolumentsBase");
      if (!type) return res.status(404).json({ error: "Type d'acte non trouvé" });
      res.json(type);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Create type d'acte
  app.post("/api/types-actes", authenticate, async (req, res) => {
    try {
      const type = await TypeActe.create(req.body);
      res.status(201).json(type);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update type d'acte
  app.put("/api/types-actes/:id", authenticate, async (req, res) => {
    try {
      const type = await TypeActe.findByIdAndUpdate(
        req.params.id,
        { ...req.body },
        { new: true }
      );
      if (!type) return res.status(404).json({ error: "Type d'acte non trouvé" });
      res.json(type);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete type d'acte (soft delete)
  app.delete("/api/types-actes/:id", authenticate, async (req, res) => {
    try {
      // Check if used by any acte
      const actesCount = await Acte.countDocuments({ typeActe: req.params.id });
      if (actesCount > 0) {
        // Soft delete - just deactivate
        await TypeActe.findByIdAndUpdate(req.params.id, { actif: false });
        return res.json({ success: true, message: "Type désactivé (utilisé par des actes)" });
      }

      await TypeActe.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // Seed default types d'actes
  app.post("/api/types-actes/seed", authenticate, async (req, res) => {
    try {
      const defaultTypes = [
        { code: "VENTE_IMMO", nom: "Vente Immobilière", categorie: "IMMOBILIER", description: "Acte de vente d'un bien immobilier", documentsRequis: [
          { nom: "Titre de propriété", obligatoire: true },
          { nom: "Diagnostics techniques", obligatoire: true },
          { nom: "Pièces d'identité vendeur", obligatoire: true },
          { nom: "Pièces d'identité acquéreur", obligatoire: true }
        ]},
        { code: "DONATION", nom: "Donation", categorie: "FAMILLE", description: "Acte de donation entre vifs", documentsRequis: [
          { nom: "Pièces d'identité donateur", obligatoire: true },
          { nom: "Pièces d'identité donataire", obligatoire: true },
          { nom: "Justificatif du bien donné", obligatoire: true }
        ]},
        { code: "TESTAMENT", nom: "Testament Authentique", categorie: "SUCCESSION", description: "Testament reçu par notaire", documentsRequis: [
          { nom: "Pièce d'identité testateur", obligatoire: true },
          { nom: "Livret de famille", obligatoire: false }
        ]},
        { code: "SUCCESSION", nom: "Déclaration de Succession", categorie: "SUCCESSION", description: "Règlement d'une succession", documentsRequis: [
          { nom: "Acte de décès", obligatoire: true },
          { nom: "Livret de famille du défunt", obligatoire: true },
          { nom: "Pièces d'identité héritiers", obligatoire: true }
        ]},
        { code: "PRET_HYPO", nom: "Prêt Hypothécaire", categorie: "PRET", description: "Constitution d'hypothèque", documentsRequis: [
          { nom: "Offre de prêt", obligatoire: true },
          { nom: "Titre de propriété", obligatoire: true },
          { nom: "Pièces d'identité emprunteur", obligatoire: true }
        ]},
        { code: "CREATION_SCI", nom: "Création SCI", categorie: "SOCIETE", description: "Création d'une société civile immobilière", documentsRequis: [
          { nom: "Statuts signés", obligatoire: true },
          { nom: "Pièces d'identité associés", obligatoire: true }
        ]},
        { code: "PROCURATION", nom: "Procuration", categorie: "PROCURATION", description: "Pouvoir donné à un mandataire", documentsRequis: [
          { nom: "Pièce d'identité mandant", obligatoire: true },
          { nom: "Pièce d'identité mandataire", obligatoire: true }
        ]},
        { code: "BAIL_COMM", nom: "Bail Commercial", categorie: "IMMOBILIER", description: "Contrat de bail commercial", documentsRequis: [
          { nom: "Titre de propriété bailleur", obligatoire: true },
          { nom: "Pièces d'identité parties", obligatoire: true },
          { nom: "Kbis locataire", obligatoire: true }
        ]},
        { code: "CONTRAT_MARIAGE", nom: "Contrat de Mariage", categorie: "FAMILLE", description: "Convention matrimoniale", documentsRequis: [
          { nom: "Pièces d'identité futurs époux", obligatoire: true },
          { nom: "Justificatifs de domicile", obligatoire: true }
        ]},
        { code: "PARTAGE", nom: "Partage", categorie: "SUCCESSION", description: "Partage de biens indivis", documentsRequis: [
          { nom: "Titre de propriété", obligatoire: true },
          { nom: "Pièces d'identité co-partageants", obligatoire: true }
        ]}
      ];

      for (const t of defaultTypes) {
        await TypeActe.findOneAndUpdate(
          { code: t.code },
          t,
          { upsert: true, new: true }
        );
      }

      res.json({ success: true, message: `${defaultTypes.length} types d'actes créés/mis à jour` });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du seeding" });
    }
  });

  // =============================================
  // ACTES NOTARIÉS
  // =============================================

  // Get all actes with filters
  app.get("/api/actes", authenticate, async (req, res) => {
    try {
      const { statut, typeActe, dossierId, etudeId } = req.query;
      const filter: any = {};

      if (statut) filter.statut = statut;
      if (typeActe) filter.typeActe = typeActe;
      if (dossierId) filter.dossierId = dossierId;
      if (etudeId) filter.etudeId = etudeId;

      const actes = await Acte.find(filter)
        .populate("typeActe", "nom code categorie")
        .populate("dossierId", "reference objet")
        .populate("etudeId", "nom")
        .populate("parties.tiersId", "nom prenom type")
        .populate("redacteur", "username")
        .populate("notaireSignataire", "username")
        .sort({ dateCreation: -1 });

      res.json(actes);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Get single acte with full details
  app.get("/api/actes/:id", authenticate, async (req, res) => {
    try {
      const acte = await Acte.findById(req.params.id)
        .populate("typeActe")
        .populate("dossierId", "reference objet statut intervenants")
        .populate("etudeId", "nom adresse")
        .populate("parties.tiersId", "nom prenom email telephone type kycStatus")
        .populate("documents")
        .populate("redacteur", "username")
        .populate("notaireSignataire", "username")
        .populate("historique.userId", "username");

      if (!acte) return res.status(404).json({ error: "Acte non trouvé" });
      res.json(acte);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  });

  // Create acte
  app.post("/api/actes", authenticate, async (req, res) => {
    try {
      // Generate reference
      const year = new Date().getFullYear();
      const count = await Acte.countDocuments({
        dateCreation: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      });
      const reference = `ACTE-${year}-${String(count + 1).padStart(4, "0")}`;

      const acteData = {
        ...req.body,
        reference,
        createdBy: (req as any).user.userId,
        redacteur: (req as any).user.userId,
        historique: [{
          action: "CREATION",
          statut: "BROUILLON",
          userId: (req as any).user.userId,
          commentaire: "Création de l'acte"
        }]
      };

      const acte = await Acte.create(acteData);

      const populated = await Acte.findById(acte._id)
        .populate("typeActe", "nom code categorie")
        .populate("dossierId", "reference objet")
        .populate("parties.tiersId", "nom prenom");

      res.status(201).json(populated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update acte
  app.put("/api/actes/:id", authenticate, async (req, res) => {
    try {
      const acte = await Acte.findById(req.params.id);
      if (!acte) return res.status(404).json({ error: "Acte non trouvé" });

      // Add to history if status changed
      const updates: any = { ...req.body, updatedAt: new Date() };

      if (req.body.statut && req.body.statut !== acte.statut) {
        updates.$push = {
          historique: {
            action: "CHANGEMENT_STATUT",
            statut: req.body.statut,
            userId: (req as any).user.userId,
            commentaire: req.body.commentaireStatut || `Passage au statut ${req.body.statut}`
          }
        };

        // Set dates based on status
        if (req.body.statut === "VALIDE") updates.dateValidation = new Date();
        if (req.body.statut === "SIGNE") updates.dateSignature = new Date();
        if (req.body.statut === "ENREGISTRE") updates.dateEnregistrement = new Date();
        if (req.body.statut === "ARCHIVE") updates.dateArchivage = new Date();
      }

      delete updates.commentaireStatut;

      const updated = await Acte.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      )
        .populate("typeActe", "nom code categorie")
        .populate("dossierId", "reference objet")
        .populate("parties.tiersId", "nom prenom");

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update acte status (workflow)
  app.put("/api/actes/:id/statut", authenticate, async (req, res) => {
    try {
      const { statut, commentaire } = req.body;
      const acte = await Acte.findById(req.params.id);

      if (!acte) return res.status(404).json({ error: "Acte non trouvé" });

      // Validate workflow transitions
      const validTransitions: Record<string, string[]> = {
        BROUILLON: ["EN_REVISION"],
        EN_REVISION: ["BROUILLON", "VALIDE"],
        VALIDE: ["EN_SIGNATURE", "EN_REVISION"],
        EN_SIGNATURE: ["PARTIELLEMENT_SIGNE", "SIGNE", "VALIDE"],
        PARTIELLEMENT_SIGNE: ["SIGNE", "EN_SIGNATURE"],
        SIGNE: ["ENREGISTRE"],
        ENREGISTRE: ["PUBLIE", "ARCHIVE"],
        PUBLIE: ["ARCHIVE"],
        ARCHIVE: []
      };

      if (!validTransitions[acte.statut]?.includes(statut)) {
        return res.status(400).json({
          error: `Transition invalide de ${acte.statut} vers ${statut}`
        });
      }

      const updates: any = {
        statut,
        updatedAt: new Date(),
        $push: {
          historique: {
            action: "CHANGEMENT_STATUT",
            statut,
            userId: (req as any).user.userId,
            commentaire: commentaire || `Passage au statut ${statut}`
          }
        }
      };

      // Set dates based on status
      if (statut === "VALIDE") updates.dateValidation = new Date();
      if (statut === "SIGNE") updates.dateSignature = new Date();
      if (statut === "ENREGISTRE") updates.dateEnregistrement = new Date();
      if (statut === "ARCHIVE") updates.dateArchivage = new Date();

      const updated = await Acte.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      )
        .populate("typeActe", "nom code")
        .populate("dossierId", "reference");

      // Create notification
      await Notification.create({
        type: "INFO",
        categorie: "DOSSIER",
        titre: `Acte ${updated!.reference}`,
        message: `L'acte est passé au statut: ${statut}`,
        lien: `/actes?id=${updated!._id}`
      });

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Sign acte (add signature for a party)
  app.post("/api/actes/:id/signatures", authenticate, async (req, res) => {
    try {
      const { tiersId, signatureType } = req.body;
      const acte = await Acte.findById(req.params.id);

      if (!acte) return res.status(404).json({ error: "Acte non trouvé" });

      // Find the party
      const partyIndex = acte.parties.findIndex(
        p => p.tiersId.toString() === tiersId
      );

      if (partyIndex === -1) {
        return res.status(400).json({ error: "Partie non trouvée dans l'acte" });
      }

      // Update signature
      acte.parties[partyIndex].signatureDate = new Date();
      acte.parties[partyIndex].signatureType = signatureType || "PHYSIQUE";
      acte.parties[partyIndex].signatureVerifiee = true;

      // Add to history
      acte.historique.push({
        action: "SIGNATURE",
        statut: acte.statut,
        date: new Date(),
        userId: (req as any).user.userId,
        commentaire: `Signature de la partie ${partyIndex + 1}`
      } as any);

      // Check if all required signatures are obtained
      const allSigned = acte.parties
        .filter(p => p.signatureRequise)
        .every(p => p.signatureVerifiee);

      if (allSigned && acte.statut !== "SIGNE") {
        acte.statut = "SIGNE";
        acte.dateSignature = new Date();
        acte.historique.push({
          action: "CHANGEMENT_STATUT",
          statut: "SIGNE",
          date: new Date(),
          userId: (req as any).user.userId,
          commentaire: "Toutes les signatures obtenues"
        } as any);
      } else if (!allSigned && acte.statut === "EN_SIGNATURE") {
        acte.statut = "PARTIELLEMENT_SIGNE";
      }

      await acte.save();

      const updated = await Acte.findById(acte._id)
        .populate("parties.tiersId", "nom prenom");

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete acte (only if BROUILLON)
  app.delete("/api/actes/:id", authenticate, async (req, res) => {
    try {
      const acte = await Acte.findById(req.params.id);
      if (!acte) return res.status(404).json({ error: "Acte non trouvé" });

      if (acte.statut !== "BROUILLON") {
        return res.status(400).json({
          error: "Seuls les actes en brouillon peuvent être supprimés"
        });
      }

      await Acte.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // Get actes statistics
  app.get("/api/actes/stats/summary", authenticate, async (req, res) => {
    try {
      const actes = await Acte.find();

      const byStatut: Record<string, number> = {};
      const byCategorie: Record<string, number> = {};

      for (const acte of actes) {
        byStatut[acte.statut] = (byStatut[acte.statut] || 0) + 1;

        const typeActe = await TypeActe.findById(acte.typeActe);
        if (typeActe) {
          byCategorie[typeActe.categorie] = (byCategorie[typeActe.categorie] || 0) + 1;
        }
      }

      // Recent activity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActes = await Acte.countDocuments({
        dateCreation: { $gte: thirtyDaysAgo }
      });

      const signedThisMonth = await Acte.countDocuments({
        dateSignature: { $gte: thirtyDaysAgo }
      });

      res.json({
        total: actes.length,
        byStatut,
        byCategorie,
        recentActes,
        signedThisMonth,
        enCours: actes.filter(a => !["ARCHIVE", "SIGNE", "ENREGISTRE", "PUBLIE"].includes(a.statut)).length
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
    }
  });

  // =============================================
  // REPORTING GLOBAL
  // =============================================

  // Global reporting for Ordre des Notaires
  app.get("/api/reporting/global", authenticate, async (req, res) => {
    try {
      const { dateDebut, dateFin } = req.query;

      const startDate = dateDebut ? new Date(dateDebut as string) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = dateFin ? new Date(dateFin as string) : new Date();

      // Get all data within period
      const dossiers = await Dossier.find({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const actes = await Acte.find({
        dateCreation: { $gte: startDate, $lte: endDate }
      }).populate("typeActe", "categorie");

      const factures = await Facture.find({
        dateEmission: { $gte: startDate, $lte: endDate }
      });

      const ecritures = await Ecriture.find({
        date: { $gte: startDate, $lte: endDate }
      });

      // Calculate metrics
      let totalHonoraires = 0;
      let totalTaxes = 0;
      let totalDebours = 0;
      let totalFondsClients = 0;

      ecritures.forEach(e => {
        const montant = parseFloat(e.montant.toString());
        if (e.sens === "CREDIT") {
          switch (e.categorie) {
            case "HONORAIRES": totalHonoraires += montant; break;
            case "TAXES": totalTaxes += montant; break;
            case "DEBOURS": totalDebours += montant; break;
            case "FONDS_CLIENTS": totalFondsClients += montant; break;
          }
        }
      });

      let totalFacture = 0;
      let totalPaye = 0;
      factures.forEach(f => {
        totalFacture += parseFloat(f.totalTTC.toString());
        totalPaye += parseFloat(f.montantPaye?.toString() || "0");
      });

      // Actes by category
      const actesByCategorie: Record<string, number> = {};
      actes.forEach(a => {
        const cat = (a.typeActe as any)?.categorie || "AUTRE";
        actesByCategorie[cat] = (actesByCategorie[cat] || 0) + 1;
      });

      // Monthly trend
      const monthlyData: Record<string, { dossiers: number; actes: number; factures: number }> = {};

      dossiers.forEach(d => {
        const key = `${d.createdAt.getFullYear()}-${String(d.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { dossiers: 0, actes: 0, factures: 0 };
        monthlyData[key].dossiers++;
      });

      actes.forEach(a => {
        const key = `${a.dateCreation.getFullYear()}-${String(a.dateCreation.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { dossiers: 0, actes: 0, factures: 0 };
        monthlyData[key].actes++;
      });

      factures.forEach(f => {
        const key = `${f.dateEmission.getFullYear()}-${String(f.dateEmission.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { dossiers: 0, actes: 0, factures: 0 };
        monthlyData[key].factures++;
      });

      res.json({
        periode: { debut: startDate, fin: endDate },
        activite: {
          nombreDossiers: dossiers.length,
          nombreActes: actes.length,
          nombreFactures: factures.length,
          actesSignes: actes.filter(a => a.statut === "SIGNE" || a.statut === "ARCHIVE").length
        },
        financier: {
          totalHonoraires: totalHonoraires.toFixed(2),
          totalTaxes: totalTaxes.toFixed(2),
          totalDebours: totalDebours.toFixed(2),
          totalFondsClients: totalFondsClients.toFixed(2),
          totalFacture: totalFacture.toFixed(2),
          totalPaye: totalPaye.toFixed(2),
          tauxRecouvrement: totalFacture > 0 ? ((totalPaye / totalFacture) * 100).toFixed(1) : "0"
        },
        actesByCategorie,
        monthlyTrend: Object.entries(monthlyData)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month))
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la génération du rapport" });
    }
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist/index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
