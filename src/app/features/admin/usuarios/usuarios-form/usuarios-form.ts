import { Component, inject, signal, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { AlertService } from '../../../../core/services/alert.service';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../shared/ui/ui-module';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-usuarios-form',
  imports: [UiModule],
  templateUrl: './usuarios-form.html',
  styleUrl: './usuarios-form.scss',
})
export class UsuariosForm implements OnInit {
  @Input() modalMode = false; // Se true, está sendo usado em modal
  @Input() clienteOnly = false; // Se true, apenas modo cliente (sem admin/vendedor)
  
  public activeModal = inject(NgbActiveModal, { optional: true });
  private endpointService = inject(EndpointService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  buscandoCep = signal(false);
  usuarioId = signal<string | null>(null);
  permissoesDisponiveis = signal<any[]>([]);
  permissoesAgrupadas = signal<any>({});

  form: FormGroup = this.fb.group({
    _id: [''],
    nome: ['', Validators.required],
    documento: ['', Validators.required],
    email: [''],
    senha: [''],
    data_nascimento: [''],
    sexo: [''],
    status: ['ATIVO', Validators.required],
    nivel_cliente: [false],
    nivel_admin: [false],
    nivel_vendedor: [false],
    nivel_supervisor: [false],
    telefones: this.fb.array([]),
    endereco: this.fb.group({
      cep: [''],
      logradouro: [''],
      numero: [''],
      complemento: [''],
      bairro: [''],
      cidade: [''],
      estado: [''],
    }),
    scopes: [[]],
  });

  get telefones(): FormArray {
    return this.form.get('telefones') as FormArray;
  }

  get isAdmin(): boolean {
    return this.form.get('nivel_admin')?.value || false;
  }

  ngOnInit() {
    if (this.clienteOnly) {
      // Modo apenas cliente: pre-selecionar nivel_cliente e desabilitar outros
      this.form.patchValue({
        nivel_cliente: true,
        nivel_admin: false,
        nivel_vendedor: false,
        nivel_supervisor: false,
      });
      // Cliente não precisa de senha
      this.form.get('senha')?.clearValidators();
      this.form.get('senha')?.updateValueAndValidity();
      
      // Adicionar pelo menos um telefone
      if (this.telefones.length === 0) {
        this.telefones.push(this.createTelefone());
      }
    } else if (!this.modalMode) {
      this.route.queryParams.subscribe((params) => {
        if (params['id']) {
          this.usuarioId.set(params['id']);
          this.loadUsuario(params['id']);
          this.form.get('documento')?.disable();
        } else {
          this.form.get('senha')?.setValidators([Validators.required]);
        }
      });
    }
    
    if (!this.clienteOnly) {
      this.loadPermissoes();
    }
    this.setupCepListener();
  }

  setupCepListener() {
    this.form.get('endereco.cep')?.valueChanges.subscribe((cep: string) => {
      if (cep) {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
          this.buscarCEP(cepLimpo);
        }
      }
    });
  }

