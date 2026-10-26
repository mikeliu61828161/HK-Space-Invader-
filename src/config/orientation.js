// Rotation (degrees, clockwise) needed so each source image's nose points DOWN the screen.
// Source art is drawn with different nose directions, so one fixed angle does not fit all.
export const FACE_DOWN_ANGLE = {
  invader1: 180, // nose up
  invader2: 90,  // nose right
  invader3: -90, // nose left
  invader4: 0,   // already faces down
  invader5: 180, // code-drawn F-35, nose up
  boss1: -90,    // nose left
  boss2: 180,    // nose up
  boss3: -90,    // nose left
  boss4: 180,    // nose up
};
