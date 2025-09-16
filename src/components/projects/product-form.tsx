
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Product, Category, Project } from '@/lib/types';
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
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  categoryId: z.string({ required_error: 'Category is required.' }),
  quantity: z.coerce.number().min(0, { message: 'Quantity must be non-negative.' }),
  price: z.coerce.number().min(0, { message: 'Price must be non-negative.' }),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product?: Product;
  project?: Project;
  categories: Category[];
  closeForm: () => void;
}

export function ProductForm({ product, project, categories, closeForm }: ProductFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCurrency = project?.currency || (globalCurrency as 'LKR' | 'USD' | 'EUR' | 'GBP') || 'USD';

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product || {
      name: '',
      sku: `PROD-${uuidv4().substring(0, 8).toUpperCase()}`,
      categoryId: '',
      quantity: 0,
      price: 0,
      currency: defaultCurrency,
      notes: '',
    },
  });

  async function onSubmit(values: ProductFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    const projectId = product?.projectId || project?.id;
    if (!projectId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Project ID is missing.' });
        setIsSubmitting(false);
        return;
    }
    try {
      if (product) {
        const productRef = doc(db, 'products', product.id);
        await updateDoc(productRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'product_updated' as any, { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Product updated successfully.' });
      } else {
        await addDoc(collection(db, 'products'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'product_created' as any, { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Product created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting product form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Branded T-Shirt" {...field} />
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
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="In stock" {...field} />
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
                <Textarea placeholder="Describe this product..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {product ? 'Update' : 'Create'} Product
          </Button>
        </div>
      </form>
    </Form>
  );
}
