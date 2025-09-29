import { useState, useEffect } from "react";
import { Plus, TrendingDown, ShoppingCart, Car, Utensils, Home, Heart, Zap, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Variables
interface Expense {
  id: string;
  date: string;
  category: "nafta" | "comida" | "verduleria" | "supermercado" | "mascota" | "servicios" | "otros";
  description: string;
  amount: number;
  paymentMethod: "efectivo" | "transferencia" | "tarjeta";
  dueDate?: string;
}

// Fijos (facturas)
interface FixedExpense {
  id: string;
  provider: string; // Edesur, Metrogas, etc.
  type: "Luz" | "Gas" | "Internet" | "Celular" | "Garage" | "Otro";
  amount: number;
  date: string; // fecha de carga
  dueDate?: string; // fecha de vencimiento
  paid: boolean;
  fileName?: string; // nombre del PDF
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

export default function Gastos() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "",
    description: "",
    amount: "",
    paymentMethod: "",
    dueDate: ""
  });
  // Formulario de facturas fijas
  const [fixedForm, setFixedForm] = useState({
    provider: "",
    amount: "",
    dueDate: "",
    fileName: ""
  });
  const [autoFillNote, setAutoFillNote] = useState<string>("");
  const focusFirstMissing = () => {
    if (!fixedForm.provider) {
      const el = document.getElementById('fixed-provider') as HTMLInputElement | null;
      el?.focus();
      return;
    }
    if (!fixedForm.amount) {
      const el = document.getElementById('fixed-amount') as HTMLInputElement | null;
      el?.focus();
      return;
    }
    if (!fixedForm.dueDate) {
      const el = document.getElementById('fixed-dueDate') as HTMLInputElement | null;
      el?.focus();
      return;
    }
  };

  // Persistencia
  useEffect(() => {
    try {
      const v = localStorage.getItem("mm_variable_expenses");
      if (v) {
        const parsed = JSON.parse(v) as Expense[];
        if (Array.isArray(parsed)) setExpenses(parsed);
      }
    } catch (err) { console.warn("No se pudo leer mm_variable_expenses", err); }
    try {
      const f = localStorage.getItem("mm_fixed_expenses");
      if (f) {
        const parsed = JSON.parse(f) as FixedExpense[];
        if (Array.isArray(parsed)) setFixedExpenses(parsed);
      }
    } catch (err) { console.warn("No se pudo leer mm_fixed_expenses", err); }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("mm_variable_expenses", JSON.stringify(expenses)); } catch (err) { console.warn("No se pudo guardar mm_variable_expenses", err); }
  }, [expenses]);
  useEffect(() => {
    try { localStorage.setItem("mm_fixed_expenses", JSON.stringify(fixedExpenses)); } catch (err) { console.warn("No se pudo guardar mm_fixed_expenses", err); }
  }, [fixedExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // API base (backend Express)
  const API_BASE = ((import.meta as unknown as { env?: Record<string,string> }).env?.VITE_API_URL) || 'http://localhost:8081';

  // Cargar gastos fijos desde API al montar
  useEffect(() => {
    const loadFixed = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/expenses/fixed`);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) setFixedExpenses(data);
        }
      } catch (e) {
        console.warn('No se pudo cargar gastos fijos desde la API', e);
      }
    };
    loadFixed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modo manual: solo adjuntar PDF (sin OCR)
  const loadInvoicePdf = async (file: File) => {
    try {
      setFixedForm(ff => ({ ...ff, fileName: file.name }));
      setAutoFillNote("");
    } catch (err) {
      console.warn("No se pudo adjuntar el PDF", err);
    }
  };

  const totalToday = expenses
    .filter(expense => expense.date === new Date().toISOString().split('T')[0])
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalWeek = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Heurística simple para tipo de factura a partir del proveedor o filename
  const detectFixedType = (providerOrName: string): FixedExpense["type"] => {
    const s = providerOrName.toLowerCase();
    if (s.includes("edesur") || s.includes("edenor") || s.includes("luz")) return "Luz";
    if (s.includes("metro") || s.includes("gas")) return "Gas";
    if (s.includes("fibertel") || s.includes("telecom") || s.includes("speedy") || s.includes("internet") || s.includes("claro hogar")) return "Internet";
    if (s.includes("personal") || s.includes("claro") || s.includes("movistar") || s.includes("celu")) return "Celular";
    if (s.includes("garage") || s.includes("coch") || s.includes("cochera")) return "Garage";
    return "Otro";
  };

  // Descontar del ahorro actual global (Dashboard) al marcar Pagado
  const discountFromSavings = (amount: number) => {
    try {
      const finRaw = localStorage.getItem("mm_financialData");
      if (!finRaw) return;
      const fin = JSON.parse(finRaw);
      fin.currentSavings = Math.max(0, (fin.currentSavings || 0) - amount);
      localStorage.setItem("mm_financialData", JSON.stringify(fin));
    } catch (err) {
      console.warn("No se pudo descontar del ahorro", err);
    }
  };

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

      {/* Gastos Fijos (Facturas) */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Gastos Fijos (Facturas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <Input id="fixed-provider" placeholder="Edesur / Metrogas / Personal..." value={fixedForm.provider} onChange={(e) => setFixedForm({...fixedForm, provider: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Monto</Label>
              <Input id="fixed-amount" type="number" placeholder="0" value={fixedForm.amount} onChange={(e) => setFixedForm({...fixedForm, amount: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Vence</Label>
              <Input id="fixed-dueDate" type="date" value={fixedForm.dueDate} onChange={(e) => setFixedForm({...fixedForm, dueDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Factura (PDF)</Label>
              <Input type="file" accept="application/pdf" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                await loadInvoicePdf(f);
              }} />
            </div>
          </div>
          {autoFillNote && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{autoFillNote}</span>
              {(!fixedForm.provider || !fixedForm.amount || !fixedForm.dueDate) && (
                <Button type="button" variant="ghost" size="sm" onClick={focusFirstMissing}>
                  Completar campos
                </Button>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={async () => {
                const amount = parseFloat(fixedForm.amount || "0");
                if (!fixedForm.provider || !amount) return;
                const base = fixedForm.provider || fixedForm.fileName;
                const item: FixedExpense = {
                  id: Date.now().toString(),
                  provider: fixedForm.provider,
                  type: detectFixedType(base),
                  amount,
                  date: new Date().toISOString().slice(0,10),
                  dueDate: fixedForm.dueDate || undefined,
                  paid: false,
                  fileName: fixedForm.fileName || undefined
                };
                try {
                  const r = await fetch(`${API_BASE}/api/expenses/fixed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                  });
                  if (r.ok) {
                    const created = await r.json();
                    setFixedExpenses(prev => [created, ...prev]);
                  } else {
                    setFixedExpenses(prev => [item, ...prev]);
                  }
                } catch (e) {
                  console.warn('No se pudo guardar en la API, usando estado local', e);
                  setFixedExpenses(prev => [item, ...prev]);
                }
                setFixedForm({ provider: "", amount: "", dueDate: "", fileName: "" });
              }}
            >
              Subir Factura
            </Button>
          </div>

          {/* Lista de facturas */}
          {fixedExpenses.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay registro</div>
          ) : (
          <div className="max-h-72 overflow-auto border rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Proveedor</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-left">Vence</th>
                  <th className="p-2 text-left">Adjunto</th>
                  <th className="p-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {fixedExpenses.map((fx) => (
                  <tr key={fx.id} className="border-b">
                    <td className="p-2">{fx.date}</td>
                    <td className="p-2">{fx.type}</td>
                    <td className="p-2">{fx.provider}{fx.fileName ? ` (${fx.fileName})` : ""}</td>
                    <td className="p-2 text-right">{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(fx.amount)}</td>
                    <td className="p-2">{fx.dueDate || '-'}</td>
                    <td className="p-2">{fx.fileName ? fx.fileName : '-'}</td>
                    <td className="p-2 text-center">
                      <Button size="sm" variant={fx.paid ? 'secondary' : 'outline'} onClick={async () => {
                        const updated = { ...fx, paid: !fx.paid };
                        try {
                          const r = await fetch(`${API_BASE}/api/expenses/fixed/${fx.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updated)
                          });
                          if (r.ok) {
                            const saved = await r.json();
                            setFixedExpenses(prev => prev.map(e => e.id === fx.id ? saved : e));
                          } else {
                            setFixedExpenses(prev => prev.map(e => e.id === fx.id ? updated : e));
                          }
                        } catch (e) {
                          console.warn('No se pudo actualizar en la API, usando estado local', e);
                          setFixedExpenses(prev => prev.map(e => e.id === fx.id ? updated : e));
                        }
                        if (!fx.paid) {
                          discountFromSavings(fx.amount);
                        }
                      }}>{fx.paid ? 'Pagado' : 'Pago'}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

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
          {Object.keys(expensesByCategory).length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay registro</div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Agregar Nuevo Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
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
            }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Gastos Variables - Lista */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Historial de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay registro</div>
          ) : (
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
          )}
        </CardContent>
      </Card>

    </div>
  );
}