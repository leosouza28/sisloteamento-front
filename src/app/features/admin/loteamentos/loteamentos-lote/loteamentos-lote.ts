import { Component, inject, signal, OnInit } from '@angular/core';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { AlertService } from '../../../../core/services/alert.service';
import { UiModule } from '../../../../shared/ui/ui-module';

interface Lote {
  _id: string;
  loteamento_quadra_lote: string;
  quadra: string;
  lote: string;
  area: number;
  valor_area: number;
  valor_total: number;
  valor_entrada: number;
  situacao: string;
  loteamento?: {
    _id: string;
    nome: string;
  };
  reserva?: {
    _id?: string;
    cliente?: {
      _id?: string;
      nome?: string;
    };
    vendedor?: {
      _id?: string;
      nome?: string;
    };
  };
  exibivel?: boolean;
}

interface QuadraAgrupada {
  quadra: string;
  lotes: Lote[];
  totalLotes: number;
  lotesDisponiveis: number;
  lotesReservados: number;
  lotesVendidos: number;
  lotesBloqueados: number;
}

@Component({
  selector: 'app-loteamentos-lote',
  imports: [UiModule],
  templateUrl: './loteamentos-lote.html',
  styleUrl: './loteamentos-lote.scss',
})
export class LoteamentosLote implements OnInit {
  private endpointService = inject(EndpointService);
  private alertService = inject(AlertService);

  loading = signal(false);
  loadingLotes = signal(false);

  loteamentos = signal<any[]>([]);
  loteamentoSelecionado = signal<any | null>(null);
  quadrasAgrupadas = signal<QuadraAgrupada[]>([]);

  ngOnInit() {
    this.carregarLoteamentos();
  }

  async carregarLoteamentos() {
    try {
      this.loading.set(true);
      const response: any = await this.endpointService.getLoteamentos({ perpage: 1000 });
      this.loteamentos.set(response.lista || []);
    } catch (error) {
      this.alertService.showDanger('Erro ao carregar loteamentos');
    } finally {
      this.loading.set(false);
    }
  }

  selecionarLoteamento(loteamento: any) {
    this.loteamentoSelecionado.set(loteamento);
    this.carregarLotes(loteamento._id);
  }

  async carregarLotes(loteamentoId: string) {
    try {
      this.loadingLotes.set(true);
      const response: any = await this.endpointService.getLotesPorLoteamento(loteamentoId);
      const lotes = response || [];
      this.agruparLotesPorQuadra(lotes);
    } catch (error) {
      this.alertService.showDanger('Erro ao carregar lotes');
    } finally {
      this.loadingLotes.set(false);
    }
  }

  agruparLotesPorQuadra(lotes: Lote[]) {
    const quadrasMap = new Map<string, Lote[]>();

    lotes.forEach(lote => {
      if (!quadrasMap.has(lote.quadra)) {
        quadrasMap.set(lote.quadra, []);
      }
      quadrasMap.get(lote.quadra)!.push(lote);
    });

    const quadrasAgrupadas: QuadraAgrupada[] = Array.from(quadrasMap.entries())
      .map(([quadra, lotesQuadra]) => {
        // Ordenar lotes por número
        lotesQuadra.sort((a, b) => {
          const numA = parseInt(a.lote) || 0;
          const numB = parseInt(b.lote) || 0;
          return numA - numB;
        });

        return {
          quadra,
          lotes: lotesQuadra,
          totalLotes: lotesQuadra.length,
          lotesDisponiveis: lotesQuadra.filter(l => l.situacao === 'DISPONIVEL').length,
          lotesReservados: lotesQuadra.filter(l => l.situacao === 'RESERVADO').length,
          lotesVendidos: lotesQuadra.filter(l => l.situacao === 'VENDIDO').length,
          lotesBloqueados: lotesQuadra.filter(l => l.situacao === 'BLOQUEADO').length,
        };
      })
      .sort((a, b) => a.quadra.localeCompare(b.quadra));

    this.quadrasAgrupadas.set(quadrasAgrupadas);
  }

  getSituacaoClass(situacao: string): string {
    switch (situacao) {
      case 'DISPONIVEL':
        return 'bg-primary';
      case 'RESERVADO':
        return 'bg-info';
      case 'VENDIDO':
        return 'bg-success';
      case 'BLOQUEADO':
        return 'bg-warning';
      default:
        return 'bg-light';
    }
  }

  getSituacaoTexto(situacao: string): string {
    switch (situacao) {
      case 'DISPONIVEL':
        return 'Disponível';
      case 'RESERVADO':
        return 'Reservado';
      case 'VENDIDO':
        return 'Vendido';
      case 'BLOQUEADO':
        return 'Bloqueado';
      default:
        return situacao;
    }
  }

  formatarValor(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  get resumoGeral() {
    const quadras = this.quadrasAgrupadas();
    return {
      total: quadras.reduce((sum, q) => sum + q.totalLotes, 0),
      disponiveis: quadras.reduce((sum, q) => sum + q.lotesDisponiveis, 0),
      reservados: quadras.reduce((sum, q) => sum + q.lotesReservados, 0),
      vendidos: quadras.reduce((sum, q) => sum + q.lotesVendidos, 0),
      bloqueados: quadras.reduce((sum, q) => sum + q.lotesBloqueados, 0),
    };
  }

  get valoresResumo() {
    const quadras = this.quadrasAgrupadas();
    let valorTotalDisponiveis = 0;
    let valorTotalReservados = 0;
    let valorTotalVendidos = 0;
    let valorEntradaDisponiveis = 0;
    let valorEntradaReservados = 0;
    let valorEntradaVendidos = 0;

    quadras.forEach(quadra => {
      quadra.lotes.forEach(lote => {
        if (lote.situacao === 'DISPONIVEL') {
          valorTotalDisponiveis += lote.valor_total || 0;
          valorEntradaDisponiveis += lote.valor_entrada || 0;
        } else if (lote.situacao === 'RESERVADO') {
          valorTotalReservados += lote.valor_total || 0;
          valorEntradaReservados += lote.valor_entrada || 0;
        } else if (lote.situacao === 'VENDIDO') {
          valorTotalVendidos += lote.valor_total || 0;
          valorEntradaVendidos += lote.valor_entrada || 0;
        }
      });
    });

    return {
      totalDisponiveis: valorTotalDisponiveis,
      totalReservados: valorTotalReservados,
      totalVendidos: valorTotalVendidos,
      entradaDisponiveis: valorEntradaDisponiveis,
      entradaReservados: valorEntradaReservados,
      entradaVendidos: valorEntradaVendidos,
      totalGeral: valorTotalDisponiveis + valorTotalReservados + valorTotalVendidos,
      entradaGeral: valorEntradaDisponiveis + valorEntradaReservados + valorEntradaVendidos,
    };
  }

  voltarParaSelecao() {
    this.loteamentoSelecionado.set(null);
    this.quadrasAgrupadas.set([]);
  }
}
