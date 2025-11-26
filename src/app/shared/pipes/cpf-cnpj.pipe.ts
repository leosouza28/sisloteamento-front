import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'cpfCnpj'
})

export class CpfCnpjPipe implements PipeTransform {
    transform(value?: string, args?: any): any {
        if (!value) {
            return value;
        }
        let val = value || '';

        // se val conter alguma letra
        if (val.match(/[a-zA-Z]/)) {
            return val;
        } else {
            val = val.toString().replace(/\D/g, '');
        }

        if (val.length == 11) {
            // CPF mask: 000.000.000-00
            val = val.replace(/(\d{3})(\d)/, '$1.$2');
            val = val.replace(/(\d{3})(\d)/, '$1.$2');
            val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else if (val.length > 11 && val.length <= 14) {
            // CNPJ mask: 00.000.000/0000-00
            val = val.replace(/(\d{2})(\d)/, '$1.$2');
            val = val.replace(/(\d{3})(\d)/, '$1.$2');
            val = val.replace(/(\d{3})(\d{1,4})$/, '$1/$2');
            val = val.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        } else {
            val = val;
        }

        if (val == '' || val == null) return 'Não informado';
        return val;
    }
}