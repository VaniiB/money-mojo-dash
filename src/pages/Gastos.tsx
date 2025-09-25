import { useState, useEffect } from "react";
// PDF parsing (static import) – usamos build legacy para compatibilidad amplia
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - tipos de pdfjs-dist pueden variar según versión
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

import { Plus, TrendingDown, ShoppingCart, Car, Utensils, Home, Heart, Zap, MoreHorizontal } from "lucide-react";
// OCR fallback para PDFs escaneados
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Tesseract from "tesseract.js";
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

  // Configurar worker de pdfjs desde CDN (evita problemas de resolución locales)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

  type PdfTextItem = { str?: string };
  type PdfJsPage = { getTextContent: () => Promise<{ items: PdfTextItem[] }> };
  type PdfJsDoc = { numPages: number; getPage: (n: number) => Promise<PdfJsPage> };
  const parsePdfAndAutofill = async (file: File) => {
    try {
      setAutoFillNote("Leyendo factura...");
      const buf = await file.arrayBuffer();
      const loadingTask = (pdfjsLib as unknown as { getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<PdfJsDoc> } }).getDocument({ data: buf });
      const pdf = await loadingTask.promise;
      let text = "";
      const pages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= pages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const items = content.items || [];
        text += items.map((it) => it.str || "").join(" ") + "\n";
      }
      // OCR fallback si el texto es muy corto (PDF escaneado)
      if (!text || text.trim().length < 20) {
        setAutoFillNote("Leyendo factura... (OCR)");
        const page = await pdf.getPage(1);
        const viewport = (page as any).getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await (page as any).render({ canvasContext: ctx, viewport }).promise;
        const { data } = await Tesseract.recognize(canvas, 'spa');
        if (data && data.text) {
          text = data.text;
        }
      }
      const lower = text.toLowerCase();
      // proveedor: tomar primera palabra fuerte conocida o fallback por nombre archivo
      const providers = ["edesur", "edenor", "metrogas", "telecom", "fibertel", "personal", "claro", "movistar", "speedy", "garage", "cochera", "aysa", "internet", "gas", "luz"];
      let provider = providers.find(p => lower.includes(p)) || file.name.replace(/\.pdf$/i, "");
      provider = provider.charAt(0).toUpperCase() + provider.slice(1);
      // tipo por heurística
      const type = detectFixedType(provider + " " + lower);
      // monto: buscar el número más grande con formato
      const amountMatches = Array.from(text.matchAll(/\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/g))
        .map(m => (m[1] || "").replace(/\./g, "").replace(/,/, "."))
        .map(s => parseFloat(s))
        .filter(n => !isNaN(n));
      const amount = amountMatches.length ? Math.max(...amountMatches) : 0;
      // fecha de vencimiento dd/mm/yyyy
      const dateMatch = text.match(/(venc(?:imiento)?|vto\.?|vence)[:\s-]*?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
      const dueDate = dateMatch ? dateMatch[2].replace(/-/g, "/").split("/").map((v, i) => (i === 2 && v.length === 2 ? `20${v}` : v)).join("-") : "";

      setFixedForm(ff => ({
        ...ff,
        provider: ff.provider || provider,
        amount: ff.amount || (amount ? String(Math.round(amount)) : ""),
        dueDate: ff.dueDate || (dueDate || ""),
        fileName: file.name
      }));
      setAutoFillNote("Factura leída y campos completados automáticamente. Revisá antes de subir.");
    } catch (err) {
      console.warn("No se pudo leer el PDF, usando heurística básica", err);
      setAutoFillNote("No se pudo leer el PDF. Completá o corregí los campos manualmente.");
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
              <Input placeholder="Edesur / Metrogas / Personal..." value={fixedForm.provider} onChange={(e) => setFixedForm({...fixedForm, provider: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Monto</Label>
              <Input type="number" placeholder="0" value={fixedForm.amount} onChange={(e) => setFixedForm({...fixedForm, amount: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Vence</Label>
              <Input type="date" value={fixedForm.dueDate} onChange={(e) => setFixedForm({...fixedForm, dueDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Factura (PDF)</Label>
              <Input type="file" accept="application/pdf" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFixedForm({ ...fixedForm, fileName: f.name });
                await parsePdfAndAutofill(f);
              }} />
            </div>
          </div>
          {autoFillNote && <div className="text-xs text-muted-foreground">{autoFillNote}</div>}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
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
                setFixedExpenses(prev => [item, ...prev]);
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
                    <td className="p-2 text-center">
                      <Button size="sm" variant={fx.paid ? 'secondary' : 'outline'} onClick={() => {
                        setFixedExpenses(prev => prev.map(e => e.id === fx.id ? { ...e, paid: !e.paid } : e));
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