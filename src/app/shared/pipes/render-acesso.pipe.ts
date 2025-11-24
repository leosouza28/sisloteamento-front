import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
    name: 'renderAcesso'
})
export class RenderAcessoPipe implements PipeTransform {
    transform(value: string[], args?: any): any {
        let arr = (value || []).join(', ');
        return arr.toLocaleLowerCase();
    }
}