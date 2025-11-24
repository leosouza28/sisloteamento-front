import { Component, inject } from '@angular/core';
import { AlertService } from '../../../core/services/alert.service';
import { Router } from '@angular/router';
import { SessaoService } from '../../../core/services/sessao.service';

@Component({
  selector: 'app-logoff',
  imports: [],
  templateUrl: './logoff.html',
  styleUrl: './logoff.scss',
})
export class Logoff {

  private sessao = inject(SessaoService);
  private router = inject(Router);
  private alerta = inject(AlertService);

  ngOnInit(): void {
    this.sessao.clearSession()
    this.router.navigate(['/admin/login']);
    this.alerta.showDanger("Você foi desconectado do sistema. Por favor, faça login novamente.");
  }

}
