import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class EndpointService extends ApiService {

    getDashboard() {
        return this.get('/v1/admin/dashboard/admin');
    }
    getDashboardClient() {
        return this.get('/v1/admin/dashboard/client');
    }
    login(data: any) {
        return this.post('/v1/login', data);
    }

    getUsuarios({ perpage, page, status, nivel_acesso, ...query }: any) {
        let params: any = { ...query };
        if (perpage) params.perpage = perpage;
        if (page) params.page = page;
        if (status) params.status = status;
        if (nivel_acesso) params.nivel_acesso = nivel_acesso;
        let url_search = new URLSearchParams(params).toString();
        return this.get('/v1/admin/usuarios?' + url_search);
    }

    getVendedores() {
        return this.get('/v1/admin/usuarios/vendedores');
    }

    getUsuario(id: string) {
        return this.get('/v1/admin/usuario?id=' + id);
    }

    saveUsuario(data: any) {
        return this.post('/v1/admin/usuarios', data);
    }
    saveUsuarioCliente(data: any) {
        return this.post('/v1/admin/usuarios/simples', data);
    }

    getPermissoes() {
        return this.get('/v1/admin/usuarios/permissoes');
    }

    consultarCEP(cep: string) {
        return this.get('/public/cep?cep=' + cep.replace(/\D/g, ''));
    }

    getLoteamentos({ perpage, page, q, ...query }: any) {
        let params: any = { ...query };
        if (perpage) params.perpage = perpage;
        if (page) params.page = page;
        if (q) params.q = q;
        let url_search = new URLSearchParams(params).toString();
        return this.get('/v1/loteamentos?' + url_search);
    }

    getLoteamento(id: string) {
        return this.get('/v1/loteamento?id=' + id);
    }

    getLotesPorLoteamento(loteamento_id: string) {
        return this.get('/v1/loteamentos/lotes?loteamento_id=' + loteamento_id);
    }

    saveLoteamento(data: any) {
        return this.post('/v1/loteamentos', data);
    }
    saveMapaVirtualLoteamento(data: any) {
        return this.post('/v1/loteamentos/mapa-virtual', data);
    }

    importarLotes(data: any) {
        return this.post('/v1/lotes/importar', data);
    }

    criarReserva(data: any) {
        return this.post('/v1/reservas', data);
    }

    getReservas({ perpage, page, ...query }: any) {
        const url_search = new URLSearchParams({
            perpage: perpage || 10,
            page: page || 1,
            ...query
        });
        return this.get('/v1/reservas?' + url_search);
    }

    getReserva(id: string) {
        return this.get('/v1/reserva?id=' + id);
    }

    updateReserva(data: any) {
        return this.put('/v1/reservas', data);
    }

    uploadFile(formData: FormData) {
        return this.post('/v1/admin/upload', formData);
    }

    alterarSituacaoLotes(data: { lote_ids: string[], situacao: string }) {
        return this.put('/v1/lotes/situacao', data);
    }

}