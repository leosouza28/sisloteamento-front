import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';

export interface Alert {
    message: string;
    type: 'success' | 'warning' | 'danger';
}

export interface ConfirmOptions {
    titulo?: string;
    mensagem: string;
    textoBotaoConfirmar?: string;
    textoBotaoCancelar?: string;
    tipoConfirmacao?: 'primary' | 'danger' | 'warning' | 'success';
}

@Injectable({
    providedIn: 'root',
})
export class AlertService {
    private alertsSubject = new Subject<Alert>();
    alerts$ = this.alertsSubject.asObservable();

    showSuccess(message: string) {
        this.alertsSubject.next({ message, type: 'success' });
    }

    showWarning(message: string) {
        this.alertsSubject.next({ message, type: 'warning' });
    }

    showDanger(message: string) {
        this.alertsSubject.next({ message, type: 'danger' });
    }

}
