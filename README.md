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
