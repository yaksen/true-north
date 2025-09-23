
'use server';
/**
 * @fileOverview An AI flow for extracting task details from text.
 *
 * - extractTaskDetails - A function that handles the task detail extraction process.
 * - ExtractTaskDetailsInput - The input type for the extractTaskDetails function.
 * - ExtractTaskDetailsOutput - The return type for the extractTaskDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractTaskDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing task information.'),
  imageDataUri: z.string().optional().describe("A photo of a note or screenshot, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  audioDataUri: z.string().optional().describe("An audio recording of task information, as a data URI that must include a MIME type and use Base64 encoding."),
});
export type ExtractTaskDetailsInput = z.infer<typeof ExtractTaskDetailsInputSchema>;

const ExtractTaskDetailsOutputSchema = z.object({
    title: z.string().optional().describe("A concise title for the task."),
    description: z.string().optional().describe("A detailed description of the task."),
    dueDate: z.string().optional().describe("The due date for the task in YYYY-MM-DD format."),
    assigneeName: z.string().optional().describe("The name of the person the task is assigned to."),
}).describe('Structured task information extracted from the provided text and/or image.');
export type ExtractTaskDetailsOutput = z.infer<typeof ExtractTaskDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractTaskDetailsPrompt',
  input: { schema: ExtractTaskDetailsInputSchema },
  output: { schema: ExtractTaskDetailsOutputSchema },
  prompt: `You are an expert at parsing unstructured text and images to extract task information.

If an image or audio is provided, use it as the primary source. Use the text prompt for additional context.

Extract the task title, a detailed description, the due date (in YYYY-MM-DD format), and the name of the assignee.

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

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the details into the specified JSON format. If a piece of information is not found, omit the field.`,
});

const extractTaskDetailsFlow = ai.defineFlow(
  {
    name: 'extractTaskDetailsFlow',
    inputSchema: ExtractTaskDetailsInputSchema,
    outputSchema: ExtractTaskDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractTaskDetails(input: ExtractTaskDetailsInput): Promise<ExtractTaskDetailsOutput> {
  return await extractTaskDetailsFlow(input);
}

    