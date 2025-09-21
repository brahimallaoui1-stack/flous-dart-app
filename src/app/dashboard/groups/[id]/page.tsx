
'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
  } from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle, Clock, Crown, SkipForward, User, Loader2, ClipboardCopy, ShieldQuestion, Wallet, Users, CircleDollarSign, Hash, Calendar, ChevronsRight, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, getDoc, collection, getDocs, query, where, documentId, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDays, addMonths, addWeeks, format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';


interface GroupDetails {
    id: string;
    name: string;
    membersCount: number;
    contribution: number;
    frequency: 'weekly' | 'bi-weekly' | 'monthly';
    currentRound: number;
    totalRounds: number;
    inviteCode: string;
    startDate: Date;
    status: 'En attente' | 'En cours' | 'Terminé';
    adminId: string;
    beneficiary?: { id: string, name: string };
    nextBeneficiary?: { id: string, name: string };
    paymentStatus?: { [key: string]: 'Payé' | 'En attente' };
    receptionStatus?: { [key: string]: 'Reçu' | 'En attente' };
    totalContribution: number;
    finalReceptionDate: Date | null;
    receivedCount: number;
}

interface Member {
    id: string;
    serialNumber: number;
    displayName: string | null;
    email: string | null;
    role: 'Admin' | 'Membre' | 'Bénéficiaire' | 'Moi';
    status: 'Payé' | 'En attente';
    receptionStatus: 'Reçu' | 'En attente';
    beneficiaryDate: string;
    beneficiaryDateObject: Date;
}

type UserDetails = {
    displayName: string | null;
    email: string | null;
}

async function fetchUserDetails(userIds: string[]): Promise<Map<string, UserDetails>> {
    const userDetailsMap = new Map<string, UserDetails>();
    if (userIds.length === 0) {
        return userDetailsMap;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(documentId(), 'in', userIds.slice(0, 30)));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(doc => {
        const userData = doc.data();
        userDetailsMap.set(doc.id, {
            displayName: userData.displayName || 'Utilisateur inconnu',
            email: userData.email || 'email inconnu',
        });
    });

    return userDetailsMap;
}

const shuffleArray = (array: any[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.floor(Math.random() * currentIndex));
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}


