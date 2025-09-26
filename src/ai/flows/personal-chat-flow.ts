
'use server';
/**
 * @fileOverview A personal AI chatbot flow.
 *
 * - personalChat - A function that handles chat interactions about personal data.
 * - PersonalChatInput - The input type for the personalChat function.
 * - PersonalChatOutput - The return type for the personalChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  VaultItem,
  PersonalWallet,
  WalletTransaction,
  DiaryEntry,
  Task,
  Habit,
  HabitLog,
  PersonalExpense,
} from '@/lib/types';

const PersonalChatInputSchema = z.object({
  userMessage: z.string().describe("The user's message or question."),
  imageDataUri: z.string().optional().describe("An optional image file attached by the user, as a data URI."),
  audioDataUri: z.string().optional().describe("An optional audio file attached by the user, as a data URI."),
  tasks: z.array(z.custom<Task>()).describe('A list of all tasks assigned to the user.'),
  habits: z.array(z.custom<Habit>()).describe('A list of all the user\'s habits.'),
  habitLogs: z.array(z.custom<HabitLog>()).describe('A list of all habit logs for the user.'),
  diaryEntries: z.array(z.custom<DiaryEntry>()).describe('A list of all diary entries for the user.'),
  wallet: z.custom<PersonalWallet>().optional().describe('The user\'s personal wallet object.'),
  walletTransactions: z.array(z.custom<WalletTransaction>()).describe('A list of all transactions in the user\'s wallet.'),
  vaultItems: z.array(z.custom<VaultItem>()).describe('A list of all items in the user\'s personal vault.'),
  personalExpenses: z.array(z.custom<PersonalExpense>()).describe("A list of the user's personal expenses."),
});
export type PersonalChatInput = z.infer<typeof PersonalChatInputSchema>;

const PersonalChatOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user's message."),
});
export type PersonalChatOutput = z.infer<typeof PersonalChatOutputSchema>;

const prompt = ai.definePrompt({
  name: 'personalChatPrompt',
  input: { schema: PersonalChatInputSchema },
  output: { schema: PersonalChatOutputSchema },
  prompt: `You are a helpful and friendly personal assistant AI. Your goal is to answer questions and provide insights about the user's personal data.

You have access to the following data about the user:
- Assigned Tasks: {{{json tasks}}}
- Habits: {{{json habits}}}
- Habit Logs: {{{json habitLogs}}}
- Diary Entries: {{{json diaryEntries}}}
- Personal Wallet: {{{json wallet}}}
- Wallet Transactions: {{{json walletTransactions}}}
- Personal Vault Items: {{{json vaultItems}}}
- Personal Expenses: {{{json personalExpenses}}}

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

Your response should be in clear, easy-to-understand language. Be concise and helpful.
`,
});

const personalChatFlow = ai.defineFlow(
  {
    name: 'personalChatFlow',
    inputSchema: PersonalChatInputSchema,
    outputSchema: PersonalChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The model did not return a valid response.');
    }
    return output;
  }
);

export async function personalChat(
  input: PersonalChatInput
): Promise<PersonalChatOutput> {
  return await personalChatFlow(input);
}
