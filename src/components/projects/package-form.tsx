
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
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  description: z.string().optional(),
  services: z.array(z.string()).min(1, 'At least one service must be selected.'),
  price: z.coerce.number().min(0),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  duration: z.string().min(1, { message: 'Duration is required.' }),
  custom: z.boolean().default(false),
  discountPercentage: z.coerce.number().min(-100).max(100).default(0),
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

  const [durationValue, setDurationValue] = useState(() => pkg?.duration?.split(' ')[0] || '1');
  const [durationUnit, setDurationUnit] = useState(() => pkg?.duration?.split(' ')[1] || 'Days');


  const form = useForm<PackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: pkg ? {
        ...pkg,
        services: pkg.services || [],
    } : {
      name: '',
      sku: '',
      description: '',
      services: [],
      price: 0,
      currency: project.currency || (globalCurrency as any) || 'USD',
      duration: '1 Days',
      custom: false,
      discountPercentage: 0,
    },
  });

  const selectedServiceIds = form.watch('services');
  const packageCurrency = form.watch('currency');
  const discountPercentage = form.watch('discountPercentage');
  const isCustom = form.watch('custom');

  // A mock conversion rate for suggestion. Replace with a real API call in a real app.
  const MOCK_RATES = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

  const handleDurationChange = (value: string, unit: string) => {
    setDurationValue(value);
    setDurationUnit(unit);
    form.setValue('duration', `${value} ${unit}`);
  };
  
  useEffect(() => {
    if (isCustom && !pkg) { // Only on create, not on edit
        form.setValue('name', `Custom Package - ${uuidv4().substring(0, 8)}`);
    } else if (!isCustom && !pkg) {
        form.setValue('name', '');
    }
  }, [isCustom, pkg, form]);

  useEffect(() => {
    if (selectedServiceIds.length > 0) {
      const selectedServiceDetails = selectedServiceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[];
      
      const basePriceInUSD = selectedServiceDetails.reduce((sum, s) => {
        const rate = MOCK_RATES[s.currency] || 1;
        const priceInUSD = s.price / rate;
        return sum + priceInUSD;
      }, 0);

      const targetRate = MOCK_RATES[packageCurrency] || 1;
      const basePriceInTargetCurrency = basePriceInUSD * targetRate;
      
      const finalPrice = basePriceInTargetCurrency * (1 - (discountPercentage / 100));

      form.setValue('price', parseFloat(finalPrice.toFixed(2)));
    } else {
        form.setValue('price', 0);
    }
  }, [selectedServiceIds, services, packageCurrency, discountPercentage, form]);


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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="sku"
            render={({ field }) => (
                <FormItem>
                <FormLabel>SKU (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="Unique Product Code" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
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
        
        <FormField
          control={form.control}
          name="discountPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount / Markup ( {field.value}% )</FormLabel>
              <FormControl>
                <Slider
                  min={-100}
                  max={100}
                  step={1}
                  value={[field.value]}
                  onValueChange={(vals) => field.onChange(vals[0])}
                />
              </FormControl>
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
                        <FormLabel>Final Package Price</FormLabel>
                         <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                            currency={form.watch('currency')}
                            onCurrencyChange={(value) => form.setValue('currency', value)}
                            readOnly
                        />
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
                        <div className="flex items-center gap-2">
                            <Input 
                                type="number" 
                                value={durationValue}
                                onChange={(e) => handleDurationChange(e.target.value, durationUnit)}
                                className="w-24"
                            />
                            <Select 
                                value={durationUnit}
                                onValueChange={(unit) => handleDurationChange(durationValue, unit)}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Minutes">Minutes</SelectItem>
                                    <SelectItem value="Hours">Hours</SelectItem>
                                    <SelectItem value="Days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
