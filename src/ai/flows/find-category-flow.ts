'use server';
/**
 * @fileOverview An AI flow for finding categories based on natural language queries.
 *
 * - findCategory - A function that handles the category finding process.
 * - FindCategoryInput - The input type for the findCategory function.
 * - FindCategoryOutput - The return type for the findCategory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindCategoryInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a category.'),
});
export type FindCategoryInput = z.infer<typeof FindCategoryInputSchema>;

const FindCategoryOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across category name and notes."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindCategoryOutput = z.infer<typeof FindCategoryOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findCategoryPrompt',
  input: { schema: FindCategoryInputSchema },
  output: { schema: FindCategoryOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text to find a specific product or service category.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a category name like 'Web' or 'Design').

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format. If the user is just searching, put their query in the searchTerm.
`,
});

const findCategoryFlow = ai.defineFlow(
  {
    name: 'findCategoryFlow',
    inputSchema: FindCategoryInputSchema,
    outputSchema: FindCategoryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findCategory(input: FindCategoryInput): Promise<FindCategoryOutput> {
  return await findCategoryFlow(input);
}
