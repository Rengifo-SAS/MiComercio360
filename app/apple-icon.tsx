import { ImageResponse } from 'next/og';

// Configuración de la ruta del ícono
export const runtime = 'edge';
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Generar el ícono para Apple
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '36px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Edificio de tienda */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'scale(1.5)',
            }}
          >
            {/* Toldo */}
            <div
              style={{
                width: '80px',
                height: '12px',
                background: '#60a5fa',
                borderRadius: '6px 6px 0 0',
                display: 'flex',
                gap: '8px',
                padding: '0 8px',
              }}
            />
            {/* Rayas del toldo */}
            <div
              style={{
                width: '80px',
                height: '3px',
                background: 'rgba(255,255,255,0.3)',
                marginTop: '-3px',
              }}
            />

            {/* Edificio */}
            <div
              style={{
                width: '70px',
                height: '70px',
                background: 'white',
                borderRadius: '0 0 6px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px',
                gap: '6px',
              }}
            >
              {/* Ventanas */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    background: '#3b82f6',
                    borderRadius: '2px',
                  }}
                />
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    background: '#3b82f6',
                    borderRadius: '2px',
                  }}
                />
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    background: '#3b82f6',
                    borderRadius: '2px',
                  }}
                />
              </div>

              {/* Puerta */}
              <div
                style={{
                  width: '24px',
                  height: '32px',
                  background: '#3b82f6',
                  borderRadius: '3px',
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                $
              </div>
            </div>
          </div>

          {/* Badge POS */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'white',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#2563eb',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            POS
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
