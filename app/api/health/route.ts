import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health check endpoint mejorado
 * Railway usa este endpoint para verificar que el servicio está listo
 * Incluye verificación de conexión a Supabase
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // Verificar conexión a Supabase
    let supabaseStatus = 'unknown';
    try {
      const supabase = await createClient();
      const { error } = await supabase.from('users').select('count').limit(1).single();
      supabaseStatus = error ? 'error' : 'connected';
    } catch (supabaseError) {
      supabaseStatus = 'error';
      console.error('Supabase health check error:', supabaseError);
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      services: {
        supabase: supabaseStatus
      },
      responseTime: `${responseTime}ms`
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD request para health checks rápidos sin body
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
