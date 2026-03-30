import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDriveOperations } from '../hooks/useDriveOperations';
import type { AppResult, ClinicalRecord, DriveFolder } from '../types';
import type { DriveGateway } from '../infrastructure/drive/driveGateway';

const buildRecord = (): ClinicalRecord => ({
    version: 'v14',
    templateId: '2',
    title: 'Ficha',
    patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' }],
    sections: [],
    medico: '',
    especialidad: '',
});

const ok = <T,>(
    data: T,
    status: Extract<AppResult<T>, { ok: true }>['status'] = 'complete',
): AppResult<T> => ({
    ok: true,
    data,
    status,
});

const buildGateway = (): DriveGateway => ({
    getAccessToken: vi.fn().mockReturnValue('token'),
    listFolders: vi.fn().mockResolvedValue(ok([{ id: 'folder-1', name: 'Informes' }])),
    listFolderContents: vi.fn().mockResolvedValue(ok({
        folders: [{ id: 'folder-1', name: 'Informes' }],
        files: [{ id: 'file-1', name: 'registro.json' }],
    })),
    readJsonRecord: vi.fn().mockResolvedValue(ok(buildRecord())),
    createFolder: vi.fn().mockResolvedValue(ok(undefined)),
    uploadFile: vi.fn().mockResolvedValue(ok({ id: 'file-1', name: 'registro.json' })),
    search: vi.fn().mockResolvedValue(ok({ files: [], partial: false, warnings: [] })),
});

const createParams = (overrides?: Partial<Parameters<typeof useDriveOperations>[0]>) => {
    const driveCacheRef = { current: new Map<string, { folders: DriveFolder[]; files: DriveFolder[]; timestamp: number }>() };
    return {
        showToast: vi.fn(),
        driveGateway: buildGateway(),
        driveCacheRef,
        folderPath: [{ id: 'root', name: 'Mi unidad' }],
        selectedFolderId: 'root',
        newFolderName: 'Nueva carpeta',
        addRecentFile: vi.fn(),
        setDriveFolders: vi.fn(),
        setDriveJsonFiles: vi.fn(),
        setFolderPath: vi.fn(),
        setSelectedFolderId: vi.fn(),
        setNewFolderName: vi.fn(),
        setIsDriveLoading: vi.fn(),
        setIsSaving: vi.fn(),
        ...overrides,
    };
};

