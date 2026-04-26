# Manuel d'Utilisation - Gestion Notariale Comptable

<div align="center">
<img width="800" height="200" alt="Logo Notaria" src="logo/logo.png" />
</div>

## Vue d'ensemble

**Notaria Gestion Notariale Comptable** est une application web complète conçue pour la gestion des activités notariales. Elle offre une interface moderne et intuitive pour gérer les dossiers, actes, comptabilité, facturation, tiers, rendez-vous et bien plus encore.

### Fonctionnalités principales

- 🏠 **Tableau de bord** : Vue d'ensemble des statistiques et activités récentes
- 📁 **Gestion des dossiers** : Création et suivi des dossiers notariaux
- 📄 **Gestion des actes** : Création, validation et archivage des actes
- 💰 **Comptabilité** : Gestion des écritures comptables par dossier
- 📊 **États comptables** : Rapports et analyses financières
- 💳 **Facturation** : Création et gestion des factures
- 👥 **Gestion des tiers** : Base de données des clients et intervenants
- 📅 **Agenda** : Planification et gestion des rendez-vous
- 📈 **Reporting** : Tableaux de bord et analyses
- 🔐 **KYC** : Vérification des connaissances clients
- 📋 **Documents** : Gestion documentaire centralisée

## Installation et Configuration

### Prérequis

- **Node.js** (version 18 ou supérieure)
- **MongoDB** (base de données)
- **Git** (pour le contrôle de version)

### Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/Darrius-maker/notaria-gestion-notariale-comptable.git
   cd notaria-gestion-notariale-comptable
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de l'environnement**
   - Créer un fichier `.env.local` à la racine du projet
   - Ajouter les variables d'environnement suivantes :
     ```
     GEMINI_API_KEY=votre_clé_api_gemini
     MONGODB_URI=mongodb://localhost:27017/notaria
     JWT_SECRET=votre_secret_jwt
     ```

4. **Démarrer MongoDB**
   Assurez-vous que MongoDB est en cours d'exécution sur votre système.

## Démarrage de l'application

### Mode développement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Construction pour la production
```bash
npm run build
npm run preview
```

## Structure de l'application

### Pages principales

#### 🏠 Dashboard
- **Statistiques générales** : Nombre de dossiers, tiers, fonds gérés
- **Activités récentes** : Historique des actions effectuées
- **Alertes KYC** : Notifications pour les vérifications en attente
- **Rendez-vous à venir** : Calendrier des prochains événements
- **Revenus mensuels** : Graphiques des performances financières

#### 📁 Dossiers
- **Création de dossiers** : Nouveau dossier avec référence et objet
- **Gestion des intervenants** : Ajout des parties prenantes
- **Suivi des statuts** : Ouvert, Signé, Archivé
- **Recherche et filtrage** : Par référence, objet, statut

#### 📄 Actes
- **Types d'actes** : Immobilier, Famille, Succession, Société, etc.
- **Workflow de validation** : Brouillon → Révision → Validation → Signature
- **Gestion documentaire** : Pièces jointes et versions
- **Historique** : Traçabilité des modifications

#### 💰 Comptabilité
- **Écritures par dossier** : Débit/Crédit avec libellés
- **Catégories** : Honoraires, Taxes, Débours, Fonds clients
- **Calcul automatique du solde** : Par dossier
- **Exports comptables** : Pour intégration avec logiciels tiers

#### 💳 Facturation
- **Création de factures** : Lignes détaillées avec TVA
- **Modes de paiement** : Virement, Chèque, Espèces, CB
- **Suivi des paiements** : Payé, Partiellement payé, En attente
- **Relances automatiques** : Notifications pour factures impayées

#### 👥 Tiers
- **Types de tiers** : Physique/Morale
- **Informations complètes** : Contact, RIB, SIRET
- **KYC intégré** : Statut de vérification (Valide/En attente/Refusé)
- **Historique des interventions** : Tous les dossiers liés

#### 📅 Agenda
- **Types de rendez-vous** : Signature, Consultation, Réunion, Échéance
- **Gestion des participants** : Liste des présents/absents
- **Notifications** : Rappels automatiques
- **Intégration calendrier** : Export vers Google Calendar/Outlook

#### 📊 États Comptables
- **Bilans périodiques** : Comptes de résultats
- **Rapports personnalisés** : Filtres par période et catégorie
- **Exports PDF/Excel** : Pour archivage et partage
- **Tableaux de bord visuels** : Graphiques et KPIs

#### 📈 Reporting
- **Métriques clés** : Chiffre d'affaires, nombre d'actes
- **Analyses temporelles** : Tendances mensuelles/annuelles
- **Comparaisons** : Par notaire, par type d'acte
- **Exports avancés** : Pour analyses externes

## Utilisation de base

### Connexion
1. Accédez à `http://localhost:3000`
2. Utilisez les identifiants par défaut ou ceux configurés

### Création d'un dossier
1. Allez dans "Dossiers" → "Nouveau dossier"
2. Renseignez la référence et l'objet
3. Ajoutez les intervenants (tiers)
4. Sauvegardez

### Gestion des actes
1. Depuis un dossier, cliquez sur "Créer un acte"
2. Sélectionnez le type et la catégorie
3. Rédigez le contenu ou importez un modèle
4. Suivez le workflow de validation

### Comptabilité
1. Sélectionnez un dossier dans "Comptabilité"
2. Ajoutez des écritures (débit/crédit)
3. Le solde se met à jour automatiquement
4. Exportez les données si nécessaire

### Facturation
1. Créez une facture depuis "Facturation"
2. Ajoutez les lignes (émoluments, honoraires, débours)
3. Calculez automatiquement la TVA
4. Envoyez au client et suivez les paiements

## Rôles et permissions

- **Notaire** : Accès complet à toutes les fonctionnalités
- **Clerc** : Gestion des dossiers et actes, accès limité à la comptabilité
- **Comptable** : Accès spécialisé à la comptabilité et facturation

## Sécurité et conformité

- **Authentification JWT** : Sessions sécurisées
- **Chiffrement des données** : Protection des informations sensibles
- **KYC intégré** : Vérification des identités selon la réglementation
- **Traçabilité** : Historique complet des actions
- **Sauvegardes automatiques** : Protection contre la perte de données

## Support et maintenance

### Mise à jour
```bash
git pull origin master
npm install
npm run build
```

### Logs et débogage
- Logs applicatifs dans la console
- Base de données MongoDB pour audit trails
- Interface d'administration pour diagnostics

### Contact support
Pour toute question ou problème :
- Vérifiez les logs d'erreur
- Consultez la documentation technique
- Contactez l'équipe de développement

---

**Version** : 1.0.0
**Dernière mise à jour** : Avril 2026
**Technologies** : React, TypeScript, Node.js, Express, MongoDB, Tailwind CSS
