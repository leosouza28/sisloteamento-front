import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EndpointService } from '../../../core/services/endpoint.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-livemap-loteamento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './livemap-loteamento.html',
  styleUrl: './livemap-loteamento.scss',
})
export class LivemapLoteamento implements OnInit {
  private route = inject(ActivatedRoute);
  private endpointService = inject(EndpointService);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('mapImage') mapImage!: ElementRef<HTMLImageElement>;

  idLoteamento: string = '';
  loading = true;
  loadingInfo = true;
  imageUrl: string = '';
  loteamentoInfo: any = null;

  // Controles de zoom e pan
  scale = 1;
  minScale = 0.5;
  maxScale = 1000;
  translateX = 0;
  translateY = 0;
  isPanning = false;
  startX = 0;
  startY = 0;

  // Controle de zoom inteligente
  imageWidth = 0;
  imageHeight = 0;
  zoomStep = 0.2;
  fitToScreenScale = 1;

  // Controles de UI
  showInfo = false;
  isTransitioning = true;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.idLoteamento = params['id'];
      if (this.idLoteamento) {
        this.loadMap();
        this.loadInfo();
      }
    });
  }

  loadMap() {
    this.loading = true;
    this.imageUrl = `${environment.apiUrl}/public/loteamentos/mapa-virtual/${this.idLoteamento}?t=${Date.now()}`;
  }

  async loadInfo() {
    try {
      this.loadingInfo = true;
      const response = await this.endpointService.get(`/v1/admin/dashboard/client/loteamento/${this.idLoteamento}`);
      this.loteamentoInfo = response;
    } catch (error) {
      console.error('Erro ao carregar informações:', error);
    } finally {
      this.loadingInfo = false;
    }
  }

  onImageLoad() {
    this.loading = false;
    
    // Obtém dimensões da imagem e container
    if (this.mapImage && this.mapContainer) {
      const img = this.mapImage.nativeElement;
      const container = this.mapContainer.nativeElement;
      
      this.imageWidth = img.naturalWidth;
      this.imageHeight = img.naturalHeight;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calcula o zoom necessário para preencher a tela
      const scaleX = containerWidth / this.imageWidth;
      const scaleY = containerHeight / this.imageHeight;
      this.fitToScreenScale = Math.max(scaleX, scaleY);
      
      // Ajusta maxScale baseado no tamanho da imagem
      // Permite zoom de até 1000%
      this.maxScale = 1000;
      
      // Define step de 100% (1.0) para cada clique
      this.zoomStep = 1.0;
    }
  }

  onImageError() {
    this.loading = false;
    console.error('Erro ao carregar imagem do mapa');
  }

  // Zoom controls
  zoomIn() {
    if (this.scale === 1 && this.fitToScreenScale > 1) {
      // Se estiver em escala 1, vai direto para o zoom que preenche a tela
      this.scale = this.fitToScreenScale;
    } else if (this.scale < this.maxScale) {
      // Caso contrário, incrementa progressivamente
      this.scale = Math.min(this.scale + this.zoomStep, this.maxScale);
    }
  }

  zoomOut() {
    if (this.scale > this.minScale) {
      this.scale = Math.max(this.scale - this.zoomStep, this.minScale);
    }
  }

  resetZoom() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
  }

  // Pan controls
  onMouseDown(event: MouseEvent) {
    if (this.scale > 1) {
      this.isPanning = true;
      this.isTransitioning = false;
      this.startX = event.clientX - this.translateX;
      this.startY = event.clientY - this.translateY;
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      this.translateX = event.clientX - this.startX;
      this.translateY = event.clientY - this.startY;
    }
  }

  onMouseUp() {
    this.isPanning = false;
    this.isTransitioning = true;
  }

  onMouseLeave() {
    this.isPanning = false;
    this.isTransitioning = true;
  }

  // Touch controls for mobile
  onTouchStart(event: TouchEvent) {
    if (this.scale > 1 && event.touches.length === 1) {
      this.isPanning = true;
      this.isTransitioning = false;
      this.startX = event.touches[0].clientX - this.translateX;
      this.startY = event.touches[0].clientY - this.translateY;
      event.preventDefault();
    }
  }

  onTouchMove(event: TouchEvent) {
    if (this.isPanning && event.touches.length === 1) {
      this.translateX = event.touches[0].clientX - this.startX;
      this.translateY = event.touches[0].clientY - this.startY;
      event.preventDefault();
    }
  }

  onTouchEnd() {
    this.isPanning = false;
    this.isTransitioning = true;
  }

  // Wheel zoom
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -this.zoomStep : this.zoomStep;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    
    if (newScale !== this.scale) {
      this.scale = newScale;
    }
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
  }

  getTransform(): string {
    return `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  getCursor(): string {
    return this.isPanning ? 'grabbing' : (this.scale > 1 ? 'grab' : 'default');
  }

  downloadMap() {
    const link = document.createElement('a');
    link.href = this.imageUrl;
    link.download = `mapa-${this.loteamentoInfo?.loteamento?.nome || 'loteamento'}.png`;
    link.click();
  }
}
