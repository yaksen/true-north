
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Lead, Partner, Vendor } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number,
  currency: string,
  options: Intl.NumberFormatOptions = {}
) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    ...options,
  }).format(amount);
}


type Contact = Lead | Vendor | Partner;
type ContactType = 'leads' | 'vendors' | 'partners';

export function exportToGoogleContactsCSV(contacts: Contact[], type: ContactType) {
    const headers = [
        "Name", "Given Name", "Additional Name", "Family Name", "Yomi Name", "Given Name Yomi", 
        "Additional Name Yomi", "Family Name Yomi", "Name Prefix", "Name Suffix", "Initials", 
        "Nickname", "Short Name", "Maiden Name", "Birthday", "Gender", "Location", 
        "Billing Information", "Directory Server", "Mileage", "Occupation", "Hobby", "Sensitivity", 
        "Priority", "Subject", "Notes", "Language", "Photo", "Group Membership", 
        "E-mail 1 - Type", "E-mail 1 - Value", "Phone 1 - Type", "Phone 1 - Value",
        "Organization 1 - Name", "Organization 1 - Title"
    ];

    const csvRows = [headers.join(',')];

    for (const contact of contacts) {
        const formattedName = `${contact.name} - ${contact.id}`;
        const nameParts = contact.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        const notes = contact.notes || '';
        const organization = 'name' in contact ? contact.name : '';
        const title = 'roleInProject' in contact ? contact.roleInProject : ('serviceType' in contact ? contact.serviceType : '');

        const row = [
            `"${formattedName}"`, // Name
            `"${firstName}"`, // Given Name
            "", // Additional Name
            `"${lastName}"`, // Family Name
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", 
            `"${notes}"`, // Notes
            "", "", // Language, Photo
            "* myContacts", // Group Membership
            "Work", // E-mail 1 - Type
            `"${contact.email || ''}"`, // E-mail 1 - Value
            "Work", // Phone 1 - Type
            `"${contact.phone || ''}"`, // Phone 1 - Value
            `"${organization}"`, // Organization 1 - Name
            `"${title}"`, // Organization 1 - Title
        ];
        csvRows.push(row.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `google_contacts_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
