
'use client';

import Link from 'next/link';
import { PlusCircle, Users, Loader2, User, Calendar, CircleDollarSign, Hash, ChevronsRight, Crown, Repeat, LogIn } from 'lucide-react';
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
import { Label } from '@/components/ui/label';

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
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


  const [groupsCollection, loadingCollection, error] = useCollection(
    user ? query(collection(db, 'groups'), where('members', 'array-contains', user.uid), where('status', 'in', ['En cours', 'En attente'])) : null
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

          if (groupData.members.length >= groupData.maxMembers) {
              toast({ variant: 'destructive', description: "Ce groupe est déjà complet." });
              setIsJoining(false);
              return;
          }

          await updateDoc(doc(db, 'groups', groupDoc.id), {
              members: arrayUnion(user.uid)
          });
          
          toast({ description: `Vous avez rejoint le groupe "${groupData.name}" !` });

          // Check if the group is now full and send the appropriate notification.
          const isGroupNowFull = groupData.members.length + 1 === groupData.maxMembers;
          if (isGroupNowFull) {
               // Notify all members that the group is full
               fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notificationType: 'groupIsFull',
                        groupId: groupDoc.id,
                        groupName: groupData.name
                    }),
                });
          } else {
              // Notify existing members that a new member has joined
              fetch('/api/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notificationType: 'newMemberJoined',
                    groupId: groupDoc.id,
                    groupName: groupData.name,
                    newMemberName: user.displayName || 'Un nouveau membre'
                }),
              });
          }

          setIsJoinDialogOpen(false); // Close the dialog on success
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
        <h1 className="text-3xl font-bold font-headline tracking-tight">Bonjour, {user?.displayName || 'Membre'}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="md:col-span-1">
          <Button asChild className="w-full h-18 text-lg">
            <Link href="/dashboard/create">
              <PlusCircle className="mr-2 h-5 w-5" />
              Créer un nouveau groupe
            </Link>
          </Button>
        </div>
        <div className="md:col-span-1">
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-18 text-lg">
                        <LogIn className="mr-2 h-5 w-5" />
                        Rejoindre un groupe
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Rejoindre un groupe</DialogTitle>
                    <DialogDescription>
                        Saisissez le code d'invitation que vous avez reçu pour rejoindre un cycle d'épargne.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Label htmlFor="invite-code" className="sr-only">
                            Code d'invitation
                        </Label>
                        <Input
                            id="invite-code"
                            placeholder="Entrez votre code d'invitation ici..."
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            disabled={isJoining}
                        />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button disabled={isJoining || !inviteCode.trim()} className="w-full">
                                    {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isJoining ? 'Vérification...' : "Rejoindre le groupe"}
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
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Mes groupes actuels</h2>
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
                             <div className="space-y-2 pt-2 text-sm">
                                <div className="flex items-center p-2 rounded-md bg-yellow-100/50 dark:bg-yellow-900/30 border border-yellow-200/80 dark:border-yellow-800/50">
                                    <Crown className="mr-3 h-5 w-5 text-yellow-500 shrink-0"/>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Bénéficiaire actuel</span>
                                        <span className="font-bold text-primary truncate">{group.status === 'Terminé' ? 'Aucun' : group.currentBeneficiary?.displayName ?? 'À déterminer'}</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col p-2 rounded-md bg-muted/50">
                                    <span className="flex items-center text-muted-foreground text-xs mb-1"><ChevronsRight className="mr-1 h-3 w-3"/>Progression</span>
                                    <span className="font-bold">{`Tour ${group.currentRound} / ${group.totalRounds}`}</span>
                                </div>
                                <div className="flex flex-col p-2 rounded-md bg-muted/50">
                                    <span className="flex items-center text-muted-foreground text-xs mb-1"><Hash className="mr-1 h-3 w-3"/>Montant total</span>
                                    <span className="font-bold">{group.totalContribution} MAD</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                ))}
            </div>
        ) : null}
          {!isLoading && groups.length === 0 && (
            <div className="text-center py-12 px-6 bg-card rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">Bienvenue !</h3>
                <p className="text-muted-foreground mb-4">Vous n'avez aucun groupe en cours ou en attente pour le moment.</p>
                <p className="text-muted-foreground">Créez-en un ou rejoignez un groupe existant avec un code d'invitation.</p>
            </div>
        )}
        {error && <p className="text-destructive">Erreur: {error.message}</p>}
      </div>
    </div>
  );
}

    

    
