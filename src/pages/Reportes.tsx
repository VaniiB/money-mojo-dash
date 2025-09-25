import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, PieChart, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Income = { id: string; date: string; person: "vanina"|"leonardo"; type: "rappi"|"envios"; shift: "dia"|"noche"; amount: number; tips: number; paymentMethod: "efectivo"|"transferencia"; location: string };
type VariableExpense = { id: string; date: string; category: string; description: string; amount: number; paymentMethod: string; dueDate?: string };
type FixedExpense = { id: string; provider: string; type: string; amount: number; date: string; dueDate?: string; paid: boolean; fileName?: string; for: "vanina"|"leonardo" };

export default function Reportes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [varExpenses, setVarExpenses] = useState<VariableExpense[]>([]);
  const [fixExpenses, setFixExpenses] = useState<FixedExpense[]>([]);
  const [period, setPeriod] = useState<{from?: string; to?: string}>({});

  useEffect(() => {
    try { const v = localStorage.getItem("mm_incomes"); if (v) setIncomes(JSON.parse(v)); } catch (err) { console.warn("No se pudo leer mm_incomes", err); }
    try { const v = localStorage.getItem("mm_variable_expenses"); if (v) setVarExpenses(JSON.parse(v)); } catch (err) { console.warn("No se pudo leer mm_variable_expenses", err); }
    try { const v = localStorage.getItem("mm_fixed_expenses"); if (v) setFixExpenses(JSON.parse(v)); } catch (err) { console.warn("No se pudo leer mm_fixed_expenses", err); }
  }, []);

  const inPeriod = useCallback((d: string) => {
    if (!period.from && !period.to) return true;
    const x = new Date(d).getTime();
    if (period.from && x < new Date(period.from).getTime()) return false;
    if (period.to && x > new Date(period.to).getTime()) return false;
    return true;
  }, [period]);

  const incomesFilt = useMemo(() => incomes.filter(i => inPeriod(i.date)), [incomes, inPeriod]);
  const varExpFilt = useMemo(() => varExpenses.filter(e => inPeriod(e.date)), [varExpenses, inPeriod]);
  const fixExpFilt = useMemo(() => fixExpenses.filter(e => inPeriod(e.date)), [fixExpenses, inPeriod]);

  const totalIncome = incomesFilt.reduce((s, i) => s + i.amount + (i.tips||0), 0);
  const totalVar = varExpFilt.reduce((s, e) => s + e.amount, 0);
  const totalFix = fixExpFilt.reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalVar - totalFix;

  const formatCurrency = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

  // Datos para gráficos simples (SVG)
  const bars = [
    { label: "Ingresos", value: totalIncome, color: "#2563eb" },
    { label: "Gastos Fijos", value: totalFix, color: "#ef4444" },
    { label: "Gastos Var.", value: totalVar, color: "#f59e0b" },
  ];
  const maxBar = Math.max(1, ...bars.map(b => b.value));

  const byCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of varExpFilt) acc[e.category] = (acc[e.category]||0) + e.amount;
    return Object.entries(acc).sort((a,b)=>b[1]-a[1]).slice(0,6);
  }, [varExpFilt]);

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows: Array<Array<string | number>> = [];
      rows.push(["Ingresos"]);
      rows.push(["Fecha","Persona","Tipo","Turno","Monto","Propinas","Método","Ubicación"]);
      incomesFilt.forEach(i => rows.push([i.date, i.person, i.type, i.shift, i.amount, i.tips||0, i.paymentMethod, i.location]));
      rows.push([]); rows.push(["Gastos Fijos"]);
      rows.push(["Fecha","Tipo","Proveedor","Para","Monto","Vence","Pagado"]);
      fixExpFilt.forEach(f => rows.push([f.date, f.type, f.provider, f.for, f.amount, f.dueDate||"", f.paid?"Sí":"No"]));
      rows.push([]); rows.push(["Gastos Variables"]);
      rows.push(["Fecha","Categoría","Descripción","Monto","Método","Vence"]);
      varExpFilt.forEach(v => rows.push([v.date, v.category, v.description, v.amount, v.paymentMethod, v.dueDate||""]));

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      XLSX.writeFile(wb, "reporte_finanzas.xlsx");
    } catch (err) {
      console.warn("Fallo exportación xlsx, usando CSV", err);
      // Fallback CSV
      const csv = [
        "Ingresos", "Fecha,Persona,Tipo,Turno,Monto,Propinas,Método,Ubicación",
        ...incomesFilt.map(i => `${i.date},${i.person},${i.type},${i.shift},${i.amount},${i.tips||0},${i.paymentMethod},${i.location}`),
        "", "Gastos Fijos", "Fecha,Tipo,Proveedor,Para,Monto,Vence,Pagado",
        ...fixExpFilt.map(f => `${f.date},${f.type},${f.provider},${f.for},${f.amount},${f.dueDate||""},${f.paid?"Sí":"No"}`),
        "", "Gastos Variables", "Fecha,Categoría,Descripción,Monto,Método,Vence",
        ...varExpFilt.map(v => `${v.date},${v.category},${v.description},${v.amount},${v.paymentMethod},${v.dueDate||""}`)
      ].join("\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'reporte_finanzas.csv'; a.click(); URL.revokeObjectURL(url);
    }
  };

  const exportPDF = async () => {
    try {
      const jsPDFmod = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      const jsPDF = (jsPDFmod as any).jsPDF || (jsPDFmod as any).default;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      doc.setFontSize(14);
      doc.text('Reporte Finanzas', 40, 40);
      let y = 70;
      const section = (title: string, headers: string[], rows: Array<Array<string | number>>) => {
        (autoTableMod as any).default(doc, { startY: y, head: [headers], body: rows, theme: 'grid', styles: { fontSize: 9 } });
        // @ts-ignore
        y = (doc as any).lastAutoTable.finalY + 20;
      };
      section('Ingresos', ["Fecha","Persona","Tipo","Turno","Monto","Propinas","Método","Ubicación"], incomesFilt.map(i => [i.date, i.person, i.type, i.shift, i.amount, i.tips||0, i.paymentMethod, i.location]));
      section('Gastos Fijos', ["Fecha","Tipo","Proveedor","Para","Monto","Vence","Pagado"], fixExpFilt.map(f => [f.date, f.type, f.provider, f.for, f.amount, f.dueDate||"", f.paid?"Sí":"No"]));
      section('Gastos Variables', ["Fecha","Categoría","Descripción","Monto","Método","Vence"], varExpFilt.map(v => [v.date, v.category, v.description, v.amount, v.paymentMethod, v.dueDate||""]));
      doc.save('reporte_finanzas.pdf');
    } catch (err) {
      console.warn("Fallo exportación PDF, usando print()", err);
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes y Análisis</h1>
          <p className="text-muted-foreground mt-1">
            Análisis detallado de tu situación financiera
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-2"/>Exportar Excel</Button>
          <Button variant="outline" onClick={exportPDF}><Download className="h-4 w-4 mr-2"/>Exportar PDF</Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="shadow-medium">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <input type="date" className="mt-1 w-full border rounded h-9 px-2" value={period.from || ''} onChange={(e)=>setPeriod(p=>({...p, from: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input type="date" className="mt-1 w-full border rounded h-9 px-2" value={period.to || ''} onChange={(e)=>setPeriod(p=>({...p, to: e.target.value}))}/>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => setPeriod({})}>Limpiar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-medium">
          <CardHeader><CardTitle>Total Ingresos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</CardContent>
        </Card>
        <Card className="shadow-medium">
          <CardHeader><CardTitle>Total Gastos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-expense">{formatCurrency(totalFix + totalVar)}</CardContent>
        </Card>
        <Card className="shadow-medium">
          <CardHeader><CardTitle>Neto</CardTitle></CardHeader>
          <CardContent className={`text-2xl font-bold ${net>=0? 'text-income':'text-expense'}`}>{formatCurrency(net)}</CardContent>
        </Card>
      </div>

      {/* Barras Ingresos vs Gastos */}
      <Card className="shadow-medium">
        <CardHeader><CardTitle>Ingresos vs Gastos</CardTitle></CardHeader>
        <CardContent>
          <svg viewBox="0 0 400 160" className="w-full h-40">
            {bars.map((b, idx) => {
              const h = (b.value / maxBar) * 120;
              const x = 40 + idx*110;
              const y = 140 - h;
              return (
                <g key={b.label}>
                  <rect x={x} y={y} width={80} height={h} fill={b.color} rx={6} />
                  <text x={x+40} y={150} textAnchor="middle" fontSize="12">{b.label}</text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Top categorías de gastos variables */}
      <Card className="shadow-medium">
        <CardHeader><CardTitle>Top categorías (Gastos Variables)</CardTitle></CardHeader>
        <CardContent>
          {byCategory.length === 0 ? <div className="text-sm text-muted-foreground">No hay registro</div> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {byCategory.map(([cat, val]) => (
                <div key={cat} className="p-3 border rounded">
                  <div className="text-sm text-muted-foreground">{cat}</div>
                  <div className="text-lg font-semibold">{formatCurrency(val)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}