  async buscarCEP(cep: string) {
    try {
      this.buscandoCep.set(true);
      const response = await this.endpointService.consultarCEP(cep);
      if (response) {
        this.form.get('endereco')?.patchValue({
          logradouro: response.logradouro || '',
          bairro: response.bairro || '',
          cidade: response.localidade || '',
          estado: response.uf || '',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      this.buscandoCep.set(false);
    }
  }

  async loadUsuario(id: string) {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getUsuario(id);

      if (response) {
        this.form.patchValue({
          _id: response._id,
          nome: response.nome || '',
          documento: response.documento || '',
          email: response.email || '',
          data_nascimento: response.data_nascimento ? response.data_nascimento.split('T')[0] : '',
          sexo: response.sexo || '',
          status: response.status || 'ATIVO',
          nivel_cliente: response.niveis?.includes('CLIENTE') || false,
          nivel_admin: response.niveis?.includes('ADMIN') || false,
          nivel_vendedor: response.niveis?.includes('VENDEDOR') || false,
          nivel_supervisor: response.niveis?.includes('SUPERVISOR_VENDAS') || false,
          scopes: response.scopes || [],
        });

        // Preencher endereço
        if (response.endereco) {
          this.form.get('endereco')?.patchValue(response.endereco);
        }

        // Preencher telefones
        this.telefones.clear();
        (response.telefones || []).forEach((tel: any) => {
          this.telefones.push(this.createTelefone(tel));
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      this.alertService.showDanger('Erro ao carregar usuário');
    } finally {
      this.loading.set(false);
    }
  }

  createTelefone(data?: any): FormGroup {
    return this.fb.group({
      tipo: [data?.tipo || 'CEL_WHATSAPP'],
      valor: [data?.valor || ''],
      principal: [data?.principal || false],
    });
  }

  async loadPermissoes() {
    try {
      const response = await this.endpointService.getPermissoes();
      if (response) {
        this.permissoesDisponiveis.set(response);
        this.agruparPermissoes(response);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    }
  }

  agruparPermissoes(permissoes: any[]) {
    const agrupadas: any = {};

    permissoes.forEach((perm: any) => {
      const [secao, ...resto] = perm.key.split('.');
      const nomePermissao = resto.join('.');

      if (!agrupadas[secao]) {
        agrupadas[secao] = {
          nome: this.formatarNomeSecao(secao),
          permissoes: []
        };
      }

      agrupadas[secao].permissoes.push({
        key: perm.key,
        nome: this.formatarNomePermissao(nomePermissao),
        description: perm.description
      });
    });

    this.permissoesAgrupadas.set(agrupadas);
  }

  formatarNomeSecao(secao: string): string {
    return secao
      .split('_')
      .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(' ');
  }

  formatarNomePermissao(permissao: string): string {
    return permissao
      .split('_')
      .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(' ');
  }

  getSecoes(): string[] {
    return Object.keys(this.permissoesAgrupadas());
  }

  adicionarTelefone() {
    const principal = this.telefones.length === 0;
    this.telefones.push(this.createTelefone({ principal }));
  }

  removerTelefone(index: number) {
    this.telefones.removeAt(index);
  }

  marcarTelefonePrincipal(index: number) {
    this.telefones.controls.forEach((control, i) => {
      control.get('principal')?.setValue(i === index);
    });
  }

  toggleScope(scopeKey: string) {
    const scopes = this.form.get('scopes')?.value || [];
    const index = scopes.indexOf(scopeKey);

    if (index > -1) {
      scopes.splice(index, 1);
    } else {
      scopes.push(scopeKey);
    }

    this.form.get('scopes')?.setValue([...scopes]);
  }

  hasScope(scopeKey: string): boolean {
    const scopes = this.form.get('scopes')?.value || [];
    return scopes.includes(scopeKey);
  }

  async salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      let camposObrigatorios: any[] = [];
      // Buscar no form os campos que faltam preencher
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control && control.invalid) {
          camposObrigatorios.push(key);
        }
      });

      console.log('Campos obrigatórios não preenchidos:', camposObrigatorios.join(', '));

      this.alertService.showWarning('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      this.saving.set(true);
      const formValue = this.form.getRawValue();

      const payload: any = {
        nome: formValue.nome,
        documento: formValue.documento,
        email: formValue.email,
        data_nascimento: formValue.data_nascimento,
        sexo: formValue.sexo,
        status: formValue.status,
        nivel_cliente: formValue.nivel_cliente,
        nivel_admin: formValue.nivel_admin,
        nivel_vendedor: formValue.nivel_vendedor,
        nivel_supervisor: formValue.nivel_supervisor,
        telefones: formValue.telefones,
        endereco: formValue.endereco,
        scopes: formValue.scopes,
      };

      if (formValue._id) {
        payload._id = formValue._id;
      }

      // Senha: obrigatória apenas para admin/vendedor em criação
      if (formValue.senha) {
        payload.senha = formValue.senha;
      }

      const response = await this.endpointService.saveUsuario(payload);

      if (response) {
        this.alertService.showSuccess(this.clienteOnly ? 'Cliente cadastrado com sucesso!' : 'Usuário salvo com sucesso!');
        
        if (this.modalMode && this.activeModal) {
          this.activeModal.close(response);
        } else {
          this.router.navigate(['/admin/usuarios/consultar'], { replaceUrl: true });
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      this.alertService.showDanger(error?.message || 'Erro ao salvar usuário');
    } finally {
      this.saving.set(false);
    }
  }

  voltar() {
    if (this.modalMode && this.activeModal) {
      this.activeModal.dismiss();
    } else {
      this.router.navigate(['/admin/usuarios/consultar'], { replaceUrl: true });
    }
  }
}
