import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  labels: string[];
  values: number[];
  showLegend?: boolean;
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#818cf8", "#34d399"];

export function DoughnutChart({ labels, values, showLegend = false }: Props) {
  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: COLORS.slice(0, values.length),
        borderColor: "transparent",
        borderWidth: 0
      }
    ]
  };

  return (
    <Doughnut
      data={data}
      options={{
        plugins: {
          legend: {
            display: showLegend,
            position: "bottom",
            labels: { color: "#64748b", font: { size: 12 }, padding: 16 }
          }
        },
        cutout: "65%"
      }}
    />
  );
}
