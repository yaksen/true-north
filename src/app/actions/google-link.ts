
'use server';

import { google } from 'googleapis';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const REDIRECT_URI = 'https://developers.google.com/oauthplayground'; // This MUST match the one in your Google Cloud Console

export async function storeGoogleTokens(
  projectId: string,
  authorizationCode: string,
  scopes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(authorizationCode);
    const { access_token, refresh_token } = tokens;

    if (!access_token) {
      throw new Error('Access token not found in response.');
    }
     if (!refresh_token) {
      console.warn('Refresh token not found. You may need to re-authenticate later.');
    }

    const projectRef = doc(db, 'projects', projectId);
    let updates: any = {};

    if (scopes.includes('drive.file')) {
      updates.googleDriveAccessToken = access_token;
      if (refresh_token) updates.googleDriveRefreshToken = refresh_token;
    }
    
    if (scopes.includes('contacts')) {
      updates.googleContactsAccessToken = access_token;
      if (refresh_token) updates.googleContactsRefreshToken = refresh_token;
    }

    if (Object.keys(updates).length === 0) {
        return { success: false, error: 'No relevant scopes found to store tokens for.' };
    }

    await updateDoc(projectRef, updates);
    return { success: true };
  } catch (error: any) {
    console.error('Error storing Google tokens:', error.response?.data || error.message);
    return { success: false, error: 'Failed to retrieve and store tokens. Check if the auth code has expired or been used already.' };
  }
}

export async function disconnectGoogle(
    projectId: string,
    service: 'drive' | 'contacts'
): Promise<{ success: boolean; error?: string }> {
    try {
        const projectRef = doc(db, 'projects', projectId);
        let updates: any = {};

        if (service === 'drive') {
            updates = {
                googleDriveAccessToken: null,
                googleDriveRefreshToken: null,
            };
        } else if (service === 'contacts') {
            updates = {
                googleContactsAccessToken: null,
                googleContactsRefreshToken: null,
            };
        }

        await updateDoc(projectRef, updates);
        return { success: true };

    } catch (error: any) {
        console.error('Error disconnecting Google service:', error.message);
        return { success: false, error: 'Failed to disconnect the service.' };
    }
}
