'use client';

// Isolated chart.js entry point so the (heavy) charting code can be
// code-split out of the dashboard's first-load bundle via next/dynamic.
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar as RBar, Line as RLine } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  ArcElement,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export function Bar(props) {
  return <RBar {...props} />;
}

export function Line(props) {
  return <RLine {...props} />;
}
