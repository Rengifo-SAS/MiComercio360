import { Metadata } from 'next';
import RegisterExistingForm from '@/components/register-existing-form';

export const metadata: Metadata = {
  title: 'Registro de Usuario Existente',
  description: 'Complete su registro con un email previamente creado',
};

export default function RegisterExistingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete su registro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Su email ya existe en el sistema. Complete su registro para acceder.
          </p>
        </div>
        <RegisterExistingForm />
      </div>
    </div>
  );
}
