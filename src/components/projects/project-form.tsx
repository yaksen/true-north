
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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

const formSchema = z.object({
  name: z.string().min(2, { message: 'Project name must be at least 2 characters.' }),
  description: z.string().optional(),
  currency: z.string().nonempty({ message: 'Currency is required.' }),
  private: z.boolean().default(false),
  // members field will be handled separately
});

type ProjectFormValues = z.infer<typeof formSchema>;

interface ProjectFormProps {
  project?: Project;
  closeForm: () => void;
}

export function ProjectForm({ project, closeForm }: ProjectFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: project ? {
        name: project.name,
        description: project.description,
        currency: project.currency,
        private: project.private,
    } : {
      name: '',
      description: '',
      currency: 'LKR',
      private: false,
    },
  });

  async function onSubmit(values: ProjectFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      if (project) {
        // Update existing project
        const projectRef = doc(db, `users/${user.uid}/projects`, project.id);
        await updateDoc(projectRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Project updated successfully.' });
      } else {
        // Create new project
        const projectData = {
          ...values,
          ownerUid: user.uid,
          members: [user.uid], // Initially, only the creator is a member
          status: 'Planning',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, `users/${user.uid}/projects`), projectData);
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
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
                name="private"
                render={({ field }) => (
                    <FormItem className="flex flex-col rounded-lg border p-3">
                        <FormLabel className="flex items-center justify-between">
                           <span>Private Project</span>
                           <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormLabel>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        {/* Member management can be added here later */}

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
