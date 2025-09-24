
'use server';
/**
 * @fileOverview An AI flow for finding leads based on natural language queries, images, or audio.
 *
 * - findLead - A function that handles the lead finding process.
 * - FindLeadInput - The input type for the findLead function.
 * - FindLeadOutput - The return type for the findLead function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Channel, LeadStatus } from '@/lib/types';

const FindLeadInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a lead. Can be a name, email, company, or a general description.'),
  imageDataUri: z.string().optional().describe("A photo of a business card or contact info, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  audioDataUri: z.string().optional().describe("An audio recording of lead information, as a data URI that must include a MIME type and use Base64 encoding."),
  fileDataUri: z.string().optional().describe("A file (e.g., txt, pdf) containing lead information, as a data URI."),
  availableChannels: z.array(z.object({ id: z.string(), name: z.string() })).describe('A list of available channels to filter by.'),
});
export type FindLeadInput = z.infer<typeof FindLeadInputSchema>;

const FindLeadOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term extracted from the query. This will be used for a broad text search across all lead fields."),
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'converted', 'all']).optional().describe("The specific status of the lead to filter by."),
  channelId: z.string().optional().describe("The ID of the specific channel to filter by."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindLeadOutput = z.infer<typeof FindLeadOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findLeadPrompt',
  input: { schema: FindLeadInputSchema },
  output: { schema: FindLeadOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM. Your task is to extract search criteria from the provided text, image, audio, or file content to find a specific lead.

You have the following information to work with:
- A text prompt.
- Optionally, an image, audio recording, or a text file. Prioritize these if provided.
- A list of available channels with their IDs and names.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase to use for text search (e.g., a person's name, company name, email).
2.  'status': If the query mentions a specific status (new, contacted, qualified, lost, converted), set it here. Otherwise, omit.
3.  'channelId': If the query mentions a channel that exists in the provided list, set its corresponding ID here. Otherwise, omit.

Analyze all inputs to make the best determination.

Available Channels:
{{#each availableChannels}}
- {{name}} (ID: {{id}})
{{/each}}

Data:
{{#if imageDataUri}}
[Image Content]
{{media url=imageDataUri}}
[End Image Content]
{{/if}}

{{#if audioDataUri}}
[Audio Content]
{{media url=audioDataUri}}
[End Audio Content]
{{/if}}

{{#if fileDataUri}}
[File Content]
{{media url=fileDataUri}}
[End File Content]
{{/if}}

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findLeadFlow = ai.defineFlow(
  {
    name: 'findLeadFlow',
    inputSchema: FindLeadInputSchema,
    outputSchema: FindLeadOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findLead(input: FindLeadInput): Promise<FindLeadOutput> {
  return await findLeadFlow(input);
}
