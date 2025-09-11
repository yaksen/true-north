
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { PlusCircle, ShoppingCart, Receipt, CheckSquare, Smile, Users } from 'lucide-react';
import { type ActivityCategory, type Lead, type Service, type Package } from '@/lib/types';
import { SalesForm } from './sales-form';
import { ExpenseForm } from './expense-form';
import { TaskForm } from './task-form';

interface LogActivityDialogProps {
  leads: Lead[];
  services: Service[];
  packages: Package[];
}

const activityCategories: { name: ActivityCategory, icon: React.ElementType }[] = [
    { name: 'Sales', icon: ShoppingCart },
    { name: 'Expenses', icon: Receipt },
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Customer Service', icon: Smile },
    { name: 'HR & Team', icon: Users },
];

export function LogActivityDialog({ leads, services, packages }: LogActivityDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedCategory(null);
    }
  };

  const renderForm = () => {
    switch (selectedCategory) {
      case 'Sales':
        return <SalesForm leads={leads} services={services} packages={packages} closeDialog={handleOpenChange} />;
      case 'Expenses':
        return <ExpenseForm closeDialog={handleOpenChange} />;
      case 'Tasks':
        return <TaskForm leads={leads} closeDialog={handleOpenChange} />;
      default:
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {activityCategories.map(({name, icon: Icon}) => (
                    <Button key={name} variant="outline" className="h-20 flex-col gap-2" onClick={() => setSelectedCategory(name)}>
                        <Icon className="h-6 w-6" />
                        <span>{name}</span>
                    </Button>
                ))}
            </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          Log Activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedCategory ? `Log ${selectedCategory}` : 'Select Activity Type'}</DialogTitle>
          <DialogDescription>
            {selectedCategory ? `Fill in the details for this ${selectedCategory.slice(0,-1).toLowerCase()} activity.` : 'What type of activity would you like to log?'}
          </DialogDescription>
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  );
}
