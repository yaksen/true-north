

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Package, Project, Service, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronsUpDown, Loader2, Sparkles, ImageIcon, Upload, Image as ImagePreviewIcon, X } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { extractPackageDetails, type ExtractPackageDetailsOutput } from '@/ai/flows/extract-package-details-flow';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  description: z.string().optional(),
  services: z.array(z.string()).default([]),
  products: z.array(z.string()).default([]),
  price: z.coerce.number().min(0),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  duration: z.string().min(1, { message: 'Duration is required.' }),
  custom: z.boolean().default(false),
  discountPercentage: z.coerce.number().min(-100).max(100).default(0),
  imageUrl: z.string().url().optional().or(z.literal('')),
}).refine(data => data.services.length > 0 || data.products.length > 0, {
    message: "At least one service or product must be selected.",
    path: ["services"], // you can point to either services or products
});

type PackageFormValues = z.infer<typeof formSchema>;

interface PackageFormProps {
  pkg?: Package;
  project: Project;
  services: Service[];
  products: Product[];
  closeForm: () => void;
}

export function PackageForm({ pkg, project, services, products, closeForm }: PackageFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [isItemsPopoverOpen, setIsItemsPopoverOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(pkg?.imageUrl || null);


  const [durationValue, setDurationValue] = useState(() => pkg?.duration?.split(' ')[0] || '1');
  const [durationUnit, setDurationUnit] = useState(() => pkg?.duration?.split(' ')[1] || 'Days');


  const form = useForm<PackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: pkg ? {
        ...pkg,
        services: pkg.services || [],
        products: pkg.products || [],
        imageUrl: pkg.imageUrl || '',
    } : {
      name: '',
      sku: `PKG-${uuidv4().substring(0, 8).toUpperCase()}`,
      description: '',
      services: [],
      products: [],
      price: 0,
      currency: project.currency || (globalCurrency as any) || 'USD',
      duration: '1 Days',
      custom: false,
      discountPercentage: 0,
      imageUrl: '',
    },
  });

  const selectedServiceIds = form.watch('services');
  const selectedProductIds = form.watch('products');
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

  const basePrice = useMemo(() => {
      const selectedServiceDetails = selectedServiceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[];
      const selectedProductDetails = selectedProductIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];

      const totalServicePriceUSD = selectedServiceDetails.reduce((sum, s) => {
        const rate = MOCK_RATES[s.currency as keyof typeof MOCK_RATES] || 1;
        const priceInUSD = s.price / rate;
        return sum + priceInUSD;
      }, 0);

      const totalProductPriceUSD = selectedProductDetails.reduce((sum, p) => {
        const rate = MOCK_RATES[p.currency as keyof typeof MOCK_RATES] || 1;
        const priceInUSD = p.price / rate;
        return sum + priceInUSD;
      }, 0);
      
      const basePriceInUSD = totalServicePriceUSD + totalProductPriceUSD;
      const targetRate = MOCK_RATES[packageCurrency as keyof typeof MOCK_RATES] || 1;
      
      return basePriceInUSD * targetRate;
  }, [selectedServiceIds, selectedProductIds, services, products, packageCurrency]);

  const handleDiscountChange = useCallback((newDiscount: number) => {
    form.setValue('discountPercentage', newDiscount);
    const calculatedPrice = basePrice * (1 - (newDiscount / 100));
    form.setValue('price', parseFloat(calculatedPrice.toFixed(2)), { shouldValidate: true });
  }, [basePrice, form]);

  const handlePriceChange = useCallback((newPrice: number) => {
    form.setValue('price', newPrice);
    if (basePrice > 0) {
      const calculatedDiscount = (1 - (newPrice / basePrice)) * 100;
      form.setValue('discountPercentage', parseFloat(calculatedDiscount.toFixed(1)));
    } else {
      form.setValue('discountPercentage', 0);
    }
  }, [basePrice, form]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setAiImage(event.target.files[0]);
      const reader = new FileReader();
      reader.onload = (e) => setPastedImage(e.target?.result as string);
      reader.readAsDataURL(event.target.files[0]);
    }
  };
  
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                setAiImage(blob);
                const reader = new FileReader();
                reader.onload = (e) => setPastedImage(e.target?.result as string);
                reader.readAsDataURL(blob);
            }
        }
    }
  };
  
  const fileToDataUri = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleExtractDetails = async () => {
    if (!aiPrompt && !aiImage) {
        toast({
            variant: 'destructive',
            title: 'No Input Provided',
            description: 'Please provide some text or an image for the AI to process.'
        });
        return;
    }

    setIsExtracting(true);
    try {
        const imageDataUri = aiImage ? await fileToDataUri(aiImage) : undefined;
        
        const extractedData: ExtractPackageDetailsOutput = await extractPackageDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri
        });

        if (extractedData.name) form.setValue('name', extractedData.name);
        if (extractedData.description) form.setValue('description', extractedData.description);
        if (extractedData.price) form.setValue('price', extractedData.price);
        if (extractedData.currency) form.setValue('currency', extractedData.currency);
        if (extractedData.duration) {
            const [val, unit] = extractedData.duration.split(' ');
            if (val && unit) {
                handleDurationChange(val, unit);
            }
        }
        
        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting package details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
  };


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

  const selectedItemsCount = (selectedServiceIds?.length || 0) + (selectedProductIds?.length || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                name="services" // Also need to handle products here, but hook form name is singular
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Included Items</FormLabel>
                        <Popover open={isItemsPopoverOpen} onOpenChange={setIsItemsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isItemsPopoverOpen}
                            className="w-full justify-between"
                            >
                            {selectedItemsCount > 0
                                ? `${selectedItemsCount} item(s) selected`
                                : "Select items..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search items..." />
                                <CommandEmpty>No items found.</CommandEmpty>
                                <ScrollArea className='h-48'>
                                    {services.length > 0 && <CommandGroup heading="Services">
                                        {services.map((service) => (
                                            <CommandItem
                                                key={`s-${service.id}`}
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
                                    </CommandGroup>}
                                    {products.length > 0 && <CommandGroup heading="Products">
                                        {products.map((product) => (
                                            <CommandItem
                                                key={`p-${product.id}`}
                                                onSelect={() => {
                                                    const currentProducts = form.getValues('products') || [];
                                                    const productId = product.id;
                                                    const newProducts = currentProducts.includes(productId)
                                                        ? currentProducts.filter(id => id !== productId)
                                                        : [...currentProducts, productId];
                                                    form.setValue('products', newProducts);
                                                }}
                                            >
                                                <CheckIcon
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        form.getValues('products').includes(product.id) ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {product.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>}
                                </ScrollArea>
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
                    <FormLabel>Discount / Markup ( {field.value.toFixed(1)}% )</FormLabel>
                    <FormControl>
                        <Slider
                            min={-100}
                            max={100}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(vals) => handleDiscountChange(vals[0])}
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
                                onValueChange={handlePriceChange}
                                currency={form.watch('currency')}
                                onCurrencyChange={(value) => form.setValue('currency', value)}
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
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting || isUploading}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploading ? 'Uploading...' : (pkg ? 'Update' : 'Create') + ' Package'}
            </Button>
            </div>
        </form>
        </Form>
        <Card className='h-fit'>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Sparkles className='h-5 w-5 text-primary' />
                    AI Assistant
                </CardTitle>
                <CardDescription>
                    Paste text or upload an image to automatically fill the form.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Text or Prompt</Label>
                    <Textarea
                        id="ai-prompt"
                        placeholder="e.g., 'A premium web design package that includes a 5-page website and basic SEO. It costs $2500 and takes 20 days to complete.'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-24"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Image</Label>
                    <div onPaste={handlePaste} className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary">
                        {pastedImage ? (
                            <Image src={pastedImage} alt="Pasted preview" layout="fill" objectFit="contain" className='rounded-lg' />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageIcon className='mx-auto h-8 w-8' />
                                <p>Click to upload or paste an image</p>
                            </div>
                        )}
                        <Input id="ai-image" type="file" accept="image/*" onChange={handleFileChange} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer' />
                    </div>
                </div>
                <Button className='w-full' onClick={handleExtractDetails} disabled={isExtracting}>
                    {isExtracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Extract Details
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
