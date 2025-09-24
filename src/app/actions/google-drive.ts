
'use server';

import { google } from 'googleapis';

// Helper function to find a folder by name within a specific parent folder
async function findFolderByName(drive: any, name: string, parentId: string): Promise<string | null> {
    const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    try {
        const res = await drive.files.list({
            q: query,
            fields: 'files(id)',
            spaces: 'drive',
        });
        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
        }
        return null;
    } catch (error) {
        console.error(`Error finding folder "${name}":`, error);
        throw new Error(`Failed to search for folder "${name}".`);
    }
}

// Helper function to create a folder within a specific parent folder
async function createFolder(drive: any, name: string, parentId: string): Promise<string> {
    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
    };
    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        return file.data.id as string;
    } catch (error) {
        console.error(`Error creating folder "${name}":`, error);
        throw new Error(`Failed to create folder "${name}".`);
    }
}

// Recursively finds or creates a folder path and returns the ID of the final folder
async function findOrCreateFolderByPath(drive: any, path: string[], parentId: string = 'root'): Promise<string> {
    let currentParentId = parentId;
    for (const folderName of path) {
        let folderId = await findFolderByName(drive, folderName, currentParentId);
        if (!folderId) {
            folderId = await createFolder(drive, folderName, currentParentId);
        }
        currentParentId = folderId;
    }
    return currentParentId;
}


export async function uploadFileToDrive(
    formData: FormData
): Promise<{ success: boolean; message: string; link?: string }> {

    const file = formData.get('file') as File;
    const accessToken = formData.get('accessToken') as string;
    const folderPath = (formData.get('folderPath') as string).split(',');
    const fileName = formData.get('fileName') as string;

    if (!file || !accessToken || !folderPath || !fileName) {
        return { success: false, message: 'Missing required parameters for upload.' };
    }

    try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        const drive = google.drive({ version: 'v3', auth });

        // 1. Find or create the nested folder structure
        const targetFolderId = await findOrCreateFolderByPath(drive, folderPath);
        if (!targetFolderId) {
            return { success: false, message: 'Failed to create or find the target folder path.' };
        }

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        const media = {
            mimeType: file.type,
            body: file.stream(),
        };

        // 2. Upload the file
        const uploadedFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        const fileId = uploadedFile.data.id;
        if (!fileId) {
            return { success: false, message: 'File upload succeeded but did not return an ID.' };
        }

        // 3. Make the file public
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // 4. Get the web view link
        const fileWithLink = await drive.files.get({
            fileId: fileId,
            fields: 'webViewLink',
        });
        
        return {
            success: true,
            message: 'File uploaded successfully.',
            link: fileWithLink.data.webViewLink || '',
        };

    } catch (error: any) {
        console.error('Full upload error:', error);
        return {
            success: false,
            message: error.message || 'An unknown error occurred during upload.',
        };
    }
}
