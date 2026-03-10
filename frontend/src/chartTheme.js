import { Chart as ChartJS } from 'chart.js'

export function applyChartTheme() {
  ChartJS.defaults.color = 'rgba(230, 238, 246, 0.45)'
  ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.06)'
  ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif"
  ChartJS.defaults.elements.bar.borderRadius = 4
  ChartJS.defaults.elements.line.tension = 0.3
  ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)'
  ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.08)'
  ChartJS.defaults.plugins.tooltip.borderWidth = 1
  ChartJS.defaults.plugins.tooltip.cornerRadius = 8
  ChartJS.defaults.plugins.tooltip.padding = 10
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true
}
