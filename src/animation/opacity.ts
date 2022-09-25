import { Animator, Easing, EasingFunction } from './animator';
import { Control } from '../core';

// Animates a control's opacity.
export class OpacityAnimator extends Animator {
    constructor(control: Control, private readonly min: number, private readonly max: number, duration?: number, easing?: EasingFunction) {
        super([control], duration, easing);
    }

    update(t: number): void {
        this.controls[0].opacity = this.min + (this.max - this.min) * t;
        this.controls[0].repaint();
    }
};
