import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { AlertService } from '../../../../core/services/alert.service';
import { UiModule } from '../../../../shared/ui/ui-module';

@Component({
  selector: 'app-loteamentos-form',
  imports: [UiModule],
  templateUrl: './loteamentos-form.html',
  styleUrl: './loteamentos-form.scss',
})
export class LoteamentosForm {
  private endpointService = inject(EndpointService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  loteamentoId = signal<string | null>(null);
  uploading = signal(false);
  mapaAtual = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    _id: [''],
    nome: ['', Validators.required],
    slug: [''],
    descricao: [''],
    cidade: ['', Validators.required],
    estado: ['', Validators.required],
    mapa_empreendimento: [''],
  });

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.loteamentoId.set(params['id']);
        this.loadLoteamento(params['id']);
      }
    });

    this.form.get('nome')?.valueChanges.subscribe((nome: string) => {
      if (nome && !this.loteamentoId()) {
        const slug = this.gerarSlug(nome);
        this.form.get('slug')?.setValue(slug, { emitEvent: false });
      }
    });
  }

  gerarSlug(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async loadLoteamento(id: string) {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getLoteamento(id);

      if (response) {
        this.form.patchValue({
          _id: response._id,
          nome: response.nome || '',
          slug: response.slug || '',
          descricao: response.descricao || '',
          cidade: response.cidade || '',
          estado: response.estado || '',
          mapa_empreendimento: response.mapa_empreendimento || '',
        });
        
        if (response.mapa_empreendimento) {
          this.mapaAtual.set(response.mapa_empreendimento);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar loteamento:', error);
      this.alertService.showDanger('Erro ao carregar loteamento');
    } finally {
      this.loading.set(false);
    }
  }

  async salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.showWarning('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      this.saving.set(true);
      const formValue = this.form.value;

      const payload: any = {
        nome: formValue.nome,
        slug: formValue.slug || this.gerarSlug(formValue.nome),
        descricao: formValue.descricao,
        cidade: formValue.cidade,
        estado: formValue.estado,
        mapa_empreendimento: formValue.mapa_empreendimento,
      };

      if (formValue._id) {
        payload._id = formValue._id;
      }

      const response = await this.endpointService.saveLoteamento(payload);

      if (response) {
        this.alertService.showSuccess('Loteamento salvo com sucesso!');
        this.router.navigate(['/admin/loteamentos/consultar']);
      }
    } catch (error: any) {
      console.error('Erro ao salvar loteamento:', error);
      this.alertService.showDanger(error?.message || 'Erro ao salvar loteamento');
    } finally {
      this.saving.set(false);
    }
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.alertService.showWarning('Apenas arquivos PDF ou imagens (JPG, PNG) são permitidos');
      return;
    }

    // Validar tamanho (máximo 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      this.alertService.showWarning('O arquivo deve ter no máximo 100MB');
      return;
    }

    try {
      this.uploading.set(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.endpointService.uploadFile(formData);

      if (response?.url) {
        this.form.patchValue({ mapa_empreendimento: response.url });
        this.mapaAtual.set(response.url);
        this.alertService.showSuccess('Arquivo enviado com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      this.alertService.showDanger(error?.message || 'Erro ao fazer upload do arquivo');
    } finally {
      this.uploading.set(false);
    }
  }

  removerMapa() {
    this.form.patchValue({ mapa_empreendimento: '' });
    this.mapaAtual.set(null);
  }

  getMapaFileName(): string {
    const url = this.mapaAtual();
    if (!url) return '';
    return url.split('/').pop() || 'arquivo';
  }

  isImagemMapa(): boolean {
    const url = this.mapaAtual();
    if (!url) return false;
    const ext = url.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif'].includes(ext || '');
  }

  voltar() {
    this.router.navigate(['/admin/loteamentos/consultar']);
  }
}
