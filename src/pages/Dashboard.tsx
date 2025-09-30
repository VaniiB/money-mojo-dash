import { useState, useEffect, useMemo, type SyntheticEvent, useRef } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { DollarSign, TrendingUp, Target, Plus, Star } from "lucide-react";

import ModernStatCard from "@/components/ModernStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Interfaces for weekly data
interface Reservation {
  id: string;
  local: string;
  amount: number;
  person: "vanina" | "leonardo";
  shift: "dia" | "noche";
  status: "reservado" | "facturado" | "cobrado";
}

type KnownLocal = {
  name: string;
  logoUrl?: string;
  favorite?: boolean;
};

interface DayData {
  date: string;
  reservations: Reservation[];
  envios_day_packages: number;
  envios_night_packages: number;
  tip_day?: number;    // propina turno día
  tip_night?: number;  // propina turno noche
}

// Mock weekly data
const mockWeekData: DayData[] = [
  {
    date: "2024-01-22",
    reservations: [
      { id: "1", local: "Centro", amount: 4200, person: "vanina", shift: "noche", status: "cobrado" },
      { id: "2", local: "Zona Norte", amount: 3800, person: "leonardo", shift: "dia", status: "facturado" }
    ],
    envios_day_packages: 2,
    envios_night_packages: 1
  },
  {
    date: "2024-01-23",
    reservations: [
      { id: "3", local: "Centro", amount: 3900, person: "vanina", shift: "dia", status: "cobrado" }
    ],
    envios_day_packages: 1,
    envios_night_packages: 0
  }
];

// Financial base data (updated goal and deadline)
const initialFinancialData = {
  currentSavings: 1310000, // Actualizado a $1,310,000
  pendingPayments: {
    rapiboy: 75000,
    other: 98000
  },
  monthlyFixedExpenses: 135000 + 50000 + 50000 + 10000 + 100000 + 24000 + 60000 + 20000 + 150000 + 20000, // 619000
  motoGoal: {
    target: 2050000, // Corregido a $2,050,000
    current: 120000,
    deadline: "2024-10-20"
  },
  documentsGoal: 300000 // Papeles/documentación
};

const ENVIO_RATES = {
  day: 2800,
  night: 3800
};

