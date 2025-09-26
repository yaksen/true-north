
'use server';

import { google } from 'googleapis';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const getOAuth2Client = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google client ID or secret is not configured in environment variables.');
  }

  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://yaksen-crm.firebaseapp.com/auth/callback'
    : 'http://localhost:9002/auth/callback';

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

export async function getGoogleAuthUrl(api: 'drive' | 'contacts', projectId: string): Promise<string> {
  const oauth2Client = getOAuth2Client();

  const scopes = {
    drive: ['https://www.googleapis.com/auth/drive.file'],
    contacts: ['https://www.googleapis.com/auth/contacts'],
  };

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes[api],
    prompt: 'consent',
    state: JSON.stringify({ api, projectId }), // Pass context in state
  });

  return authUrl;
}

export async function getGoogleTokens(code: string, state: string): Promise<{ success: boolean; message: string }> {
  try {
    const { api, projectId } = JSON.parse(state);
    if (!api || !projectId) {
      throw new Error('Invalid state parameter.');
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to retrieve access or refresh token.');
    }
    
    const projectRef = doc(db, 'projects', projectId);
    const updateData: { [key: string]: any } = {
        updatedAt: serverTimestamp(),
    };

    if (api === 'drive') {
        updateData.googleDriveAccessToken = tokens.access_token;
        updateData.googleDriveRefreshToken = tokens.refresh_token;
    } else if (api === 'contacts') {
        updateData.googleContactsAccessToken = tokens.access_token;
        updateData.googleContactsRefreshToken = tokens.refresh_token;
    }

    await updateDoc(projectRef, updateData);

    return { success: true, message: `Successfully connected to Google ${api}. You can now close this tab.` };
  } catch (error: any) {
    console.error('Error getting Google tokens:', error);
    return { success: false, message: error.message || 'An unknown error occurred.' };
  }
}
