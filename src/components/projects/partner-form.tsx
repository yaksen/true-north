
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Partner } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { logActivity } from '@/lib/activity-log';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  roleInProject: z.string().min(2, { message: 'Role is required.' }),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type PartnerFormValues = z.infer<typeof formSchema>;

interface PartnerFormProps {
  partner?: Partner;
  projectId: string;
  closeForm: () => void;
}

export function PartnerForm({ partner, projectId, closeForm }: PartnerFormProps) {
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
      notes: partner.notes || '',
    } : {
      name: '',
      roleInProject: '',
      contactName: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  async function onSubmit(values: PartnerFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

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
        </div>
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
