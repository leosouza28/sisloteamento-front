import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EndpointService } from '../../../core/services/endpoint.service';
import { MoneyBrlPipe } from '../../../shared/pipes/money-brl.pipe';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { DateSimplePipe } from '../../../shared/pipes/date-simple.pipe';
import { DateFromNowPipe } from '../../../shared/pipes/date-from-now-pipe';

@Component({
  selector: 'app-bi-dashboard-2',
  standalone: true,
  imports: [CommonModule, MoneyBrlPipe, BaseChartDirective, DateSimplePipe, DateFromNowPipe],
  templateUrl: './bi-dashboard-2.html',
  styleUrl: './bi-dashboard-2.scss',
})
export class BiDashboard2 implements OnInit {
  private route = inject(ActivatedRoute);
  private endpointService = inject(EndpointService);

  loading = true;
  dashboardData: any = {};
  idLoteamento: string = '';

  // Controle de visualização
  visualizacao: 'cards' | 'lista' = 'cards';
  listaAtual: {
    titulo: string;
    dados: any[];
    tipo: string;
  } | null = null;

  // Gráfico de Proporção de Lotes
  public lotesChartData: ChartConfiguration['data'] = {
    labels: ['Disponíveis', 'Vendidos', 'Reservados', 'Bloqueados'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545'],
      borderColor: ['#1e7e34', '#0056b3', '#d39e00', '#bd2130'],
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
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  public lotesChartType: ChartType = 'pie';

  // Gráfico de Valores dos Lotes
  public valoresChartData: ChartConfiguration['data'] = {
    labels: ['Disponíveis', 'Vendidos', 'Reservados', 'Bloqueados'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545'],
      borderColor: ['#1e7e34', '#0056b3', '#d39e00', '#bd2130'],
      borderWidth: 2
    }]
  };

  public valoresChartOptions: ChartConfiguration['options'] = {
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
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
            return `${label}: ${formatter.format(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  public valoresChartType: ChartType = 'pie';

  ngOnInit() {
    this.route.params.subscribe(params => {
      console.log(params);
      this.idLoteamento = params['id'];
      if (this.idLoteamento) {
        this.loadDashboard();
      }
    });
  }

  async loadDashboard() {
    try {
      this.loading = true;
      const response = await this.endpointService.get(`/v1/admin/dashboard/client/loteamento/${this.idLoteamento}`);
      console.log(response);
      this.dashboardData = response;
      this.updateChart();
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  updateChart() {
    this.lotesChartData.datasets[0].data = [
      this.dashboardData.total_lotes_disponiveis || 0,
      this.dashboardData.total_lotes_vendidos || 0,
      this.dashboardData.total_lotes_reservados || 0,
      this.dashboardData.total_lotes_bloqueados || 0
    ];

    // Calcula os valores totais somando os lotes de cada lista
    const valorDisponiveis = (this.dashboardData.lista_ultimos_lotes_disponiveis || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);
    const valorVendidos = (this.dashboardData.lista_ultimos_lotes_vendidos || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);
    const valorReservados = (this.dashboardData.lista_ultimos_lotes_reservados || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);
    const valorBloqueados = (this.dashboardData.lista_ultimos_lotes_bloqueados || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);

    this.valoresChartData.datasets[0].data = [
      valorDisponiveis,
      valorVendidos,
      valorReservados,
      valorBloqueados
    ];
  }

  mostrarLista(tipo: string) {
    switch (tipo) {
      case 'disponiveis':
        this.listaAtual = {
          titulo: 'Lotes Disponíveis',
          dados: this.dashboardData.lista_ultimos_lotes_disponiveis || [],
          tipo: 'disponiveis'
        };
        break;
      case 'vendidos':
        this.listaAtual = {
          titulo: 'Lotes Vendidos',
          dados: this.dashboardData.lista_ultimos_lotes_vendidos || [],
          tipo: 'vendidos'
        };
        break;
      case 'reservados':
        this.listaAtual = {
          titulo: 'Lotes Reservados',
          dados: this.dashboardData.lista_ultimos_lotes_reservados || [],
          tipo: 'reservados'
        };
        break;
      case 'bloqueados':
        this.listaAtual = {
          titulo: 'Lotes Bloqueados',
          dados: this.dashboardData.lista_ultimos_lotes_bloqueados || [],
          tipo: 'bloqueados'
        };
        break;
    }
    this.visualizacao = 'lista';
  }

  voltarParaCards() {
    this.visualizacao = 'cards';
    this.listaAtual = null;
  }

  getStatusClass(tipo: string): string {
    const classes: { [key: string]: string } = {
      'disponiveis': 'bg-success',
      'vendidos': 'bg-primary',
      'reservados': 'bg-warning',
      'bloqueados': 'bg-danger'
    };
    return classes[tipo] || 'bg-secondary';
  }

  getStatusIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'disponiveis': 'bi-check-circle',
      'vendidos': 'bi-cash-coin',
      'reservados': 'bi-lock',
      'bloqueados': 'bi-x-circle'
    };
    return icons[tipo] || 'bi-circle';
  }

  getTotalEntrada(): number {
    if (!this.listaAtual?.dados) return 0;
    return this.listaAtual.dados.reduce((sum, lote) => sum + (lote.valor_entrada || 0), 0);
  }

  getTotalValor(): number {
    if (!this.listaAtual?.dados) return 0;
    return this.listaAtual.dados.reduce((sum, lote) => sum + (lote.valor_total || 0), 0);
  }

  getValorDisponiveis(): number {
    return (this.dashboardData.lista_ultimos_lotes_disponiveis || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);
  }

  getValorVendidos(): number {
    return (this.dashboardData.lista_ultimos_lotes_vendidos || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);
  }

  getValorReservados(): number {
    return (this.dashboardData.lista_ultimos_lotes_reservados || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);
  }

  getValorBloqueados(): number {
    return (this.dashboardData.lista_ultimos_lotes_bloqueados || [])
      .reduce((sum: number, lote: any) => sum + (lote.valor_total || 0), 0);
  }
}
