# Kivu Culture Hub — API (Node.js + Express)

API backend qui sert d'intermédiaire entre le frontend (Firebase Hosting)
et Firestore, en utilisant le **Firebase Admin SDK** (droits complets,
indépendants des règles de sécurité Firestore).

## 1. Installation en local

```bash
cd kivu-api
npm install
cp .env.example .env
```

Ouvre `.env` et remplis :
- `FRONTEND_ORIGIN` → l'URL de ton site Firebase Hosting
- `JWT_SECRET` → génère-en un avec :
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` →
  depuis Firebase Console > Paramètres du projet > Comptes de service >
  **Générer une nouvelle clé privée**. Cela télécharge un fichier JSON.
  Ouvre-le et copie chaque valeur correspondante dans `.env`
  (PAS le fichier JSON entier).

  ⚠️ Pour `FIREBASE_PRIVATE_KEY`, garde la valeur entre guillemets et les
  `\n` tels quels (ne les remplace pas par de vrais retours à la ligne).

Lance le serveur :
```bash
npm run dev
```
Tu devrais voir : `✅ Kivu Culture Hub API démarrée sur le port 4000`

Teste rapidement :
```bash
curl http://localhost:4000/
# {"statut":"ok","message":"Kivu Culture Hub API en ligne."}

curl http://localhost:4000/api/artistes
# [] (vide au départ, ou la liste de tes artistes existants)
```

## 2. Déploiement sur Render

1. Pousse ce dossier `kivu-api` dans un repo Git (GitHub/GitLab).
   **Vérifie que `.env` n'est PAS commité** (il est dans `.gitignore`).
2. Sur [render.com](https://render.com) → **New > Web Service** → connecte
   ton repo.
3. Configuration :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Environment** : Node
4. Dans **Environment > Environment Variables**, ajoute exactement les
   mêmes clés que dans ton `.env` local : `FRONTEND_ORIGIN`, `JWT_SECRET`,
   `JWT_EXPIRES_IN`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
   `FIREBASE_PRIVATE_KEY`.
   (Ne mets PAS de variable `PORT` — Render la fournit automatiquement.)
5. Déploie. Render te donne une URL du type
   `https://kivu-culture-hub-api.onrender.com`.

⚠️ Sur le plan gratuit de Render, le service "s'endort" après 15 minutes
d'inactivité et prend quelques secondes à se réveiller au prochain appel —
normal, pas un bug.

## 3. Mettre à jour le frontend (main.js)

Une fois l'API en ligne, il faut remplacer les appels Firestore directs
dans `main.js` par des appels `fetch()` vers cette API. Cette étape n'est
**pas encore faite** dans ce livrable — c'est la prochaine chose à faire
ensemble une fois le serveur déployé et testé.

Exemple de ce qui va changer :
```js
// AVANT (appel direct Firestore depuis le navigateur)
const snap = await getDocs(collection(db, 'kivu-artistes'));

// APRÈS (appel à ton API)
const res = await fetch('https://kivu-culture-hub-api.onrender.com/api/artistes');
const artistes = await res.json();
```

Pour les routes protégées (admin, espace artiste), il faudra envoyer le
token JWT reçu au login dans l'en-tête :
```js
fetch(url, { headers: { Authorization: 'Bearer ' + token } })
```

## 4. Récapitulatif des routes disponibles

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Login unifié admin/artiste, renvoie un JWT |
| POST | `/api/auth/inscription` | public | Inscription artiste |
| POST | `/api/auth/verifier-recuperation` | public | Vérifie identité avant reset mdp |
| POST | `/api/auth/reinitialiser-mot-de-passe` | public (via resetToken) | Réinitialise le mdp |
| GET | `/api/artistes` | public | Liste des artistes |
| GET | `/api/artistes/:id` | public | Profil d'un artiste |
| POST | `/api/artistes/:id/like` | public | Like un artiste |
| POST/PUT/DELETE | `/api/artistes` | admin | Gestion artistes |
| GET | `/api/oeuvres` | public | Liste des œuvres |
| POST | `/api/oeuvres/:id/like` | public | Like une œuvre |
| POST/PUT/DELETE | `/api/oeuvres` | admin | Gestion œuvres |
| GET | `/api/news` | public | Liste des actualités |
| POST/PUT/DELETE | `/api/news` | admin | Gestion actualités |
| POST | `/api/messages` | public | Envoyer un message (formulaire contact) |
| GET/DELETE | `/api/messages` | admin | Lecture/suppression messages |
| GET/POST/DELETE | `/api/admin/comptes` | super admin | Gestion comptes admin |
| PUT | `/api/admin/mon-compte/...` | admin | Modifier son email/mdp |
| GET | `/api/admin/demandes` | admin | Liste des demandes artistes |
| PUT | `/api/admin/demandes/:id/approuver` | admin | Approuve une demande |
| PUT | `/api/admin/demandes/:id/refuser` | admin | Refuse une demande |
| GET/PUT/POST/DELETE | `/api/espace-artiste/*` | artiste connecté | Espace personnel artiste |

