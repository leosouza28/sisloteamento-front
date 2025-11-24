import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { UiModule } from '../../../../shared/ui/ui-module';

interface Usuario {
  _id?: string;
  documento?: string;
  nome?: string;
  email?: string;
  status?: string;
  niveis?: string[];
  createdAt?: Date;
}

@Component({
  selector: 'app-usuarios-consultar',
  imports: [UiModule],
  templateUrl: './usuarios-consultar.html',
  styleUrl: './usuarios-consultar.scss',
})
export class UsuariosConsultar {
  private endpointService = inject(EndpointService);
  private router = inject(Router);

  usuarios = signal<Usuario[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  perPage = signal(10);
  totalItems = signal(0);
  searchTerm = signal('');

  ngOnInit() {
    this.loadUsuarios();
  }

  async loadUsuarios() {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getUsuarios({
        page: this.currentPage(),
        perpage: this.perPage(),
        q: this.searchTerm(),
      });

      if (response) {
        this.usuarios.set(response.lista || []);
        this.totalItems.set(response.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadUsuarios();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadUsuarios();
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

  getStatusClass(status?: string): string {
    switch (status) {
      case 'ativo': return 'badge bg-success';
      case 'inativo': return 'badge bg-secondary';
      case 'bloqueado': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  novoUsuario() {
    this.router.navigate(['/admin/usuarios/form']);
  }

  editarUsuario(id?: string) {
    if (id) {
      this.router.navigate(['/admin/usuarios/form'], { queryParams: { id } });
    }
  }
}
