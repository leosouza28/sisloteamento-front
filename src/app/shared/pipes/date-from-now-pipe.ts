import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

@Pipe({
  name: 'dateFromNow',
  standalone: true
})
export class DateFromNowPipe implements PipeTransform {

  transform(value: string | Date): string {
    if (!value) return '-';
    return dayjs(value).fromNow();
  }

}
