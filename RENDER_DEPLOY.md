# 🚀 Deploy wine D su Render + MongoDB Atlas (gratis)

Guida passo-passo per pubblicare il **backend** dell'app su Render con database MongoDB Atlas. Frontend e APK punteranno poi al nuovo backend pubblico.

---

## 📋 Cosa otterrai

- ✅ Backend FastAPI online 24/7 a `https://wined-backend.onrender.com`
- ✅ Database MongoDB gratuito (512 MB) su MongoDB Atlas
- ✅ Tutto a **costo zero** (con piccolo cold-start dopo 15 min di inattività)

---

## Parte 1 · Crea il database MongoDB Atlas

### 1. Registrati
- Vai su https://www.mongodb.com/cloud/atlas/register
- Registrati con email/Google (free, niente carta di credito)

### 2. Crea un Cluster gratuito
- Clicca **"Build a Database"** → seleziona **M0 (Free)**
- Provider: **AWS** · Region: scegli quella più vicina (es. **Frankfurt** se sei in Italia)
- Nome cluster: `wined-cluster`
- Conferma → attendi 2-3 minuti

### 3. Crea utente del database
- Menu sinistra → **"Database Access"** → **"Add New Database User"**
- Username: `wined_admin`
- Password: clicca **"Autogenerate Secure Password"** → **copia e salva**
- Privilegi: **"Read and write to any database"**
- Clicca **"Add User"**

### 4. Permetti accessi da ovunque (Render IP)
- Menu sinistra → **"Network Access"** → **"Add IP Address"**
- Clicca **"Allow access from anywhere"** (0.0.0.0/0)
- Conferma

### 5. Copia la Connection String
- Tornato sulla pagina del cluster → **"Connect"** → **"Drivers"**
- Seleziona Python, versione **3.6 or later**
- Copia la stringa, sarà tipo:
  ```
  mongodb+srv://wined_admin:<password>@wined-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- **Sostituisci `<password>`** con la password che hai salvato al punto 3
- Aggiungi `/wined` prima del `?` per specificare il database:
  ```
  mongodb+srv://wined_admin:LA_TUA_PASSWORD@wined-cluster.xxxxx.mongodb.net/wined?retryWrites=true&w=majority
  ```
- **Salva questa stringa**, ti servirà su Render

---

## Parte 2 · Pubblica il backend su Render

### 1. Push del codice su GitHub
Dal pannello Emergent clicca **"Save to GitHub"**. Il codice finirà in un tuo repository GitHub.

### 2. Registrati su Render
- Vai su https://render.com
- **"Get Started"** → registrati con GitHub (più veloce)
- Autorizza Render a leggere i tuoi repository

### 3. Crea il Web Service
Hai due strade:

#### Strada A — Automatica via `render.yaml` (raccomandata)
- Su Render: **"New"** → **"Blueprint"**
- Seleziona il tuo repository GitHub `wined` (o come l'hai chiamato)
- Render leggerà `render.yaml` e configurerà il servizio automaticamente
- Ti chiederà di inserire i valori dei `sync: false`:
  - **`MONGO_URL`** = la connection string MongoDB Atlas dalla Parte 1
  - **`ADMIN_PASSWORD`** = scegli una password admin (es. `wined_admin_2024`)
- Conferma → la build parte

#### Strada B — Manuale
- **"New"** → **"Web Service"**
- Seleziona il tuo repository
- Configurazione:
  - **Name**: `wined-backend`
  - **Region**: Frankfurt
  - **Branch**: `main`
  - **Root Directory**: `backend`
  - **Runtime**: Python 3
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
  - **Plan**: **Free**
- Sotto "Environment Variables" aggiungi:
  | Nome | Valore |
  |------|--------|
  | `MONGO_URL` | la connection string Atlas |
  | `DB_NAME` | `wined` |
  | `JWT_SECRET` | una stringa random lunga (es. da https://randomkeygen.com) |
  | `ADMIN_EMAIL` | `admin@viniapp.com` |
  | `ADMIN_PASSWORD` | la tua password admin |
  | `PYTHON_VERSION` | `3.11` |
- Clicca **"Create Web Service"**

### 4. Attendi la build
- ~3-5 minuti per la prima build
- Vedi log live nella dashboard
- Al successo l'URL sarà tipo `https://wined-backend.onrender.com`