describe('useDriveOperations', () => {
    it('usa caché al cargar carpetas y evita llamar de nuevo al gateway', async () => {
        const params = createParams();
        params.driveCacheRef.current.set('folders:root', {
            folders: [{ id: 'cached-folder', name: 'Cache' }],
            files: [],
            timestamp: 1,
        });
        const { result } = renderHook(() => useDriveOperations(params));

        await act(async () => {
            await result.current.fetchDriveFolders('root');
        });

        expect(params.setDriveFolders).toHaveBeenCalledWith([{ id: 'cached-folder', name: 'Cache' }]);
        expect(params.setSelectedFolderId).toHaveBeenCalledWith('root');
        expect(params.driveGateway.listFolders).not.toHaveBeenCalled();
    });

    it('carga contenidos de carpeta, guarda en caché y actualiza estado', async () => {
        const params = createParams();
        const { result } = renderHook(() => useDriveOperations(params));

        await act(async () => {
            await result.current.fetchFolderContents('root');
        });

        expect(params.driveGateway.listFolderContents).toHaveBeenCalledWith('root');
        expect(params.setDriveFolders).toHaveBeenCalledWith([{ id: 'folder-1', name: 'Informes' }]);
        expect(params.setDriveJsonFiles).toHaveBeenCalledWith([{ id: 'file-1', name: 'registro.json' }]);
        expect(params.driveCacheRef.current.get('contents:root')?.files[0]?.id).toBe('file-1');
    });

    it('advierte si se intenta crear carpeta sin nombre', async () => {
        const params = createParams({ newFolderName: '   ' });
        const { result } = renderHook(() => useDriveOperations(params));

        await act(async () => {
            await result.current.handleCreateFolder();
        });

        expect(params.showToast).toHaveBeenCalledWith('Por favor, ingrese un nombre para la nueva carpeta.', 'warning');
        expect(params.driveGateway.createFolder).not.toHaveBeenCalled();
    });

    it('crea la carpeta, limpia el nombre y refresca la carpeta actual', async () => {
        const params = createParams({
            folderPath: [
                { id: 'root', name: 'Mi unidad' },
                { id: 'folder-9', name: 'Paciente' },
            ],
        });
        params.driveCacheRef.current.set('folders:folder-9', { folders: [], files: [], timestamp: 1 });
        params.driveCacheRef.current.set('contents:folder-9', { folders: [], files: [], timestamp: 1 });
        const { result } = renderHook(() => useDriveOperations(params));

        await act(async () => {
            await result.current.handleCreateFolder();
        });

        expect(params.driveGateway.createFolder).toHaveBeenCalledWith('Nueva carpeta', 'folder-9');
        expect(params.setNewFolderName).toHaveBeenCalledWith('');
        expect(params.driveGateway.listFolders).toHaveBeenCalledWith('folder-9');
        expect(params.showToast).toHaveBeenCalledWith('Carpeta creada correctamente.');
    });

    it('abre JSON válido desde Drive y registra recientes', async () => {
        const params = createParams();
        const file = { id: 'file-1', name: 'registro.json' };
        const { result } = renderHook(() => useDriveOperations(params));

        let imported: ClinicalRecord | null = null;
        await act(async () => {
            imported = await result.current.openJsonFileFromDrive(file);
        });

        expect(imported).toEqual(expect.objectContaining({ title: 'Ficha' }));
        expect(params.addRecentFile).toHaveBeenCalledWith(file);
        expect(params.showToast).toHaveBeenCalledWith('Archivo cargado exitosamente desde Google Drive.');
    });

    it('rechaza JSON inválido desde Drive', async () => {
        const invalidRecord = {
            version: 'v14',
            templateId: '2',
            title: 'Ficha',
            patientFields: [{ label: 'Nombre', value: 'Jane', type: 'unsupported' }],
            sections: [],
            medico: '',
            especialidad: '',
        } as unknown as ClinicalRecord;
        const params = createParams({
            driveGateway: {
                ...buildGateway(),
                readJsonRecord: vi.fn().mockResolvedValue(ok(invalidRecord)),
            },
        });
        const file = { id: 'file-1', name: 'registro.json' };
        const { result } = renderHook(() => useDriveOperations(params));

        let imported: ClinicalRecord | null = null;
        await act(async () => {
            imported = await result.current.openJsonFileFromDrive(file);
        });

        expect(imported).toBeNull();
        expect(params.addRecentFile).not.toHaveBeenCalled();
        expect(params.showToast).toHaveBeenCalledWith('El payload clínico no cumple la estructura mínima requerida.', 'error');
    });

    it('guarda dos archivos cuando el formato es both', async () => {
        const params = createParams();
        const { result } = renderHook(() => useDriveOperations(params));
        const generatePdf = vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));

        let saved = false;
        await act(async () => {
            saved = await result.current.saveToDrive({
                record: buildRecord(),
                baseFileName: 'informe',
                format: 'both',
                generatePdf,
            });
        });

        expect(saved).toBe(true);
        expect(params.driveGateway.uploadFile).toHaveBeenCalledTimes(2);
        expect(params.showToast).toHaveBeenCalledWith('Archivos "informe.json" y "informe.pdf" guardados en Google Drive exitosamente.');
    });

    it('reporta error si falla el upload a Drive', async () => {
        const params = createParams({
            driveGateway: {
                ...buildGateway(),
                uploadFile: vi.fn().mockRejectedValue(new Error('fallo remoto')),
            },
        });
        const { result } = renderHook(() => useDriveOperations(params));

        let saved = true;
        await act(async () => {
            saved = await result.current.saveToDrive({
                record: buildRecord(),
                baseFileName: 'informe',
                format: 'json',
                generatePdf: vi.fn(),
            });
        });

        expect(saved).toBe(false);
        expect(params.showToast).toHaveBeenCalledWith(
            'Error al guardar en Google Drive: fallo remoto',
            'error',
        );
    });
});
