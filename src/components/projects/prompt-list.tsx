
'use client';

import { AIPrompt } from '@/lib/types';
import { PromptCard } from './prompt-card';

interface PromptListProps {
  prompts: AIPrompt[];
}

export function PromptList({ prompts }: PromptListProps) {
  if (prompts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border border-dashed rounded-xl">
        <p>No AI prompts found. Create your first prompt to get started.</p>
      </div>
    );
  }

  const promptsByCategory = prompts.reduce((acc, prompt) => {
    const category = prompt.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(prompt);
    return acc;
  }, {} as Record<string, AIPrompt[]>);

  return (
    <div className="space-y-6">
      {Object.entries(promptsByCategory).map(([category, prompts]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map(prompt => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
