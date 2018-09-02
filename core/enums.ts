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
export class CoordData {
  constructor(readonly axis: CoordAxis, readonly type: CoordType) {
  }
}

// All the different ways that a control's layout can be specified.
// Any two on the same axis are enough to specify that axis (other than x2+xw or x+x2w).
export const Coord = {
  X: new CoordData(CoordAxis.X, CoordType.A),
  Y: new CoordData(CoordAxis.Y, CoordType.A),
  W: new CoordData(CoordAxis.X, CoordType.B),
  H: new CoordData(CoordAxis.Y, CoordType.B),
  X2: new CoordData(CoordAxis.X, CoordType.C),
  Y2: new CoordData(CoordAxis.Y, CoordType.C),
  XW: new CoordData(CoordAxis.X, CoordType.D),
  YH: new CoordData(CoordAxis.Y, CoordType.D),
  X2W: new CoordData(CoordAxis.X, CoordType.E),
  Y2H: new CoordData(CoordAxis.Y, CoordType.E),
};
