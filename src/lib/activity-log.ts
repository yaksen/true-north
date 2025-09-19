

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { ActivityRecordType } from './types';

export async function logActivity(
    projectId: string,
    type: ActivityRecordType,
    payload: Record<string, any>,
    actorUid: string
) {
    try {
        await addDoc(collection(db, 'records'), {
            projectId,
            type,
            payload,
            actorUid,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        // Optionally, handle or report this error more robustly
    }
}
