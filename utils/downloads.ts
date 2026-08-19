import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const { StorageAccessFramework } = FileSystem;

// Persists the user's chosen "Downloads"-like folder (Android SAF grant survives app restarts).
const ANDROID_DOWNLOAD_DIR_KEY = 'smart_hr_android_download_dir_uri';

export interface SavedDocument {
  /** Local URI of the saved file. */
  uri: string;
  /** Human-readable location, to show in a confirmation message. */
  locationLabel: string;
}

/**
 * Saves base64 file content directly to the device's persistent storage —
 * NOT a temporary/cache location, and without opening a share sheet.
 *
 * - Android: writes into a real folder on the device (the user picks it once,
 *   typically "Downloads"; the permission is then reused for later downloads).
 * - iOS: writes into the app's Documents directory, which — because the app
 *   enables "File Sharing" — shows up in the Files app under
 *   "On My iPhone/iPad → Smart HR Mobile".
 */
export async function saveDocumentToDevice(
  base64: string,
  fileName: string,
  mimeType: string
): Promise<SavedDocument> {
  if (Platform.OS === 'android') {
    return saveOnAndroid(base64, fileName, mimeType);
  }
  return saveOnIOS(base64, fileName);
}

async function saveOnAndroid(base64: string, fileName: string, mimeType: string): Promise<SavedDocument> {
  let directoryUri = await SecureStore.getItemAsync(ANDROID_DOWNLOAD_DIR_KEY);

  // First download ever, or the previously granted folder access was revoked:
  // ask the user to pick a folder (they should pick "Downloads").
  if (!directoryUri) {
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      throw new Error('Autorisation refusée : impossible d\'enregistrer le fichier sans accès à un dossier.');
    }
    directoryUri = permissions.directoryUri;
    await SecureStore.setItemAsync(ANDROID_DOWNLOAD_DIR_KEY, directoryUri);
  }

  try {
    const destinationUri = await StorageAccessFramework.createFileAsync(directoryUri, fileName, mimeType);
    await FileSystem.writeAsStringAsync(destinationUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { uri: destinationUri, locationLabel: 'le dossier choisi (ex. Téléchargements)' };
  } catch (err) {
    // The stored folder permission is no longer valid (e.g. user cleared it in
    // Android settings) — forget it and ask again on the next attempt.
    await SecureStore.deleteItemAsync(ANDROID_DOWNLOAD_DIR_KEY);
    throw new Error('Impossible d\'écrire dans le dossier sélectionné. Réessayez pour choisir un nouveau dossier.');
  }
}

async function saveOnIOS(base64: string, fileName: string): Promise<SavedDocument> {
  const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(destinationUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri: destinationUri, locationLabel: 'l\'app Fichiers → Sur mon iPhone/iPad → Smart HR Mobile' };
}