## 5. Sécuriser Firestore en complément

Une fois l'API en place, durcis tes règles Firestore pour qu'**aucun**
accès direct depuis le navigateur ne soit possible sur les collections
sensibles — seul l'Admin SDK (donc ton serveur) y aura accès, en
ignorant complètement les règles :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Avec cette règle unique, Firestore refuse tout accès client direct — et
ton frontend n'en a plus besoin puisqu'il passe désormais par l'API.



version 2 : 

# Kivu Culture Hub — README du projet

Ce document explique, en langage simple, tout ce qui a été fait sur ton projet : pourquoi, comment, et ce qui reste à faire. Garde-le comme référence.

---

## 1. Le problème de départ

Ton site (`kivu-culture-hub-78805.web.app`) avait cessé d'afficher les artistes et œuvres. La console montrait :

```
FirebaseError: Missing or insufficient permissions.
```

**Cause :** tes règles de sécurité Firestore (les règles qui décident qui a le droit de lire/écrire quoi) faisaient référence à des noms de collections (`artists`, `artworks`) qui ne correspondaient pas aux vrais noms utilisés dans ton code (`kivu-artistes`, `kivu-oeuvres`, `kivu-news`, etc.). Firestore appliquait donc sa règle par défaut : tout refuser.

**Solution appliquée :** réécriture des règles Firestore pour qu'elles correspondent aux vrais noms de collections. Le site a immédiatement réaffiché les données.

---

## 2. Pourquoi on a construit un serveur en plus

Une fois le site réparé, un autre sujet est apparu : ton site utilise un système de connexion "fait maison" (mots de passe hashés avec une fonction simple, gestion via `sessionStorage`). Ce code tourne **dans le navigateur du visiteur**, donc il est visible par n'importe qui (clic droit → Inspecter). Ce n'est pas idéal pour protéger les mots de passe et les actions sensibles (admin, comptes artistes).

### La solution : un serveur intermédiaire

On a construit un **serveur Node.js + Express**, hébergé séparément, qui sert de "gardien" entre ton site et ta base de données.

**Avant :**
```
Visiteur → Site web → Firestore (directement, navigateur ↔ Google)
```

**Maintenant :**
```
Visiteur → Site web (Firebase Hosting) → Ton serveur (Render) → Firestore (Google)
```

Le navigateur ne parle plus jamais directement à Firestore. Il parle à ton serveur, qui lui seul détient les clés d'accès complètes (jamais visibles publiquement), et qui vérifie les permissions avant chaque action sensible.

### Les technologies utilisées, expliquées simplement

| Techno | Rôle |
|---|---|
| **Node.js** | Le moteur qui permet de faire tourner du JavaScript en dehors du navigateur, sur un serveur |
| **Express.js** | Un outil construit sur Node.js qui simplifie la création d'une API web (les "routes" comme `/api/artistes`) |
| **Firebase Admin SDK** | La clé maîtresse qui donne à ton serveur un accès total à Firestore, indépendamment des règles de sécurité |
| **JWT (JSON Web Token)** | Un système de "badge numérique" donné à l'utilisateur après connexion, qui prouve son identité à chaque requête suivante — remplace `sessionStorage` |
| **Render** | La plateforme qui héberge ton serveur en ligne (gratuitement, avec quelques limites) |

---

## 3. Ce qui a été construit : `kivu-api`

Un dossier de projet **complètement séparé** de ton site, contenant :

```
kivu-api/
├── server.js              → point d'entrée, démarre le serveur
├── config/firebase.js     → connexion sécurisée à Firestore
├── middleware/auth.js     → vérifie qui a le droit de faire quoi
├── utils/hash.js          → ton système de hash de mot de passe (repris à l'identique)
├── utils/jwt.js           → crée/vérifie les badges de connexion
├── routes/
│   ├── auth.js            → connexion, inscription, mot de passe oublié
│   ├── artistes.js        → gestion des artistes
│   ├── oeuvres.js         → gestion des œuvres
│   ├── news.js            → gestion des actualités
│   ├── messages.js        → formulaire de contact
│   ├── admins.js          → gestion des comptes admin + demandes artistes
│   └── espaceArtiste.js   → l'espace personnel de chaque artiste
├── .env                   → tes clés secrètes (jamais partagées publiquement)
└── package.json           → la liste des outils utilisés
```

### Étapes importantes traversées

