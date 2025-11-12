import { EnvVarWarning } from '@/components/env-var-warning';
import { AuthButton } from '@/components/auth-button';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { hasEnvVars } from '@/lib/utils';
import Link from 'next/link';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      {/* Minimalist Navigation */}
      <nav className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center max-w-6xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <Link
              href={'/'}
              className="font-bold text-slate-900 dark:text-white text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              MiComercio360
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative">{children}</div>

      {/* Minimalist Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-700/50 mt-16">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © {new Date().getFullYear()} MiComercio360. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
