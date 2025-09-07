
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
import type { Service, Category } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  categoryId: z.string().nonempty({ message: 'Category is required.' }),
  finishingTime: z.string().nonempty({ message: 'Finishing time is required.' }),
  priceLKR: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  priceUSD: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  notes: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
  service?: Service;
  categories: Category[];
  closeForm: () => void;
}

export function ServiceForm({ service, categories, closeForm }: ServiceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: service?.name ?? '',
      categoryId: service?.categoryId ?? '',
      finishingTime: service?.finishingTime ?? '',
      priceLKR: service?.priceLKR ?? 0,
      priceUSD: service?.priceUSD ?? 0,
      notes: service?.notes ?? '',
    },
  });

  async function onSubmit(values: ServiceFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    const serviceData = {
      ...values,
      userId: user.uid,
    };

    try {
      if (service) {
        const serviceRef = doc(db, `users/${user.uid}/services`, service.id);
        await updateDoc(serviceRef, serviceData);
        toast({ title: 'Success', description: 'Service updated successfully.' });
      } else {
        await addDoc(collection(db, `users/${user.uid}/services`), {
          ...serviceData,
          createdAt: serverTimestamp(),
        });
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
                <Input placeholder="e.g. Men's Haircut" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="finishingTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Finishing Time</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 30 minutes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priceLKR"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (LKR)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1500" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priceUSD"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (USD)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5" {...field} />
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
                <Textarea placeholder="Notes about the service..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {service ? 'Update' : 'Create'} Service
          </Button>
        </div>
      </form>
    </Form>
  );
}
