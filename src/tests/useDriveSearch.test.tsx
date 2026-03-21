import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDriveSearch } from '../hooks/useDriveSearch';
import type { DriveGateway } from '../infrastructure/drive/driveGateway';
import type { AppResult, DriveFolder, DriveSearchResult } from '../types';

const createParams = (overrides?: Partial<Parameters<typeof useDriveSearch>[0]>) => ({
    setIsDriveLoading: vi.fn(),
    setDriveFolders: vi.fn(),
    setDriveJsonFiles: vi.fn(),
    setFolderPath: vi.fn(),
    showToast: vi.fn(),
    driveCacheRef: { current: new Map<string, { folders: never[]; files: Array<{ id: string; name: string }>; timestamp: number }>() },
    fetchFolderContents: vi.fn().mockResolvedValue(undefined),
    driveGateway: buildGateway(),
    ...overrides,
});

const ok = <T,>(
    data: T,
    status: Extract<AppResult<T>, { ok: true }>['status'] = 'complete',
): AppResult<T> => ({
    ok: true,
    data,
    status,
});

const buildGateway = (overrides?: Partial<DriveGateway>): DriveGateway => ({
    getAccessToken: vi.fn(),
    listFolders: vi.fn().mockResolvedValue(ok<DriveFolder[]>([])),
    listFolderContents: vi.fn().mockResolvedValue(ok({ folders: [], files: [] })),
    readJsonRecord: vi.fn().mockResolvedValue(ok({})),
    createFolder: vi.fn().mockResolvedValue(ok(undefined)),
    uploadFile: vi.fn().mockResolvedValue(ok({ id: 'file-1', name: 'registro.json' })),
    search: vi.fn().mockResolvedValue(ok<DriveSearchResult>({ files: [], partial: false, warnings: [] })),
    ...overrides,
});

describe('useDriveSearch', () => {
    it('advierte cuando no hay criterios de búsqueda', async () => {
        const params = createParams();
        const { result } = renderHook(() => useDriveSearch(params));

        await act(async () => {
            await result.current.handleSearchInDrive();
        });

        expect(params.showToast).toHaveBeenCalledWith('Ingrese algún criterio de búsqueda.', 'warning');
        expect(params.driveGateway.search).not.toHaveBeenCalled();
    });

    it('usa resultados cacheados cuando el TTL sigue vigente', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(10_000);
        const params = createParams();
        params.driveCacheRef.current.set('search:metadata:jane|2026-03-01|2026-03-19|dx', {
            folders: [],
            files: [{ id: 'cached-1', name: 'cache.json' }],
            timestamp: 10_000,
        });
        const { result } = renderHook(() => useDriveSearch(params));

        act(() => {
            result.current.setDriveSearchTerm('Jane');
            result.current.setDriveDateFrom('2026-03-01');
            result.current.setDriveDateTo('2026-03-19');
            result.current.setDriveContentTerm('dx');
        });

        await act(async () => {
            await result.current.handleSearchInDrive();
        });

        expect(params.driveGateway.search).not.toHaveBeenCalled();
        expect(params.setDriveFolders).toHaveBeenCalledWith([]);
        expect(params.setDriveJsonFiles).toHaveBeenCalledWith([{ id: 'cached-1', name: 'cache.json' }]);
        expect(params.setFolderPath).toHaveBeenCalledWith([{ id: 'search', name: 'Resultados de búsqueda' }]);
        expect(params.showToast).toHaveBeenCalledWith('Se encontraron 1 archivo(s).');
    });

    it('filtra por contenido y cachea los resultados nuevos', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(20_000);
        const params = createParams({
            driveGateway: buildGateway({
                search: vi.fn().mockResolvedValue(ok<DriveSearchResult>({
                    files: [{ id: 'file-2', name: 'dos.json' }],
                    partial: false,
                    warnings: [],
                })),
            }),
        });
        const { result } = renderHook(() => useDriveSearch(params));

        act(() => {
            result.current.setDriveSearchTerm('Paciente');
            result.current.setDriveSearchMode('deepContent');
            result.current.setDriveContentTerm('diagnostico');
        });

        await act(async () => {
            await result.current.handleSearchInDrive();
        });

        expect(params.driveGateway.search).toHaveBeenCalledWith({
            searchTerm: 'Paciente',
            dateFrom: '',
            dateTo: '',
            contentTerm: 'diagnostico',
        }, 'deepContent', expect.any(Object));
        expect(params.setDriveJsonFiles).toHaveBeenCalledWith([{ id: 'file-2', name: 'dos.json' }]);
        expect(params.driveCacheRef.current.get('search:deepContent:paciente|||diagnostico')?.files).toEqual([{ id: 'file-2', name: 'dos.json' }]);
        expect(params.showToast).toHaveBeenCalledWith('Se encontraron 1 archivo(s).');
    });

    it('propaga errores de búsqueda con mensaje contextual', async () => {
        const params = createParams({
            driveGateway: buildGateway({
                search: vi.fn().mockRejectedValue({ status: 403 }),
            }),
        });
        const { result } = renderHook(() => useDriveSearch(params));

        act(() => {
            result.current.setDriveSearchTerm('Paciente');
        });

        await act(async () => {
            await result.current.handleSearchInDrive();
        });

        expect(params.showToast).toHaveBeenCalledWith(
            'No se pudo completar la búsqueda en Drive: No tiene permisos suficientes para esta operación en Drive.',
            'error',
        );
    });

    it('expone estado parcial del job cuando el gateway devuelve búsqueda parcial', async () => {
        const params = createParams({
            driveGateway: buildGateway({
                search: vi.fn().mockResolvedValue({
                    ok: true,
                    status: 'partial',
                    data: {
                        files: [{ id: 'file-1', name: 'uno.json' }],
                        partial: true,
                        warnings: ['Tiempo agotado'],
                    },
                    warnings: ['Tiempo agotado'],
                }),
            }),
        });
        const { result } = renderHook(() => useDriveSearch(params));

        act(() => {
            result.current.setDriveSearchTerm('Paciente');
            result.current.setDriveSearchMode('deepContent');
        });

        await act(async () => {
            await result.current.handleSearchInDrive();
        });

        expect(result.current.driveSearchJob.status).toBe('partial');
        expect(result.current.isDriveSearchPartial).toBe(true);
        expect(params.showToast).toHaveBeenCalledWith('Se encontraron 1 archivo(s). Resultado parcial.');
    });

    it('limpia criterios y vuelve a la carpeta raíz', async () => {
        const params = createParams();
        const { result } = renderHook(() => useDriveSearch(params));

        act(() => {
            result.current.setDriveSearchTerm('Paciente');
            result.current.setDriveDateFrom('2026-03-01');
            result.current.setDriveDateTo('2026-03-19');
            result.current.setDriveContentTerm('dx');
            result.current.setDriveSearchMode('deepContent');
        });

        act(() => {
            result.current.clearDriveSearch();
        });

        expect(result.current.driveSearchTerm).toBe('');
        expect(result.current.driveDateFrom).toBe('');
        expect(result.current.driveDateTo).toBe('');
        expect(result.current.driveContentTerm).toBe('');
        expect(result.current.driveSearchWarnings).toEqual([]);
        expect(result.current.isDriveSearchPartial).toBe(false);
        expect(params.setFolderPath).toHaveBeenCalledWith([{ id: 'root', name: 'Mi unidad' }]);
        expect(params.fetchFolderContents).toHaveBeenCalledWith('root');
    });
});
