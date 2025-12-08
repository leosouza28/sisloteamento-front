import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { UiModule } from '../../../../shared/ui/ui-module';
import dayjs from 'dayjs';

interface Reserva {
  _id?: string;
  data_reserva: string;
  codigo_reserva?: string;
  loteamento?: {
    _id?: string;
    nome?: string;
  };
  cliente?: {
    _id?: string;
    nome?: string;
    documento?: string;
    telefone_principal?: {
      tipo?: string;
      valor?: string;
    };
  };
  vendedor?: {
    _id?: string;
    nome?: string;
    documento?: string;
  };
  lotes?: Array<{
    loteamento_quadra_lote?: string;
    quadra?: string;
    lote?: string;
    area?: number;
    valor_area?: number;
    valor_total?: number;
  }>;
  situacao: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Vendedor {
  id: string;
  nome: string;
  documento: string;
}

@Component({
  selector: 'app-reservas-consultar',
  imports: [UiModule],
  templateUrl: './reservas-consultar.html',
  styleUrl: './reservas-consultar.scss',
})
export class ReservasConsultar implements OnInit {
  private endpointService = inject(EndpointService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  reservas = signal<Reserva[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  perPage = signal(24);
  totalItems = signal(0);
  searchTerm = signal('');

  // Novos filtros
  dataInicial = signal(dayjs().startOf('month').format('YYYY-MM-DD'));
  dataFinal = signal(dayjs().endOf('month').format('YYYY-MM-DD'));
  situacao = signal('');
  vendedorId = signal('');
  loteamentoId = signal('');

  vendedores = signal<Vendedor[]>([]);
  loteamentos = signal<any[]>([]);
  showFilters = signal(true);
  exportando = signal(false);

  situacoes = [
    { value: '', label: 'Todas' },
    { value: 'ATIVA_CONCLUIDA', label: 'Validas (Ativa e Concluída)' },
    { value: 'ATIVA', label: 'Ativa' },
    { value: 'CONCLUIDA', label: 'Concluída' },
    { value: 'CANCELADA', label: 'Cancelada' }
  ];

  perPageOptions = [
    { value: 24, label: '24 por página' },
    { value: 240, label: '240 por página' },
    { value: 2400, label: '2400 por página' }
  ];

  ngOnInit() {
    this.loadQueryParams();
    this.loadVendedores();
    this.loadReservas();
    this.loadLoateamentos();
  }

  async loadLoateamentos() {
    try {
      let loteamentos: any = await this.endpointService.getLoteamentosDisponiveis();
      this.loteamentos.set(loteamentos.lista.map((loteamento: any) => ({
        id: loteamento._id,
        nome: loteamento.nome,
      })));
    } catch (error) {
      console.log(error);
    }
  }


  loadQueryParams() {
    this.route.queryParams.subscribe(params => {
      this.searchTerm.set(params['q'] || "");
      this.situacao.set(params['situacao'] || "");
      this.vendedorId.set(params['vendedorId'] || '');
      this.loteamentoId.set(params['loteamentoId'] || '');

      if (params['page']) this.currentPage.set(+params['page']);
      if (params['perPage']) this.perPage.set(+params['perPage']);
      if (params['dataInicial']) this.dataInicial.set(params['dataInicial']);
      if (params['dataFinal']) this.dataFinal.set(params['dataFinal']);
    });
  }

  updateQueryParams() {
    const queryParams: any = {
      page: this.currentPage(),
      perPage: this.perPage(),
    };

    queryParams.q = this.searchTerm() || "";
    queryParams.situacao = this.situacao() || "";
    queryParams.vendedorId = this.vendedorId() || "";
    queryParams.loteamentoId = this.loteamentoId() || "";

    if (this.dataInicial()) queryParams.dataInicial = this.dataInicial();
    if (this.dataFinal()) queryParams.dataFinal = this.dataFinal();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  async loadVendedores() {
    try {
      const response = await this.endpointService.getVendedores();
      this.vendedores.set((response.lista || []).map((vendedor: any) => ({
        id: vendedor._id,
        nome: vendedor.nome,
        documento: vendedor.documento,
      })));
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  }

  async loadReservas() {
    try {
      this.loading.set(true);

      const params: any = {
        page: this.currentPage(),
        perpage: this.perPage(),
      };

      if (this.searchTerm()) params.q = this.searchTerm();
      if (this.dataInicial()) params.dataInicial = this.dataInicial();
      if (this.dataFinal()) params.dataFinal = this.dataFinal();
      if (this.situacao()) params.situacao = this.situacao();
      if (this.vendedorId()) params.vendedorId = this.vendedorId();
      if (this.loteamentoId()) params.loteamentoId = this.loteamentoId();

      const response = await this.endpointService.getReservas(params);

      if (response) {
        this.reservas.set(response.lista || []);
        this.totalItems.set(response.total || 0);
      }

      this.updateQueryParams();
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadReservas();
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadReservas();
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  limparFiltros() {
    this.searchTerm.set('');
    this.dataInicial.set(dayjs().startOf('month').format('YYYY-MM-DD'));
    this.dataFinal.set(dayjs().endOf('month').format('YYYY-MM-DD'));
    this.situacao.set('');
    this.vendedorId.set('');
    this.currentPage.set(1);
    this.loadReservas();
  }

  onPerPageChange(value: number) {
    this.perPage.set(value);
    this.currentPage.set(1);
    this.loadReservas();
  }

  async exportarCSV() {
    try {
      this.exportando.set(true);

      const params: any = { export: 'csv' };
      if (this.searchTerm()) params.q = this.searchTerm();
      if (this.dataInicial()) params.dataInicial = this.dataInicial();
      if (this.dataFinal()) params.dataFinal = this.dataFinal();
      if (this.situacao()) params.situacao = this.situacao();
      if (this.vendedorId()) params.vendedorId = this.vendedorId();

      const response = await this.endpointService.getReservas(params);

      if (response && response.lista) {
        this.gerarCSV(response.lista);
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar dados');
    } finally {
      this.exportando.set(false);
    }
  }

  gerarCSV(reservas: Reserva[]) {
    const headers = ['Data Reserva', 'Loteamento', 'Quadra', 'Lote', 'Nome Cliente', 'Doc Cliente', 'Telefone Cliente', 'Situação'];

    const rows = reservas.flatMap(reserva => {
      if (reserva.lotes && reserva.lotes.length > 0) {
        return reserva.lotes.map(lote => [
          this.formatarData(reserva.data_reserva),
          reserva.loteamento?.nome || '',
          lote.quadra || '',
          lote.lote || '',
          reserva.cliente?.nome || '',
          reserva.cliente?.documento || '',
          reserva.cliente?.telefone_principal?.valor || '',
          reserva.situacao || ''
        ]);
      } else {
        return [[
          this.formatarData(reserva.data_reserva),
          reserva.loteamento?.nome || '',
          '',
          '',
          reserva.cliente?.nome || '',
          reserva.cliente?.documento || '',
          reserva.cliente?.telefone_principal?.valor || '',
          reserva.situacao || ''
        ]];
      }
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reservas_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatarData(data: string): string {
    if (!data) return '';
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadReservas();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems() / this.perPage());
  }

  get pages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage();
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: number[] = [];

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    let prev: number | undefined;
    for (const i of range) {
      if (prev && i - prev > 1) {
        rangeWithDots.push(-1);
      }
      rangeWithDots.push(i);
      prev = i;
    }

    return rangeWithDots;
  }

  novaReserva() {
    this.router.navigate(['/admin/reservas/operar']);
  }

  verReserva(id?: string) {
    if (id) {
      this.router.navigate(['/admin/reservas/visualizar'], { queryParams: { id } });
    }
  }
}
