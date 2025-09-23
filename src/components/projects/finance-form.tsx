
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Finance, FinanceType, Project, Package, Service } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CalendarIcon, Sparkles, ImageIcon } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays, parseISO } from 'date-fns';
import { logActivity } from '@/lib/activity-log';
import { CurrencyInput } from '../ui/currency-input';
import { useCurrency } from '@/context/CurrencyContext';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { extractFinanceDetails, type ExtractFinanceDetailsOutput } from '@/ai/flows/extract-finance-details-flow';
import Image from 'next/image';


const financeTypes = ['income', 'expense'] as const;

const formSchema = z.object({
  projectId: z.string().nonempty({ message: 'Project is required.' }),
  type: z.enum(financeTypes, { required_error: 'Type is required.' }),
  amount: z.coerce.number().min(0),
  paidPrice: z.coerce.number().min(0).optional(),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  description: z.string().min(2, { message: 'Description must be at least 2 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
  category: z.string().optional(),
});

type FinanceFormValues = z.infer<typeof formSchema>;

interface FinanceFormProps {
  finance?: Finance;
  project?: { id: string, currency: 'LKR' | 'USD' | 'EUR' | 'GBP' };
  projects?: Project[];
  packages?: Package[];
  services?: Service[];
  leadId?: string;
  channelId?: string;
  closeForm: () => void;
}

export function FinanceForm({ finance, project, projects, packages, services, leadId, channelId, closeForm }: FinanceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  
  const [totalValue, setTotalValue] = useState(finance?.amount || 0);

  const form = useForm<FinanceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: finance ? {
        ...finance,
        date: finance.date instanceof Date ? finance.date : new Date(finance.date),
        paidPrice: finance.amount, // For editing, the paid price is the amount on the record
    } : {
      projectId: project?.id || '',
      type: 'income',
      amount: 0, // This is now the paid amount
      paidPrice: 0,
      description: '',
      date: new Date(),
      category: '',
      currency: project?.currency || (globalCurrency as any) || 'USD',
    },
  });
  
  const selectedProjectId = form.watch('projectId');
  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (selectedProject) {
        form.setValue('currency', selectedProject.currency);
    }
  }, [selectedProject, form]);

  useEffect(() => {
    if (selectedPackageId && packages) {
      setSelectedServiceId(null);
      const selectedPackage = packages.find(p => p.id === selectedPackageId);
      if (selectedPackage) {
        setTotalValue(selectedPackage.price);
        form.setValue('currency', selectedPackage.currency);
        form.setValue('description', `Purchased ${selectedPackage.sku || selectedPackage.name}`);
        form.setValue('category', 'Package Sale');
      }
    }
  }, [selectedPackageId, packages, form]);

  useEffect(() => {
    if (selectedServiceId && services) {
        setSelectedPackageId(null);
        const selectedService = services.find(s => s.id === selectedServiceId);
        if (selectedService) {
            setTotalValue(selectedService.price);
            form.setValue('currency', selectedService.currency);
            form.setValue('description', `Purchased ${selectedService.sku || selectedService.name}`);
            form.setValue('category', 'Service Sale');
        }
    }
  }, [selectedServiceId, services, form]);

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
        
        const extractedData: ExtractFinanceDetailsOutput = await extractFinanceDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri
        });

        if (extractedData.description) form.setValue('description', extractedData.description);
        if (extractedData.type) form.setValue('type', extractedData.type);
        if (extractedData.amount) form.setValue('amount', extractedData.amount);
        if (extractedData.currency) form.setValue('currency', extractedData.currency);
        if (extractedData.date) form.setValue('date', parseISO(extractedData.date));
        if (extractedData.category) form.setValue('category', extractedData.category);


        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting finance details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
  };

  async function onSubmit(values: FinanceFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      if (finance) { // UPDATE existing finance record
        const financeRef = doc(db, 'finances', finance.id);
        const updatePayload = {
            ...values,
            amount: values.paidPrice, // `amount` on finance record is the paid amount
            updatedAt: serverTimestamp()
        };
        delete (updatePayload as any).paidPrice; // Don't save paidPrice to DB

        await updateDoc(financeRef, updatePayload);
        await logActivity(values.projectId, 'finance_updated', { description: values.description }, user.uid);
        toast({ title: 'Success', description: 'Record updated successfully.' });
      } else { // CREATE new finance record (and maybe invoice)
        const batch = writeBatch(db);

        // If it's an income record for a specific lead, create an invoice
        if (leadId && values.type === 'income') {
            const invoiceRef = doc(collection(db, 'invoices'));
            const paidAmount = values.paidPrice || 0;

            const initialPayment = paidAmount > 0 ? [{
              id: uuidv4(),
              amount: paidAmount,
              date: values.date,
              method: 'online' as const,
              note: 'Initial payment with finance record creation.',
            }] : [];

            let status: 'draft' | 'paid' | 'partial' | 'unpaid' = 'unpaid';
            if (paidAmount > 0) {
                status = paidAmount >= totalValue ? 'paid' : 'partial';
            }

            const invoiceData = {
                id: invoiceRef.id,
                projectId: values.projectId,
                leadId: leadId,
                invoiceNumber: `INV-${Date.now()}`,
                status: status,
                issueDate: values.date,
                dueDate: addDays(values.date, 30),
                lineItems: [{
                    id: uuidv4(),
                    description: values.description,
                    quantity: 1,
                    price: totalValue, // The full value of the service/package
                    currency: values.currency,
                }],
                payments: initialPayment,
                discounts: [],
                taxRate: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            batch.set(invoiceRef, invoiceData);
            
            // Create one finance record for the initial payment
            if (paidAmount > 0) {
                 const financeData = {
                    projectId: values.projectId,
                    leadId: leadId,
                    invoiceId: invoiceRef.id,
                    type: 'income' as const,
                    amount: paidAmount, // The amount that was actually paid
                    currency: values.currency,
                    description: `Payment for Invoice ${invoiceData.invoiceNumber}`,
                    date: values.date,
                    category: values.category || 'Invoice Payment',
                    recordedByUid: user.uid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                const financeRef = doc(collection(db, 'finances'));
                batch.set(financeRef, financeData);
            }
             await logActivity(values.projectId, 'invoice_created', { invoiceNumber: invoiceData.invoiceNumber }, user.uid);
             if (paidAmount > 0) {
                 await logActivity(values.projectId, 'finance_created', { description: `Payment for Invoice ${invoiceData.invoiceNumber}` }, user.uid);
             }
             toast({ title: 'Success', description: 'Invoice and payment record created.' });

        } else { // It's a general expense or income
            const financeData: any = {
                ...values,
                amount: values.amount,
                recordedByUid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            delete financeData.paidPrice;

            if (leadId) financeData.leadId = leadId;
            if (channelId) financeData.channelId = channelId;

            const financeRef = doc(collection(db, 'finances'));
            batch.set(financeRef, financeData);
            await logActivity(values.projectId, 'finance_created', { description: values.description }, user.uid);
            toast({ title: 'Success', description: 'Record created successfully.' });
        }
        await batch.commit();
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting finance form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const isInvoiceFlow = leadId && form.watch('type') === 'income';

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {projects && (
            <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            )}
            {(packages && packages.length > 0) || (services && services.length > 0) ? (
            <div className="grid grid-cols-2 gap-4">
                {packages && packages.length > 0 && (
                <FormItem>
                    <FormLabel>Select a Package (Optional)</FormLabel>
                    <Select value={selectedPackageId || ''} onValueChange={setSelectedPackageId}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a package..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {packages.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormItem>
                )}
                {services && services.length > 0 && (
                    <FormItem>
                        <FormLabel>Select a Service (Optional)</FormLabel>
                        <Select value={selectedServiceId || ''} onValueChange={setSelectedServiceId}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a service..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {services.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            </div>
            ) : null}
            <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Initial client payment" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {financeTypes.map(type => (
                                    <SelectItem key={type} value={type} className='capitalize'>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {isInvoiceFlow ? (
                    <FormItem>
                        <FormLabel>Total Value</FormLabel>
                        <CurrencyInput
                            value={totalValue}
                            onValueChange={setTotalValue}
                            currency={form.watch('currency')}
                            onCurrencyChange={(value) => form.setValue('currency', value)}
                        />
                    </FormItem>
                ) : (
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
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
                )}
            </div>

            {isInvoiceFlow && (
                <FormField
                    control={form.control}
                    name="paidPrice"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Paid Amount</FormLabel>
                            <CurrencyInput
                                value={field.value || 0}
                                onValueChange={field.onChange}
                                currency={form.watch('currency')}
                                onCurrencyChange={(value) => form.setValue('currency', value)}
                                readOnlyCurrency
                            />
                            <FormDescription>
                                Amount paid at the time of creating this invoice.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value instanceof Date ? field.value : new Date(field.value), "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                    initialFocus
                                />
                                <div className="p-2 border-t flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => field.onChange(new Date())}>Today</Button>
                                    <Button size="sm" variant="ghost" onClick={() => field.onChange(addDays(new Date(), 1))}>Tomorrow</Button>
                                    <Button size="sm" variant="ghost" onClick={() => field.onChange(addDays(new Date(), 2))}>Day After</Button>
                                </div>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Software" {...field} />
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
                {finance ? 'Update' : 'Create'} Record
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
                        placeholder="e.g., 'Lunch meeting with client, $45.50 on Oct 23'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-24"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Image (e.g., Receipt)</Label>
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

    