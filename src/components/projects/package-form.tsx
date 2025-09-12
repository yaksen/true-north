
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Package, Project, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronsUpDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';
import { CurrencyInput } from '../ui/currency-input';
import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().optional(),
  services: z.array(z.string()).min(1, 'At least one service must be selected.'),
  price: z.coerce.number().min(0),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  duration: z.string().min(1, { message: 'Duration is required.' }),
  custom: z.boolean().default(false),
});

type PackageFormValues = z.infer<typeof formSchema>;

interface PackageFormProps {
  pkg?: Package;
  project: Project;
  services: Service[];
  closeForm: () => void;
}

export function PackageForm({ pkg, project, services, closeForm }: PackageFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isServicesPopoverOpen, setIsServicesPopoverOpen] = useState(false);

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: pkg ? {
        ...pkg,
        services: pkg.services || [],
    } : {
      name: '',
      description: '',
      services: [],
      price: 0,
      currency: project.currency || (globalCurrency as any) || 'USD',
      duration: '',
      custom: false,
    },
  });

  async function onSubmit(values: PackageFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (pkg) {
        const pkgRef = doc(db, 'packages', pkg.id);
        await updateDoc(pkgRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(project.id, 'package_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Package updated successfully.' });
      } else {
        await addDoc(collection(db, 'packages'), {
          ...values,
          projectId: project.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(project.id, 'package_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Package created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting package form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedServiceDetails = form.watch('services').map(id => services.find(s => s.id === id)).filter(Boolean) as Service[];
  
  // A mock conversion rate for suggestion. Replace with a real API call in a real app.
  const MOCK_RATES = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };
  
  const suggestedPrice = selectedServiceDetails.reduce((sum, s) => {
    const rate = MOCK_RATES[s.currency] || 1;
    const priceInUSD = s.price / rate;
    return sum + priceInUSD;
  }, 0) / (MOCK_RATES[form.watch('currency')] || 1);


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
                <Input placeholder="e.g. E-Commerce Starter Kit" {...field} />
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
                <Textarea placeholder="A brief description of what this package includes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
            control={form.control}
            name="services"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Included Services</FormLabel>
                    <Popover open={isServicesPopoverOpen} onOpenChange={setIsServicesPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isServicesPopoverOpen}
                          className="w-full justify-between"
                        >
                          {field.value?.length > 0
                              ? `${field.value.length} service(s) selected`
                              : "Select services..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search services..." />
                            <CommandEmpty>No services found.</CommandEmpty>
                            <CommandGroup>
                                <ScrollArea className='h-48'>
                                {services.map((service) => (
                                    <CommandItem
                                        key={service.id}
                                        onSelect={() => {
                                            const currentServices = field.value || [];
                                            const serviceId = service.id;
                                            const newServices = currentServices.includes(serviceId)
                                                ? currentServices.filter(id => id !== serviceId)
                                                : [...currentServices, serviceId];
                                            field.onChange(newServices);
                                        }}
                                    >
                                        <CheckIcon
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value.includes(service.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {service.name}
                                    </CommandItem>
                                ))}
                                </ScrollArea>
                            </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Package Price</FormLabel>
                         <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                            currency={form.watch('currency')}
                            onCurrencyChange={(value) => form.setValue('currency', value)}
                        />
                        <p className='text-xs text-muted-foreground'>Suggested: ~{suggestedPrice.toLocaleString(undefined, { style: 'currency', currency: form.watch('currency'), notation: 'compact' })}</p>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className='grid grid-cols-2 gap-4'>
            <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. 1 month" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="custom"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 pt-8">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>
                                Custom Package
                            </FormLabel>
                        </div>
                    </FormItem>
                )}
            />
            </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pkg ? 'Update' : 'Create'} Package
          </Button>
        </div>
      </form>
    </Form>
  );
}
