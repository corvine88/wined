import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { Wine } from './storage';

export const VIBICO_VERSION = '1.0';

export type VibicoSharePayload = {
  version: typeof VIBICO_VERSION;
  type: 'vibico_share';
  shared_by: string;
  shared_at: string;
  wine: Wine;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'degustazione';
}

export function buildSharePayload(wine: Wine, sharedBy: string): VibicoSharePayload {
  return {
    version: VIBICO_VERSION,
    type: 'vibico_share',
    shared_by: sharedBy,
    shared_at: new Date().toISOString(),
    wine,
  };
}

export async function shareWine(wine: Wine, sharedBy: string): Promise<void> {
  const payload = buildSharePayload(wine, sharedBy);
  const json = JSON.stringify(payload, null, 2);
  const filename = `${slugify(wine.name)}.vibico`;

  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Share.share({ message: json, title: filename });
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: `Condividi "${wine.name}"`,
  });
}

// Il riconoscimento è basato esclusivamente sul contenuto del file (type === 'vibico_share'),
// non sull'estensione o sul MIME type: WhatsApp e altre app spesso rinominano o tolgono
// l'estensione .vibico durante il salvataggio/invio, quindi non possiamo fare affidamento su di essa.
export function parseVibicoPayload(raw: string): VibicoSharePayload {
  const data = JSON.parse(raw);
  if (data?.type !== 'vibico_share' || !data?.wine?.name) {
    throw new Error('Questo file non è una degustazione ViBiCo valida');
  }
  return data as VibicoSharePayload;
}

export async function pickVibicoFile(): Promise<VibicoSharePayload | null> {
  // Nessun filtro per MIME type/estensione: un file .vibico rinominato da WhatsApp
  // può arrivare con qualunque MIME type o senza estensione. La validazione vera
  // avviene dopo, leggendo il contenuto con parseVibicoPayload.
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  const raw = await FileSystem.readAsStringAsync(uri);
  return parseVibicoPayload(raw);
}

export async function readVibicoFileAtUri(uri: string): Promise<VibicoSharePayload> {
  const raw = await FileSystem.readAsStringAsync(uri);
  return parseVibicoPayload(raw);
}

// Hands the parsed payload from the picker (or, after the next EAS build, from the
// OS file-association handler) over to app/receive.tsx without round-tripping it
// through router params — a shared wine can embed large base64 photos.
let pendingPayload: VibicoSharePayload | null = null;

export function setPendingSharePayload(payload: VibicoSharePayload | null) {
  pendingPayload = payload;
}

export function takePendingSharePayload(): VibicoSharePayload | null {
  const p = pendingPayload;
  pendingPayload = null;
  return p;
}
