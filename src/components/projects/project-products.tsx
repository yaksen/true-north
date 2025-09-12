
'use client';

import { useState, useMemo } from 'react';
import type { Project, Category, Service, Package } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Package as PackageIcon, PlusCircle, SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { CategoryForm } from './category-form';
import { ServiceForm } from './service-form';
import { DataTable } from '../ui/data-table';
import { getServicesColumns } from './services-columns';
import { PackageForm } from './package-form';
import { PackageCard } from './package-card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { getCategoriesColumns } from './category-columns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ProjectProductsProps {
  project: Project;
  categories: Category[];
  services: Service[];
  packages: Package[];
}

export function ProjectProducts({ project, categories, services, packages }: ProjectProductsProps) {
  const { user } = useAuth();
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isPackageFormOpen, setIsPackageFormOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

  const categoryColumns = useMemo(() => getCategoriesColumns({ 
    onEdit: () => {}, 
    onDelete: () => {} 
  }), []);
  
  const serviceColumns = useMemo(() => getServicesColumns({ categories, project }), [categories, project]);

  const filteredServices = useMemo(() => {
    if (categoryFilter === 'all') return services;
    return services.filter(s => s.categoryId === categoryFilter);
  }, [services, categoryFilter]);

  const ServiceToolbar = () => (
    <div className="flex items-center gap-2">
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)}>
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
        {categoryFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('all')}>
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
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Package</Button></DialogTrigger>
                <DialogContent className='max-w-3xl'><DialogHeader><DialogTitle>Create New Package</DialogTitle></DialogHeader><PackageForm project={project} services={services} closeForm={() => setIsPackageFormOpen(false)} /></DialogContent>
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
            <CardTitle>Packages</CardTitle>
            <CardDescription>Bundle services into fixed-price packages.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-[calc(100vh-22rem)]'>
                {packages.length > 0 ? (
                    <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {packages.map(pkg => (
                           <PackageCard key={pkg.id} pkg={pkg} project={project} allServices={services} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <PackageIcon className="mx-auto h-12 w-12" />
                        <p className="mt-4">No packages created yet.</p>
                    </div>
                )}
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
