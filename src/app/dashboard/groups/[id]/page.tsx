
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
import { ArrowLeft, CheckCircle, Clock, Crown, Settings, SkipForward, User, Loader2, ClipboardCopy } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface GroupDetails {
    id: string;
    name: string;
    membersCount: number;
    contribution: number;
    frequency: string;
    currentRound: number;
    totalRounds: number;
    inviteCode: string;
    beneficiary?: {
        name: string;
    };
}

interface Member {
    id: string;
    displayName: string | null;
    email: string | null;
    role: 'Admin' | 'Membre' | 'Bénéficiaire';
    status: 'Payé' | 'En attente';
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
    // Firestore 'in' query is limited to 30 elements. 
    // If you expect more members, you'll need to batch the requests.
    const q = query(usersRef, where(documentId(), 'in', userIds));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(doc => {
        const userData = doc.data();
        userDetailsMap.set(doc.id, {
            displayName: userData.displayName || 'Utilisateur inconnu',
            email: userData.email || 'email inconnu',
        });
    });

    // For any user not found in 'users' collection (e.g. old data), fallback to a default
    userIds.forEach(id => {
        if (!userDetailsMap.has(id)) {
            userDetailsMap.set(id, {
                displayName: `Utilisateur ${id.substring(0, 5)}`,
                email: 'N/A',
            });
        }
    });

    return userDetailsMap;
}


export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const fetchGroupData = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);

    try {
        const groupDocRef = doc(db, 'groups', params.id);
        const groupSnap = await getDoc(groupDocRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            setGroupDetails({
                id: groupSnap.id,
                name: groupData.name,
                contribution: groupData.contribution,
                frequency: groupData.frequency,
                currentRound: groupData.currentRound,
                totalRounds: groupData.totalRounds,
                membersCount: groupData.members.length,
                inviteCode: groupData.inviteCode,
            });

            const userDetailsMap = await fetchUserDetails(groupData.members);

            const memberList: Member[] = groupData.members.map((memberId: string) => ({
                id: memberId,
                displayName: userDetailsMap.get(memberId)?.displayName || 'Utilisateur inconnu',
                email: userDetailsMap.get(memberId)?.email || 'email inconnu',
                role: groupData.admin === memberId ? 'Admin' : 'Membre',
                status: 'En attente'
            }));
            setMembers(memberList);

        } else {
            toast({ variant: 'destructive', description: "Association non trouvée." });
        }
    } catch (error) {
        console.error("Error fetching group data:", error);
        toast({ variant: 'destructive', description: "Erreur lors de la récupération des données de l'association." });
    } finally {
        setLoading(false);
    }
  }, [params.id, toast]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const progressPercentage = (groupDetails && groupDetails.totalRounds > 0) 
    ? (groupDetails.currentRound / groupDetails.totalRounds) * 100 
    : 0;

  const copyInviteCode = () => {
      if (groupDetails?.inviteCode) {
          navigator.clipboard.writeText(groupDetails.inviteCode);
          toast({description: "Code d'invitation copié dans le presse-papiers !"});
      }
  }

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
            <p className="text-muted-foreground">{groupDetails.membersCount} / {groupDetails.totalRounds} membres • {groupDetails.contribution} MAD / {groupDetails.frequency}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
             <Button variant="outline" onClick={copyInviteCode}>
                <ClipboardCopy className="mr-2 h-4 w-4" /> Code d'invitation: <span className="ml-2 font-bold">{groupDetails.inviteCode}</span>
            </Button>
            <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Paramètres</Button>
            <Button><SkipForward className="mr-2 h-4 w-4" /> Avancer prochaine visite</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-3 shadow-md">
            <CardHeader>
                <CardTitle>Progression du cycle</CardTitle>
                <CardDescription>Visite {groupDetails.currentRound} sur {groupDetails.totalRounds}. Bénéficiaire actuel: <span className="font-semibold text-primary">{groupDetails.beneficiary?.name || 'A déterminer'}</span></CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={progressPercentage} className="h-4" />
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Membres de l'association</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Statut du paiement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                <User className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        <span>{member.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.role === 'Admin' && <Badge variant="destructive"><Crown className="mr-1 h-3 w-3" />Admin</Badge>}
                    {member.role === 'Membre' && <Badge variant="secondary">Membre</Badge>}
                    {member.role === 'Bénéficiaire' && <Badge variant="default" className="bg-primary text-primary-foreground">Bénéficiaire</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {member.status === 'Payé' ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-green-500">Payé</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-5 w-5 text-orange-500" />
                          <span className="text-orange-500">En attente</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center">Aucun membre dans cette association pour le moment.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
