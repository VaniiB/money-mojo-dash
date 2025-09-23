import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Target, Calendar, Plus, Edit3 } from "lucide-react";
import ModernStatCard from "@/components/ModernStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

// Updated financial data based on real situation
const financialData = {
  currentSavings: 120000,
  pendingPayments: {
    rapiboy: 75000,
    other: 98000
  },
  monthlyFixedExpenses: 135000 + 50000 + 50000 + 10000 + 100000 + 24000 + 60000 + 20000 + 150000 + 20000, // 619000
  motoGoal: {
    target: 950000,
    current: 120000,
    deadline: "2024-06-15"
  }
};

const ENVIO_RATES = {
  day: 2800,
  night: 3800
};

export default function Dashboard() {
  const [weekData, setWeekData] = useState<DayData[]>(mockWeekData);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday;
  });
  const [showNewReservation, setShowNewReservation] = useState<string | null>(null);
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

  const getWeekString = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);
    return `${currentWeekStart.getDate()}/${currentWeekStart.getMonth() + 1} al ${endDate.getDate()}/${endDate.getMonth() + 1} de ${endDate.toLocaleDateString('es-ES', { month: 'long' })}`;
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

    for (let i = 0; i < 7; i++) {
      const dayData = getDayData(i);
      dayData.reservations.forEach(res => {
        if (res.status === "cobrado") cobradas += res.amount;
        else aCobrar += res.amount;
      });
      enviosTotal += (dayData.envios_day_packages * ENVIO_RATES.day) + (dayData.envios_night_packages * ENVIO_RATES.night);
    }

    return { cobradas, aCobrar, enviosTotal, total: cobradas + enviosTotal };
  };

  const calculatePackagesNeeded = () => {
    const weeklyTotals = calculateWeeklyTotals();
    const weeklyFixedExpenses = financialData.monthlyFixedExpenses / 4.33; // Aproximación semanal
    const motoProgress = (financialData.motoGoal.current / financialData.motoGoal.target) * 100;
    const remaining = financialData.motoGoal.target - financialData.motoGoal.current;
    const weeklyMotoGoal = remaining / 20; // Aproximación: 20 semanas para completar
    
    const totalNeeded = weeklyFixedExpenses + weeklyMotoGoal;
    const currentGenerated = weeklyTotals.total;
    const faltante = Math.max(0, totalNeeded - currentGenerated);
    
    const packagesNeeded = Math.ceil(faltante / ((ENVIO_RATES.day + ENVIO_RATES.night) / 2));
    
    return {
      totalNeeded: Math.round(totalNeeded),
      faltante: Math.round(faltante),
      vaniaDay: Math.ceil(packagesNeeded * 0.4),
      leoDay: Math.ceil(packagesNeeded * 0.3),
      vaniaNight: Math.ceil(packagesNeeded * 0.3)
    };
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard Financiero</h1>
          <p className="text-muted-foreground">
            Semana del {getWeekString()}
          </p>
        </div>
      </div>

      {/* Three Equal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ModernStatCard
          title="Panel de Finanzas"
          value={formatCurrency(financialData.currentSavings)}
          subtitle="Ahorro actual disponible"
          icon={DollarSign}
          variant="balance"
        />
        <ModernStatCard
          title="Corte Semanal"
          value={formatCurrency(weeklyTotals.total)}
          subtitle={`Cobradas: ${formatCurrency(weeklyTotals.cobradas)} | A cobrar: ${formatCurrency(weeklyTotals.aCobrar)}`}
          icon={TrendingUp}
          variant="income"
        />
        <ModernStatCard
          title="Progreso Moto"
          value={`${motoProgress.toFixed(1)}%`}
          subtitle={`${formatCurrency(financialData.motoGoal.current)} de ${formatCurrency(financialData.motoGoal.target)}`}
          icon={Target}
          variant="goal"
        />
      </div>

      {/* Weekly Turnos Table - MAIN FOCUS */}
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">TURNOS - Semana del {getWeekString()}</CardTitle>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-income rounded-full"></div>
                <span>Cobrado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-goal rounded-full"></div>
                <span>Facturado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-muted rounded-full"></div>
                <span>Reservado</span>
              </div>
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
                  const total = cobradas + envios;

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
                              <span className="font-medium">{res.local}</span>
                              <div className="flex items-center space-x-1">
                                <span>{formatCurrency(res.amount)}</span>
                                <Select value={res.status} onValueChange={(value: any) => updateReservationStatus(res.id, value)}>
                                  <SelectTrigger className="h-6 w-20 text-xs border-0 bg-transparent">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="reservado">Reservado</SelectItem>
                                    <SelectItem value="facturado">Facturado</SelectItem>
                                    <SelectItem value="cobrado">Cobrado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                          {showNewReservation === dateString && (
                            <div className="space-y-2 p-2 bg-background rounded border">
                              <Input
                                placeholder="Local"
                                value={newReservation.local}
                                onChange={(e) => setNewReservation({...newReservation, local: e.target.value})}
                                className="h-8 text-xs"
                              />
                              <Input
                                placeholder="Monto"
                                type="number"
                                value={newReservation.amount}
                                onChange={(e) => setNewReservation({...newReservation, amount: e.target.value})}
                                className="h-8 text-xs"
                              />
                              <div className="flex space-x-1">
                                <Select value={newReservation.person} onValueChange={(value: any) => setNewReservation({...newReservation, person: value})}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="vanina">Vanina</SelectItem>
                                    <SelectItem value="leonardo">Leonardo</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={newReservation.shift} onValueChange={(value: any) => setNewReservation({...newReservation, shift: value})}>
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
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Vani Día</span>
                  <span className="font-bold text-income">{packagesCalc.vaniaDay} paq.</span>
                </div>
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
                Faltante semanal: {formatCurrency(packagesCalc.faltante)} | Meta: {formatCurrency(packagesCalc.totalNeeded)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}