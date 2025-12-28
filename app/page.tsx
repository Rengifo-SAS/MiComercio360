import { EnvVarWarning } from '@/components/env-var-warning';
import { AuthButton } from '@/components/auth-button';
import { POSHero } from '@/components/pos-hero';
import { POSFeatures } from '@/components/pos-features';
import { POSCTA } from '@/components/pos-cta';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { hasEnvVars } from '@/lib/utils';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={'/'} className="text-xl font-bold">
                MiComercio360
              </Link>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        <div className="flex-1 w-full">
          <POSHero />
          <POSFeatures />
          <POSCTA />
        </div>

        <footer className="w-full flex flex-col items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
            <p>MiComercio360 - Soluciones Rengifo SAS</p>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <a
                href="https://www.dian.gov.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                DIAN Colombia
              </a>
              <span>•</span>
              <a
                href="https://www.supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Supabase
              </a>
              <span>•</span>
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Next.js
              </a>
            </div>
          </div>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
