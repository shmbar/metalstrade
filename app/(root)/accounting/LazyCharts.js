'use client';

// Isolated chart.js entry point so the charting code can be code-split out
// of the accounting page's first-load bundle via next/dynamic.
// /accounting only uses <Bar>, so register only the elements Bar needs.
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar as RBar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function Bar(props) {
  return <RBar {...props} />;
}
