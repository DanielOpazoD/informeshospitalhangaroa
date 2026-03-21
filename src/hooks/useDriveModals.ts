import React, { useCallback, useState } from 'react';
import type { ClinicalRecord, DriveFolder, SaveFormat, SaveOptions } from '../types';
import type { GooglePickerCallbackData } from '../google-api.d';
import { validateCriticalFields } from '../utils/validationUtils';
import { buildContextualErrorMessage } from '../utils/errorUtils';
import { getRootDriveFolder, loadDefaultDriveFolderPath } from '../utils/driveFolderStorage';
import { getBrowserStorageAdapter, type StorageAdapter } from '../utils/storageAdapter';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../application/clinicalRecordCommands';
import type { EditorWorkflowAction } from '../application/editorWorkflow';

interface UseDriveModalsOptions {
    isSignedIn: boolean;
    handleSignIn: () => void;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    record: ClinicalRecord;
    dispatchRecordCommand: (command: ClinicalRecordCommand) => ClinicalRecordCommandResult;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    saveDraft: (reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => void;
    markRecordAsReplaced: () => void;
    defaultDriveFileName: string;
    // Drive context
    apiKey: string;
    isPickerApiReady: boolean;
    fetchDriveFolders: (folderId: string) => void;
    fetchFolderContents: (folderId: string) => void;
    setFolderPath: React.Dispatch<React.SetStateAction<DriveFolder[]>>;
    setFileNameInput: (name: string) => void;
    fileNameInput: string;
    saveFormat: SaveFormat;
    openJsonFileFromDrive: (file: DriveFolder) => Promise<ClinicalRecord | null>;
    saveToDrive: (options: SaveOptions) => Promise<boolean>;
    generatePdf: () => Promise<Blob>;
    storage?: StorageAdapter | null;
    dispatchWorkflow?: React.Dispatch<EditorWorkflowAction>;
}

/**
 * Abstracción de UI para las interacciones con Google Drive.
 * Maneja la visibilidad y el estado de los modales de "Guardar" y "Abrir", 
 * además de la lógica de inicialización del `Google Picker API`.
 * 
 * Centraliza la navegación por carpetas (breadcrumbs) y los callbacks de selección de archivos.
 */
export function useDriveModals({
    isSignedIn,
    handleSignIn,
    showToast,
    record,
    dispatchRecordCommand,
    setHasUnsavedChanges,
    saveDraft,
    markRecordAsReplaced,
    defaultDriveFileName,
    apiKey,
    isPickerApiReady,
    fetchDriveFolders,
    fetchFolderContents,
    setFolderPath,
    setFileNameInput,
    fileNameInput,
    saveFormat,
    openJsonFileFromDrive,
    saveToDrive,
    generatePdf,
    storage = getBrowserStorageAdapter(),
    dispatchWorkflow,
}: UseDriveModalsOptions) {
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);

    const openSaveModal = useCallback(() => {
        if (!isSignedIn) {
            showToast('Por favor, inicie sesión para guardar en Google Drive.', 'warning');
            handleSignIn();
            return;
        }
        setFileNameInput(defaultDriveFileName);
        const path = loadDefaultDriveFolderPath(storage);
        if (path) {
            setFolderPath(path);
            fetchDriveFolders(path[path.length - 1].id);
        } else {
            setFolderPath([getRootDriveFolder()]);
            fetchDriveFolders('root');
        }
        setIsSaveModalOpen(true);
    }, [isSignedIn, showToast, handleSignIn, defaultDriveFileName, setFileNameInput, setFolderPath, fetchDriveFolders, storage]);

    const closeSaveModal = useCallback(() => {
        setIsSaveModalOpen(false);
        setFileNameInput('');
    }, [setFileNameInput]);

    const handleSaveFolderClick = useCallback((folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchDriveFolders(folder.id);
    }, [setFolderPath, fetchDriveFolders]);

    const handleSaveBreadcrumbClick = useCallback((folderId: string, index: number) => {
        setFolderPath(currentPath => currentPath.slice(0, index + 1));
        fetchDriveFolders(folderId);
    }, [setFolderPath, fetchDriveFolders]);

    const handleOpenModalFolderClick = useCallback((folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchFolderContents(folder.id);
    }, [setFolderPath, fetchFolderContents]);

    const handleOpenModalBreadcrumbClick = useCallback((folderId: string, index: number) => {
        setFolderPath(currentPath => currentPath.slice(0, index + 1));
        if (folderId === 'search') return;
        fetchFolderContents(folderId);
    }, [setFolderPath, fetchFolderContents]);

