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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, LeadState } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const leadStates: LeadState[] = ['new', 'contacted', 'interested', 'lost', 'converted'];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  social: z.string().optional(),
  state: z.enum(leadStates),
  notes: z.string().optional(),
});

type LeadFormValues = z.infer<typeof formSchema>;

interface LeadFormProps {
  lead?: Lead;
  closeForm: () => void;
}

export function LeadForm({ lead, closeForm }: LeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: lead?.name ?? '',
      email: lead?.emails?.[0] ?? '',
      phone: lead?.phoneNumbers?.[0] ?? '',
      social: lead?.socials?.[0] ?? '',
      state: lead?.state ?? 'new',
      notes: lead?.notes ?? '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: LeadFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    const leadData = {
        name: values.name,
        emails: values.email ? [values.email] : [],
        phoneNumbers: values.phone ? [values.phone] : [],
        socials: values.social ? [values.social] : [],
        state: values.state,
        notes: values.notes ?? '',
        userId: user.uid,
    };

    try {
        if (lead) {
            const leadRef = doc(db, `users/${user.uid}/leads`, lead.id);
            await updateDoc(leadRef, leadData);
            toast({ title: 'Success', description: 'Lead updated successfully.' });
        } else {
            await addDoc(collection(db, `users/${user.uid}/leads`), {
                ...leadData,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Lead created successfully.' });
        }
        closeForm();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                    <Input placeholder="+1 234 567 890" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="social"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Social Link</FormLabel>
                    <FormControl>
                        <Input placeholder="linkedin.com/in/johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
                <FormItem>
                <FormLabel>State</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select lead state" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {leadStates.map(state => (
                        <SelectItem key={state} value={state} className="capitalize">{state}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Notes about the lead..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {lead ? 'Update' : 'Create'} Lead
            </Button>
        </div>
      </form>
    </Form>
  );
}
