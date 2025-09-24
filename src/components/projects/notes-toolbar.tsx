'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findNote, type FindNoteOutput } from '@/ai/flows/find-note-flow';
import { Badge } from '../ui/badge';

interface NotesToolbarProps {
  onFilterChange: (filters: { searchTerm: string; tags: string[] }) => void;
}

export function NotesToolbar({ onFilterChange }: NotesToolbarProps) {
  const { toast } = useToast();
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        searchTerm,
        tags: tagsFilter,
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, tagsFilter, onFilterChange]);
  
  const handleAiSearch = async () => {
    if (!searchTerm) {
      toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
      return;
    }
    setIsProcessing(true);
    try {
      const result: FindNoteOutput = await findNote({ prompt: searchTerm });
      setSearchTerm(result.searchTerm || '');
      setTagsFilter(result.tags || []);
      toast({ title: 'AI Search Complete', description: 'Filters have been updated.' });
    } catch (error) {
      console.error("AI Search Error:", error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process search query.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tagsFilter.includes(tagInput.trim())) {
        setTagsFilter([...tagsFilter, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTagsFilter(tagsFilter.filter(tag => tag !== tagToRemove));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTagsFilter([]);
    setTagInput('');
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
            <div className="flex items-center gap-2 border rounded-md px-2 h-9">
              <Input 
                  placeholder="Filter by tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="h-auto border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
              {tagsFilter.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 rounded-full hover:bg-muted-foreground/20">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
            </Button>
        </div>
    </div>
  );
}
