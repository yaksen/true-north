
'use server';
/**
 * @fileOverview An AI flow for finding AI prompts based on natural language queries.
 *
 * - findPrompt - A function that handles the prompt finding process.
 * - FindPromptInput - The input type for the findPrompt function.
 * - FindPromptOutput - The return type for the findPromptOutput function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PromptType } from '@/lib/types';

const promptTypes: [PromptType, ...PromptType[]] = ["Content Creation", "Marketing & Ads", "Sales Outreach", "Lead Nurturing", "Customer Support", "Task Automation", "Finance & Reporting", "Research & Insights", "Brainstorming & Idea Generation", "Personal Productivity", "Technical Help & Coding", "Training & Education", "Strategy & Planning"];

const FindPromptInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for an AI prompt.'),
});
export type FindPromptInput = z.infer<typeof FindPromptInputSchema>;

const FindPromptOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term for the prompt title or description."),
  category: z.enum(promptTypes).optional().describe("The category to filter by."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindPromptOutput = z.infer<typeof FindPromptOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findAIPromptPrompt',
  input: { schema: FindPromptInputSchema },
  output: { schema: FindPromptOutputSchema },
  prompt: `You are an expert at parsing search queries for an AI prompt library. Your task is to extract search criteria from the provided text to find specific AI prompts.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword from the title or description (e.g., 'blog post ideas', 'summarize').
2.  'category': If a specific category is mentioned from the available list, extract it. Available categories are: ${promptTypes.join(', ')}.

Analyze the input to make the best determination.

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findPromptFlow = ai.defineFlow(
  {
    name: 'findPromptFlow',
    inputSchema: FindPromptInputSchema,
    outputSchema: FindPromptOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findPrompt(input: FindPromptInput): Promise<FindPromptOutput> {
  return await findPromptFlow(input);
}
