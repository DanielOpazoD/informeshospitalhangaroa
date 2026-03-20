import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppModals from '../../../components/app/AppModals';
import type { DriveFolder, FavoriteFolderEntry, RecentDriveFile, VersionHistoryEntry } from '../../../types';

const folderPath: DriveFolder[] = [
    { id: 'root', name: 'Mi unidad' },
    { id: 'folder-1', name: 'Informes' },
];

const favoriteFolders: FavoriteFolderEntry[] = [
    { id: 'fav-1', name: 'Urgencias', path: folderPath },
];

const recentFiles: RecentDriveFile[] = [
    { id: 'recent-1', name: 'paciente.json', openedAt: Date.UTC(2026, 2, 19, 21, 0, 0) },
];

const historyEntries: VersionHistoryEntry[] = [
    {
        id: 'history-1',
        timestamp: Date.UTC(2026, 2, 19, 20, 0, 0),
        record: {
            version: 'v14',
            templateId: '2',
            title: 'Ficha',
            patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' }],
            sections: [],
            medico: '',
            especialidad: '',
        },
    },
];

const buildProps = (): React.ComponentProps<typeof AppModals> => ({
    settings: {
        isSettingsModalOpen: true,
        tempApiKey: 'api-key',
        tempClientId: 'client-id',
        tempAiApiKey: 'ai-api-key',
        tempAiProjectId: 'project-1',
        tempAiModel: 'gemini-1.5-flash-latest',
        showApiKey: true,
        showAiApiKey: true,
        onClose: vi.fn(),
        onToggleShowApiKey: vi.fn(),
        onToggleShowAiApiKey: vi.fn(),
        onTempApiKeyChange: vi.fn(),
        onTempClientIdChange: vi.fn(),
        onTempAiApiKeyChange: vi.fn(),
        onTempAiProjectIdChange: vi.fn(),
        onTempAiModelChange: vi.fn(),
        onSave: vi.fn(),
        onClearCredentials: vi.fn(),
    },
    openModal: {
        isOpen: true,
        isDriveLoading: false,
        folderPath,
        driveFolders: [{ id: 'folder-2', name: 'Paciente A' }],
        driveJsonFiles: [{ id: 'file-1', name: 'registro.json', modifiedTime: '2026-03-19T21:00:00.000Z' }],
        driveSearchTerm: 'Jane',
        driveDateFrom: '2026-03-01',
        driveDateTo: '2026-03-19',
        driveContentTerm: 'diagnostico',
        favoriteFolders,
        recentFiles,
        formatDriveDate: value => value ? '19/03/2026' : 'Sin fecha',
        onClose: vi.fn(),
        onSearch: vi.fn(),
        onClearSearch: vi.fn(),
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
        onGoToFavorite: vi.fn(),
        onBreadcrumbClick: vi.fn(),
        onFolderClick: vi.fn(),
        onFileOpen: vi.fn(),
        onSearchTermChange: vi.fn(),
        onDateFromChange: vi.fn(),
        onDateToChange: vi.fn(),
        onContentTermChange: vi.fn(),
    },
    saveModal: {
        isOpen: true,
        isDriveLoading: false,
        isSaving: false,
        saveFormat: 'json',
        fileNameInput: 'reporte',
        defaultDriveFileName: 'reporte-default',
        folderPath,
        driveFolders: [{ id: 'folder-3', name: 'Altas' }],
        favoriteFolders,
        newFolderName: 'Nueva carpeta',
        onClose: vi.fn(),
        onSave: vi.fn(),
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
        onGoToFavorite: vi.fn(),
        onBreadcrumbClick: vi.fn(),
        onFolderClick: vi.fn(),
        onSaveFormatChange: vi.fn(),
        onFileNameInputChange: vi.fn(),
        onNewFolderNameChange: vi.fn(),
        onCreateFolder: vi.fn(),
        onSetDefaultFolder: vi.fn(),
    },
    history: {
        isOpen: true,
        history: historyEntries,
        onClose: vi.fn(),
        onRestore: vi.fn(),
    },
    toast: {
        type: 'success',
        message: 'Configuración guardada',
    },
    importInputRef: createRef<HTMLInputElement>(),
    onImportFile: vi.fn(),
});

