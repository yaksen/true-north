
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectMember, ProjectRole } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Trash2, Crown, Loader2, Edit } from 'lucide-react';
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { MemberForm } from './member-form';
import { Badge } from '../ui/badge';

interface MembersListProps {
  project: Project;
}

export function MembersList({ project }: MembersListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);

  const handleRemoveMember = async (memberToRemove: ProjectMember) => {
    if (!user || user.uid !== project.ownerUid) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only the project owner can remove members.' });
      return;
    }
    if (memberToRemove.uid === project.ownerUid) {
      toast({ variant: 'destructive', title: 'Invalid Action', description: 'The project owner cannot be removed.' });
      return;
    }

    setIsRemoving(memberToRemove.uid);
    try {
      const projectRef = doc(db, 'projects', project.id);
      const updatedMembers = project.members.filter(m => m.uid !== memberToRemove.uid);
      const updatedMemberUids = project.memberUids.filter(uid => uid !== memberToRemove.uid);

      await updateDoc(projectRef, { 
          members: updatedMembers,
          memberUids: updatedMemberUids,
      });
      
      await logActivity(project.id, 'member_removed', { email: memberToRemove.email }, user.uid);
      
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
  
  const sortedMembers = [...project.members].sort((a, b) => {
    if (a.role === 'owner') return -1;
    if (b.role === 'owner') return 1;
    const nameA = a.displayName || a.email || '';
    const nameB = b.displayName || b.email || '';
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-2">
      {sortedMembers.map((member) => (
        <div key={member.uid} className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.photoURL} />
              <AvatarFallback>{getInitials(member.displayName, member.email)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{member.displayName}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="capitalize">{member.role}</Badge>
            {user?.uid === project.ownerUid && member.role !== 'owner' && (
                <>
                    <Dialog open={!!editingMember && editingMember.uid === member.uid} onOpenChange={(isOpen) => !isOpen && setEditingMember(null)}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingMember(member)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Member</DialogTitle>
                            </DialogHeader>
                            <MemberForm
                                project={project}
                                existingMember={member}
                                closeForm={() => setEditingMember(null)}
                            />
                        </DialogContent>
                    </Dialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isRemoving === member.uid}>
                                {isRemoving === member.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
                            <AlertDialogAction onClick={() => handleRemoveMember(member)}>
                                Remove Member
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
             {member.role === 'owner' && <Crown className="h-5 w-5 text-amber-500" />}
          </div>
        </div>
      ))}
       <Dialog open={!!editingMember} onOpenChange={(isOpen) => !isOpen && setEditingMember(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
            </DialogHeader>
            {editingMember && (
                <MemberForm
                    project={project}
                    existingMember={editingMember}
                    closeForm={() => setEditingMember(null)}
                />
            )}
        </DialogContent>
       </Dialog>
    </div>
  );
}
