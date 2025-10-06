

'use client';

import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TaskTemplate, UserProfile, ProjectMember, Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc, getDocs, where, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ChevronsUpDown, CheckIcon, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';

const slots = ['morning', 'midday', 'night'] as const;
const days = [
    { id: 0, label: 'S' }, { id: 1, label: 'M' }, { id: 2, label: 'T' }, 
    { id: 3, label: 'W' }, { id: 4, label: 'T' }, { id: 5, label: 'F' }, { id: 6, label: 'S' }
];

const subTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(2, 'Title is required.'),
  description: z.string().optional(),
  slot: z.enum(slots),
  assigneeUids: z.array(z.string()).min(1, 'At least one assignee is required.'),
  channelIds: z.array(z.string()).optional(),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Template name is required.' }),
  description: z.string().optional(),
  daysOfWeek: z.array(z.number()).min(1, 'At least one day must be selected.'),
  tasks: z.array(subTaskSchema).min(1, 'At least one sub-task is required.'),
});

type TaskTemplateFormValues = z.infer<typeof formSchema>;

interface TaskTemplateFormProps {
  template?: TaskTemplate;
  projectId: string;
  members: ProjectMember[];
  channels: Channel[];
  closeForm: () => void;
}

export function TaskTemplateForm({ template, projectId, members, channels, closeForm }: TaskTemplateFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskTemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: template ? {
        ...template,
        tasks: template.tasks.map(t => ({...t, channelIds: t.channelIds || []}))
    } : {
      name: '',
      description: '',
      daysOfWeek: [1, 2, 3, 4, 5],
      tasks: [
          { id: uuidv4(), title: '', description: '', slot: 'morning', assigneeUids: [], channelIds: [] }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });

  async function onSubmit(values: TaskTemplateFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const dataToSave = { ...values, projectId, updatedAt: serverTimestamp() };
      if (template) {
        const templateRef = doc(db, 'taskTemplates', template.id);
        await updateDoc(templateRef, dataToSave);
        toast({ title: 'Success', description: 'Template updated successfully.' });
      } else {
        await addDoc(collection(db, 'taskTemplates'), { ...dataToSave, createdAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Template created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting template form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className='h-[70vh] p-1'>
            <div className='p-4 space-y-6'>
                <div className="space-y-4 border-b pb-6">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Template Name</FormLabel><FormControl><Input placeholder="e.g., Daily Social Media Routine" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="What is this routine for?" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="daysOfWeek" render={({ field }) => (<FormItem><FormLabel>Generation Days</FormLabel><Controller control={form.control} name="daysOfWeek" render={({ field: { onChange, value } }) => (<ToggleGroup type="multiple" value={value.map(String)} onValueChange={(v) => onChange(v.map(Number))} variant="outline" className="justify-start"><FormMessage />{days.map(day => (<ToggleGroupItem key={day.id} value={String(day.id)} aria-label={day.label} className="h-9 w-9 p-0">{day.label}</ToggleGroupItem>))}</ToggleGroup>)} /><FormMessage /></FormItem>)} />
                </div>
                
                <div className='space-y-4'>
                    <FormLabel>Sub-Tasks</FormLabel>
                    {fields.map((item, index) => (
                        <div key={item.id} className='space-y-4 p-4 border rounded-lg relative'>
                             <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <FormField control={form.control} name={`tasks.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`tasks.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className='grid grid-cols-2 gap-4'>
                                <FormField control={form.control} name={`tasks.${index}.slot`} render={({ field }) => (<FormItem><FormLabel>Slot</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{slots.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`tasks.${index}.channelIds`} render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Channels</FormLabel>
                                        <Popover><PopoverTrigger asChild><Button variant="outline" role="combobox" className="justify-between">{field.value && field.value.length > 0 ? `${field.value.length} selected` : "Select channels..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search channels..." />
                                            <CommandEmpty>No channels found.</CommandEmpty>
                                            <CommandGroup><ScrollArea className="h-48">{channels.map((channel) => (
                                                <CommandItem key={channel.id} onSelect={() => {
                                                    const current = field.value || [];
                                                    const newSelection = current.includes(channel.id) ? current.filter(id => id !== channel.id) : [...current, channel.id];
                                                    field.onChange(newSelection);
                                                }}><CheckIcon className={cn("mr-2 h-4 w-4", field.value?.includes(channel.id) ? "opacity-100" : "opacity-0")} />{channel.name}</CommandItem>
                                            ))}</ScrollArea></CommandGroup></Command></PopoverContent></Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name={`tasks.${index}.assigneeUids`} render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Assignees</FormLabel>
                                    <Popover><PopoverTrigger asChild><Button variant="outline" role="combobox" className="justify-between">{field.value?.length > 0 ? `${field.value.length} selected` : "Select assignees..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search members..." />
                                        <CommandEmpty>No members found.</CommandEmpty>
                                        <CommandGroup><ScrollArea className="h-48">{members.map((member) => (
                                            <CommandItem key={member.uid} onSelect={() => {
                                                const currentAssignees = field.value || [];
                                                const newAssignees = currentAssignees.includes(member.uid) ? currentAssignees.filter(id => id !== member.uid) : [...currentAssignees, member.uid];
                                                field.onChange(newAssignees);
                                            }}><CheckIcon className={cn("mr-2 h-4 w-4", field.value?.includes(member.uid) ? "opacity-100" : "opacity-0")} />{member.displayName || member.email}</CommandItem>
                                        ))}</ScrollArea></CommandGroup></Command></PopoverContent></Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    ))}
                     <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), title: '', description: '', slot: 'morning', assigneeUids: [], channelIds: [] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Sub-Task
                    </Button>
                </div>
            </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? 'Update' : 'Create'} Template
          </Button>
        </div>
      </form>
    </Form>
  );
}
