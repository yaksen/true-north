'use server';
/**
 * @fileOverview A project-specific AI chatbot flow.
 *
 * - projectChat - A function that handles chat interactions about a project.
 * - ProjectChatInput - The input type for the projectChat function.
 * - ProjectChatOutput - The return type for the projectChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ProjectChatInputSchema = z.object({
  userMessage: z.string().describe("The user's message or question."),
  history: z.any().describe("The chat history."),
  imageDataUri: z.string().optional().describe("An optional image file attached by the user, as a data URI."),
  audioDataUri: z.string().optional().describe("An optional audio file attached by the user, as a data URI."),
  project: z.any().describe('The current project context.'),
  tasks: z.any().describe('A list of all tasks in the project.'),
  finances: z.any().describe('A list of all finance records in the project.'),
  leads: z.any().describe('A list of all leads in the project.'),
  channels: z.any().describe('A list of all channels in the project.'),
  vendors: z.any().describe('A list of all vendors in the project.'),
  partners: z.any().describe('A list of all partners in the project.'),
  services: z.any().describe('A list of all services in the project.'),
  products: z.any().describe('A list of all products in the project.'),
  packages: z.any().describe('A list of all packages in the project.'),
  invoices: z.any().describe('A list of all invoices in the project.'),
  notes: z.any().describe('A list of all AI-accessible notes in the project.'),
});
export type ProjectChatInput = z.infer<typeof ProjectChatInputSchema>;

const ProjectChatOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user's message."),
});
export type ProjectChatOutput = z.infer<typeof ProjectChatOutputSchema>;

const prompt = ai.definePrompt({
  name: 'projectChatPrompt',
  input: { schema: ProjectChatInputSchema },
  output: { schema: ProjectChatOutputSchema },
  prompt: `You are TrueNorth AI, a helpful and friendly project management assistant. Your goal is to answer questions and provide insights about the current project based on the data provided.

You have access to the following data about the project:
- Project Details: {{{project}}}
- Tasks: {{{tasks}}}
- Financial Records: {{{finances}}}
- Leads: {{{leads}}}
- Channels: {{{channels}}}
- Vendors: {{{vendors}}}
- Partners: {{{partners}}}
- Services: {{{services}}}
- Products: {{{products}}}
- Packages: {{{packages}}}
- Invoices: {{{invoices}}}
- Notes: {{{notes}}}

Use the provided chat history for context on the conversation.
- Chat History: {{{history}}}

Analyze the user's message and the provided data to give a relevant and accurate response. If the user asks for information not present in the data, state that you do not have access to that information.

User's message:
"{{{userMessage}}}"

{{#if imageDataUri}}
[Image Content Provided by User]
{{media url=imageDataUri}}
[End Image Content]
{{/if}}

{{#if audioDataUri}}
[Audio Content Provided by User]
{{media url=audioDataUri}}
[End Audio Content]
{{/if}}

Your response should be in clear, easy-to-understand language. Be concise and helpful. Format your response with markdown where appropriate (e.g., lists, bolding).
`,
});

const projectChatFlow = ai.defineFlow(
  {
    name: 'projectChatFlow',
    inputSchema: ProjectChatInputSchema,
    outputSchema: ProjectChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return a valid response.');
    }
    return output;
  }
);

export async function projectChat(
  input: ProjectChatInput
): Promise<ProjectChatOutput> {
  return await projectChatFlow(input);
}
