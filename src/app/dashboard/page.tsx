
'use client';

import Link from 'next/link';
import { PlusCircle, Users, Loader2, User, Calendar, CircleDollarSign, Hash, ChevronsRight, Crown } from 'lucide-react';
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
import { addMonths, addWeeks, format } from 'date-fns';
import { fr } from 'date-fns/locale';

type UserDetails = {
    displayName: string | null;
    email: string | null;
}

interface Group {
    id: string;
    name: string;
    members: string[];
    status: string;
    contribution: number;
    frequency: 'monthly' | 'weekly';
    currentRound: number;
    totalRounds: number;
    startDate: Date;
    turnOrder: string[];
    
    // Calculated fields
    currentBeneficiary?: UserDetails;
    nextBeneficiary?: UserDetails;
    totalContribution: number;
    finalReceptionDate: string;
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

  useEffect(() => {
    const processGroups = async () => {
        if (groupsCollection) {
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
                
                const calcDate = (base: Date, i: number) => data.frequency === 'weekly' ? addWeeks(base, i) : addMonths(base, i);
                const finalReceptionDate = totalRounds > 0 ? format(calcDate(startDate, totalRounds - 1), 'PPP', { locale: fr }) : "N/A";
                
                const currentBeneficiaryId = data.turnOrder?.[data.currentRound];
                const nextBeneficiaryId = data.turnOrder?.[data.currentRound + 1];

                return {
                    id: doc.id,
                    name: data.name,
                    members: data.members,
                    status: data.status,
                    contribution: data.contribution,
                    frequency: data.frequency,
                    currentRound: data.currentRound,
                    totalRounds: totalRounds,
                    startDate: startDate,
                    turnOrder: data.turnOrder || [],
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
  }, [groupsCollection, loadingCollection]);
  
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
              toast({ variant: 'destructive', description: "Aucune association trouvée avec ce code." });
              setIsJoining(false);
              return;
          }

          const groupDoc = querySnapshot.docs[0];
          const groupData = groupDoc.data();

          if (groupData.members.includes(user.uid)) {
              toast({ variant: 'destructive', description: "Vous êtes déjà membre de cette association." });
              setIsJoining(false);
              return;
          }

          if (groupData.members.length >= groupData.maxMembers) {
              toast({ variant: 'destructive', description: "Cette association est déjà complète." });
              setIsJoining(false);
              return;
          }

          await updateDoc(doc(db, 'groups', groupDoc.id), {
              members: arrayUnion(user.uid)
          });

          toast({ description: `Vous avez rejoint l'association "${groupData.name}" !` });
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Créer un groupe</h2>
          <Button asChild className="w-full">
            <Link href="/dashboard/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Créer une nouvelle association
            </Link>
          </Button>
        </div>
        <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Rejoindre une association</h2>
            <Card className="shadow-md">
                <CardHeader>
                <CardTitle>Code d'invitation</CardTitle>
                <CardDescription>Saisissez le code pour rejoindre un groupe existant.</CardDescription>
                </CardHeader>
                <CardContent>
                <Input 
                    placeholder="Entrez le code..." 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    disabled={isJoining}
                />
                </CardContent>
                <CardFooter>
                <Button className="w-full" onClick={handleJoinGroup} disabled={isJoining}>
                    {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isJoining ? 'Recherche...' : "Rejoindre l'association"}
                </Button>
                </CardFooter>
            </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Mes associations</h2>
        {isLoading && (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Chargement de vos associations...</p>
            </div>
        )}
        {!isLoading && groups.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                <Link href={`/dashboard/groups/${group.id}`} key={group.id} className="block hover:scale-[1.02] transition-transform duration-200">
                    <Card className="h-full flex flex-col shadow-md hover:shadow-xl transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="mb-2">{group.name}</CardTitle>
                                  <Badge variant={group.status === 'En cours' ? 'default' : 'secondary'} className={group.status === 'En cours' ? 'bg-green-500 text-white' : ''}>
                                    {group.status}
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                                <p className="flex items-center"><Crown className="mr-2 h-4 w-4 text-yellow-500"/>Bénéficiaire actuel: <span className="font-semibold ml-1 text-primary">{group.currentBeneficiary?.displayName ?? 'À déterminer'}</span></p>
                                <p className="flex items-center"><ChevronsRight className="mr-2 h-4 w-4"/>Prochain bénéficiaire: <span className="font-semibold ml-1">{group.nextBeneficiary?.displayName ?? (group.status === 'En cours' ? 'Cycle terminé' : 'À déterminer')}</span></p>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 text-sm">
                            <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                <span className="flex items-center text-muted-foreground"><Users className="mr-2 h-4 w-4"/>Membres</span>
                                <span className="font-bold">{group.members.length} / {group.totalRounds}</span>
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
                            <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" />Fin: {group.finalReceptionDate === "N/A" ? "N/A" : format(new Date(group.finalReceptionDate), "dd/MM/yy")}</span>
                        </CardFooter>
                    </Card>
                </Link>
                ))}
            </div>
        ) : null}
          {!isLoading && groups.length === 0 && (
            <div className="text-center py-12 px-6 bg-card rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">Bienvenue !</h3>
                <p className="text-muted-foreground mb-4">Vous ne faites partie d'aucune association pour le moment.</p>
                <p className="text-muted-foreground">Créez-en une ou rejoignez un groupe existant avec un code d'invitation.</p>
            </div>
        )}
        {error && <p className="text-destructive">Erreur: {error.message}</p>}
      </div>
    </div>
  );
}
