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
  const [noteSearchTerm, setNoteSearchTerm] = useState('');
  const [promptSearchTerm, setPromptSearchTerm] = useState('');

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(noteSearchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(noteSearchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(noteSearchTerm.toLowerCase()))
  );

  const filteredPrompts = aiPrompts.filter(prompt =>
    prompt.title.toLowerCase().includes(promptSearchTerm.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(promptSearchTerm.toLowerCase()) ||
    prompt.category?.toLowerCase().includes(promptSearchTerm.toLowerCase()) ||
    prompt.tags?.some(tag => tag.toLowerCase().includes(promptSearchTerm.toLowerCase()))
  );

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
      </TabsContent>

      <TabsContent value="notes">
        <div className="flex justify-between items-center mb-4">
          <Input 
            placeholder="Search notes..." 
            className="max-w-sm"
            value={noteSearchTerm}
            onChange={(e) => setNoteSearchTerm(e.target.value)}
          />
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
            <Input 
                placeholder="Search prompts..." 
                className="max-w-sm"
                value={promptSearchTerm}
                onChange={(e) => setPromptSearchTerm(e.target.value)}
            />
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
