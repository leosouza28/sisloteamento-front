import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EndpointService } from '../../../core/services/endpoint.service';

@Component({
  selector: 'app-admin-inicio',
  imports: [CommonModule],
  templateUrl: './admin-inicio.html',
  styleUrl: './admin-inicio.scss',
})
export class AdminInicio implements OnInit {
  private endpointService = inject(EndpointService);

  dashboardData: any = null;
  loading = true;

  ngOnInit() {
    this.loadDashboard();
  }

  async loadDashboard() {
    try {
      this.loading = true;
      this.dashboardData = await this.endpointService.getDashboard();
      this.loading = false;
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      this.loading = false;
    }
  }
}
