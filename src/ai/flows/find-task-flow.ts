'use server';
/**
 * @fileOverview An AI flow for finding tasks based on natural language queries.
 *
 * - findTask - A function that handles the task finding process.
 * - FindTaskInput - The input type for the findTask function.
 * - FindTaskOutput - The return type for the findTask function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TaskTemplateSlot } from '@/lib/types';

const FindTaskInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for a task.'),
  availableAssignees: z.array(z.object({ uid: z.string(), name: z.string() })).describe('A list of available assignees to filter by.'),
});
export type FindTaskInput = z.infer<typeof FindTaskInputSchema>;

const FindTaskOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term from the task title or description."),
  slot: z.enum(['morning', 'midday', 'night', 'all']).optional().describe("The time slot of the task to filter by."),
  assigneeUid: z.string().optional().describe("The UID of the specific assignee to filter by, based on the provided list."),
  hideCompleted: z.boolean().optional().describe("Set to true if the query implies filtering out completed tasks (e.g., 'show me open tasks', 'what's pending')."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindTaskOutput = z.infer<typeof FindTaskOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findTaskPrompt',
  input: { schema: FindTaskInputSchema },
  output: { schema: FindTaskOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM's task manager. Your task is to extract search criteria from the provided text to find specific tasks.

You have the following information to work with:
- A text prompt.
- A list of available assignees with their UIDs and names.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': A general keyword or phrase from the task title/description.
2.  'slot': If the query mentions a time of day (morning, midday, afternoon, night), set the corresponding slot.
3.  'assigneeUid': If the query mentions an assignee that exists in the provided list, set their corresponding UID.
4.  'hideCompleted': If the query suggests looking for tasks that are not done (e.g., 'show open tasks', 'what is pending', 'outstanding tasks'), set this to true.

Available Assignees:
{{#each availableAssignees}}
- {{name}} (UID: {{uid}})
{{/each}}

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findTaskFlow = ai.defineFlow(
  {
    name: 'findTaskFlow',
    inputSchema: FindTaskInputSchema,
    outputSchema: FindTaskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findTask(input: FindTaskInput): Promise<FindTaskOutput> {
  return await findTaskFlow(input);
}