### 5. Verifica
Apri nel browser:
```
https://wined-backend.onrender.com/api/
```
Dovresti vedere: `{"message":"Diario del Vino API"}`

---

## Parte 3 · Aggiorna l'APK / frontend per usare il nuovo backend

### Per l'APK Android
1. Modifica `frontend/eas.json`:
   ```json
   "env": {
     "EXPO_PUBLIC_BACKEND_URL": "https://wined-backend.onrender.com"
   }
   ```
2. Incrementa `versionCode` in `frontend/app.json`
3. Ri-builda:
   ```bash
   eas build --platform android --profile preview
   ```
4. Distribuisci il nuovo APK

### Per la versione web (se la pubblichi su Render Static / Vercel)
Setta `EXPO_PUBLIC_BACKEND_URL=https://wined-backend.onrender.com` nelle variabili d'ambiente del frontend prima della build.

---

## ⚠️ Limiti del piano gratuito Render

- **Cold start**: dopo 15 minuti di inattività il backend si spegne. La prima richiesta dopo lo sleep impiega ~30-60 secondi (l'app sembrerà bloccata ma riparte). I tuoi utenti vedranno un caricamento più lento alla prima apertura.
- **750 ore/mese** di runtime gratuite = ~31 giorni 24/7. Sufficienti per 1 backend.
- **Build time**: 90 min/mese gratis.

### Soluzioni per il cold start
- 🆓 Usa un servizio di "ping" gratuito tipo [cron-job.org](https://cron-job.org) che chiama `/api/` ogni 10 minuti → il backend non si addormenta mai
- 💰 Upgrade a piano **Starter** ($7/mese) → niente sleep + più RAM

---

## ⚠️ Limiti del piano gratuito MongoDB Atlas

- **512 MB** di storage gratis
- Per la tua app sono **migliaia di degustazioni** con foto base64 (~150 KB per foto × 3 foto = ~450 KB per vino → ~1100 vini gratis)
- Backup automatico incluso

---

## 🆘 Troubleshooting

### "Application failed to start" su Render
- Controlla i log della build (Render → tuo servizio → "Logs")
- Verifica che `MONGO_URL` sia inserita correttamente (con la password sostituita!)
- Verifica che la connection string non abbia caratteri speciali non-URL-encoded nella password

### "Connection refused" da MongoDB
- Verifica che in Network Access di Atlas ci sia `0.0.0.0/0`
- Verifica che l'utente DB abbia privilegi "Read and write"

### Il backend funziona ma l'APK non si collega
- Apri direttamente l'URL del backend nel browser per verificare
- Controlla che `EXPO_PUBLIC_BACKEND_URL` nell'APK punti al nuovo URL Render
- Ricorda di **rebuildare l'APK** dopo aver cambiato l'URL: la variabile viene "embedded" al momento della build

### Cold start troppo lento
- Configura un ping ogni 10 min su [cron-job.org](https://cron-job.org) verso `https://wined-backend.onrender.com/api/`

---

## 🔁 Aggiornamenti futuri

1. Modifichi il codice su Emergent
2. Clicca **"Save to GitHub"** → push al tuo repo
3. **Render auto-rilancia il deploy** quando rileva il push (impostazione default attiva)
4. In ~3 minuti la nuova versione è live
5. I dati MongoDB Atlas restano intatti
6. Per APK con nuove feature: rebuilda con EAS e distribuisci

---

Buon deploy! 🍷
