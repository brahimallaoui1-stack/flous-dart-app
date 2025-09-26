
'use client';

import Link from 'next/link';
import { Users, Loader2, Calendar, CircleDollarSign, Hash, ChevronsRight, Crown, Repeat, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, documentId, Timestamp } from 'firebase/firestore';
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

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
    totalContribution: number;
    finalReceptionDate: Date | null;
}

async function fetchUserDetails(userIds: string[]): Promise<Map<string, UserDetails>> {
    const userDetailsMap = new Map<string, UserDetails>();
    if (userIds.length === 0) {
        return userDetailsMap;
    }

    const usersRef = collection(db, 'users');
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

export default function MyGroupsPage() {
  const [user] = useAuthState(auth);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  
  const [groupsCollection, loadingCollection, error] = useCollection(
    user ? query(collection(db, 'groups'), where('members', 'array-contains', user.uid)) : null
  );

  const getFrequencyLabel = (frequency: 'monthly' | 'weekly' | 'bi-weekly') => {
    switch (frequency) {
        case 'monthly': return 'Mensuel';
        case 'weekly': return 'Hebdomadaire';
        case 'bi-weekly': return 'Bi-mensuel';
        default: return 'N/A';
    }
  }

  const getStatusBadgeVariant = (status: 'En attente' | 'En cours' | 'Terminé') => {
    switch (status) {
        case 'En cours': return 'bg-green-500 text-white hover:bg-green-600';
        case 'Terminé': return 'bg-gray-500 text-white hover:bg-gray-600';
        case 'En attente':
        default: return 'secondary';
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
                    totalContribution: data.contribution * totalRounds,
                    finalReceptionDate: finalReceptionDate,
                } as Group;
            });
            setAllGroups(userGroups);
            setLoadingGroups(false);
        } else if (!loadingCollection) {
            setLoadingGroups(false);
        }
    };

    processGroups();
  }, [groupsCollection, loadingCollection, user]);

  const { currentGroups, previousGroups } = useMemo(() => {
    const current = allGroups.filter(g => g.status === 'En cours' || g.status === 'En attente');
    const previous = allGroups.filter(g => g.status === 'Terminé');
    return { currentGroups: current, previousGroups: previous };
  }, [allGroups]);

  const isLoading = loadingCollection || loadingGroups;

  const GroupGrid = ({ groups, emptyMessage }: { groups: Group[], emptyMessage: string }) => {
    if (groups.length === 0) {
      return (
        <div className="text-center py-12 px-6 bg-card rounded-lg shadow-md mt-6">
            <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 mt-6">
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
                            <span className="flex items-center text-muted-foreground text-xs mb-1"><Repeat className="mr-1 h-3 w-3"/>Fréquence</span>
                            <span className="font-bold capitalize">{getFrequencyLabel(group.frequency)}</span>
                        </div>
                         <div className="flex flex-col p-2 rounded-md bg-muted/50">
                            <span className="flex items-center text-muted-foreground text-xs mb-1"><Users className="mr-1 h-3 w-3"/>Membres</span>
                            <span className="font-bold">{group.members.length} / {group.totalRounds}</span>
                        </div>
                        <div className="flex flex-col p-2 rounded-md bg-muted/50">
                            <span className="flex items-center text-muted-foreground text-xs mb-1"><CircleDollarSign className="mr-1 h-3 w-3"/>Cotisation</span>
                            <span className="font-bold">{group.contribution} MAD</span>
                        </div>
                    </div>
                     <div className="flex flex-col p-2 rounded-md bg-muted/50">
                        <span className="flex items-center text-muted-foreground text-xs mb-1"><Hash className="mr-1 h-3 w-3"/>Montant total</span>
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
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour au tableau de bord
            </Link>
        </Button>
      <h1 className="text-3xl font-bold font-headline tracking-tight mb-8">Mes groupes</h1>

        <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                <TabsTrigger value="current">Actuels</TabsTrigger>
                <TabsTrigger value="previous">Précédents</TabsTrigger>
            </TabsList>
            <TabsContent value="current">
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground">Chargement...</p>
                    </div>
                ) : (
                    <GroupGrid groups={currentGroups} emptyMessage="Aucun groupe à afficher dans cette catégorie." />
                )}
            </TabsContent>
            <TabsContent value="previous">
                {isLoading ? (
                     <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground">Chargement...</p>
                    </div>
                ) : (
                    <GroupGrid groups={previousGroups} emptyMessage="Aucun groupe précédent à afficher pour le moment" />
                )}
            </TabsContent>
        </Tabs>
        {error && <p className="text-destructive mt-4">Erreur: {error.message}</p>}
    </div>
  );
}

    

    