
'use server';

import { z } from 'zod';

const CreateContactInputSchema = z.object({
  accessToken: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

export async function createGoogleContact(input: CreateContactInput) {
  const { accessToken, name, email, phone } = CreateContactInputSchema.parse(input);

  const requestBody = {
    names: [{ givenName: name }],
    emailAddresses: email ? [{ value: email }] : [],
    phoneNumbers: phone ? [{ value: phone }] : [],
  };

  const url = 'https://people.googleapis.com/v1/people:createContact';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Contacts API error:', errorData);
      throw new Error(errorData.error.message || 'Failed to create contact.');
    }

    const newContact = await response.json();
    return newContact;
  } catch (error: any) {
    throw new Error(error.message || 'An unexpected error occurred while creating the contact.');
  }
}
