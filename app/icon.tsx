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
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
          borderRadius: '50%',
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
          {/* Caja registradora minimalista */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Pantalla digital superior */}
            <div
              style={{
                width: '14px',
                height: '6px',
                background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '1.5px',
                marginBottom: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '4px',
                  color: '#22d3ee',
                  display: 'flex',
                  fontWeight: 'bold',
                }}
              >
                $
              </div>
            </div>

            {/* Recibo de papel saliendo */}
            <div
              style={{
                width: '6px',
                height: '4px',
                background: 'white',
                borderRadius: '0.5px',
                marginBottom: '1px',
                opacity: 0.95,
              }}
            />

            {/* Cuerpo de la caja */}
            <div
              style={{
                width: '20px',
                height: '14px',
                background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%)',
                borderRadius: '2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* Teclado numérico (3x3 simplificado) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1px',
                  marginTop: '1px',
                }}
              >
                {/* Fila 1 */}
                <div style={{ display: 'flex', gap: '1px' }}>
                  <div
                    style={{
                      width: '3px',
                      height: '2px',
                      background: 'rgba(37, 99, 235, 0.6)',
                      borderRadius: '0.5px',
                    }}
                  />
                  <div
                    style={{
                      width: '3px',
                      height: '2px',
                      background: 'rgba(37, 99, 235, 0.6)',
                      borderRadius: '0.5px',
                    }}
                  />
                  <div
                    style={{
                      width: '3px',
                      height: '2px',
                      background: 'rgba(37, 99, 235, 0.6)',
                      borderRadius: '0.5px',
                    }}
                  />
                </div>
                {/* Fila 2 */}
                <div style={{ display: 'flex', gap: '1px' }}>
                  <div
                    style={{
                      width: '3px',
                      height: '2px',
                      background: 'rgba(37, 99, 235, 0.6)',
                      borderRadius: '0.5px',
                    }}
                  />
                  <div
                    style={{
                      width: '3px',
                      height: '2px',
                      background: 'rgba(37, 99, 235, 0.6)',
                      borderRadius: '0.5px',
                    }}
                  />
                  <div
                    style={{
                      width: '3px',
                      height: '2px',
                      background: 'rgba(37, 99, 235, 0.6)',
                      borderRadius: '0.5px',
                    }}
                  />
                </div>
              </div>

              {/* Cajón de dinero */}
              <div
                style={{
                  width: '18px',
                  height: '3px',
                  background: 'rgba(30, 41, 59, 0.3)',
                  borderRadius: '1px',
                  position: 'absolute',
                  bottom: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '1.5px',
                    height: '1.5px',
                    background: '#64748b',
                    borderRadius: '50%',
                  }}
                />
              </div>
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
