import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudFog,
  CloudLightning,
  Snowflake,
  Wind,
  Tornado,
} from 'lucide-react';

/**
 * Стилизованные иконки погоды (lucide stroke-based) — в едином дизайне с
 * остальной системой. Заменяют emoji-фолбэки, которые на Android выглядят
 * слишком пёстрыми и не читаются на тёмной подложке.
 */
export function WeatherIcon({
  condition,
  size = 26,
  strokeWidth = 1.6,
}: {
  condition: string;
  size?: number;
  strokeWidth?: number;
}) {
  const props = { size, strokeWidth };
  switch (condition) {
    case 'sunny':
    case 'clear':
      return <Sun {...props} className="text-amber-300" />;
    case 'clear-night':
      return <Moon {...props} className="text-slate-300" />;
    case 'cloudy':
      return <Cloud {...props} className="text-slate-300" />;
    case 'partlycloudy':
      return <CloudSun {...props} className="text-slate-300" />;
    case 'partlycloudy-night':
      return <CloudMoon {...props} className="text-slate-300" />;
    case 'rainy':
      return <CloudRain {...props} className="text-cyan-300" />;
    case 'pouring':
      return <CloudRain {...props} className="text-cyan-400" />;
    case 'snowy':
      return <CloudSnow {...props} className="text-cyan-100" />;
    case 'snowy-rainy':
      return <CloudDrizzle {...props} className="text-cyan-200" />;
    case 'fog':
    case 'mist':
      return <CloudFog {...props} className="text-slate-400" />;
    case 'windy':
    case 'windy-variant':
      return <Wind {...props} className="text-slate-300" />;
    case 'hail':
      return <Snowflake {...props} className="text-cyan-100" />;
    case 'lightning':
    case 'lightning-rainy':
      return <CloudLightning {...props} className="text-amber-300" />;
    case 'exceptional':
      return <Tornado {...props} className="text-red-400" />;
    default:
      return <Cloud {...props} className="text-slate-300" />;
  }
}
