import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'userInfo'
})

export class UserInfoPipe implements PipeTransform {
    transform(value: any, args?: any): any {
        let val = "";
        if (!value?._id) {
            val = 'Não informado';
        } else {
            val = `${value?.nome}`;
        }
        if (!!value?.cpf_cnpj) val += ` (${value?.cpf_cnpj})`;


        if (!!value && args == '+convidado_retirada') {
            if (!!value?.nome_retirada && !!value?.cpf_retirada) {
                val = '';
                val += `${value.nome_retirada} (${value.cpf_retirada})`;
                if (!!value?.telefone_retirada) {
                    val += ` - ${value.telefone_retirada}`;
                }
            } else {
                val = 'Não definido';
            }
        }


        return val;
    }
}