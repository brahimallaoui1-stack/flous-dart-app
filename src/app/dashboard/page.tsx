
'use client';

import Link from 'next/link';
import { PlusCircle, Users, Loader2, User, Calendar, CircleDollarSign, Hash, ChevronsRight, Crown, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc, documentId, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  } from "@/components/ui/alert-dialog";

type UserDetails = {
    displayName: string | null;
    email: string | null;
}

interface Group {
    id: string;
    name: string;
    members: string[];
    status: 'En attente' | 'En cours' | 'Terminé';
    contribution: number;
    frequency: 'monthly' | 'weekly' | 'bi-weekly';
    currentRound: number;
    totalRounds: number;
    startDate: Date;
    turnOrder: string[];
    userRole: 'Admin' | 'Membre';
    
    // Calculated fields
    currentBeneficiary?: UserDetails;
    nextBeneficiary?: UserDetails;
    totalContribution: number;
    finalReceptionDate: Date | null;
}

async function fetchUserDetails(userIds: string[]): Promise<Map<string, UserDetails>> {
    const userDetailsMap = new Map<string, UserDetails>();
    if (userIds.length === 0) {
        return userDetailsMap;
    }

    const usersRef = collection(db, 'users');
    // Firestore 'in' query is limited to 30 elements in Next.js 14, let's process in chunks if necessary, though for tontines it's unlikely.
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
        const q = query(usersRef, where(documentId(), 'in', chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            const userData = doc.data();
            userDetailsMap.set(doc.id, {
                displayName: userData.displayName || 'Utilisateur inconnu',
                email: userData.email || 'email inconnu',
            });
        });
    }
    return userDetailsMap;
}


