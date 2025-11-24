import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SessaoService } from '../services/sessao.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(private router: Router, private sessao: SessaoService) { }

    canActivate(): boolean {
        var isAuthorized = false;

        let _ = this.sessao.getUser();
        if (_) isAuthorized = true;

        if (!isAuthorized) {
            this.router.navigate(['/login']);
            return false;
        }

        return true;
    }

    isScopeAvailable(scope: string): boolean {
        let sessao = this.sessao.getUser();
        let scopes = sessao?.perfil_scopes || [];
        if (scopes.includes(scope)) return true;
        return false;
    }

    isLoggedUser(usuario_id: string) {
        let logged_user_id = this.sessao.getUser()?._id;
        let is_logged_user = false;
        if (logged_user_id === usuario_id) is_logged_user = true;
        return is_logged_user
    }

    isAdmin() {
        let sessao = this.sessao.getUser();
        if (sessao?.perfil_nome === 'ADMINISTRADOR') return true;
        return false;
    }

}
