
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TaskTemplate, TaskTemplateSlot, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc, getDocs, where, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ChevronsUpDown, CheckIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';

const slots: TaskTemplateSlot[] = ['morning', 'midday', 'night'];
const days = [
    { id: 0, label: 'S' }, { id: 1, label: 'M' }, { id: 2, label: 'T' }, 
    { id: 3, label: 'W' }, { id: 4, label: 'T' }, { id: 5, label: 'F' }, { id: 6, label: 'S' }
];

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  slot: z.enum(slots),
  daysOfWeek: z.array(z.number()).min(1, 'At least one day must be selected.'),
  assigneeUids: z.array(z.string()).min(1, 'At least one assignee is required.'),
  active: z.boolean().default(true),
});

type TaskTemplateFormValues = z.infer<typeof formSchema>;

interface TaskTemplateFormProps {
  template?: TaskTemplate;
  projectId: string;
  members: string[];
  closeForm: () => void;
}

export function TaskTemplateForm({ template, projectId, members, closeForm }: TaskTemplateFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
  
  useEffect(() => {
    const fetchMembers = async () => {
      if (members.length === 0) return;
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', 'in', members));
      const snapshot = await getDocs(q);
      setMemberProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    };
    fetchMembers();
  }, [members]);

  const form = useForm<TaskTemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: template || {
      title: '',
      description: '',
      slot: 'morning',
      daysOfWeek: [1, 2, 3, 4, 5],
      assigneeUids: [],
      active: true,
    },
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

  const selectedAssignees = form.watch('assigneeUids');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Post daily social media update" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Details about what needs to be done..." {...field} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="slot" render={({ field }) => (<FormItem><FormLabel>Slot</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{slots.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
             <FormField
                control={form.control}
                name="assigneeUids"
                render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Default Assignees</FormLabel>
                        <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}><PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="justify-between">{selectedAssignees.length > 0 ? `${selectedAssignees.length} selected` : "Select assignees..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                        </PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search members..." />
                            <CommandEmpty>No members found.</CommandEmpty>
                            <CommandGroup><ScrollArea className="h-48">{memberProfiles.map((member) => (
                                <CommandItem key={member.id} onSelect={() => {
                                    const currentAssignees = field.value || [];
                                    const newAssignees = currentAssignees.includes(member.id) ? currentAssignees.filter(id => id !== member.id) : [...currentAssignees, member.id];
                                    field.onChange(newAssignees);
                                }}><CheckIcon className={cn("mr-2 h-4 w-4", field.value.includes(member.id) ? "opacity-100" : "opacity-0")} />{member.name || member.email}</CommandItem>
                            ))}</ScrollArea></CommandGroup></Command></PopoverContent></Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="daysOfWeek"
            render={({ field }) => (
                <FormItem><FormLabel>Generation Days</FormLabel>
                <Controller
                    control={form.control}
                    name="daysOfWeek"
                    render={({ field: { onChange, value } }) => (
                        <ToggleGroup type="multiple" value={value.map(String)} onValueChange={(v) => onChange(v.map(Number))} variant="outline" className="justify-start">
                            {days.map(day => (<ToggleGroupItem key={day.id} value={String(day.id)} aria-label={day.label} className="h-9 w-9 p-0">{day.label}</ToggleGroupItem>))}
                        </ToggleGroup>
                    )}
                />
                <FormMessage />
                </FormItem>
            )}
        />
        
         <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5"><FormLabel>Active</FormLabel></div>
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
            )}
        />

        <div className="flex justify-end gap-2">
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
