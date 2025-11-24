import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { AlertService } from '../../../../core/services/alert.service';
import { UiModule } from '../../../../shared/ui/ui-module';
import { NgbPopoverModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { UsuariosForm } from '../../usuarios/usuarios-form/usuarios-form';

interface Lote {
  _id: string;
  quadra: string;
  lote: string;
  area: number;
  valor_area: number;
  valor_entrada: number;
  valor_total: number;
  situacao: string;
}

interface QuadraAgrupada {
  quadra: string;
  lotes: Lote[];
}

@Component({
  selector: 'app-reservas-nova-reserva',
  imports: [UiModule, NgbPopoverModule],
  templateUrl: './reservas-nova-reserva.html',
  styleUrl: './reservas-nova-reserva.scss',
})
export class ReservasNovaReserva {
  private endpointService = inject(EndpointService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  loading = signal(false);
  saving = signal(false);
  etapa = signal(1); // 1: Selecionar lotes, 2: Dados do cliente

  loteamentos = signal<any[]>([]);
  loteamentoSelecionado = signal<any | null>(null);
  quadrasAgrupadas = signal<QuadraAgrupada[]>([]);
  lotesSelecionados = signal<Set<string>>(new Set());

  buscaCliente = signal('');
  buscandoCliente = signal(false);
  clientesEncontrados = signal<any[]>([]);
  clienteSelecionado = signal<any | null>(null);
  sugerirCriacaoComCPF = signal<string | null>(null);
  buscaCliente$ = new Subject<string>();
  private modalService = inject(NgbModal);

  vendedores = signal<any[]>([]);
  vendedorSelecionado = signal<any | null>(null);

  ngOnInit() {
    this.loadLoteamentos();
    this.setupBuscaCliente();
  }

  async loadLoteamentos() {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getLoteamentos({ perpage: 100, page: 1 });
      if (response) {
        this.loteamentos.set(response.lista || []);
      }
    } catch (error) {
      console.error('Erro ao carregar loteamentos:', error);
      this.alertService.showDanger('Erro ao carregar loteamentos');
    } finally {
      this.loading.set(false);
    }
  }

  async loadVendedores() {
    try {
      const vendedores = await this.endpointService.getVendedores();
      if (vendedores?.lista) this.vendedores.set(vendedores.lista);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  }

  async abrirModalSelecionarVendedor(modalTemplate: any) {
    try {
      await this.loadVendedores();
      this.modalService.open(modalTemplate, { size: 'lg' });
    } catch (error) {
      console.error('Erro ao abrir modal:', error);
    }
  }

  selecionarVendedor(vendedor: any) {
    this.vendedorSelecionado.set(vendedor);
    this.modalService.dismissAll();
  }

  limparVendedorSelecionado() {
    this.vendedorSelecionado.set(null);
  }

  abrirModalMapaEmpreendimento(modalTemplate: any) {
    const loteamento = this.loteamentoSelecionado();
    if (loteamento?.mapa_empreendimento) {
      this.modalService.open(modalTemplate, { size: 'xl', centered: true });
    }
  }

  getMapaEmpreendimentoUrl(): string {
    return this.loteamentoSelecionado()?.mapa_empreendimento || '';
  }

  getSafeMapaUrl(): SafeResourceUrl {
    const url = this.getMapaEmpreendimentoUrl();
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  isMapaPDF(): boolean {
    const url = this.getMapaEmpreendimentoUrl();
    return url.toLowerCase().endsWith('.pdf');
  }

  hasMapaEmpreendimento(): boolean {
    return !!this.loteamentoSelecionado()?.mapa_empreendimento;
  }

  async onLoteamentoChange(loteamento: any) {
    if (!loteamento) return;

    try {
      this.loading.set(true);
      this.loteamentoSelecionado.set(loteamento);
      const lotes = await this.endpointService.getLotesPorLoteamento(loteamento._id);

      // Agrupar lotes por quadra
      const agrupadas = this.agruparPorQuadra(lotes);
      this.quadrasAgrupadas.set(agrupadas);
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
      this.alertService.showDanger('Erro ao carregar lotes');
    } finally {
      this.loading.set(false);
    }
  }

  agruparPorQuadra(lotes: Lote[]): QuadraAgrupada[] {
    const grupos: { [quadra: string]: Lote[] } = {};

    lotes.forEach((lote) => {
      if (!grupos[lote.quadra]) {
        grupos[lote.quadra] = [];
      }
      grupos[lote.quadra].push(lote);
    });

    return Object.entries(grupos)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([quadra, lotes]) => ({
        quadra,
        lotes: lotes.sort((a, b) => parseInt(a.lote) - parseInt(b.lote))
      }));
  }

  toggleLote(loteId: string) {
    const selecionados = new Set(this.lotesSelecionados());
    if (selecionados.has(loteId)) {
      selecionados.delete(loteId);
    } else {
      selecionados.add(loteId);
    }
    this.lotesSelecionados.set(selecionados);
  }

  isLoteSelecionado(loteId: string): boolean {
    return this.lotesSelecionados().has(loteId);
  }

  getLoteStatusClass(situacao: string): string {
    switch (situacao) {
      case 'DISPONIVEL': return 'btn-outline-success';
      case 'RESERVADO': return 'btn-outline-warning';
      case 'VENDIDO': return 'btn-outline-danger';
      default: return 'btn-outline-secondary';
    }
  }

  isLoteDisponivel(situacao: string): boolean {
    return situacao === 'DISPONIVEL';
  }

  get totalSelecionados(): number {
    return this.lotesSelecionados().size;
  }

  get valorTotalSelecionados(): number {
    let total = 0;
    const selecionados = this.lotesSelecionados();

    this.quadrasAgrupadas().forEach((quadra) => {
      quadra.lotes.forEach((lote) => {
        if (selecionados.has(lote._id)) {
          total += lote.valor_total;
        }
      });
    });

    return total;
  }

  get valorEntradaSelecionados(): number {
    let total = 0;
    const selecionados = this.lotesSelecionados();

    this.quadrasAgrupadas().forEach((quadra) => {
      quadra.lotes.forEach((lote) => {
        if (selecionados.has(lote._id)) {
          total += lote.valor_entrada || 0;
        }
      });
    });

    return total;
  }

  getLotesDetalhesSelecionados(): Lote[] {
    const selecionados = this.lotesSelecionados();
    const lotesDetalhes: Lote[] = [];

    this.quadrasAgrupadas().forEach((quadra) => {
      quadra.lotes.forEach((lote) => {
        if (selecionados.has(lote._id)) {
          lotesDetalhes.push(lote);
        }
      });
    });

    return lotesDetalhes.sort((a, b) => {
      if (a.quadra !== b.quadra) {
        return parseInt(a.quadra) - parseInt(b.quadra);
      }
      return parseInt(a.lote) - parseInt(b.lote);
    });
  }

  proximaEtapa() {
    if (this.lotesSelecionados().size === 0) {
      this.alertService.showWarning('Selecione pelo menos um lote');
      return;
    }
    this.etapa.set(2);
  }

  voltarEtapa() {
    this.etapa.set(1);
  }

  setupBuscaCliente() {
    this.buscaCliente$
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe((termo) => {
        if (termo && termo.length >= 3) {
          this.buscarClientes(termo);
        } else {
          this.clientesEncontrados.set([]);
        }
      });
  }

  onBuscaClienteChange(termo: string) {
    this.buscaCliente.set(termo);
    this.buscaCliente$.next(termo);

    if (!termo || termo.length < 3) {
      this.sugerirCriacaoComCPF.set(null);
    }
  }

  validarCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }

  async buscarClientes(termo: string) {
    try {
      this.buscandoCliente.set(true);
      this.sugerirCriacaoComCPF.set(null);

      const response = await this.endpointService.getUsuarios({
        q: termo,
        perpage: 10,
        page: 1
      });
      if (response && response.lista) {
        // Filtrar apenas clientes
        const clientes = response.lista.filter((u: any) =>
          u.niveis?.includes('CLIENTE')
        );
        this.clientesEncontrados.set(clientes);

        // Se não encontrou clientes e o termo é um CPF válido, sugerir criação
        if (clientes.length === 0 && this.validarCPF(termo)) {
          this.sugerirCriacaoComCPF.set(termo);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      this.buscandoCliente.set(false);
    }
  }

  selecionarCliente(cliente: any) {
    this.clienteSelecionado.set(cliente);
    this.clientesEncontrados.set([]);
    this.buscaCliente.set('');
  }

  limparClienteSelecionado() {
    this.clienteSelecionado.set(null);
  }

  async abrirModalNovoCliente() {
    try {
      const modalRef = this.modalService.open(UsuariosForm, {
        size: 'lg',
        backdrop: 'static'
      });

      // Configurar o componente para modo modal e apenas cliente
      modalRef.componentInstance.modalMode = true;
      modalRef.componentInstance.clienteOnly = true;

      const result = await modalRef.result;
      if (result) {
        this.selecionarCliente(result);
      }
    } catch (error) {
      // Modal fechado sem salvar
    }
  }

  async abrirModalNovoClienteComCPF(cpf: string) {
    try {
      const modalRef = this.modalService.open(UsuariosForm, {
        size: 'lg',
        backdrop: 'static'
      });

      // Configurar o componente para modo modal e apenas cliente
      modalRef.componentInstance.modalMode = true;
      modalRef.componentInstance.clienteOnly = true;

      // Pré-preencher CPF
      setTimeout(() => {
        modalRef.componentInstance.form.patchValue({
          documento: cpf
        });
      }, 100);

      const result = await modalRef.result;
      if (result) {
        this.selecionarCliente(result);
        this.buscaCliente.set('');
      }
    } catch (error) {
      // Modal fechado sem salvar
    }
  }

  async salvar() {
    if (!this.clienteSelecionado()) {
      this.alertService.showWarning('Selecione um cliente');
      return;
    }

    if (this.lotesSelecionados().size === 0) {
      this.alertService.showWarning('Selecione pelo menos um lote');
      return;
    }

    try {
      this.saving.set(true);
      const cliente = this.clienteSelecionado();
      const payload = {
        loteamento_id: this.loteamentoSelecionado()?._id,
        lotes_ids: Array.from(this.lotesSelecionados()),
        cliente_id: cliente._id,
        vendedor_id: this.vendedorSelecionado()?._id || undefined,
      };

      const response = await this.endpointService.criarReserva(payload);

      if (response) {
        this.alertService.showSuccess('Reserva criada com sucesso!');
        this.router.navigate(['/admin/reservas/visualizar'], {queryParams: { id: response._id }});
      }
    } catch (error: any) {
      console.error('Erro ao criar reserva:', error);
      this.alertService.showDanger(error?.message || 'Erro ao criar reserva');
    } finally {
      this.saving.set(false);
    }
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getSituacaoBadgeClass(situacao: string): string {
    switch (situacao) {
      case 'DISPONIVEL': return 'success';
      case 'RESERVADO': return 'warning';
      case 'VENDIDO': return 'danger';
      default: return 'secondary';
    }
  }

  cancelar() {
    this.router.navigate(['/admin/reservas/consultar']);
  }
}
