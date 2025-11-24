import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'phone'
})

export class PhonePipe implements PipeTransform {
    transform(value: number, args?: any): any {
        if (!value) {
            return value;
        }
        let val = value.toString().replace(/\D/g, '');

        if (val.length === 11) {
            val = val.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (val.length === 10) {
            val = val.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }


        return val;
    }
}