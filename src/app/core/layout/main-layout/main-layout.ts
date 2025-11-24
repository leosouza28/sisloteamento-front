import { Component } from '@angular/core';
import { UiModule } from '../../../shared/ui/ui-module';
import { AlertComponent } from '../alert/alert.component';

@Component({
  selector: 'app-main-layout',
  imports: [UiModule, AlertComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {

}
