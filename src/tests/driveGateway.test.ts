import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDriveGateway } from '../services/driveGateway';

const createMockGapi = () => {
    const list = vi.fn();
    const get = vi.fn();
    const create = vi.fn();
    const getToken = vi.fn().mockReturnValue({ access_token: 'token-123' });

    window.gapi = {
        load: vi.fn(),
        client: {
            load: vi.fn(),
            setToken: vi.fn(),
            getToken,
            drive: {
                files: {
                    list,
                    get,
                    create,
                },
            },
        },
    };

    return { list, get, create, getToken };
};

describe('driveGateway', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('lista contenidos de carpeta y mapea archivos de Drive', async () => {
        const { list } = createMockGapi();
        list
            .mockResolvedValueOnce({
                result: { files: [{ id: 'folder-1', name: 'Informes', mimeType: 'application/vnd.google-apps.folder' }] },
            })
            .mockResolvedValueOnce({
                result: { files: [{ id: 'file-1', name: 'registro.json', mimeType: 'application/json', modifiedTime: '2026-03-19T21:00:00.000Z' }] },
            });

        const gateway = createDriveGateway();
        const result = await gateway.listFolderContents('root');

        expect(list).toHaveBeenCalledTimes(2);
        expect(list).toHaveBeenNthCalledWith(1, expect.objectContaining({
            q: "'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            orderBy: 'name',
        }));
        expect(list).toHaveBeenNthCalledWith(2, expect.objectContaining({
            q: "'root' in parents and mimeType='application/json' and trashed=false",
            orderBy: 'name',
        }));
        expect(result).toEqual({
            folders: [{ id: 'folder-1', name: 'Informes', mimeType: 'application/vnd.google-apps.folder', modifiedTime: undefined }],
            files: [{ id: 'file-1', name: 'registro.json', mimeType: 'application/json', modifiedTime: '2026-03-19T21:00:00.000Z' }],
        });
    });

    it('arma la query de búsqueda con escape y filtros de fechas', async () => {
        const { list } = createMockGapi();
        list.mockResolvedValue({ result: { files: [] } });

        const gateway = createDriveGateway();
        await gateway.searchJsonFiles({
            searchTerm: "O'Hara",
            dateFrom: '2026-03-01',
            dateTo: '2026-03-19',
        });

        expect(list).toHaveBeenCalledWith(expect.objectContaining({
            q: "mimeType='application/json' and trashed=false and name contains 'O\\'Hara' and modifiedTime >= '2026-03-01T00:00:00' and modifiedTime <= '2026-03-19T23:59:59'",
            orderBy: 'modifiedTime desc',
        }));
    });

    it('lee y parsea un registro JSON desde Drive', async () => {
        const { get } = createMockGapi();
        get.mockResolvedValue({
            body: JSON.stringify({
                version: 'v14',
                templateId: '2',
                title: 'Importado',
                patientFields: [],
                sections: [],
                medico: '',
                especialidad: '',
            }),
        });

        const gateway = createDriveGateway();
        const record = await gateway.getJsonRecord('file-1');

        expect(get).toHaveBeenCalledWith({ fileId: 'file-1', alt: 'media' });
        expect((record as { title: string }).title).toBe('Importado');
    });

    it('rechaza uploads sin token de acceso', async () => {
        const { getToken } = createMockGapi();
        getToken.mockReturnValue(null);
        const gateway = createDriveGateway();

        await expect(gateway.uploadFile({
            fileName: 'registro.json',
            mimeType: 'application/json',
            content: new Blob(['{}'], { type: 'application/json' }),
            parentId: 'root',
        })).rejects.toThrow('No hay token de acceso');
    });

    it('sube archivos y propaga errores del servidor', async () => {
        createMockGapi();
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'file-1', name: 'registro.json' }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 403 }));
        vi.stubGlobal('fetch', fetchMock);

        const gateway = createDriveGateway();
        const success = await gateway.uploadFile({
            fileName: 'registro.json',
            mimeType: 'application/json',
            content: new Blob(['{}'], { type: 'application/json' }),
            parentId: 'root',
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            expect.objectContaining({
                method: 'POST',
                headers: { Authorization: 'Bearer token-123' },
            }),
        );
        expect(success).toEqual({ id: 'file-1', name: 'registro.json' });

        await expect(gateway.uploadFile({
            fileName: 'registro.json',
            mimeType: 'application/json',
            content: new Blob(['{}'], { type: 'application/json' }),
            parentId: 'root',
        })).rejects.toThrow('Quota exceeded');
    });
});
