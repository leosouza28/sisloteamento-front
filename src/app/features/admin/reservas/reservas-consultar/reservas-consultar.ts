import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { UiModule } from '../../../../shared/ui/ui-module';

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
    email?: string;
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

@Component({
  selector: 'app-reservas-consultar',
  imports: [UiModule],
  templateUrl: './reservas-consultar.html',
  styleUrl: './reservas-consultar.scss',
})
export class ReservasConsultar {
  private endpointService = inject(EndpointService);
  private router = inject(Router);

  reservas = signal<Reserva[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  perPage = signal(12);
  totalItems = signal(0);
  searchTerm = signal('');

  ngOnInit() {
    this.loadReservas();
  }

  async loadReservas() {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getReservas({
        page: this.currentPage(),
        perpage: this.perPage(),
        q: this.searchTerm(),
      });

      if (response) {
        this.reservas.set(response.lista || []);
        this.totalItems.set(response.total || 0);
      }
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
