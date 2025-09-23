import { useState, useEffect, useMemo, type SyntheticEvent } from "react";
import { DollarSign, TrendingUp, Target, Plus } from "lucide-react";

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
  currentSavings: 120000,
  pendingPayments: {
    rapiboy: 75000,
    other: 98000
  },
  monthlyFixedExpenses: 135000 + 50000 + 50000 + 10000 + 100000 + 24000 + 60000 + 20000 + 150000 + 20000, // 619000
  motoGoal: {
    target: 2050000,
    current: 120000,
    deadline: "2024-10-20"
  }
};

const ENVIO_RATES = {
  day: 2800,
  night: 3800
};

export default function Dashboard() {
  const [weekData, setWeekData] = useState<DayData[]>(mockWeekData);
  const [financialData, setFinancialData] = useState(initialFinancialData);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Persistencia en localStorage: cargar al montar
  useEffect(() => {
    try {
      const storedWeek = localStorage.getItem("mm_weekData");
      const storedFin = localStorage.getItem("mm_financialData");
      const storedWB = localStorage.getItem("mm_weeklyBilling");
      if (storedWeek) {
        const parsed = JSON.parse(storedWeek) as DayData[];
        if (Array.isArray(parsed)) setWeekData(parsed);
      }
      if (storedFin) {
        const parsed = JSON.parse(storedFin) as typeof initialFinancialData;
        if (parsed && parsed.motoGoal) setFinancialData(parsed);
      }
      if (storedWB) {
        const parsed = JSON.parse(storedWB) as Record<string, { vanina?: number; leonardo?: number; registeredSum?: number; registeredAt?: string }>;
        if (parsed) setWeeklyBilling(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Guardar cada vez que cambian
  useEffect(() => {
    try {
      localStorage.setItem("mm_weekData", JSON.stringify(weekData));
    } catch (err) {
      console.warn("No se pudo guardar weekData en localStorage", err);
    }
  }, [weekData]);

  useEffect(() => {
    try {
      localStorage.setItem("mm_financialData", JSON.stringify(financialData));
    } catch (err) {
      console.warn("No se pudo guardar financialData en localStorage", err);
    }
  }, [financialData]);

  useEffect(() => {
    try {
      localStorage.setItem("mm_weeklyBilling", JSON.stringify(weeklyBilling));
    } catch (err) {
      console.warn("No se pudo guardar weeklyBilling en localStorage", err);
    }
  }, [weeklyBilling]);

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

    for (let i = 0; i < 7; i++) {
      const dayData = getDayData(i);
      dayData.reservations.forEach(res => {
        if (res.status === "cobrado") cobradas += res.amount;
        else aCobrar += res.amount;
      });
      enviosTotal += (dayData.envios_day_packages * ENVIO_RATES.day) + (dayData.envios_night_packages * ENVIO_RATES.night);
      tipsTotal += (dayData.tip_day || 0) + (dayData.tip_night || 0);
    }

    return { cobradas, aCobrar, enviosTotal, tipsTotal, total: cobradas + enviosTotal + tipsTotal };
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
    return {
      totalNeeded: Math.round(remainingAmount),
      faltante: Math.max(0, Math.round(remainingAmount - currentGenerated)),
      daysRemaining,
      dailyPackagesNeeded,
      leoDay: Math.ceil(dailyPackagesNeeded * 0.5),
      vaniaNight: Math.ceil(dailyPackagesNeeded * 0.5)
    };
  };

  // Helpers para logos de locales
  const knownLocalDomains: Record<string, string> = {
    "Centro": "centro.com.ar",
    "Zona Norte": "zonanorte.com.ar"
  };
  const getLocalLogo = (local: string) => {
    const domain = knownLocalDomains[local];
    if (domain) return `https://logo.clearbit.com/${domain}`;
    // Intento con nombre + .com.ar como heurística mínima
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
  const motoProgress = (financialData.motoGoal.current / financialData.motoGoal.target) * 100;
  // Tendencias semana previa
  const prevWeekStart = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    return d;
  }, [currentWeekStart]);
  const prevWeekTotals = getWeekTotals(prevWeekStart);
  const diffPct = (curr: number, prev: number) => prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

  // Paginación para tabla de cortes semanales
  const [cutsPage, setCutsPage] = useState(0);
  const cutsPageSize = 6;
  const totalCutsPages = Math.max(1, Math.ceil(weeklyCuts.length / cutsPageSize));
  const pagedWeeklyCuts = weeklyCuts.slice(cutsPage * cutsPageSize, (cutsPage + 1) * cutsPageSize);

  const weekKey = (d: Date) => d.toISOString().slice(0,10);
  const goToCurrentWeekInCuts = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const idx = weeklyCuts.findIndex(w => weekKey(w.start) === weekKey(monday));
    if (idx >= 0) setCutsPage(Math.floor(idx / cutsPageSize));
  };

  return (
    <div className="space-y-8">
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
          value={formatCurrency(financialData.currentSavings)}
          subtitle="Ahorro actual disponible"
          icon={DollarSign}
          variant="balance"
          trend={{ value: diffPct(financialData.currentSavings, financialData.currentSavings - weeklyTotals.total), label: "vs semana prev." }}
        />
        <ModernStatCard
          title="Corte Semanal"
          value={formatCurrency(weeklyTotals.total)}
          subtitle={`Cobradas: ${formatCurrency(weeklyTotals.cobradas)} | A cobrar: ${formatCurrency(weeklyTotals.aCobrar)}`}
          icon={TrendingUp}
          variant="income"
          trend={{ value: diffPct(weeklyTotals.total, prevWeekTotals.total), label: "vs semana prev." }}
          sparklineData={weeklyCuts.slice(-8).map(w => getWeekTotals(w.start).total)}
        />
        <ModernStatCard
          title="Progreso Moto"
          value={`${motoProgress.toFixed(1)}%`}
          subtitle={`${formatCurrency(financialData.motoGoal.current)} de ${formatCurrency(financialData.motoGoal.target)}`}
          icon={Target}
          variant="goal"
          progressPercent={motoProgress}
          trend={{ value: diffPct(financialData.motoGoal.current, financialData.motoGoal.current - weeklyTotals.total), label: "avance" }}
          sparklineData={weeklyCuts.slice(-8).map(w => {
            const pct = (financialData.motoGoal.current / financialData.motoGoal.target) * 100;
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Día</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Reservas</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Cobradas</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">A Cobrar</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Paq. Día</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Paq. Noche</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Prop. Día</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Prop. Noche</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Envíos</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dayName, index) => {
                  const dayData = getDayData(index);
                  const dayDate = new Date(currentWeekStart);
                  dayDate.setDate(currentWeekStart.getDate() + index);
                  const dateString = dayDate.toISOString().split('T')[0];

                  const cobradas = dayData.reservations.filter(r => r.status === "cobrado").reduce((sum, r) => sum + r.amount, 0);
                  const aCobrar = dayData.reservations.filter(r => r.status !== "cobrado").reduce((sum, r) => sum + r.amount, 0);
                  const envios = (dayData.envios_day_packages * ENVIO_RATES.day) + (dayData.envios_night_packages * ENVIO_RATES.night);
                  const tips = (dayData.tip_day || 0) + (dayData.tip_night || 0);
                  const total = cobradas + envios + tips;

                  return (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{dayName}</div>
                          <div className="text-xs text-muted-foreground">{dayDate.getDate()}/{dayDate.getMonth() + 1}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1 max-w-xs">
                          {dayData.reservations.map((res) => (
                            <div key={res.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
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
                                <span className="font-medium">{res.local}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Select value={res.status} onValueChange={(value: Reservation["status"]) => updateReservationStatus(res.id, value)}>
                                  <SelectTrigger className="h-6 w-20 text-xs border-0 bg-transparent">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="reservado">Reservado</SelectItem>
                                    <SelectItem value="facturado">Facturado</SelectItem>
                                    <SelectItem value="cobrado">Cobrado</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button size="icon" variant="ghost" className="h-6 w-6" title="Eliminar"
                                  onClick={() => setWeekData(prev => prev.map(d => d.date === dateString ? ({...d, reservations: d.reservations.filter(r => r.id !== res.id)}) : d))}
                                >
                                  ×
                                </Button>
                              </div>
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
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={dayData.envios_day_packages}
                          onChange={(e) => updatePackages(dateString, "day", parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={dayData.envios_night_packages}
                          onChange={(e) => updatePackages(dateString, "night", parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={dayData.tip_day || 0}
                          onChange={(e) => setWeekData(prev => {
                            const u = [...prev];
                            const idx = u.findIndex(d => d.date === dateString);
                            if (idx >= 0) u[idx] = { ...u[idx], tip_day: parseInt(e.target.value) || 0 };
                            else u.push({ date: dateString, reservations: [], envios_day_packages: 0, envios_night_packages: 0, tip_day: parseInt(e.target.value) || 0, tip_night: 0 });
                            return u;
                          })}
                          className="w-20 h-8 text-center text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={dayData.tip_night || 0}
                          onChange={(e) => setWeekData(prev => {
                            const u = [...prev];
                            const idx = u.findIndex(d => d.date === dateString);
                            if (idx >= 0) u[idx] = { ...u[idx], tip_night: parseInt(e.target.value) || 0 };
                            else u.push({ date: dateString, reservations: [], envios_day_packages: 0, envios_night_packages: 0, tip_day: 0, tip_night: parseInt(e.target.value) || 0 });
                            return u;
                          })}
                          className="w-20 h-8 text-center text-xs"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-medium">{formatCurrency(envios)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-balance">{formatCurrency(total)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowNewReservation(showNewReservation === dateString ? null : dateString)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
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
              <h4 className="font-medium mb-2">Paquetes Necesarios para Objetivo:</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Leo Día</span>
                  <span className="font-bold text-balance">{packagesCalc.leoDay} paq.</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Vani Noche</span>
                  <span className="font-bold text-goal">{packagesCalc.vaniaNight} paq.</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Faltante hasta 20/10: {formatCurrency(packagesCalc.faltante)} | Días restantes: {packagesCalc.daysRemaining} | Paquetes/día: {packagesCalc.dailyPackagesNeeded}
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
                  const isMotoGoalWeek = w.start.toISOString().slice(0,10) === '2024-10-13';
                  const motoOk = financialData.currentSavings >= 2050000;
                  const key = weekKey(w.start);
                  const wb = weeklyBilling[key] || {};
                  return (
                    <tr key={idx} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${isMotoGoalWeek ? (motoOk ? 'bg-income-light/50' : 'bg-expense-light/30') : ''}`}>
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
                          onChange={(e) => setWeeklyBilling(prev => ({...prev, [key]: { ...(prev[key]||{}), vanina: e.target.value ? parseFloat(e.target.value) : undefined }}))}
                          className="h-8 w-28 text-center text-xs"
                          placeholder="$ Vani"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={wb.leonardo ?? ''}
                          onChange={(e) => setWeeklyBilling(prev => ({...prev, [key]: { ...(prev[key]||{}), leonardo: e.target.value ? parseFloat(e.target.value) : undefined }}))}
                          className="h-8 w-28 text-center text-xs"
                          placeholder="$ Leo"
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
                              [key]: { ...(prev[key]||{}), registeredSum: sum, registeredAt: new Date().toISOString() }
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