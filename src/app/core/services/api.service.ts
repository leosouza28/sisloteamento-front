import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { lastValueFrom, catchError, throwError, from, mergeMap } from 'rxjs';
import packageJson from '../../../../package.json';
import { SessaoService } from './sessao.service';
import { Router } from '@angular/router';
import { v4 } from 'uuid';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    public baseUrl: string;

    constructor(private http: HttpClient, private sessao: SessaoService, public router: Router) {
        this.baseUrl = environment.apiUrl;
    }

    back(navPath: string = ''): void {
        if (!!navPath) {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                this.router.navigate([navPath], { replaceUrl: true });
            }
        } else {
            window.history.back();
        }
    }

    async dry_get<T>(fullUrl: string, params?: HttpParams): Promise<any> {
        return lastValueFrom(
            this.http.get<T>(fullUrl, { params }).pipe(
                catchError(this.handleError)
            )
        );
    }
    async dry_post_file<T>(fullUrl: string, body: any, headers?: HttpHeaders): Promise<any> {
        return lastValueFrom(
            this.http.post<T>(fullUrl, body, { headers: this.getHeaders(headers) }).pipe(
                catchError(this.handleError)
            )
        );
    }

    // GET request
    async get<T>(endpoint: string, params?: HttpParams, headers?: HttpHeaders, responseType: any = 'json'): Promise<any> {
        let additionalParams = {};
        if (responseType != 'json') {
            additionalParams = {
                responseType: responseType,
                observe: 'response'
            }
        }
        let baseURL = this.baseUrl;
        return lastValueFrom(
            this.http.get<T>(`${baseURL}${endpoint}`, { params, ...additionalParams, headers: this.getHeaders(headers) }).pipe(
                catchError(this.handleError)
            )
        );
    }

    // POST request
    async post<T>(endpoint: string, body: any, headers?: HttpHeaders): Promise<any> {
        return lastValueFrom(
            this.http.post<T>(`${this.baseUrl}${endpoint}`, body, { headers: this.getHeaders(headers) }).pipe(
                catchError(this.handleError)
            )
        );
    }

    // PUT request
    async put<T>(endpoint: string, body: any, headers?: HttpHeaders, responseType: any = 'json'): Promise<any> {
        let additionalParams = {};
        if (responseType != 'json') {
            additionalParams = {
                responseType: responseType,
                observe: 'response'
            }
        }
        return lastValueFrom(
            this.http.put<T>(`${this.baseUrl}${endpoint}`, body, { headers: this.getHeaders(headers), ...additionalParams }).pipe(
                catchError(this.handleError)
            )
        );
    }

    // DELETE request
    async delete<T>(endpoint: string, params?: HttpParams, headers?: HttpHeaders): Promise<any> {
        return lastValueFrom(
            this.http.delete<T>(`${this.baseUrl}${endpoint}`, { params, headers: this.getHeaders(headers) }).pipe(
                catchError(this.handleError)
            )
        );
    }

    // PATCH request
    async patch<T>(endpoint: string, body: any, headers?: HttpHeaders): Promise<any> {
        return lastValueFrom(
            this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, { headers: this.getHeaders(headers) }).pipe(
                catchError(this.handleError)
            )
        );
    }

    // Error handler
    private handleError = (error: any) => {
        console.log('API Error:', error); // Log the error for debugging
        console.log('API Error.error:', error.error); // Log the error for debugging

        /** se veio como Blob e o servidor diz que é JSON */
        if (error?.error instanceof Blob &&
            error.error.type === 'application/json') {

            return from(error.error.text()).pipe(          // converte a Promise em Observable
                mergeMap((text: any) => {
                    let msg = 'Erro desconhecido';
                    try {
                        const json = JSON.parse(text);
                        msg = json?.message ?? msg;
                    } catch (_) { /* texto não era JSON */ }

                    return throwError(() => new Error(msg));   // devolve o erro já “traduzido”
                })
            );
        }
        let errorMessage = 'Ocorreu um erro inesperado.';
        if (!!error?.error?.message) {
            errorMessage = error.error.message;
        }
        if (error?.status == 403) {
            errorMessage = 'Você não tem permissão para acessar este recurso.';
        }

        if (errorMessage == 'Não autorizado') {
            if (window.location.pathname.indexOf('admin') > -1) {
                this.router.navigate(['/admin/logoff'])
            } else {
                this.router.navigate(['/'])
            }
            this.sessao.clearSession();
        }

        return throwError(() => new Error(errorMessage));
    }

    getHeaders(headers: HttpHeaders = new HttpHeaders()): HttpHeaders {
        let token = this.sessao.getToken();

        if (headers.get('authorization')) {

        } else if (!!token && !headers.get('authorization')) {
            headers = headers.append('authorization', token)
        }
        return headers;
    }

    // LogDev
    logDev(...args: any) {
        if (isDevMode()) console.log(...args);
    }

    getPackageVersion() {
        let version = '0.0.0';
        try {
            version = packageJson.version;
            this.logDev('Version:', version);
        } catch (error) {
            this.logDev('Error loading version:', error);
        }
        return version;
    }

    dividirPagamento(total: number, parcelas: number): number[] {
        const totalEmCentavos = Math.round(total * 100);
        const valorBase = Math.floor(totalEmCentavos / parcelas);
        const resto = totalEmCentavos % parcelas;

        const resultado: number[] = [];

        for (let i = 0; i < parcelas; i++) {
            let valorParcela = valorBase;
            if (i === 0) {
                valorParcela += resto; // Só a primeira recebe os centavos extras
            }
            resultado.push(valorParcela / 100); // Converte de volta para reais
        }

        return resultado;
    }

    isCpfValido(cpf: string): boolean {
        cpf = cpf.replace(/[^\d]/g, ''); // Remove caracteres não numéricos
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
            return false; // Verifica se o CPF tem 11 dígitos e não é uma sequência repetida
        }
        const calcularDigito = (base: string, pesoInicial: number): number => {
            let soma = 0;
            for (let i = 0; i < base.length; i++) {
                soma += parseInt(base[i]) * (pesoInicial - i);
            }
            const resto = soma % 11;
            return resto < 2 ? 0 : 11 - resto;
        };

        const baseCpf = cpf.slice(0, 9);
        const digito1 = calcularDigito(baseCpf, 10);
        const digito2 = calcularDigito(baseCpf + digito1, 11);

        return cpf === baseCpf + digito1.toString() + digito2.toString();
    }

    scrollTop() {
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 250);
    }

    delay(timer = 3000) {
        return new Promise(resolve => setTimeout(resolve, timer));
    }


    openReportWindow(htmlContent: string) {
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.open();
            reportWindow.document.write(htmlContent);
            reportWindow.document.close();
        } else {
            console.error('Não foi possível abrir uma nova janela para o relatório.');
        }
    }
    handleRelatorio(output: string, data: any, filename: string = v4()) {
        switch (output) {
            case 'html':
                let text = '';
                if (data instanceof Blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        text = event.target?.result as string;
                        this.openReportWindow(text);
                    };
                    reader.readAsText(data);
                } else {
                    text = data;
                    this.openReportWindow(text);
                }
                break;

            case 'pdf':
                const pdfBlob = new Blob([data], { type: 'application/pdf' });
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const pdfLink = document.createElement('a');
                pdfLink.href = pdfUrl;
                pdfLink.download = `${filename}.pdf`; // nome do arquivo baixado
                pdfLink.click();
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
                break;

            case 'xlsx':
                const xlsxBlob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const xlsxUrl = URL.createObjectURL(xlsxBlob);
                const xlsxLink = document.createElement('a');
                xlsxLink.href = xlsxUrl;
                xlsxLink.download = `${filename}.xlsx`; // nome do arquivo baixado
                xlsxLink.click();
                setTimeout(() => URL.revokeObjectURL(xlsxUrl), 1000);
                break;

            case 'csv':
                const csvBlob = new Blob([data], { type: 'text/csv' });
                const csvUrl = URL.createObjectURL(csvBlob);
                const csvLink = document.createElement('a');
                csvLink.href = csvUrl;
                csvLink.download = `${filename}.csv`; // nome do arquivo baixado
                csvLink.click();
                setTimeout(() => URL.revokeObjectURL(csvUrl), 1000);
                break;

            default:
                break;
        }
    }

    stringToColor(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            // Gera valor entre 180 e 240 para tons mais claros
            const value = 180 + (Math.abs((hash >> (i * 8)) & 0xff) % 60);
            color += ('00' + value.toString(16)).slice(-2);
        }
        return color;
    }
}