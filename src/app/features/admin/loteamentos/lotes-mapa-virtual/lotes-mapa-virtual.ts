import { Component, OnInit, AfterViewInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Konva from 'konva';
import { EndpointService } from '../../../../core/services/endpoint.service';
import { AlertService } from '../../../../core/services/alert.service';

interface Lote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  quadra: string;
  numero: string;
  cor: string;
}

interface Loteamento {
  _id: string;
  nome: string;
  slug: string;
}

@Component({
  selector: 'app-lotes-mapa-virtual',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lotes-mapa-virtual.html',
  styleUrl: './lotes-mapa-virtual.scss',
})
export class LotesMapaVirtual implements OnInit, AfterViewInit, OnDestroy {
  private endpointService = inject(EndpointService);
  private alertService = inject(AlertService);

  stage!: Konva.Stage;
  layer!: Konva.Layer;
  imageLayer!: Konva.Layer;
  backgroundImage: HTMLImageElement | null = null;
  backgroundImageUrl: string | null = null;

  lotes: Lote[] = [];
  modoDesenho = false;
  modoSelecaoMultipla = false;
  quadraAtual = '';
  numeroLoteAtual = '';
  corAtual = '#4CAF50';

  startX = 0;
  startY = 0;
  drawingRect: Konva.Rect | null = null;
  selectionRect: Konva.Rect | null = null;
  lotesSelecionados: Konva.Group[] = [];
  selectionBorders: Konva.Rect[] = [];
  transformer: Konva.Transformer | null = null;

  zoomLevel = 1;
  minZoom = 0.1;
  maxZoom = 5;

  loteSelecionado: Konva.Group | null = null;
  contextMenu = { visible: false, x: 0, y: 0, lote: null as Lote | null };
  loteIdSelecionado: string | null = null;

  // Novos campos
  loteamentos: Loteamento[] = [];
  loteamentoSelecionado: string = '';
  uploading = false;
  salvando = false;
  carregando = false;
  loteCopiado: Lote | null = null;
  lotesCopiadosMultiplos: Lote[] = [];

  ngOnInit(): void {
    this.carregarLoteamentos();
  }

  async carregarLoteamentos(): Promise<void> {
    try {
      const response = await this.endpointService.getLoteamentos({ perpage: 1000 });
      if (response?.lista) {
        console.log(response);
        this.loteamentos = response.lista;
      }
    } catch (error) {
      console.error('Erro ao carregar loteamentos:', error);
      this.alertService.showDanger('Erro ao carregar lista de loteamentos');
    }
  }

  async carregarMapaExistente(): Promise<void> {
    if (!this.loteamentoSelecionado) {
      this.alertService.showWarning('Selecione um loteamento primeiro');
      return;
    }

    try {
      this.carregando = true;
      const response = await this.endpointService.getLoteamento(this.loteamentoSelecionado);

      console.log(response);

      if (response?.mapa_virtual?.mapa_virtual) {
        const mapaVirtual = response.mapa_virtual;

        // Carregar imagem
        if (mapaVirtual.mapa_virtual) {
          await this.carregarImagemPorUrl(mapaVirtual.mapa_virtual);
        }

        // Carregar lotes
        if (mapaVirtual.lotes && Array.isArray(mapaVirtual.lotes)) {
          console.log(mapaVirtual.lotes)
          this.lotes = mapaVirtual.lotes;
          this.redesenharLotes();
        }

        this.alertService.showSuccess('Mapa virtual carregado com sucesso!');
      } else {
        this.alertService.showWarning('Este loteamento ainda não possui mapa virtual');
      }
    } catch (error: any) {
      console.error('Erro ao carregar mapa virtual:', error);
      this.alertService.showDanger(error?.message || 'Erro ao carregar mapa virtual');
    } finally {
      this.carregando = false;
    }
  }

  async carregarImagemPorUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.backgroundImage = img;
        this.backgroundImageUrl = url;

        const konvaImage = new Konva.Image({
          image: img,
          width: img.width,
          height: img.height,
        });

