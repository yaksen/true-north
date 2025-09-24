'use server';
/**
 * @fileOverview An AI flow for finding partners based on natural language queries.
 *
 * - findPartner - A function that handles the partner finding process.
 * - FindPartnerInput - The input type for the findPartner function.
 * - FindPartnerOutput - The return type for the findPartner function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindPartnerInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a partner.'),
});
export type FindPartnerInput = z.infer<typeof FindPartnerInputSchema>;

const FindPartnerOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across all partner fields (name, contact, notes)."),
  role: z.string().optional().describe("The partner's role in the project to filter by (e.g., Marketing, Development)."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindPartnerOutput = z.infer<typeof FindPartnerOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findPartnerPrompt',
  input: { schema: FindPartnerInputSchema },
  output: { schema: FindPartnerOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text to find a specific business partner.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a company name, contact person).
2.  'role': If the query mentions a specific role (e.g., 'marketing partner', 'development role'), extract it.

Analyze the input to make the best determination.

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findPartnerFlow = ai.defineFlow(
  {
    name: 'findPartnerFlow',
    inputSchema: FindPartnerInputSchema,
    outputSchema: FindPartnerOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findPartner(input: FindPartnerInput): Promise<FindPartnerOutput> {
  return await findPartnerFlow(input);
}
