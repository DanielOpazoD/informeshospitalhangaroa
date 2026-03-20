import { LOCAL_STORAGE_KEYS } from '../appConstants';
import type { DriveFolder } from '../types';
import { type StorageAdapter, readStoredJson, writeStoredJson } from './storageAdapter';

const ROOT_FOLDER: DriveFolder = { id: 'root', name: 'Mi unidad' };

export const getRootDriveFolder = (): DriveFolder => ({ ...ROOT_FOLDER });

export const loadDefaultDriveFolderPath = (storage: StorageAdapter | null): DriveFolder[] | null => {
    const parsed = readStoredJson<DriveFolder[]>(storage, LOCAL_STORAGE_KEYS.defaultDriveFolderPath);
    if (!parsed?.length) {
        return null;
    }

    return parsed.map(folder => ({ ...folder }));
};

export const persistDefaultDriveFolder = (
    storage: StorageAdapter | null,
    folderPath: DriveFolder[],
    selectedFolderId: string,
): void => {
    if (!storage || !folderPath.length) {
        return;
    }

    storage.setItem(LOCAL_STORAGE_KEYS.defaultDriveFolderId, selectedFolderId);
    writeStoredJson(storage, LOCAL_STORAGE_KEYS.defaultDriveFolderPath, folderPath);
};
