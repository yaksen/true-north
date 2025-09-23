'use server';
/**
 * @fileOverview An AI flow for extracting partner details from text and images.
 *
 * - extractPartnerDetails - A function that handles the partner detail extraction process.
 * - ExtractPartnerDetailsInput - The input type for the extractPartnerDetails function.
 * - ExtractPartnerDetailsOutput - The return type for the extractPartnerDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractPartnerDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing partner information. Can be from an email, a note, or transcribed from an image.'),
  imageDataUri: z.string().optional().describe("A photo of a business card or contact info, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractPartnerDetailsInput = z.infer<typeof ExtractPartnerDetailsInputSchema>;

const ExtractPartnerDetailsOutputSchema = z.object({
  name: z.string().optional().describe("The full name of the partner/company."),
  roleInProject: z.string().optional().describe("The partner's role in the project (e.g., Marketing, Development, Logistics)."),
  contactName: z.string().optional().describe("The name of the main contact person at the partner company."),
  email: z.string().optional().describe("The email address of the partner or contact person."),
  phone: z.string().optional().describe("The phone number of the partner or contact person."),
  socials: z.array(z.object({
    platform: z.string().describe("The social media platform (e.g., LinkedIn, Twitter, Website)."),
    url: z.string().describe("The full URL to the social media profile or website."),
  })).optional().describe("A list of social media profiles or websites."),
  notes: z.string().optional().describe("Any additional notes or relevant information about the partner."),
}).describe('Structured partner contact information extracted from the provided text and/or image.');
export type ExtractPartnerDetailsOutput = z.infer<typeof ExtractPartnerDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractPartnerDetailsPrompt',
  input: { schema: ExtractPartnerDetailsInputSchema },
  output: { schema: ExtractPartnerDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract business partner information from the provided text and/or image. Identify the partner's name, their role in the project, a primary contact person's name, email address, phone number, and any social media URLs.

If an image is provided, it is likely a business card or screenshot. Prioritize the information from the image if it's available. Use the text prompt for additional context.

Extract all social media links and websites you can find. For each link, identify the platform (e.g., LinkedIn, Twitter, Website).

Compile any other relevant information into the 'notes' field.

Data:
{{#if imageDataUri}}
[Image Content]
{{media url=imageDataUri}}
[End Image Content]
{{/if}}

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the details into the specified JSON format. If a piece of information is not found, omit the field.`,
});

const extractPartnerDetailsFlow = ai.defineFlow(
  {
    name: 'extractPartnerDetailsFlow',
    inputSchema: ExtractPartnerDetailsInputSchema,
    outputSchema: ExtractPartnerDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractPartnerDetails(input: ExtractPartnerDetailsInput): Promise<ExtractPartnerDetailsOutput> {
  return await extractPartnerDetailsFlow(input);
}
