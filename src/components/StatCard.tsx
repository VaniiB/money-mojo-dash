import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant: "income" | "expense" | "balance" | "goal";
  trend?: {
    value: number;
    label: string;
  };
}

const variantStyles = {
  income: {
    background: "bg-gradient-income",
    text: "text-income-foreground",
    iconBg: "bg-income-light",
    iconText: "text-income",
  },
  expense: {
    background: "bg-gradient-expense",
    text: "text-expense-foreground",
    iconBg: "bg-expense-light",
    iconText: "text-expense",
  },
  balance: {
    background: "bg-gradient-primary",
    text: "text-primary-foreground",
    iconBg: "bg-balance-light",
    iconText: "text-balance",
  },
  goal: {
    background: "bg-gradient-goal",
    text: "text-goal-foreground",
    iconBg: "bg-goal-light",
    iconText: "text-goal",
  },
};

export default function StatCard({ title, value, subtitle, icon: Icon, variant, trend }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className="overflow-hidden shadow-medium hover:shadow-strong transition-all duration-300">
      <CardContent className="p-0">
        <div className={cn("p-6", styles.background)}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className={cn("text-sm font-medium opacity-90", styles.text)}>
                {title}
              </p>
              <p className={cn("text-2xl font-bold", styles.text)}>
                {value}
              </p>
              {subtitle && (
                <p className={cn("text-sm opacity-75", styles.text)}>
                  {subtitle}
                </p>
              )}
            </div>
            <div className={cn("p-3 rounded-full", styles.iconBg)}>
              <Icon className={cn("h-6 w-6", styles.iconText)} />
            </div>
          </div>
          
          {trend && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center space-x-2">
                <span className={cn("text-sm font-medium", styles.text)}>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </span>
                <span className={cn("text-xs opacity-75", styles.text)}>
                  {trend.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}