export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const [user] = useAuthState(auth);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGivingTurn, setIsGivingTurn] = useState(false);
  const [isGiveTurnDialogOpen, setIsGiveTurnDialogOpen] = useState(false);
  const [selectedMemberToSwap, setSelectedMemberToSwap] = useState<string | null>(null);
  const { toast } = useToast();
  
  const getFrequencyLabel = (frequency: 'weekly' | 'bi-weekly' | 'monthly') => {
    switch (frequency) {
        case 'monthly':
            return 'Mois';
        case 'weekly':
            return 'Sem';
        case 'bi-weekly':
            return '14 jrs';
        default:
            return '';
    }
  }

  const fetchGroupData = useCallback(async () => {
    if (!user || !groupId) return;
    setLoading(true);

    try {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupDocRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data();

            if (!groupData.members.includes(user.uid)) {
                toast({ variant: 'destructive', description: "Vous n'êtes plus membre de ce groupe." });
                router.push('/dashboard');
                return;
            }

            const startDate = (groupData.startDate as Timestamp).toDate();
            const isGroupFull = groupData.members.length === groupData.maxMembers;
            const receivedCount = Object.values(groupData.receptionStatus || {}).filter(status => status === 'Reçu').length;
            const isCycleFinished = receivedCount === groupData.totalRounds && groupData.totalRounds > 0;

            let finalTurnOrder = groupData.turnOrder || [];
            let currentStatus = groupData.status;

            if (isGroupFull && (!groupData.turnOrder || groupData.turnOrder.length === 0)) {
                finalTurnOrder = shuffleArray([...groupData.members]);
                await updateDoc(groupDocRef, { 
                    turnOrder: finalTurnOrder,
                    status: 'En cours'
                });
                currentStatus = 'En cours';

                 // Notify all members that the group is full
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notificationType: 'groupIsFull',
                        groupId: groupSnap.id,
                        groupName: groupData.name
                    }),
                });

            }

            if (isCycleFinished && groupData.status !== 'Terminé') {
                await updateDoc(groupDocRef, { status: 'Terminé' });
                currentStatus = 'Terminé';
            }
            
            setTurnOrder(finalTurnOrder);

            const allUserIds = new Set<string>(groupData.members);
            if (finalTurnOrder.length > 0) {
              finalTurnOrder.forEach((id: string) => allUserIds.add(id));
            }
            const userDetailsMap = await fetchUserDetails(Array.from(allUserIds));
            
            const currentRound = receivedCount;
            const beneficiaryId = finalTurnOrder.length > 0 ? finalTurnOrder[currentRound] : undefined;
            const nextBeneficiaryId = finalTurnOrder.length > 0 ? finalTurnOrder[currentRound + 1] : undefined;
            
            const calcDate = (base: Date, i: number) => {
                switch(groupData.frequency) {
                    case 'weekly': return addWeeks(base, i);
                    case 'bi-weekly': return addDays(base, i * 14);
                    case 'monthly': return addMonths(base, i);
                    default: return addMonths(base, i);
                }
            };

            const finalReceptionDate = groupData.totalRounds > 0 ? calcDate(startDate, groupData.totalRounds - 1) : null;
            
            const group: GroupDetails = {
                id: groupSnap.id,
                name: groupData.name,
                contribution: groupData.contribution,
                frequency: groupData.frequency,
                currentRound: currentRound,
                totalRounds: groupData.totalRounds,
                membersCount: groupData.members.length,
                inviteCode: groupData.inviteCode,
                startDate: startDate,
                adminId: groupData.admin,
                status: currentStatus,
                beneficiary: beneficiaryId ? { id: beneficiaryId, name: userDetailsMap.get(beneficiaryId)?.displayName ?? 'À déterminer' } : undefined,
                nextBeneficiary: nextBeneficiaryId ? { id: nextBeneficiaryId, name: userDetailsMap.get(nextBeneficiaryId)?.displayName ?? 'A déterminer' } : undefined,
                paymentStatus: groupData.paymentStatus || {},
                receptionStatus: groupData.receptionStatus || {},
                totalContribution: groupData.contribution * groupData.totalRounds,
                finalReceptionDate: finalReceptionDate,
                receivedCount: receivedCount
            };
            setGroupDetails(group);
            
            const membersToShow = isGroupFull || currentStatus === 'Terminé' ? finalTurnOrder : groupData.members;

            const memberList: Member[] = membersToShow.map((memberId: string, index: number) => {
                let roles: ('Admin' | 'Membre' | 'Bénéficiaire' | 'Moi')[] = [];
                if (groupData.admin === memberId) roles.push('Admin');
                if (user && user.uid === memberId) roles.push('Moi');
                if (beneficiaryId === memberId) roles.push('Bénéficiaire');
                if (roles.length === 0) roles.push('Membre');
                
                const beneficiaryDateObject = isGroupFull || currentStatus === 'Terminé' ? calcDate(startDate, index) : new Date();
                
                return {
                    id: memberId,
                    serialNumber: index + 1,
                    displayName: userDetailsMap.get(memberId)?.displayName || 'Utilisateur inconnu',
                    email: userDetailsMap.get(memberId)?.email || 'email inconnu',
                    role: roles.join(', ') as any,
                    status: group.paymentStatus?.[memberId] || 'En attente',
                    receptionStatus: group.receptionStatus?.[memberId] || 'En attente',
                    beneficiaryDate: isGroupFull || currentStatus === 'Terminé' ? format(beneficiaryDateObject, 'PPP', { locale: fr }) : "Non déterminé",
                    beneficiaryDateObject,
                }
            });
            setMembers(memberList);


        } else {
            toast({ variant: 'destructive', description: "Groupe non trouvé." });
            router.push('/dashboard');
        }
    } catch (error) {
        console.error("Error fetching group data:", error);
        toast({ variant: 'destructive', description: "Erreur lors de la récupération des données du groupe." });
    } finally {
        setLoading(false);
    }
  }, [groupId, toast, user, router]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

 const handleConfirmGiveTurn = async () => {
    if (!user || !groupDetails || !selectedMemberToSwap || turnOrder.length < 2) return;

    setIsGivingTurn(true);
    try {
        const currentUserIndex = turnOrder.findIndex(id => id === user.uid);
        const targetUserIndex = turnOrder.findIndex(id => id === selectedMemberToSwap);

        if (currentUserIndex !== groupDetails.currentRound || targetUserIndex <= currentUserIndex) {
            toast({ variant: 'destructive', description: "Action non autorisée." });
            setIsGivingTurn(false);
            return;
        }

        const newTurnOrder = [...turnOrder];
        [newTurnOrder[currentUserIndex], newTurnOrder[targetUserIndex]] = [newTurnOrder[targetUserIndex], newTurnOrder[currentUserIndex]];
        
        await updateDoc(doc(db, 'groups', groupId), {
            turnOrder: newTurnOrder
        });

        setTurnOrder(newTurnOrder);
        toast({ description: "Votre tour a été donné avec succès !" });
        await fetchGroupData(); // Refresh data
    } catch (error) {
        console.error("Error giving turn: ", error);
        toast({ variant: 'destructive', description: "Une erreur est survenue." });
    } finally {
        setIsGivingTurn(false);
        setIsGiveTurnDialogOpen(false);
        setSelectedMemberToSwap(null);
    }
  };

  const handleConfirmReception = async (memberId: string) => {
    if (!user || user.uid !== memberId || !groupDetails) return;

    try {
        const groupDocRef = doc(db, 'groups', groupId);
        // Use dot notation to update a specific field in a map
        await updateDoc(groupDocRef, {
            [`receptionStatus.${memberId}`]: 'Reçu'
        });

        // 1. Notify all members about the confirmation
        fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notificationType: 'paymentConfirmation',
                groupId: groupId,
                senderName: user.displayName || 'Un membre',
                groupName: groupDetails.name
            }),
        });
        
        // 2. Notify the next beneficiary
        const currentRound = groupDetails.currentRound;
        const newBeneficiaryId = turnOrder[currentRound + 1];

        if (newBeneficiaryId) {
             fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notificationType: 'yourTurn',
                    groupId: groupId,
                    recipientId: newBeneficiaryId,
                    groupName: groupDetails.name,
                }),
            });
        }


        toast({ description: "Vous avez confirmé la réception des fonds ! Les membres seront notifiés." });
        await fetchGroupData(); // Refresh data to show updated status
    } catch (error) {
        console.error("Error confirming reception:", error);
        toast({ variant: 'destructive', description: "Une erreur est survenue lors de la confirmation." });
    }
};

 const handleDeleteGroup = async () => {
    if (!user || !groupDetails || user.uid !== groupDetails.adminId) return;

    setIsDeleting(true);
    try {
        const groupDocRef = doc(db, 'groups', groupId);
        await deleteDoc(groupDocRef);
        toast({ description: "Le groupe a été supprimé avec succès." });
        router.push('/dashboard');
    } catch (error) {
        console.error("Error deleting group:", error);
        toast({ variant: 'destructive', description: "Une erreur est survenue lors de la suppression du groupe." });
        setIsDeleting(false);
    }
  };

  
  const isCurrentUserBeneficiary = user && groupDetails?.beneficiary?.id === user.uid;
  const isLastRound = groupDetails && groupDetails.currentRound >= groupDetails.totalRounds - 1;
  const hasUserReceivedFunds = user && groupDetails?.receptionStatus?.[user.uid] === 'Reçu';

  const eligibleMembersForSwap = useMemo(() => {
    if (!user || !groupDetails || !isCurrentUserBeneficiary || isLastRound || hasUserReceivedFunds) return [];
    
    const currentUserIndex = turnOrder.findIndex(id => id === user.uid);
    if (currentUserIndex === -1) return [];

    // Filter members who come after the current user in the turn order
    return members.filter((member) => {
        const memberIndex = turnOrder.findIndex(id => id === member.id);
        return memberIndex > currentUserIndex;
    });

  }, [user, groupDetails, isCurrentUserBeneficiary, isLastRound, turnOrder, members, hasUserReceivedFunds]);


  const progressPercentage = (groupDetails && groupDetails.totalRounds > 0) 
    ? (groupDetails.receivedCount / groupDetails.totalRounds) * 100
    : 0;

  const copyInviteCode = () => {
      if (groupDetails?.inviteCode) {
          navigator.clipboard.writeText(groupDetails.inviteCode);
          toast({description: "Code d'invitation copié dans le presse-papiers !"});
      }
  }

  const isGroupFull = groupDetails && groupDetails.membersCount === groupDetails.totalRounds;
  const isUserAdmin = user && groupDetails && user.uid === groupDetails.adminId;

  const getStatusBadgeVariant = (status: 'En attente' | 'En cours' | 'Terminé') => {
      switch (status) {
          case 'En cours':
              return 'bg-green-500 text-white hover:bg-green-600';
          case 'Terminé':
              return 'bg-gray-500 text-white hover:bg-gray-600';
          case 'En attente':
          default:
              return 'secondary';
      }
  }


  if (loading) {
      return (
          <div className="container mx-auto py-8 px-4 md:px-6 flex justify-center items-center h-[calc(100vh-200px)]">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="ml-4 text-muted-foreground">Chargement des détails du groupe...</p>
          </div>
      )
  }

  if (!groupDetails) {
       return (
          <div className="container mx-auto py-8 px-4 md:px-6">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Retour à mes groupes
                </Link>
            </Button>
            <p className="text-center text-destructive">Impossible de charger les détails du groupe.</p>
          </div>
      )
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour à mes groupes
            </Link>
        </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold font-headline tracking-tight">{groupDetails.name}</h1>
             <Badge variant={'default'} className={cn('shrink-0', getStatusBadgeVariant(groupDetails.status))}>
                {groupDetails.status}
            </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
             {!isGroupFull && groupDetails.status !== 'Terminé' && (
                <Button variant="outline" onClick={copyInviteCode}>
                    <ClipboardCopy className="mr-2 h-4 w-4" /> Code: <span className="ml-2 font-bold">{groupDetails.inviteCode}</span>
                </Button>
             )}
            
            {isCurrentUserBeneficiary && !isLastRound && eligibleMembersForSwap.length > 0 && !hasUserReceivedFunds && groupDetails.status !== 'Terminé' && (
              <Dialog open={isGiveTurnDialogOpen} onOpenChange={setIsGiveTurnDialogOpen}>
                  <DialogTrigger asChild>
                      <Button>
                          <SkipForward className="mr-2 h-4 w-4" />
                          Donner mon tour
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                      <DialogTitle>À qui souhaitez-vous donner votre tour ?</DialogTitle>
                      <DialogDescription>
                          Sélectionnez le membre qui bénéficiera de la tontine à votre place pour ce tour. Cette action est irréversible.
                      </DialogDescription>
                      </DialogHeader>
                      <RadioGroup 
                          onValueChange={setSelectedMemberToSwap}
                          className="my-4 max-h-64 overflow-y-auto"
                      >
                          {eligibleMembersForSwap.map(member => (
                              <div key={member.id} className="flex items-center space-x-2 rounded-md border p-3">
                                  <RadioGroupItem value={member.id} id={member.id} />
                                  <Label htmlFor={member.id} className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                          <Avatar className="h-8 w-8"><AvatarFallback><User className="h-4 w-4" /></AvatarFallback></Avatar>
                                          <div className="flex flex-col">
                                              <span className="font-semibold">{member.displayName}</span>
                                              <span className="text-xs text-muted-foreground">Date de réception prévue: {member.beneficiaryDate}</span>
                                          </div>
                                      </div>
                                  </Label>
                              </div>
                          ))}
                      </RadioGroup>
                      <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsGiveTurnDialogOpen(false)}>Annuler</Button>
                      <Button onClick={handleConfirmGiveTurn} disabled={isGivingTurn || !selectedMemberToSwap}>
                          {isGivingTurn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isGivingTurn ? 'Confirmation...' : 'Confirmer et donner mon tour'}
                      </Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>
            )}

             {isUserAdmin && !isGroupFull && groupDetails.status === 'En attente' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isDeleting ? 'Suppression...' : 'Supprimer le groupe'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce groupe ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est irréversible et supprimera toutes les données associées au groupe.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteGroup}>Confirmer la suppression</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

        </div>
      </div>

       <div className="grid gap-6 mb-6">
        <Card className="shadow-md w-full">
            <CardHeader>
                <CardTitle>Bénéficiaire actuel</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                 <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/10 text-primary"><Crown className="h-6 w-6" /></AvatarFallback></Avatar>
                 <div>
                    <p className="font-bold text-lg">{groupDetails.beneficiary?.name || 'À déterminer'}</p>
                 </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Membres</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{groupDetails.membersCount} / {groupDetails.totalRounds}</div>
              </CardContent>
          </Card>
           <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Cotisation</CardTitle>
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{groupDetails.contribution} <span className="text-sm text-muted-foreground">MAD / {getFrequencyLabel(groupDetails.frequency)}</span></div>
              </CardContent>
          </Card>
           <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Montant total</CardTitle>
                  <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{groupDetails.totalContribution} <span className="text-sm text-muted-foreground">MAD</span></div>
              </CardContent>
          </Card>
           <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Période</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-xl font-bold">{format(groupDetails.startDate, "dd/MM/yy")} - {groupDetails.finalReceptionDate ? format(groupDetails.finalReceptionDate, "dd/MM/yy") : 'N/A'}</div>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Ordre des membres</CardTitle>
        </CardHeader>
        <CardContent>
          {groupDetails.status === 'En cours' || groupDetails.status === 'Terminé' ? (
            <div>
              {/* Table for larger screens */}
              <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tour</TableHead>
                        <TableHead>Membre</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Date de réception</TableHead>
                        <TableHead className="text-right">Statut de réception</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id} className={member.id === groupDetails.beneficiary?.id ? 'bg-secondary' : ''}>
                          <TableCell className="font-medium">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                    {member.serialNumber}
                                </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell>{member.displayName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {member.role.includes('Admin') && <Badge variant="destructive"><Crown className="mr-1 h-3 w-3" />Admin</Badge>}
                              {member.role.includes('Bénéficiaire') && groupDetails.status !== 'Terminé' && <Badge variant="default" className="bg-primary text-primary-foreground">Bénéficiaire</Badge>}
                              {member.role.includes('Moi') && <Badge variant="outline">Moi</Badge>}
                              {member.role === 'Membre' && <Badge variant="secondary">Membre</Badge>}
                            </div>
                          </TableCell>
                           <TableCell>{member.beneficiaryDate}</TableCell>
                          <TableCell className="text-right">
                             <div className="flex items-center justify-end gap-2">
                               {member.receptionStatus === 'Reçu' ? (
                                    <Badge variant="default" className="bg-green-500 text-white hover:bg-green-600">
                                        <CheckCircle className="mr-1 h-4 w-4" />
                                        Reçu
                                    </Badge>
                               ) : (isPast(member.beneficiaryDateObject) || isToday(member.beneficiaryDateObject)) && user?.uid === member.id && groupDetails.status !== 'Terminé' ? (
                                   <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                        <Button size="sm">
                                          <Wallet className="mr-2 h-4 w-4" />
                                          J'ai reçu
                                        </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>Confirmer la réception</AlertDialogTitle>
                                         <AlertDialogDescription>
                                           Êtes-vous sûr de vouloir confirmer que vous avez bien reçu les fonds pour ce tour ? Cette action est irréversible.
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel>Annuler</AlertDialogCancel>
                                         <AlertDialogAction onClick={() => handleConfirmReception(member.id)}>Confirmer</AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                               ) : (
                                    <>
                                        <Clock className="h-5 w-5 text-orange-500" /> 
                                        <span className="text-orange-500">En attente</span>
                                    </>
                               )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </div>

              {/* Cards for mobile screens */}
              <div className="md:hidden space-y-4">
                  {members.map(member => (
                      <Card key={member.id} className={member.id === groupDetails.beneficiary?.id ? 'bg-secondary border-primary' : ''}>
                          <CardContent className="p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                       <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {member.serialNumber}
                                            </AvatarFallback>
                                        </Avatar>
                                      <div>
                                          <p className="font-bold">{member.displayName}</p>
                                          <div className="flex items-center gap-1 flex-wrap mt-1">
                                            {member.role.includes('Admin') && <Badge variant="destructive" size="sm"><Crown className="mr-1 h-3 w-3" />Admin</Badge>}
                                            {member.role.includes('Bénéficiaire') && groupDetails.status !== 'Terminé' && <Badge variant="default" size="sm" className="bg-primary text-primary-foreground">Bénéficiaire</Badge>}
                                            {member.role.includes('Moi') && <Badge variant="outline" size="sm">Moi</Badge>}
                                            {member.role === 'Membre' && <Badge variant="secondary" size="sm">Membre</Badge>}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="text-sm space-y-2">
                                  <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">Réception:</span>
                                      <span className="font-medium">{member.beneficiaryDate}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                       <span className="text-muted-foreground">Paiement:</span>
                                       <div className="flex items-center justify-end gap-2">
                                          {member.receptionStatus === 'Reçu' ? (
                                                <Badge variant="default" className="bg-green-500 text-white hover:bg-green-600">
                                                    <CheckCircle className="mr-1 h-4 w-4" />
                                                    Reçu
                                                </Badge>
                                           ) : (isPast(member.beneficiaryDateObject) || isToday(member.beneficiaryDateObject)) && user?.uid === member.id && groupDetails.status !== 'Terminé' ? (
                                               <AlertDialog>
                                                 <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="default">
                                                      <Wallet className="mr-2 h-4 w-4" />
                                                      J'ai reçu
                                                    </Button>
                                                 </AlertDialogTrigger>
                                                 <AlertDialogContent>
                                                   <AlertDialogHeader>
                                                     <AlertDialogTitle>Confirmer la réception</AlertDialogTitle>
                                                     <AlertDialogDescription>
                                                       Êtes-vous sûr de vouloir confirmer que vous avez bien reçu les fonds pour ce tour ? Cette action est irréversible.
                                                     </AlertDialogDescription>
                                                   </AlertDialogHeader>
                                                   <AlertDialogFooter>
                                                     <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                     <AlertDialogAction onClick={() => handleConfirmReception(member.id)}>Confirmer</AlertDialogAction>
                                                   </AlertDialogFooter>
                                                 </AlertDialogContent>
                                               </AlertDialog>
                                           ) : (
                                                <Badge variant="outline" className="text-orange-500 border-orange-500">
                                                    <Clock className="mr-1 h-4 w-4" /> 
                                                    En attente
                                                </Badge>
                                           )}
                                        </div>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-6 text-muted-foreground">
                <ShieldQuestion className="mx-auto h-12 w-12 mb-4" />
                <p className="font-semibold">L'ordre de passage sera visible une fois le groupe complet.</p>
                <p>En attente de {groupDetails.totalRounds - groupDetails.membersCount} membre(s) supplémentaire(s).</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Custom Badge component with size prop
const BadgeSm = ({ className, ...props }: React.ComponentProps<typeof Badge> & {size?:'sm'}) => {
    return <Badge className={cn("px-2 py-0.5 text-xs", className)} {...props} />;
}

    