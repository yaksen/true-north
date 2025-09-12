
'use client';

import { useState } from 'react';
import type { Project, Category, Service, Package } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Archive, Edit, Package as PackageIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { CategoryForm } from './category-form';
import { ServiceForm } from './service-form';
import { DataTable } from '../ui/data-table';
import { servicesColumns } from './services-columns';
import { PackageForm } from './package-form';
import { PackageCard } from './package-card';
import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
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
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';

interface ProjectProductsProps {
  project: Project;
  categories: Category[];
  services: Service[];
  packages: Package[];
}

export function ProjectProducts({ project, categories, services, packages }: ProjectProductsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isPackageFormOpen, setIsPackageFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  const filteredServices = selectedCategory ? services.filter(s => s.categoryId === selectedCategory) : services;
  
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    // Advanced: Check for dependencies before deleting
    const servicesInCategory = services.filter(s => s.categoryId === categoryId);
    if (servicesInCategory.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete category',
        description: 'This category has services assigned to it. Please re-assign or delete them first.',
      });
      return;
    }

    try {
      const categoryToDelete = categories.find(c => c.id === categoryId);
      await deleteDoc(doc(db, 'categories', categoryId));
      if (categoryToDelete) {
        await logActivity(project.id, 'category_deleted', { name: categoryToDelete.name }, user.uid);
      }
      toast({ title: 'Success', description: 'Category deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete category.' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
      {/* Categories Column */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Categories</CardTitle>
              <Dialog open={isCategoryFormOpen} onOpenChange={(isOpen) => {
                  setIsCategoryFormOpen(isOpen);
                  if (!isOpen) setEditingCategory(undefined);
              }}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost"><PlusCircle className="h-5 w-5" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
                  </DialogHeader>
                  <CategoryForm
                    projectId={project.id}
                    category={editingCategory}
                    closeForm={() => {
                        setIsCategoryFormOpen(false);
                        setEditingCategory(undefined);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-48'>
                <div className='flex flex-col gap-2'>
                    <Button
                        variant={!selectedCategory ? 'secondary' : 'ghost'}
                        onClick={() => setSelectedCategory(null)}
                        className='justify-start'
                    >
                        All Services
                    </Button>
                    {categories.map(category => (
                        <div key={category.id} className='flex items-center gap-1 group'>
                            <Button
                                variant={selectedCategory === category.id ? 'secondary' : 'ghost'}
                                onClick={() => setSelectedCategory(category.id)}
                                className='flex-1 justify-start'
                            >
                                {category.name}
                            </Button>
                            <Button size='icon' variant='ghost' className='opacity-0 group-hover:opacity-100' onClick={() => handleEditCategory(category)}><Edit className='h-4 w-4'/></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size='icon' variant='ghost' className='opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive'><Trash2 className='h-4 w-4'/></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the category. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Services Column */}
      <div className="lg:col-span-5">
        <Card className='h-full'>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Services</CardTitle>
                <CardDescription>Manage individual services offered in this project.</CardDescription>
              </div>
              <Dialog open={isServiceFormOpen} onOpenChange={setIsServiceFormOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Service</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create New Service</DialogTitle></DialogHeader>
                  <ServiceForm projectId={project.id} categories={categories} closeForm={() => setIsServiceFormOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={servicesColumns} data={filteredServices} />
          </CardContent>
        </Card>
      </div>

      {/* Packages Column */}
      <div className="lg:col-span-4">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-start">
              <div>
                <CardTitle>Packages</CardTitle>
                <CardDescription>Bundle services into fixed-price packages.</CardDescription>
              </div>
               <Dialog open={isPackageFormOpen} onOpenChange={setIsPackageFormOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Package</Button>
                </DialogTrigger>
                <DialogContent className='max-w-3xl'>
                  <DialogHeader><DialogTitle>Create New Package</DialogTitle></DialogHeader>
                  <PackageForm projectId={project.id} services={services} closeForm={() => setIsPackageFormOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-[calc(100vh-22rem)]'>
                {packages.length > 0 ? (
                    <div className='flex flex-col gap-4'>
                        {packages.map(pkg => (
                           <PackageCard key={pkg.id} pkg={pkg} allServices={services} />
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
      </div>
    </div>
  );
}
