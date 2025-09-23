'use server';
/**
 * @fileOverview An AI flow for extracting category details from text.
 *
 * - extractCategoryDetails - A function that handles the category detail extraction process.
 * - ExtractCategoryDetailsInput - The input type for the extractCategoryDetails function.
 * - ExtractCategoryDetailsOutput - The return type for the extractCategoryDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractCategoryDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing category information.'),
  imageDataUri: z.string().optional().describe("A photo of related materials, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractCategoryDetailsInput = z.infer<typeof ExtractCategoryDetailsInputSchema>;

const ExtractCategoryDetailsOutputSchema = z.object({
  name: z.string().optional().describe("The name of the category (e.g., 'Web Development', 'Marketing Materials')."),
  notes: z.string().optional().describe("Any additional notes or relevant information about the category."),
}).describe('Structured category information extracted from the provided text and/or image.');
export type ExtractCategoryDetailsOutput = z.infer<typeof ExtractCategoryDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractCategoryDetailsPrompt',
  input: { schema: ExtractCategoryDetailsInputSchema },
  output: { schema: ExtractCategoryDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract service or product category information from the provided text and/or image.

If an image is provided, use it as the primary source. Use the text prompt for additional context.

Extract the details into the specified JSON format. If a piece of information is not found, omit the field.

Data:
{{#if imageDataUri}}
[Image Content]
{{media url=imageDataUri}}
[End Image Content]
{{/if}}

[Text Content]
{{{prompt}}}
[End Text Content]`,
});

const extractCategoryDetailsFlow = ai.defineFlow(
  {
    name: 'extractCategoryDetailsFlow',
    inputSchema: ExtractCategoryDetailsInputSchema,
    outputSchema: ExtractCategoryDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractCategoryDetails(input: ExtractCategoryDetailsInput): Promise<ExtractCategoryDetailsOutput> {
  return await extractCategoryDetailsFlow(input);
}
