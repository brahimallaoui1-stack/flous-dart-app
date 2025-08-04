
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const createGroupSchema = z.object({
  groupName: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  contributionAmount: z.coerce.number().min(1, 'Le montant doit être supérieur à 0.'),
  membersNumber: z.coerce.number().min(2, 'Il doit y avoir au moins 2 membres.'),
  paymentFrequency: z.enum(['monthly', 'weekly'], {
    required_error: 'Veuillez sélectionner une fréquence.',
  }),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateGroupPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      groupName: '',
      contributionAmount: 1000,
      membersNumber: 12,
      paymentFrequency: 'monthly',
    },
  });

  const onSubmit = async (data: CreateGroupForm) => {
    if (!user) {
      toast({ variant: 'destructive', description: 'Vous devez être connecté pour créer un groupe.' });
      return;
    }

    setIsLoading(true);

    try {
      const groupData = {
        name: data.groupName,
        contribution: data.contributionAmount,
        frequency: data.paymentFrequency,
        maxMembers: data.membersNumber,
        members: [user.uid],
        admin: user.uid,
        createdAt: serverTimestamp(),
        status: 'En attente',
        inviteCode: generateInviteCode(),
        currentRound: 0,
        totalRounds: data.membersNumber,
      };

      const docRef = await addDoc(collection(db, 'groups'), groupData);
      
      toast({ description: 'Votre association a été créée avec succès !' });
      router.push(`/dashboard/groups/${docRef.id}`);

    } catch (error) {
      console.error('Error creating group:', error);
      toast({ variant: 'destructive', description: "Une erreur est survenue lors de la création de l'association." });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour au tableau de bord
            </Link>
        </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Créer une nouvelle association</CardTitle>
          <CardDescription>
            Remplissez les informations ci-dessous pour démarrer votre nouveau cycle d'épargne.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
               <FormField
                  control={form.control}
                  name="groupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'association</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Tontine des entrepreneurs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <FormField
                  control={form.control}
                  name="contributionAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant de la contribution (en MAD)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <FormField
                  control={form.control}
                  name="membersNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de membres</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="paymentFrequency"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Fréquence des paiements</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="monthly" />
                          </FormControl>
                          <FormLabel className="font-normal">Mensuel</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="weekly" />
                          </FormControl>
                          <FormLabel className="font-normal">Hebdomadaire</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? 'Création en cours...' : 'Créer et inviter des membres'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