export default function Dashboard() {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [financialData, setFinancialData] = useState(initialFinancialData);
  // Flags para evitar sobrescribir la DB al cargar por primera vez
  const [loaded, setLoaded] = useState<{ flex: boolean; known: boolean; week: boolean; financial: boolean; billing: boolean }>({ flex: false, known: false, week: false, financial: false, billing: false });
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday;
  });

  const [showNewReservation, setShowNewReservation] = useState<string | null>(null);
  // Facturación manual por persona (opcional)
  const [manualBilling, setManualBilling] = useState<{ vanina?: number; leonardo?: number }>({});
  // Facturación semanal por persona (para "Cortes Semanales")
  // Además guardamos cuánto ya fue registrado para evitar duplicar.
  const [weeklyBilling, setWeeklyBilling] = useState<Record<string, { vanina?: number; leonardo?: number; registeredSum?: number; registeredAt?: string }>>({});
  const [newReservation, setNewReservation] = useState({
    local: "",
    amount: "",
    person: "vanina" as "vanina" | "leonardo",
    shift: "dia" as "dia" | "noche"
  });
  // Edición por fila: paquetes pendientes a aplicar
  const [pendingPackages, setPendingPackages] = useState<Record<string, { day: number; night: number }>>({});
  // Base de locales conocidos (para sugerencias y logos)
  const [knownLocals, setKnownLocals] = useState<KnownLocal[]>([]);
  // Edición del local (cuando abrís un chip)
  const [editLocal, setEditLocal] = useState<{ name: string; logoUrl: string }>({ name: "", logoUrl: "" });
  // Google Places
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [placePredictions, setPlacePredictions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const placeDebounceRef = useRef<number | null>(null);

  const isFavoriteLocal = (name: string) => {
    return knownLocals.some(k => k.name.toLowerCase() === name.toLowerCase() && !!k.favorite);
  };
  const toggleFavoriteLocal = (name: string, logoUrl?: string) => {
    setKnownLocals(prev => {
      const idx = prev.findIndex(k => k.name.toLowerCase() === name.toLowerCase());
      const updated = [...prev];
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], favorite: !updated[idx].favorite, logoUrl: updated[idx].logoUrl || logoUrl };
      } else {
        updated.push({ name, logoUrl, favorite: true });
      }
      return updated;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Configuración de planificación Flex (persistente)
  const [settings, setSettings] = useState({
    additionalSavings: 950000, // ahorro adicional confirmado (p.e. préstamo)
    nightWeightWeekday: 70,    // % peso Noche entre semana
    nightWeightWeekend: 80,    // % peso Noche finde (vie/sáb/dom)
    weekendNightMin: 10,       // mínimo de paquetes Noche en finde
    minDayAll: 1,              // mínimo paquetes de Día (todos los días)
    minNightWeekday: 1,        // mínimo paquetes de Noche entre semana
    daySharePercent: 70,       // preferencia: % de paquetes al turno Día (resto Noche)
  });

  // Gastos desde API para cálculos de la semana
  const [varExpensesAll, setVarExpensesAll] = useState<Array<{ date: string; amount: number }>>([]);
  const [fixedExpensesAll, setFixedExpensesAll] = useState<Array<{ date: string; amount: number; paid?: boolean }>>([]);

  // Cargar ajustes flex desde API y guardar cambios en API
  useEffect(() => {
    const load = async () => {
      const data = await apiGet<any>(`/api/settings/flexSettings`);
      if (data && typeof data === 'object') {
        setSettings(prev => ({
          additionalSavings: typeof data.additionalSavings === 'number' ? data.additionalSavings : prev.additionalSavings,
          nightWeightWeekday: typeof data.nightWeightWeekday === 'number' ? data.nightWeightWeekday : prev.nightWeightWeekday,
          nightWeightWeekend: typeof data.nightWeightWeekend === 'number' ? data.nightWeightWeekend : prev.nightWeightWeekend,
          weekendNightMin: typeof data.weekendNightMin === 'number' ? data.weekendNightMin : prev.weekendNightMin,
          minDayAll: typeof data.minDayAll === 'number' ? data.minDayAll : prev.minDayAll,
          minNightWeekday: typeof data.minNightWeekday === 'number' ? data.minNightWeekday : prev.minNightWeekday,
          daySharePercent: typeof data.daySharePercent === 'number' ? data.daySharePercent : prev.daySharePercent,
        }));
        setLoaded(l => ({ ...l, flex: true }));
      }
    };
    load();
  }, []);
  useEffect(() => {
    if (!loaded.flex) return;
    apiPut(`/api/settings/flexSettings`, settings).catch(() => { });
  }, [settings]);

  // Cargar Google Places usando API Key desde variables de entorno (Vite: VITE_GOOGLE_API_KEY)
  useEffect(() => {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env || {} as Record<string, string>;
    const apiKey = env.VITE_GOOGLE_API_KEY || "";
    if (!apiKey) return;
    if ((window as unknown as { google?: any }).google?.maps?.places) { setGoogleLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es&region=AR`;
    script.async = true;
    script.onload = () => setGoogleLoaded(true);
    script.onerror = () => setGoogleLoaded(false);
    document.head.appendChild(script);
  }, []);

  const searchPlacesOnline = (query: string) => {
    if (!googleLoaded || !query) { setPlacePredictions([]); return; }
    try {
      setPlacesLoading(true);
      const svc = new (window as unknown as { google: any }).google.maps.places.AutocompleteService();
      svc.getPlacePredictions({ input: query, componentRestrictions: { country: 'ar' } }, (preds: any[], status: string) => {
        setPlacesLoading(false);
        if (!Array.isArray(preds)) { setPlacePredictions([]); return; }
        setPlacePredictions(preds.map(p => ({ description: p.description, place_id: p.place_id })));
      });
    } catch {
      setPlacesLoading(false);
    }
  };

  const pickPlacePrediction = (placeId: string) => {
    if (!googleLoaded) return;
    try {
      const svc = new (window as unknown as { google: any }).google.maps.places.PlacesService(document.createElement('div'));
      svc.getDetails({ placeId, fields: ['name', 'photos'] }, (details: any, status: string) => {
        if (!details) return;
        const name = details.name || editLocal.name;
        const photoUrl = details.photos && details.photos[0] ? details.photos[0].getUrl({ maxWidth: 128, maxHeight: 128 }) : '';
        setEditLocal({ name, logoUrl: photoUrl });
      });
    } catch {
      // ignore
    }
  };

  // Cargar/salvar locales conocidos vía API
  useEffect(() => {
    const load = async () => {
      const docs = await apiGet<KnownLocal[]>(`/api/known-locals`);
      if (Array.isArray(docs)) { setKnownLocals(docs); setLoaded(l => ({ ...l, known: true })); }
    };
    load();
  }, []);
  useEffect(() => {
    // upsert cada local (simple; tamaño pequeño)
    if (!loaded.known) return;
    knownLocals.forEach(l => {
      if (l?.name) apiPut(`/api/known-locals/${encodeURIComponent(l.name)}`, l).catch(() => { });
    });
  }, [knownLocals]);

  // Mostrar opciones de una reserva al hacer click en el nombre (por chip)
  const [openResId, setOpenResId] = useState<string | null>(null);

  // Cargar datos principales desde la API
  useEffect(() => {
    const monday = new Date(currentWeekStart);
    const end = new Date(monday); end.setDate(monday.getDate() + 6);
    const startStr = monday.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const load = async () => {
      const fin = await apiGet<typeof initialFinancialData>(`/api/settings/financialData`);
      if (fin && fin.motoGoal) {
        setFinancialData(fin);
      } else {
        // si no hay registro en DB aún, usar defaults y permitir guardar
        setFinancialData(prev => prev ?? initialFinancialData);
      }
      setLoaded(l => ({ ...l, financial: true }));
      const days = await apiGet<DayData[]>(`/api/week-data?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`);
      if (Array.isArray(days)) { setWeekData(days); setLoaded(l => ({ ...l, week: true })); }
      const wb = await apiGet<Record<string, { vanina?: number; leonardo?: number; registeredSum?: number; registeredAt?: string }>>(`/api/weekly-billing/${encodeURIComponent(startStr)}`);
      if (wb) {
        setWeeklyBilling(prev => ({ ...prev, [startStr]: wb as any }));
      }
      setLoaded(l => ({ ...l, billing: true }));
      const v = await apiGet<Array<{ date: string; amount: number }>>(`/api/expenses/variable`);
      if (Array.isArray(v)) setVarExpensesAll(v);
      const f = await apiGet<Array<{ date: string; amount: number; paid?: boolean }>>(`/api/expenses/fixed`);
      if (Array.isArray(f)) setFixedExpensesAll(f);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  // Guardar en API cuando cambian estructuras principales
  useEffect(() => {
    // upsert por día modificado
    if (!loaded.week) return;
    weekData.forEach(day => { if (day?.date) apiPut(`/api/week-data/${encodeURIComponent(day.date)}`, day).catch(() => { }); });
  }, [weekData]);
  useEffect(() => {
    if (!loaded.financial) return;
    apiPut(`/api/settings/financialData`, financialData).catch(() => { });
  }, [financialData]);
  useEffect(() => {
    // Guardar billing de la semana actual si existe clave
    const key = new Date(currentWeekStart).toISOString().slice(0, 10);
    if (!loaded.billing) return;
    if (weeklyBilling[key]) apiPut(`/api/weekly-billing/${encodeURIComponent(key)}`, { ...weeklyBilling[key], weekKey: key }).catch(() => { });
  }, [weeklyBilling, currentWeekStart]);

  const getWeekString = () => {
    const monday = new Date(currentWeekStart);
    // asegurar que es lunes
    const day = monday.getDay();
    if (day !== 1) {
      monday.setDate(monday.getDate() - ((day + 6) % 7));
    }
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getDate()}/${monday.getMonth() + 1} al ${sunday.getDate()}/${sunday.getMonth() + 1} de ${monday.toLocaleDateString('es-ES', { month: 'long' })}`;
  };

  const getDayData = (dayOffset: number): DayData => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + dayOffset);
    const dateString = date.toISOString().split('T')[0];

    return weekData.find(d => d.date === dateString) || {
      date: dateString,
      reservations: [],
      envios_day_packages: 0,
      envios_night_packages: 0
    };
  };

  const calculateWeeklyTotals = () => {
    let cobradas = 0;
    let aCobrar = 0;
    let enviosTotal = 0;
    let tipsTotal = 0;

    // límites de la semana actual
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart); end.setDate(end.getDate() + 6);

    for (let i = 0; i < 7; i++) {
      const dayData = getDayData(i);
      dayData.reservations.forEach(res => {
        if (res.status === "cobrado") cobradas += res.amount;
        else aCobrar += res.amount;
      });
      enviosTotal += (dayData.envios_day_packages * ENVIO_RATES.day) + (dayData.envios_night_packages * ENVIO_RATES.night);
      tipsTotal += (dayData.tip_day || 0) + (dayData.tip_night || 0);
    }

    // Gastos variables de la semana desde API cargada
    const varExpenses = varExpensesAll.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    }).reduce((s, e) => s + (e.amount || 0), 0);

    // Gastos fijos (solo pagados) de la semana desde API cargada
    const fixedExpenses = fixedExpensesAll.filter(e => e.paid).filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    }).reduce((s, e) => s + (e.amount || 0), 0);

    const incomeTotal = cobradas + enviosTotal + tipsTotal;
    const expensesTotal = varExpenses + fixedExpenses;
    const net = incomeTotal - expensesTotal;

    // Total reservas = cobradas + aCobrar (contamos todas las reservas, no solo cobradas)
    const reservasTotal = cobradas + aCobrar;
    // Pedido del usuario: Total = Reservas (todas) + Envíos (sin propinas)
    const totalConReservasSinProp = reservasTotal + enviosTotal;

    return { cobradas, aCobrar, enviosTotal, tipsTotal, total: totalConReservasSinProp, expensesTotal, net: totalConReservasSinProp - expensesTotal };
  };

  const calculatePackagesNeeded = () => {
    // Objetivo: alcanzar meta para 20/10/2024, idealmente tenerlo listo en la semana 13-19/10
    const weeklyTotals = calculateWeeklyTotals();
    const today = new Date();
    const deadline = new Date(financialData.motoGoal.deadline);
    const remainingAmount = Math.max(0, financialData.motoGoal.target - financialData.motoGoal.current);

    // Días restantes hasta la fecha objetivo (si ya pasó, plan semanal de 7 días)
    const msPerDay = 1000 * 60 * 60 * 24;
    const rawDaysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / msPerDay);
    const daysRemaining = rawDaysRemaining > 0 ? rawDaysRemaining : 7;

    // Ingresos actuales de la semana (cobradas + envíos)
    const currentGenerated = weeklyTotals.total;

    // Necesidad diaria aproximada y conversión a paquetes usando tarifa promedio
    const dailyNeeded = remainingAmount / Math.max(1, daysRemaining);
    // Solo 2 turnos: Leo Día y Vani Noche
    // Reparto 50/50 por defecto
    const avgRate = (ENVIO_RATES.day + ENVIO_RATES.night) / 2;
    const dailyPackagesNeeded = Math.max(0, Math.ceil(dailyNeeded / avgRate));
    const dayShare = Math.min(100, Math.max(0, settings.daySharePercent ?? 60)) / 100;
    return {
      totalNeeded: Math.round(remainingAmount),
      faltante: Math.max(0, Math.round(remainingAmount - currentGenerated)),
      daysRemaining,
      dailyPackagesNeeded,
      leoDay: Math.ceil(dailyPackagesNeeded * dayShare),
      vaniaNight: Math.ceil(dailyPackagesNeeded * (1 - dayShare))
    };
  };

  // Helpers para logos de locales
  const knownLocalDomains: Record<string, string> = {
    "Centro": "centro.com.ar",
    "Zona Norte": "zonanorte.com.ar"
  };
  const getLocalLogo = (local: string) => {
    // 1) Local conocido con URL explícita
    const k = knownLocals.find(k => k.name.toLowerCase() === local.toLowerCase());
    if (k?.logoUrl) return k.logoUrl;
    // 2) Fallback: dominio conocido
    const domain = knownLocalDomains[local];
    if (domain) return `https://logo.clearbit.com/${domain}`;
    // 3) Heurística simple con .com.ar
    const simple = local.toLowerCase().replace(/\s+/g, "");
    return `https://logo.clearbit.com/${simple}.com.ar`;
  };

  // Helpers para totales de facturación por persona en la semana actual
  const getWeeklyPersonTotal = (person: "vanina" | "leonardo"): number => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      const day = weekData.find(x => x.date === dateString);
      if (!day) continue;
      total += day.reservations
        .filter(r => r.person === person)
        .reduce((s, r) => s + r.amount, 0);
    }
    return total;
  };

  // Generar lista de cortes semanales Lunes-Domingo desde 16-22 Sep hasta fin de año
  const weeklyCuts = useMemo(() => {
    const start = new Date("2024-09-16"); // lunes 16/09
    const end = new Date("2024-12-31");
    const weeks: { start: Date; end: Date; label: string }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const label = `${weekStart.getDate()} al ${weekEnd.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'long' })}`;
      weeks.push({ start: weekStart, end: weekEnd, label });
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, []);

  const getWeekTotals = (weekStart: Date) => {
    let cobradas = 0;
    let aCobrar = 0;
    let enviosTotal = 0;
    let tipsTotal = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      const day = weekData.find(x => x.date === dateString);
      if (!day) continue;
      day.reservations.forEach(res => {
        if (res.status === "cobrado") cobradas += res.amount; else aCobrar += res.amount;
      });
      enviosTotal += (day.envios_day_packages * ENVIO_RATES.day) + (day.envios_night_packages * ENVIO_RATES.night);
      tipsTotal += (day.tip_day || 0) + (day.tip_night || 0);
    }
    return { cobradas, aCobrar, enviosTotal, tipsTotal, total: cobradas + enviosTotal + tipsTotal };
  };

  const addReservation = (date: string) => {
    if (!newReservation.local || !newReservation.amount) return;

    const reservation: Reservation = {
      id: Date.now().toString(),
      local: newReservation.local,
      amount: parseFloat(newReservation.amount),
      person: newReservation.person,
      shift: newReservation.shift,
      status: "reservado"
    };

    setWeekData(prev => {
      const updated = [...prev];
      const dayIndex = updated.findIndex(d => d.date === date);
      if (dayIndex >= 0) {
        updated[dayIndex].reservations.push(reservation);
      } else {
        updated.push({
          date,
          reservations: [reservation],
          envios_day_packages: 0,
          envios_night_packages: 0
        });
      }
      return updated;
    });

    setNewReservation({ local: "", amount: "", person: "vanina", shift: "dia" });
    setShowNewReservation(null);
  };

  const updateReservationStatus = (reservationId: string, newStatus: "reservado" | "facturado" | "cobrado") => {
    setWeekData(prev => prev.map(day => ({
      ...day,
      reservations: day.reservations.map(res =>
        res.id === reservationId ? { ...res, status: newStatus } : res
      )
    })));
  };

  const updatePackages = (date: string, type: "day" | "night", value: number) => {
    setWeekData(prev => {
      const updated = [...prev];
      const dayIndex = updated.findIndex(d => d.date === date);
      if (dayIndex >= 0) {
        if (type === "day") {
          updated[dayIndex].envios_day_packages = value;
        } else {
          updated[dayIndex].envios_night_packages = value;
        }
      } else {
        updated.push({
          date,
          reservations: [],
          envios_day_packages: type === "day" ? value : 0,
          envios_night_packages: type === "night" ? value : 0
        });
      }
      return updated;
    });
  };

  const weeklyTotals = calculateWeeklyTotals();
  const packagesCalc = calculatePackagesNeeded();

  // Calcular objetivo diario de la moto (martes a domingo, más énfasis en fin de semana)
  // Considerar el ahorro actual + el progreso de la moto
  const totalCurrent = financialData.currentSavings + financialData.motoGoal.current;
  const motoRemaining = Math.max(0, 2050000 - totalCurrent);
  const today = new Date();
  const goalDate = new Date(2025, 9, 5); // 5 de octubre

  // Contar días de trabajo (martes a domingo) con pesos diferentes, incluyendo HOY
  const countWorkdays = (start: Date, end: Date) => {
    let totalWeight = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 2 = martes, 3 = miércoles, 4 = jueves, 5 = viernes, 6 = sábado, 0 = domingo
      if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
        // Martes, miércoles, jueves: peso normal (1)
        totalWeight += 1;
      } else if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
        // Viernes, sábado, domingo: más énfasis (1.5)
        totalWeight += 1.5;
      }
      current.setDate(current.getDate() + 1);
    }
    return totalWeight;
  };

  const workdaysWeight = Math.max(1, countWorkdays(today, goalDate));
  // Calcular meta diaria base (sin multiplicadores)
  const basePerDayValue = Math.ceil(motoRemaining / workdaysWeight);
  // Mostrar progreso y ahorro incluyendo ahorro adicional (p.e. préstamo)
  const displaySavings = financialData.currentSavings + settings.additionalSavings;
  const displayMotoCurrent = financialData.motoGoal.current + settings.additionalSavings;
  const motoProgress = (displayMotoCurrent / financialData.motoGoal.target) * 100;

  // Calcular gastos totales de la semana para descontar del Panel de Finanzas
  const weeklyExpenses = weeklyTotals.expensesTotal;
  const netSavings = financialData.currentSavings - weeklyExpenses; // Solo el ahorro real, sin préstamo
  // Tendencias semana previa
  const prevWeekStart = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    return d;
  }, [currentWeekStart]);
  const prevWeekTotals = getWeekTotals(prevWeekStart);
  const diffPct = (curr: number, prev: number) => prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

  // =============================
  // Plan Diario Flex (Día/Noche)
  // =============================
  const [dailyTargets, setDailyTargets] = useState<{ dayPacks: number; nightPacks: number }>(() => {
    try {
      const raw = localStorage.getItem("mm_daily_targets");
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("No se pudo leer mm_daily_targets", e); }
    // Por preferencia: más paquetes en Día que en Noche
    return { dayPacks: 14, nightPacks: 8 };
  });
  useEffect(() => {
    try { localStorage.setItem("mm_daily_targets", JSON.stringify(dailyTargets)); } catch (e) { console.warn("No se pudo guardar mm_daily_targets", e); }
  }, [dailyTargets]);

  const TODAY_STR = new Date().toISOString().slice(0, 10);
  // Obtener data del día actual desde weekData (misma estructura que la tabla semanal)
  const todayData = weekData.find(d => d.date === TODAY_STR) || {
    date: TODAY_STR, reservations: [], envios_day_packages: 0, envios_night_packages: 0
  };
  const reservationsDay = todayData.reservations.filter(r => r.shift === 'dia').reduce((s, r) => s + r.amount, 0);
  const reservationsNight = todayData.reservations.filter(r => r.shift === 'noche').reduce((s, r) => s + r.amount, 0);

  const dayTargetValue = dailyTargets.dayPacks * ENVIO_RATES.day;     // $ objetivo en Día por envíos
  const nightTargetValue = dailyTargets.nightPacks * ENVIO_RATES.night; // $ objetivo en Noche por envíos
  const dayBaseValue = Math.max(0, dayTargetValue - reservationsDay);
  const dayNeededPacks = Math.max(settings.minDayAll || 0, Math.ceil(dayBaseValue / ENVIO_RATES.day));
  const dayRemainingPacks = Math.max(0, dayNeededPacks - (todayData.envios_day_packages || 0));
  const dayShortfallValue = Math.max(0, dayBaseValue - (todayData.envios_day_packages || 0) * ENVIO_RATES.day);
  const dayExcessValue = Math.max(0, (todayData.envios_day_packages || 0) * ENVIO_RATES.day - dayBaseValue);
  const nightBaseValue = Math.max(0, nightTargetValue - reservationsNight);
  // Priorizar Día: la Noche no absorbe automáticamente el faltante del Día
  const nightAdjustedValue = Math.max(0, nightBaseValue - dayExcessValue);
  const nightNeededPacks = Math.max(0, Math.ceil(nightAdjustedValue / ENVIO_RATES.night));
  const nightRemainingPacks = Math.max(0, nightNeededPacks - (todayData.envios_night_packages || 0));

  // Paginación para tabla de cortes semanales
  const [cutsPage, setCutsPage] = useState(0);
  const cutsPageSize = 6;
  const totalCutsPages = Math.max(1, Math.ceil(weeklyCuts.length / cutsPageSize));
  const pagedWeeklyCuts = weeklyCuts.slice(cutsPage * cutsPageSize, (cutsPage + 1) * cutsPageSize);

  const weekKey = (d: Date) => d.toISOString().slice(0, 10);
  const goToCurrentWeekInCuts = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const idx = weeklyCuts.findIndex(w => weekKey(w.start) === weekKey(monday));
    if (idx >= 0) setCutsPage(Math.floor(idx / cutsPageSize));
  };

  return (
    <div className="space-y-8 px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard Financiero</h1>
          <p className="text-muted-foreground">
            Semana del {getWeekString()}
          </p>
        </div>

        {/* Navegación de semanas */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}>
            ◀ Semana anterior
          </Button>
          <input
            type="date"
            className="h-9 rounded-md border px-2 text-sm bg-background"
            value={(() => { const d = new Date(currentWeekStart); return d.toISOString().split('T')[0]; })()}
            onChange={(e) => {
              const chosen = new Date(e.target.value);
              // Snap a lunes
              const day = chosen.getDay();
              const monday = new Date(chosen);
              monday.setDate(chosen.getDate() - ((day + 6) % 7));
              setCurrentWeekStart(monday);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}>
            Semana siguiente ▶
          </Button>
        </div>
      </div>

      {/* Three Equal Cards + Billing Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <ModernStatCard
          title="Panel de Finanzas"
          value={formatCurrency(netSavings)}
          subtitle={`Ahorro real: ${formatCurrency(financialData.currentSavings)} - ${formatCurrency(weeklyExpenses)} gastos`}
          icon={DollarSign}
          variant="balance"
          trend={{ value: diffPct(financialData.currentSavings, financialData.currentSavings - weeklyTotals.total), label: "vs semana prev." }}
        />
        <ModernStatCard
          title="Corte Semanal (Neto)"
          value={formatCurrency(weeklyTotals.net)}
          subtitle={`Ing.: ${formatCurrency(weeklyTotals.total)} | Gtos.: ${formatCurrency(weeklyTotals.expensesTotal)} | Semanal`}
          icon={TrendingUp}
          variant="income"
          trend={{ value: diffPct(weeklyTotals.net, prevWeekTotals.total), label: "vs semana prev." }}
          sparklineData={weeklyCuts.slice(-8).map(w => getWeekTotals(w.start).total)}
        />
        <ModernStatCard
          title="Progreso Moto"
          value={`${motoProgress.toFixed(1)}%`}
          subtitle={`${formatCurrency(displayMotoCurrent)} de ${formatCurrency(financialData.motoGoal.target)} (neto: ${formatCurrency(netSavings)})`}
          icon={Target}
          variant="goal"
          progressPercent={motoProgress}
          trend={{ value: diffPct(financialData.motoGoal.current, financialData.motoGoal.current - weeklyTotals.total), label: "avance" }}
          sparklineData={weeklyCuts.slice(-8).map(w => {
            const pct = (displayMotoCurrent / financialData.motoGoal.target) * 100;
            return parseFloat(pct.toFixed(1));
          })}
        />
        {/* Billing Side Card */}
        <Card className="border-0 shadow-card bg-gradient-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Facturación Semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vani</span>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="$ manual" className="h-8 w-28 text-right"
                  value={manualBilling.vanina ?? ''}
                  onChange={(e) => setManualBilling((m) => ({ ...m, vanina: e.target.value ? parseFloat(e.target.value) : undefined }))}
                />
                <span className="font-semibold">{formatCurrency(getWeeklyPersonTotal("vanina"))}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Leo</span>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="$ manual" className="h-8 w-28 text-right"
                  value={manualBilling.leonardo ?? ''}
                  onChange={(e) => setManualBilling((m) => ({ ...m, leonardo: e.target.value ? parseFloat(e.target.value) : undefined }))}
                />
                <span className="font-semibold">{formatCurrency(getWeeklyPersonTotal("leonardo"))}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setManualBilling({
                vanina: getWeeklyPersonTotal("vanina"),
                leonardo: getWeeklyPersonTotal("leonardo")
              })}>Usar reservas</Button>
              <Button size="sm" variant="ghost" onClick={() => setManualBilling({})}>Limpiar</Button>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button size="sm" variant="outline" onClick={() => {
                // Marcar como facturado lo reservado en la semana actual
                setWeekData(prev => prev.map(day => {
                  const d = new Date(day.date);
                  const start = new Date(currentWeekStart);
                  const end = new Date(currentWeekStart); end.setDate(end.getDate() + 6);
                  if (d >= start && d <= end) {
                    return { ...day, reservations: day.reservations.map(r => ({ ...r, status: r.status === 'reservado' ? 'facturado' : r.status })) };
                  }
                  return day;
                }));
              }}>Facturado</Button>
              <Button size="sm" onClick={() => {
                // Marcar cobrado y sumar al panel de finanzas
                let sum = 0;
                setWeekData(prev => prev.map(day => {
                  const d = new Date(day.date);
                  const start = new Date(currentWeekStart);
                  const end = new Date(currentWeekStart); end.setDate(end.getDate() + 6);
                  if (d >= start && d <= end) {
                    sum += day.reservations.filter(r => r.status !== "cobrado").reduce((s, r) => s + r.amount, 0);
                    return { ...day, reservations: day.reservations.map(r => ({ ...r, status: 'cobrado' })) };
                  }
                  return day;
                }));
                // Si hay valores manuales, usar esos en lugar del cálculo
                const manualSum = (manualBilling.vanina ?? 0) + (manualBilling.leonardo ?? 0);
                const toAdd = manualSum > 0 ? manualSum : sum;
                if (toAdd > 0) setFinancialData(fd => ({
                  ...fd,
                  currentSavings: fd.currentSavings + toAdd,
                  motoGoal: {
                    ...fd.motoGoal,
                    // Sumar también al progreso de la moto para reflejar avance
                    current: Math.min(fd.motoGoal.current + toAdd, fd.motoGoal.target)
                  }
                }));
                setManualBilling({});
                // Avanzar automáticamente a la próxima semana
                setCurrentWeekStart(prev => {
                  const next = new Date(prev);
                  next.setDate(prev.getDate() + 7);
                  return next;
                });
              }}>Cobrado</Button>
            </div>
            <p className="text-xs text-muted-foreground">Al marcar como cobrado, se suma automáticamente al Panel de Finanzas y la próxima semana comenzará a trackearse.</p>
          </CardContent>
        </Card>
      </div>

      {/* Figura decorativa (solo modo oscuro) */}
      <div className="hidden dark:block">
        <div className="fixed right-8 bottom-8 pointer-events-none select-none z-10">
          <img
            src={`${(import.meta as unknown as { env?: Record<string, string> }).env?.BASE_URL ?? '/'}publicdepresion-figure.png.png`}
            alt="Decoración Depresión contable"
            className="opacity-95 w-[200px] h-[200px]"
          />
        </div>
      </div>

      {/* Weekly Turnos Table - MAIN FOCUS */}
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">TURNOS - Semana del {getWeekString()}</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}>◀</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}>▶</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const today = new Date();
                const monday = new Date(today);
                monday.setDate(today.getDate() - today.getDay() + 1);
                setCurrentWeekStart(monday);
              }}>Ir a semana actual</Button>
              {/* API Key: se carga desde VITE_GOOGLE_API_KEY, sin UI */}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          {/* Pre-cálculo secuencial con acarreo de faltantes (desde mañana hasta 05/10) */}
          {(() => {
            try {
              const goalDate = new Date(2025, 9, 5);
              const today0 = new Date(); today0.setHours(0, 0, 0, 0);
              const tomorrow0 = new Date(today0); tomorrow0.setDate(tomorrow0.getDate() + 1);
              const msDay = 1000 * 60 * 60 * 24;
              // Armar lista de fechas desde HOY hasta 05/10 (martes a domingo)
              const dates: string[] = [];
              for (let d = new Date(today0); d <= goalDate; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                // Solo incluir días de trabajo: martes(2), miércoles(3), jueves(4), viernes(5), sábado(6), domingo(0)
                if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
                  dates.push(d.toISOString().split('T')[0]);
                }
              }
              // Calcular faltante global
              const currentTotal = financialData.currentSavings + settings.additionalSavings;
              let totalFutureReservations = 0;
              let totalFuturePackages = 0;
              dates.forEach(ds => {
                const dd = weekData.find(w => w.date === ds) || { date: ds, reservations: [], envios_day_packages: 0, envios_night_packages: 0 };
                totalFutureReservations += dd.reservations.reduce((s, r) => s + r.amount, 0);
                totalFuturePackages += (dd.envios_day_packages * ENVIO_RATES.day) + (dd.envios_night_packages * ENVIO_RATES.night);
              });

              // Calcular dinero faltante para el objetivo de la moto
              const motoRemaining = Math.max(0, 2050000 - financialData.motoGoal.current);
              const perDayValue = dates.length > 0 ? Math.ceil(motoRemaining / dates.length) : 0;

              // Calcular acarreo desde HOY (si hoy no cumplió su objetivo por turno)
              const todayStr = today0.toISOString().split('T')[0];
              const todayData = weekData.find(w => w.date === todayStr) || { date: todayStr, reservations: [], envios_day_packages: 0, envios_night_packages: 0 };
              const dowToday = today0.getDay();
              const isWeekendToday = (dowToday === 5 || dowToday === 6 || dowToday === 0);
              const nightWeightToday = (isWeekendToday ? settings.nightWeightWeekend : settings.nightWeightWeekday) / 100;
              const dayWeightToday = Math.max(0, 1 - nightWeightToday);
              const dayTargetToday = perDayValue * dayWeightToday;
              const nightTargetToday = perDayValue * nightWeightToday;
              const resDayToday = todayData.reservations.filter(r => r.shift === 'dia').reduce((s, r) => s + r.amount, 0);
              const resNightToday = todayData.reservations.filter(r => r.shift === 'noche').reduce((s, r) => s + r.amount, 0);
              const dayAfterResToday = Math.max(0, dayTargetToday - resDayToday);
              const nightAfterResToday = Math.max(0, nightTargetToday - resNightToday);
              const dayAfterDoneToday = Math.max(0, dayAfterResToday - (todayData.envios_day_packages * ENVIO_RATES.day));
              const nightAfterDoneToday = Math.max(0, nightAfterResToday - (todayData.envios_night_packages * ENVIO_RATES.night));
              const ceilDiv = (val: number, rate: number) => Math.max(0, Math.floor((val + rate - 1) / rate));
              let carryDayPacks = ceilDiv(dayAfterDoneToday, ENVIO_RATES.day);
              let carryNightPacks = ceilDiv(nightAfterDoneToday, ENVIO_RATES.night);
              // aplicar mínimos al acarreo también
              carryDayPacks = Math.max(0, carryDayPacks);
              carryNightPacks = Math.max(0, carryNightPacks);
              const plan: Record<string, { dayLeft: number; nightLeft: number }> = {};
              dates.forEach((ds, idx) => {
                const d = new Date(ds);
                const dd = weekData.find(w => w.date === ds) || { date: ds, reservations: [], envios_day_packages: 0, envios_night_packages: 0 };
                const resDay = dd.reservations.filter(r => r.shift === 'dia').reduce((s, r) => s + r.amount, 0);
                const resNight = dd.reservations.filter(r => r.shift === 'noche').reduce((s, r) => s + r.amount, 0);
                const dow = d.getDay();
                const isWeekend = (dow === 5 || dow === 6 || dow === 0); // viernes, sábado, domingo
                const nightWeight = (isWeekend ? settings.nightWeightWeekend : settings.nightWeightWeekday) / 100;
                const dayWeight = Math.max(0, 1 - nightWeight);

                // Calcular dinero faltante por turno basado en el objetivo de la moto
                // Aplicar más carga en fin de semana (viernes, sábado, domingo)
                const weekendMultiplier = isWeekend ? 1.5 : 1; // 50% más en fin de semana

                const dayTargetValue = basePerDayValue * dayWeight * weekendMultiplier;
                const nightTargetValue = basePerDayValue * nightWeight * weekendMultiplier;

                // Calcular cuánto ya se juntó en este día (reservas + envíos)
                const dayEarned = resDay + (dd.envios_day_packages * ENVIO_RATES.day);
                const nightEarned = resNight + (dd.envios_night_packages * ENVIO_RATES.night);
                const totalEarned = dayEarned + nightEarned;

                // Calcular cuánto falta para el objetivo diario
                const dayRemaining = Math.max(0, dayTargetValue - dayEarned);
                const nightRemaining = Math.max(0, nightTargetValue - nightEarned);

                // Si un turno no tiene reservas, el otro debe compensar (70% vs 30%)
                const totalNeeded = dayRemaining + nightRemaining;
                let finalDayTarget = dayRemaining;
                let finalNightTarget = nightRemaining;

                if (resDay === 0 && resNight > 0) {
                  // Solo noche tiene reservas, día debe hacer 70%
                  finalDayTarget = totalNeeded * 0.7;
                  finalNightTarget = totalNeeded * 0.3;
                } else if (resNight === 0 && resDay > 0) {
                  // Solo día tiene reservas, noche debe hacer 70%
                  finalDayTarget = totalNeeded * 0.3;
                  finalNightTarget = totalNeeded * 0.7;
                } else if (resDay === 0 && resNight === 0) {
                  // Ninguno tiene reservas, distribución 50/50
                  finalDayTarget = totalNeeded * 0.5;
                  finalNightTarget = totalNeeded * 0.5;
                }

                // Convertir a paquetes para mostrar (pero el cálculo principal es en dinero)
                const dayLeft = Math.max(0, Math.ceil(finalDayTarget / ENVIO_RATES.day));
                const nightLeft = Math.max(0, Math.ceil(finalNightTarget / ENVIO_RATES.night));

                plan[ds] = { dayLeft, nightLeft };
              });
              (window as unknown as { __mm_planByDate?: Record<string, { dayLeft: number; nightLeft: number }> }).__mm_planByDate = plan;
            } catch (e) { console.warn('plan precompute failed', e); }
            return null;
          })()}
          {/* Contenedor responsivo: evita desbordes y mantiene todo dentro del card */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm min-w-[1100px]">
              <colgroup>
                <col className="w-[120px]" />
                <col className="w-[220px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[80px]" />
                <col className="w-[90px]" />
                <col className="w-[110px]" />
                <col className="w-[130px]" />

                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-xs">
                  <th className="text-left p-2 pl-6 font-medium text-muted-foreground whitespace-nowrap">Día</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">Reservas</th>
                  <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">Cobr.</th>
                  <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">A Cob.</th>
                  <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap">PaqD</th>
                  <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap">PaqN</th>
                  <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap">$ Día a hacer</th>
                  <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap">$ Noche a hacer</th>
                  <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">Env.</th>
                  <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  <th className="text-center p-2 pr-6 font-medium text-muted-foreground whitespace-nowrap">Acc.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dayName, index) => {
                    const dayData = getDayData(index);
                    const dayDate = new Date(currentWeekStart);
                    dayDate.setDate(currentWeekStart.getDate() + index);
                    const dateString = dayDate.toISOString().split('T')[0];

                    const cobradas = dayData.reservations.filter(r => r.status === "cobrado").reduce((sum, r) => sum + r.amount, 0);
                    const aCobrar = dayData.reservations.filter(r => r.status !== "cobrado").reduce((sum, r) => sum + r.amount, 0);
                    const envios = (dayData.envios_day_packages * ENVIO_RATES.day) + (dayData.envios_night_packages * ENVIO_RATES.night);
                    const reservasDiaTotal = cobradas + aCobrar;
                    const total = reservasDiaTotal + envios;

                    // Cálculo de paquetes a hacer por turno (usa dailyTargets guardados)
                    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
                    const thisDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                    const isPastOrToday = thisDate.getTime() <= todayStart.getTime();
                    const ds = dateString;
                    const p = (window as unknown as { __mm_planByDate?: Record<string, { dayLeft: number; nightLeft: number }> }).__mm_planByDate;
                    const computed = (!isPastOrToday && p) ? p[ds] : undefined;
                    const dayLeft = computed?.dayLeft ?? 0;
                    const nightLeft = computed?.nightLeft ?? 0;

                    return (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="p-3 pl-6">
                          <div>
                            <div className="font-medium">{dayName}</div>
                            <div className="text-xs text-muted-foreground">{dayDate.getDate()}/{dayDate.getMonth() + 1}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1 max-w-xs">
                            {dayData.reservations.map((res) => (
                              <div key={res.id} className="text-xs bg-muted/50 rounded px-2 py-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={getLocalLogo(res.local)}
                                      alt={res.local}
                                      className="h-4 w-4 rounded-sm"
                                      onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                        const seed = encodeURIComponent(res.local);
                                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
                                      }}
                                    />
                                    <button type="button" className="font-medium hover:underline" onClick={() => setOpenResId(id => id === res.id ? null : res.id)}>
                                      {res.local}
                                    </button>
                                    <Button size="icon" variant={isFavoriteLocal(res.local) ? "secondary" : "ghost"} className="h-5 w-5"
                                      title={isFavoriteLocal(res.local) ? "Quitar de favoritos" : "Guardar como favorito"}
                                      onClick={() => toggleFavoriteLocal(res.local, getLocalLogo(res.local))}
                                    >
                                      <Star className="h-3 w-3" fill={isFavoriteLocal(res.local) ? "currentColor" : "none"} />
                                    </Button>
                                  </div>
                                  <span className="text-muted-foreground">${res.amount.toLocaleString('es-AR')}</span>
                                </div>
                                {openResId === res.id && (
                                  <div className="mt-1 flex items-center gap-2">
                                    <Select value={res.status} onValueChange={(value: Reservation["status"]) => updateReservationStatus(res.id, value)}>
                                      <SelectTrigger className="h-6 w-28 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="reservado">Reservado</SelectItem>
                                        <SelectItem value="facturado">Facturado</SelectItem>
                                        <SelectItem value="cobrado">Cobrado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="ghost" className="h-6 px-2" title="Eliminar"
                                      onClick={() => setWeekData(prev => prev.map(d => d.date === dateString ? ({ ...d, reservations: d.reservations.filter(r => r.id !== res.id) }) : d))}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                )}
                                {openResId === res.id && (
                                  <div className="mt-2 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        placeholder="Buscar/editar nombre del local"
                                        value={editLocal.name || res.local}
                                        onFocus={() => setEditLocal({ name: res.local, logoUrl: "" })}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setEditLocal((p) => ({ ...p, name: val }));
                                          // Autocomplete online (debounce)
                                          if (placeDebounceRef.current) window.clearTimeout(placeDebounceRef.current);
                                          placeDebounceRef.current = window.setTimeout(() => searchPlacesOnline(val), 350);
                                        }}
                                        className="h-7 text-xs"
                                      />
                                      <Button size="sm" className="h-7"
                                        onClick={() => {
                                          const name = (editLocal.name || res.local).trim();
                                          // actualizar reserva
                                          setWeekData(prev => prev.map(day => day.date === dateString ? ({
                                            ...day,
                                            reservations: day.reservations.map(r => r.id === res.id ? ({ ...r, local: name }) : r)
                                          }) : day));
                                          // guardar/actualizar en locales conocidos
                                          setKnownLocals(prev => {
                                            const idx = prev.findIndex(k => k.name.toLowerCase() === name.toLowerCase());
                                            const updated = [...prev];
                                            const entry = { name } as KnownLocal;
                                            if (idx >= 0) updated[idx] = { ...updated[idx], ...entry };
                                            else updated.push(entry);
                                            return updated;
                                          });
                                          setEditLocal({ name: "", logoUrl: "" });
                                        }}
                                      >Guardar</Button>
                                    </div>
                                    {/* Sugerencias rápidas (locales conocidos) */}
                                    <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                                      {knownLocals
                                        .filter(k => (editLocal.name || res.local).length === 0 ? true : k.name.toLowerCase().includes((editLocal.name || res.local).toLowerCase()))
                                        .slice(0, 6)
                                        .map(k => (
                                          <Button key={k.name} size="sm" variant="outline" className="h-6"
                                            onClick={() => setEditLocal({ name: k.name, logoUrl: k.logoUrl || "" })}
                                          >{k.name}</Button>
                                        ))}
                                    </div>
                                    {/* Resultados online (Google Places) */}
                                    {googleLoaded && (
                                      <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                                        {placesLoading && <span>Buscando...</span>}
                                        {!placesLoading && placePredictions.slice(0, 6).map(p => (
                                          <Button key={p.place_id} size="sm" variant="ghost" className="h-6"
                                            onClick={() => pickPlacePrediction(p.place_id)}
                                          >{p.description}</Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {showNewReservation === dateString && (
                              <div className="space-y-2 p-2 bg-background rounded border">
                                <Input
                                  placeholder="Local"
                                  value={newReservation.local}
                                  onChange={(e) => setNewReservation({ ...newReservation, local: e.target.value })}
                                  className="h-8 text-xs"
                                />
                                <Input
                                  placeholder="Monto"
                                  type="number"
                                  value={newReservation.amount}
                                  onChange={(e) => setNewReservation({ ...newReservation, amount: e.target.value })}
                                  className="h-8 text-xs"
                                />
                                <div className="flex space-x-1">
                                  <Select value={newReservation.person} onValueChange={(value: "vanina" | "leonardo") => setNewReservation({ ...newReservation, person: value })}>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="vanina">Vanina</SelectItem>
                                      <SelectItem value="leonardo">Leonardo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Select value={newReservation.shift} onValueChange={(value: "dia" | "noche") => setNewReservation({ ...newReservation, shift: value })}>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="dia">Día</SelectItem>
                                      <SelectItem value="noche">Noche</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex space-x-1">
                                  <Button size="sm" onClick={() => addReservation(dateString)} className="h-6 text-xs">
                                    Guardar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setShowNewReservation(null)} className="h-6 text-xs">
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-semibold text-income">{formatCurrency(cobradas)}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-semibold text-goal">{formatCurrency(aCobrar)}</span>
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            value={(pendingPackages[dateString]?.day ?? dayData.envios_day_packages)}
                            onChange={(e) => {
                              const v = Math.max(0, parseInt(e.target.value) || 0);
                              setPendingPackages(prev => ({ ...prev, [dateString]: { day: v, night: (prev[dateString]?.night ?? dayData.envios_night_packages) } }));
                            }}
                            className="w-14 h-8 text-center text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            value={(pendingPackages[dateString]?.night ?? dayData.envios_night_packages)}
                            onChange={(e) => {
                              const v = Math.max(0, parseInt(e.target.value) || 0);
                              setPendingPackages(prev => ({ ...prev, [dateString]: { day: (prev[dateString]?.day ?? dayData.envios_day_packages), night: v } }));
                            }}
                            className="w-14 h-8 text-center text-xs"
                          />
                        </td>
                        <td className="p-2 text-center font-semibold">{formatCurrency(dayLeft * ENVIO_RATES.day)}</td>
                        <td className="p-2 text-center font-semibold">{formatCurrency(nightLeft * ENVIO_RATES.night)}</td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{formatCurrency(envios)}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold">{formatCurrency(total)}</span>
                        </td>
                        <td className="p-3 text-center pr-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" title="Agregar reserva" onClick={() => setShowNewReservation(dateString)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="secondary" title="Aplicar paquetes"
                              onClick={() => {
                                const pend = pendingPackages[dateString] ?? { day: dayData.envios_day_packages, night: dayData.envios_night_packages };
                                const d = Math.max(0, pend.day | 0);
                                const n = Math.max(0, pend.night | 0);
                                updatePackages(dateString, "day", d);
                                updatePackages(dateString, "night", n);
                                setPendingPackages(prev => ({ ...prev, [dateString]: { day: d, night: n } }));
                              }}
                            >Aplicar</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Weekly Summary */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Total Cobradas</span>
                <span className="font-bold text-income text-lg">{formatCurrency(weeklyTotals.cobradas)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total A Cobrar</span>
                <span className="font-bold text-goal text-lg">{formatCurrency(weeklyTotals.aCobrar)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Envíos</span>
                <span className="font-bold text-balance text-lg">{formatCurrency(weeklyTotals.enviosTotal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Semana</span>
                <span className="font-bold text-foreground text-lg">{formatCurrency(weeklyTotals.total)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-background rounded border">
              <h4 className="font-medium mb-2">Objetivo Moto - Progreso Diario:</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Meta diaria base</span>
                  <span className="font-bold text-balance">{formatCurrency(basePerDayValue)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Faltante total</span>
                  <span className="font-bold text-goal">{formatCurrency(motoRemaining)}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Objetivo: {formatCurrency(2050000)} | Actual: {formatCurrency(totalCurrent)} (Ahorro: {formatCurrency(financialData.currentSavings)} + Moto: {formatCurrency(financialData.motoGoal.current)}) | Días de trabajo restantes: {workdaysWeight.toFixed(1)} (martes-dom, fin de semana +50% carga)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Cortes Semanales (15-21 Sep hasta fin de año) */}
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Cortes Semanales (Sep - Dic)</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setCutsPage(p => Math.max(0, p - 1))}>◀</Button>
            <span className="text-xs text-muted-foreground">Página {cutsPage + 1} / {totalCutsPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCutsPage(p => Math.min(totalCutsPages - 1, p + 1))}>▶</Button>
            <Button variant="ghost" size="sm" onClick={goToCurrentWeekInCuts}>Ir a semana actual</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-center p-3 font-medium text-muted-foreground">Semana</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Cobradas</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">A Cobrar</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Envíos</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Propinas</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Vani (Fact.)</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Leo (Fact.)</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pagedWeeklyCuts.map((w, idx) => {
                  const totals = getWeekTotals(w.start);
                  const isMotoGoalWeek = w.start.toISOString().slice(0, 10) === '2024-10-13';
                  const motoOk = financialData.currentSavings >= 2050000;
                  const key = weekKey(w.start);
                  const wb = weeklyBilling[key] || {};
                  return (
                    <tr key={idx} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${isMotoGoalWeek ? (motoOk ? 'bg-income-light/50' : 'bg-expense-light/30') : ''} ${wb.registeredSum ? 'bg-muted/30 opacity-75' : ''}`}>
                      <td className="p-3 text-center">
                        {w.label}
                        {isMotoGoalWeek && (
                          <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${motoOk ? 'bg-income-subtle text-income' : 'bg-expense-subtle text-expense'}`}>
                            Meta Moto {motoOk ? 'OK' : 'Pendiente'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center text-income font-semibold">{formatCurrency(totals.cobradas)}</td>
                      <td className="p-3 text-center text-goal font-semibold">{formatCurrency(totals.aCobrar)}</td>
                      <td className="p-3 text-center">{formatCurrency(totals.enviosTotal)}</td>
                      <td className="p-3 text-center">{formatCurrency(totals.tipsTotal)}</td>
                      <td className="p-3 text-center font-bold">{formatCurrency(totals.total)}</td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={wb.vanina ?? ''}
                          onChange={(e) => setWeeklyBilling(prev => ({ ...prev, [key]: { ...(prev[key] || {}), vanina: e.target.value ? parseFloat(e.target.value) : undefined } }))}
                          className="h-8 w-28 text-center text-xs"
                          placeholder="$ Vani"
                          disabled={!!wb.registeredSum}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={wb.leonardo ?? ''}
                          onChange={(e) => setWeeklyBilling(prev => ({ ...prev, [key]: { ...(prev[key] || {}), leonardo: e.target.value ? parseFloat(e.target.value) : undefined } }))}
                          className="h-8 w-28 text-center text-xs"
                          placeholder="$ Leo"
                          disabled={!!wb.registeredSum}
                        />
                      </td>
                      <td className="p-3 text-center">
                        {wb.registeredSum ? (
                          <span className="text-xs text-muted-foreground">Registrado ✓ {formatCurrency(wb.registeredSum)}</span>
                        ) : (
                          <Button size="sm" onClick={() => {
                            const sum = (wb.vanina ?? 0) + (wb.leonardo ?? 0);
                            if (sum <= 0) return;
                            // Impactar en finanzas y progreso moto
                            setFinancialData(fd => ({
                              ...fd,
                              currentSavings: fd.currentSavings + sum,
                              motoGoal: { ...fd.motoGoal, current: Math.min(fd.motoGoal.current + sum, fd.motoGoal.target) }
                            }));
                            // Marcar como registrado para no duplicar
                            setWeeklyBilling(prev => ({
                              ...prev,
                              [key]: { ...(prev[key] || {}), registeredSum: sum, registeredAt: new Date().toISOString() }
                            }));
                          }}>Registrar</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}