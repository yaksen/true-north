import { config } from 'dotenv';
config();

import { genkit, type GenkitErrorCode } from 'genkit';

import { googleAI } from '@genkit-ai/googleai';

genkit({
  plugins: [googleAI({ apiVersion: 'v1' })],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});