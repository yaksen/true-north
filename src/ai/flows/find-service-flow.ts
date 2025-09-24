'use server';
/**
 * @fileOverview An AI flow for finding services based on natural language queries.
 *
 * - findService - A function that handles the service finding process.
 * - FindServiceInput - The input type for the findService function.
 * - FindServiceOutput - The return type for the findService function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindServiceInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a service.'),
  availableCategories: z.array(z.object({ id: z.string(), name: z.string() })).describe('A list of available categories to filter by.'),
});
export type FindServiceInput = z.infer<typeof FindServiceInputSchema>;

const FindServiceOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across service name and notes."),
  categoryId: z.string().optional().describe("The ID of the specific category to filter by."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindServiceOutput = z.infer<typeof FindServiceOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findServicePrompt',
  input: { schema: FindServiceInputSchema },
  output: { schema: FindServiceOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text to find a specific service.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a service name).
2.  'categoryId': If the query mentions a category that exists in the provided list, set its corresponding ID here.

Available Categories:
{{#each availableCategories}}
- {{name}} (ID: {{id}})
{{/each}}

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findServiceFlow = ai.defineFlow(
  {
    name: 'findServiceFlow',
    inputSchema: FindServiceInputSchema,
    outputSchema: FindServiceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findService(input: FindServiceInput): Promise<FindServiceOutput> {
  return await findServiceFlow(input);
}
