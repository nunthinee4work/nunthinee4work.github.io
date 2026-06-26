import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-random-button',
  imports: [CommonModule],
  templateUrl: './random-button.html',
  styleUrl: './random-button.scss'
})
export class RandomButton {
  @Input() title = 'Generate';
  @Input() buttonClass = 'ms-3';
  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    this.clicked.emit();

  }
}
