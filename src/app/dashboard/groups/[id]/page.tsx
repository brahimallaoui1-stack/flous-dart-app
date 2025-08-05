
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
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle, Clock, Crown, SkipForward, User, Loader2, ClipboardCopy, ShieldQuestion } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, getDoc, collection, getDocs, query, where, documentId, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addMonths, addWeeks, format } from 'date-fns';
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
}

interface Member {
    id: string;
    displayName: string | null;
    email: string | null;
    role: 'Admin' | 'Membre' | 'Bénéficiaire' | 'Moi';
    status: 'Payé' | 'En attente';
    paymentDate: string;
    beneficiaryDate: string;
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
  const [user] = useAuthState(auth);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGivingTurn, setIsGivingTurn] = useState(false);
  const { toast } = useToast();
  const groupId = params.id;
  
  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);

    try {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupDocRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            const startDate = (groupData.startDate as Timestamp).toDate();
            const isGroupFull = groupData.members.length === groupData.maxMembers;
            
            let finalTurnOrder = groupData.turnOrder || [];
            
            // If group is full and turn order isn't set, create and save it
            if (isGroupFull && (!groupData.turnOrder || groupData.turnOrder.length === 0)) {
                finalTurnOrder = shuffleArray([...groupData.members]);
                await updateDoc(groupDocRef, { 
                    turnOrder: finalTurnOrder,
                    status: 'En cours' // Set status to "En cours" when group is full
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
                    
                    return {
                        id: memberId,
                        displayName: userDetailsMap.get(memberId)?.displayName || 'Utilisateur inconnu',
                        email: userDetailsMap.get(memberId)?.email || 'email inconnu',
                        role: roles.join(', ') as any, // Simple join for display
                        status: 'En attente', // Payment status logic to be implemented separately
                        paymentDate: format(calcDate(startDate, group.currentRound), 'PPP', { locale: fr }),
                        beneficiaryDate: format(calcDate(startDate, index), 'PPP', { locale: fr }),
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

  const handleGiveTurn = async () => {
    if (!user || !groupDetails || turnOrder.length < 2) return;

    setIsGivingTurn(true);
    try {
        const currentUserIndex = turnOrder.findIndex(id => id === user.uid);
        
        // Ensure the current user is the beneficiary and it's not the last round
        if (currentUserIndex !== groupDetails.currentRound || groupDetails.currentRound >= groupDetails.totalRounds - 1) {
            toast({ variant: 'destructive', description: "Vous ne pouvez pas donner votre tour maintenant." });
            return;
        }

        const newTurnOrder = [...turnOrder];
        const nextMemberId = newTurnOrder[currentUserIndex + 1];

        // Swap current user with the next one
        newTurnOrder[currentUserIndex] = nextMemberId;
        newTurnOrder[currentUserIndex + 1] = user.uid;

        await updateDoc(doc(db, 'groups', groupId), {
            turnOrder: newTurnOrder
        });

        setTurnOrder(newTurnOrder);
        toast({ description: "Votre tour a été donné avec succès !" });
        fetchGroupData(); // Refresh data to show changes
    } catch (error) {
        console.error("Error giving turn: ", error);
        toast({ variant: 'destructive', description: "Une erreur est survenue." });
    } finally {
        setIsGivingTurn(false);
    }
  };
  
  const isCurrentUserBeneficiary = user && groupDetails?.beneficiary?.id === user.uid;

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
            {isCurrentUserBeneficiary && (
                <Button onClick={handleGiveTurn} disabled={isGivingTurn}>
                    {isGivingTurn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SkipForward className="mr-2 h-4 w-4" />}
                    {isGivingTurn ? 'Chargement...' : 'Donner mon tour'}
                </Button>
            )}
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
                    <TableHead>Prochain paiement</TableHead>
                    <TableHead className="text-right">Statut paiement</TableHead>
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
                       <TableCell>{member.paymentDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {member.status === 'Payé' ? 
                            ( <><CheckCircle className="h-5 w-5 text-green-500" /> <span className="text-green-500">Payé</span></> ) : 
                            ( <><Clock className="h-5 w-5 text-orange-500" /> <span className="text-orange-500">En attente</span></> )
                          }
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
