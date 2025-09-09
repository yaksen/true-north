
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Invoice, Lead, Service, Package, LineItem, Discount } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarIcon, Loader2, PlusCircle, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '../ui/separator';
import { calculateInvoiceTotals } from '@/lib/billing';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description cannot be empty.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  priceLKR: z.coerce.number().min(0, 'Price must be a positive number.'),
  priceUSD: z.coerce.number().min(0, 'Price must be a positive number.'),
});

const discountSchema = z.object({
    id: z.string(),
    type: z.enum(['percentage', 'flat']),
    value: z.coerce.number().min(0, 'Discount value must be positive.'),
    label: z.string().min(1, 'Label is required.'),
});

const formSchema = z.object({
  leadId: z.string().nonempty({ message: 'A customer must be selected.' }),
  status: z.enum(['draft', 'sent']),
  issueDate: z.date(),
  dueDate: z.date(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required.'),
  discounts: z.array(discountSchema).optional(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  paymentInstructions: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof formSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  closeForm: () => void;
  leads: Lead[];
  services: Service[];
  packages: Package[];
}

export function InvoiceForm({ invoice, closeForm, leads, services, packages }: InvoiceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leadId: invoice?.leadId ?? '',
      status: invoice?.status === 'paid' || invoice?.status === 'overdue' || invoice?.status === 'void' ? 'draft' : (invoice?.status ?? 'draft'),
      issueDate: invoice?.issueDate ?? new Date(),
      dueDate: invoice?.dueDate ?? new Date(),
      lineItems: invoice?.lineItems ?? [],
      discounts: invoice?.discounts ?? [],
      taxRate: invoice?.taxRate ?? 0,
      notes: invoice?.notes ?? '',
      paymentInstructions: invoice?.paymentInstructions ?? '',
    },
  });

  const { fields: lineItemFields, append: appendLineItem, remove: removeLineItem } = useFieldArray({
    control: form.control, name: "lineItems",
  });
  const { fields: discountFields, append: appendDiscount, remove: removeDiscount } = useFieldArray({
    control: form.control, name: "discounts",
  });

  const watchLineItems = form.watch('lineItems');
  const watchDiscounts = form.watch('discounts');
  const watchTaxRate = form.watch('taxRate');
  const totals = calculateInvoiceTotals(watchLineItems, watchDiscounts, watchTaxRate);

  async function onSubmit(values: InvoiceFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }
    setIsSubmitting(true);
    
    // Generate a simple invoice number for now
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const invoiceData = {
      ...values,
      ...totals,
      invoiceNumber,
      userId: user.uid,
    };

    try {
      await addDoc(collection(db, `users/${user.uid}/invoices`), {
        ...invoiceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Invoice created successfully.' });
      closeForm();
    } catch (error) {
      console.error("Error submitting invoice form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const addServiceAsLineItem = (service: Service) => {
    appendLineItem({
        id: uuidv4(),
        description: service.name,
        quantity: 1,
        priceLKR: service.priceLKR,
        priceUSD: service.priceUSD,
    });
  }
  
  const addPackageAsLineItem = (pkg: Package) => {
    appendLineItem({
        id: uuidv4(),
        description: pkg.name,
        quantity: 1,
        priceLKR: pkg.priceLKR,
        priceUSD: pkg.priceUSD,
    });
    // Also add package discounts to the invoice
    pkg.discounts?.forEach(d => appendDiscount(d));
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                    <FormField
                        control={form.control}
                        name="leadId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Customer</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a customer" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {leads.map(lead => (
                                        <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className='grid grid-cols-2 gap-4'>
                    <FormField
                        control={form.control}
                        name="issueDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Issue Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />
                
                <div>
                    <FormLabel>Items</FormLabel>
                    <div className="space-y-2 mt-2">
                        {lineItemFields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-start">
                                <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (<Textarea placeholder="Item description" {...field} rows={1} />)}/>
                                <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (<Input type="number" placeholder="Qty" {...field} />)}/>
                                <FormField control={form.control} name={`lineItems.${index}.priceLKR`} render={({ field }) => (<Input type="number" placeholder="Price (LKR)" {...field} />)}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendLineItem({ id: uuidv4(), description: '', quantity: 1, priceLKR: 0, priceUSD: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Item
                    </Button>
                </div>

                <Separator />

                 <div>
                    <FormLabel>Discounts</FormLabel>
                    <div className="space-y-2 mt-2">
                        {discountFields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-[1fr_120px_100px_auto] gap-2 items-end">
                                <FormField control={form.control} name={`discounts.${index}.label`} render={({ field }) => (<Input placeholder="Discount label" {...field} />)}/>
                                <FormField control={form.control} name={`discounts.${index}.type`} render={({ field }) => (
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="flat">Flat (LKR)</SelectItem></SelectContent>
                                    </Select>
                                )}/>
                                <FormField control={form.control} name={`discounts.${index}.value`} render={({ field }) => (<Input type="number" placeholder="Value" {...field} />)}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeDiscount(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                     <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendDiscount({ id: uuidv4(), label: '', type: 'percentage', value: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Discount
                    </Button>
                </div>

                 <Separator />

                 <div className='grid grid-cols-2 gap-4'>
                     <FormField control={form.control} name="taxRate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tax Rate (%)</FormLabel>
                            <Input type="number" {...field} />
                            <FormMessage />
                        </FormItem>
                     )}/>
                </div>
                 <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><Textarea placeholder="Add any notes for the customer..." {...field} /><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="paymentInstructions" render={({ field }) => (
                    <FormItem><FormLabel>Payment Instructions</FormLabel><Textarea placeholder="e.g. Bank transfer details..." {...field} /><FormMessage /></FormItem>
                )}/>

            </div>

            {/* Right Column */}
            <div className='space-y-4'>
                <Card className="bg-muted/30">
                    <CardHeader><CardTitle>Add from Catalog</CardTitle></CardHeader>
                    <CardContent>
                        <Tabs defaultValue="services">
                            <TabsList className='grid w-full grid-cols-2'>
                                <TabsTrigger value="services">Services</TabsTrigger>
                                <TabsTrigger value="packages">Packages</TabsTrigger>
                            </TabsList>
                            <TabsContent value="services">
                                <ScrollArea className='h-48'>
                                <div className='space-y-2 p-1'>
                                    {services.map(s => <div key={s.id} onClick={() => addServiceAsLineItem(s)} className='text-sm p-2 rounded-md hover:bg-muted cursor-pointer flex justify-between'><span>{s.name}</span><span className='text-muted-foreground'>{s.priceLKR.toLocaleString()} LKR</span></div>)}
                                </div>
                                </ScrollArea>
                            </TabsContent>
                             <TabsContent value="packages">
                                <ScrollArea className='h-48'>
                                <div className='space-y-2 p-1'>
                                     {packages.map(p => <div key={p.id} onClick={() => addPackageAsLineItem(p)} className='text-sm p-2 rounded-md hover:bg-muted cursor-pointer flex justify-between'><span>{p.name}</span><span className='text-muted-foreground'>{p.priceLKR.toLocaleString()} LKR</span></div>)}
                                </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                    <CardContent className='space-y-2 text-sm'>
                        <div className='flex justify-between'><span className='text-muted-foreground'>Subtotal</span><span>{totals.subtotalLKR.toLocaleString('en-US', { style: 'currency', currency: 'LKR' })}</span></div>
                        {totals.totalDiscountLKR > 0 && <div className='flex justify-between text-destructive'><span className='text-muted-foreground'>Discount</span><span>- {totals.totalDiscountLKR.toLocaleString('en-US', { style: 'currency', currency: 'LKR' })}</span></div>}
                        {totals.taxAmountLKR > 0 && <div className='flex justify-between'><span className='text-muted-foreground'>Tax ({watchTaxRate}%)</span><span>{totals.taxAmountLKR.toLocaleString('en-US', { style: 'currency', currency: 'LKR' })}</span></div>}
                        <Separator />
                        <div className='flex justify-between font-bold text-base'><span >Total</span><span>{totals.totalLKR.toLocaleString('en-US', { style: 'currency', currency: 'LKR' })}</span></div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {invoice ? 'Update' : 'Create'} Invoice
            </Button>
        </div>
      </form>
    </Form>
  );
}

    