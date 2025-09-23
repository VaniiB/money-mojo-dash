import { useState } from "react";
import { Plus, TrendingUp, Calendar, User, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Income {
  id: string;
  date: string;
  type: "rappi" | "envios";
  shift: "dia" | "noche";
  person: "vanina" | "leonardo";
  amount: number;
  tips: number;
  paymentMethod: "efectivo" | "transferencia";
  location: string;
}

const mockIncomes: Income[] = [
  {
    id: "1",
    date: "2024-01-15",
    type: "rappi",
    shift: "noche",
    person: "vanina",
    amount: 4200,
    tips: 800,
    paymentMethod: "efectivo",
    location: "Centro"
  },
  {
    id: "2", 
    date: "2024-01-15",
    type: "envios",
    shift: "dia", 
    person: "leonardo",
    amount: 3500,
    tips: 0,
    paymentMethod: "transferencia",
    location: "Zona Norte"
  },
  {
    id: "3",
    date: "2024-01-14",
    type: "rappi",
    shift: "dia",
    person: "vanina", 
    amount: 3800,
    tips: 600,
    paymentMethod: "efectivo",
    location: "Centro"
  }
];

export default function Ingresos() {
  const [incomes, setIncomes] = useState<Income[]>(mockIncomes);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: "",
    shift: "",
    person: "",
    amount: "",
    tips: "",
    paymentMethod: "",
    location: ""
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
    const newIncome: Income = {
      id: Date.now().toString(),
      date: formData.date,
      type: formData.type as "rappi" | "envios",
      shift: formData.shift as "dia" | "noche", 
      person: formData.person as "vanina" | "leonardo",
      amount: parseFloat(formData.amount),
      tips: parseFloat(formData.tips) || 0,
      paymentMethod: formData.paymentMethod as "efectivo" | "transferencia",
      location: formData.location
    };

    setIncomes([newIncome, ...incomes]);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: "",
      shift: "",
      person: "",
      amount: "",
      tips: "",
      paymentMethod: "",
      location: ""
    });
    setShowForm(false);
  };

  const totalToday = incomes
    .filter(income => income.date === new Date().toISOString().split('T')[0])
    .reduce((sum, income) => sum + income.amount + income.tips, 0);

  const totalWeek = incomes.reduce((sum, income) => sum + income.amount + income.tips, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Registro de Ingresos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus ingresos de Rappi y envíos extra
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-income border-0 mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ingreso
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoy</p>
                <p className="text-2xl font-bold text-income">{formatCurrency(totalToday)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-income" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold text-income">{formatCurrency(totalWeek)}</p>
              </div>
              <Calendar className="h-8 w-8 text-income" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio Diario</p>
                <p className="text-2xl font-bold text-income">{formatCurrency(totalWeek / 7)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-income" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Agregar Nuevo Ingreso</CardTitle>
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
                <Label htmlFor="type">Tipo de Ingreso</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rappi">Rappi</SelectItem>
                    <SelectItem value="envios">Envíos Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Turno</Label>
                <Select value={formData.shift} onValueChange={(value) => setFormData({...formData, shift: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Día</SelectItem>
                    <SelectItem value="noche">Noche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="person">Persona</Label>
                <Select value={formData.person} onValueChange={(value) => setFormData({...formData, person: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vanina">Vanina</SelectItem>
                    <SelectItem value="leonardo">Leonardo</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="tips">Propinas</Label>
                <Input
                  id="tips"
                  type="number"
                  placeholder="0"
                  value={formData.tips}
                  onChange={(e) => setFormData({...formData, tips: e.target.value})}
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  placeholder="Zona de trabajo"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-gradient-income border-0">
                  Guardar Ingreso
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Income List */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Historial de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incomes.map((income) => (
              <div key={income.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-income-light rounded-full">
                    <TrendingUp className="h-4 w-4 text-income" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={income.type === "rappi" ? "default" : "secondary"}>
                        {income.type === "rappi" ? "Rappi" : "Envíos"}
                      </Badge>
                      <Badge variant="outline">{income.shift === "dia" ? "Día" : "Noche"}</Badge>
                    </div>
                    <p className="font-medium text-foreground capitalize">
                      {income.person} - {income.location}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(income.date).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{income.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-income">
                    {formatCurrency(income.amount + income.tips)}
                  </p>
                  {income.tips > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Base: {formatCurrency(income.amount)} + Propina: {formatCurrency(income.tips)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}