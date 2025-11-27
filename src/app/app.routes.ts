import { Routes } from '@angular/router';
import { MainLayout } from './core/layout/main-layout/main-layout';
import { AdminLogin } from './features/admin/admin-login/admin-login';
import { AdminInicio } from './features/admin/admin-inicio/admin-inicio';
import { UsuariosConsultar } from './features/admin/usuarios/usuarios-consultar/usuarios-consultar';
import { UsuariosForm } from './features/admin/usuarios/usuarios-form/usuarios-form';
import { LoteamentosConsultar } from './features/admin/loteamentos/loteamentos-consultar/loteamentos-consultar';
import { LoteamentosForm } from './features/admin/loteamentos/loteamentos-form/loteamentos-form';
import { LotesImportar } from './features/admin/loteamentos/lotes-importar/lotes-importar';
import { AdminContainer } from './features/admin/admin-container/admin-container';
import { Logoff } from './features/admin/logoff/logoff';
import { ReservasNovaReserva } from './features/admin/reservas/reservas-nova-reserva/reservas-nova-reserva';
import { ReservasConsultar } from './features/admin/reservas/reservas-consultar/reservas-consultar';
import { ReservasVisualizar } from './features/admin/reservas/reservas-visualizar/reservas-visualizar';
import { LoteamentosLote } from './features/admin/loteamentos/loteamentos-lote/loteamentos-lote';
import { BiDashboard1 } from './features/client/bi-dashboard-1/bi-dashboard-1';
import { LotesMapaVirtual } from './features/admin/loteamentos/lotes-mapa-virtual/lotes-mapa-virtual';
import { BiDashboard2 } from './features/client/bi-dashboard-2/bi-dashboard-2';
import { LivemapLoteamento } from './features/client/livemap-loteamento/livemap-loteamento';

export const routes: Routes = [
    {
        path: 'dashboard',
        component: BiDashboard1
    },
    {
        path: 'dashboard/loteamento/:id',
        component: BiDashboard2
    },
    {
        path: 'livemap/:id',
        component: LivemapLoteamento
    },
    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: '',
                redirectTo: 'admin/login',
                pathMatch: 'full'
            },
            {
                path: 'admin/login',
                component: AdminLogin,
            },
            {
                path: 'admin',
                component: AdminContainer,
                children: [
                    {
                        path: 'dashboard',
                        component: AdminInicio,
                    },
                    {
                        path: 'usuarios',
                        children: [
                            {
                                path: 'consultar',
                                component: UsuariosConsultar
                            },
                            {
                                path: 'form',
                                component: UsuariosForm
                            },
                            {
                                path: '',
                                redirectTo: 'consultar',
                                pathMatch: 'full'
                            }
                        ]
                    },
                    {
                        path: 'loteamentos',
                        children: [
                            {
                                path: 'consultar',
                                component: LoteamentosConsultar
                            },
                            {
                                path: 'form',
                                component: LoteamentosForm
                            },
                            {
                                path: 'lotes-importar',
                                component: LotesImportar
                            },
                            {
                                path: 'lotes-mapa-virtual',
                                component: LotesMapaVirtual
                            },
                            {
                                path: 'lotes/consultar',
                                component: LoteamentosLote
                            },
                            {
                                path: '',
                                redirectTo: 'consultar',
                                pathMatch: 'full'
                            }
                        ]
                    },
                    {
                        path: 'reservas',
                        children: [
                            {
                                path: 'consultar',
                                component: ReservasConsultar
                            },
                            {
                                path: 'operar',
                                component: ReservasNovaReserva
                            },
                            {
                                path: 'visualizar',
                                component: ReservasVisualizar
                            },
                            {
                                path: '',
                                redirectTo: 'consultar',
                                pathMatch: 'full'
                            }
                        ]
                    },
                    {
                        path: 'logoff',
                        component: Logoff
                    },
                ]
            },
        ]
    },
];