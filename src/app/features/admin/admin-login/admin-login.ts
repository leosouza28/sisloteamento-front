import { Component, inject, isDevMode, OnInit } from '@angular/core';
import { UiModule } from '../../../shared/ui/ui-module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { SessaoService } from '../../../core/services/sessao.service';

@Component({
  standalone: true,
  selector: 'app-admin-login',
  imports: [UiModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin implements OnInit {
  isLoading = false;


  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private sessao = inject(SessaoService);
  private router = inject(Router)
  private alert = inject(AlertService);

  loginForm: FormGroup = this.fb.group({
    scope: ['ADMIN', [Validators.required]],
    documento: [isDevMode() ? '02581748206' : '', [Validators.required]],
    senha: [isDevMode() ? 'leo1010' : '', [Validators.required]]
  });


  ngOnInit(): void {
    if (this.sessao.isAuthenticated()) {
      this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    try {
      const response = await this.api.post('/v1/login', this.loginForm.value);
      this.sessao.setUser(response);
      this.router.navigate(['/admin/dashboard']);
    } catch (error: any) {
      this.alert.showDanger(error.message || 'Erro ao fazer login');
    } finally {
      this.isLoading = false;
    }
  }
}
