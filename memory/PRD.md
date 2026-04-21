# Diario del Vino — PRD

## Overview
Personal wine tasting journal mobile app (React Native Expo + FastAPI + MongoDB). Italian language UI. Elegant, warm, sommelier-notebook aesthetic (Cormorant Garamond + Manrope, wine red #7B2E40 on cream #F9F8F5).

## User Goals
Register and remember every wine tasting with photos, location (GPS + manual), star rating, notes; browse by type or location; visualize locations on an interactive map.

## Authentication
- Email/password with JWT Bearer tokens (AsyncStorage on mobile, cookie on web)
- Emergent-managed Google OAuth (web redirect + native WebBrowser.openAuthSessionAsync)
- Admin seeded on startup: `admin@viniapp.com` / `admin123`

## Key Features (implemented)
- **Auth screens**: Accedi / Registrati toggle + "Continua con Google"
- **Home (I Miei Vini)**: search, segmented filter (Per Tipologia / Per Luogo), filter chips, wine cards with thumbnail + type badge + stars + location
- **Aggiungi**: front + back photo slots (camera or gallery), name, wine type chips (6 defaults + user custom), location text + GPS button (reverse-geocoded), 5-star rating, notes
- **Mappa**: react-native-maps with colored pins per wine type (web fallback = list view)
- **Dettaglio vino**: hero photo, type badge, stars, location, notes, back label, delete
- **Profilo**: avatar, name, email, auth provider badge, logout

## API (all under /api)
- `POST /auth/register`, `POST /auth/login`, `POST /auth/session` (Emergent OAuth), `GET /auth/me`, `POST /auth/logout`
- `GET/POST /wine-types`
- `GET /wines` (filters: `wine_type`, `location`), `POST /wines`, `GET/PUT/DELETE /wines/{id}`

## Data Model (MongoDB)
- `users` { user_id, email, name, picture, password_hash?, auth_provider, role?, created_at }
- `user_sessions` { user_id, session_token, expires_at, created_at }
- `wines` { wine_id, user_id, name, wine_type, location_name, latitude, longitude, rating 0-5, notes, front_photo (base64), back_photo (base64), created_at }
- `wine_types` { wine_type_id, user_id, name }

## Permissions (app.json)
Camera, photo library, location (fine + coarse) — declared in iOS infoPlist and Android permissions with Italian descriptions.

## Smart Enhancement
The photo-first entry flow with automatic GPS + reverse-geocoded location name makes re-logging a wine effortless (2 taps + 1 rating) — key to habit formation and long-term journaling retention.

## Next Iterations (ideas)
- Statistics dashboard (avg rating per type, most visited locations)
- Export / share wine entry (PDF or image)
- Search by notes (full-text)
- Cloud image storage when base64 payload grows
