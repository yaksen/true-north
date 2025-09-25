'use server';
/**
 * @fileOverview An AI flow for extracting channel details from text.
 *
 * - extractChannelDetails - A function that handles the channel detail extraction process.
 * - ExtractChannelDetailsInput - The input type for the extractChannelDetails function.
 * - ExtractChannelDetailsOutput - The return type for the extractChannelDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ChannelType } from '@/lib/types';

const channelTypes: [ChannelType, ...ChannelType[]] = ['Social', 'Communication', 'Community', 'Money / Business', 'Learning', 'Entertainment', 'Tech / Tools', 'Inspirations', 'Other'];


const ExtractChannelDetailsInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing channel information.'),
  imageDataUri: z.string().optional().describe("A photo of a business card or contact info, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractChannelDetailsInput = z.infer<typeof ExtractChannelDetailsInputSchema>;

const ExtractChannelDetailsOutputSchema = z.object({
  name: z.string().optional().describe("The name of the channel (e.g., 'Company Blog', 'Summer Campaign')."),
  type: z.enum(channelTypes).optional().describe("The type of the channel."),
  url: z.string().optional().describe("The full URL for the channel."),
}).describe('Structured channel information extracted from the provided text and/or image.');
export type ExtractChannelDetailsOutput = z.infer<typeof ExtractChannelDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'extractChannelDetailsPrompt',
  input: { schema: ExtractChannelDetailsInputSchema },
  output: { schema: ExtractChannelDetailsOutputSchema },
  prompt: `You are an expert data entry assistant. Your task is to extract marketing channel information from the provided text and/or image. Identify the channel's name, its type, and its URL.

The available channel types are: ${channelTypes.join(', ')}.

If an image is provided, use it as the primary source. Use the text prompt for additional context.

Extract the details into the specified JSON format. If a piece of information is not found, omit the field.

Data:
{{#if imageDataUri}}
[Image Content]
{{media url=imageDataUri}}
[End Image Content]
{{/if}}

[Text Content]
{{{prompt}}}
[End Text Content]`,
});

const extractChannelDetailsFlow = ai.defineFlow(
  {
    name: 'extractChannelDetailsFlow',
    inputSchema: ExtractChannelDetailsInputSchema,
    outputSchema: ExtractChannelDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function extractChannelDetails(input: ExtractChannelDetailsInput): Promise<ExtractChannelDetailsOutput> {
  return await extractChannelDetailsFlow(input);
}
