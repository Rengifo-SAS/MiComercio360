'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const supabase = createClient();

export default function RegisterExistingForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'register' | 'success' | 'error'>(
    'email'
  );
  const [error, setError] = useState('');
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const router = useRouter();

  const checkEmailExists = async () => {
    if (!email) {
      setError('Por favor ingrese un email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc(
        'check_email_exists_for_registration',
        {
          p_email: email,
        }
      );

      if (error) {
        throw error;
      }

      if (data.exists && data.can_register) {
        setProfileInfo(data);
        setStep('register');
      } else {
        setError(data.message || 'Este email no puede ser registrado');
      }
    } catch (err: any) {
      setError(err.message || 'Error verificando email');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: profileInfo.full_name,
            role: profileInfo.role,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Activar el perfil existente
        const { error: activateError } = await supabase.rpc(
          'activate_profile_after_registration',
          {
            p_profile_id: profileInfo.profile_id,
            p_auth_user_id: authData.user.id,
          }
        );

        if (activateError) {
          console.error('Error activando perfil:', activateError);
          // No lanzar error aquí, el usuario ya se registró
        }

        setStep('success');

        // Redirigir después de 2 segundos
        setTimeout(() => {
          // Forzar recarga de la página para actualizar el estado de autenticación
          window.location.href = '/dashboard';
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Error en el registro');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verificar Email</CardTitle>
          <CardDescription>
            Ingrese su email para verificar si puede completar su registro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              checkEmailExists();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="su@email.com"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Email'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === 'register') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete su registro</CardTitle>
          <CardDescription>
            Hola {profileInfo?.full_name}, complete su registro para acceder al
            sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="email-display">Email</Label>
              <Input
                id="email-display"
                type="email"
                value={email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita su contraseña"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('email')}
                className="flex-1"
              >
                Volver
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Completar Registro'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900">
              ¡Registro exitoso!
            </h3>
            <p className="text-sm text-gray-600">
              Su cuenta ha sido activada. Será redirigido al dashboard en unos
              segundos...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">
            Error en el registro
          </h3>
          <p className="text-sm text-gray-600">{error}</p>
          <Button onClick={() => setStep('email')} variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
