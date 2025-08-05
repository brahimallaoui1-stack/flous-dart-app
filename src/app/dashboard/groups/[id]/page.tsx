
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
import { ArrowLeft, CheckCircle, Clock, Crown, SkipForward, User, Loader2, ClipboardCopy, ShieldQuestion, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, getDoc, collection, getDocs, query, where, documentId, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addMonths, addWeeks, format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GroupDetails {
    id: string;
    name: string;
    membersCount: number;
    contribution: number;
    frequency: 'monthly' | 'weekly';
    currentRound: number;
    totalRounds: number;
    inviteCode: string;
    startDate: Date;
    status: string;
    beneficiary?: { id: string, name: string };
    paymentStatus?: { [key: string]: 'Payé' | 'En attente' };
    receptionStatus?: { [key: string]: 'Reçu' | 'En attente' };
}

interface Member {
    id: string;
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

    userIds.forEach(id => {
        if (!userDetailsMap.has(id)) {
            userDetailsMap.set(id, { displayName: `Utilisateur ${id.substring(0, 5)}`, email: 'N/A' });
        }
    });

    return userDetailsMap;
}

const shuffleArray = (array: any[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}


export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const { id: groupId } = params;
  const [user] = useAuthState(auth);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGivingTurn, setIsGivingTurn] = useState(false);
  const [isConfirmingReception, setIsConfirmingReception] = useState<string | null>(null);
  const [isGiveTurnDialogOpen, setIsGiveTurnDialogOpen] = useState(false);
  const [selectedMemberToSwap, setSelectedMemberToSwap] = useState<string | null>(null);
  const { toast } = useToast();
  
  const fetchGroupData = useCallback(async () => {
    if (!user || !groupId) return;
    setLoading(true);

    try {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupDocRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            const startDate = (groupData.startDate as Timestamp).toDate();
            const isGroupFull = groupData.members.length === groupData.maxMembers;
            
            let finalTurnOrder = groupData.turnOrder || [];
            
            if (isGroupFull && (!groupData.turnOrder || groupData.turnOrder.length === 0)) {
                finalTurnOrder = shuffleArray([...groupData.members]);
                await updateDoc(groupDocRef, { 
                    turnOrder: finalTurnOrder,
                    status: 'En cours'
                });
            }
            setTurnOrder(finalTurnOrder);

            const userDetailsMap = await fetchUserDetails(groupData.members);
            const beneficiaryId = finalTurnOrder.length > 0 ? finalTurnOrder[groupData.currentRound] : undefined;

            const group: GroupDetails = {
                id: groupSnap.id,
                name: groupData.name,
                contribution: groupData.contribution,
                frequency: groupData.frequency,
                currentRound: groupData.currentRound,
                totalRounds: groupData.totalRounds,
                membersCount: groupData.members.length,
                inviteCode: groupData.inviteCode,
                startDate: startDate,
                status: isGroupFull ? 'En cours' : 'En attente',
                beneficiary: beneficiaryId ? { id: beneficiaryId, name: userDetailsMap.get(beneficiaryId)?.displayName ?? 'A déterminer' } : undefined,
                paymentStatus: groupData.paymentStatus || {},
                receptionStatus: groupData.receptionStatus || {},
            };
            setGroupDetails(group);
            
            if (isGroupFull) {
                const memberList: Member[] = finalTurnOrder.map((memberId: string, index: number) => {
                    let roles: ('Admin' | 'Membre' | 'Bénéficiaire' | 'Moi')[] = [];
                    if (groupData.admin === memberId) roles.push('Admin');
                    if (user && user.uid === memberId) roles.push('Moi');
                    if (beneficiaryId === memberId) roles.push('Bénéficiaire');
                    if (roles.length === 0) roles.push('Membre');
                    
                    const calcDate = (base: Date, i: number) => group.frequency === 'weekly' ? addWeeks(base, i) : addMonths(base, i);
                    const beneficiaryDateObject = calcDate(startDate, index);
                    
                    return {
                        id: memberId,
                        displayName: userDetailsMap.get(memberId)?.displayName || 'Utilisateur inconnu',
                        email: userDetailsMap.get(memberId)?.email || 'email inconnu',
                        role: roles.join(', ') as any,
                        status: group.paymentStatus?.[memberId] || 'En attente',
                        receptionStatus: group.receptionStatus?.[memberId] || 'En attente',
                        beneficiaryDate: format(beneficiaryDateObject, 'PPP', { locale: fr }),
                        beneficiaryDateObject,
                    }
                });
                setMembers(memberList);
            }

        } else {
            toast({ variant: 'destructive', description: "Association non trouvée." });
        }
    } catch (error) {
        console.error("Error fetching group data:", error);
        toast({ variant: 'destructive', description: "Erreur lors de la récupération des données de l'association." });
    } finally {
        setLoading(false);
    }
  }, [groupId, toast, user]);

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
            return;
        }

        const newTurnOrder = [...turnOrder];
        // Swap
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
    if (!user || user.uid !== memberId) return;

    setIsConfirmingReception(memberId);
    try {
        const groupDocRef = doc(db, 'groups', groupId);
        // Use dot notation to update a specific field in a map
        await updateDoc(groupDocRef, {
            [`receptionStatus.${memberId}`]: 'Reçu'
        });

        toast({ description: "Vous avez confirmé la réception des fonds !" });
        await fetchGroupData(); // Refresh data to show updated status
    } catch (error) {
        console.error("Error confirming reception:", error);
        toast({ variant: 'destructive', description: "Une erreur est survenue lors de la confirmation." });
    } finally {
        setIsConfirmingReception(null);
    }
};

  
  const isCurrentUserBeneficiary = user && groupDetails?.beneficiary?.id === user.uid;
  const isLastRound = groupDetails && groupDetails.currentRound >= groupDetails.totalRounds - 1;

  const eligibleMembersForSwap = useMemo(() => {
    if (!user || !groupDetails || !isCurrentUserBeneficiary || isLastRound) return [];
    
    const currentUserIndex = turnOrder.findIndex(id => id === user.uid);
    if (currentUserIndex === -1) return [];

    // Filter members who come after the current user in the turn order
    return members.filter((member) => {
        const memberIndex = turnOrder.findIndex(id => id === member.id);
        return memberIndex > currentUserIndex;
    });

  }, [user, groupDetails, isCurrentUserBeneficiary, isLastRound, turnOrder, members]);


  const progressPercentage = (groupDetails && groupDetails.totalRounds > 0) 
    ? ((groupDetails.currentRound + 1) / groupDetails.totalRounds) * 100
    : 0;

  const copyInviteCode = () => {
      if (groupDetails?.inviteCode) {
          navigator.clipboard.writeText(groupDetails.inviteCode);
          toast({description: "Code d'invitation copié dans le presse-papiers !"});
      }
  }

  const isGroupFull = groupDetails && groupDetails.membersCount === groupDetails.totalRounds;

  if (loading) {
      return (
          <div className="container mx-auto py-8 px-4 md:px-6 flex justify-center items-center h-[calc(100vh-200px)]">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="ml-4 text-muted-foreground">Chargement des détails de l'association...</p>
          </div>
      )
  }

  if (!groupDetails) {
       return (
          <div className="container mx-auto py-8 px-4 md:px-6">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Retour à mes associations
                </Link>
            </Button>
            <p className="text-center text-destructive">Impossible de charger les détails de l'association.</p>
          </div>
      )
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour à mes associations
            </Link>
        </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{groupDetails.name}</h1>
            <p className="text-muted-foreground">{groupDetails.membersCount} / {groupDetails.totalRounds} membres • {groupDetails.contribution} MAD / {groupDetails.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
             <Button variant="outline" onClick={copyInviteCode}>
                <ClipboardCopy className="mr-2 h-4 w-4" /> Code: <span className="ml-2 font-bold">{groupDetails.inviteCode}</span>
            </Button>
            
            <Dialog open={isGiveTurnDialogOpen} onOpenChange={setIsGiveTurnDialogOpen}>
                <DialogTrigger asChild>
                    <Button disabled={!isCurrentUserBeneficiary || isLastRound || eligibleMembersForSwap.length === 0}>
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

        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-3 shadow-md">
            <CardHeader>
                <CardTitle>Progression du cycle</CardTitle>
                <CardDescription>
                    Tour {groupDetails.currentRound + 1} sur {groupDetails.totalRounds}. Bénéficiaire actuel: <span className="font-semibold text-primary">{groupDetails.beneficiary?.name || 'A déterminer'}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={progressPercentage} className="h-4" />
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Ordre de passage et membres</CardTitle>
        </CardHeader>
        <CardContent>
          {isGroupFull ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Date de réception</TableHead>
                    <TableHead className="text-right">Statut du paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className={member.id === groupDetails.beneficiary?.id ? 'bg-secondary' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar><AvatarFallback><User className="h-5 w-5" /></AvatarFallback></Avatar>
                            <span>{member.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {member.role.includes('Admin') && <Badge variant="destructive"><Crown className="mr-1 h-3 w-3" />Admin</Badge>}
                          {member.role.includes('Bénéficiaire') && <Badge variant="default" className="bg-primary text-primary-foreground">Bénéficiaire</Badge>}
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
                           ) : (isPast(member.beneficiaryDateObject) || isToday(member.beneficiaryDateObject)) && user?.uid === member.id ? (
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        disabled={isConfirmingReception === member.id}
                                    >
                                        {isConfirmingReception === member.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Wallet className="mr-2 h-4 w-4" />
                                        )}
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
          ) : (
            <div className="text-center py-10 px-6 text-muted-foreground">
                <ShieldQuestion className="mx-auto h-12 w-12 mb-4" />
                <p className="font-semibold">L'ordre de passage sera visible une fois l'association complète.</p>
                <p>En attente de {groupDetails.totalRounds - groupDetails.membersCount} membre(s) supplémentaire(s).</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
