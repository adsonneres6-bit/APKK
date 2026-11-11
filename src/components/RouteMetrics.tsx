import { Link2, MapPin, Package } from 'lucide-react';

interface RouteMetricsProps {
  total: number;
  saved: number;
  stops: number;
}

export function RouteMetrics({ total, saved, stops }: RouteMetricsProps) {
  const items = [
    {
      icon: Package,
      label: 'Total de pedidos',
      value: total,
      iconClass: 'text-brand-600 dark:text-brand-400',
    },
    {
      icon: Link2,
      label: 'Paradas economizadas',
      value: saved,
      iconClass: 'text-emerald-500',
    },
    {
      icon: MapPin,
      label: 'Total de paradas',
      value: stops,
      iconClass: 'text-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Indicadores da rota">
      {items.map(({ icon: Icon, label, value, iconClass }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-800/60"
        >
          <Icon className={`h-4 w-4 ${iconClass}`} />
          <span className="text-lg font-bold leading-none text-slate-900 dark:text-white">
            {value}
          </span>
          <span className="text-center text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
