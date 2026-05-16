document.addEventListener('DOMContentLoaded', () => {
  const data = window.dashboardCharts || {};

  const colors = {
    blue: '#2563eb',
    green: '#16a34a',
    red: '#dc2626',
    yellow: '#f59e0b',
    purple: '#7c3aed',
    cyan: '#0891b2',
    gray: '#64748b'
  };

  function hasCanvas(id) {
    return document.getElementById(id);
  }

  function showChartError(id, message) {
    const canvas = hasCanvas(id);

    if (!canvas) return;

    const box = canvas.parentElement;
    box.innerHTML = `
      <div class="chart-empty">
        <strong>${message}</strong>
        <span>Verifique se existem dados cadastrados ou atualize a página com CTRL + F5.</span>
      </div>
    `;
  }

  if (!window.Chart) {
    [
      'financeEvolutionChart',
      'salesEvolutionChart',
      'devicesEvolutionChart',
      'repairsEvolutionChart',
      'deviceStatusChart',
      'repairStatusChart',
      'saleStatusChart'
    ].forEach((id) => showChartError(id, 'Biblioteca de gráficos não carregou.'));
    return;
  }

  const labels = data.labels || [];

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  Chart.defaults.font.family = 'Arial, Helvetica, sans-serif';
  Chart.defaults.color = '#475467';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;

  function hasData(values) {
    return Array.isArray(values) && values.some((value) => Number(value) > 0);
  }

  function lineChart(id, datasets, money = false) {
    const canvas = hasCanvas(id);

    if (!canvas) return;

    if (!datasets.some((item) => hasData(item.data))) {
      showChartError(id, 'Sem dados para este gráfico.');
      return;
    }

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y || 0;
                return money ? `${label}: ${currencyFormatter.format(value)}` : `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#eef2f6'
            },
            ticks: {
              callback(value) {
                return money ? currencyFormatter.format(value) : value;
              }
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  function barChart(id, datasets, moneyDatasetLabel = '') {
    const canvas = hasCanvas(id);

    if (!canvas) return;

    if (!datasets.some((item) => hasData(item.data))) {
      showChartError(id, 'Sem dados para este gráfico.');
      return;
    }

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y || 0;

                if (moneyDatasetLabel && label === moneyDatasetLabel) {
                  return `${label}: ${currencyFormatter.format(value)}`;
                }

                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#eef2f6'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  function doughnutChart(id, statusData) {
    const canvas = hasCanvas(id);

    if (!canvas) return;

    const chartLabels = statusData?.labels || [];
    const chartValues = statusData?.values || [];

    if (!hasData(chartValues)) {
      showChartError(id, 'Sem dados para este gráfico.');
      return;
    }

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartValues,
            backgroundColor: [
              colors.blue,
              colors.green,
              colors.yellow,
              colors.red,
              colors.purple,
              colors.cyan,
              colors.gray
            ],
            borderColor: '#ffffff',
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  lineChart(
    'financeEvolutionChart',
    [
      {
        label: 'Receitas',
        data: data.financeEvolution?.income || [],
        borderColor: colors.green,
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        pointBackgroundColor: colors.green,
        tension: 0.35,
        borderWidth: 3,
        fill: true
      },
      {
        label: 'Despesas',
        data: data.financeEvolution?.expense || [],
        borderColor: colors.red,
        backgroundColor: 'rgba(220, 38, 38, 0.10)',
        pointBackgroundColor: colors.red,
        tension: 0.35,
        borderWidth: 3,
        fill: true
      }
    ],
    true
  );

  barChart(
    'salesEvolutionChart',
    [
      {
        label: 'Quantidade',
        data: data.salesEvolution?.quantity || [],
        backgroundColor: 'rgba(37, 99, 235, 0.75)',
        borderColor: colors.blue,
        borderWidth: 1
      },
      {
        label: 'Valor vendido',
        data: data.salesEvolution?.value || [],
        backgroundColor: 'rgba(22, 163, 74, 0.75)',
        borderColor: colors.green,
        borderWidth: 1
      }
    ],
    'Valor vendido'
  );

  lineChart(
    'devicesEvolutionChart',
    [
      {
        label: 'Dispositivos recebidos',
        data: data.devicesEvolution?.devices || [],
        borderColor: colors.blue,
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        pointBackgroundColor: colors.blue,
        tension: 0.35,
        borderWidth: 3,
        fill: true
      }
    ]
  );

  barChart(
    'repairsEvolutionChart',
    [
      {
        label: 'Abertos',
        data: data.repairsEvolution?.opened || [],
        backgroundColor: 'rgba(245, 158, 11, 0.75)',
        borderColor: colors.yellow,
        borderWidth: 1
      },
      {
        label: 'Finalizados',
        data: data.repairsEvolution?.finished || [],
        backgroundColor: 'rgba(22, 163, 74, 0.75)',
        borderColor: colors.green,
        borderWidth: 1
      }
    ]
  );

  doughnutChart('deviceStatusChart', data.deviceStatus);
  doughnutChart('repairStatusChart', data.repairStatus);
  doughnutChart('saleStatusChart', data.saleStatus);
});
