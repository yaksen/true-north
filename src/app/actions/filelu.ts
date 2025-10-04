
'use server';

import fetch from 'node-fetch';
import FormData from 'form-data';

export async function uploadToFilelu(
  serverFormData: globalThis.FormData
): Promise<{ success: boolean; message: string; url?: string }> {
  const file = serverFormData.get('file') as File;
  const apiKey = serverFormData.get('apiKey') as string;

  if (!file || !apiKey) {
    return { success: false, message: 'Missing file or API key.' };
  }

  try {
    const apiFormData = new FormData();
    const buffer = Buffer.from(await file.arrayBuffer());
    apiFormData.append('file', buffer, file.name);

    const response = await fetch('https://filelu.com/api/v1/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...apiFormData.getHeaders(),
      },
      body: apiFormData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `File.lu API Error: ${response.statusText}`);
    }

    const result = await response.json() as { success: boolean; data: { file: { url: { full: string } } } };

    if (result.success && result.data.file.url.full) {
        return { success: true, message: 'Upload successful!', url: result.data.file.url.full };
    } else {
        throw new Error('File.lu returned success but no URL was found.');
    }

  } catch (error: any) {
    console.error('Filelu upload error:', error);
    return { success: false, message: error.message || 'An unknown error occurred during upload.' };
  }
}
