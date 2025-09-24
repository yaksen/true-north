'use server';
/**
 * @fileOverview An AI flow for finding finance records based on natural language queries.
 *
 * - findFinance - A function that handles the finance record finding process.
 * - FindFinanceInput - The input type for the findFinance function.
 * - FindFinanceOutput - The return type for the findFinance function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FinanceType } from '@/lib/types';

const FindFinanceInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a finance record.'),
});
export type FindFinanceInput = z.infer<typeof FindFinanceInputSchema>;

const FindFinanceOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search (e.g., description)."),
  type: z.enum(['income', 'expense', 'all']).optional().describe("Filter by income or expense."),
  category: z.string().optional().describe("The category to filter by (e.g., Software, Client Payment)."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindFinanceOutput = z.infer<typeof FindFinanceOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findFinancePrompt',
  input: { schema: FindFinanceInputSchema },
  output: { schema: FindFinanceOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM's finance ledger. Your task is to extract search criteria from the provided text to find specific financial records.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword from the description (e.g., 'Client payment', 'Software subscription').
2.  'type': If the query mentions 'income', 'revenue', 'payment', set to 'income'. If it mentions 'expense', 'cost', 'payment out', set to 'expense'.
3.  'category': If a specific category is mentioned, extract it.

Analyze the input to make the best determination.

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findFinanceFlow = ai.defineFlow(
  {
    name: 'findFinanceFlow',
    inputSchema: FindFinanceInputSchema,
    outputSchema: FindFinanceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findFinance(input: FindFinanceInput): Promise<FindFinanceOutput> {
  return await findFinanceFlow(input);
}
