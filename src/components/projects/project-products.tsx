
'use client';

import { useState, useMemo } from 'react';
import type { Project, Category, Service, Package } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowRight, Edit, Package as PackageIcon, PlusCircle, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { CategoryForm } from './category-form';
import { ServiceForm } from './service-form';
import { DataTable } from '../ui/data-table';
import { getServicesColumns } from './services-columns';
import { PackageForm } from './package-form';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { getCategoriesColumns } from './category-columns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/activity-log';

interface ProjectProductsProps {
  project: Project;
  categories: Category[];
  services: Service[];
  packages: Package[];
}

export function ProjectProducts({ project, categories, services, packages }: ProjectProductsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isPackageFormOpen, setIsPackageFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | undefined>(undefined);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string | 'all'>('all');
  const [packageTypeFilter, setPackageTypeFilter] = useState<'all' | 'custom' | 'fixed'>('all');


  const categoryColumns = useMemo(() => getCategoriesColumns({ 
    onEdit: () => {}, 
    onDelete: () => {} 
  }), []);
  
  const serviceColumns = useMemo(() => getServicesColumns({ categories, project }), [categories, project]);

  const filteredServices = useMemo(() => {
    if (serviceCategoryFilter === 'all') return services;
    return services.filter(s => s.categoryId === serviceCategoryFilter);
  }, [services, serviceCategoryFilter]);

  const filteredPackages = useMemo(() => {
    if (packageTypeFilter === 'all') return packages;
    if (packageTypeFilter === 'custom') return packages.filter(p => p.custom);
    if (packageTypeFilter === 'fixed') return packages.filter(p => !p.custom);
    return packages;
  }, [packages, packageTypeFilter]);

  const handleEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    setIsPackageFormOpen(true);
  };
  
  const handleCreateNewPackage = () => {
    setEditingPackage(undefined);
    setIsPackageFormOpen(true);
  }

  const handleDeletePackage = async (pkg: Package) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'packages', pkg.id));
        await logActivity(pkg.projectId, 'package_deleted', { name: pkg.name }, user.uid);
        toast({ title: 'Success', description: 'Package deleted.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete package.' });
    }
  };

  const getFormattedDuration = (duration: string) => {
    if (!duration) return '';
    const [value, unit] = duration.split(' ');
    if (!value || !unit) return duration;
    const formattedUnit = Number(value) === 1 ? unit.replace(/s$/, '') : unit;
    return `${value} ${formattedUnit}`;
  };

  const ServiceToolbar = () => (
    <div className="flex items-center gap-2">
        <Select value={serviceCategoryFilter} onValueChange={(value) => setServiceCategoryFilter(value)}>
            <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Filter by category..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        {serviceCategoryFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setServiceCategoryFilter('all')}>
                Clear Filter
            </Button>
        )}
    </div>
  );

  return (
    <Tabs defaultValue="services" className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
            <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> New Category</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Create New Category</DialogTitle></DialogHeader><CategoryForm projectId={project.id} closeForm={() => setIsCategoryFormOpen(false)} /></DialogContent>
            </Dialog>
            <Dialog open={isServiceFormOpen} onOpenChange={setIsServiceFormOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> New Service</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Create New Service</DialogTitle></DialogHeader><ServiceForm project={project} categories={categories} closeForm={() => setIsServiceFormOpen(false)} /></DialogContent>
            </Dialog>
            <Dialog open={isPackageFormOpen} onOpenChange={setIsPackageFormOpen}>
                <DialogTrigger asChild><Button size="sm" onClick={handleCreateNewPackage}><PlusCircle className="mr-2 h-4 w-4" /> New Package</Button></DialogTrigger>
                <DialogContent className='max-w-3xl'>
                    <DialogHeader><DialogTitle>{editingPackage ? "Edit" : "Create"} Package</DialogTitle></DialogHeader>
                    <PackageForm 
                        project={project} 
                        services={services} 
                        pkg={editingPackage}
                        closeForm={() => setIsPackageFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <TabsContent value="categories">
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>Manage the categories for your services.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={categoryColumns} data={categories} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="services">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Manage individual services offered in this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={serviceColumns} data={filteredServices} toolbar={<ServiceToolbar />} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="packages">
         <Card>
          <CardHeader>
            <div className='flex justify-between items-center'>
                <div>
                    <CardTitle>Packages</CardTitle>
                    <CardDescription>Bundle services into fixed-price packages.</CardDescription>
                </div>
                <div className='flex items-center gap-1 p-1 bg-muted rounded-lg'>
                    {(['all', 'custom', 'fixed'] as const).map(filter => (
                        <Button 
                            key={filter} 
                            size='sm' 
                            variant={packageTypeFilter === filter ? 'secondary' : 'ghost'}
                            onClick={() => setPackageTypeFilter(filter)}
                            className='capitalize'
                        >
                            {filter}
                        </Button>
                    ))}
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-[calc(100vh-22rem)]'>
                {filteredPackages.length > 0 ? (
                    <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {filteredPackages.map(pkg => {
                            const includedServices = pkg.services.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[];
                            return (
                            <Card key={pkg.id}>
                                <CardHeader>
                                    <div className='flex justify-between items-start'>
                                        <CardTitle>{pkg.name}</CardTitle>
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="ghost" onClick={() => handleEditPackage(pkg)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the package. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePackage(pkg)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                    <CardDescription>{pkg.description}</CardDescription>
                                    <div className='flex gap-2 pt-2'>
                                        <Badge variant="secondary">{getFormattedDuration(pkg.duration)}</Badge>
                                        {pkg.custom && <Badge variant="outline">Custom</Badge>}
                                        {pkg.discountPercentage !== 0 && (
                                            <Badge variant={pkg.discountPercentage > 0 ? "default" : "destructive"}>
                                                {pkg.discountPercentage > 0 ? `${pkg.discountPercentage}% off` : `${-pkg.discountPercentage}% markup`}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <h4 className='font-semibold text-sm mb-2'>Included Services:</h4>
                                    <ul className='space-y-1 text-sm text-muted-foreground'>
                                        {includedServices.map(s => <li key={s.id} className='flex items-center gap-2'><ArrowRight className='h-3 w-3'/>{s.name}</li>)}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <div>
                                        <p className='text-sm text-muted-foreground'>Price</p>
                                        <p className='text-xl font-bold'>
                                            {formatCurrency(pkg.price, pkg.currency)}
                                        </p>
                                    </div>
                                </CardFooter>
                            </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <PackageIcon className="mx-auto h-12 w-12" />
                        <p className="mt-4">No packages found for the selected filter.</p>
                    </div>
                )}
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
