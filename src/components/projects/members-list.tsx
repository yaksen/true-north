
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectMember, ProjectRole } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Trash2, Crown, Loader2, Edit, UserCog } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';


interface MembersListProps {
  project: Project;
}

export function MembersList({ project }: MembersListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);

  const isOwner = user?.uid === project.ownerUid;

  const handleRemoveMember = async (memberToRemove: ProjectMember) => {
    if (!isOwner) {
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
  
  const handleOwnershipTransfer = async (newOwner: ProjectMember) => {
    if (!isOwner) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }
    if (newOwner.uid === project.ownerUid) return;

    try {
      const projectRef = doc(db, 'projects', project.id);
      const updatedMembers = project.members.map(m => {
        if (m.uid === project.ownerUid) return { ...m, role: 'editor' as ProjectRole };
        if (m.uid === newOwner.uid) return { ...m, role: 'owner' as ProjectRole };
        return m;
      });

      await updateDoc(projectRef, {
        ownerUid: newOwner.uid,
        members: updatedMembers,
      });

      await logActivity(project.id, 'project_updated', { message: `Ownership transferred to ${newOwner.email}` }, user.uid);
      toast({ title: 'Success', description: `Ownership transferred to ${newOwner.displayName}.` });
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not transfer ownership.' });
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length > 1 && nameParts[0] && nameParts[1]) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
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
            {isOwner && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setEditingMember(member)}>
                            <Edit className='mr-2 h-4 w-4' />
                            Edit Display Name
                        </DropdownMenuItem>
                        {member.role !== 'owner' && (
                            <>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <UserCog className="mr-2 h-4 w-4" />
                                            Transfer Ownership
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Transfer Ownership?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to make {member.displayName} the new owner of this project? You will become an editor and lose ownership privileges.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleOwnershipTransfer(member)}>
                                                Confirm Transfer
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                            {isRemoving === member.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                            Remove Member
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will remove {member.email} from the project.</AlertDialogDescription>
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
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
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
