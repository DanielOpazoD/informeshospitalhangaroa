import type { ClinicalRecord, DriveFolder, GoogleDriveFileResource } from '../types';

export interface DriveSearchFilters {
    searchTerm: string;
    dateFrom: string;
    dateTo: string;
}

export interface DriveGateway {
    getAccessToken: () => string | null;
    listFolders: (folderId: string) => Promise<DriveFolder[]>;
    listJsonFiles: (folderId: string) => Promise<DriveFolder[]>;
    listFolderContents: (folderId: string) => Promise<{ folders: DriveFolder[]; files: DriveFolder[] }>;
    searchJsonFiles: (filters: DriveSearchFilters) => Promise<DriveFolder[]>;
    getFileContent: (fileId: string) => Promise<string>;
    getJsonRecord: (fileId: string) => Promise<ClinicalRecord>;
    createFolder: (name: string, parentId: string) => Promise<void>;
    uploadFile: (params: { fileName: string; mimeType: string; content: Blob; parentId: string }) => Promise<{ id?: string; name?: string }>;
}

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const JSON_FILE_MIME = 'application/json';

const mapDriveFile = (file: GoogleDriveFileResource): DriveFolder => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
});

const buildListQuery = (folderId: string, mimeType: string) =>
    `'${folderId}' in parents and mimeType='${mimeType}' and trashed=false`;

const listFiles = async (query: string, orderBy: string): Promise<DriveFolder[]> => {
    const response = await window.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, modifiedTime)',
        orderBy,
    });

    return (response.result.files || []).map(mapDriveFile);
};

const buildSearchQuery = ({ searchTerm, dateFrom, dateTo }: DriveSearchFilters): string => {
    const qParts = [`mimeType='${JSON_FILE_MIME}'`, 'trashed=false'];
    if (searchTerm) {
        qParts.push(`name contains '${searchTerm.replace(/'/g, "\\'")}'`);
    }
    if (dateFrom) {
        qParts.push(`modifiedTime >= '${dateFrom}T00:00:00'`);
    }
    if (dateTo) {
        qParts.push(`modifiedTime <= '${dateTo}T23:59:59'`);
    }
    return qParts.join(' and ');
};

export const createDriveGateway = (): DriveGateway => {
    const getFileContent = async (fileId: string): Promise<string> => {
        const response = await window.gapi.client.drive.files.get({
            fileId,
            alt: 'media',
        });
        return typeof response.body === 'string' ? response.body : JSON.stringify(response.body ?? '');
    };

    return {
        getAccessToken: () => window.gapi.client.getToken()?.access_token ?? null,
        listFolders: (folderId: string) => listFiles(buildListQuery(folderId, DRIVE_FOLDER_MIME), 'name'),
        listJsonFiles: (folderId: string) => listFiles(buildListQuery(folderId, JSON_FILE_MIME), 'name'),
        listFolderContents: async (folderId: string) => {
        const [folders, files] = await Promise.all([
            listFiles(buildListQuery(folderId, DRIVE_FOLDER_MIME), 'name'),
            listFiles(buildListQuery(folderId, JSON_FILE_MIME), 'name'),
        ]);
        return { folders, files };
        },
        searchJsonFiles: async (filters: DriveSearchFilters) => listFiles(buildSearchQuery(filters), 'modifiedTime desc'),
        getFileContent,
        getJsonRecord: async (fileId: string) => {
            const body = await getFileContent(fileId);
            return JSON.parse(body) as ClinicalRecord;
        },
        createFolder: async (name: string, parentId: string) => {
        await window.gapi.client.drive.files.create({
            resource: {
                name,
                mimeType: DRIVE_FOLDER_MIME,
                parents: [parentId],
            },
        });
        },
        uploadFile: async ({ fileName, mimeType, content, parentId }) => {
        const accessToken = window.gapi.client.getToken()?.access_token;
        if (!accessToken) {
            throw new Error('No hay token de acceso. Por favor, inicie sesión de nuevo.');
        }

        const metadata = { name: fileName, parents: [parentId] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', content);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
        });

        const result = (await response.json().catch(() => ({}))) as { id?: string; name?: string; error?: { message?: string } };
        if (!response.ok) {
            throw new Error(result?.error?.message || `Error del servidor: ${response.status}`);
        }

        return result;
    },
    };
};
