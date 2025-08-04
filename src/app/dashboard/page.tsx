
'use client';

import Link from 'next/link';
import { PlusCircle, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface Group {
    id: string;
    name: string;
    members: string[];
    status: string;
    nextBeneficiary?: string; // This would need to be calculated
}

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [groups, setGroups] = useState<Group[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


  const [groupsCollection, loading, error] = useCollection(
    user ? query(collection(db, 'groups'), where('members', 'array-contains', user.uid)) : null
  );

  useEffect(() => {
    if (groupsCollection) {
      const userGroups = groupsCollection.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Group));
      setGroups(userGroups);
    }
  }, [groupsCollection]);
  
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
              return;
          }

          const groupDoc = querySnapshot.docs[0];
          const groupData = groupDoc.data();

          if (groupData.members.includes(user.uid)) {
              toast({ variant: 'destructive', description: "Vous êtes déjà membre de cette association." });
              return;
          }

          if (groupData.members.length >= groupData.maxMembers) {
              toast({ variant: 'destructive', description: "Cette association est déjà complète." });
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

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Espace Membre</h1>
        <Button asChild>
          <Link href="/dashboard/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer une nouvelle association
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 md:order-first md:row-span-2">
            <h2 className="text-2xl font-semibold mb-4">Mes associations</h2>
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Chargement de vos associations...</p>
                </div>
            )}
            {!loading && groups.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2">
                    {groups.map((group) => (
                    <Link href={`/dashboard/groups/${group.id}`} key={group.id} className="block hover:scale-[1.02] transition-transform duration-200">
                        <Card className="h-full flex flex-col shadow-md hover:shadow-xl transition-shadow">
                        <CardHeader>
                            <CardTitle>{group.name}</CardTitle>
                            <CardDescription>Prochain bénéficiaire: A déterminer</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="mr-2 h-4 w-4" />
                            <span>{group.members.length} membres</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Badge variant={group.status === 'En cours' ? 'default' : 'secondary'} className={group.status === 'En cours' ? 'bg-green-500 text-white' : ''}>
                            {group.status}
                            </Badge>
                        </CardFooter>
                        </Card>
                    </Link>
                    ))}
                </div>
            ) : null}
             {!loading && groups.length === 0 && (
                <div className="text-center py-12 px-6 bg-card rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-2">Bienvenue !</h3>
                    <p className="text-muted-foreground mb-4">Vous ne faites partie d'aucune association pour le moment.</p>
                    <p className="text-muted-foreground">Créez-en une ou rejoignez un groupe existant avec un code d'invitation.</p>
                </div>
            )}
            {error && <p className="text-destructive">Erreur: {error.message}</p>}
        </div>

        <div className="md:order-last">
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
    </div>
  );
}
