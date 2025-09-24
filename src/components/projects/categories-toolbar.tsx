'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findCategory, type FindCategoryOutput } from '@/ai/flows/find-category-flow';

interface CategoriesToolbarProps {
  onFilterChange: (filters: { search: string }) => void;
}

export function CategoriesToolbar({ onFilterChange }: CategoriesToolbarProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        search: searchTerm,
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, onFilterChange]);
  
  const handleAiSearch = async () => {
    if (!searchTerm) {
        toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
        return;
    }
    setIsProcessing(true);
    
    try {
        const result: FindCategoryOutput = await findCategory({ prompt: searchTerm });
        setSearchTerm(result.searchTerm || '');
        toast({ title: 'AI Search Complete', description: 'Filters have been updated.' });

    } catch (error) {
        console.error("AI Search Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process the search query.' });
    } finally {
        setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search categories or ask AI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
            <Button size="sm" onClick={handleAiSearch} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                AI Search
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                Clear
            </Button>
        </div>
    </div>
  );
}
