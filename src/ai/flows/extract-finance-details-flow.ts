'use server';
/**
 * @fileOverview An AI flow for extracting finance record details from text.
 *
 * - extractFinanceDetails - A function that handles the finance detail extraction process.
 * - ExtractFinanceDetailsInput - The input type for the extractFinanceDetails function.
 * - ExtractFinanceDetailsOutput - The return type for the extractFinanceDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractFinanceDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing finance record information (e.g., from a receipt, invoice, or note).'),
  imageDataUri: z.string().optional().describe("A photo of a receipt or invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractFinanceDetailsInput = z.infer<typeof ExtractFinanceDetailsInputSchema>;

const ExtractFinanceDetailsOutputSchema = z.object({
    description: z.string().optional().describe("A summary of the transaction."),
    type: z.enum(['income', 'expense']).optional().describe("The type of transaction."),
    amount: z.number().optional().describe("The transaction amount."),
    currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']).optional().describe("The currency of the transaction."),
    date: z.string().optional().describe("The date of the transaction in YYYY-MM-DD format."),
    category: z.string().optional().describe("The category of the transaction (e.g., 'Software', 'Client Payment')."),
}).describe('Structured finance information extracted from the provided text and/or image.');
export type ExtractFinanceDetailsOutput = z.infer<typeof ExtractFinanceDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractFinanceDetailsPrompt',
  input: { schema: ExtractFinanceDetailsInputSchema },
  output: { schema: ExtractFinanceDetailsOutputSchema },
  prompt: `You are an expert data entry assistant specializing in financial records. Your task is to extract transaction details from the provided text and/or image (like a receipt or invoice).

If an image is provided, use it as the primary source. Use the text prompt for additional context.

Extract the transaction description, amount, currency, date, category, and determine if it's an 'income' or 'expense'.

Data:
{{#if imageDataUri}}
[Image Content]
{{media url=imageDataUri}}
[End Image Content]
{{/if}}

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the details into the specified JSON format. If a piece of information is not found, omit the field. For the date, return it in YYYY-MM-DD format.`,
});

const extractFinanceDetailsFlow = ai.defineFlow(
  {
    name: 'extractFinanceDetailsFlow',
    inputSchema: ExtractFinanceDetailsInputSchema,
    outputSchema: ExtractFinanceDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractFinanceDetails(input: ExtractFinanceDetailsInput): Promise<ExtractFinanceDetailsOutput> {
  return await extractFinanceDetailsFlow(input);
}
