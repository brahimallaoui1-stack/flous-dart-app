
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/logo';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 12.5a3.5 3.5 0 0 0 3.5-3.5h-7a3.5 3.5 0 1 1 7 0c0 1.503-.904 2.79-2.182 3.322" />
      </svg>
    );
}

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
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
    
    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await createUserDocument(result.user);
            router.push('/dashboard');
        } catch (error: any) {
            console.error("Google signup error:", error);
            toast({
                variant: "destructive",
                title: "Erreur d'inscription avec Google",
                description: "Une erreur est survenue. Veuillez réessayer.",
            });
        } finally {
            setIsGoogleLoading(false);
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
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={isLoading || isGoogleLoading}>
                {isLoading ? "Création en cours..." : "Créer le compte"}
              </Button>
              <div className="relative w-full">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-card px-2 text-sm text-muted-foreground">OU</span>
              </div>
              </CardFooter>
        </form>
        <div className="px-6 pb-6 flex flex-col gap-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={isLoading || isGoogleLoading}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                {isGoogleLoading ? "Inscription avec Google..." : "S'inscrire avec Google"}
            </Button>
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
