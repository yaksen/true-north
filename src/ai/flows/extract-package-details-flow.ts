'use server';
/**
 * @fileOverview An AI flow for extracting package details from text.
 *
 * - extractPackageDetails - A function that handles the package detail extraction process.
 * - ExtractPackageDetailsInput - The input type for the extractPackageDetails function.
 * - ExtractPackageDetailsOutput - The return type for the extractPackageDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractPackageDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing package information.'),
  imageDataUri: z.string().optional().describe("A photo of related materials, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractPackageDetailsInput = z.infer<typeof ExtractPackageDetailsInputSchema>;

const ExtractPackageDetailsOutputSchema = z.object({
    name: z.string().optional().describe("The name of the package (e.g., 'E-Commerce Starter Kit')."),
    description: z.string().optional().describe("A detailed description of the package."),
    price: z.number().optional().describe("The total price of the package."),
    currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']).optional().describe("The currency of the price."),
    duration: z.string().optional().describe("The estimated time to complete all services in the package (e.g., '30 Days', '2 Weeks')."),
    includedItemsText: z.string().optional().describe("A list or description of the services or products included in the package. The user will select these manually based on this text."),
}).describe('Structured package information extracted from the provided text and/or image.');
export type ExtractPackageDetailsOutput = z.infer<typeof ExtractPackageDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractPackageDetailsPrompt',
  input: { schema: ExtractPackageDetailsInputSchema },
  output: { schema: ExtractPackageDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract service package information from the provided text and/or image.

If an image is provided, use it as the primary source. Use the text prompt for additional context.

Extract the package name, a detailed description, its total price and currency, and the total duration. Also, provide a summary of the included items in the 'includedItemsText' field.

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

const extractPackageDetailsFlow = ai.defineFlow(
  {
    name: 'extractPackageDetailsFlow',
    inputSchema: ExtractPackageDetailsInputSchema,
    outputSchema: ExtractPackageDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractPackageDetails(input: ExtractPackageDetailsInput): Promise<ExtractPackageDetailsOutput> {
  return await extractPackageDetailsFlow(input);
}
