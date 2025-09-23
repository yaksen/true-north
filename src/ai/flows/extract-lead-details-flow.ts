'use server';
/**
 * @fileOverview An AI flow for extracting lead details from text and images.
 *
 * - extractLeadDetails - A function that handles the lead detail extraction process.
 * - ExtractLeadDetailsInput - The input type for the extractLeadDetails function.
 * - ExtractLeadDetailsOutput - The return type for the extractLeadDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractLeadDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing lead information. Can be from an email, a note, or transcribed from an image.'),
  imageDataUri: z.string().optional().describe("A photo of a business card or contact info, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractLeadDetailsInput = z.infer<typeof ExtractLeadDetailsInputSchema>;

const ExtractLeadDetailsOutputSchema = z.object({
  name: z.string().optional().describe("The full name of the person."),
  email: z.string().optional().describe("The email address of the person."),
  phone: z.string().optional().describe("The phone number of the person."),
  socials: z.array(z.object({
    platform: z.string().describe("The social media platform (e.g., LinkedIn, Twitter, GitHub)."),
    url: z.string().describe("The full URL to the social media profile."),
  })).optional().describe("A list of social media profiles."),
  notes: z.string().optional().describe("Any additional notes or relevant information about the lead."),
}).describe('Structured lead contact information extracted from the provided text and/or image.');
export type ExtractLeadDetailsOutput = z.infer<typeof ExtractLeadDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractLeadDetailsPrompt',
  input: { schema: ExtractLeadDetailsInputSchema },
  output: { schema: ExtractLeadDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract contact information from the provided text and/or image. Identify the person's full name, email address, phone number, and any social media URLs.

If an image is provided, it is likely a business card or screenshot. Prioritize the information from the image if it's available. Use the text prompt for additional context or information that might not be in the image.

Extract all social media links you can find. For each link, identify the platform (e.g., LinkedIn, Twitter, GitHub, Website).

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

const extractLeadDetailsFlow = ai.defineFlow(
  {
    name: 'extractLeadDetailsFlow',
    inputSchema: ExtractLeadDetailsInputSchema,
    outputSchema: ExtractLeadDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractLeadDetails(input: ExtractLeadDetailsInput): Promise<ExtractLeadDetailsOutput> {
  return await extractLeadDetailsFlow(input);
}
