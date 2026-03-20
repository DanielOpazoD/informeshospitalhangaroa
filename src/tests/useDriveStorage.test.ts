import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../appConstants';
import { useDriveStorage } from '../hooks/useDriveStorage';
import { createMockStorage } from './testUtils';

describe('useDriveStorage', () => {
    it('agrega favoritos y evita duplicados', () => {
        const { storage, values } = createMockStorage();
        const showToast = vi.fn();
        const { result } = renderHook(() => useDriveStorage(showToast, storage));
        const folderPath = [{ id: 'root', name: 'Mi unidad' }, { id: 'folder-1', name: 'Informes' }];

        act(() => {
            result.current.handleAddFavoriteFolder(folderPath);
            result.current.handleAddFavoriteFolder(folderPath);
        });

        expect(result.current.favoriteFolders).toHaveLength(1);
        expect(showToast).toHaveBeenCalledWith('Carpeta añadida a favoritos.');
        expect(showToast).toHaveBeenCalledWith('La carpeta ya está marcada como favorita.', 'warning');
        expect(values.get(LOCAL_STORAGE_KEYS.favorites)).toContain('folder-1');
    });

    it('guarda recientes y carpeta predeterminada', () => {
        const { storage, values } = createMockStorage();
        const showToast = vi.fn();
        const { result } = renderHook(() => useDriveStorage(showToast, storage));
        const folderPath = [{ id: 'root', name: 'Mi unidad' }, { id: 'folder-2', name: 'Pacientes' }];

        act(() => {
            result.current.addRecentFile({ id: 'file-1', name: 'a.json' });
            result.current.handleSetDefaultFolder(folderPath, 'folder-2');
        });

        expect(result.current.recentFiles[0]?.id).toBe('file-1');
        expect(values.get(LOCAL_STORAGE_KEYS.recent)).toContain('file-1');
        expect(values.get(LOCAL_STORAGE_KEYS.defaultDriveFolderId)).toBe('folder-2');
        expect(values.get(LOCAL_STORAGE_KEYS.defaultDriveFolderPath)).toContain('Pacientes');
    });
});
