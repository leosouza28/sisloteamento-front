import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'moneyBrl'
})

export class MoneyBrlPipe implements PipeTransform {
    transform(value: number, args?: any): any {
        let val;
        if (value && !args) {
            val = value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).split("R$").join("");
        }
        if (!val) val = "0,00";
        return val;
    }
}