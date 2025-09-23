'use server';
/**
 * @fileOverview An AI flow for extracting service details from text.
 *
 * - extractServiceDetails - A function that handles the service detail extraction process.
 * - ExtractServiceDetailsInput - The input type for the extractServiceDetails function.
 * - ExtractServiceDetailsOutput - The return type for the extractServiceDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractServiceDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing service information.'),
  imageDataUri: z.string().optional().describe("A photo of related materials, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractServiceDetailsInput = z.infer<typeof ExtractServiceDetailsInputSchema>;

const ExtractServiceDetailsOutputSchema = z.object({
    name: z.string().optional().describe("The name of the service (e.g., 'Basic Website Design', 'SEO Consultation')."),
    price: z.number().optional().describe("The price of the service."),
    currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']).optional().describe("The currency of the price."),
    finishTime: z.string().optional().describe("The estimated time to complete the service (e.g., '5 Days', '2 Hours')."),
    notes: z.string().optional().describe("Any additional notes or a detailed description of what the service includes."),
}).describe('Structured service information extracted from the provided text and/or image.');
export type ExtractServiceDetailsOutput = z.infer<typeof ExtractServiceDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractServiceDetailsPrompt',
  input: { schema: ExtractServiceDetailsInputSchema },
  output: { schema: ExtractServiceDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract service information from the provided text and/or image.

If an image is provided, use it as the primary source. Use the text prompt for additional context.

Extract the service name, price, currency, estimated finish time, and any notes or description.

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

const extractServiceDetailsFlow = ai.defineFlow(
  {
    name: 'extractServiceDetailsFlow',
    inputSchema: ExtractServiceDetailsInputSchema,
    outputSchema: ExtractServiceDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractServiceDetails(input: ExtractServiceDetailsInput): Promise<ExtractServiceDetailsOutput> {
  return await extractServiceDetailsFlow(input);
}
