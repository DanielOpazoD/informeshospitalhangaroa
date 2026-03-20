import { useState, useEffect, useCallback } from 'react';
import type { DriveFolder, FavoriteFolderEntry, RecentDriveFile, ToastFn } from '../types';
import { LOCAL_STORAGE_KEYS, MAX_RECENT_FILES } from '../appConstants';

export function useDriveStorage(showToast: ToastFn) {
    const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolderEntry[]>([]);
    const [recentFiles, setRecentFiles] = useState<RecentDriveFile[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const favoritesRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.favorites);
            if (favoritesRaw) {
                setFavoriteFolders(JSON.parse(favoritesRaw));
            }
        } catch (error) {
            console.warn('No se pudo leer la lista de favoritos de Drive:', error);
        }

        try {
            const recentsRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.recent);
            if (recentsRaw) {
                const parsedRecents = JSON.parse(recentsRaw) as RecentDriveFile[];
                setRecentFiles(parsedRecents.slice(0, MAX_RECENT_FILES));
            }
        } catch (error) {
            console.warn('No se pudo leer la lista de documentos recientes:', error);
        }
    }, []);

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
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, JSON.stringify(updated));
            }
            showToast('Carpeta añadida a favoritos.');
            return updated;
        });
    }, [showToast]);

    const handleRemoveFavoriteFolder = useCallback((id: string) => {
        setFavoriteFolders(prev => {
            if (!prev.some(fav => fav.id === id)) {
                showToast('La carpeta ya no está en favoritos.', 'warning');
                return prev;
            }
            const updated = prev.filter(fav => fav.id !== id);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, JSON.stringify(updated));
            }
            showToast('Favorito eliminado.', 'warning');
            return updated;
        });
    }, [showToast]);

    const addRecentFile = useCallback((file: DriveFolder) => {
        setRecentFiles(prev => {
            const filtered = prev.filter(entry => entry.id !== file.id);
            const updated: RecentDriveFile[] = [
                { id: file.id, name: file.name, openedAt: Date.now() },
                ...filtered,
            ].slice(0, MAX_RECENT_FILES);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.recent, JSON.stringify(updated));
            }
            return updated;
        });
    }, []);

    const handleSetDefaultFolder = useCallback((folderPath: DriveFolder[], selectedFolderId: string) => {
        if (!folderPath.length) return;
        localStorage.setItem('defaultDriveFolderId', selectedFolderId);
        localStorage.setItem('defaultDriveFolderPath', JSON.stringify(folderPath));
        showToast(`'${folderPath[folderPath.length - 1].name}' guardada como predeterminada.`);
    }, [showToast]);

    return {
        favoriteFolders,
        recentFiles,
        handleAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        addRecentFile,
        handleSetDefaultFolder,
    };
}
