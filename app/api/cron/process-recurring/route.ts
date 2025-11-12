import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación (opcional, dependiendo de si quieres que sea público para cron jobs)
    // Si es para cron jobs externos, puedes usar un token de autenticación
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener fecha de procesamiento del body o usar la fecha actual
    const body = await request.json().catch(() => ({}));
    const processDate = body.date || null;

    // Ejecutar la función de procesamiento
    const { data, error } = await supabase.rpc('process_all_recurring_items', {
      p_process_date: processDate
    });

    if (error) {
      console.error('Error procesando facturas recurrentes:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: data
    });

  } catch (error) {
    console.error('Error en proceso de facturas recurrentes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener fecha de procesamiento de los query params o usar la fecha actual
    const { searchParams } = new URL(request.url);
    const processDate = searchParams.get('date') || null;

    // Ejecutar la función de procesamiento
    const { data, error } = await supabase.rpc('process_all_recurring_items', {
      p_process_date: processDate
    });

    if (error) {
      console.error('Error procesando facturas recurrentes:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: data
    });

  } catch (error) {
    console.error('Error en proceso de facturas recurrentes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

