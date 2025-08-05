
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/logo';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';

// Function to create a user document in Firestore
const createUserDocument = async (user: User, name?: string) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: name || user.displayName || 'Utilisateur',
    photoURL: user.photoURL
  };
  await setDoc(userRef, userData, { merge: true });
};

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if(userCredential.user) {
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                await createUserDocument(userCredential.user, name);
            }
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Signup error:', error);
            let errorMessage = "Une erreur est survenue lors de l'inscription.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Cette adresse e-mail est déjà utilisée par un autre compte.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
            }
             toast({
                variant: "destructive",
                title: "Erreur d'inscription",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };


  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                 <Link href="/" aria-label="Accueil">
                    <Logo className="h-12 w-12 text-primary" />
                 </Link>
            </div>
          <CardTitle className="text-2xl font-headline">Créer un compte</CardTitle>
          <CardDescription>Rejoignez Flous Dart pour commencer à gérer vos tontines.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input 
                    id="name" 
                    type="text" 
                    placeholder="John Doe" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                    id="email" 
                    type="email" 
                    placeholder="exemple@email.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? "Création en cours..." : "Créer le compte"}
              </Button>
              </CardFooter>
        </form>
        <div className="px-6 pb-6 flex flex-col gap-4">
            <p className="text-center text-sm text-muted-foreground">
            Vous avez déjà un compte?{' '}
            <Link href="/login" className="underline text-primary hover:text-primary/80">
                Se connecter
            </Link>
            </p>
        </div>
      </Card>
    </div>
  );
}
