import { Component, inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.html',
})
export class ConfirmModalComponent {
  activeModal = inject(NgbActiveModal);

  @Input() title: string = 'Confirmar ação';
  @Input() message: string = 'Deseja confirmar esta ação?';

  confirm() {
    this.activeModal.close(true);
  }

  dismiss() {
    this.activeModal.dismiss(false);
  }
}
