
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Partner, Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { logActivity } from '@/lib/activity-log';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { v4 as uuidv4 } from 'uuid';

const socialPlatforms = ['LinkedIn', 'Twitter', 'GitHub', 'Facebook', 'Instagram', 'TikTok', 'Website'];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  roleInProject: z.string().min(2, { message: 'Role is required.' }),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  socials: z.array(z.object({
    platform: z.string().min(1, 'Platform is required'),
    url: z.string().url('Must be a valid URL'),
  })).optional(),
  notes: z.string().optional(),
  channelId: z.string().optional(),
});

type PartnerFormValues = z.infer<typeof formSchema>;

interface PartnerFormProps {
  partner?: Partner;
  projectId: string;
  channels: Channel[];
  closeForm: () => void;
}

export function PartnerForm({ partner, projectId, channels, closeForm }: PartnerFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: partner ? {
      ...partner,
      contactName: partner.contactName || '',
      email: partner.email || '',
      phone: partner.phone || '',
      socials: partner.socials || [],
      notes: partner.notes || '',
      channelId: partner.channelId || '',
    } : {
      name: '',
      sku: `PART-${uuidv4().substring(0, 8).toUpperCase()}`,
      roleInProject: '',
      contactName: '',
      email: '',
      phone: '',
      socials: [],
      notes: '',
      channelId: channels[channels.length - 1]?.id || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socials",
  });

  async function onSubmit(data: PartnerFormValues) {
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
      if (partner) {
        const partnerRef = doc(db, 'partners', partner.id);
        await updateDoc(partnerRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'partner_updated' as any, { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Partner updated successfully.' });
      } else {
        await addDoc(collection(db, 'partners'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'partner_created' as any, { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Partner created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting partner form: ", error);
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
                <FormLabel>Partner Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Creative Solutions Inc." {...field} />
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
        <FormField
            control={form.control}
            name="roleInProject"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role in Project</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Marketing, Development" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contact Name (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Alex Doe" {...field} />
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
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. alex@creativesolutions.com" {...field} />
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
                        <FormLabel>Contact Phone</FormLabel>
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

        <FormField
                control={form.control}
                name="channelId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>From</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
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
            
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any notes about this partner..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {partner ? 'Update' : 'Create'} Partner
          </Button>
        </div>
      </form>
    </Form>
  );
}