    const handleFileOpen = useCallback(async (file: DriveFolder) => {
        try {
            const importedRecord = await openJsonFileFromDrive(file);
            if (!importedRecord) return;
            dispatchWorkflow?.({ type: 'IMPORT_STARTED' });
            markRecordAsReplaced();
            const result = dispatchRecordCommand({ type: 'replace_record_from_import', value: importedRecord });
            if (!result.ok) {
                dispatchWorkflow?.({ type: 'IMPORT_FAILED', error: result.errors.join('\n') || 'No se pudo abrir el archivo seleccionado.' });
                showToast(result.errors.join('\n') || 'No se pudo abrir el archivo seleccionado.', 'error');
                return;
            }
            setHasUnsavedChanges(false);
            saveDraft('import', result.record);
            dispatchWorkflow?.({ type: 'IMPORT_SUCCEEDED' });
            setIsOpenModalOpen(false);
        } catch (error) {
            dispatchWorkflow?.({ type: 'IMPORT_FAILED', error: buildContextualErrorMessage(`No se pudo abrir "${file.name}"`, error) });
            showToast(buildContextualErrorMessage(`No se pudo abrir "${file.name}"`, error), 'error');
        }
    }, [dispatchRecordCommand, dispatchWorkflow, openJsonFileFromDrive, markRecordAsReplaced, setHasUnsavedChanges, saveDraft, showToast]);

    const handlePickerCallback = useCallback(async (data: GooglePickerCallbackData) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            if (doc) {
                void handleFileOpen({ id: doc.id, name: doc.name || 'Archivo sin nombre' });
            }
        }
    }, [handleFileOpen]);

    const handleOpenFromDrive = useCallback(() => {
        const accessToken = window.gapi.client.getToken()?.access_token;
        if (!accessToken) {
            showToast('Por favor, inicie sesión para continuar.', 'warning');
            handleSignIn();
            return;
        }

        if (!apiKey) {
            setIsOpenModalOpen(true);
            const path = loadDefaultDriveFolderPath(storage);
            if (path) {
                setFolderPath(path);
                fetchFolderContents(path[path.length - 1].id);
            } else {
                setFolderPath([getRootDriveFolder()]);
                fetchFolderContents('root');
            }
            return;
        }

        if (!isPickerApiReady || !window.google?.picker) {
            showToast('La API de Google Picker no está lista. Por favor, espere un momento e intente de nuevo.', 'warning');
            return;
        }

        try {
            const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS).setMimeTypes('application/json');
            const picker = new window.google.picker.PickerBuilder()
                .addView(view)
                .setOAuthToken(accessToken)
                .setDeveloperKey(apiKey)
                .setCallback(handlePickerCallback)
                .build();
            picker.setVisible(true);
        } catch (error) {
            console.error('Picker failed to initialize, falling back to simple picker.', error);
            showToast(buildContextualErrorMessage('No se pudo iniciar el selector visual de Drive', error), 'warning');
            setIsOpenModalOpen(true);
            fetchFolderContents('root');
        }
    }, [apiKey, isPickerApiReady, showToast, handleSignIn, setFolderPath, fetchFolderContents, handlePickerCallback, storage]);

    const handleFinalSave = useCallback(async () => {
        const errors = validateCriticalFields(record);
        if (errors.length) {
            showToast(`No se puede guardar porque:\n- ${errors.join('\n- ')}`, 'error');
            return;
        }

        const defaultBaseName = defaultDriveFileName || 'Registro Clínico';
        const sanitizedInput = fileNameInput.trim().replace(/\.(json|pdf)$/gi, '');
        const baseFileName = sanitizedInput || defaultBaseName;

        try {
            const success = await saveToDrive({
                record,
                baseFileName,
                format: saveFormat,
                generatePdf,
            });
            if (success) {
                closeSaveModal();
            }
        } catch (error) {
            showToast(buildContextualErrorMessage('No se pudo guardar el archivo en Drive', error), 'error');
        }
    }, [record, showToast, defaultDriveFileName, fileNameInput, saveToDrive, saveFormat, generatePdf, closeSaveModal]);

    return {
        isSaveModalOpen,
        isOpenModalOpen,
        setIsOpenModalOpen,
        openSaveModal,
        closeSaveModal,
        handleSaveFolderClick,
        handleSaveBreadcrumbClick,
        handleOpenModalFolderClick,
        handleOpenModalBreadcrumbClick,
        handleFileOpen,
        handleOpenFromDrive,
        handleFinalSave,
    };
}
