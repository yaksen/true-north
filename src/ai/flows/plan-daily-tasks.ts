
'use server';

/**
 * @fileOverview An AI agent that processes a raw task list into a structured daily plan.
 *
 * - planDailyTasks - A function that handles the task planning process.
 * - DailyPlanInput - The input type for the planDailyTasks function.
 * - DailyPlanOutput - The return type for the planDailyTasks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Task, Subtask } from '@/lib/types';

export const DailyPlanInputSchema = z.object({
  rawTasks: z.string().describe('A raw, unstructured list of tasks for the day.'),
});
export type DailyPlanInput = z.infer<typeof DailyPlanInputSchema>;

const SubtaskSchema = z.object({
    id: z.string().optional().describe("A unique identifier for the subtask, preferably a UUID."),
    title: z.string().describe("The title of the subtask."),
    completed: z.boolean().describe("Whether the subtask is completed."),
});

const PlannedTaskSchema = z.object({
    title: z.string().describe("A clear, concise title for the task."),
    description: z.string().optional().describe("A brief description of the task."),
    status: z.enum(['pending', 'in-progress', 'done']).describe("The current status of the task."),
    priority: z.enum(['low', 'medium', 'high']).describe("The priority level of the task."),
    dueDate: z.string().optional().describe("The due date for the task in ISO 8601 format (YYYY-MM-DD), if applicable."),
    subtasks: z.array(SubtaskSchema).optional().describe("A list of subtasks, if any."),
    obstacles: z.array(z.string()).optional().describe("A list of potential obstacles or blockers for completing the task."),
    tips: z.array(z.string()).optional().describe("A list of helpful tips or suggestions for tackling the task efficiently."),
});

export const DailyPlanOutputSchema = z.object({
  plannedTasks: z.array(PlannedTaskSchema).describe('An ordered list of structured tasks.'),
});
export type DailyPlanOutput = z.infer<typeof DailyPlanOutputSchema>;


// The async wrapper function that the UI will call
export async function planDailyTasks(input: DailyPlanInput): Promise<DailyPlanOutput> {
  return planDailyTasksFlow(input);
}


const planDailyTasksPrompt = ai.definePrompt({
    name: 'planDailyTasksPrompt',
    input: { schema: DailyPlanInputSchema },
    output: { schema: DailyPlanOutputSchema },
    prompt: `You are an expert productivity assistant. Your goal is to take a user's raw, unstructured text dump of tasks and transform it into a structured, prioritized, and actionable daily plan.

Analyze the raw task list provided by the user. For each task you identify, you must:
1.  **Structure the Task**: Create a clear, concise title. Determine an appropriate priority (low, medium, high) and status (usually 'pending'). If a due date is mentioned, format it as YYYY-MM-DD.
2.  **Identify Subtasks**: If a task can be broken down into smaller steps, create a list of subtasks. Each subtask needs a title and its completed status should be set to false.
3.  **Identify Obstacles**: Think critically about what might prevent the user from completing the task. List 1-2 potential obstacles.
4.  **Provide Tips**: Offer 1-2 actionable tips or suggestions to help the user complete the task efficiently.
5.  **Order the Plan**: Arrange the final list of structured tasks in a logical and productive order for the day.

Here is the user's raw task list:
{{{rawTasks}}}

Generate a complete, structured daily plan based on this list.
`,
});

const planDailyTasksFlow = ai.defineFlow(
  {
    name: 'planDailyTasksFlow',
    inputSchema: DailyPlanInputSchema,
    outputSchema: DailyPlanOutputSchema,
  },
  async (input) => {
    const { output } = await planDailyTasksPrompt(input);
    return output!;
  }
);
