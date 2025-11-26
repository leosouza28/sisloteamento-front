import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { EndpointService } from '../../../core/services/endpoint.service';
import { DateSimplePipe } from '../../../shared/pipes/date-simple.pipe';
import { DateFromNowPipe } from '../../../shared/pipes/date-from-now-pipe';

@Component({
  selector: 'app-bi-dashboard-1',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, DateSimplePipe, DateFromNowPipe],
  templateUrl: './bi-dashboard-1.html',
  styleUrl: './bi-dashboard-1.scss',
})
export class BiDashboard1 implements OnInit, OnDestroy {
  loading = true;
  dashboardData: any = {};
  lastUpdate: Date | null = null;
  private refreshInterval: any;
  
  // Gráfico de Lotes
  public lotesChartData: ChartConfiguration['data'] = {
    labels: ['Disponíveis', 'Vendidos', 'Reservados', 'Bloqueados'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#dc3545'],
      borderColor: ['#059669', '#2563eb', '#d97706', '#b02a37'],
      borderWidth: 2
    }]
  };

  public lotesChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 12 },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  public lotesChartType: ChartType = 'doughnut';

  // Gráfico de Reservas
  public reservasChartData: ChartConfiguration['data'] = {
    labels: ['Ativas', 'Concluídas'],
    datasets: [{
      label: 'Reservas',
      data: [0, 0],
      backgroundColor: ['#8b5cf6', '#06b6d4'],
      borderColor: ['#7c3aed', '#0891b2'],
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  public reservasChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.label}: ${context.parsed.y} reservas`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  public reservasChartType: ChartType = 'bar';

  constructor(private endpointService: EndpointService) {}

  ngOnInit() {
    this.loadDashboard();
    // Auto-refresh a cada 10 segundos
    this.refreshInterval = setInterval(() => {
      this.loadDashboard();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadDashboard() {
    try {
      this.loading = true;
      const response = await this.endpointService.getDashboardClient();
      this.dashboardData = response;
      this.updateCharts();
      this.lastUpdate = new Date();
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  updateCharts() {
    // Atualizar gráfico de lotes
    this.lotesChartData.datasets[0].data = [
      this.dashboardData.total_lotes_disponiveis || 0,
      this.dashboardData.total_lotes_vendidos || 0,
      this.dashboardData.total_lotes_reservados || 0,
      this.dashboardData.total_lotes_bloqueados || 0
    ];

    // Atualizar gráfico de reservas
    this.reservasChartData.datasets[0].data = [
      this.dashboardData.total_reservas_ativas || 0,
      this.dashboardData.total_reservas_concluidas || 0
    ];
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'ATIVA': 'status-active',
      'CONCLUIDA': 'status-completed',
      'CANCELADA': 'status-cancelled'
    };
    return statusClasses[status] || 'status-default';
  }

  formatCurrency(value: number): string {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  getLoteDisplay(reserva: any): string {
    if (!reserva?.lotes || reserva.lotes.length === 0) return '-';
    const lote = reserva.lotes[0];
    return lote.loteamento_quadra_lote || `Q${lote.quadra} L${lote.lote}` || '-';
  }

  getValorTotal(reserva: any): number {
    if (!reserva?.lotes || reserva.lotes.length === 0) return 0;
    return reserva.lotes.reduce((total: number, lote: any) => total + (lote.valor_total || 0), 0);
  }

  getLastUpdateTime(): string {
    if (!this.lastUpdate) return '-';
    return this.lastUpdate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
