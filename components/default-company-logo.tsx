export function DefaultCompanyLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fondo degradado */}
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Fondo */}
      <rect width="100" height="100" rx="12" fill="url(#bg-gradient)" />

      {/* Ícono de tienda */}
      <g fill="url(#icon-gradient)">
        {/* Edificio principal */}
        <rect x="25" y="35" width="50" height="50" rx="3" />

        {/* Toldo */}
        <path d="M 20 35 L 25 30 L 75 30 L 80 35 Z" />
        <rect x="20" y="35" width="60" height="5" />

        {/* Ventanas */}
        <rect x="32" y="42" width="8" height="8" rx="1" fill="white" opacity="0.9" />
        <rect x="46" y="42" width="8" height="8" rx="1" fill="white" opacity="0.9" />
        <rect x="60" y="42" width="8" height="8" rx="1" fill="white" opacity="0.9" />

        {/* Puerta */}
        <rect x="42" y="60" width="16" height="25" rx="2" fill="white" opacity="0.9" />
        <circle cx="53" cy="72" r="1.5" fill="url(#icon-gradient)" />
      </g>
    </svg>
  );
}
