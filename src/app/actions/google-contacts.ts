
'use server';

import { Lead } from '@/lib/types';

interface ServerActionResult {
    success: boolean;
    message: string;
    data?: any;
}

// 1. Search for a contact by a query (email or phone)
async function searchContact(query: string, accessToken: string): Promise<any> {
    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=emailAddresses,phoneNumbers`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Contacts search error:', errorData);
        throw new Error(`Failed to search contacts: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.results;
}

// 2. Create a contact
async function createContact(lead: Lead, accessToken: string): Promise<any> {
    const url = 'https://people.googleapis.com/v1/people:createContact';
    
    const contactData = {
        names: [{ givenName: lead.name }],
        ...(lead.email && { emailAddresses: [{ value: lead.email }] }),
        ...(lead.phone && { phoneNumbers: [{ value: lead.phone }] }),
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(contactData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Contacts creation error:', errorData);
        throw new Error(`Failed to create contact: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
}

// Main server action
export async function saveLeadToGoogleContacts(lead: Lead, accessToken: string): Promise<ServerActionResult> {
    if (!lead.email && !lead.phone) {
        return { success: false, message: 'Lead must have an email or phone number to be saved.' };
    }

    try {
        // Always check for phone number first if it exists
        if (lead.phone) {
            const phoneResults = await searchContact(lead.phone, accessToken);
            if (phoneResults && phoneResults.length > 0) {
                return { success: false, message: 'A contact with this phone number already exists.' };
            }
        }
        
        // If phone doesn't exist, check for email if it exists
        if (lead.email) {
            const emailResults = await searchContact(lead.email, accessToken);
            if (emailResults && emailResults.length > 0) {
                return { success: false, message: 'A contact with this email address already exists.' };
            }
        }
        
        // If no contact is found by either, create a new one
        const newContact = await createContact(lead, accessToken);
        return { success: true, message: `Contact "${newContact.names[0].displayName}" created successfully.`, data: newContact };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
