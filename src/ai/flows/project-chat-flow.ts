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
import {
  Project,
  Task,
  Finance,
  Lead,
  Channel,
  Vendor,
  Partner,
} from '@/lib/types';

const ProjectChatInputSchema = z.object({
  userMessage: z.string().describe('The user\'s message or question about the project.'),
  project: z.custom<Project>().describe('The full project object.'),
  tasks: z.array(z.custom<Task>()).describe('A list of all tasks in the project.'),
  finances: z.array(z.custom<Finance>()).describe('A list of all financial records for the project.'),
  leads: z.array(z.custom<Lead>()).describe('A list of all leads in the project.'),
  channels: z.array(z.custom<Channel>()).describe('A list of all marketing channels for the project.'),
  vendors: z.array(z.custom<Vendor>()).describe('A list of all vendors for the project.'),
  partners: z.array(z.custom<Partner>()).describe('A list of all partners for the project.'),
});
export type ProjectChatInput = z.infer<typeof ProjectChatInputSchema>;

const ProjectChatOutputSchema = z.object({
  response: z.string().describe('The AI\'s response to the user\'s message.'),
});
export type ProjectChatOutput = z.infer<typeof ProjectChatOutputSchema>;

const prompt = ai.definePrompt({
  name: 'projectChatPrompt',
  input: { schema: ProjectChatInputSchema },
  output: { schema: ProjectChatOutputSchema },
  prompt: `You are an expert project management assistant named "TrueNorth AI". Your goal is to answer questions and provide insights about a specific project based on the data provided. Your tone should be helpful, concise, and professional.

You have access to the following data for the project named "{{project.name}}":
- Project Details: {{{json project}}}
- Tasks: {{{json tasks}}}
- Financial Records: {{{json finances}}}
- Leads: {{{json leads}}}
- Marketing Channels: {{{json channels}}}
- Vendors: {{{json vendors}}}
- Partners: {{{json partners}}}

Analyze the user's message and the provided data to give a relevant and accurate response. If the user asks for information not present in the data, state that you do not have access to that information.

User's message:
"{{{userMessage}}}"

Your response should be in clear, easy-to-understand language.
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