1. **Création de toutes les routes** — chaque fonctionnalité de ton site a son équivalent "sécurisé" côté serveur.
2. **Incident de sécurité évité** — une clé privée Firebase a été collée par erreur dans la conversation. Elle a été immédiatement révoquée sur Google Cloud Console et remplacée par une nouvelle. *Règle à retenir : ne jamais partager le contenu d'une clé privée, même avec Claude.*
3. **Test en local** — le serveur a été lancé sur ton PC (`npm run dev`) et testé avec succès.
4. **Déploiement sur Render** — le serveur est maintenant accessible publiquement à l'adresse `https://kivu-api.onrender.com`.
5. **Correction CORS** — au départ, le serveur n'autorisait que les requêtes venant de ton site en ligne. Il a fallu ajouter ton adresse de test locale (`http://127.0.0.1:5500`) à la liste des origines autorisées, dans les variables d'environnement Render (`FRONTEND_ORIGIN`).

---

## 4. Ce qui a été modifié : `main.js` (ton site)

Le fichier `js/main.js` a été réécrit **page par page**, pour que chaque fonctionnalité appelle ton API (`https://kivu-api.onrender.com/api/...`) au lieu de Firestore directement.

| Page / fonctionnalité | Statut |
|---|---|
| Page d'accueil (stats, artistes vedette, œuvres, news, likes) | ✅ Migré |
| Formulaire de contact | ✅ Migré |
| Page liste des artistes (filtres, recherche) | ✅ Migré |
| Page profil d'un artiste | ✅ Migré |
| Page œuvres (filtres, recherche) | ✅ Migré |
| Page actualités (liste + détail d'un article) | ✅ Migré |
| Connexion (admin + artiste, via JWT) | ✅ Migré |
| Inscription artiste | ✅ Migré |
| Espace artiste (profil, publication, ses œuvres) | ✅ Migré |
| Administration (gestion complète, comptes admin, demandes) | ✅ Migré |

**Changement supplémentaire :** le système de traduction FR/EN (bouton flottant, textes traduits manuellement) a été entièrement supprimé. Le site est maintenant uniquement en français, et tu comptes sur la fonction de traduction automatique intégrée aux navigateurs pour les visiteurs non-francophones.

---

## 5. Ajustement visuel (CSS)

**Problème observé :** sur la page liste des artistes, certaines bios très longues élargissaient automatiquement toutes les cartes de la grille, créant un affichage déséquilibré.

**Solution appliquée :** une règle CSS (`-webkit-line-clamp: 3`) qui limite l'affichage de la bio à 3 lignes maximum dans la liste, avec "..." à la fin si le texte est coupé. La bio complète reste visible sur la page de profil individuel de l'artiste.

---

## 6. Ce qu'il reste à faire

### a) Tester chaque page migrée
Vérifier que tout fonctionne réellement en conditions d'usage : connexion admin, connexion artiste, ajout/modification/suppression de contenu, formulaire de contact, etc.

### b) Activer Firebase Storage
Actuellement, les photos d'artistes et certaines œuvres sont stockées comme du texte brut (base64) directement dans Firestore. C'est risqué :
- Limite stricte de 1 Mo par document Firestore (une photo un peu lourde peut faire planter l'enregistrement).
- Certaines photos sont déjà visiblement tronquées/cassées sur le site.

**Solution prévue mais pas encore réalisée :** activer Firebase Storage (le "coffre à fichiers" de Firebase, séparé de Firestore), et faire en sorte que les photos/œuvres soient envoyées là-bas, avec seulement leur lien (URL) stocké dans Firestore.

⚠️ Activer Storage demande de passer au plan **Blaze** sur Firebase (ajout d'une carte bancaire), mais reste gratuit jusqu'à 5 Go de stockage. Une alerte de budget a été recommandée par sécurité avant cette étape.

### c) Durcir les règles de sécurité Firestore
Une fois que **tout** le site passe par ton API (et plus jamais directement par Firestore), il faudra remplacer les règles actuelles par quelque chose de très strict :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Cette règle bloque **tout accès direct** depuis un navigateur. Seul ton serveur (via la clé Admin SDK) pourra encore lire/écrire dans Firestore, car l'Admin SDK ignore complètement les règles de sécurité. C'est l'étape qui rendra ton système réellement sécurisé.

---

## 7. Lexique rapide

- **Firestore** : la base de données qui stocke le texte (noms, bios, titres).
- **Firebase Storage** : le service prévu pour stocker les fichiers (photos, audio, vidéo) — pas encore utilisé.
- **API / serveur Express** : l'intermédiaire que tu as créé entre ton site et Firestore.
- **JWT (token)** : le "badge numérique" qui prouve qu'un utilisateur est bien connecté, sans avoir à renvoyer son mot de passe à chaque action.
- **CORS** : la sécurité du navigateur qui bloque les requêtes vers un serveur si celui-ci n'a pas explicitement autorisé l'adresse d'où vient la requête.
- **Render** : la plateforme qui héberge ton serveur `kivu-api` en ligne.
- **Firebase Hosting** : la plateforme qui héberge ton site web (HTML/CSS/JS).
