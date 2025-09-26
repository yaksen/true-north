'use server';

import { google } from 'googleapis';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const REDIRECT_URI = 'http://localhost:9002';

export async function storeGoogleTokens(
  projectId: string,
  authorizationCode: string,
  scope: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI // This is not used for redirection here, but required for client init
    );

    const { tokens } = await oauth2Client.getToken(authorizationCode);
    const { access_token, refresh_token } = tokens;

    if (!access_token || !refresh_token) {
      throw new Error('Access token or refresh token not found in response.');
    }

    const projectRef = doc(db, 'projects', projectId);
    let updates: any = {};

    if (scope.includes('drive.file')) {
      updates = {
        googleDriveAccessToken: access_token,
        googleDriveRefreshToken: refresh_token,
      };
    } else if (scope.includes('contacts')) {
      updates = {
        googleContactsAccessToken: access_token,
        googleContactsRefreshToken: refresh_token,
      };
    }

    await updateDoc(projectRef, updates);
    return { success: true };
  } catch (error: any) {
    console.error('Error storing Google tokens:', error.message);
    return { success: false, error: 'Failed to retrieve and store tokens.' };
  }
}
