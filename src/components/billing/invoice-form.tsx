
'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Invoice, Project, Lead, Discount, LineItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CalendarIcon, Trash2, PlusCircle, Tag, Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { logActivity } from '@/lib/activity-log';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyInput } from '../ui/currency-input';
import { useCurrency } from '@/context/CurrencyContext';

const formSchema = z.object({
  projectId: z.string().nonempty('Project is required.'),
  leadId: z.string().nonempty('Client is required.'),
  invoiceNumber: z.string().nonempty('Invoice number is required.'),
  status: z.enum(['draft', 'sent', 'paid', 'void', 'partial', 'unpaid']),
  issueDate: z.date(),
  dueDate: z.date(),
  lineItems: z.array(z.object({
    id: z.string(),
    description: z.string().nonempty(),
    quantity: z.coerce.number().min(1),
    price: z.coerce.number().min(0),
    currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  })).min(1),
  discounts: z.array(z.object({
    id: z.string(),
    name: z.string().nonempty(),
    type: z.enum(['percentage', 'flat']),
    value: z.coerce.number().min(0),
  })),
  taxRate: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof formSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  projects: Project[];
  leads: Lead[];
  closeForm: () => void;
}

export function InvoiceForm({ invoice, projects, leads, closeForm }: InvoiceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultCurrency = (globalCurrency as 'LKR' | 'USD' | 'EUR' | 'GBP') || 'USD';

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: invoice ? {
        ...invoice,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
    } : {
      projectId: '',
      leadId: '',
      invoiceNumber: `INV-${Date.now()}`,
      status: 'draft',
      issueDate: new Date(),
      dueDate: addDays(new Date(), 30),
      lineItems: [{ id: uuidv4(), description: '', quantity: 1, price: 0, currency: defaultCurrency }],
      discounts: [],
      taxRate: 0,
      notes: '',
    },
  });

  const { fields: lineItemFields, append: appendLineItem, remove: removeLineItem } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });
  
  const { fields: discountFields, append: appendDiscount, remove: removeDiscount } = useFieldArray({
    control: form.control,
    name: "discounts",
  });

  const selectedProjectId = form.watch('projectId');
  const filteredLeads = leads.filter(lead => lead.projectId === selectedProjectId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    form.setValue('leadId', '');
  }, [selectedProjectId, form]);

  useEffect(() => {
    if (selectedProject) {
        form.getValues('lineItems').forEach((_, index) => {
            form.setValue(`lineItems.${index}.currency`, selectedProject.currency);
        });
    }
  }, [selectedProject, form]);

  async function onSubmit(values: InvoiceFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (invoice) {
        const invoiceRef = doc(db, 'invoices', invoice.id);
        await updateDoc(invoiceRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(values.projectId, 'invoice_updated', { invoiceNumber: values.invoiceNumber }, user.uid);
        toast({ title: 'Success', description: 'Invoice updated successfully.' });
      } else {
        await addDoc(collection(db, 'invoices'), {
          ...values,
          payments: [], // Initialize with empty payments array
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(values.projectId, 'invoice_created', { invoiceNumber: values.invoiceNumber }, user.uid);
        toast({ title: 'Success', description: 'Invoice created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting invoice form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Project and Lead Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem><FormLabel>Project</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a project..." /></SelectTrigger></FormControl><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="leadId" render={({ field }) => (
                <FormItem><FormLabel>Client / Lead</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectId}><FormControl><SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger></FormControl><SelectContent>{filteredLeads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
        </div>
        
        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Invoice #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['draft', 'sent', 'paid', 'void', 'partial', 'unpaid'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Issue Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
        </div>

        {/* Line Items */}
        <div className="space-y-2">
            <FormLabel>Line Items</FormLabel>
            {lineItemFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_200px_auto] items-center gap-2">
                    <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (<Input placeholder="Description" {...field} />)} />
                    <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (<Input type="number" placeholder="Qty" {...field} />)} />
                    <Controller
                        control={form.control}
                        name={`lineItems.${index}`}
                        render={({ field: { onChange, value } }) => (
                           <CurrencyInput
                                value={value.price}
                                onValueChange={(price) => onChange({ ...value, price })}
                                currency={value.currency}
                                onCurrencyChange={(currency) => onChange({ ...value, currency })}
                           />
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => appendLineItem({ id: uuidv4(), description: '', quantity: 1, price: 0, currency: selectedProject?.currency || defaultCurrency })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
            </Button>
        </div>

        {/* Discounts */}
        <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <FormLabel>Discounts</FormLabel>
                {discountFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField control={form.control} name={`discounts.${index}.name`} render={({ field }) => (<Input placeholder="Discount Name" {...field} />)} />
                        <FormField control={form.control} name={`discounts.${index}.value`} render={({ field }) => (<Input type="number" {...field} className="w-24" />)} />
                        <FormField control={form.control} name={`discounts.${index}.type`} render={({ field }) => (<Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="w-24"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="percentage">%</SelectItem><SelectItem value="flat">Flat</SelectItem></SelectContent></Select>)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeDiscount(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => appendDiscount({ id: uuidv4(), name: '', value: 0, type: 'percentage' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Discount
                </Button>
            </div>
            {/* Tax Rate */}
            <FormField control={form.control} name="taxRate" render={({ field }) => (<FormItem><FormLabel>Tax Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        
        {/* Notes */}
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes / Terms</FormLabel><FormControl><Textarea placeholder="e.g. Thank you for your business." {...field} /></FormControl><FormMessage /></FormItem>)} />

        <div className="flex justify-end gap-2">
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