describe('AppModals', () => {
    it('renderiza los modales principales, toast e input de importación', () => {
        render(<AppModals {...buildProps()} />);

        expect(screen.getByText('⚙️ Configuración de Google API')).toBeTruthy();
        expect(screen.getByText('Abrir desde Drive')).toBeTruthy();
        expect(screen.getByText('Guardar en Google Drive')).toBeTruthy();
        expect(screen.getByText('Historial de versiones locales')).toBeTruthy();
        expect(screen.getByText('Configuración guardada')).toBeTruthy();
        expect(document.querySelector('#importJson')).toBeInstanceOf(HTMLInputElement);
    });

    it('propaga interacciones de settings, drive, save e historial', () => {
        const props = buildProps();
        render(<AppModals {...props} />);

        fireEvent.change(screen.getByPlaceholderText('123-abc.apps.googleusercontent.com'), { target: { value: 'nuevo-client-id' } });
        fireEvent.change(screen.getByPlaceholderText('1056053283940'), { target: { value: 'nuevo-proyecto' } });
        fireEvent.click(screen.getByText('💾 Guardar'));
        fireEvent.click(screen.getByText('🗑️ Eliminar credenciales'));

        fireEvent.click(screen.getByText('Buscar'));
        fireEvent.click(screen.getByText('Limpiar'));
        fireEvent.click(screen.getAllByText('Urgencias')[0]);
        fireEvent.click(screen.getByText('paciente.json'));
        fireEvent.click(screen.getByText('Paciente A'));
        fireEvent.click(screen.getByText('registro.json'));

        fireEvent.click(screen.getByLabelText('PDF'));
        fireEvent.change(screen.getByPlaceholderText('reporte-default'), { target: { value: 'egreso' } });
        fireEvent.change(screen.getByPlaceholderText('Nombre de la carpeta'), { target: { value: 'Archivados' } });
        fireEvent.click(screen.getByText('Establecer como predeterminada'));
        fireEvent.click(screen.getByText('Crear'));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        fireEvent.click(screen.getByText('Restaurar'));
        fireEvent.click(screen.getByText('Cerrar'));

        expect(props.settings.onTempClientIdChange).toHaveBeenCalledWith('nuevo-client-id');
        expect(props.settings.onTempAiProjectIdChange).toHaveBeenCalledWith('nuevo-proyecto');
        expect(props.settings.onSave).toHaveBeenCalled();
        expect(props.settings.onClearCredentials).toHaveBeenCalled();
        expect(props.openModal.onSearch).toHaveBeenCalled();
        expect(props.openModal.onClearSearch).toHaveBeenCalled();
        expect(props.openModal.onGoToFavorite).toHaveBeenCalledWith(favoriteFolders[0]);
        expect(props.openModal.onFileOpen).toHaveBeenCalledWith({ id: 'recent-1', name: 'paciente.json' });
        expect(props.openModal.onFolderClick).toHaveBeenCalledWith({ id: 'folder-2', name: 'Paciente A' });
        expect(props.openModal.onFileOpen).toHaveBeenCalledWith({ id: 'file-1', name: 'registro.json', modifiedTime: '2026-03-19T21:00:00.000Z' });
        expect(props.saveModal.onSaveFormatChange).toHaveBeenCalledWith('pdf');
        expect(props.saveModal.onFileNameInputChange).toHaveBeenCalledWith('egreso');
        expect(props.saveModal.onNewFolderNameChange).toHaveBeenCalledWith('Archivados');
        expect(props.saveModal.onSetDefaultFolder).toHaveBeenCalled();
        expect(props.saveModal.onCreateFolder).toHaveBeenCalled();
        expect(props.saveModal.onSave).toHaveBeenCalled();
        expect(props.history.onRestore).toHaveBeenCalledWith(historyEntries[0]);
        expect(props.history.onClose).toHaveBeenCalled();
    });

    it('envía el archivo importado al callback correspondiente', () => {
        const props = buildProps();
        render(<AppModals {...props} />);
        const input = document.querySelector('#importJson') as HTMLInputElement;
        const file = new window.File(['{}'], 'registro.json', { type: 'application/json' });

        fireEvent.change(input, { target: { files: [file] } });

        expect(props.onImportFile).toHaveBeenCalled();
    });
});
