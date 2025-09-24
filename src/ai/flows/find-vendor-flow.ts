'use server';
/**
 * @fileOverview An AI flow for finding vendors based on natural language queries.
 *
 * - findVendor - A function that handles the vendor finding process.
 * - FindVendorInput - The input type for the findVendor function.
 * - FindVendorOutput - The return type for the findVendor function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindVendorInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a vendor.'),
});
export type FindVendorInput = z.infer<typeof FindVendorInputSchema>;

const FindVendorOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across all vendor fields (name, contact, notes)."),
  serviceType: z.string().optional().describe("The vendor's service type to filter by (e.g., Hosting, Design)."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindVendorOutput = z.infer<typeof FindVendorOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findVendorPrompt',
  input: { schema: FindVendorInputSchema },
  output: { schema: FindVendorOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text to find a specific vendor.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a company name, contact person).
2.  'serviceType': If the query mentions a specific service type (e.g., 'hosting provider', 'design services'), extract it.

Analyze the input to make the best determination.

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findVendorFlow = ai.defineFlow(
  {
    name: 'findVendorFlow',
    inputSchema: FindVendorInputSchema,
    outputSchema: FindVendorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findVendor(input: FindVendorInput): Promise<FindVendorOutput> {
  return await findVendorFlow(input);
}
