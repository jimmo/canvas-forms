// Enum to represent the two axes.
// Used for some constraints that must apply to coordinates on the same axis.
export enum CoordAxis {
  X = 1,
  Y,
};

// Different types of coordinates.
export enum CoordType {
  A = 1,  // X,Y      (i.e. left/top edge, relative to parent left/top)
  B,      // W,H      (i.e. width/height)
  C,      // X2,Y2    (i.e. right/bottom edge, relative to parent right/bottom)
  D,      // XW, YH   (i.e. right/bottom edge, relative to parent left/top)
  E,      // X2W, Y2H (i.e. left/top edge, relative to parent right/bottom)
};

// Represents a CoordType on a CoordAxis.
export class Coord {
  name: string;
  private constructor(readonly axis: CoordAxis, readonly type: CoordType) {
    this.name = this.toString();
  }

  isParentDependent() {
    return (this.type === CoordType.C || this.type === CoordType.E);
  }

  toString() {
    if (this.axis === CoordAxis.X) {
      return { 1: 'X', 2: 'W', 3: 'X2', 4: 'XW', 5: 'X2W' }[this.type];
    } else if (this.axis === CoordAxis.Y) {
      return { 1: 'Y', 2: 'H', 3: 'Y2', 4: 'YH', 5: 'Y2H' }[this.type];
    } else {
      return '?';
    }
  }

  equals(rhs: Coord) {
    return this.axis === rhs.axis && this.type === rhs.type;
  }

  static create(axis: CoordAxis, type: CoordType): Coord {
    for (const c of Coord.All) {
      if (c.axis === axis && c.type === type) {
        return c;
      }
    }
    throw new Error('Unknown axis/type combination.');
  }

  // All the different ways that a control's layout can be specified.
  // Any two on the same axis are enough to specify that axis (other than x2+xw or x+x2w).
  static X = new Coord(CoordAxis.X, CoordType.A);
  static Y = new Coord(CoordAxis.Y, CoordType.A);
  static W = new Coord(CoordAxis.X, CoordType.B);
  static H = new Coord(CoordAxis.Y, CoordType.B);
  static X2 = new Coord(CoordAxis.X, CoordType.C);
  static Y2 = new Coord(CoordAxis.Y, CoordType.C);
  static XW = new Coord(CoordAxis.X, CoordType.D);
  static YH = new Coord(CoordAxis.Y, CoordType.D);
  static X2W = new Coord(CoordAxis.X, CoordType.E);
  static Y2H = new Coord(CoordAxis.Y, CoordType.E);

  private static All = [
    Coord.X, Coord.Y, Coord.W, Coord.H, Coord.X2, Coord.Y2, Coord.XW, Coord.YH, Coord.X2W, Coord.Y2H
  ];
}
