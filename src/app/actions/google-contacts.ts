
'use server';

import { Lead, Vendor, Partner } from '@/lib/types';

type Contact = Lead | Vendor | Partner;

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
async function createContact(contact: Contact, accessToken: string): Promise<any> {
    const url = 'https://people.googleapis.com/v1/people:createContact';
    
    const contactData = {
        names: [{ givenName: `${contact.name} - ${contact.sku || contact.id}` }],
        ...(contact.email && { emailAddresses: [{ value: contact.email }] }),
        ...(contact.phone && { phoneNumbers: [{ value: contact.phone }] }),
        ...(contact.socials && contact.socials.length > 0 && { 
            urls: contact.socials.map(social => ({ 
                value: social.url, 
                type: social.platform,
                formattedType: social.platform,
            }))
        }),
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
export async function saveContactToGoogle(contact: Contact, accessToken: string): Promise<ServerActionResult> {
    if (!contact.email && !contact.phone) {
        return { success: false, message: 'Contact must have an email or phone number to be saved.' };
    }

    try {
        // Always check for phone number first if it exists
        if (contact.phone) {
            const phoneResults = await searchContact(contact.phone, accessToken);
            if (phoneResults && phoneResults.length > 0) {
                return { success: false, message: 'A contact with this phone number already exists.' };
            }
        }
        
        // If phone doesn't exist, check for email if it exists
        if (contact.email) {
            const emailResults = await searchContact(contact.email, accessToken);
            if (emailResults && emailResults.length > 0) {
                return { success: false, message: 'A contact with this email address already exists.' };
            }
        }
        
        // If no contact is found by either, create a new one
        const newContact = await createContact(contact, accessToken);
        return { success: true, message: `Contact "${newContact.names[0].displayName}" created successfully.`, data: newContact };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
