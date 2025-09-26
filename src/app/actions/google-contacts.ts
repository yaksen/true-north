
'use server';

import { google } from 'googleapis';
import { Lead, Vendor, Partner } from '@/lib/types';

type Contact = Lead | Vendor | Partner;

interface ServerActionResult {
    success: boolean;
    message: string;
    data?: any;
}

// 1. Search for a contact by a query (email or phone)
async function searchContact(query: string, accessToken: string): Promise<any> {
    const people = google.people({ version: 'v1', headers: { 'Authorization': `Bearer ${accessToken}` } });
    
    const response = await people.people.searchContacts({
        query: query,
        readMask: 'emailAddresses,phoneNumbers'
    });

    return response.data.results;
}

// 2. Create a contact
async function createContact(contact: Contact, accessToken: string): Promise<any> {
    const people = google.people({ version: 'v1', headers: { 'Authorization': `Bearer ${accessToken}` } });

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

    const response = await people.people.createContact({
        requestBody: contactData
    });
    
    return response.data;
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
        const displayName = newContact.names?.[0]?.displayName || 'Unknown';
        return { success: true, message: `Contact "${displayName}" created successfully.`, data: newContact };

    } catch (error: any) {
        console.error('Google Contacts API error:', error.response?.data?.error || error.message);
        return { success: false, message: error.response?.data?.error?.message || error.message || "An unknown error occurred." };
    }
}

export async function testGoogleContactsConnection(accessToken: string): Promise<{ success: boolean; message: string; }> {
    try {
        const people = google.people({ version: 'v1', headers: { 'Authorization': `Bearer ${accessToken}` } });

        // A simple read-only operation to test the connection
        const response = await people.people.get({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses',
        });
        
        const name = response.data.names?.[0]?.displayName;

        return { success: true, message: `Successfully connected as ${name}.` };
    } catch (error: any) {
        console.error('Google Contacts connection test error:', error);
        return { success: false, message: error.message || "Failed to connect to Google Contacts." };
    }
}
