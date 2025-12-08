export async function isSupabaseReachable(timeoutMs: number = 1500): Promise<boolean> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }

    if (typeof window === 'undefined') {
        // En server, asumir disponible para no bloquear SSR
        return true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        await fetch(supabaseUrl, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
        });
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(timeoutId);
    }
}
