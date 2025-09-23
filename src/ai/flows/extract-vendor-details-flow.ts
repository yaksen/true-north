'use server';
/**
 * @fileOverview An AI flow for extracting vendor details from text and images.
 *
 * - extractVendorDetails - A function that handles the vendor detail extraction process.
 * - ExtractVendorDetailsInput - The input type for the extractVendorDetails function.
 * - ExtractVendorDetailsOutput - The return type for the extractVendorDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractVendorDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing vendor information. Can be from an email, a note, or transcribed from an image.'),
  imageDataUri: z.string().optional().describe("A photo of a business card or contact info, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractVendorDetailsInput = z.infer<typeof ExtractVendorDetailsInputSchema>;

const ExtractVendorDetailsOutputSchema = z.object({
  name: z.string().optional().describe("The full name of the vendor/company."),
  serviceType: z.string().optional().describe("The type of service the vendor provides (e.g., Hosting, Design, Marketing)."),
  contactName: z.string().optional().describe("The name of the main contact person at the vendor."),
  email: z.string().optional().describe("The email address of the vendor or contact person."),
  phone: z.string().optional().describe("The phone number of the vendor or contact person."),
  socials: z.array(z.object({
    platform: z.string().describe("The social media platform (e.g., LinkedIn, Twitter, Website)."),
    url: z.string().describe("The full URL to the social media profile or website."),
  })).optional().describe("A list of social media profiles or websites."),
  notes: z.string().optional().describe("Any additional notes or relevant information about the vendor."),
}).describe('Structured vendor contact information extracted from the provided text and/or image.');
export type ExtractVendorDetailsOutput = z.infer<typeof ExtractVendorDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractVendorDetailsPrompt',
  input: { schema: ExtractVendorDetailsInputSchema },
  output: { schema: ExtractVendorDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract vendor information from the provided text and/or image. Identify the vendor's name, their service type, a primary contact person's name, email address, phone number, and any social media URLs.

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

const extractVendorDetailsFlow = ai.defineFlow(
  {
    name: 'extractVendorDetailsFlow',
    inputSchema: ExtractVendorDetailsInputSchema,
    outputSchema: ExtractVendorDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractVendorDetails(input: ExtractVendorDetailsInput): Promise<ExtractVendorDetailsOutput> {
  return await extractVendorDetailsFlow(input);
}
