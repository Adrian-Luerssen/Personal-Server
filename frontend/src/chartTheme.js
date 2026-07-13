import { Chart as ChartJS } from 'chart.js'

export const CHART_PALETTE = Object.freeze({
  grid: 'rgba(154, 168, 186, 0.14)',
  text: '#9aa8ba',
  tooltip: '#172234',
  today: '#3b82f6',
  cash: '#22c55e',
  habits: '#14b8a6',
  gym: '#f97316',
  music: '#ec4899',
  series: '#f59e0b',
  assistant: '#8b5cf6',
})

export function applyChartTheme() {
  ChartJS.defaults.color = CHART_PALETTE.text
  ChartJS.defaults.borderColor = CHART_PALETTE.grid
  ChartJS.defaults.font.family = 'Sora Variable, Segoe UI Variable, sans-serif'
  if (ChartJS.defaults.elements.bar) ChartJS.defaults.elements.bar.borderRadius = 4
  if (ChartJS.defaults.elements.line) ChartJS.defaults.elements.line.tension = 0.32
  if (ChartJS.defaults.plugins.tooltip) {
    ChartJS.defaults.plugins.tooltip.backgroundColor = CHART_PALETTE.tooltip
    ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(154, 168, 186, 0.22)'
    ChartJS.defaults.plugins.tooltip.borderWidth = 1
    ChartJS.defaults.plugins.tooltip.cornerRadius = 8
    ChartJS.defaults.plugins.tooltip.padding = 12
    ChartJS.defaults.plugins.tooltip.titleFont = { family: 'Sora Variable', weight: '600' }
    ChartJS.defaults.plugins.tooltip.bodyFont = { family: 'JetBrains Mono Variable' }
  }
  if (ChartJS.defaults.plugins.legend?.labels) ChartJS.defaults.plugins.legend.labels.usePointStyle = true
}
