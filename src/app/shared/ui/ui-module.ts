import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { CpfCnpjPipe } from '../pipes/cpf-cnpj.pipe';
import { NgxMaskDirective } from 'ngx-mask';
import { NgxCurrencyDirective } from 'ngx-currency';
import { MoneyBrlPipe } from '../pipes/money-brl.pipe';
import { DateSimplePipe } from '../pipes/date-simple.pipe';
import { PhonePipe } from '../pipes/phone.pipe';
import { RenderAcessoPipe } from '../pipes/render-acesso.pipe';
import { UserInfoPipe } from '../pipes/user-info.pipe';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    RouterOutlet,
    NgbAlert,
    CpfCnpjPipe,
    MoneyBrlPipe,
    DateSimplePipe,
    PhonePipe,
    RenderAcessoPipe,
    UserInfoPipe,
    NgxMaskDirective,
    NgxCurrencyDirective
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    RouterOutlet,
    NgbAlert,
    CpfCnpjPipe,
    MoneyBrlPipe,
    DateSimplePipe,
    PhonePipe,
    RenderAcessoPipe,
    UserInfoPipe,
    NgxMaskDirective,
    NgxCurrencyDirective
  ],
})
export class UiModule { }
