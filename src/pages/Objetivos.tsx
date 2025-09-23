import { useState } from "react";
import { Plus, Target, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  createdAt: string;
}

const mockGoals: Goal[] = [
  {
    id: "1",
    name: "Moto Nueva",
    targetAmount: 800000,
    currentAmount: 245000,
    deadline: "2024-06-15",
    createdAt: "2024-01-01"
  },
  {
    id: "2",
    name: "Accesorios para Moto",
    targetAmount: 50000,
    currentAmount: 32000,
    deadline: "2024-04-30",
    createdAt: "2024-01-10"
  },
  {
    id: "3",
    name: "Papeles y Documentación",
    targetAmount: 25000,
    currentAmount: 8000,
    deadline: "2024-05-20",
    createdAt: "2024-01-15"
  },
  {
    id: "4",
    name: "Fondo de Emergencia",
    targetAmount: 100000,
    currentAmount: 15000,
    createdAt: "2024-01-05"
  }
];

export default function Objetivos() {
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [showForm, setShowForm] = useState(false);
  const [showAddAmount, setShowAddAmount] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    deadline: ""
  });
  const [amountToAdd, setAmountToAdd] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "text-income";
    if (percentage >= 50) return "text-yellow-600";
    return "text-goal";
  };

  const getProgressBg = (percentage: number) => {
    if (percentage >= 80) return "bg-income";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-goal";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: Goal = {
      id: Date.now().toString(),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: 0,
      deadline: formData.deadline || undefined,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setGoals([...goals, newGoal]);
    setFormData({
      name: "",
      targetAmount: "",
      deadline: ""
    });
    setShowForm(false);
  };

  const handleAddAmount = (goalId: string) => {
    const amount = parseFloat(amountToAdd);
    if (!amount || amount <= 0) return;

    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, currentAmount: goal.currentAmount + amount }
        : goal
    ));
    setAmountToAdd("");
    setShowAddAmount(null);
  };

  const totalGoals = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const overallProgress = totalGoals > 0 ? (totalSaved / totalGoals) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Objetivos Financieros</h1>
          <p className="text-muted-foreground mt-1">
            Mantén el control de tus metas y ahorros
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-goal border-0 mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Objetivo
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Objetivos</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGoals)}</p>
              </div>
              <Target className="h-8 w-8 text-goal" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ahorrado</p>
                <p className="text-2xl font-bold text-income">{formatCurrency(totalSaved)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-income" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progreso General</p>
                <p className="text-2xl font-bold text-goal">{overallProgress.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-goal-light flex items-center justify-center">
                <span className="text-goal font-bold text-sm">{Math.round(overallProgress)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Crear Nuevo Objetivo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Objetivo</Label>
                <Input
                  id="name"
                  placeholder="Ej: Moto, Accesorios, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAmount">Monto Objetivo</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="0"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Fecha Límite (opcional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>

              <div className="flex items-end">
                <div className="flex gap-2 w-full">
                  <Button type="submit" className="bg-gradient-goal border-0 flex-1">
                    Crear Objetivo
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const percentage = getProgressPercentage(goal.currentAmount, goal.targetAmount);
          const remaining = goal.targetAmount - goal.currentAmount;
          const progressColor = getProgressColor(percentage);
          const progressBg = getProgressBg(percentage);
          
          return (
            <Card key={goal.id} className="shadow-medium hover:shadow-strong transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{goal.name}</CardTitle>
                  <Badge variant={percentage >= 100 ? "default" : "outline"}>
                    {percentage >= 100 ? "Completado" : `${percentage.toFixed(1)}%`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <Progress value={percentage} className="h-3" />
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Restante:</span>
                    <span className={`font-semibold ${remaining > 0 ? 'text-expense' : 'text-income'}`}>
                      {remaining > 0 ? formatCurrency(remaining) : "¡Completado!"}
                    </span>
                  </div>
                  
                  {goal.deadline && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha límite:</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(goal.deadline).toLocaleDateString()}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Add Amount */}
                {showAddAmount === goal.id ? (
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Monto a agregar"
                      value={amountToAdd}
                      onChange={(e) => setAmountToAdd(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddAmount(goal.id)}
                      className="bg-income hover:bg-income/90"
                    >
                      Agregar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddAmount(null);
                        setAmountToAdd("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddAmount(goal.id)}
                    disabled={percentage >= 100}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Dinero
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}