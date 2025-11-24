import { Component, inject, TemplateRef } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { SessaoService } from '../../../core/services/sessao.service';
import { ApiService } from '../../../core/services/api.service';
import { AlertService } from '../../../core/services/alert.service';
import { UiModule } from '../../../shared/ui/ui-module';
import { filter } from 'rxjs';

@Component({
  selector: 'app-admin-container',
  imports: [UiModule],
  templateUrl: './admin-container.html',
  styleUrl: './admin-container.scss',
})
export class AdminContainer {

  private offcanvasService = inject(NgbOffcanvas);
  version: any;
  menu: any[] = [];
  logged_user: any;
  position_updated: any;

  dashboard_admin_data: any = null;

  atualizando_sessao: boolean = false;

  environment: any = environment;

  public sessao = inject(SessaoService);
  private api = inject(ApiService)
  private alert = inject(AlertService);
  private router = inject(Router);

  ngOnInit(): void {
    this.sessao.userSubject.subscribe((user: any) => {
      this.logged_user = user;
      if (user && user?.scopes?.length) {
        this.loadMenu(false)
      } else {
        this.loadMenu(true)
      }
    })
    this.getVersion();

    this.router.events
      .pipe(filter((event: any) => event instanceof NavigationEnd))
      .subscribe(() => {
        console.log('Navigation');
        this.offcanvasService.dismiss();
      });
  }


  async atualizarSessao() {
    if (this.atualizando_sessao) return;
    this.atualizando_sessao = true;
    try {
      let response = await this.api.post('/v1/relogin', {});
      // this.sessao.setUser({
      //   _id: response._id,
      //   img: response?.profile_image_public || "https://placehold.co/300x300.png",
      //   nome: response.nome,
      //   cpf_cnpj: response.cpf_cnpj,
      //   clube: response.clube,
      //   foto_url: response.profile_image_public,
      //   access_token: response.token,
      //   perfil_nome: response.perfil_v2?.nome || "Perfil não definido",
      //   perfil_scopes: response?.perfil_v2?.scopes || []
      // })
      // this.alert.showSuccess("Sessão atualizada com sucesso!");
    } catch (error) {
      this.alert.showDanger("Erro ao atualizar sessão. Por favor, faça login novamente.");
    }
    this.atualizando_sessao = false;
  }


  loadMenu(onlyDefault: boolean = false) {
    if (onlyDefault) {
      this.menu = this.menuItems.filter((item: any) => item.default);
      return;
    } else {

      let sessao = this.sessao.getUser();
      let scopes = sessao?.scopes || [];
      let is_geral = sessao?.scopes?.includes('*');

      this.menu = this.menuItems.filter((item: any) => {
        if (is_geral) return true;
        if (item.default) return true;
        if (item.submenu) {
          item.submenu = item.submenu.filter((subItem: any) => {
            return !subItem.scopes || subItem.scopes.some((scope: string) => scopes.includes(scope));
          });
          return item.submenu.length > 0;
        }
        return !item.submenu && (!item.scopes || item.scopes.some((scope: string) => scopes.includes(scope)));
      });
    }
  }

  getVersion() {
    this.version = this.api.getPackageVersion();
  }

  toggleSubmenu(item: any) {
    if (item.submenu) {
      this.menu.forEach(menuItem => {
        if (menuItem !== item && menuItem.submenu) {
          menuItem.open = false;
        }
      });
      item.open = !item.open;
    }
  }

  openMenu(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { position: 'end' });
  }

  get menuItems() {
    let items = [
      {
        icon: 'bi bi-house-fill me-2',
        nome: 'Início',
        link: "/admin/dashboard",
        submenu: null,
        default: true
      },
      {
        icon: 'bi bi-people-fill me-2',
        nome: 'Usuários',
        scopes: [],
        submenu: [
          {
            scopes: ["usuarios.leitura"],
            icon: 'bi bi-search me-2',
            nome: 'Consultar',
            link: '/admin/usuarios/consultar'
          },
        ],
        open: false
      },
      {
        icon: 'bi bi-table me-2',
        nome: 'Loteamentos',
        scopes: [],
        submenu: [
          {
            scopes: ["usuarios.leitura"],
            icon: 'bi bi-search me-2',
            nome: 'Consultar',
            link: '/admin/loteamentos/consultar'
          },
          {
            scopes: ["usuarios.leitura"],
            icon: 'bi bi-search me-2',
            nome: 'Lotes por Loteamento',
            link: '/admin/loteamentos/lotes/consultar'
          },
        ],
        open: false
      },
      {
        icon: 'bi bi-file-earmark-plus me-2',
        nome: 'Reservas',
        scopes: [],
        submenu: [
          {
            scopes: ["usuarios.leitura"],
            icon: 'bi bi-plus-lg me-2',
            nome: 'Nova Reserva',
            link: '/admin/reservas/operar'
          },
          {
            scopes: ["usuarios.leitura"],
            icon: 'bi bi-search me-2',
            nome: 'Consultar',
            link: '/admin/reservas/consultar'
          },
        ],
        open: false
      },
      {
        icon: 'bi bi-door-open-fill text-danger me-2',
        nome: 'Sair',
        link: '/admin/logoff',
        submenu: null,
        default: true
      },
    ]
    return items;
  }


}
