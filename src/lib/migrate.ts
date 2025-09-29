import { API_BASE, apiPost, apiPut } from './api';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function migrateFromLocalStorageOnce(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const flagKey = 'mm_migrated_v1';
    if (localStorage.getItem(flagKey) === '1') return;

    // Esperar a que el backend esté arriba para evitar ERR_CONNECTION_REFUSED
    const waitForApi = async (retries = 10, delayMs = 500): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        try {
          const r = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
          if (r.ok) return true;
        } catch {}
        await new Promise(res => setTimeout(res, delayMs));
      }
      return false;
    };
    const ok = await waitForApi();
    if (!ok) return; // si el backend no responde aún, no bloqueamos el render; volverá a intentar si borran el flag

    // 1) Settings
    const financialData = safeParse<any>(localStorage.getItem('mm_financialData'));
    if (financialData) {
      await apiPut<any>(`/api/settings/financialData`, financialData);
    }

    const flexSettings = safeParse<any>(localStorage.getItem('mm_flex_settings'));
    if (flexSettings) {
      await apiPut<any>(`/api/settings/flexSettings`, flexSettings);
    }

    const dailyTargets = safeParse<any>(localStorage.getItem('mm_daily_targets'));
    if (dailyTargets) {
      await apiPut<any>(`/api/settings/dailyTargets`, dailyTargets);
    }

    // 2) Week data (array de días con date/reservations/...)
    const weekData = safeParse<any[]>(localStorage.getItem('mm_week_data'));
    if (Array.isArray(weekData)) {
      for (const day of weekData) {
        if (day && typeof day.date === 'string') {
          await apiPut<any>(`/api/week-data/${encodeURIComponent(day.date)}`, day);
        }
      }
    }

    // 3) Weekly billing (objeto por semana)
    const weeklyBilling = safeParse<Record<string, any>>(localStorage.getItem('mm_weekly_billing'));
    if (weeklyBilling && typeof weeklyBilling === 'object') {
      for (const [weekKey, value] of Object.entries(weeklyBilling)) {
        await apiPut<any>(`/api/weekly-billing/${encodeURIComponent(weekKey)}`, { ...value, weekKey });
      }
    }

    // 4) Expenses variable
    const expVar = safeParse<any[]>(localStorage.getItem('mm_expenses_variable'));
    if (Array.isArray(expVar)) {
      for (const it of expVar) {
        try { await apiPost<any>(`/api/expenses/variable`, it); } catch {}
      }
    }

    // 5) Expenses fixed
    const expFixed = safeParse<any[]>(localStorage.getItem('mm_expenses_fixed'));
    if (Array.isArray(expFixed)) {
      for (const it of expFixed) {
        try { await apiPost<any>(`/api/expenses/fixed`, it); } catch {}
      }
    }

    // 6) Accessories
    const accessories = safeParse<any[]>(localStorage.getItem('mm_accessories'));
    if (Array.isArray(accessories)) {
      for (const it of accessories) {
        try { await apiPost<any>(`/api/accessories`, it); } catch {}
      }
    }

    // 7) Known locals
    const knownLocals = safeParse<any[]>(localStorage.getItem('mm_known_locals'));
    if (Array.isArray(knownLocals)) {
      for (const it of knownLocals) {
        if (it?.name) {
          try { await apiPut<any>(`/api/known-locals/${encodeURIComponent(it.name)}`, it); } catch {}
        }
      }
    }

    // Flag final: migración completa
    localStorage.setItem(flagKey, '1');
  } catch (e) {
    // Si algo falla, no bloqueamos la app. Puede reintentar borrando el flag.
    console.warn('Migración automática falló o parcial:', e);
  }
}
