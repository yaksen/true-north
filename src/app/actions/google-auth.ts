
'use server';

import { google } from 'googleapis';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { redirect } from 'next/navigation';

const REDIRECT_URI = process.env.NEXT_PUBLIC_URL 
    ? `${process.env.NEXT_PUBLIC_URL}/auth/callback` 
    : 'https://9000-firebase-studio-1757237676924.cluster-bqwaigqtxbeautecnatk4o6ynk.cloudworkstations.dev/auth/callback';


export async function getGoogleAuthUrl(projectId: string, scope: string): Promise<string> {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    const scopes = [
        `https://www.googleapis.com/auth/${scope}`
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state: JSON.stringify({ projectId, scope }),
    });

    return url;
}

export async function getTokensAndStore(code: string, state: string) {
    if (!state) {
        throw new Error("State parameter is missing or invalid.");
    }
    const { projectId, scope } = JSON.parse(state);
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);
        const { access_token, refresh_token } = tokens;

        if (!access_token) {
            throw new Error('Access token not found');
        }

        const projectRef = doc(db, 'projects', projectId);
        let updates: any = {};
        
        if (scope === 'drive.file') {
            updates = {
                googleDriveAccessToken: access_token,
                ...(refresh_token && { googleDriveRefreshToken: refresh_token }),
            };
        } else if (scope === 'contacts') {
             updates = {
                googleContactsAccessToken: access_token,
                ...(refresh_token && { googleContactsRefreshToken: refresh_token }),
            };
        }

        await updateDoc(projectRef, updates);

    } catch (error: any) {
        console.error('Error getting tokens:', error.message);
        throw new Error('Failed to retrieve and store tokens.');
    } finally {
        redirect(`/dashboard/projects/${projectId}/settings`);
    }
}
