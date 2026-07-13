import { Chart as ChartJS } from 'chart.js'

export function applyChartTheme() {
  ChartJS.defaults.color = '#746b61'
  ChartJS.defaults.borderColor = 'rgba(51, 45, 39, 0.18)'
  ChartJS.defaults.font.family = "Inter, 'Segoe UI', system-ui, sans-serif"
  if (ChartJS.defaults.elements.bar) ChartJS.defaults.elements.bar.borderRadius = 2
  if (ChartJS.defaults.elements.line) ChartJS.defaults.elements.line.tension = 0.3
  if (ChartJS.defaults.plugins.tooltip) {
    ChartJS.defaults.plugins.tooltip.backgroundColor = '#1c1a18'
    ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(237, 225, 207, 0.28)'
    ChartJS.defaults.plugins.tooltip.borderWidth = 1
    ChartJS.defaults.plugins.tooltip.cornerRadius = 4
    ChartJS.defaults.plugins.tooltip.padding = 10
  }
  if (ChartJS.defaults.plugins.legend?.labels) ChartJS.defaults.plugins.legend.labels.usePointStyle = true
}
