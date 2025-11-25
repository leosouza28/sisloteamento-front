import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { AlertService } from '../../../../core/services/alert.service';
import { UiModule } from '../../../../shared/ui/ui-module';

interface LoteCSV {
  QD: string;
  LT: string;
  MQ: string;
  VALOR_MQ: string;
  VALOR_BASE: string;
  ENTRADA: string;
  SITUACAO?: string;
}

interface Lote {
  quadra: string;
  lote: string;
  area: number;
  valor_area: number;
  valor_total: number;
  entrada: number;
  situacao: string;
}

@Component({
  selector: 'app-lotes-importar',
  imports: [UiModule],
  templateUrl: './lotes-importar.html',
  styleUrl: './lotes-importar.scss',
})
export class LotesImportar {
  private endpointService = inject(EndpointService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  loteamentoId = signal<string | null>(null);
  loteamentoNome = signal<string>('');
  arquivoNome = signal<string>('');
  
  situacoes = [
    { value: 'D', label: 'Disponível' },
    { value: 'R', label: 'Reservado' },
    { value: 'B', label: 'Bloqueado' },
    { value: 'V', label: 'Vendido' }
  ];
  
  form: FormGroup = this.fb.group({
    lotes: this.fb.array([])
  });

  get lotes(): FormArray {
    return this.form.get('lotes') as FormArray;
  }

  get quadrasResumo() {
    const resumo: { [quadra: string]: { qtd: number; areaTotal: number; valorTotal: number } } = {};
    
    this.lotes.controls.forEach((control) => {
      const lote = control.value;
      const quadra = lote.quadra;
      
      if (!resumo[quadra]) {
        resumo[quadra] = { qtd: 0, areaTotal: 0, valorTotal: 0 };
      }
      
      resumo[quadra].qtd++;
      resumo[quadra].areaTotal += parseFloat(lote.area) || 0;
      resumo[quadra].valorTotal += parseFloat(lote.valor_total) || 0;
    });
    
    return Object.entries(resumo)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([quadra, dados]) => ({ quadra, ...dados }));
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['loteamento_id']) {
        this.loteamentoId.set(params['loteamento_id']);
        this.loadLoteamento(params['loteamento_id']);
      }
    });
  }

  async loadLoteamento(id: string) {
    try {
      this.loading.set(true);
      const response = await this.endpointService.getLoteamento(id);
      if (response) {
        this.loteamentoNome.set(response.nome);
      }
    } catch (error) {
      console.error('Erro ao carregar loteamento:', error);
      this.alertService.showDanger('Erro ao carregar loteamento');
    } finally {
      this.loading.set(false);
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.arquivoNome.set(file.name);
      this.lerArquivoCSV(file);
    }
  }

  lerArquivoCSV(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const csv = e.target.result;
      this.processarCSV(csv);
    };
    reader.readAsText(file);
  }

  processarCSV(csv: string) {
    const linhas = csv.split('\n');
    
    this.lotes.clear();

    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha) continue;

      // Regex para fazer split por vírgula, mas respeitando aspas
      const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const valores = linha.split(regex).map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (valores.length >= 6) {
        const loteData: LoteCSV = {
          QD: valores[0],
          LT: valores[1],
          MQ: valores[2],
          VALOR_MQ: valores[3],
          VALOR_BASE: valores[4],
          ENTRADA: valores[5],
          SITUACAO: valores[6] || 'D' // Default: Disponível
        };

        this.adicionarLote(loteData);
      }
    }

    this.alertService.showSuccess(`${this.lotes.length} lotes importados com sucesso!`);
  }

  adicionarLote(data: LoteCSV) {
    const situacao = this.validarSituacao(data.SITUACAO);
    
    const loteGroup = this.fb.group({
      quadra: [data.QD, Validators.required],
      lote: [data.LT, Validators.required],
      area: [this.parseNumero(data.MQ), [Validators.required, Validators.min(0)]],
      valor_area: [this.parseNumero(data.VALOR_MQ), [Validators.required, Validators.min(0)]],
      valor_total: [this.parseNumero(data.VALOR_BASE), [Validators.required, Validators.min(0)]],
      entrada: [this.parseNumero(data.ENTRADA), [Validators.required, Validators.min(0)]],
      situacao: [situacao, Validators.required]
    });

    // Escutar mudanças em área ou valor_area para recalcular valor_total
    loteGroup.get('area')?.valueChanges.subscribe(() => {
      this.calcularValorTotal(loteGroup);
    });

    loteGroup.get('valor_area')?.valueChanges.subscribe(() => {
      this.calcularValorTotal(loteGroup);
    });

    this.lotes.push(loteGroup);
  }

  calcularValorTotal(loteGroup: FormGroup) {
    const area = parseFloat(loteGroup.get('area')?.value) || 0;
    const valorArea = parseFloat(loteGroup.get('valor_area')?.value) || 0;
    const valorTotal = area * valorArea;
    
    if (valorTotal > 0) {
      loteGroup.get('valor_total')?.setValue(valorTotal, { emitEvent: false });
    }
  }

  parseNumero(valor: string): number {
    // Remove aspas, pontos de milhar e substitui vírgula decimal por ponto
    const valorLimpo = valor
      .replace(/['"]/g, '')  // Remove aspas
      .replace(/\./g, '')     // Remove pontos (separador de milhar)
      .replace(',', '.');     // Substitui vírgula por ponto (decimal)
    
    return parseFloat(valorLimpo) || 0;
  }

  validarSituacao(situacao?: string): string {
    if (!situacao) return 'D';
    
    const situacaoUpper = situacao.toUpperCase().trim();
    const situacoesValidas = ['D', 'R', 'B', 'V'];
    
    return situacoesValidas.includes(situacaoUpper) ? situacaoUpper : 'D';
  }

  removerLote(index: number) {
    this.lotes.removeAt(index);
  }

  async salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.showWarning('Verifique os campos obrigatórios');
      return;
    }

    if (this.lotes.length === 0) {
      this.alertService.showWarning('Nenhum lote para salvar');
      return;
    }

    try {
      this.saving.set(true);
      
      const payload = {
        loteamento_id: this.loteamentoId(),
        lotes: this.lotes.value
      };

      const response = await this.endpointService.importarLotes(payload);

      if (response) {
        this.alertService.showSuccess('Lotes salvos com sucesso!');
        this.voltar();
      }
    } catch (error: any) {
      console.error('Erro ao salvar lotes:', error);
      this.alertService.showDanger(error?.message || 'Erro ao salvar lotes');
    } finally {
      this.saving.set(false);
    }
  }

  voltar() {
    this.router.navigate(['/admin/loteamentos/consultar']);
  }
}
