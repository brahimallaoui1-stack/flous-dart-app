
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { useEffect, useState } from 'react';

function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4 animate-fadeIn">
      <div className="animate-scaleIn">
        <Logo className="h-24 w-24 md:h-32 md:w-32 text-primary" />
      </div>
      <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground tracking-tight mt-6">
        Flous Dart
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground mt-2">
        Bienvenue dans votre solution d'épargne.
      </p>
    </div>
  )
}

export default function Home() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setYear(new Date().getFullYear());
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background animate-fadeIn">
      <header className="p-4 flex justify-start">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-headline text-foreground">Flous Dart</span>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground tracking-tight mb-4">
            Gérez vos tontines en toute simplicité
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Flous Dart est une application intelligente qui vous permet de gérer facilement, numériquement et en toute sécurité vos cycles d’épargne collective, avec une transparence totale et une organisation optimale.
          </p>
          <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-shadow">
            <Link href="/login">Commencer</Link>
          </Button>
        </div>
      </main>
      <footer className="p-4 text-center text-muted-foreground text-sm">
        © {year} Flous Dart. Tous droits réservés.
      </footer>
    </div>
  );
}
