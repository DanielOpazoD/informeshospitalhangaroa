import { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DriveProvider, useDrive } from '../contexts/DriveContext';
import type { DriveGateway } from '../services/driveGateway';

const mocks = vi.hoisted(() => ({
    useDriveStorage: vi.fn(),
    useDriveSearch: vi.fn(),
    useDriveOperations: vi.fn(),
    createDriveGateway: vi.fn(),
    getRootDriveFolder: vi.fn(),
    storageAddFavorite: vi.fn(),
    storageRemoveFavorite: vi.fn(),
    storageSetDefault: vi.fn(),
    storageAddRecent: vi.fn(),
    searchHandle: vi.fn().mockResolvedValue(undefined),
    clearSearch: vi.fn(),
    fetchDriveFolders: vi.fn().mockResolvedValue(undefined),
    fetchFolderContents: vi.fn().mockResolvedValue(undefined),
    handleGoToFavorite: vi.fn(),
    formatDriveDate: vi.fn().mockReturnValue('19/03/2026'),
    handleCreateFolder: vi.fn().mockResolvedValue(undefined),
    openJsonFileFromDrive: vi.fn().mockResolvedValue(null),
    saveToDrive: vi.fn().mockResolvedValue(true),
}));

vi.mock('../hooks/useDriveStorage', () => ({
    useDriveStorage: mocks.useDriveStorage,
}));

vi.mock('../hooks/useDriveSearch', () => ({
    useDriveSearch: mocks.useDriveSearch,
}));

vi.mock('../hooks/useDriveOperations', () => ({
    useDriveOperations: mocks.useDriveOperations,
}));

vi.mock('../services/driveGateway', () => ({
    createDriveGateway: mocks.createDriveGateway,
}));

vi.mock('../utils/driveFolderStorage', () => ({
    getRootDriveFolder: mocks.getRootDriveFolder,
}));

const configureHookMocks = () => {
    mocks.getRootDriveFolder.mockReturnValue({ id: 'root', name: 'Mi unidad' });
    mocks.createDriveGateway.mockReturnValue({ getAccessToken: () => 'token' } as DriveGateway);
    mocks.useDriveStorage.mockReturnValue({
        favoriteFolders: [{ id: 'fav-1', name: 'Favorito', path: [{ id: 'root', name: 'Mi unidad' }] }],
        recentFiles: [{ id: 'recent-1', name: 'archivo.json', openedAt: 1 }],
        handleAddFavoriteFolder: mocks.storageAddFavorite,
        handleRemoveFavoriteFolder: mocks.storageRemoveFavorite,
        addRecentFile: mocks.storageAddRecent,
        handleSetDefaultFolder: mocks.storageSetDefault,
    });
    mocks.useDriveSearch.mockReturnValue({
        driveSearchTerm: 'jane',
        driveDateFrom: '2026-03-01',
        driveDateTo: '2026-03-19',
        driveContentTerm: 'diagnostico',
        setDriveSearchTerm: vi.fn(),
        setDriveDateFrom: vi.fn(),
        setDriveDateTo: vi.fn(),
        setDriveContentTerm: vi.fn(),
        handleSearchInDrive: mocks.searchHandle,
        clearDriveSearch: mocks.clearSearch,
    });
    mocks.useDriveOperations.mockReturnValue({
        fetchDriveFolders: mocks.fetchDriveFolders,
        fetchFolderContents: mocks.fetchFolderContents,
        handleGoToFavorite: mocks.handleGoToFavorite,
        formatDriveDate: mocks.formatDriveDate,
        handleCreateFolder: mocks.handleCreateFolder,
        openJsonFileFromDrive: mocks.openJsonFileFromDrive,
        saveToDrive: mocks.saveToDrive,
    });
};

const wrapper = ({ children }: { children: ReactNode }) => (
    <DriveProvider showToast={vi.fn()}>{children}</DriveProvider>
);

describe('DriveContext', () => {
    it('expone el estado compuesto desde los hooks internos', () => {
        configureHookMocks();

        const { result } = renderHook(() => useDrive(), { wrapper });

        expect(mocks.createDriveGateway).toHaveBeenCalled();
        expect(mocks.useDriveStorage).toHaveBeenCalled();
        expect(mocks.useDriveOperations).toHaveBeenCalled();
        expect(mocks.useDriveSearch).toHaveBeenCalled();
        expect(result.current.folderPath).toEqual([{ id: 'root', name: 'Mi unidad' }]);
        expect(result.current.selectedFolderId).toBe('root');
        expect(result.current.favoriteFolders[0]?.id).toBe('fav-1');
        expect(result.current.recentFiles[0]?.id).toBe('recent-1');
        expect(result.current.driveSearchTerm).toBe('jane');
        expect(result.current.driveDateFrom).toBe('2026-03-01');
        expect(result.current.driveDateTo).toBe('2026-03-19');
        expect(result.current.driveContentTerm).toBe('diagnostico');
        expect(result.current.formatDriveDate('2026-03-19T21:00:00.000Z')).toBe('19/03/2026');
    });

    it('envuelve favoritos y carpeta predeterminada usando folderPath y selectedFolderId actuales', () => {
        configureHookMocks();

        const { result } = renderHook(() => useDrive(), { wrapper });

        act(() => {
            result.current.setFolderPath([
                { id: 'root', name: 'Mi unidad' },
                { id: 'folder-1', name: 'Paciente A' },
            ]);
        });

        act(() => {
            result.current.handleAddFavoriteFolder();
            result.current.handleSetDefaultFolder();
        });

        expect(mocks.storageAddFavorite).toHaveBeenCalledWith([
            { id: 'root', name: 'Mi unidad' },
            { id: 'folder-1', name: 'Paciente A' },
        ]);
        expect(mocks.storageSetDefault).toHaveBeenCalledWith([
            { id: 'root', name: 'Mi unidad' },
            { id: 'folder-1', name: 'Paciente A' },
        ], 'root');
    });
});
