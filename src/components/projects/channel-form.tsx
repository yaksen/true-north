
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { logActivity } from '@/lib/activity-log';
import { v4 as uuidv4 } from 'uuid';

const channelStatuses = ['new', 'active', 'inactive', 'closed'] as const;
const channelPlatforms = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'Website', 'Referral', 'Other'];


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  platform: z.string().min(1, 'Platform is required'),
  url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(channelStatuses),
});

type ChannelFormValues = z.infer<typeof formSchema>;

interface ChannelFormProps {
  channel?: Channel;
  projectId: string;
  closeForm: () => void;
}

export function ChannelForm({ channel, projectId, closeForm }: ChannelFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: channel ? {
        ...channel,
        url: channel.url || '',
        notes: channel.notes || '',
    } : {
      name: '',
      sku: `CHAN-${uuidv4().substring(0, 8).toUpperCase()}`,
      platform: 'Website',
      url: '',
      notes: '',
      status: 'new',
    },
  });

  async function onSubmit(values: ChannelFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      if (channel) {
        const channelRef = doc(db, 'channels', channel.id);
        await updateDoc(channelRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'channel_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Channel updated successfully.' });
      } else {
        await addDoc(collection(db, 'channels'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'channel_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Channel created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting channel form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Channel Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Summer Campaign Website" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                        <Input placeholder="Auto-generated SKU" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Platform" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {channelPlatforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        {channelStatuses.map(status => (
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Internal notes about the channel..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {channel ? 'Update' : 'Create'} Channel
          </Button>
        </div>
      </form>
    </Form>
  );
}
