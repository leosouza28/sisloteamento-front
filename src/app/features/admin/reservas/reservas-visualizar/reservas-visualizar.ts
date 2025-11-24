import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { AlertService } from '../../../../core/services/alert.service';
import { UiModule } from '../../../../shared/ui/ui-module';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

interface Reserva {
  _id?: string;
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
    data_nascimento?: Date;
    sexo?: string;
    telefone_principal?: {
      tipo?: string;
      valor?: string;
    };
    endereco?: {
      cep?: string;
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
    };
  };
  vendedor?: {
    _id?: string;
    nome?: string;
    documento?: string;
  };
  lotes?: Array<{
    _id?: string;
    loteamento_quadra_lote?: string;
    quadra?: string;
    lote?: string;
    area?: number;
    valor_area?: number;
    valor_total?: number;
    valor_entrada?: number;
    situacao?: string;
  }>;
  criado_por?: {
    data_hora?: Date;
    usuario?: {
      _id?: string;
      nome?: string;
      documento?: string;
    };
  };
  atualizado_por?: {
    data_hora?: Date;
    usuario?: {
      _id?: string;
      nome?: string;
      documento?: string;
    };
  };
  situacao?: string;
  createdAt?: Date;
  updatedAt?: Date;
  cancelada?: boolean;
}

@Component({
  selector: 'app-reservas-visualizar',
  imports: [UiModule],
  templateUrl: './reservas-visualizar.html',
  styleUrl: './reservas-visualizar.scss',
})
export class ReservasVisualizar {
  private endpointService = inject(EndpointService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(NgbModal);

  reserva = signal<Reserva | null>(null);
  loading = signal(false);
  vendedores = signal<any[]>([]);
  atualizandoVendedor = signal(false);
  atualizandoLote = signal<string | null>(null);
  cancelando = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.loadReserva(params['id']);
      }
    });
  }

  async loadReserva(id: string) {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getReserva(id);
      if (response) {
        this.reserva.set(response);
      }
    } catch (error) {
      console.error('Erro ao carregar reserva:', error);
      this.alertService.showDanger('Erro ao carregar reserva');
      this.voltar();
    } finally {
      this.loading.set(false);
    }
  }

  async abrirModalAlterarVendedor(modalTemplate: any) {
    try {
      await this.loadVendedores();
      this.modalService.open(modalTemplate, { size: 'lg' });
    } catch (error) {
      console.error('Erro ao abrir modal:', error);
    }
  }

  async loadVendedores() {
    try {
      const vendedores = await this.endpointService.getVendedores();
      if (vendedores?.lista) {
        this.vendedores.set(vendedores.lista);
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  }

  async alterarVendedor(vendedor: any) {
    try {
      this.atualizandoVendedor.set(true);
      const reserva = this.reserva();
      if (!reserva?._id) return;

      await this.endpointService.updateReserva({
        reserva_id: reserva._id,
        operacao: 'alterar-vendedor',
        novo_vendedor: vendedor._id
      });

      this.alertService.showSuccess('Vendedor alterado com sucesso!');
      this.modalService.dismissAll();
      await this.loadReserva(reserva._id);
    } catch (error: any) {
      console.error('Erro ao alterar vendedor:', error);
      this.alertService.showDanger(error?.message || 'Erro ao alterar vendedor');
    } finally {
      this.atualizandoVendedor.set(false);
    }
  }

  async abrirModalConfirmarAlteracaoLote(modalTemplate: any, lote: any, novaSituacao: string) {
    try {
      const result = await this.modalService.open(modalTemplate, { centered: true }).result;
      if (result === 'confirmar') {
        await this.alterarSituacaoLote(lote, novaSituacao);
      }
    } catch (error) {
      // Modal fechado sem confirmar
    }
  }

  async alterarSituacaoLote(lote: any, novaSituacao: string) {
    try {
      this.atualizandoLote.set(lote._id);
      const reserva = this.reserva();
      if (!reserva?._id) return;

      await this.endpointService.updateReserva({
        reserva_id: reserva._id,
        operacao: 'alterar-lote-situacao',
        lote_id: lote._id,
        nova_situacao: novaSituacao
      });

      this.alertService.showSuccess('Situação do lote alterada com sucesso!');
      await this.loadReserva(reserva._id);
    } catch (error: any) {
      console.error('Erro ao alterar situação do lote:', error);
      this.alertService.showDanger(error?.message || 'Erro ao alterar situação do lote');
    } finally {
      this.atualizandoLote.set(null);
    }
  }

  async abrirModalConfirmarCancelamento(modalTemplate: any) {
    try {
      const result = await this.modalService.open(modalTemplate, { centered: true }).result;
      if (result === 'confirmar') {
        await this.cancelarReserva();
      }
    } catch (error) {
      // Modal fechado sem confirmar
    }
  }

  async cancelarReserva() {
    try {
      this.cancelando.set(true);
      const reserva = this.reserva();
      if (!reserva?._id) return;

      await this.endpointService.updateReserva({
        reserva_id: reserva._id,
        operacao: 'cancelar-reserva'
      });

      this.alertService.showSuccess('Reserva cancelada com sucesso!');
      this.voltar();
    } catch (error: any) {
      console.error('Erro ao cancelar reserva:', error);
      this.alertService.showDanger(error?.message || 'Erro ao cancelar reserva');
    } finally {
      this.cancelando.set(false);
    }
  }

  getSituacaoBadgeClass(situacao?: string): string {
    switch (situacao) {
      case 'DISPONIVEL': return 'bg-success';
      case 'RESERVADO': return 'bg-warning';
      case 'VENDIDO': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getValorTotalLotes(): number {
    const lotes = this.reserva()?.lotes || [];
    return lotes.reduce((total, lote) => total + (lote.valor_total || 0), 0);
  }

  isReservaCancelada(): boolean {
    return this.reserva()?.situacao === 'CANCELADA';
  }

  voltar() {
    this.router.navigate(['/admin/reservas/consultar']);
  }
}
