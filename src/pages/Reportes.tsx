import { BarChart3, PieChart, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Reportes() {
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
        <Button variant="outline" className="mt-4 sm:mt-0">
          <Download className="h-4 w-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Coming Soon Message */}
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="p-6 bg-gradient-primary/10 rounded-full">
          <BarChart3 className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Reportes en Desarrollo</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta sección incluirá gráficos detallados, análisis de tendencias y reportes exportables. 
          ¡Próximamente disponible!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-3xl">
          <Card className="text-center shadow-medium">
            <CardContent className="p-6">
              <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Gráficos de Barras</h3>
              <p className="text-sm text-muted-foreground">Ingresos vs gastos por período</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-medium">
            <CardContent className="p-6">
              <PieChart className="h-8 w-8 text-goal mx-auto mb-2" />
              <h3 className="font-semibold">Distribución</h3>
              <p className="text-sm text-muted-foreground">Gastos por categoría</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-medium">
            <CardContent className="p-6">
              <TrendingUp className="h-8 w-8 text-income mx-auto mb-2" />
              <h3 className="font-semibold">Tendencias</h3>
              <p className="text-sm text-muted-foreground">Progreso de objetivos</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}