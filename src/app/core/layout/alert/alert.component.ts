import { Component, inject, isDevMode, signal } from '@angular/core';
import { Alert, AlertService } from '../../services/alert.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-alert',
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent {
  private alertService = inject(AlertService);
  alerts = signal<Alert[]>([]);
  removingAlerts = signal<Set<Alert>>(new Set());

  constructor() {
    this.alertService.alerts$.subscribe((alert) => {
      if (isDevMode()) console.log('Alert received:', alert);
      this.alerts.update(alerts => [...alerts, alert]);
      setTimeout(() => this.removeAlert(alert), 3000); // auto dismiss after 3s
    });
  }

  removeAlert(alert: Alert) {
    this.removingAlerts.update(removing => {
      const newSet = new Set(removing);
      newSet.add(alert);
      return newSet;
    });
    
    setTimeout(() => {
      this.alerts.update(alerts => alerts.filter(a => a !== alert));
      this.removingAlerts.update(removing => {
        const newSet = new Set(removing);
        newSet.delete(alert);
        return newSet;
      });
    }, 300); // tempo da animação
  }

  isRemoving(alert: Alert): boolean {
    return this.removingAlerts().has(alert);
  }
}
