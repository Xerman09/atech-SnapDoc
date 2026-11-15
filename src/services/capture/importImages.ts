import * as ImagePicker from 'expo-image-picker';
import { validateImportedImage } from '../../utils/fileValidation';
import { saveScanImageToAppStorage } from '../storage/localFiles';

export interface CapturedImageAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
  source: 'camera' | 'gallery';
  createdAt: number;
}

export interface ImportImagesResult {
  canceled: boolean;
  imported: CapturedImageAsset[];
  rejected: { name: string; reason: string }[];
}

export async function pickAndValidateImages(): Promise<ImportImagesResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      canceled: true,
      imported: [],
      rejected: [{ name: 'Gallery', reason: 'Media library permission was not granted.' }],
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
    selectionLimit: 20,
  });

  if (result.canceled || !result.assets?.length) {
    return { canceled: true, imported: [], rejected: [] };
  }

  const imported: CapturedImageAsset[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const asset of result.assets) {
    const validation = validateImportedImage({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
    });

    if (!validation.ok) {
      rejected.push({
        name: asset.fileName ?? 'Selected image',
        reason: validation.reason,
      });
      continue;
    }

    const savedUri = saveScanImageToAppStorage(
      asset.uri,
      asset.fileName,
      validation.extension
    );

    imported.push({
      id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      uri: savedUri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      source: 'gallery',
      createdAt: Date.now(),
    });
  }

  return { canceled: false, imported, rejected };
}
