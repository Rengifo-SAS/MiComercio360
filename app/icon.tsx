import { ImageResponse } from 'next/og';

// Configuración de la ruta del ícono
export const runtime = 'edge';
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Generar el ícono
export default function Icon() {
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
          borderRadius: '6px',
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
          {/* Edificio de tienda simplificado */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Toldo */}
            <div
              style={{
                width: '24px',
                height: '4px',
                background: '#60a5fa',
                borderRadius: '2px 2px 0 0',
              }}
            />
            {/* Edificio */}
            <div
              style={{
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '0 0 2px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '2px',
              }}
            >
              {/* Ventanas */}
              <div
                style={{
                  display: 'flex',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    background: '#3b82f6',
                    borderRadius: '1px',
                  }}
                />
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    background: '#3b82f6',
                    borderRadius: '1px',
                  }}
                />
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    background: '#3b82f6',
                    borderRadius: '1px',
                  }}
                />
              </div>
              {/* Puerta */}
              <div
                style={{
                  width: '6px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '1px',
                  marginTop: '2px',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
