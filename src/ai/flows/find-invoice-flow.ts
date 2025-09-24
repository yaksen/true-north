'use server';
/**
 * @fileOverview An AI flow for finding invoices based on natural language queries.
 *
 * - findInvoice - A function that handles the invoice finding process.
 * - FindInvoiceInput - The input type for the findInvoice function.
 * - FindInvoiceOutput - The return type for the findInvoice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { InvoiceStatus } from '@/lib/types';

const FindInvoiceInputSchema = z.object({
  prompt: z.string().describe('Unstructured text containing search criteria for an invoice.'),
  availableLeads: z.array(z.object({ id: z.string(), name: z.string() })).describe('A list of available leads (clients) to filter by.'),
});
export type FindInvoiceInput = z.infer<typeof FindInvoiceInputSchema>;

const FindInvoiceOutputSchema = z.object({
  searchTerm: z.string().optional().describe("A general search term for the invoice number."),
  status: z.enum(['draft', 'sent', 'paid', 'void', 'partial', 'unpaid', 'all']).optional().describe("The specific status of the invoice to filter by."),
  leadId: z.string().optional().describe("The ID of the specific client to filter by."),
}).describe('Structured search criteria extracted from the provided inputs.');
export type FindInvoiceOutput = z.infer<typeof FindInvoiceOutputSchema>;

const prompt = ai.definePrompt({
  name: 'findInvoicePrompt',
  input: { schema: FindInvoiceInputSchema },
  output: { schema: FindInvoiceOutputSchema },
  prompt: `You are an expert at parsing search queries for a CRM's billing section. Your task is to extract search criteria from the provided text to find a specific invoice.

You have the following information to work with:
- A text prompt.
- A list of available leads (clients) with their IDs and names.

Your goal is to populate the output JSON with the following:
1.  'searchTerm': An invoice number (e.g., 'INV-12345').
2.  'status': If the query mentions a status (draft, sent, paid, void, partial, unpaid), set it here.
3.  'leadId': If the query mentions a client that exists in the provided list, set their corresponding ID here.

Analyze all inputs to make the best determination.

Available Leads:
{{#each availableLeads}}
- {{name}} (ID: {{id}})
{{/each}}

[Text Content]
{{{prompt}}}
[End Text Content]

Extract the criteria into the specified JSON format.
`,
});

const findInvoiceFlow = ai.defineFlow(
  {
    name: 'findInvoiceFlow',
    inputSchema: FindInvoiceInputSchema,
    outputSchema: FindInvoiceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return structured output.');
    }
    return output;
  }
);

export async function findInvoice(input: FindInvoiceInput): Promise<FindInvoiceOutput> {
  return await findInvoiceFlow(input);
}
