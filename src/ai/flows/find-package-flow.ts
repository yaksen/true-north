'use server';
/**
 * @fileOverview An AI flow for finding packages based on natural language queries.
 *
 * - findPackage - A function that handles the package finding process.
 * - FindPackageInput - The input type for the findPackage function.
 * - FindPackageOutput - The return type for the findPackage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindPackageInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a package.'),
});
export type FindPackageInput = z.infer<typeof FindPackageInputSchema>;

const FindPackageOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across package name and description."),
  type: z.enum(['all', 'custom', 'fixed']).optional().describe("Filter by 'custom' for custom packages or 'fixed' for standard packages."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindPackageOutput = z.infer<typeof FindPackageOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findPackagePrompt',
  input: { schema: FindPackageInputSchema },
  output: { schema: FindPackageOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text to find a specific service package.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a package name or description).
2.  'type': If the query mentions 'custom' or 'bespoke', set this to 'custom'. If it mentions 'standard' or 'fixed', set it to 'fixed'.

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findPackageFlow = ai.defineFlow(
  {
    name: 'findPackageFlow',
    inputSchema: FindPackageInputSchema,
    outputSchema: FindPackageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findPackage(input: FindPackageInput): Promise<FindPackageOutput> {
  return await findPackageFlow(input);
}
