import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as storage from './storage';

const CLIENT_ID = '429263071515-5jt758k5hafolpf23efml2q2fgobt3ds.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const BACKUP_FILENAME = 'vibico_backup.json';
const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

const KEY_ACCESS_TOKEN = 'gdrive_access_token';
const KEY_REFRESH_TOKEN = 'gdrive_refresh_token';
const KEY_EXPIRES_AT = 'gdrive_expires_at';
const KEY_FILE_ID = 'gdrive_file_id';
const KEY_LAST_BACKUP = 'gdrive_last_backup_at';

async function getItem(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}
async function setItem(key: string, value: string) {
  try { await SecureStore.setItemAsync(key, value); } catch {}
}
async function deleteItem(key: string) {
  try { await SecureStore.deleteItemAsync(key); } catch {}
}

export async function isConnected(): Promise<boolean> {
  return !!(await getItem(KEY_REFRESH_TOKEN));
}

export async function getLastBackupAt(): Promise<string | null> {
  return getItem(KEY_LAST_BACKUP);
}

export async function disconnect(): Promise<void> {
  await Promise.all([
    deleteItem(KEY_ACCESS_TOKEN),
    deleteItem(KEY_REFRESH_TOKEN),
    deleteItem(KEY_EXPIRES_AT),
    deleteItem(KEY_FILE_ID),
    deleteItem(KEY_LAST_BACKUP),
  ]);
}

export async function connect(): Promise<void> {
  const redirectUri = AuthSession.makeRedirectUri({ native: 'wined://oauth-callback' });

  const request = new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    scopes: [SCOPE],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  await request.makeAuthUrlAsync({ authorizationEndpoint: AUTH_ENDPOINT });
  const result = await request.promptAsync({ authorizationEndpoint: AUTH_ENDPOINT });

  if (result.type !== 'success' || !result.params?.code) {
    throw new Error('Autorizzazione Google Drive annullata o non riuscita');
  }

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId: CLIENT_ID,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier || '' },
    },
    { tokenEndpoint: TOKEN_ENDPOINT },
  );

  if (!tokenResult.accessToken || !tokenResult.refreshToken) {
    throw new Error('Google non ha restituito un refresh token. Riprova la connessione.');
  }

  await setItem(KEY_ACCESS_TOKEN, tokenResult.accessToken);
  await setItem(KEY_REFRESH_TOKEN, tokenResult.refreshToken);
  const expiresAt = Date.now() + (tokenResult.expiresIn || 3600) * 1000;
  await setItem(KEY_EXPIRES_AT, String(expiresAt));
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getItem(KEY_REFRESH_TOKEN);
  if (!refreshToken) throw new Error('Google Drive non connesso');

  const result = await AuthSession.refreshAsync(
    { clientId: CLIENT_ID, refreshToken },
    { tokenEndpoint: TOKEN_ENDPOINT },
  );

  if (!result.accessToken) throw new Error('Rinnovo del token Google Drive non riuscito');

  await setItem(KEY_ACCESS_TOKEN, result.accessToken);
  const expiresAt = Date.now() + (result.expiresIn || 3600) * 1000;
  await setItem(KEY_EXPIRES_AT, String(expiresAt));
  // Google riusa lo stesso refresh_token; ne salviamo uno nuovo solo se fornito.
  if (result.refreshToken) await setItem(KEY_REFRESH_TOKEN, result.refreshToken);

  return result.accessToken;
}

async function getValidAccessToken(): Promise<string> {
  const [accessToken, expiresAtRaw] = await Promise.all([getItem(KEY_ACCESS_TOKEN), getItem(KEY_EXPIRES_AT)]);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;
  if (accessToken && Date.now() < expiresAt - 60000) return accessToken;
  return refreshAccessToken();
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res;
}

async function findBackupFileId(): Promise<string | null> {
  const cached = await getItem(KEY_FILE_ID);
  if (cached) return cached;

  const q = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`);
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await res.json();
  const fileId = data?.files?.[0]?.id || null;
  if (fileId) await setItem(KEY_FILE_ID, fileId);
  return fileId;
}

export async function backupNow(): Promise<void> {
  const payload = await storage.exportBackupPayload();
  const json = JSON.stringify(payload);
  const fileId = await findBackupFileId();

  if (fileId) {
    await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    });
  } else {
    const boundary = 'vibico-backup-boundary';
    const metadata = JSON.stringify({ name: BACKUP_FILENAME, mimeType: 'application/json' });
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n${json}\r\n` +
      `--${boundary}--`;

    const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    const created = await res.json();
    if (created?.id) await setItem(KEY_FILE_ID, created.id);
  }

  await setItem(KEY_LAST_BACKUP, new Date().toISOString());
}

export async function restore(): Promise<void> {
  const fileId = await findBackupFileId();
  if (!fileId) throw new Error('Nessun backup trovato su Google Drive');

  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  const payload = await res.json();
  await storage.importBackupPayload(payload);
}

export async function backupIfDue(): Promise<void> {
  if (!(await isConnected())) return;
  const last = await getLastBackupAt();
  const lastMs = last ? new Date(last).getTime() : 0;
  if (Date.now() - lastMs < BACKUP_INTERVAL_MS) return;
  try { await backupNow(); } catch {}
}
