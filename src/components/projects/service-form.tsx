
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Service, Category, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';
import { CurrencyInput } from '../ui/currency-input';
import { useCurrency } from '@/context/CurrencyContext';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  categoryId: z.string({ required_error: 'Category is required.' }),
  finishTime: z.string().min(1, { message: 'Finish time is required.' }),
  price: z.coerce.number().min(0, { message: 'Price must be non-negative.' }),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  notes: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
  service?: Service;
  project: Project;
  categories: Category[];
  closeForm: () => void;
}

export function ServiceForm({ service, project, categories, closeForm }: ServiceFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: service || {
      name: '',
      categoryId: '',
      finishTime: '',
      price: 0,
      currency: project.currency || (globalCurrency as any) || 'USD',
      notes: '',
    },
  });

  async function onSubmit(values: ServiceFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (service) {
        const serviceRef = doc(db, 'services', service.id);
        await updateDoc(serviceRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(project.id, 'service_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Service updated successfully.' });
      } else {
        await addDoc(collection(db, 'services'), {
          ...values,
          projectId: project.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(project.id, 'service_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Service created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting service form: ", error);
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
              <FormLabel>Service Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Basic Website Design" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='grid grid-cols-2 gap-4'>
            <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="finishTime"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Finish Time</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. 3-5 business days" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Price</FormLabel>
                    <CurrencyInput
                        value={field.value}
                        onValueChange={field.onChange}
                        currency={form.watch('currency')}
                        onCurrencyChange={(value) => form.setValue('currency', value)}
                    />
                    <FormMessage />
                </FormItem>
            )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe what this service includes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {service ? 'Update' : 'Create'} Service
          </Button>
        </div>
      </form>
    </Form>
  );
}
