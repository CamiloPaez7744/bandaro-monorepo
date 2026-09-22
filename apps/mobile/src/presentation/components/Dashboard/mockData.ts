export interface RadarPoint {
  metric: string;
  value: number;
}

export interface ProgressPoint {
  label: string;
  value: number;
}

export interface HeatmapDay {
  date: string;
  shots: number;
}

export const mockRadarData: RadarPoint[] = [
  { metric: 'Precisión', value: 68 },
  { metric: 'Consistencia', value: 55 },
  { metric: 'Dificultad', value: 72 },
  { metric: 'Constancia', value: 84 },
  { metric: 'Cobertura', value: 60 },
];

export const mockProgressData: ProgressPoint[] = [
  { label: 'S1', value: 42 },
  { label: 'S2', value: 48 },
  { label: 'S3', value: 45 },
  { label: 'S4', value: 57 },
  { label: 'S5', value: 61 },
  { label: 'S6', value: 66 },
];

export const mockHeatmapData: HeatmapDay[] = (() => {
  const days: HeatmapDay[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const seed = (d.getDate() * 7 + d.getMonth() * 13 + i * 3) % 11;
    const shots = seed > 6 ? seed * 4 : seed > 3 ? seed * 2 : 0;
    days.push({ date: d.toISOString().slice(0, 10), shots });
  }
  return days;
})();

export const mockKpis = {
  streak: 6,
  daysTrained: 42,
  average: 0.78,
  totalShots: 1240,
};
