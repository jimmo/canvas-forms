import { Control } from '../core/control';
import { Coord } from '../core/enums';
import { Spacer } from '../controls/spacer';
import { CoordAxis } from '../core/enums';
import { StaticConstraint } from 'static';
import { AlignConstraint } from 'align';
import { FillConstraint } from 'fill';


export class CenterConstraint {
  constructor(control: Control, axis: CoordAxis) {
    const s1 = new Spacer();
    const s2 = new Spacer();
    control.parent.add(s1);
    control.parent.add(s2);
    if (axis === CoordAxis.X) {
      new StaticConstraint(s1, Coord.X, 0);
      new StaticConstraint(s2, Coord.X2, 0);
      new AlignConstraint(control, Coord.X, s1, Coord.XW);
      new AlignConstraint(control, Coord.XW, s2, Coord.X);
      new FillConstraint([s1, s2], Coord.W);
    } else if (axis === CoordAxis.Y) {
      new StaticConstraint(s1, Coord.Y, 0);
      new StaticConstraint(s2, Coord.Y2, 0);
      new AlignConstraint(control, Coord.Y, s1, Coord.YH);
      new AlignConstraint(control, Coord.YH, s2, Coord.Y);
      new FillConstraint([s1, s2], Coord.H);
    }
  }
}
