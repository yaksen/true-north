
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findNote, type FindNoteOutput } from '@/ai/flows/find-note-flow';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { NoteType } from '@/lib/types';

const noteTypes: (NoteType | 'all')[] = ["all", "Message Templates", "Meeting Notes", "Ideas & Brainstorms", "Processes & SOPs", "Knowledge Snippets", "AI Prompts Library", "Client/Lead Notes", "Marketing Copy Drafts", "Decision Logs"];


interface NotesToolbarProps {
  onFilterChange: (filters: { searchTerm: string; type: string }) => void;
}

export function NotesToolbar({ onFilterChange }: NotesToolbarProps) {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        searchTerm,
        type: typeFilter,
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, typeFilter, onFilterChange]);
  
  const handleAiSearch = async () => {
    if (!searchTerm) {
      toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
      return;
    }
    setIsProcessing(true);
    try {
      const result: FindNoteOutput = await findNote({ prompt: searchTerm });
      setSearchTerm(result.searchTerm || '');
      // This is a limitation, the AI returns tags but we now have a type.
      // A more advanced implementation would map AI-identified tags/concepts to types.
      // For now, we'll just set the search term.
      toast({ title: 'AI Search Complete', description: 'Search term has been updated.' });
    } catch (error) {
      console.error("AI Search Error:", error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process search query.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
  };

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card w-full">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search notes or ask AI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
            <Button size="sm" onClick={handleAiSearch} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                AI Search
            </Button>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t mt-2 flex-wrap">
            <span className='text-sm font-medium text-muted-foreground'>Filters:</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 h-9 text-sm">
                    <SelectValue placeholder="Filter by type..." />
                </SelectTrigger>
                <SelectContent>
                    {noteTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
            </Button>
        </div>
    </div>
  );
}
