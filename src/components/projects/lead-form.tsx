
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { logActivity } from '@/lib/activity-log';

const leadStatuses = ['new', 'contacted', 'qualified', 'lost', 'converted'] as const;
const socialPlatforms = ['LinkedIn', 'Twitter', 'GitHub', 'Facebook', 'Instagram', 'TikTok', 'Website'];


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  socials: z.array(z.object({
    platform: z.string().min(1, 'Platform is required'),
    url: z.string().url('Must be a valid URL'),
  })).optional(),
  notes: z.string().optional(),
  status: z.enum(leadStatuses),
  channelId: z.string().optional(),
});

type LeadFormValues = z.infer<typeof formSchema>;

interface LeadFormProps {
  lead?: Lead;
  projectId: string;
  channels: Channel[];
  closeForm: () => void;
}

export function LeadForm({ lead, projectId, channels, closeForm }: LeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: lead ? {
        ...lead,
        email: lead.email || '',
        phone: lead.phone || '',
        notes: lead.notes || '',
        socials: lead.socials || [],
        channelId: lead.channelId || '',
    } : {
      name: '',
      email: '',
      phone: '',
      socials: [],
      notes: '',
      status: 'new',
      channelId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socials",
  });

  async function onSubmit(data: LeadFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    const values = {
      ...data,
      channelId: data.channelId === 'none' ? '' : data.channelId,
    };

    try {
      if (lead) {
        const leadRef = doc(db, 'leads', lead.id);
        await updateDoc(leadRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'lead_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Lead updated successfully.' });
      } else {
        await addDoc(collection(db, 'leads'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'lead_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Lead created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting lead form: ", error);
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. john@example.com" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                            <Input placeholder="+1 234 567 890" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div>
            <FormLabel>Social Links</FormLabel>
            <div className="space-y-2 mt-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                         <FormField
                            control={form.control}
                            name={`socials.${index}.platform`}
                            render={({ field }) => (
                                <FormItem className="w-1/3">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Platform" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {socialPlatforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`socials.${index}.url`}
                            render={({ field }) => (
                                <Input {...field} placeholder="URL" className="flex-1"/>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                ))}
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ platform: 'Website', url: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Social Link
                </Button>
            </div>
        </div>
        <div className='grid grid-cols-2 gap-4'>
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            {leadStatuses.map(status => (
                                <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="channelId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>From</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a channel..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {channels.map(channel => (
                                <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>
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
                <Textarea placeholder="Initial notes about the lead..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lead ? 'Update' : 'Create'} Lead
          </Button>
        </div>
      </form>
    </Form>
  );
}
