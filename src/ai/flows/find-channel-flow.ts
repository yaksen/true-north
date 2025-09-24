'use server';
/**
 * @fileOverview An AI flow for finding channels based on natural language queries.
 *
 * - findChannel - A function that handles the channel finding process.
 * - FindChannelInput - The input type for the findChannel function.
 * - FindChannelOutput - The return type for the findChannel function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ChannelStatus } from '@/lib/types';

const FindChannelInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a channel.'),
});
export type FindChannelInput = z.infer<typeof FindChannelInputSchema>;

const FindChannelOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across all channel fields."),
  status: z.enum(['new', 'active', 'inactive', 'closed', 'all']).optional().describe("The specific status of the channel to filter by."),
  platform: z.string().optional().describe("The platform to filter by (e.g., Instagram, Website)."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindChannelOutput = z.infer<typeof FindChannelOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findChannelPrompt',
  input: { schema: FindChannelInputSchema },
  output: { schema: FindChannelOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text to find a specific marketing channel.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a channel name or URL).
2.  'status': If the query mentions a specific status (new, active, inactive, closed), set it here.
3.  'platform': If the query mentions a platform (e.g., Instagram, Facebook, Website, Referral), set it here.

Analyze the input to make the best determination.

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findChannelFlow = ai.defineFlow(
  {
    name: 'findChannelFlow',
    inputSchema: FindChannelInputSchema,
    outputSchema: FindChannelOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findChannel(input: FindChannelInput): Promise<FindChannelOutput> {
  return await findChannelFlow(input);
}
