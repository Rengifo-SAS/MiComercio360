'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { createClient } from '@/lib/supabase/client';
import { LogoutButton } from './logout-button';
import { useEffect, useState } from 'react';

export function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getUser();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={'outline'}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={'default'}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
