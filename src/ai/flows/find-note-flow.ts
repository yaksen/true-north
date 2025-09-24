'use server';
/**
 * @fileOverview An AI flow for finding notes based on natural language queries.
 *
 * - findNote - A function that handles the note finding process.
 * - FindNoteInput - The input type for the findNote function.
 * - FindNoteOutput - The return type for the findNote function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindNoteInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a note.'),
});
export type FindNoteInput = z.infer<typeof FindNoteInputSchema>;

const FindNoteOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term for the note title or content."),
  tags: z.array(z.string()).optional().describe("A list of tags to filter by."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindNoteOutput = z.infer<typeof FindNoteOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findNotePrompt',
  input: { schema: FindNoteInputSchema },
  output: { schema: FindNoteOutputSchema },
  prompt: `You are an expert at parsing search queries for a note-taking application. Your task is to extract search criteria from the provided text to find specific notes.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword from the title or content.
2.  'tags': Extract any terms that seem like tags for filtering (e.g., #idea, @meeting).

Analyze the input to make the best determination.

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findNoteFlow = ai.defineFlow(
  {
    name: 'findNoteFlow',
    inputSchema: FindNoteInputSchema,
    outputSchema: FindNoteOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findNote(input: FindNoteInput): Promise<FindNoteOutput> {
  return await findNoteFlow(input);
}
