import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SessaoService {

    local_keys = {
        "TOKEN": "TOKEN",
        "USER_DATA": "USER_DATA",
    }

    private _isAuthenticated: boolean = false;
    public user: any = null;
    public userSubject = new BehaviorSubject<any>(this.getUser());
    public empresa_ativa: any = null;

    public user_customer: any = null;
    public userCustomerSubject = new BehaviorSubject<any>(this.getUserCustomer());


    constructor() {
        let userData = localStorage.getItem(this.local_keys.USER_DATA);
        if (userData) {
            userData = JSON.parse(userData);
            this.user = userData;
            this.setAuthenticated(true);
            this.atualizarSessao();
        }
    }
    public hasPermissao(id: any) {
        if (this.user?.empresa?.perfil?.permissoes?.length) {
            let has_permissao = this.user.empresa.perfil.permissoes.find((item: any) => item.id == id);
            if (!!has_permissao) return true;
        }
        return false;
    }
    public isAuthenticated(): boolean {
        return this._isAuthenticated;
    }
    // Método para definir o estado de autenticação do usuário
    public setAuthenticated(isAuthenticated: boolean): void {
        this._isAuthenticated = isAuthenticated;
    }
    // Método para obter o ID do usuário
    public getUser(): any {
        return this.user;
    }
    public getUserCustomer(): any {
        return this.user_customer;
    }
    // Método para definir o ID do usuário
    public setUser(user: any): void {
        if (user) {
            if (user?.access_token) localStorage.setItem(this.local_keys.TOKEN, user.access_token);
            delete user.access_token;
            localStorage.setItem(this.local_keys.USER_DATA, JSON.stringify(user, null, 2));
        }
        this.user = user;
        this.atualizarSessao();
    }
    // Método para limpar a sessão do usuário
    public clearSession(): void {
        this._isAuthenticated = false;
        this.user = null;
        this.user_customer = null;
        localStorage.removeItem(this.local_keys.USER_DATA);
        localStorage.removeItem(this.local_keys.TOKEN);
        this.atualizarSessao();
    }
    public getToken(): string | null {
        let token = localStorage.getItem(this.local_keys.TOKEN);
        if (!!token) return token;
        return null;
    }
    public atualizarSessao() {
        this.userSubject.next(this.getUser());
    }
    public isScopeAvailable(scope: string): boolean {
        if (this.user?.perfil_scopes?.length) {
            let has_scope = this.user.perfil_scopes.find((item: any) => item == scope);
            if (!!has_scope) return true;
        }
        return false;
    }

}
