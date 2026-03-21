import { afterEach, describe, expect, it, vi } from 'vitest';

const legacyGateway = {
    getAccessToken: vi.fn(() => 'token-1'),
    listFolders: vi.fn(),
    listJsonFiles: vi.fn(),
    listFolderContents: vi.fn(),
    searchJsonFiles: vi.fn(),
    getFileContent: vi.fn(),
    getJsonRecord: vi.fn(),
    createFolder: vi.fn(),
    uploadFile: vi.fn(),
};

vi.mock('../services/driveGateway', () => ({
    createDriveGateway: () => legacyGateway,
}));

describe('infrastructure drive gateway', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('envuelve la búsqueda por metadata y contenido profundo como Result', async () => {
        const { createDriveGateway } = await import('../infrastructure/drive/driveGateway');
        legacyGateway.searchJsonFiles.mockResolvedValue([
            { id: 'file-1', name: 'uno.json' },
            { id: 'file-2', name: 'dos.json' },
        ]);
        legacyGateway.getFileContent
            .mockResolvedValueOnce('sin match')
            .mockResolvedValueOnce('diagnostico confirmado');

        const gateway = createDriveGateway();
        const result = await gateway.search({
            searchTerm: 'Paciente',
            dateFrom: '',
            dateTo: '',
            contentTerm: 'diagnostico',
        }, 'deepContent');

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.files).toEqual([{ id: 'file-2', name: 'dos.json' }]);
        }
    });

    it('normaliza errores del gateway legacy', async () => {
        const { createDriveGateway } = await import('../infrastructure/drive/driveGateway');
        legacyGateway.listFolders.mockRejectedValue(new Error('boom'));

        const gateway = createDriveGateway();
        const result = await gateway.listFolders('root');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.source).toBe('drive');
            expect(result.error.code).toBe('list_folders');
        }
    });

    it('reintenta operaciones retryable antes de fallar o resolver', async () => {
        const { createDriveGateway } = await import('../infrastructure/drive/driveGateway');
        legacyGateway.listFolders
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce([{ id: 'folder-1', name: 'Informes' }]);

        const gateway = createDriveGateway();
        const result = await gateway.listFolders('root');

        expect(legacyGateway.listFolders).toHaveBeenCalledTimes(2);
        expect(result.ok).toBe(true);
    });
});
