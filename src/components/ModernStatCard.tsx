import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModernStatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant: "income" | "expense" | "balance" | "goal";
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

const variantStyles = {
  income: {
    iconBg: "bg-income-light",
    iconColor: "text-income",
    valueColor: "text-income",
    trendBg: "bg-income-subtle",
  },
  expense: {
    iconBg: "bg-expense-light",
    iconColor: "text-expense",
    valueColor: "text-expense",
    trendBg: "bg-expense-subtle",
  },
  balance: {
    iconBg: "bg-balance-light",
    iconColor: "text-balance",
    valueColor: "text-balance",
    trendBg: "bg-balance-subtle",
  },
  goal: {
    iconBg: "bg-goal-light",
    iconColor: "text-goal",
    valueColor: "text-goal",
    trendBg: "bg-goal-subtle",
  },
};

export default function ModernStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant, 
  trend,
  className 
}: ModernStatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("border-0 shadow-card bg-gradient-card hover:shadow-medium transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {title}
            </p>
            <div className="space-y-1">
              <p className={cn("text-2xl font-bold tracking-tight", styles.valueColor)}>
                {value}
              </p>
              {subtitle && (
                <p className="text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            
            {trend && (
              <div className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-3", styles.trendBg)}>
                <span className={styles.iconColor}>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </span>
                <span className="text-muted-foreground ml-1">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          
          <div className={cn("p-3 rounded-xl", styles.iconBg)}>
            <Icon className={cn("h-6 w-6", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}