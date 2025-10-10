export interface Country {
  code: string;
  name: string;
  phoneCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CO', name: 'Colombia', phoneCode: '+57', flag: '🇨🇴' },
  { code: 'US', name: 'Estados Unidos', phoneCode: '+1', flag: '🇺🇸' },
  { code: 'MX', name: 'México', phoneCode: '+52', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', phoneCode: '+54', flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', phoneCode: '+55', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', phoneCode: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', phoneCode: '+51', flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', phoneCode: '+593', flag: '🇪🇨' },
  { code: 'VE', name: 'Venezuela', phoneCode: '+58', flag: '🇻🇪' },
  { code: 'UY', name: 'Uruguay', phoneCode: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', phoneCode: '+595', flag: '🇵🇾' },
  { code: 'BO', name: 'Bolivia', phoneCode: '+591', flag: '🇧🇴' },
  { code: 'GT', name: 'Guatemala', phoneCode: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', phoneCode: '+504', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', phoneCode: '+503', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', phoneCode: '+505', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica', phoneCode: '+506', flag: '🇨🇷' },
  { code: 'PA', name: 'Panamá', phoneCode: '+507', flag: '🇵🇦' },
  { code: 'CU', name: 'Cuba', phoneCode: '+53', flag: '🇨🇺' },
  { code: 'DO', name: 'República Dominicana', phoneCode: '+1', flag: '🇩🇴' },
  { code: 'ES', name: 'España', phoneCode: '+34', flag: '🇪🇸' },
  { code: 'FR', name: 'Francia', phoneCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', phoneCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italia', phoneCode: '+39', flag: '🇮🇹' },
  { code: 'GB', name: 'Reino Unido', phoneCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canadá', phoneCode: '+1', flag: '🇨🇦' },
  { code: 'JP', name: 'Japón', phoneCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'Corea del Sur', phoneCode: '+82', flag: '🇰🇷' },
  { code: 'CN', name: 'China', phoneCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'India', phoneCode: '+91', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', phoneCode: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'Nueva Zelanda', phoneCode: '+64', flag: '🇳🇿' },
];
