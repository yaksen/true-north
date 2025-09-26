

'use client';

import { useState, useMemo } from 'react';
import type { Project, Category, Service, Package, Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { CategoryForm } from './category-form';
import { ServiceForm } from './service-form';
import { PackageForm } from './package-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProductForm } from './product-form';
import { useCurrency } from '@/context/CurrencyContext';
import { PackageCard } from './package-card';
import { CategoriesToolbar } from './categories-toolbar';
import { ServicesToolbar } from './services-toolbar';
import { ProductsToolbar } from './products-toolbar';
import { PackagesToolbar } from './packages-toolbar';
import { ScrollArea } from '../ui/scroll-area';
import { CategoryCard } from './category-card';
import { ServiceCard } from './service-card';
import { ProductCard } from './product-card';

interface ProjectProductsProps {
  project: Project;
  categories: Category[];
  services: Service[];
  products: Product[];
  packages: Package[];
}

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
  
  const [categoryFilters, setCategoryFilters] = useState({ search: '' });
  const [serviceFilters, setServiceFilters] = useState({ search: '', categoryId: 'all' });
  const [productFilters, setProductFilters] = useState({ search: '', categoryId: 'all' });
  const [packageFilters, setPackageFilters] = useState({ search: '', type: 'all' as 'all' | 'custom' | 'fixed' });

  const handleStar = (collectionName: 'categories' | 'services' | 'products' | 'packages') => async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, collectionName, id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const filteredCategories = useMemo(() => {
    return [...categories]
      .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || a.name.localeCompare(b.name))
      .filter(c => c.name.toLowerCase().includes(categoryFilters.search.toLowerCase()));
  }, [categories, categoryFilters]);
  
  const filteredServices = useMemo(() => {
    return [...services]
        .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || a.name.localeCompare(b.name))
        .filter(s => {
        const categoryMatch = serviceFilters.categoryId === 'all' || s.categoryId === serviceFilters.categoryId;
        const searchMatch = !serviceFilters.search || s.name.toLowerCase().includes(serviceFilters.search.toLowerCase());
        return categoryMatch && searchMatch;
    });
  }, [services, serviceFilters]);
  
  const filteredProducts = useMemo(() => {
    return [...products]
        .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || a.name.localeCompare(b.name))
        .filter(p => {
        const categoryMatch = productFilters.categoryId === 'all' || p.categoryId === productFilters.categoryId;
        const searchMatch = !productFilters.search || p.name.toLowerCase().includes(productFilters.search.toLowerCase());
        return categoryMatch && searchMatch;
    });
  }, [products, productFilters]);

  const filteredPackages = useMemo(() => {
    return [...packages]
      .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || a.name.localeCompare(b.name))
      .filter(p => {
        const typeMatch = packageFilters.type === 'all' || (p.custom === (packageFilters.type === 'custom'));
        const searchMatch = p.name.toLowerCase().includes(packageFilters.search.toLowerCase()) ||
                            p.description.toLowerCase().includes(packageFilters.search.toLowerCase());
        return typeMatch && searchMatch;
    });
  }, [packages, packageFilters]);

  const handleEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    setIsPackageFormOpen(true);
  };
  
  const handleCreateNewPackage = () => {
    setEditingPackage(undefined);
    setIsPackageFormOpen(true);
  }

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
            <DialogTrigger asChild><Button size="sm" onClick={handleCreateNewPackage}><PlusCircle className="mr-2 h-4 w-4" /> Package</Button></DialogTrigger>
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
            <CategoriesToolbar onFilterChange={setCategoryFilters} />
            <ScrollArea className="h-[calc(100vh-35rem)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                {filteredCategories.map(category => (
                  <CategoryCard key={category.id} category={category} onStar={handleStar('categories')} />
                ))}
              </div>
            </ScrollArea>
            {filteredCategories.length === 0 && <p className='text-center text-muted-foreground py-12'>No categories found.</p>}
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
            <ServicesToolbar categories={categories} onFilterChange={setServiceFilters} />
             <ScrollArea className="h-[calc(100vh-35rem)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                {filteredServices.map(service => (
                  <ServiceCard key={service.id} service={service} project={project} categories={categories} onStar={handleStar('services')} displayCurrency={displayCurrency} />
                ))}
              </div>
            </ScrollArea>
             {filteredServices.length === 0 && <p className='text-center text-muted-foreground py-12'>No services found.</p>}
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
            <ProductsToolbar categories={categories} onFilterChange={setProductFilters} />
            <ScrollArea className="h-[calc(100vh-35rem)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} project={project} categories={categories} onStar={handleStar('products')} displayCurrency={displayCurrency} />
                ))}
              </div>
            </ScrollArea>
            {filteredProducts.length === 0 && <p className='text-center text-muted-foreground py-12'>No products found.</p>}
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
            </div>
          </CardHeader>
          <CardContent>
            <PackagesToolbar onFilterChange={setPackageFilters} />
            <ScrollArea className="h-[calc(100vh-35rem)]">
              <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-1 mt-4'>
                  {filteredPackages.map(pkg => (
                      <PackageCard 
                          key={pkg.id} 
                          pkg={pkg} 
                          project={project} 
                          allServices={services} 
                          allProducts={products} 
                          onStar={handleStar('packages')}
                      />
                  ))}
              </div>
            </ScrollArea>
            {filteredPackages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    <p>No packages found for the selected filters.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
