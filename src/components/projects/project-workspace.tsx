'use client';

import { useState } from 'react';
import type { Project, Note, AIPrompt, Task, Finance, Lead, Channel, Vendor, Partner, Service, Product, Package, Invoice } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NoteList } from './note-list';
import { PromptList } from './prompt-list';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { NoteForm } from './note-form';
import { PromptForm } from './prompt-form';
import { Input } from '../ui/input';
import { ProjectChatbot } from './project-chatbot';
import { Card } from '../ui/card';
import { PromptsToolbar } from './prompts-toolbar';
import { NotesToolbar } from './notes-toolbar';

interface ProjectWorkspaceProps {
  project: Project;
  notes: Note[];
  aiPrompts: AIPrompt[];
  tasks: Task[];
  finances: Finance[];
  leads: Lead[];
  channels: Channel[];
  vendors: Vendor[];
  partners: Partner[];
  services: Service[];
  products: Product[];
  packages: Package[];
  invoices: Invoice[];
}

export function ProjectWorkspace({ 
    project, 
    notes, 
    aiPrompts,
    tasks,
    finances,
    leads,
    channels,
    vendors,
    partners,
    services,
    products,
    packages,
    invoices
}: ProjectWorkspaceProps) {
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [isPromptFormOpen, setIsPromptFormOpen] = useState(false);
  
  const [noteFilters, setNoteFilters] = useState({
    searchTerm: '',
    tags: [] as string[],
  });

  const [promptFilters, setPromptFilters] = useState({
    searchTerm: '',
    category: '',
    tags: [] as string[],
  });

  const filteredNotes = notes.filter(note => {
    const searchTermMatch = note.title.toLowerCase().includes(noteFilters.searchTerm.toLowerCase()) ||
                            note.content.toLowerCase().includes(noteFilters.searchTerm.toLowerCase());
    const tagsMatch = noteFilters.tags.length === 0 || noteFilters.tags.every(filterTag => note.tags.some(noteTag => noteTag.toLowerCase().includes(filterTag.toLowerCase())));
    return searchTermMatch && tagsMatch;
  });

  const filteredPrompts = aiPrompts.filter(prompt => {
    const searchTermMatch = prompt.title.toLowerCase().includes(promptFilters.searchTerm.toLowerCase()) ||
                            (prompt.description && prompt.description.toLowerCase().includes(promptFilters.searchTerm.toLowerCase()));
    const categoryMatch = !promptFilters.category || (prompt.category && prompt.category.toLowerCase().includes(promptFilters.category.toLowerCase()));
    const tagsMatch = promptFilters.tags.length === 0 || promptFilters.tags.every(filterTag => prompt.tags.some(promptTag => promptTag.toLowerCase().includes(filterTag.toLowerCase())));

    return searchTermMatch && categoryMatch && tagsMatch;
  });

  return (
    <Tabs defaultValue="chatbot" className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="ai-prompts">AI Prompts</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="chatbot">
          <Card>
            <ProjectChatbot 
              project={project}
              tasks={tasks}
              finances={finances}
              leads={leads}
              channels={channels}
              vendors={vendors}
              partners={partners}
              services={services}
              products={products}
              packages={packages}
              invoices={invoices}
              notes={notes}
            />
          </Card>
      </TabsContent>

      <TabsContent value="notes">
        <div className="flex justify-between items-center mb-4">
          <NotesToolbar onFilterChange={setNoteFilters} />
          <Dialog open={isNoteFormOpen} onOpenChange={setIsNoteFormOpen}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" /> New Note</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Note</DialogTitle></DialogHeader>
              <NoteForm projectId={project.id} closeForm={() => setIsNoteFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
        <NoteList notes={filteredNotes} />
      </TabsContent>
      
      <TabsContent value="ai-prompts">
        <div className="flex justify-between items-center mb-4">
            <PromptsToolbar onFilterChange={setPromptFilters} />
            <Dialog open={isPromptFormOpen} onOpenChange={setIsPromptFormOpen}>
                <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> New Prompt</Button>
                </DialogTrigger>
                <DialogContent className='max-w-4xl'>
                <DialogHeader><DialogTitle>Create New AI Prompt</DialogTitle></DialogHeader>
                <PromptForm projectId={project.id} closeForm={() => setIsPromptFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
        <PromptList prompts={filteredPrompts} />
      </TabsContent>
    </Tabs>
  );
}
