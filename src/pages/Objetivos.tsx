import { useState, useEffect, useMemo } from "react";
import { Plus, Target, TrendingUp, Link as LinkIcon, Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type Accessory = {
  id: string;
  url: string;
  title: string;
  price?: number;
  image?: string;
  description?: string;
  bought?: boolean;
};

export default function Objetivos() {
  // Moto (único con barra de progreso visible)
  const MOTO_TARGET = 2500000;
  const [motoCurrent, setMotoCurrent] = useState<number>(0);
  // Papeles / documentación (sin barra, solo monto objetivo)
  const DOCUMENTS_TARGET = 300000;
  // Accesorios (lista con links)
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);

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

  // Persistir moto y accesorios en localStorage
  useEffect(() => {
    try {
      const finRaw = localStorage.getItem("mm_financialData");
      if (finRaw) {
        const fin = JSON.parse(finRaw);
        if (fin?.motoGoal?.current != null) setMotoCurrent(fin.motoGoal.current);
      }
    } catch (err) {
      console.warn("No se pudo leer mm_financialData", err);
    }
    try {
      const accRaw = localStorage.getItem("mm_accessories");
      if (accRaw) {
        const acc = JSON.parse(accRaw) as unknown;
        if (Array.isArray(acc)) {
          // migración: entradas antiguas con {name, url}
          const migrated = (acc as Array<Record<string, unknown>>).map((a) => ({
            id: (typeof a.id === 'string' && a.id) ? a.id : String(Date.now()),
            url: typeof a.url === 'string' ? a.url : '',
            title: typeof a.title === 'string' ? a.title : (typeof a.name === 'string' ? a.name : (typeof a.url === 'string' ? a.url : 'Producto')),
            price: typeof a.price === 'number' ? a.price : undefined,
            image: typeof a.image === 'string' ? a.image : undefined,
            description: typeof a.description === 'string' ? a.description : undefined,
            bought: Boolean(a.bought),
          })) as Accessory[];
          setAccessories(migrated);
        }
      }
    } catch (err) {
      console.warn("No se pudo leer mm_accessories", err);
    }
  }, []);
  useEffect(() => {
    try {
      // reflejar progreso de moto en financialData para unificar dashboard
      const finRaw = localStorage.getItem("mm_financialData");
      const fin = finRaw ? JSON.parse(finRaw) : {};
      fin.motoGoal = fin.motoGoal || { target: MOTO_TARGET, current: 0 };
      fin.motoGoal.target = MOTO_TARGET;
      fin.motoGoal.current = motoCurrent;
      localStorage.setItem("mm_financialData", JSON.stringify(fin));
    } catch (err) {
      console.warn("No se pudo guardar mm_financialData", err);
    }
  }, [motoCurrent]);
  useEffect(() => {
    try { localStorage.setItem("mm_accessories", JSON.stringify(accessories)); } catch (err) {
      console.warn("No se pudo guardar mm_accessories", err);
    }
  }, [accessories]);

  // Detectar y traer datos de Mercado Libre por ID (MLA...)
  const extractMLId = (url: string) => {
    const m = url.match(/(ML[A-Z]{1}\d{6,})/i);
    return m ? m[1].toUpperCase() : undefined;
  };

  const addFromUrl = async () => {
    if (!newUrl) return;
    setAdding(true);
    const url = newUrl.trim();
    let accessory: Accessory = { id: Date.now().toString(), url, title: url };
    try {
      const id = extractMLId(url);
      if (id) {
        const res = await fetch(`https://api.mercadolibre.com/items/${id}`);
        if (res.ok) {
          const data = await res.json();
          accessory = {
            id: Date.now().toString(),
            url,
            title: data.title || url,
            price: typeof data.price === 'number' ? data.price : undefined,
            image: data.thumbnail || (data.pictures && data.pictures[0]?.url) || undefined,
            description: (data.condition ? `Condición: ${data.condition}` : undefined),
            bought: false,
          };
          // intentar descripción extendida
          try {
            const dres = await fetch(`https://api.mercadolibre.com/items/${id}/description`);
            if (dres.ok) {
              const d = await dres.json();
              accessory.description = d.plain_text || accessory.description;
            }
          } catch (e) { console.warn('No se pudo leer descripción extendida ML', e); }
        }
      }
    } catch (err) {
      console.warn("No se pudo obtener datos del link", err);
    }
    setAccessories((prev) => [accessory, ...prev]);
    setNewUrl("");
    setAdding(false);
    setShowForm(false);
  };

  const overallProgress = useMemo(() => getProgressPercentage(motoCurrent, MOTO_TARGET), [motoCurrent]);

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
                <p className="text-sm text-muted-foreground">Moto - Meta</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(MOTO_TARGET)}</p>
              </div>
              <Target className="h-8 w-8 text-goal" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Moto - Ahorrado</p>
                <p className="text-2xl font-bold text-income">{formatCurrency(motoCurrent)}</p>
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
            <CardTitle>Agregar producto (link de Mercado Libre)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e)=>{e.preventDefault(); addFromUrl();}} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="acc-url">Link (Mercado Libre)</Label>
                <Input id="acc-url" placeholder="https://articulo.mercadolibre.com.ar/..." value={newUrl} onChange={(e)=>setNewUrl(e.target.value)} required />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={adding} className="bg-gradient-goal border-0 flex-1">{adding ? 'Agregando...' : 'Agregar'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Moto (con barra de progreso) + Papeles (solo lista) + Accesorios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moto */}
        <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Moto Nueva</CardTitle>
              <Badge variant={overallProgress >= 100 ? "default" : "outline"}>
                {overallProgress >= 100 ? "Completado" : `${overallProgress.toFixed(1)}%`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{formatCurrency(motoCurrent)}</span>
                <span className="text-muted-foreground">{formatCurrency(MOTO_TARGET)}</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Sumar ahorro"
                value={String(0)}
                onChange={() => {}}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Papeles / Documentación */}
        <Card className="shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Papeles / Documentación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto objetivo</span>
              <span className="font-semibold">{formatCurrency(DOCUMENTS_TARGET)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sin barra de progreso. Se administrará como lista de tareas y pagos.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accesorios (auto-cards desde link) */}
      <Card className="shadow-medium">
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-lg">Accesorios de moto</CardTitle>
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {accessories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay registro</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accessories.map((a) => (
                <div key={a.id} className="border rounded overflow-hidden">
                  {a.image ? (
                    <img src={a.image} alt={a.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center text-sm text-muted-foreground">Sin imagen</div>
                  )}
                  <div className="p-3 space-y-2">
                    <div className="font-semibold line-clamp-2">{a.title}</div>
                    {typeof a.price === 'number' && <div className="text-primary font-bold">{formatCurrency(a.price)}</div>}
                    {a.description && <div className="text-xs text-muted-foreground line-clamp-3">{a.description}</div>}
                    <div className="flex items-center justify-between pt-1">
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-sm">
                        <LinkIcon className="h-4 w-4" /> Ver producto
                      </a>
                      <Button size="sm" variant={a.bought ? 'secondary' : 'outline'} onClick={() => setAccessories(prev => prev.map(x => x.id === a.id ? { ...x, bought: !x.bought } : x))}>
                        <Check className="h-4 w-4 mr-1" /> {a.bought ? 'Comprado' : 'Marcar comprado'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}