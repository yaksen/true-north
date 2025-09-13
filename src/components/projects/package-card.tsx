
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import type { Package, Service, Discount, Project } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PackageForm } from './package-form';
import { ArrowRight, Edit, Percent, Tag, Trash2, X } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';

interface PackageCardProps {
    pkg: Package;
    project: Project;
    allServices: Service[];
}

interface DiscountCalculatorProps {
    pkg: Package;
}

const DiscountCalculator: React.FC<DiscountCalculatorProps> = ({ pkg }) => {
    const [discounts, setDiscounts] = useState<Discount[]>(pkg.discounts || []);
    const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'flat'>('percentage');
    const [newDiscountValue, setNewDiscountValue] = useState(0);
    const [newDiscountName, setNewDiscountName] = useState('');

    const handleAddDiscount = () => {
        if (!newDiscountName || newDiscountValue <= 0) {
            alert("Please enter a valid discount name and value.");
            return;
        }
        const newDiscount: Discount = {
            id: `disc_${Date.now()}`,
            name: newDiscountName,
            type: newDiscountType,
            value: newDiscountValue,
        };
        setDiscounts([...discounts, newDiscount]);
        setNewDiscountName('');
        setNewDiscountValue(0);
    };

    const handleRemoveDiscount = (id: string) => {
        setDiscounts(discounts.filter(d => d.id !== id));
    };

    let totalDiscount = 0;
    let priceAfterDiscounts = pkg.price;

    discounts.forEach(discount => {
        if (discount.type === 'percentage') {
            const discountAmount = (priceAfterDiscounts * discount.value) / 100;
            totalDiscount += discountAmount;
            priceAfterDiscounts -= discountAmount;
        } else if (discount.type === 'flat') {
            totalDiscount += discount.value;
            priceAfterDiscounts -= discount.value;
        }
    });
    
    return (
        <div className='space-y-4'>
            <div>
                <p className='text-sm text-muted-foreground'>Original Price</p>
                <p className='font-bold line-through'>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: pkg.currency }).format(pkg.price)}
                </p>
            </div>
            {discounts.length > 0 && (
                 <div>
                    <p className='text-sm text-muted-foreground'>Applied Discounts</p>
                    <div className='space-y-1 mt-1'>
                        {discounts.map(d => (
                            <div key={d.id} className='flex items-center justify-between text-xs'>
                                <div className='flex items-center gap-1'>
                                    {d.type === 'percentage' ? <Percent className='h-3 w-3' /> : <Tag className='h-3 w-3'/>}
                                    <span>{d.name} ({d.value}{d.type === 'percentage' ? '%' : ''})</span>
                                </div>
                                <Button size='icon' variant='ghost' className='h-6 w-6' onClick={() => handleRemoveDiscount(d.id)}><X className='h-4 w-4'/></Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
             <div className="flex items-center gap-2">
                <Input value={newDiscountName} onChange={(e) => setNewDiscountName(e.target.value)} placeholder="Discount Name" />
                <Input type="number" value={newDiscountValue} onChange={(e) => setNewDiscountValue(parseFloat(e.target.value))} className="w-24" />
                <select value={newDiscountType} onChange={(e) => setNewDiscountType(e.target.value as any)} className="bg-background border rounded-md p-2 text-sm h-10">
                    <option value="percentage">%</option>
                    <option value="flat">Flat</option>
                </select>
                <Button onClick={handleAddDiscount}>Add</Button>
            </div>
            <div className='border-t pt-4'>
                <p className='text-sm text-muted-foreground'>Final Price</p>
                <p className='text-2xl font-bold text-primary'>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: pkg.currency }).format(priceAfterDiscounts)}
                </p>
            </div>
        </div>
    );
};


export function PackageCard({ pkg, project, allServices }: PackageCardProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);
    
    const includedServices = pkg.services.map(id => allServices.find(s => s.id === id)).filter(Boolean) as Service[];

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'packages', pkg.id));
            await logActivity(pkg.projectId, 'package_deleted', { name: pkg.name }, user.uid);
            toast({ title: 'Success', description: 'Package deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete package.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className='flex justify-between items-start'>
                    <CardTitle>{pkg.name}</CardTitle>
                    <div className="flex items-center gap-1">
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className='max-w-3xl'>
                                <DialogHeader><DialogTitle>Edit Package</DialogTitle></DialogHeader>
                                <PackageForm pkg={pkg} project={project} services={allServices} closeForm={() => setIsEditOpen(false)} />
                            </DialogContent>
                        </Dialog>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the package. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                <CardDescription>{pkg.description}</CardDescription>
                <div className='flex gap-2 pt-2'>
                    <Badge variant="secondary">{pkg.duration}</Badge>
                    {pkg.custom && <Badge variant="outline">Custom</Badge>}
                </div>
            </CardHeader>
            <CardContent>
                <h4 className='font-semibold text-sm mb-2'>Included Services:</h4>
                <ul className='space-y-1 text-sm text-muted-foreground'>
                    {includedServices.map(s => <li key={s.id} className='flex items-center gap-2'><ArrowRight className='h-3 w-3'/>{s.name}</li>)}
                </ul>
            </CardContent>
            <CardFooter className='flex-col items-start gap-4'>
                <div>
                    <p className='text-sm text-muted-foreground'>Price</p>
                    <p className='text-xl font-bold'>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: pkg.currency }).format(pkg.price)}
                    </p>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">Discount Calculator</Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-96'>
                        <DiscountCalculator pkg={pkg} />
                    </PopoverContent>
                </Popover>
            </CardFooter>
        </Card>
    );
}
