'use server';

/**
 * @fileOverview Generates insights from dashboard summary counts using GenAI.
 *
 * - getDashboardInsights - A function that generates insights from the provided dashboard summary counts.
 * - DashboardSummaryInput - The input type for the getDashboardInsights function.
 * - DashboardSummaryOutput - The return type for the getDashboardInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DashboardSummaryInputSchema = z.object({
  leadCount: z.number().describe('The number of leads.'),
  serviceCount: z.number().describe('The number of services.'),
  categoryCount: z.number().describe('The number of categories.'),
  packageCount: z.number().describe('The number of packages.'),
});

export type DashboardSummaryInput = z.infer<typeof DashboardSummaryInputSchema>;

const DashboardSummaryOutputSchema = z.object({
  insights: z.string().describe('Insights generated from the dashboard summary counts.'),
});

export type DashboardSummaryOutput = z.infer<typeof DashboardSummaryOutputSchema>;

export async function getDashboardInsights(input: DashboardSummaryInput): Promise<DashboardSummaryOutput> {
  return dashboardSummaryInsightsFlow(input);
}

const dashboardSummaryInsightsPrompt = ai.definePrompt({
  name: 'dashboardSummaryInsightsPrompt',
  input: {schema: DashboardSummaryInputSchema},
  output: {schema: DashboardSummaryOutputSchema},
  prompt: `You are an expert CRM data analyst. Analyze the following dashboard summary counts and provide actionable insights and conclusions.

Leads: {{leadCount}}
Services: {{serviceCount}}
Categories: {{categoryCount}}
Packages: {{packageCount}}

Based on these counts, what are the key trends and focus areas? What actionable insights can be drawn from these numbers?`,
});

const dashboardSummaryInsightsFlow = ai.defineFlow(
  {
    name: 'dashboardSummaryInsightsFlow',
    inputSchema: DashboardSummaryInputSchema,
    outputSchema: DashboardSummaryOutputSchema,
  },
  async input => {
    const {output} = await dashboardSummaryInsightsPrompt(input);
    return output!;
  }
);
