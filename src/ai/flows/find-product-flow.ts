'use server';
/**
 * @fileOverview An AI flow for finding products based on natural language queries.
 *
 * - findProduct - A function that handles the product finding process.
 * - FindProductInput - The input type for the findProduct function.
 * - FindProductOutput - The return type for the findProduct function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindProductInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a product.'),
  availableCategories: z.array(z.object({ id: z.string(), name: z.string() })).describe('A list of available categories to filter by.'),
});
export type FindProductInput = z.infer<typeof FindProductInputSchema>;

const FindProductOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across product name and notes."),
  categoryId: z.string().optional().describe("The ID of the specific category to filter by."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindProductOutput = z.infer<typeof FindProductOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findProductPrompt',
  input: { schema: FindProductInputSchema },
  output: { schema: FindProductOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text to find a specific product.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a product name).
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

const findProductFlow = ai.defineFlow(
  {
    name: 'findProductFlow',
    inputSchema: FindProductInputSchema,
    outputSchema: FindProductOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findProduct(input: FindProductInput): Promise<FindProductOutput> {
  return await findProductFlow(input);
}
