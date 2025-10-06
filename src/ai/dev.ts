import { config } from 'dotenv';
config();

import { genkit, type GenkitError } from 'genkit';

import { googleAI } from '@genkit-ai/googleai';

genkit({
  plugins: [googleAI({ apiVersion: 'v1' })],
});