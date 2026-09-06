# 📱 Smart HR Mobile — Application Mobile Collaborateur

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Expo Router](https://img.shields.io/badge/Expo_Router-v6-black)](https://docs.expo.dev/router/introduction/)
[![Zustand](https://img.shields.io/badge/State-Zustand_5-443e38)](https://github.com/pmndrs/zustand)
[![Odoo 17](https://img.shields.io/badge/Backend-Odoo_17_REST_API-714B67?logo=odoo&logoColor=white)](https://www.odoo.com/)

**Smart HR Mobile** est l'application mobile self-service dédiée aux collaborateurs de l'écosystème **Smart HR Odoo**. Conçue avec **React Native** et **Expo**, elle offre une expérience utilisateur native, fluide et moderne permettant aux employés de gérer leur quotidien RH en toute autonomie : pointage et suivi des présences, déclaration d'anomalies, demandes de congés avec analyse IA, commande et téléchargement de documents administratifs, et consultation de leurs bilans de performance propulsés par l'Intelligence Artificielle.

---

## 📑 Sommaire

1. [Vue d'Ensemble & Architecture](#-vue-densemble--architecture)
2. [Stack Technologique & Design System](#-stack-technologique--design-system)
3. [Fonctionnalités Exhaustives par Module](#-fonctionnalités-exhaustives-par-module)
   - [1. Authentification & Sécurité du Compte](#1-authentification--sécurité-du-compte)
   - [2. Module Ma Présence & Pointage](#2-module-ma-présence--pointage)
   - [3. Signalement & Suivi des Anomalies](#3-signalement--suivi-des-anomalies)
   - [4. Module Congés & Absences avec IA](#4-module-congés--absences-avec-ia)
   - [5. Espace Documents RH & Téléchargement](#5-espace-documents-rh--téléchargement)
   - [6. Mon Bilan & Performance IA](#6-mon-bilan--performance-ia)
   - [7. Centre de Notifications In-App & Deep-Linking](#7-centre-de-notifications-in-app--deep-linking)
4. [Arborescence du Projet](#-arborescence-du-projet)
5. [Matrice des Endpoints API Odoo (`hr_ai_api`)](#-matrice-des-endpoints-api-odoo-hr_ai_api)
6. [Installation & Guide de Démarrage](#-installation--guide-de-démarrage)
7. [Configuration Réseau & Tunneling](#-configuration-réseau--tunneling)
8. [Comptes de Test & Validation](#-comptes-de-test--validation)

---

## 🏗️ Vue d'Ensemble & Architecture

L'application communique directement avec le backend **Odoo 17** via le module personnalisé **`hr_ai_api`**, qui expose des services REST sécurisés.

```
┌─────────────────────────────────────────────────────────────┐
│                 📱 Smart HR Mobile (Expo)                   │
│  React Native · Zustand · Expo Router · SecureStore         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 🌐 Tunnel Expo / Reverse Proxy              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            🐍 Backend Odoo 17 (Module `hr_ai_api`)          │
│  ├── /api/v1/auth/*        (JWT Access + Refresh)           │
│  ├── /api/v1/attendance/*  (Pointages, Anomalies, Stats)    │
│  ├── /api/v1/leaves        (Demandes, Validations, IA)      │
│  ├── /api/v1/documents/*   (Demandes, Fichiers Base64)      │
│  └── /api/v1/appraisals/*  (Bilans, Scores, Synthèses IA)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           🗄️ PostgreSQL + Modules IA Métier Odoo            │
│  hr_attendance_ai · hr_leaves_ai · hr_appraisal_ai          │
└─────────────────────────────────────────────────────────────┘
```

### Principes Clés d'Ingénierie
- **Synchronisation en Temps Réel** : Toutes les données affichées proviennent de la base Odoo active.
- **Résilience Réseau & Refresh Mutex** : Gestion transparente de l'expiration du jeton d'accès (HTTP 401) via un mécanisme de verrouillage asynchrone (mutex) qui rafraîchit le token et rejoue la requête sans déconnecter l'utilisateur.
- **Navigation Contextuelle (Deep-Linking)** : Clic sur une notification amenant directement sur l'élément avec mise en évidence animée (*highlight & auto-scroll*).
- **Stockage Chiffré** : Les tokens JWT sont conservés dans l'enclave sécurisée de l'appareil via `expo-secure-store`.

---

## 🎨 Stack Technologique & Design System

### Technologies Principales
| Composant | Technologie | Rôle |
|---|---|---|
| **Core Framework** | React Native 0.81 & Expo SDK 54 | Moteur applicatif multiplateforme iOS / Android |
| **Routing** | Expo Router v6 (File-based) | Routage déclaratif basé sur la structure des dossiers |
| **State Management** | Zustand 5 | Gestion centralisée et réactive de l'état applicatif |
| **Sécurité** | `expo-secure-store` | Chiffrement matériel des jetons d'accès et de rafraîchissement |
| **Fichiers & Partage** | `expo-document-picker`, `expo-file-system`, `expo-sharing` | Sélection de justificatifs et téléchargement/partage natif |
| **Iconographie** | Lucide React Native | Bibliothèque d'icônes vectorielles épurées |
| **Typographie** | Police Inter (`@expo-google-fonts/inter`) | Rendu visuel haut de gamme |

### Charte Graphique & Tokens (`constants/theme.ts`)
- **Couleur Primaire (Accent)** : Corail `#FF6B4A` (boutons d'action, sélections actives, highlights).
- **CTA Principaux** : Noir profond `#1A1A1A` pour un contraste premium.
- **Fond & Cartes** : Surface blanche `#FFFFFF` sur fond gris doux `#FAFAFA` avec ombrages légers.
- **Statuts Métier** :
  - 🟢 **Succès / Validé / Présent** : `#34C759` (fond `#E8F9EC`)
  - 🟡 **En Attente / Retard** : `#FF9500` (fond `#FFF4E5`)
  - 🔴 **Refusé / Absent / Anomalie** : `#FF3B30` (fond `#FFEBEA`)
  - 🟣 **Information / IA / Document** : `#5E5CE6` (fond `#EDECFC`)

---

## 🌟 Fonctionnalités Exhaustives par Module

### 1. Authentification & Sécurité du Compte
- **Connexion Sécurisée** : Saisie de l'identifiant Odoo (e-mail ou login) et du mot de passe avec masquage/démasquage instantané.
- **Restauration de Session** : Vérification automatique du token au démarrage (`restoreSession`) sans forcer l'utilisateur à se reconnecter.
- **Changement Obligatoire du Mot de Passe** :
  - Détection automatique du drapeau `must_change_password` retourné par Odoo.
  - Fenêtre modale intégrée obligeant l'utilisateur à définir un nouveau mot de passe (contrôle de longueur >= 6 caractères et concordance).
  - Mise à jour en temps réel via `/api/v1/auth/change-password`.
- **Déconnexion Sécurisée** : Purge intégrale des tokens dans le SecureStore et réinitialisation immédiate du store Zustand.

---

### 2. Module Ma Présence & Pointage
*Écran principal de l'application (`app/(tabs)/index.tsx`).*

- **En-tête Collaborateur & Salutation Dynamique** : Affiche la date du jour au format dynamique et le nom complet de l'employé connecté.
- **Bouton d'Action Rapide (CTA)** : Accès direct en un clic au formulaire de déclaration de pointage / réclamation.
- **Sélecteur Temporel Mensuel** : Navigation fluide de mois en mois (flèches précédente / suivante) avec rechargement asynchrone des données Odoo (`/api/v1/attendance/<id>?month=M&year=Y`).
- **4 Cartes d'Indicateurs Clés (KPI Mensuels)** :
  - 🟢 **Présences** : Nombre total de jours pointés avec succès dans le mois.
  - 🟡 **Retards** : Nombre de pointages avec retard détecté.
  - 🔴 **Absences** : Jours ouvrés passés sans aucun pointage enregistré.
  - 🟣 **Total Heures** : Cumul exact des heures travaillées sur la période (ex: `152h 30m`).
- **Calendrier Mensuel Interactif Natif** :
  - Grille calendaire complète du mois (colonnes Lun → Dim).
  - Code couleur par pastille pour chaque journée :
    - 🟢 *Vert* : Journée travaillée et pointée à l'heure.
    - 🟡 *Ambre* : Journée avec retard constaté.
    - 🔴 *Rouge* : Absence ou journée non pointée.
    - 🟣 *Bleu/Violet* : Congé validé ou jour férié.
    - ⚪ *Gris* : Week-end / Jour non ouvré.
  - Mise en valeur visuelle de la journée courante (`Aujourd'hui`).
- **Fiche Détail Journalier (`DayDetailModal`)** :
  - Un simple tap sur n'importe quel jour du calendrier ouvre une fiche détaillée.
  - Affiche côte-à-côte l'heure exacte de **Check-in** et de **Check-out**.
  - Durée travaillée dans la journée et minutes de retard éventuelles (ex: `+25 min`).
  - Signalement de l'anomalie détectée par l'algorithme IA Odoo.
  - Bouton direct **"Signaler une anomalie"** pré-remplissant automatiquement la date sélectionnée.
- **Pull-to-Refresh** : Tirer vers le bas pour synchroniser immédiatement toutes les données mensuelles depuis Odoo.

---

### 3. Signalement & Suivi des Anomalies
*Composant dédié (`components/AnomalyModal.tsx`).*

- **Onglet "Déclarer une Anomalie"** :
  - Déclaration d'un oubli de badgeage, d'une erreur d'horaire ou d'un incident de pointage.
  - Sélection de la date concernée.
  - Champ de justification textuelle obligatoire pour l'équipe RH.
  - Ajout de pièce jointe / justificatif (ex: ticket d'intervention, justificatif de transport) encodée en base64.
  - Transmission directe à l'API Odoo (`POST /api/v1/attendance/anomaly`).
- **Onglet "Mes Réclamations" (Historique & Suivi)** :
  - Liste de tous les signalements de l'employé avec date de soumission.
  - Badges d'état temps réel :
    - ⏳ **En attente** : Transmis aux RH, en attente d'évaluation.
    - ✅ **Résolu** : Validé et régularisé par l'administrateur RH.
    - ❌ **Rejeté** : Réclamation non retenue.
  - Visualisation des commentaires et explications apportés par le gestionnaire RH.

---

### 4. Module Congés & Absences avec IA
*Écran des congés (`app/(tabs)/leaves.tsx`).*

- **Historique des Demandes d'Absence** :
  - Liste des congés de l'employé extraits de `hr.leave`.
  - Badges de statut dynamiques :
    - ✅ **Approuvé** (`validate`)
    - ⏳ **En attente** (`confirm`)
    - ❌ **Refusé** (`refuse`)
- **Recommandation IA Odoo Intégrée** :
  - Chaque demande affiche l'avis d'arbitrage généré par le moteur IA d'Odoo (`ai_recommendation` : score de faisabilité, charge d'équipe, impact prévisionnel).
- **Calendrier Visuel des Absences** :
  - Bouton calendrier permettant de visualiser la répartition des congés sur le mois avec plages de couleur.
- **Formulaire de Nouvelle Demande** :
  - **Typologie Complète** : Congé Payé, Maladie / Médical, RTT / Récupération, Sans Solde, Événement Familial.
  - **Gestion des Justificatifs Obligatoires** : Détection automatique des types nécessitant une pièce justificative (certificat médical, justificatif familial) avec sélecteur de documents PDF/Images (`expo-document-picker`).
  - **Sélecteur de Dates Intuitif** : Choix des dates de début et fin avec boutons d'ajustement rapide (+1j, -1j, boutons de durée 1j, 2j, 3j...).
  - **Calcul Automatique** de la durée en nombre de jours demandés.
  - **Soumission Asynchrone** vers Odoo et injection optimiste dans la liste.
- **Navigation Contextuelle & Highlight Animé** :
  - Lorsque l'utilisateur clique sur une notification de congé, l'écran s'ouvre, défile automatiquement (*auto-scroll*) jusqu'à la demande et fait pulser une animation lumineuse sur la carte.

---

### 5. Espace Documents RH & Téléchargement
*Écran de dématérialisation documentaire (`app/(tabs)/documents.tsx`).*

- **Commande de Documents Administratifs** :
  - Formulaire de demande en quelques clics :
    - 📜 **Attestation de travail**
    - 💵 **Bulletin de paie**
    - 📑 **Attestation de salaire**
    - ⭐ **Fiche d'évaluation**
    - 📂 **Autre document RH personnalisé**
  - Sélection de la période d'échéance : *Mois en cours*, *Mois dernier*, *3 derniers mois*, *Année en cours*.
  - Zone de commentaire pour spécifier des besoins particuliers.
- **Suivi du Traitement RH** :
  - Badges de suivi d'avancement :
    - ⏳ *En attente RH*
    - ⚙️ *En cours de préparation*
    - 🟢 *Prêt à télécharger*
    - 📦 *Délivré*
    - ❌ *Refusé* (avec affichage du motif de refus rédigé par les RH).
- **Téléchargement & Partage Natif** :
  - Récupération sécurisée du flux binaire en base64 via l'API Odoo (`/api/v1/documents/<id>/download`).
  - Enregistrement direct dans l'espace fichier de l'application via `expo-file-system`.
  - Ouverture de la feuille de partage native du système (`expo-sharing`) pour imprimer, envoyer par e-mail ou enregistrer sur le smartphone.
- **Deep-linking & Animation** : Défilement et surbrillance automatique au clic depuis le centre de notifications.

---

### 6. Mon Bilan & Performance IA
*Écran d'évaluation professionnelle (`app/(tabs)/performance.tsx`).*

- **Bague de Score Globale (Performance Ring)** :
  - Visualisation circulaire du score d'évaluation sur 100 points.
  - Code couleur dynamique (Vert si >= 90, Ambre si >= 75, Rouge si < 75).
- **Badge Haut Potentiel (HIPO)** :
  - Détection automatique et mise en valeur des profils identifiés comme "Haut Potentiel" par les algorithmes RH.
- **Synthèse d'Analyse RH par IA (Smart Assistant)** :
  - Diagnostic textuel approfondi généré par l'IA (propulsé par Gemini) récapitulant les accomplissements, les compétences clés et les trajectoires recommandées.
  - Date de génération de l'analyse.
- **Historique des Bilans d'Évaluation** :
  - Consultation des campagnes d'évaluation périodiques avec état d'avancement (*Brouillon*, *En cours*, *Validé / Clôturé*).
  - Score individuel associé à chaque bilan.
- **Statistiques Globales** :
  - Nombre total de bilans réalisés.
  - Moyenne de performance et statut d'éligibilité HIPO.

---

### 7. Centre de Notifications In-App & Deep-Linking
*Composant d'alerte unifié (`components/NotificationsModal.tsx`).*

- **Badge Numérique Temps Réel** : Pastille rouge sur l'icône cloche du Dashboard indiquant le nombre d'événements non lus.
- **Agrégation Multi-Sources** :
  - 🏖️ **Congés** : Notifications d'approbation, de refus ou de mise en examen.
  - 📄 **Documents** : Notification dès qu'un document demandé est prêt au téléchargement ou si la demande est refusée.
  - ⚠️ **Anomalies** : Notification du traitement et de la décision RH sur une réclamation de pointage.
- **Routage Contextuel Instantané** :
  - Appuyer sur une notification marque l'élément comme lu, ferme le panneau et navigue automatiquement vers l'onglet cible avec mise en surbrillance de l'élément concerné.
- **Gestion Globale** : Bouton "Tout marquer lu" et persistance de l'état de lecture.

---

## 📁 Arborescence du Projet

```
smart-hr-mobile/
├── app/                           # Architecture Expo Router (navigation)
│   ├── _layout.tsx                # Racine : initialisation police Inter, session & splash screen
│   ├── login.tsx                  # Écran de connexion & modal changement de mot de passe
│   ├── modal.tsx                  # Modal d'information générique
│   ├── +not-found.tsx             # Écran d'erreur 404
│   └── (tabs)/                    # Onglets de navigation principale
│       ├── _layout.tsx            # Configuration de la barre d'onglets (Tab Bar)
│       ├── index.tsx              # 🏠 Tab 1 : Ma Présence (Pointage, KPIs, Calendrier)
│       ├── leaves.tsx             # 🏖️ Tab 2 : Congés (Demandes, Soldes, IA, Justificatifs)
│       ├── documents.tsx          # 📄 Tab 3 : Documents RH (Demandes, Téléchargement Base64)
│       └── performance.tsx        # 📈 Tab 4 : Mon Bilan (Score Ring, HIPO, Synthèse IA)
├── components/                    # Composants d'interface réutilisables
│   ├── AnomalyModal.tsx           # Formulaire de réclamation & historique des anomalies
│   ├── CalendarModal.tsx          # Calendrier mensuel interactif générique
│   ├── DatePickerModal.tsx        # Sélecteur de date style tambour (roulette)
│   ├── DayDetailModal.tsx         # Fiche détaillée d'une journée de pointage
│   ├── NotificationsModal.tsx     # Centre de notifications in-app avec deep-linking
│   └── ui/                        # Design System de base
│       ├── Card.tsx               # Conteneur de carte stylisé
│       ├── IconCircle.tsx         # Cercle pastel pour icônes
│       ├── PrimaryButton.tsx      # Bouton principal / CTA (variants noir, outline...)
│       ├── StatCard.tsx           # Carte KPI statistique
│       └── StatusBadge.tsx        # Badge d'état avec puce de couleur
├── constants/
│   └── theme.ts                   # Tokens du Design System (couleurs, rayons, ombres)
├── store/
│   └── useAppStore.ts             # Store global Zustand (Auth, Présence, Congés, Docs, Notifs)
├── utils/
│   └── api.ts                     # Client HTTP centralisé (JWT, Mutex 401, Méthodes API)
├── .env                           # Variables d'environnement (URL API Odoo)
├── app.json                       # Configuration Expo / Métadonnées mobiles
├── package.json                   # Dépendances du projet
└── tsconfig.json                  # Configuration TypeScript
```

---

## 🔌 Matrice des Endpoints API Odoo (`hr_ai_api`)

Toutes les requêtes passent par `utils/api.ts` et intègrent l'en-tête `Authorization: Bearer <access_token>`.

| Méthode | Endpoint | Module / Contrôleur Odoo | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/token` | `hr_ai_api` | Authentification utilisateur & génération des tokens JWT |
| `POST` | `/api/v1/auth/refresh` | `hr_ai_api` | Rafraîchissement silencieux du token d'accès expiré |
| `GET` | `/api/v1/auth/me` | `hr_ai_api` | Profil de l'utilisateur et rattachement collaborateur (`employee_id`) |
| `POST` | `/api/v1/auth/change-password` | `hr_ai_api` | Changement de mot de passe sécurisé |
| `GET` | `/api/v1/attendance/<id>` | `hr_attendance_ai` | Historique de pointage ou données mensuelles (`?month=M&year=Y`) |
| `POST` | `/api/v1/attendance/check-in` | `hr_attendance_ai` | Enregistrement d'une entrée de pointage |
| `POST` | `/api/v1/attendance/check-out` | `hr_attendance_ai` | Enregistrement d'une sortie de pointage |
| `POST` | `/api/v1/attendance/anomaly` | `hr_attendance_ai` | Déclaration d'une anomalie avec motif et pièce jointe |
| `GET` | `/api/v1/attendance/anomalies/my`| `hr_attendance_ai` | Récupération des réclamations d'anomalies du collaborateur |
| `GET` | `/api/v1/leaves` | `hr_leaves_ai` | Liste des demandes de congés de l'employé avec recommandation IA |
| `POST` | `/api/v1/leaves` | `hr_leaves_ai` | Création d'une nouvelle demande de congé (`hr.leave`) |
| `GET` | `/api/v1/documents/my` | `hr_documents_ai` | Liste des demandes de documents administratifs |
| `POST` | `/api/v1/documents/request` | `hr_documents_ai` | Soumission d'une nouvelle demande de document |
| `GET` | `/api/v1/documents/<id>/download`| `hr_documents_ai` | Téléchargement du fichier généré (flux Base64) |
| `GET` | `/api/v1/appraisals/<id>` | `hr_appraisal_ai` | Liste des bilans de performance d'un collaborateur |
| `GET` | `/api/v1/appraisal/<id>` | `hr_appraisal_ai` | Synthèse d'analyse RH détaillée générée par l'IA |

---

## 🚀 Installation & Guide de Démarrage

### Prérequis
1. **Node.js** (version 18 ou supérieure recommandée).
2. **Application Expo Go** installée sur votre smartphone (disponible sur [App Store](https://apps.apple.com/app/expo-go/id982107779) et [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)).
3. **Backend Odoo 17** en cours d'exécution avec les modules `hr_ai_api` et associés installés.

### 1. Installation des dépendances
Ouvrez un terminal dans le dossier `smart-hr-mobile` :
```bash
cd smart-hr-mobile
npm install
```

### 2. Configuration de l'adresse API
Ouvrez le fichier `.env` à la racine de `smart-hr-mobile` et définissez l'adresse de votre instance Odoo :
```env
EXPO_PUBLIC_API_BASE_URL=http://<VOTRE_IP_LOCALE>:8070
```

> 💡 **Exemple :** Si l'adresse IP de votre PC est `10.41.252.144` :
> ```env
> EXPO_PUBLIC_API_BASE_URL=http://10.41.252.144:8070
> ```

### 3. Lancement du serveur de développement
Démarrez l'application avec l'option tunnel recommandée :
```bash
npx expo start --tunnel
```

---

## 🌐 Configuration Réseau & Tunneling

L'utilisation du drapeau `--tunnel` présente des avantages déterminants :
- **Contournement des pare-feu Windows** : Aucune règle de port entrant à ouvrir manuellement.
- **Indépendance vis-à-vis du Wi-Fi** : Le smartphone et le PC peuvent être connectés sur des réseaux distincts (ex: 4G/5G mobile et Wi-Fi entreprise avec isolation client).
- **Reconnexion à chaud (Fast Refresh)** : Toute modification dans le code TypeScript est répercutée instantanément sur l'écran du smartphone sans rechargement complet.

### Connexion avec votre smartphone
1. Lancez `npx expo start --tunnel`.
2. Un QR code s'affiche dans votre terminal.
3. **Sur iPhone** : Ouvrez l'application *Appareil photo* native, pointez vers le QR code et touchez la bannière *Ouvrir dans Expo Go*.
4. **Sur Android** : Ouvrez l'application *Expo Go*, appuyez sur *Scan QR Code* et flashez le QR code du terminal.

---

## 👤 Comptes de Test & Validation

L'authentification s'effectue avec les identifiants de n'importe quel utilisateur ou employé configuré dans Odoo.

### Définir ou réinitialiser un mot de passe dans Odoo :
1. Connectez-vous à Odoo dans votre navigateur ([http://localhost:8070](http://localhost:8070)).
2. Allez dans **Paramètres → Utilisateurs et Sociétés → Utilisateurs**.
3. Sélectionnez l'employé désiré (ex: `Marc Demo` ou un collaborateur test).
4. Cliquez sur **Action** (icône d'engrenage) → **Modifier le mot de passe**.
5. Définissez un mot de passe simple (ex: `123456`).
6. Connectez-vous sur l'application mobile avec :
   - **E-mail / Login** : L'identifiant ou l'adresse e-mail de l'utilisateur Odoo.
   - **Mot de passe** : Le mot de passe configuré.

---

*Développé dans le cadre du projet **Smart HR** — Écosystème RH Intelligent couplé à Odoo 17 et à l'Intelligence Artificielle.*
