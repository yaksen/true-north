
'use client';

import { useState, useMemo } from 'react';
import type { Project, Category, Service, Package, Product } from '@/lib/types';
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
import { deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/activity-log';
import { ProductForm } from './product-form';
import { getProductsColumns } from './product-columns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useCurrency } from '@/context/CurrencyContext';
import { PackageCard } from './package-card';

interface ProjectProductsProps {
  project: Project;
  categories: Category[];
  services: Service[];
  products: Product[];
  packages: Package[];
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};


export function ProjectProducts({ project, categories, services, products, packages }: ProjectProductsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { globalCurrency } = useCurrency();
  const displayCurrency = globalCurrency || project.currency;

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isPackageFormOpen, setIsPackageFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | undefined>(undefined);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string | 'all'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string | 'all'>('all');
  const [packageTypeFilter, setPackageTypeFilter] = useState<'all' | 'custom' | 'fixed'>('all');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState<string | 'all'>('all');
  const [packageServiceFilter, setPackageServiceFilter] = useState<string | 'all'>('all');

  const handleStar = (collectionName: 'categories' | 'services' | 'products' | 'packages') => async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, collectionName, id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const handleDeleteSelected = (collectionName: 'categories' | 'services' | 'products') => async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.delete(doc(db, collectionName, id));
    });
    try {
        await batch.commit();
        toast({ title: "Success", description: `${ids.length} item(s) deleted.`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: `Could not delete selected items.`})
    }
  }

  const categoryColumns = useMemo(() => getCategoriesColumns(handleStar('categories')), []);
  const serviceColumns = useMemo(() => getServicesColumns({ categories, project, onStar: handleStar('services') }, displayCurrency), [categories, project, displayCurrency]);
  const productColumns = useMemo(() => getProductsColumns({ categories, onStar: handleStar('products') }, displayCurrency), [categories, displayCurrency]);


  const filteredServices = useMemo(() => {
    if (serviceCategoryFilter === 'all') return services;
    return services.filter(s => s.categoryId === serviceCategoryFilter);
  }, [services, serviceCategoryFilter]);
  
  const filteredProducts = useMemo(() => {
    if (productCategoryFilter === 'all') return products;
    return products.filter(p => p.categoryId === productCategoryFilter);
  }, [products, productCategoryFilter]);

  const filteredPackages = useMemo(() => {
    let tempPackages = packages;

    // Filter by type (custom/fixed)
    if (packageTypeFilter === 'custom') {
      tempPackages = tempPackages.filter(p => p.custom);
    } else if (packageTypeFilter === 'fixed') {
      tempPackages = tempPackages.filter(p => !p.custom);
    }

    // Filter by category
    if (packageCategoryFilter !== 'all') {
      const servicesInCategory = services.filter(s => s.categoryId === packageCategoryFilter).map(s => s.id);
      tempPackages = tempPackages.filter(p => p.services.some(serviceId => servicesInCategory.includes(serviceId)));
    }

    // Filter by specific service
    if (packageServiceFilter !== 'all') {
      tempPackages = tempPackages.filter(p => p.services.includes(packageServiceFilter));
    }
    
    return tempPackages;
  }, [packages, services, packageTypeFilter, packageCategoryFilter, packageServiceFilter]);

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

  const ProductToolbar = () => (
    <div className="flex items-center gap-2">
        <Select value={productCategoryFilter} onValueChange={(value) => setProductCategoryFilter(value)}>
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
        {productCategoryFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setProductCategoryFilter('all')}>
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
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Category</Button></DialogTrigger>
            <DialogContent className='max-w-4xl'><DialogHeader><DialogTitle>Create New Category</DialogTitle></DialogHeader><CategoryForm projectId={project.id} closeForm={() => setIsCategoryFormOpen(false)} /></DialogContent>
          </Dialog>
          <Dialog open={isServiceFormOpen} onOpenChange={setIsServiceFormOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Service</Button></DialogTrigger>
            <DialogContent className='max-w-4xl'><DialogHeader><DialogTitle>Create New Service</DialogTitle></DialogHeader><ServiceForm project={project} categories={categories} closeForm={() => setIsServiceFormOpen(false)} /></DialogContent>
          </Dialog>
          <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Product</Button></DialogTrigger>
            <DialogContent className='max-w-4xl'><DialogHeader><DialogTitle>Create New Product</DialogTitle></DialogHeader><ProductForm project={project} categories={categories} closeForm={() => setIsProductFormOpen(false)} /></DialogContent>
          </Dialog>
          <Dialog open={isPackageFormOpen} onOpenChange={setIsPackageFormOpen}>
            <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Package</Button></DialogTrigger>
            <DialogContent className='max-w-4xl'>
                <DialogHeader><DialogTitle>{editingPackage ? "Edit" : "Create"} Package</DialogTitle></DialogHeader>
                <PackageForm 
                    project={project} 
                    services={services} 
                    products={products}
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
            <CardTitle>Product & Service Categories</CardTitle>
            <CardDescription>Manage the categories for your services and products.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={categoryColumns} data={categories} onDeleteSelected={handleDeleteSelected('categories')} />
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
            <DataTable columns={serviceColumns} data={filteredServices} toolbar={<ServiceToolbar />} onDeleteSelected={handleDeleteSelected('services')} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="products">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Manage individual products offered in this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={productColumns} data={filteredProducts} toolbar={<ProductToolbar />} onDeleteSelected={handleDeleteSelected('products')} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="packages">
         <Card>
          <CardHeader>
            <div className='flex justify-between items-center'>
                <div>
                    <CardTitle>Packages</CardTitle>
                    <CardDescription>Bundle services and products into fixed-price packages.</CardDescription>
                </div>
                <div className='flex items-center gap-2'>
                  <Select value={packageCategoryFilter} onValueChange={(value) => setPackageCategoryFilter(value)}>
                      <SelectTrigger className="w-40 h-9 text-sm">
                          <SelectValue placeholder="Filter by category..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Select value={packageServiceFilter} onValueChange={(value) => setPackageServiceFilter(value)}>
                      <SelectTrigger className="w-40 h-9 text-sm">
                          <SelectValue placeholder="Filter by service..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Services</SelectItem>
                          {services.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
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
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-[calc(100vh-22rem)]'>
                {filteredPackages.length > 0 ? (
                    <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {filteredPackages.map(pkg => (
                            <PackageCard 
                                key={pkg.id} 
                                pkg={pkg} 
                                project={project} 
                                allServices={services} 
                                allProducts={products} 
                            />
                        ))}
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
