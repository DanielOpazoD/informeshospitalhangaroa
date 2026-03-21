import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../appConstants';
import { useDriveModals } from '../hooks/useDriveModals';
import { createMockStorage } from './testUtils';

describe('useDriveModals', () => {
    it('solicita inicio de sesión al abrir guardado sin autenticación', () => {
        const showToast = vi.fn();
        const handleSignIn = vi.fn();
        const { storage } = createMockStorage();

        const { result } = renderHook(() => useDriveModals({
            isSignedIn: false,
            handleSignIn,
            showToast,
            record: { version: 'v14', templateId: '2', title: '', patientFields: [], sections: [], medico: '', especialidad: '' },
            dispatchRecordCommand: vi.fn().mockReturnValue({ ok: true, record: { version: 'v14', templateId: '2', title: '', patientFields: [], sections: [], medico: '', especialidad: '' }, warnings: [] }),
            setHasUnsavedChanges: vi.fn(),
            saveDraft: vi.fn(),
            markRecordAsReplaced: vi.fn(),
            defaultDriveFileName: 'Registro',
            apiKey: '',
            isPickerApiReady: false,
            fetchDriveFolders: vi.fn(),
            fetchFolderContents: vi.fn(),
            setFolderPath: vi.fn(),
            setFileNameInput: vi.fn(),
            fileNameInput: '',
            saveFormat: 'json',
            openJsonFileFromDrive: vi.fn(),
            saveToDrive: vi.fn(),
            generatePdf: vi.fn(),
            storage,
        }));

        act(() => {
            result.current.openSaveModal();
        });

        expect(showToast).toHaveBeenCalledWith('Por favor, inicie sesión para guardar en Google Drive.', 'warning');
        expect(handleSignIn).toHaveBeenCalled();
    });

    it('abre el selector simple cuando no hay apiKey pero sí token de acceso', () => {
        const showToast = vi.fn();
        const fetchFolderContents = vi.fn();
        const setFolderPath = vi.fn();
        const { storage, values } = createMockStorage();
        values.set(LOCAL_STORAGE_KEYS.defaultDriveFolderPath, JSON.stringify([{ id: 'root', name: 'Mi unidad' }, { id: 'folder-1', name: 'Informes' }]));
        (window as unknown as { gapi: { client: { getToken: () => { access_token: string } } } }).gapi = {
            client: { getToken: () => ({ access_token: 'token' }) },
        };

        const { result } = renderHook(() => useDriveModals({
            isSignedIn: true,
            handleSignIn: vi.fn(),
            showToast,
            record: { version: 'v14', templateId: '2', title: '', patientFields: [], sections: [], medico: '', especialidad: '' },
            dispatchRecordCommand: vi.fn().mockReturnValue({ ok: true, record: { version: 'v14', templateId: '2', title: '', patientFields: [], sections: [], medico: '', especialidad: '' }, warnings: [] }),
            setHasUnsavedChanges: vi.fn(),
            saveDraft: vi.fn(),
            markRecordAsReplaced: vi.fn(),
            defaultDriveFileName: 'Registro',
            apiKey: '',
            isPickerApiReady: false,
            fetchDriveFolders: vi.fn(),
            fetchFolderContents,
            setFolderPath,
            setFileNameInput: vi.fn(),
            fileNameInput: '',
            saveFormat: 'json',
            openJsonFileFromDrive: vi.fn(),
            saveToDrive: vi.fn(),
            generatePdf: vi.fn(),
            storage,
        }));

        act(() => {
            result.current.handleOpenFromDrive();
        });

        expect(result.current.isOpenModalOpen).toBe(true);
        expect(setFolderPath).toHaveBeenCalled();
        expect(fetchFolderContents).toHaveBeenCalledWith('folder-1');
    });
});
