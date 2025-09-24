'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findProduct, type FindProductOutput } from '@/ai/flows/find-product-flow';
import type { Category } from '@/lib/types';

interface ProductsToolbarProps {
  categories: Category[];
  onFilterChange: (filters: { categoryId: string; search: string }) => void;
}

export function ProductsToolbar({ categories, onFilterChange }: ProductsToolbarProps) {
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        categoryId,
        search: searchTerm,
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, categoryId, onFilterChange]);
  
  const handleAiSearch = async () => {
    if (!searchTerm) {
        toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
        return;
    }
    setIsProcessing(true);
    
    try {
        const availableCategories = categories.map(c => ({id: c.id, name: c.name}));
        const result: FindProductOutput = await findProduct({ prompt: searchTerm, availableCategories });
        
        setCategoryId(result.categoryId || 'all');
        setSearchTerm(result.searchTerm || '');

        toast({ title: 'AI Search Complete', description: 'Filters have been updated.' });

    } catch (error) {
        console.error("AI Search Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process the search query.' });
    } finally {
        setIsProcessing(false);
    }
  }

  const clearFilters = () => {
    setCategoryId('all');
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search products or ask AI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
            <Button size="sm" onClick={handleAiSearch} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                AI Search
            </Button>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <span className='text-sm font-medium text-muted-foreground'>Filters:</span>
            <Select value={categoryId} onValueChange={(value) => setCategoryId(value)}>
                <SelectTrigger className="w-48 h-9 text-sm">
                    <SelectValue placeholder="Filter by category..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
