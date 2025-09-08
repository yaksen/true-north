
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { UserProfile, CrmSettings } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/users/columns';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const settingsSchema = z.object({
    isSignupEnabled: z.boolean(),
    maxTasks: z.coerce.number().min(1, 'Must be at least 1'),
    maxLeads: z.coerce.number().min(1, 'Must be at least 1'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;


export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        isSignupEnabled: true,
        maxLeads: 100,
        maxTasks: 100,
    }
  });

  useEffect(() => {
    if (!user) return;
    
    // This logic is now handled in the layout, but as a double-check.
    if (user?.profile?.role !== 'admin' && user?.profile?.role !== 'manager') {
      router.push('/dashboard');
      return;
    }

    setLoading(true);
    // Fetch users
    const usersQuery = query(collection(db, `users`));
    const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
      const usersData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({ 
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastLogin: data.lastLogin?.toDate(),
        } as UserProfile);
      });
      setUsers(usersData);
      setLoading(false);
    });
    
    // Fetch settings only if user is admin
    let unsubscribeSettings = () => {};
    if (user.profile?.role === 'admin') {
        const settingsRef = doc(db, 'settings', 'crm');
        unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as CrmSettings;
                setSettings(data);
                reset(data); // Update form with fetched data
            } else {
                // Create default settings if they don't exist
                const defaultSettings: CrmSettings = { isSignupEnabled: true, maxLeads: 100, maxTasks: 100 };
                setDoc(settingsRef, defaultSettings);
                setSettings(defaultSettings);
                reset(defaultSettings);
            }
        });
    }


    return () => {
        unsubscribeUsers();
        unsubscribeSettings();
    };
  }, [user, router, reset]);

  if (loading || !user) {
    return (
        <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const handleSettingsUpdate = async (data: SettingsFormValues) => {
    if (user?.profile?.role !== 'admin') {
        toast({ variant: 'destructive', title: 'Permission Denied' });
        return;
    }
    try {
        const settingsRef = doc(db, 'settings', 'crm');
        await updateDoc(settingsRef, data);
        toast({ title: "Success", description: "Settings updated successfully." });
    } catch (error) {
        console.error("Error updating settings: ", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not update settings." });
    }
  };

  const columns = getColumns({ setUsers, currentUser: user });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">User Management</h1>
      </div>
      
      {user.profile?.role === 'admin' && (
        <Card>
            <CardHeader>
                <CardTitle>Global Settings</CardTitle>
                <CardDescription>Manage application-wide settings and limits.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
                <form onSubmit={handleSubmit(handleSettingsUpdate)} className="space-y-6">
                    <div className="flex items-center space-x-4 rounded-md border p-4">
                        <AlertTriangle />
                        <div className='flex-grow'>
                            <Label htmlFor="signup-switch" className="font-bold">New User Signups</Label>
                            <p className="text-sm text-muted-foreground">
                                Globally enable or disable new user registrations.
                            </p>
                        </div>
                        <Controller
                            name="isSignupEnabled"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="signup-switch"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                            <Label htmlFor="max-leads">Max Leads per User</Label>
                            <Controller
                                name="maxLeads"
                                control={control}
                                render={({ field }) => (
                                    <Input id="max-leads" type="number" {...field} />
                                )}
                            />
                            {errors.maxLeads && <p className="text-sm text-destructive mt-1">{errors.maxLeads.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="max-tasks">Max Tasks per User</Label>
                            <Controller
                                name="maxTasks"
                                control={control}
                                render={({ field }) => (
                                    <Input id="max-tasks" type="number" {...field} />
                                )}
                            />
                            {errors.maxTasks && <p className="text-sm text-destructive mt-1">{errors.maxTasks.message}</p>}
                        </div>
                    </div>

                    <div className='flex justify-end'>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Settings
                        </Button>
                    </div>
                </form>
                )}
            </CardContent>
        </Card>
      )}


      <DataTable columns={columns} data={users} filterColumn="email" filterColumnName="Email" />
    </>
  );
}
