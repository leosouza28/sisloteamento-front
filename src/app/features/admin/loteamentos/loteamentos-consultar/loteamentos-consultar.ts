import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { UiModule } from '../../../../shared/ui/ui-module';

interface Loteamento {
  _id: string;
  slug: string;
  nome: string;
  descricao: string;
  cidade: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-loteamentos-consultar',
  imports: [UiModule],
  templateUrl: './loteamentos-consultar.html',
  styleUrl: './loteamentos-consultar.scss',
})
export class LoteamentosConsultar {
  private endpointService = inject(EndpointService);
  private router = inject(Router);

  loteamentos = signal<Loteamento[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  perPage = signal(10);
  totalItems = signal(0);
  searchTerm = signal('');

  ngOnInit() {
    this.loadLoteamentos();
  }

  async loadLoteamentos() {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getLoteamentos({
        page: this.currentPage(),
        perpage: this.perPage(),
        q: this.searchTerm(),
      });

      if (response) {
        this.loteamentos.set(response.lista || []);
        this.totalItems.set(response.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar loteamentos:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadLoteamentos();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadLoteamentos();
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

  novoLoteamento() {
    this.router.navigate(['/admin/loteamentos/form']);
  }

  editarLoteamento(id: string) {
    this.router.navigate(['/admin/loteamentos/form'], { queryParams: { id } });
  }

  gerenciarLotes(id: string) {
    this.router.navigate(['/admin/loteamentos/lotes-importar'], { queryParams: { loteamento_id: id } });
  }
}
