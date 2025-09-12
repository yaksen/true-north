
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, Project } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Trash2, Crown, Loader2 } from 'lucide-react';
import { logActivity } from '@/lib/activity-log';
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

interface MembersListProps {
  project: Project;
}

export function MembersList({ project }: MembersListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (project.members.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('id', 'in', project.members));
        const querySnapshot = await getDocs(q);
        const membersData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
        setMembers(membersData);
      } catch (error) {
        console.error("Error fetching members:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch project members.' });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [project.members, toast]);

  const handleRemoveMember = async (memberId: string) => {
    if (!user || user.uid !== project.ownerUid) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only the project owner can remove members.' });
      return;
    }
    if (memberId === project.ownerUid) {
      toast({ variant: 'destructive', title: 'Invalid Action', description: 'The project owner cannot be removed.' });
      return;
    }

    setIsRemoving(memberId);
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { members: arrayRemove(memberId) });

      const removedMember = members.find(m => m.id === memberId);
      if (removedMember) {
        await logActivity(project.id, 'member_removed', { email: removedMember.email }, user.uid);
      }
      
      toast({ title: 'Success', description: 'Member removed from the project.' });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove member.' });
    } finally {
      setIsRemoving(null);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      return name[0].toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'U';
  };
  
  if (loading) {
    return <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <div key={member.id} className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.photoURL} />
              <AvatarFallback>{getInitials(member.name, member.email)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{member.name || 'Unnamed User'}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {member.id === project.ownerUid ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Crown className="h-4 w-4 text-amber-500" />
                Owner
              </div>
            ) : (
                user?.uid === project.ownerUid && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isRemoving === member.id}>
                                {isRemoving === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove {member.email} from the project. They will lose access to all project data.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                                Remove Member
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
