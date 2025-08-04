
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { useEffect, useState } from 'react';

export default function Home() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="p-4 flex justify-start">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-headline text-foreground">Flous Dart</span>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-6">
            <Logo className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground tracking-tight mb-4">
            Gérez vos tontines en toute simplicité
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Flous Dart est une application intelligente pour gérer numériquement et en toute sécurité vos cycles d'épargne collective.
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
