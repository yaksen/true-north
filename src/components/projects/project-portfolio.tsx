

'use client';

import { useState } from 'react';
import type { Project, PortfolioNote, PortfolioItem, Category, Service } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PortfolioNoteForm } from './portfolio-note-form';
import { PlusCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { PortfolioNoteCard } from './portfolio-note-card';

interface ProjectPortfolioProps {
  project: Project;
  portfolioNotes: PortfolioNote[];
  portfolioItems: PortfolioItem[];
  categories: Category[];
  services: Service[];
}

export function ProjectPortfolio({ project, portfolioNotes, portfolioItems, categories, services }: ProjectPortfolioProps) {
    const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);

    return (
        <Card>
            <CardHeader>
                <div className='flex justify-between items-center'>
                    <div>
                        <CardTitle>Project Portfolio</CardTitle>
                        <CardDescription>A collection of samples, mockups, and completed work for this project.</CardDescription>
                    </div>
                    <Dialog open={isNoteFormOpen} onOpenChange={setIsNoteFormOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Portfolio Note</Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-xl'>
                            <DialogHeader><DialogTitle>Create New Portfolio Note</DialogTitle></DialogHeader>
                            <PortfolioNoteForm 
                                projectId={project.id}
                                categories={categories}
                                services={services}
                                closeForm={() => setIsNoteFormOpen(false)} 
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-25rem)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                        {portfolioNotes.map(note => (
                            <PortfolioNoteCard 
                                key={note.id}
                                note={note}
                                project={project}
                                items={portfolioItems.filter(item => item.portfolioNoteId === note.id)}
                                categories={categories}
                                services={services}
                            />
                        ))}
                    </div>
                </ScrollArea>
                 {portfolioNotes.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        <p>No portfolio notes yet. Create one to start adding items.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
