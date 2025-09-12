
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Package, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().optional(),
  services: z.array(z.string()).min(1, 'At least one service must be selected.'),
  priceLKR: z.coerce.number().min(0),
  priceUSD: z.coerce.number().min(0),
  duration: z.string().min(1, { message: 'Duration is required.' }),
  custom: z.boolean().default(false),
});

type PackageFormValues = z.infer<typeof formSchema>;

interface PackageFormProps {
  pkg?: Package;
  projectId: string;
  services: Service[];
  closeForm: () => void;
}

export function PackageForm({ pkg, projectId, services, closeForm }: PackageFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false)

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: pkg ? {
        ...pkg,
        services: pkg.services || [],
    } : {
      name: '',
      description: '',
      services: [],
      priceLKR: 0,
      priceUSD: 0,
      duration: '',
      custom: false,
    },
  });

  async function onSubmit(values: PackageFormValues) {
    setIsSubmitting(true);
    try {
      if (pkg) {
        const pkgRef = doc(db, 'packages', pkg.id);
        await updateDoc(pkgRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Package updated successfully.' });
      } else {
        await addDoc(collection(db, 'packages'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
  const suggestedPriceLKR = selectedServiceDetails.reduce((sum, s) => sum + s.priceLKR, 0);
  const suggestedPriceUSD = selectedServiceDetails.reduce((sum, s) => sum + s.priceUSD, 0);

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
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                            >
                            {field.value?.length > 0
                                ? `${field.value.length} service(s) selected`
                                : "Select services..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search services..." />
                                <CommandList>
                                <CommandEmpty>No services found.</CommandEmpty>
                                <CommandGroup>
                                    <ScrollArea className='h-48'>
                                        {services.map((service) => (
                                        <CommandItem
                                            key={service.id}
                                            value={service.name}
                                            onSelect={() => {
                                                const currentServices = field.value || [];
                                                const serviceId = service.id;
                                                const newServices = currentServices.includes(serviceId)
                                                    ? currentServices.filter(id => id !== serviceId)
                                                    : [...currentServices, serviceId];
                                                field.onChange(newServices);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value?.includes(service.id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {service.name}
                                        </CommandItem>
                                        ))}
                                    </ScrollArea>
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />

        <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
             <FormField
                control={form.control}
                name="priceLKR"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Price (LKR)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="150000" {...field} />
                        </FormControl>
                         <p className='text-xs text-muted-foreground'>Suggested: {suggestedPriceLKR.toLocaleString()}</p>
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
                            <Input type="number" placeholder="800" {...field} />
                        </FormControl>
                        <p className='text-xs text-muted-foreground'>Suggested: {suggestedPriceUSD.toLocaleString()}</p>
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
                            <Input placeholder="e.g. 1 month" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
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