export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


  const [groupsCollection, loadingCollection, error] = useCollection(
    user ? query(collection(db, 'groups'), where('members', 'array-contains', user.uid)) : null
  );

  const getFrequencyLabel = (frequency: 'monthly' | 'weekly' | 'bi-weekly') => {
    switch (frequency) {
        case 'monthly':
            return 'Mensuel';
        case 'weekly':
            return 'Hebdomadaire';
        case 'bi-weekly':
            return 'Bi-mensuel';
        default:
            return 'N/A';
    }
  }

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

  useEffect(() => {
    const processGroups = async () => {
        if (groupsCollection && user) {
            setLoadingGroups(true);
            const allUserIds = new Set<string>();
            groupsCollection.docs.forEach(doc => {
                const data = doc.data();
                if (data.turnOrder && Array.isArray(data.turnOrder)) {
                    data.turnOrder.forEach((id: string) => allUserIds.add(id));
                }
            });

            const userDetailsMap = await fetchUserDetails(Array.from(allUserIds));
            
            const userGroups = groupsCollection.docs.map(doc => {
                const data = doc.data();
                const startDate = (data.startDate as Timestamp).toDate();
                const totalRounds = data.totalRounds || data.members.length;
                const receivedCount = Object.values(data.receptionStatus || {}).filter(status => status === 'Reçu').length;

                const calcDate = (base: Date, i: number) => {
                    switch(data.frequency) {
                        case 'weekly': return addWeeks(base, i);
                        case 'bi-weekly': return addDays(base, i * 14);
                        case 'monthly': return addMonths(base, i);
                        default: return addMonths(base, i);
                    }
                };
                const finalReceptionDate = totalRounds > 0 ? calcDate(startDate, totalRounds - 1) : null;
                
                const currentRound = receivedCount;
                const currentBeneficiaryId = data.turnOrder?.[currentRound];
                const nextBeneficiaryId = data.turnOrder?.[currentRound + 1];

                return {
                    id: doc.id,
                    name: data.name,
                    members: data.members,
                    status: data.status,
                    contribution: data.contribution,
                    frequency: data.frequency,
                    currentRound: currentRound,
                    totalRounds: totalRounds,
                    startDate: startDate,
                    turnOrder: data.turnOrder || [],
                    userRole: data.admin === user.uid ? 'Admin' : 'Membre',
                    currentBeneficiary: currentBeneficiaryId ? userDetailsMap.get(currentBeneficiaryId) : undefined,
                    nextBeneficiary: nextBeneficiaryId ? userDetailsMap.get(nextBeneficiaryId) : undefined,
                    totalContribution: data.contribution * totalRounds,
                    finalReceptionDate: finalReceptionDate,
                } as Group;
            });
            setGroups(userGroups);
            setLoadingGroups(false);
        } else if (!loadingCollection) {
            setLoadingGroups(false);
        }
    };

    processGroups();
  }, [groupsCollection, loadingCollection, user]);
  
  const handleJoinGroup = async () => {
      if (!inviteCode.trim()) {
          toast({ variant: 'destructive', description: "Veuillez entrer un code d'invitation." });
          return;
      }
      if (!user) {
          toast({ variant: 'destructive', description: "Vous devez être connecté pour rejoindre un groupe." });
          return;
      }

      setIsJoining(true);

      try {
          const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode.trim()));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
              toast({ variant: 'destructive', description: "Aucun groupe trouvé avec ce code." });
              setIsJoining(false);
              return;
          }

          const groupDoc = querySnapshot.docs[0];
          const groupData = groupDoc.data();

          if (groupData.members.includes(user.uid)) {
              toast({ variant: 'destructive', description: "Vous êtes déjà membre de ce groupe." });
              setIsJoining(false);
              return;
          }

          if (groupData.members.length >= groupData.totalRounds) {
              toast({ variant: 'destructive', description: "Ce groupe est déjà complet." });
              setIsJoining(false);
              return;
          }

          await updateDoc(doc(db, 'groups', groupDoc.id), {
              members: arrayUnion(user.uid)
          });

          toast({ description: `Vous avez rejoint le groupe "${groupData.name}" !` });
          router.push(`/dashboard/groups/${groupDoc.id}`);

      } catch (err) {
          console.error("Error joining group: ", err);
          toast({ variant: 'destructive', description: "Une erreur est survenue." });
      } finally {
          setIsJoining(false);
      }
  }

  const isLoading = loadingCollection || loadingGroups;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Espace {user?.displayName || 'Membre'}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="md:col-span-1">
          <Button asChild className="w-full">
            <Link href="/dashboard/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Créer un nouveau groupe
            </Link>
          </Button>
        </div>
        <div className="md:col-span-1">
            <Card className="shadow-md">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input 
                        placeholder="Code d'invitation..." 
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        disabled={isJoining}
                        className="flex-grow"
                    />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button disabled={isJoining || !inviteCode.trim()} className="shrink-0">
                                {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isJoining ? '...' : "Rejoindre"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Avertissement Important</AlertDialogTitle>
                            <AlertDialogDescription>
                                Pour garantir une transparence et une équité totales, l'ordre de passage des participants sera déterminé de manière automatique et aléatoire une fois que le nombre maximum de membres autorisés aura été atteint.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Rejeter</AlertDialogCancel>
                            <AlertDialogAction onClick={handleJoinGroup}>Approuver</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
            </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Mes groupes</h2>
        {isLoading && (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Chargement de vos groupes...</p>
            </div>
        )}
        {!isLoading && groups.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                <Link href={`/dashboard/groups/${group.id}`} key={group.id} className="block hover:scale-[1.02] transition-transform duration-200">
                    <Card className="h-full flex flex-col shadow-md hover:shadow-xl transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                    <CardTitle className="mb-1">{group.name}</CardTitle>
                                     <Badge variant={group.userRole === 'Admin' ? 'destructive' : 'secondary'}>{group.userRole}</Badge>
                                </div>
                                <Badge variant={'default'} className={cn('shrink-0', getStatusBadgeVariant(group.status))}>
                                    {group.status}
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1 pt-2">
                                <p className="flex items-center"><Crown className="mr-2 h-4 w-4 text-yellow-500"/>Bénéficiaire actuel: <span className="font-semibold ml-1 text-primary">{group.status === 'Terminé' ? 'Aucun' : group.currentBeneficiary?.displayName ?? 'À déterminer'}</span></p>
                                <p className="flex items-center"><ChevronsRight className="mr-2 h-4 w-4"/>Prochain bénéficiaire: <span className="font-semibold ml-1">{group.nextBeneficiary?.displayName ?? (group.status === 'En cours' ? 'Cycle terminé' : 'À déterminer')}</span></p>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 text-sm">
                            <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                <span className="flex items-center text-muted-foreground"><Users className="mr-2 h-4 w-4"/>Membres</span>
                                <span className="font-bold">{group.members.length} / {group.totalRounds}</span>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                <span className="flex items-center text-muted-foreground"><Repeat className="mr-2 h-4 w-4"/>Fréquence</span>
                                <span className="font-bold capitalize">{getFrequencyLabel(group.frequency)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                <span className="flex items-center text-muted-foreground"><CircleDollarSign className="mr-2 h-4 w-4"/>Cotisation</span>
                                <span className="font-bold">{group.contribution} MAD</span>
                            </div>
                              <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                <span className="flex items-center text-muted-foreground"><Hash className="mr-2 h-4 w-4"/>Montant total</span>
                                <span className="font-bold">{group.totalContribution} MAD</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" />Début: {format(group.startDate, "dd/MM/yy")}</span>
                            <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" />Fin: {group.finalReceptionDate ? format(group.finalReceptionDate, "dd/MM/yy") : 'N/A'}</span>
                        </CardFooter>
                    </Card>
                </Link>
                ))}
            </div>
        ) : null}
          {!isLoading && groups.length === 0 && (
            <div className="text-center py-12 px-6 bg-card rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">Bienvenue !</h3>
                <p className="text-muted-foreground mb-4">Vous ne faites partie d'aucun groupe pour le moment.</p>
                <p className="text-muted-foreground">Créez-en un ou rejoignez un groupe existant avec un code d'invitation.</p>
            </div>
        )}
        {error && <p className="text-destructive">Erreur: {error.message}</p>}
      </div>
    </div>
  );
}

    
