import { useState } from "react";
import { Plus, TrendingDown, ShoppingCart, Car, Utensils, Home, Heart, Zap, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  date: string;
  category: "nafta" | "comida" | "verduleria" | "supermercado" | "mascota" | "servicios" | "otros";
  description: string;
  amount: number;
  paymentMethod: "efectivo" | "transferencia" | "tarjeta";
  dueDate?: string;
}

const categoryIcons = {
  nafta: Car,
  comida: Utensils,
  verduleria: ShoppingCart,
  supermercado: ShoppingCart,
  mascota: Heart,
  servicios: Zap,
  otros: MoreHorizontal,
};

const categoryColors = {
  nafta: "bg-blue-500",
  comida: "bg-orange-500",
  verduleria: "bg-green-500",
  supermercado: "bg-purple-500",
  mascota: "bg-pink-500",
  servicios: "bg-yellow-500",
  otros: "bg-gray-500",
};

const mockExpenses: Expense[] = [
  {
    id: "1",
    date: "2024-01-15",
    category: "nafta",
    description: "Carga de combustible",
    amount: 8000,
    paymentMethod: "efectivo"
  },
  {
    id: "2",
    date: "2024-01-15",
    category: "comida",
    description: "Almuerzo",
    amount: 1200,
    paymentMethod: "efectivo"
  },
  {
    id: "3",
    date: "2024-01-14",
    category: "servicios",
    description: "Luz",
    amount: 15000,
    paymentMethod: "transferencia",
    dueDate: "2024-01-20"
  },
  {
    id: "4",
    date: "2024-01-14",
    category: "supermercado",
    description: "Compras del hogar",
    amount: 12500,
    paymentMethod: "tarjeta"
  }
];

export default function Gastos() {
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "",
    description: "",
    amount: "",
    paymentMethod: "",
    dueDate: ""
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Expense = {
      id: Date.now().toString(),
      date: formData.date,
      category: formData.category as Expense["category"],
      description: formData.description,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod as Expense["paymentMethod"],
      dueDate: formData.dueDate || undefined
    };

    setExpenses([newExpense, ...expenses]);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      amount: "",
      paymentMethod: "",
      dueDate: ""
    });
    setShowForm(false);
  };

  const totalToday = expenses
    .filter(expense => expense.date === new Date().toISOString().split('T')[0])
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalWeek = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Registro de Gastos</h1>
          <p className="text-muted-foreground mt-1">
            Controla tus gastos por categorías
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-expense border-0 mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gastos de Hoy</p>
                <p className="text-2xl font-bold text-expense">{formatCurrency(totalToday)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-expense" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold text-expense">{formatCurrency(totalWeek)}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-expense" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio Diario</p>
                <p className="text-2xl font-bold text-expense">{formatCurrency(totalWeek / 7)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-expense" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Summary */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(expensesByCategory).map(([category, amount]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons];
              const colorClass = categoryColors[category as keyof typeof categoryColors];
              return (
                <div key={category} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`p-2 rounded-full ${colorClass} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground capitalize">{category}</p>
                    <p className="text-sm text-expense font-semibold">{formatCurrency(amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Agregar Nuevo Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nafta">Nafta</SelectItem>
                    <SelectItem value="comida">Comida</SelectItem>
                    <SelectItem value="verduleria">Verdulería</SelectItem>
                    <SelectItem value="supermercado">Supermercado</SelectItem>
                    <SelectItem value="mascota">Mascota</SelectItem>
                    <SelectItem value="servicios">Servicios</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  placeholder="Descripción del gasto"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Fecha de Vencimiento (opcional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-gradient-expense border-0">
                  Guardar Gasto
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Historial de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.map((expense) => {
              const Icon = categoryIcons[expense.category];
              const colorClass = categoryColors[expense.category];
              return (
                <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${colorClass} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="capitalize">
                          {expense.category}
                        </Badge>
                        <Badge variant={expense.paymentMethod === "efectivo" ? "default" : "secondary"}>
                          {expense.paymentMethod === "efectivo" ? "Efectivo" : 
                           expense.paymentMethod === "transferencia" ? "Transferencia" : "Tarjeta"}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                        {expense.dueDate && (
                          <span className="text-destructive">
                            Vence: {new Date(expense.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-expense">
                      -{formatCurrency(expense.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}