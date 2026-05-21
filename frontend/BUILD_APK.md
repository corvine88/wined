# 📦 Build APK Android per wine D

Questa guida ti permette di generare un file `.apk` installabile su qualunque dispositivo Android per condividere l'app con gli amici.

## Prerequisiti (una volta sola)

1. **Account Expo gratuito** → registrati su https://expo.dev (basta una mail, niente carta di credito)
2. **Node.js sul tuo computer** → scarica da https://nodejs.org (versione LTS)
3. **Scarica il progetto** dal pannello Emergent: clicca "Save to GitHub" oppure scarica lo ZIP.

## Passi per generare l'APK

Apri il **Terminale** (Mac/Linux) o **PowerShell** (Windows), entra nella cartella del progetto:

```bash
cd percorso/del/progetto/frontend
```

### 1. Installa EAS CLI (solo la prima volta)
```bash
npm install -g eas-cli
```

### 2. Login sul tuo account Expo
```bash
eas login
```
Ti chiederà email e password del tuo account expo.dev.

### 3. Inizializza il progetto su EAS (solo la prima volta)
```bash
eas init
```
Conferma con "Y" quando ti chiede di creare il progetto.

### 4. Avvia la build dell'APK
```bash
eas build --platform android --profile preview
```

Risposte tipiche da dare:
- _"Generate a new Android Keystore?"_ → **Yes** (Expo gestisce tutto per te)
- _"Continue?"_ → **Yes**

### 5. Attendi
La build dura **15–25 minuti** sui server di Expo. Vedrai il progresso nel terminale e potrai chiudere se vuoi: ti arriva una email quando è pronta.

### 6. Scarica e condividi
Quando finisce, il terminale ti mostra un URL del tipo:
```
https://expo.dev/artifacts/eas/xxxxxx.apk
```

- Apri il link → scarica l'APK (~30-50 MB)
- Condividilo via **WhatsApp / Telegram / Drive / email** con i tuoi amici

## Come fanno gli amici a installarla

1. L'amico apre il link dal cellulare Android (o riceve il file APK)
2. Tocca "Scarica" → poi tocca il file scaricato
3. Android chiederà di **abilitare "Installa da fonti sconosciute"** (solo la prima volta) → conferma
4. Tocca "Installa" → app installata 🎉
5. L'app appare nel drawer come "wine D" con la tua icona

## Modifiche future

Quando vuoi aggiornare l'app:
1. Modifichi il codice (su Emergent o in locale)
2. Incrementa `versionCode` in `app.json` (es. da 1 a 2)
3. Rilancia `eas build --platform android --profile preview`
4. Distribuisci il nuovo APK

## Note importanti

- ⚠️ **Backend**: l'APK punta al backend Emergent (`https://tasting-map.preview.emergentagent.com`). Se fai il **deploy nativo su Emergent**, sostituisci l'URL in `eas.json` → campo `EXPO_PUBLIC_BACKEND_URL` con quello di produzione, poi rilancia la build.
- 💰 **Costi**: Expo offre **30 build gratis al mese** sul tier free. Più che sufficienti.
- 🔐 **Keystore**: Expo lo genera e lo conserva per te. Conservalo se vuoi passare un giorno al Play Store ufficiale.
- 📱 **iOS**: per l'IPA serve account Apple Developer ($99/anno) — non incluso in questa guida.

## Troubleshooting

- **`eas: command not found`** → controlla che Node.js sia installato (`node --version`) e ri-esegui `npm install -g eas-cli`
- **Build fallisce per memoria** → riprova, è capitato a tutti
- **App si chiude all'avvio** → controlla che `EXPO_PUBLIC_BACKEND_URL` in `eas.json` punti a un backend raggiungibile pubblicamente (non `localhost`)

Buon lavoro! 🍷