        this.imageLayer.destroyChildren();
        this.imageLayer.add(konvaImage);

        const container = document.getElementById('canvas-container');
        if (container) {
          const scale = Math.min(
            container.offsetWidth / img.width,
            1000 / img.height
          );
          this.stage.scale({ x: scale, y: scale });
          this.zoomLevel = scale;
        }
        resolve();
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = url;
    });
  }

  redesenharLotes(): void {
    this.layer.destroyChildren();

    this.lotes.forEach(lote => {
      const rect = new Konva.Rect({
        x: 0,
        y: 0,
        width: lote.width,
        height: lote.height,
        stroke: lote.cor,
        strokeWidth: 2,
        fill: lote.cor,
        opacity: 0.3,
      });

      const text = new Konva.Text({
        x: lote.width / 2,
        y: lote.height / 2,
        text: `Q${lote.quadra} L${lote.numero}`,
        fontSize: 14,
        fill: '#000',
        align: 'center',
        verticalAlign: 'middle',
      });
      text.offsetX(text.width() / 2);
      text.offsetY(text.height() / 2);

      const group = new Konva.Group({
        x: lote.x,
        y: lote.y,
        draggable: true,
      });
      group.add(rect);
      group.add(text);
      (group as any).loteData = lote;

      this.addLoteEvents(group, lote);
      this.layer.add(group);
    });
  }

  ngAfterViewInit(): void {
    this.initKonva();
  }

  ngOnDestroy(): void {
    if (this.stage) {
      this.stage.destroy();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    // Verificar se não está em um input ou textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Ctrl/Cmd + C para copiar
    if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
      event.preventDefault();
      
      // Copiar múltiplos lotes se houver seleção múltipla
      if (this.lotesSelecionados.length > 0) {
        this.copiarLotesMultiplos();
      }
      // Caso contrário, copiar lote único
      else if (this.loteSelecionado) {
        const loteData = (this.loteSelecionado as any).loteData as Lote;
        if (loteData) {
          this.copiarLote(loteData);
        }
      }
    }
    
    // Ctrl/Cmd + V para colar
    if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
      event.preventDefault();
      
      // Colar múltiplos lotes se houver cópia múltipla
      if (this.lotesCopiadosMultiplos.length > 0) {
        this.colarLotesMultiplos();
      }
      // Caso contrário, colar lote único
      else if (this.loteCopiado) {
        this.colarLote();
      }
    }
  }

  copiarLotesMultiplos(): void {
    this.lotesCopiadosMultiplos = this.lotesSelecionados.map(group => {
      const loteData = (group as any).loteData as Lote;
      return { ...loteData };
    });
    this.loteCopiado = null; // Limpar cópia única
    this.alertService.showSuccess(`${this.lotesCopiadosMultiplos.length} lotes copiados!`);
  }

  async colarLotesMultiplos(): Promise<void> {
    if (this.lotesCopiadosMultiplos.length === 0) return;

    const novaQuadra = prompt('Digite a nova QUADRA para os lotes copiados:', this.lotesCopiadosMultiplos[0].quadra);
    
    if (!novaQuadra) return;

    // Limpar seleção anterior
    this.limparSelecao();

    // Array para armazenar os novos grupos criados
    const novosGrupos: Konva.Group[] = [];

    // Ordenar por número do lote
    const lotesOrdenados = [...this.lotesCopiadosMultiplos].sort((a, b) => 
      parseInt(a.numero) - parseInt(b.numero)
    );

    let proximoNumero = 1;

    lotesOrdenados.forEach((loteOriginal, index) => {
      // Encontrar próximo número disponível
      while (this.lotes.find(l => l.quadra === novaQuadra && l.numero === proximoNumero.toString().padStart(3, '0'))) {
        proximoNumero++;
      }

      const numeroFormatado = proximoNumero.toString().padStart(3, '0');
      
      const novoLote: Lote = {
        ...loteOriginal,
        quadra: novaQuadra,
        numero: numeroFormatado,
        id: `${novaQuadra}-${numeroFormatado}`,
        x: loteOriginal.x + 30,
        y: loteOriginal.y + 30,
      };

      // Criar novo retângulo
      const rect = new Konva.Rect({
        x: 0,
        y: 0,
        width: novoLote.width,
        height: novoLote.height,
        stroke: novoLote.cor,
        strokeWidth: 2,
        fill: novoLote.cor,
        opacity: 0.3,
      });

      // Criar novo texto
      const text = new Konva.Text({
        x: novoLote.width / 2,
        y: novoLote.height / 2,
        text: `Q${novoLote.quadra} L${novoLote.numero}`,
        fontSize: 14,
        fill: '#000',
        align: 'center',
        verticalAlign: 'middle',
      });
      text.offsetX(text.width() / 2);
      text.offsetY(text.height() / 2);

      // Criar grupo
      const group = new Konva.Group({
        x: novoLote.x,
        y: novoLote.y,
        draggable: true,
      });
      group.add(rect);
      group.add(text);
      (group as any).loteData = novoLote;

      this.addLoteEvents(group, novoLote);
      this.layer.add(group);
      this.lotes.push(novoLote);

      // Adicionar à nova seleção
      novosGrupos.push(group);

      proximoNumero++;
    });

    // Selecionar os novos lotes
    this.lotesSelecionados = novosGrupos;
    novosGrupos.forEach(group => {
      this.adicionarBordaSelecao(group);
    });

    // Habilitar arraste múltiplo dos novos lotes
    this.habilitarArrasteMultiplo();

    this.alertService.showSuccess(`${lotesOrdenados.length} lotes colados na quadra ${novaQuadra}!`);
  }

  copiarLote(lote: Lote): void {
    this.loteCopiado = { ...lote };
    this.lotesCopiadosMultiplos = []; // Limpar cópia múltipla
    this.alertService.showSuccess(`Lote Q${lote.quadra} L${lote.numero} copiado!`);
  }

  colarLote(): void {
    if (!this.loteCopiado) return;
    
    // Incrementar o número do lote automaticamente
    const numeroAtual = parseInt(this.loteCopiado.numero) || 0;
    let proximoNumero = (numeroAtual + 1).toString().padStart(3, '0');
    let tentativas = 0;
    const maxTentativas = 999;
    
    // Verificar se já existe um lote com essa quadra e número
    while (tentativas < maxTentativas) {
      const loteExistente = this.lotes.find(
        l => l.quadra === this.loteCopiado!.quadra && l.numero === proximoNumero
      );
      
      if (!loteExistente) {
        break; // Número disponível encontrado
      }
      
      // Incrementar e tentar novamente
      const numeroInt = parseInt(proximoNumero) + 1;
      proximoNumero = numeroInt.toString().padStart(3, '0');
      tentativas++;
    }
    
    if (tentativas >= maxTentativas) {
      this.alertService.showWarning('Não há mais números disponíveis para esta quadra');
      return;
    }
    
    const novoLote: Lote = {
      ...this.loteCopiado,
      numero: proximoNumero,
      id: `${this.loteCopiado.quadra}-${proximoNumero}`,
      x: this.loteCopiado.x + 30,
      y: this.loteCopiado.y + 30,
    };

    // Criar novo retângulo
    const rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: novoLote.width,
      height: novoLote.height,
      stroke: novoLote.cor,
      strokeWidth: 2,
      fill: novoLote.cor,
      opacity: 0.3,
    });

    // Criar novo texto
    const text = new Konva.Text({
      x: novoLote.width / 2,
      y: novoLote.height / 2,
      text: `Q${novoLote.quadra} L${novoLote.numero}`,
      fontSize: 14,
      fill: '#000',
      align: 'center',
      verticalAlign: 'middle',
    });
    text.offsetX(text.width() / 2);
    text.offsetY(text.height() / 2);

    // Criar grupo
    const group = new Konva.Group({
      x: novoLote.x,
      y: novoLote.y,
      draggable: true,
    });
    group.add(rect);
    group.add(text);
    (group as any).loteData = novoLote;

    this.addLoteEvents(group, novoLote);
    this.layer.add(group);
    this.lotes.push(novoLote);
    
    // Atualizar o lote copiado para a nova posição e número
    this.loteCopiado = novoLote;
  }

  initKonva(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    this.stage = new Konva.Stage({
      container: 'canvas-container',
      width: container.offsetWidth,
      height: 1000,
      draggable: true,
    });

    this.imageLayer = new Konva.Layer();
    this.layer = new Konva.Layer();

    this.stage.add(this.imageLayer);
    this.stage.add(this.layer);

    // Eventos de desenho e seleção
    this.stage.on('mousedown touchstart', (e) => {
      // Modo seleção múltipla
      if (this.modoSelecaoMultipla) {
        // Verificar se clicou em um lote selecionado
        const clickedOnSelected = this.lotesSelecionados.some(group => 
          e.target === group || e.target.getParent() === group
        );

        // Se clicou em um lote selecionado, não fazer nada (permite arrastar pelo transformer)
        if (clickedOnSelected) {
          return;
        }
        
        // Senão, limpar seleção e começar nova
        this.limparSelecao();
        
        const pos = this.stage.getPointerPosition();
        if (!pos) return;

        const transform = this.stage.getAbsoluteTransform().copy().invert();
        const adjustedPos = transform.point(pos);

        this.startX = adjustedPos.x;
        this.startY = adjustedPos.y;

        this.selectionRect = new Konva.Rect({
          x: this.startX,
          y: this.startY,
          width: 0,
          height: 0,
          stroke: '#2196F3',
          strokeWidth: 2,
          dash: [5, 5],
          fill: 'rgba(33, 150, 243, 0.1)',
        });

        this.layer.add(this.selectionRect);
        return;
      }

      // Eventos de desenho
      if (!this.modoDesenho || !this.quadraAtual || !this.numeroLoteAtual) return;

      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      // Converter coordenadas considerando zoom e pan
      const transform = this.stage.getAbsoluteTransform().copy().invert();
      const adjustedPos = transform.point(pos);

      this.startX = adjustedPos.x;
      this.startY = adjustedPos.y;

      this.drawingRect = new Konva.Rect({
        x: this.startX,
        y: this.startY,
        width: 0,
        height: 0,
        stroke: this.corAtual,
        strokeWidth: 2,
        fill: this.corAtual,
        opacity: 0.3,
      });

      this.layer.add(this.drawingRect);
    });

    this.stage.on('mousemove touchmove', (e) => {
      // Modo seleção múltipla
      if (this.selectionRect) {
        const pos = this.stage.getPointerPosition();
        if (!pos) return;

        const transform = this.stage.getAbsoluteTransform().copy().invert();
        const adjustedPos = transform.point(pos);

        const width = adjustedPos.x - this.startX;
        const height = adjustedPos.y - this.startY;

        this.selectionRect.width(width);
        this.selectionRect.height(height);
        return;
      }

      // Modo desenho
      if (!this.drawingRect) return;

      const pos = this.stage.getPointerPosition();
      if (!pos) return;

      const transform = this.stage.getAbsoluteTransform().copy().invert();
      const adjustedPos = transform.point(pos);

      const width = adjustedPos.x - this.startX;
      const height = adjustedPos.y - this.startY;

      this.drawingRect.width(width);
      this.drawingRect.height(height);
    });

    this.stage.on('mouseup touchend', (e) => {
      // Modo seleção múltipla
      if (this.selectionRect) {
        const selBox = this.selectionRect.getClientRect();
        
        const groups = this.layer.find('Group') as Konva.Group[];
        groups.forEach(group => {
          const groupBox = group.getClientRect();
          
          // Verificar interseção
          if (this.intersects(selBox, groupBox)) {
            this.lotesSelecionados.push(group);
            this.adicionarBordaSelecao(group);
          }
        });

        this.selectionRect.destroy();
        this.selectionRect = null;
        
        if (this.lotesSelecionados.length > 0) {
          this.alertService.showSuccess(`${this.lotesSelecionados.length} lotes selecionados`);
          this.habilitarArrasteMultiplo();
        }
        return;
      }

      // Modo desenho
      if (!this.drawingRect) return;

      const width = this.drawingRect.width();
      const height = this.drawingRect.height();

      if (Math.abs(width) < 5 || Math.abs(height) < 5) {
        this.drawingRect.destroy();
        this.drawingRect = null;
        return;
      }

      // Guardar a posição inicial do retângulo
      const rectX = this.drawingRect.x();
      const rectY = this.drawingRect.y();

      // Fazer rect e text arrastáveis juntos
      const group = new Konva.Group({
        x: rectX,
        y: rectY,
        draggable: true,
      });

      // Ajustar retângulo para posição relativa ao grupo (0, 0)
      this.drawingRect.x(0);
      this.drawingRect.y(0);

      // Adicionar label com número do lote (relativo ao grupo)
      const text = new Konva.Text({
        x: width / 2,
        y: height / 2,
        text: `Q${this.quadraAtual} L${this.numeroLoteAtual}`,
        fontSize: 14,
        fill: '#000',
        align: 'center',
        verticalAlign: 'middle',
      });
      text.offsetX(text.width() / 2);
      text.offsetY(text.height() / 2);

      group.add(this.drawingRect);
      group.add(text);

      // Salvar lote com a posição do grupo
      const lote: Lote = {
        id: `${this.quadraAtual}-${this.numeroLoteAtual}`,
        x: rectX,
        y: rectY,
        width: width,
        height: height,
        quadra: this.quadraAtual,
        numero: this.numeroLoteAtual,
        cor: this.corAtual,
      };
      this.lotes.push(lote);

      // Adicionar referência ao lote no group
      (group as any).loteData = lote;

      // Adicionar eventos de clique e contexto
      this.addLoteEvents(group, lote);

      this.layer.add(group);

      // Incrementar automaticamente o número do lote após criar
      this.incrementarNumeroLote();

      this.drawingRect = null;
    });
  }

  incrementarNumeroLote(): void {
    const numeroAtual = parseInt(this.numeroLoteAtual) || 0;
    let proximoNumero = (numeroAtual + 1).toString().padStart(3, '0');
    let tentativas = 0;
    const maxTentativas = 999;
    
    // Verificar se já existe um lote com essa quadra e número
    while (tentativas < maxTentativas) {
      const loteExistente = this.lotes.find(
        l => l.quadra === this.quadraAtual && l.numero === proximoNumero
      );
      
      if (!loteExistente) {
        break; // Número disponível encontrado
      }
      
      // Incrementar e tentar novamente
      const numeroInt = parseInt(proximoNumero) + 1;
      proximoNumero = numeroInt.toString().padStart(3, '0');
      tentativas++;
    }
    
    if (tentativas < maxTentativas) {
      this.numeroLoteAtual = proximoNumero;
    }
  }

  addLoteEvents(group: Konva.Group, lote: Lote): void {
    // Atualizar coordenadas ao arrastar
    group.on('dragend', () => {
      const loteData = (group as any).loteData as Lote;
      if (loteData) {
        loteData.x = group.x();
        loteData.y = group.y();
      }
    });

    // Highlight ao passar o mouse
    group.on('mouseenter', () => {
      if (!this.modoDesenho) {
        document.body.style.cursor = 'pointer';
        const rect = group.children[0] as Konva.Rect;
        rect.strokeWidth(4);
      }
    });

    group.on('mouseleave', () => {
      document.body.style.cursor = 'default';
      const rect = group.children[0] as Konva.Rect;
      rect.strokeWidth(2);
    });

    // Clique simples para selecionar
    group.on('click', (e) => {
      if (e.evt.button === 0) { // Botão esquerdo
        this.selecionarLote(group, lote);
      }
    });

    // Menu de contexto (botão direito)
    group.on('contextmenu', (e) => {
      e.evt.preventDefault();
      this.selecionarLote(group, lote);
      this.contextMenu = {
        visible: true,
        x: e.evt.clientX,
        y: e.evt.clientY,
        lote: lote
      };
    });

    // Clique duplo para editar
    group.on('dblclick', () => {
      this.editarLoteRapido(group, lote);
    });
  }

  selecionarLote(group: Konva.Group, lote: Lote): void {
    this.loteSelecionado = group;
    this.loteIdSelecionado = lote.id;
    this.contextMenu.lote = lote;
  }

  duplicarLote(lote: Lote): void {
    const novoLote: Lote = {
      ...lote,
      id: `${lote.quadra}-${lote.numero}-copy`,
      x: lote.x + 20,
      y: lote.y + 20,
    };

    // Criar novo retângulo
    const rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: novoLote.width,
      height: novoLote.height,
      stroke: novoLote.cor,
      strokeWidth: 2,
      fill: novoLote.cor,
      opacity: 0.3,
    });

    // Criar novo texto
    const text = new Konva.Text({
      x: novoLote.width / 2,
      y: novoLote.height / 2,
      text: `Q${novoLote.quadra} L${novoLote.numero}`,
      fontSize: 14,
      fill: '#000',
      align: 'center',
      verticalAlign: 'middle',
    });
    text.offsetX(text.width() / 2);
    text.offsetY(text.height() / 2);

    // Criar grupo
    const group = new Konva.Group({
      x: novoLote.x,
      y: novoLote.y,
      draggable: true,
    });
    group.add(rect);
    group.add(text);
    (group as any).loteData = novoLote;

    this.addLoteEvents(group, novoLote);
    this.layer.add(group);
    this.lotes.push(novoLote);

    this.fecharContextMenu();
  }

  editarLote(group: Konva.Group, lote: Lote): void {
    const novaQuadra = prompt('Quadra:', lote.quadra);
    const novoNumero = prompt('Número do Lote:', lote.numero);

    if (novaQuadra && novoNumero) {
      lote.quadra = novaQuadra;
      lote.numero = novoNumero;
      lote.id = `${novaQuadra}-${novoNumero}`;

      // Atualizar texto
      const text = group.children[1] as Konva.Text;
      text.text(`Q${novaQuadra} L${novoNumero}`);
      text.offsetX(text.width() / 2);
      text.offsetY(text.height() / 2);

      (group as any).loteData = lote;
    }

    this.fecharContextMenu();
  }

  editarLoteRapido(group: Konva.Group, lote: Lote): void {
    this.editarLote(group, lote);
  }

  editarLoteDaLista(lote: Lote): void {
    const group = this.encontrarGroupPorLote(lote);
    if (group) {
      this.editarLote(group, lote);
    }
  }

  excluirLoteDaLista(lote: Lote): void {
    if (confirm(`Deseja excluir o lote Q${lote.quadra} L${lote.numero}?`)) {
      const group = this.encontrarGroupPorLote(lote);
      if (group) {
        group.destroy();
      }
      this.lotes = this.lotes.filter(l => l.id !== lote.id);
      if (this.loteIdSelecionado === lote.id) {
        this.loteIdSelecionado = null;
        this.loteSelecionado = null;
      }
    }
  }

  encontrarGroupPorLote(lote: Lote): Konva.Group | null {
    const groups = this.layer.find('Group') as Konva.Group[];
    return groups.find(g => (g as any).loteData?.id === lote.id) || null;
  }

  excluirLote(lote: Lote): void {
    if (confirm(`Deseja excluir o lote Q${lote.quadra} L${lote.numero}?`)) {
      // Remover do array
      this.lotes = this.lotes.filter(l => l.id !== lote.id);

      // Remover do canvas
      if (this.loteSelecionado) {
        this.loteSelecionado.destroy();
        this.loteSelecionado = null;
      }
    }

    this.fecharContextMenu();
  }

  fecharContextMenu(): void {
    this.contextMenu = { visible: false, x: 0, y: 0, lote: null };
  }

  onCanvasClick(): void {
    this.fecharContextMenu();
  }

  async onImageUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.alertService.showWarning('Apenas imagens (JPG, PNG) são permitidas');
      return;
    }

    // Validar tamanho (máximo 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      this.alertService.showWarning('A imagem deve ter no máximo 100MB');
      return;
    }

    try {
      this.uploading = true;
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.endpointService.uploadFile(formData);

      if (response?.url) {
        this.backgroundImageUrl = response.url;
        await this.carregarImagemPorUrl(response.url);
        this.alertService.showSuccess('Imagem carregada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      this.alertService.showDanger(error?.message || 'Erro ao fazer upload da imagem');
    } finally {
      this.uploading = false;
      // Limpar input
      input.value = '';
    }
  }

  toggleModoDesenho(): void {
    this.modoDesenho = !this.modoDesenho;
    this.modoSelecaoMultipla = false;
    this.limparSelecao();
    this.stage.draggable(!this.modoDesenho);
  }

  toggleModoSelecaoMultipla(): void {
    this.limparSelecao();
    this.modoSelecaoMultipla = !this.modoSelecaoMultipla;
    this.modoDesenho = false;
    this.stage.draggable(!this.modoSelecaoMultipla);
    
    // Desabilitar/habilitar arraste individual de todos os lotes
    this.layer?.children?.forEach(node => {
      if (node instanceof Konva.Group && (node as any).loteData) {
        node.draggable(!this.modoSelecaoMultipla);
      }
    });
  }

  adicionarBordaSelecao(group: Konva.Group): void {
    const rect = group.children[0] as Konva.Rect;
    const width = rect.width();
    const height = rect.height();

    // Criar borda de seleção (maior que o lote)
    const border = new Konva.Rect({
      x: -5,
      y: -5,
      width: width + 10,
      height: height + 10,
      stroke: '#2196F3',
      strokeWidth: 3,
      dash: [10, 5],
      listening: false,
    });

    group.add(border);
    this.selectionBorders.push(border);
  }

  limparSelecao(): void {
    // Remover bordas de seleção
    this.selectionBorders.forEach(border => border.destroy());
    this.selectionBorders = [];
    
    // Desabilitar arraste múltiplo
    this.desabilitarArrasteMultiplo();
    
    this.lotesSelecionados = [];
  }

  habilitarArrasteMultiplo(): void {
    if (!this.layer) return;

    // MANTER lotes como draggable para o transformer funcionar
    this.lotesSelecionados.forEach(group => {
      group.draggable(true);
    });

    // Criar transformer se não existir
    if (!this.transformer) {
      this.transformer = new Konva.Transformer({
        borderStroke: '#0066ff',
        borderStrokeWidth: 2,
        anchorStroke: '#0066ff',
        anchorFill: '#ffffff',
        anchorSize: 8,
        keepRatio: false,
        enabledAnchors: [], // Desabilita redimensionamento, apenas arraste
        rotateEnabled: false,
        borderDash: [4, 4]
      });
      this.layer.add(this.transformer);
    }

    // Anexar transformer aos lotes selecionados
    this.transformer.nodes(this.lotesSelecionados);
    this.layer.batchDraw();

    // Atualizar coordenadas quando terminar de arrastar
    this.transformer.on('transformend dragend', () => {
      this.lotesSelecionados.forEach(group => {
        const loteData = (group as any).loteData as Lote;
        if (loteData) {
          loteData.x = group.x();
          loteData.y = group.y();
        }
      });
    });
  }

  desabilitarArrasteMultiplo(): void {
    if (this.transformer) {
      this.transformer.nodes([]);
      this.transformer.destroy();
      this.transformer = null;
      this.layer?.batchDraw();
    }
    
    // Re-habilitar arraste individual dos lotes se não estiver em modo de seleção múltipla
    if (!this.modoSelecaoMultipla) {
      this.layer?.children?.forEach(node => {
        if (node instanceof Konva.Group && (node as any).loteData) {
          node.draggable(true);
        }
      });
    }
  }

  intersects(r1: any, r2: any): boolean {
    return !(
      r2.x > r1.x + r1.width ||
      r2.x + r2.width < r1.x ||
      r2.y > r1.y + r1.height ||
      r2.y + r2.height < r1.y
    );
  }

  limparMapa(): void {
    if (confirm('Deseja limpar todas as marcações?')) {
      this.layer.destroyChildren();
      this.lotes = [];
    }
  }

  async salvarMapaVirtual(): Promise<void> {
    if (!this.loteamentoSelecionado) {
      this.alertService.showWarning('Selecione um loteamento');
      return;
    }

    if (!this.backgroundImageUrl) {
      this.alertService.showWarning('Carregue uma imagem do mapa');
      return;
    }

    if (this.lotes.length === 0) {
      this.alertService.showWarning('Marque pelo menos um lote no mapa');
      return;
    }

    try {
      this.salvando = true;

      // Sincronizar coordenadas de todos os lotes antes de salvar
      this.sincronizarCoordenadasLotes();

      console.log('=== DEBUG SALVAR MAPA VIRTUAL ===');
      console.log('Loteamento selecionado:', this.loteamentoSelecionado);
      console.log('URL da imagem:', this.backgroundImageUrl);
      console.log('Total de lotes:', this.lotes.length);
      console.log('Lotes:', this.lotes);

      const payload = {
        loteamento_id: this.loteamentoSelecionado,
        imagem_url: this.backgroundImageUrl,
        lotes: this.lotes,
      };

      console.log('Payload completo:', JSON.stringify(payload, null, 2));

      const response = await this.endpointService.saveMapaVirtualLoteamento(payload);
      console.log('Resposta da API:', response);
      
      this.alertService.showSuccess('Mapa virtual salvo com sucesso!');
    } catch (error: any) {
      console.error('=== ERRO AO SALVAR ===');
      console.error('Erro completo:', error);
      console.error('Mensagem:', error?.message);
      console.error('Status:', error?.status);
      this.alertService.showDanger(error?.message || 'Erro ao salvar mapa virtual');
    } finally {
      this.salvando = false;
    }
  }

  sincronizarCoordenadasLotes(): void {
    console.log('=== SINCRONIZANDO COORDENADAS ===');
    console.log('Lotes antes da sincronização:', this.lotes.length);
    
    const groups = this.layer.find('Group') as Konva.Group[];
    console.log('Groups encontrados:', groups.length);
    
    groups.forEach((group, idx) => {
      const loteData = (group as any).loteData as Lote;
      if (loteData) {
        console.log(`Group ${idx}:`, loteData.id, 'Posição:', group.x(), group.y());
        
        // Atualizar coordenadas do lote com as posições atuais do group
        loteData.x = group.x();
        loteData.y = group.y();
        
        // Encontrar e atualizar no array principal
        const index = this.lotes.findIndex(l => l.id === loteData.id);
        if (index !== -1) {
          this.lotes[index] = loteData;
          console.log(`Lote ${loteData.id} atualizado no índice ${index}`);
        } else {
          console.warn(`Lote ${loteData.id} não encontrado no array!`);
        }
      }
    });
    
    console.log('Lotes após sincronização:', this.lotes.length);
  }

  exportarDados(): void {
    const dataStr = JSON.stringify(this.lotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lotes-mapa.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  exportarImagem(): void {
    const dataURL = this.stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'mapa-loteamento.png';
    link.click();
  }

  zoomIn(): void {
    const newScale = Math.min(this.zoomLevel * 1.2, this.maxZoom);
    this.stage.scale({ x: newScale, y: newScale });
    this.zoomLevel = newScale;
  }

  zoomOut(): void {
    const newScale = Math.max(this.zoomLevel / 1.2, this.minZoom);
    this.stage.scale({ x: newScale, y: newScale });
    this.zoomLevel = newScale;
  }

  resetZoom(): void {
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.zoomLevel = 1;
  }
}
