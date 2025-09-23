'use server';
/**
 * @fileOverview An AI flow for extracting product details from text.
 *
 * - extractProductDetails - A function that handles the product detail extraction process.
 * - ExtractProductDetailsInput - The input type for the extractProductDetails function.
 * - ExtractProductDetailsOutput - The return type for the extractProductDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractProductDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing product information.'),
  imageDataUri: z.string().optional().describe("A photo of the product or related materials, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractProductDetailsInput = z.infer<typeof ExtractProductDetailsInputSchema>;

const ExtractProductDetailsOutputSchema = z.object({
    name: z.string().optional().describe("The name of the product (e.g., 'Branded T-Shirt', 'Coffee Mug')."),
    quantity: z.number().optional().describe("The quantity in stock."),
    price: z.number().optional().describe("The price of the product."),
    currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']).optional().describe("The currency of the price."),
    notes: z.string().optional().describe("Any additional notes or a detailed description of the product."),
}).describe('Structured product information extracted from the provided text and/or image.');
export type ExtractProductDetailsOutput = z.infer<typeof ExtractProductDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractProductDetailsPrompt',
  input: { schema: ExtractProductDetailsInputSchema },
  output: { schema: ExtractProductDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract product information from the provided text and/or image.

If an image is provided, use it as the primary source. Use the text prompt for additional context.

Extract the product name, stock quantity, price, currency, and any notes or description.

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

const extractProductDetailsFlow = ai.defineFlow(
  {
    name: 'extractProductDetailsFlow',
    inputSchema: ExtractProductDetailsInputSchema,
    outputSchema: ExtractProductDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractProductDetails(input: ExtractProductDetailsInput): Promise<ExtractProductDetailsOutput> {
  return await extractProductDetailsFlow(input);
}
