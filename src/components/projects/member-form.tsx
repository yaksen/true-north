
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Project, ProjectMember, ProjectRole, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { logActivity } from '@/lib/activity-log';

const projectRoles: ProjectRole[] = ['editor', 'viewer'];

const formSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(2, 'Display name is required.'),
  role: z.enum(['owner', 'editor', 'viewer']),
});

type MemberFormValues = z.infer<typeof formSchema>;

interface MemberFormProps {
  project: Project;
  existingMember?: ProjectMember;
  closeForm: () => void;
}

export function MemberForm({ project, existingMember, closeForm }: MemberFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingMember ? {
      displayName: existingMember.displayName,
      role: existingMember.role,
    } : {
      email: '',
      displayName: '',
      role: 'viewer',
    },
  });

  async function onSubmit(values: MemberFormValues) {
    if (!user || user.uid !== project.ownerUid) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const projectRef = doc(db, 'projects', project.id);
      
      if (existingMember) {
        // Editing an existing member's role or displayName
        const updatedMembers = project.members.map(m =>
          m.uid === existingMember.uid ? { ...m, displayName: values.displayName, role: values.role } : m
        );
        // No change to memberUids is needed when editing
        await updateDoc(projectRef, { members: updatedMembers });
        await logActivity(project.id, 'member_updated' as any, { email: existingMember.email, role: values.role }, user.uid);
        toast({ title: 'Success', description: 'Member updated.' });

      } else {
        // Adding a new member
        if (!values.email) {
            toast({ variant: 'destructive', title: 'Email required', description: 'Please enter an email to add a new member.' });
            setIsSubmitting(false);
            return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', values.email));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            toast({ variant: 'destructive', title: 'User not found' });
            setIsSubmitting(false);
            return;
        }
        
        const userToAdd = userSnapshot.docs[0].data() as UserProfile;

        if (project.memberUids.includes(userToAdd.id)) {
            toast({ variant: 'destructive', title: 'User already in project' });
            setIsSubmitting(false);
            return;
        }

        const newMember: ProjectMember = {
            uid: userToAdd.id,
            email: userToAdd.email,
            displayName: values.displayName,
            photoURL: userToAdd.photoURL,
            role: values.role,
        };

        const updatedMembers = [...project.members, newMember];
        const updatedMemberUids = [...project.memberUids, newMember.uid];
        
        await updateDoc(projectRef, { 
            members: updatedMembers,
            memberUids: updatedMemberUids 
        });
        
        await logActivity(project.id, 'member_added', { email: values.email, role: values.role }, user.uid);
        toast({ title: 'Success', description: 'Member added.' });
      }

      closeForm();
    } catch (error) {
      console.error('Error updating member:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!existingMember && (
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>User Email</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter email of the user to add" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Name shown within this project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={existingMember?.role === 'owner'}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="owner" disabled>Owner</SelectItem>
                        {projectRoles.map(role => (
                            <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingMember ? 'Update Member' : 'Add Member'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
