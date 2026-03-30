import { useState, useEffect, useCallback } from 'react';
import type { DriveFolder, FavoriteFolderEntry, RecentDriveFile, ToastFn } from '../types';
import { LOCAL_STORAGE_KEYS, MAX_RECENT_FILES } from '../appConstants';
import { getBrowserStorageAdapter, readStoredJson, writeStoredJson, type StorageAdapter } from '../utils/storageAdapter';
import { persistDefaultDriveFolder } from '../utils/driveFolderStorage';

export function useDriveStorage(showToast: ToastFn, storage: StorageAdapter | null = getBrowserStorageAdapter()) {
    const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolderEntry[]>([]);
    const [recentFiles, setRecentFiles] = useState<RecentDriveFile[]>([]);

    useEffect(() => {
        try {
            const favorites = readStoredJson<FavoriteFolderEntry[]>(storage, LOCAL_STORAGE_KEYS.favorites);
            if (favorites) {
                setFavoriteFolders(favorites);
            }
        } catch (error) {
            console.warn('No se pudo leer la lista de favoritos de Drive:', error);
        }

        try {
            const recents = readStoredJson<RecentDriveFile[]>(storage, LOCAL_STORAGE_KEYS.recent);
            if (recents) {
                setRecentFiles(recents.slice(0, MAX_RECENT_FILES));
            }
        } catch (error) {
            console.warn('No se pudo leer la lista de documentos recientes:', error);
        }
    }, [storage]);

    const handleAddFavoriteFolder = useCallback((folderPath: DriveFolder[]) => {
        const currentFolder = folderPath[folderPath.length - 1];
        if (!currentFolder) return;
        setFavoriteFolders(prev => {
            if (prev.some(fav => fav.id === currentFolder.id)) {
                showToast('La carpeta ya está marcada como favorita.', 'warning');
                return prev;
            }
            const newEntry: FavoriteFolderEntry = {
                id: currentFolder.id,
                name: currentFolder.name,
                path: structuredClone(folderPath),
            };
            const updated = [...prev, newEntry];
            writeStoredJson(storage, LOCAL_STORAGE_KEYS.favorites, updated);
            showToast('Carpeta añadida a favoritos.');
            return updated;
        });
    }, [showToast, storage]);

    const handleRemoveFavoriteFolder = useCallback((id: string) => {
        setFavoriteFolders(prev => {
            if (!prev.some(fav => fav.id === id)) {
                showToast('La carpeta ya no está en favoritos.', 'warning');
                return prev;
            }
            const updated = prev.filter(fav => fav.id !== id);
            writeStoredJson(storage, LOCAL_STORAGE_KEYS.favorites, updated);
            showToast('Favorito eliminado.', 'warning');
            return updated;
        });
    }, [showToast, storage]);

    const addRecentFile = useCallback((file: DriveFolder) => {
        setRecentFiles(prev => {
            const filtered = prev.filter(entry => entry.id !== file.id);
            const updated: RecentDriveFile[] = [
                { id: file.id, name: file.name, openedAt: Date.now() },
                ...filtered,
            ].slice(0, MAX_RECENT_FILES);
            writeStoredJson(storage, LOCAL_STORAGE_KEYS.recent, updated);
            return updated;
        });
    }, [storage]);

    const handleSetDefaultFolder = useCallback((folderPath: DriveFolder[], selectedFolderId: string) => {
        if (!folderPath.length) return;
        persistDefaultDriveFolder(storage, folderPath, selectedFolderId);
        showToast(`'${folderPath[folderPath.length - 1].name}' guardada como predeterminada.`);
    }, [showToast, storage]);

    return {
        favoriteFolders,
        recentFiles,
        handleAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        addRecentFile,
        handleSetDefaultFolder,
    };
}
