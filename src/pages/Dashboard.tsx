import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Target, Calendar, AlertCircle } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Mock data - en una versión real vendría de una base de datos
const mockData = {
  balance: 45000,
  todayIncome: 8500,
  todayExpenses: 3200,
  weeklyIncome: 52000,
  weeklyExpenses: 18400,
  goals: [
    { name: "Moto", target: 800000, current: 245000, deadline: "2024-06-15" },
    { name: "Accesorios", target: 50000, current: 32000, deadline: "2024-04-30" },
    { name: "Papeles", target: 25000, current: 8000, deadline: "2024-05-20" },
  ],
  alerts: [
    { type: "bill", message: "Luz vence en 3 días", amount: 15000 },
    { type: "debt", message: "Cuota moto vence mañana", amount: 45000 },
    { type: "goal", message: "Accesorios al 64% del objetivo", progress: 64 },
  ],
  recentTransactions: [
    { type: "income", description: "Rappi - Turno Noche", amount: 4200, time: "2 horas ago" },
    { type: "expense", description: "Nafta", amount: -2000, time: "4 horas ago" },
    { type: "income", description: "Envíos Extra - Leonardo", amount: 3500, time: "6 horas ago" },
    { type: "expense", description: "Almuerzo", amount: -800, time: "8 horas ago" },
  ]
};

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-income";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-goal";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Financiero</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de tu situación financiera actual
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Calendar size={14} />
            <span>Hoy</span>
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Saldo Disponible"
          value={formatCurrency(mockData.balance)}
          subtitle="Total acumulado"
          icon={DollarSign}
          variant="balance"
        />
        <StatCard
          title="Ingresos de Hoy"
          value={formatCurrency(mockData.todayIncome)}
          subtitle="4 turnos completados"
          icon={TrendingUp}
          variant="income"
          trend={{ value: 12, label: "vs ayer" }}
        />
        <StatCard
          title="Gastos de Hoy"
          value={formatCurrency(mockData.todayExpenses)}
          subtitle="6 transacciones"
          icon={TrendingDown}
          variant="expense"
          trend={{ value: -8, label: "vs ayer" }}
        />
        <StatCard
          title="Progreso Objetivos"
          value="64%"
          subtitle="Promedio general"
          icon={Target}
          variant="goal"
          trend={{ value: 5, label: "este mes" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Objetivos */}
        <Card className="lg:col-span-2 shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-goal" />
              <span>Objetivos Financieros</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {mockData.goals.map((goal, index) => {
              const percentage = (goal.current / goal.target) * 100;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-foreground">{goal.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}% completado</span>
                    <span>Vence: {new Date(goal.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span>Alertas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockData.alerts.map((alert, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {alert.message}
                  </p>
                  {alert.amount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(alert.amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Transacciones Recientes */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockData.recentTransactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === "income" ? "bg-income-light" : "bg-expense-light"
                  }`}>
                    {transaction.type === "income" ? (
                      <TrendingUp className={`h-4 w-4 ${
                        transaction.type === "income" ? "text-income" : "text-expense"
                      }`} />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-expense" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.time}</p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  transaction.type === "income" ? "text-income" : "text-expense"
                }`}>
                  {transaction.amount > 0 ? "+" : ""}{formatCurrency(Math.abs(transaction.amount))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}