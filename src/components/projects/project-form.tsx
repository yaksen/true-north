
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { logActivity } from '@/lib/activity-log';

const projectStatuses = ['Active', 'Passive', 'Fun', 'Sub'] as const;

const formSchema = z.object({
  name: z.string().min(2, { message: 'Project name must be at least 2 characters.' }),
  description: z.string().optional(),
  emoji: z.string().optional(),
  currency: z.string().nonempty({ message: 'Currency is required.' }),
  private: z.boolean().default(false),
  status: z.enum(projectStatuses),
  parentProjectId: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof formSchema>;

interface ProjectFormProps {
  project?: Project;
  allProjects?: Project[];
  closeForm: () => void;
}

export function ProjectForm({ project, allProjects = [], closeForm }: ProjectFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: project ? {
        ...project,
        parentProjectId: project.parentProjectId || '',
    } : {
      name: '',
      description: '',
      emoji: '💡',
      currency: 'LKR',
      private: false,
      status: 'Active',
      parentProjectId: '',
    },
  });

  const status = form.watch('status');

  async function onSubmit(values: ProjectFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    const dataToSubmit = {
        ...values,
        parentProjectId: values.status === 'Sub' ? values.parentProjectId : '', // Clear parent if not a sub-project
    };

    try {
      if (project) {
        // Update existing project
        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, { ...dataToSubmit, updatedAt: serverTimestamp() });
        await logActivity(project.id, 'project_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Project updated successfully.' });
      } else {
        // Create new project
        const projectData = {
          ...dataToSubmit,
          ownerUid: user.uid,
          members: [user.uid], // Initially, only the creator is a member
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const newProjectRef = await addDoc(collection(db, 'projects'), projectData);
        await logActivity(newProjectRef.id, 'project_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Project created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting project form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-start gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem className="flex-1">
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Q4 Marketing Campaign" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="emoji"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                        <Input placeholder="💡" {...field} className="w-20 text-center text-xl"/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief description of the project goals..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Default Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="LKR">LKR (Sri Lankan Rupee)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        {projectStatuses.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        {status === 'Sub' && (
             <FormField
                control={form.control}
                name="parentProjectId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Main Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select the main project..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            {allProjects
                                .filter(p => p.id !== project?.id) // Prevent self-selection
                                .map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        
        <FormField
            control={form.control}
            name="private"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <FormLabel>Private Project</FormLabel>
                        <FormDescription>
                            Only you and explicitly invited members can see this project.
                        </FormDescription>
                        <FormMessage />
                    </div>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {project ? 'Update' : 'Create'} Project
          </Button>
        </div>
      </form>
    </Form>
  );
}
