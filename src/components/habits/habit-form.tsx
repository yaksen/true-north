

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Habit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { cn } from '@/lib/utils';
import { Slider } from '../ui/slider';

const colorPalette = [
    '#f87171', '#fb923c', '#facc15', '#a3e635', '#4ade80', '#34d399',
    '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa',
    '#c084fc', '#e879f9', '#f472b6', '#fb7185'
];

const formSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  emoji: z.string().min(1, 'Emoji is required.'),
  type: z.enum(['good', 'bad']),
  frequency: z.enum(['daily', 'weekly']),
  target: z.number().min(0),
  color: z.string().min(1, 'Color is required.'),
  reward: z.string().optional(),
  punishment: z.string().optional(),
});

type HabitFormValues = z.infer<typeof formSchema>;

interface HabitFormProps {
  habit?: Habit;
  closeForm: () => void;
}

export function HabitForm({ habit, closeForm }: HabitFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: habit || {
      name: '',
      emoji: '🎯',
      type: 'good',
      frequency: 'daily',
      target: 1,
      color: '#4ade80',
      reward: '',
      punishment: '',
    },
  });

  const onSubmit = async (values: HabitFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (habit) {
        const habitRef = doc(db, 'habits', habit.id);
        await updateDoc(habitRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Habit updated.' });
      } else {
        await addDoc(collection(db, 'habits'), {
          ...values,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Habit created.' });
      }
      closeForm();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequency = form.watch('frequency');
  const habitType = form.watch('type');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Habit Name</FormLabel><FormControl><Input placeholder="e.g. Read for 15 minutes" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="emoji" render={({ field }) => (<FormItem><FormLabel>Emoji</FormLabel><FormControl><Input className='w-20 text-center text-xl' {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem className="space-y-3"><FormLabel>Type of Habit</FormLabel>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="good" id="good" /></FormControl>
                            <FormLabel htmlFor="good" className="font-normal">Good Habit</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="bad" id="bad" /></FormControl>
                            <FormLabel htmlFor="bad" className="font-normal">Bad Habit</FormLabel>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
            <FormMessage />
            </FormItem>
        )} />
        
        {habitType === 'good' ? (
             <FormField control={form.control} name="reward" render={({ field }) => (<FormItem><FormLabel>Reward (Optional)</FormLabel><FormControl><Input placeholder="e.g. Watch one episode of a show" {...field} /></FormControl><FormMessage /></FormItem>)} />
        ) : (
            <FormField control={form.control} name="punishment" render={({ field }) => (<FormItem><FormLabel>Punishment (Optional)</FormLabel><FormControl><Input placeholder="e.g. No dessert tonight" {...field} /></FormControl><FormMessage /></FormItem>)} />
        )}

         <FormField control={form.control} name="frequency" render={({ field }) => (
            <FormItem className="space-y-3"><FormLabel>Frequency</FormLabel>
                 <FormControl>
                    <ToggleGroup type="single" onValueChange={field.onChange} defaultValue={field.value} variant="outline">
                        <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
                        <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
                    </ToggleGroup>
                </FormControl>
            <FormMessage />
            </FormItem>
        )} />
        <FormField
          control={form.control}
          name="target"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Daily Target: {field.value === 0 ? 'Unlimited' : `${field.value} time(s)`}</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[field.value]}
                  onValueChange={(vals) => field.onChange(vals[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="color" render={({ field }) => (
            <FormItem><FormLabel>Color</FormLabel>
                <FormControl>
                    <div className='grid grid-cols-8 gap-2'>
                        {colorPalette.map((color) => (
                            <button type="button" key={color} onClick={() => field.onChange(color)} className={cn("h-8 w-8 rounded-full border flex items-center justify-center transition-transform hover:scale-110", field.value === color && "ring-2 ring-ring ring-offset-2")} style={{ backgroundColor: color }} />
                        ))}
                    </div>
                </FormControl>
            </FormItem>
        )} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {habit ? 'Update' : 'Create'} Habit
          </Button>
        </div>
      </form>
    </Form>
  );
}
