
'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import type { Package, Service, CrmSettings } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';

const discountSchema = z.object({
    id: z.string(),
    type: z.enum(['percentage', 'flat']),
    value: z.coerce.number().min(0, 'Discount value must be positive.'),
    label: z.string().min(1, 'Label is required.'),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().optional(),
  duration: z.string().nonempty({ message: 'Duration is required' }),
  priceLKR: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  priceUSD: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  serviceIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one service.',
  }),
  discounts: z.array(discountSchema).optional(),
});

type PackageFormValues = z.infer<typeof formSchema>;

interface PackageFormProps {
  pkg?: Package;
  services: Service[];
  closeForm: () => void;
}

export function PackageForm({ pkg, services, closeForm }: PackageFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: pkg?.name ?? '',
      description: pkg?.description ?? '',
      duration: pkg?.duration ?? '',
      priceLKR: pkg?.priceLKR ?? 0,
      priceUSD: pkg?.priceUSD ?? 0,
      serviceIds: pkg?.serviceIds ?? [],
      discounts: pkg?.discounts ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "discounts",
  });

  async function getNextPackageId(): Promise<string> {
    const settingsRef = doc(db, 'settings', 'crm');
    let newPackageIdNumber = 1;

    await runTransaction(db, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        
        if (!settingsDoc.exists() || !settingsDoc.data()?.counters?.packageId) {
            const initialSettings: Partial<CrmSettings> = { 
                counters: { packageId: 1, leadId: settingsDoc.data()?.counters?.leadId || 0 }
            };
            transaction.set(settingsRef, initialSettings, { merge: true });
        } else {
            const settings = settingsDoc.data() as CrmSettings;
            newPackageIdNumber = (settings.counters?.packageId || 0) + 1;
            transaction.update(settingsRef, { "counters.packageId": newPackageIdNumber });
        }
    });
    return newPackageIdNumber.toString().padStart(4, '0');
  }

  async function onSubmit(values: PackageFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      if (pkg) {
        // Update existing package
        const packageData = {
          ...values,
          userId: user.uid,
        };
        const packageRef = doc(db, `users/${user.uid}/packages`, pkg.id);
        await updateDoc(packageRef, packageData);
        toast({ title: 'Success', description: 'Package updated successfully.' });
      } else {
        // Create new package
        const newPackageId = await getNextPackageId();
        const packageData = {
          ...values,
          packageId: newPackageId,
          userId: user.uid,
        };
        await addDoc(collection(db, `users/${user.uid}/packages`), {
          ...packageData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: `Package #${newPackageId} created successfully.` });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting package form: ", error);
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
              <FormLabel>Package Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Wedding Special" {...field} />
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
                <Textarea placeholder="Describe the package..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 3 hours" {...field} />
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
                  <Input type="number" placeholder="25000" {...field} />
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
                  <Input type="number" placeholder="80" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="serviceIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Included Services</FormLabel>
                <FormDescription>
                  Select the services to include in this package.
                </FormDescription>
              </div>
              <ScrollArea className="h-40 rounded-md border p-4">
              {services.map((service) => (
                <FormField
                  key={service.id}
                  control={form.control}
                  name="serviceIds"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={service.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(service.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), service.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== service.id
                                    )
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {service.name}
                        </FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
              </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div>
            <FormLabel>Discounts</FormLabel>
            <div className="space-y-4 mt-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col gap-2 rounded-md border p-4">
                         <div className='flex items-end gap-2'>
                            <FormField
                                control={form.control}
                                name={`discounts.${index}.label`}
                                render={({ field }) => (
                                    <FormItem className='flex-grow'>
                                        <FormLabel>Label</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. Seasonal Offer" /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                         <div className='flex items-end gap-2'>
                            <FormField
                                control={form.control}
                                name={`discounts.${index}.type`}
                                render={({ field }) => (
                                    <FormItem className='w-1/3'>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                <SelectItem value="flat">Flat (LKR)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`discounts.${index}.value`}
                                render={({ field }) => (
                                    <FormItem className='flex-grow'>
                                        <FormLabel>Value</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormMessage>{form.formState.errors.discounts?.[index]?.label?.message}</FormMessage>
                         <FormMessage>{form.formState.errors.discounts?.[index]?.value?.message}</FormMessage>
                    </div>
                ))}
            </div>
             <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ id: uuidv4(), label: '', type: 'percentage', value: 0 })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Discount
            </Button>
        </div>


        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pkg ? 'Update' : 'Create'} Package
          </Button>
        </div>
      </form>
    </Form>
  );
}
