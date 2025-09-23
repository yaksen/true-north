
'use server';

import { Lead } from '@/lib/types';

interface ServerActionResult {
    success: boolean;
    message: string;
    data?: any;
}

// 1. Search for a contact by email or phone
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
        // Use email for query if available, otherwise phone
        const query = lead.email || lead.phone!;
        const searchResults = await searchContact(query, accessToken);

        if (searchResults && searchResults.length > 0) {
            return { success: false, message: 'A contact with this email or phone number already exists.' };
        }
        
        const newContact = await createContact(lead, accessToken);
        return { success: true, message: `Contact "${newContact.names[0].displayName}" created successfully.`, data: newContact };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
