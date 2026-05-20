// AR sky projection — extracted from arOverlay.js for testability +
// landscape-mode correctness. Pure functions, no DOM. Used by
// js/ui/arOverlay.js to convert a body's horizontal coordinates
// (alt, az) into screen-pixel coordinates given the device's current
// pose (yaw, pitch, roll) and the camera FOV.
//
// All angles are in **degrees** unless suffixed with `Rad`.
//
// Coordinate conventions:
//   • Azimuth (`az`): degrees clockwise from North (0° = N, 90° = E).
//   • Elevation (`alt`): degrees above the horizon, +90° = zenith.
//   • Device yaw: same convention as az — degrees clockwise from
//     North, telling us which way the back camera faces.
//   • Device pitch: degrees the camera's optical axis sits above the
//     horizon. +90° = pointing straight up. The `deviceorientation`
//     event's `beta` field is **device-frame** pitch (90° = upright,
//     0° = flat-on-table), so the caller converts beta → pitch via
//     `pitch = 90 - beta` (clamped to ±90).
//   • Device roll: rotation about the optical axis. `deviceorientation`
//     `gamma` ≈ roll for portrait-held phones. Landscape orientation
//     adds ±90° depending on which side is up.
//   • Screen origin (0, 0) = top-left.
//
// The projection treats the camera as a pinhole with FOV_H horizontal
// degrees across the visible width. fovV is derived from fovH and the
// viewport aspect ratio.

'use strict';

const DEG = Math.PI / 180;

/**
 * Project a body at (alt, az) onto the screen for a given device pose
 * and viewport. Returns `null` when the body is behind the camera or
 * outside the visible frustum (so the caller can short-circuit drawing).
 *
 * @param {number} altDeg    — body elevation above horizon (degrees)
 * @param {number} azDeg     — body azimuth, deg CW from N
 * @param {{yaw:number, pitch:number, roll:number}} view — device pose (deg)
 * @param {number} fovHDeg   — horizontal FOV of the camera (deg)
 * @param {number} screenW   — viewport width in CSS px
 * @param {number} screenH   — viewport height in CSS px
 * @param {object} [opts]    — { padDeg: 0 } — accept bodies this many
 *                              degrees beyond the frustum so labels at
 *                              the edge stay smooth.
 * @returns {{x:number, y:number} | null}
 */
function project(altDeg, azDeg, view, fovHDeg, screenW, screenH, opts) {
  if (!Number.isFinite(altDeg) || !Number.isFinite(azDeg)) return null;
  const pad = (opts && opts.padDeg) || 0;
  const aspect = screenW / Math.max(1, screenH);

  // ENU frame: x = east, y = up, z = north
  const ca = Math.cos(altDeg * DEG), sa = Math.sin(altDeg * DEG);
  const cz = Math.cos(azDeg  * DEG), sz = Math.sin(azDeg  * DEG);
  const vEast  = ca * sz;
  const vUp    = sa;
  const vNorth = ca * cz;

  // Rotate ENU vector into camera frame by un-applying yaw, then pitch,
  // then roll. We want the camera's optical axis to align with +Z_cam
  // (looking through the screen), x_cam = right, y_cam = up.
  //
  // Step 1 — un-yaw around the world up axis. Camera yaw = deviceAz.
  // After this rotation, "ahead of the camera" is +Z_world.
  const yaw = view.yaw * DEG;
  const cY  = Math.cos(yaw), sY = Math.sin(yaw);
  const x1 = vEast  * cY - vNorth * sY;
  const z1 = vEast  * sY + vNorth * cY;
  const y1 = vUp;

  // Step 2 — un-pitch around the camera's right axis (x_cam). Camera
  // pitch = how far above the horizon the optical axis tilts.
  const pitch = view.pitch * DEG;
  const cP    = Math.cos(pitch), sP = Math.sin(pitch);
  const y2 =  y1 * cP - z1 * sP;
  const z2 =  y1 * sP + z1 * cP;
  const x2 = x1;

  // Step 3 — un-roll around the camera's optical axis (z_cam).
  const roll = (view.roll || 0) * DEG;
  const cR   = Math.cos(roll), sR = Math.sin(roll);
  const x3 =  x2 * cR + y2 * sR;
  const y3 = -x2 * sR + y2 * cR;
  const z3 = z2;

  if (z3 <= 0) return null; // behind camera

  // Pinhole projection. tx, ty are in normalized tan-space.
  const tx = x3 / z3;
  const ty = y3 / z3;
  const tanH = Math.tan(fovHDeg / 2 * DEG);
  const fovVDeg = 2 * Math.atan(tanH / aspect) / DEG;
  const tanV = Math.tan(fovVDeg / 2 * DEG);

  const padTanH = tanH * (1 + pad / fovHDeg);
  const padTanV = tanV * (1 + pad / fovVDeg);
  if (Math.abs(tx) > padTanH) return null;
  if (Math.abs(ty) > padTanV) return null;

  return {
    x: screenW * (0.5 + 0.5 * tx / tanH),
    y: screenH * (0.5 - 0.5 * ty / tanV),
  };
}

/**
 * Cheap pre-cull: spherical distance from the camera's look-at direction
 * to the body, in degrees. Used to filter a 5000-star catalog down to
 * the ~200 that are even potentially visible before doing the projection
 * math. Returns Infinity for malformed inputs so the caller drops them.
 */
function angularDistance(altDeg, azDeg, lookAltDeg, lookAzDeg) {
  if (!Number.isFinite(altDeg) || !Number.isFinite(azDeg)) return Infinity;
  const a1 = altDeg * DEG, a2 = lookAltDeg * DEG;
  const dA = (azDeg - lookAzDeg) * DEG;
  const c = Math.sin(a1) * Math.sin(a2)
          + Math.cos(a1) * Math.cos(a2) * Math.cos(dA);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

/**
 * Convert a `deviceorientation` event (intrinsic ZXY: alpha, beta, gamma
 * in degrees, per W3C spec) into a camera pose. The phone's back camera
 * looks along the +Y axis when held in portrait with the screen facing
 * you; we map the device frame to the world frame as follows:
 *
 *   alpha = compass yaw (CCW from North in W3C; convert to CW)
 *   beta  = front-back tilt: 0 = flat face-up, 90 = upright, 180 = face-down
 *   gamma = left-right roll: 0 = level, ±90 = on the side
 *
 * In landscape the screen is rotated 90° from portrait, so the "right"
 * direction of the camera frame swaps with "up". `screenOrientationDeg`
 * accounts for that: 0 portrait, 90 landscape-left, 180 portrait-upside,
 * 270 landscape-right.
 *
 * @returns {{yaw:number, pitch:number, roll:number}} all in degrees
 */
function poseFromDeviceOrientation(alpha, beta, gamma, screenOrientationDeg) {
  // Treat null / undefined as 0 — keeps the projection running when only
  // partial data arrives (e.g. iOS gives gamma but not alpha until the
  // compass calibrates).
  const a = Number.isFinite(alpha) ? alpha : 0;
  const b = Number.isFinite(beta)  ? beta  : 90;
  const g = Number.isFinite(gamma) ? gamma : 0;
  const ori = ((screenOrientationDeg || 0) % 360 + 360) % 360;

  // Yaw — compass. W3C `alpha` is CCW from north; az convention is CW.
  // Subtract the screen-orientation offset so landscape-mode yaw still
  // tells us where the camera (which has rotated with the screen) points.
  const yaw = ((360 - a - ori) % 360 + 360) % 360;

  // Pitch — how far above horizon the camera's optical axis tilts.
  // beta = 90 → camera horizontal → pitch = 0. beta = 0 → phone flat,
  // camera looks straight up → pitch = 90. Clamp to [-90, 90].
  // In landscape, the camera tips around a different axis; gamma carries
  // some of the pitch. Combine via a small-angle blend.
  let pitch;
  if (ori === 90 || ori === 270) {
    // landscape — gamma is the dominant pitch axis
    pitch = ori === 90 ? -g : g;
    // beta still contributes if the device is tilted forward/back
    pitch += (90 - b) * Math.sin((g * DEG));
  } else {
    pitch = 90 - b;
  }
  pitch = Math.max(-90, Math.min(90, pitch));

  // Roll — rotation about the optical axis. Portrait: gamma. Landscape:
  // beta − 90 (the screen is now "tilting" along what used to be the
  // pitch axis). Wraps to ±90.
  let roll;
  if (ori === 90 || ori === 270) {
    roll = (ori === 90 ? 1 : -1) * (b - 90);
  } else {
    roll = g;
  }
  roll = Math.max(-90, Math.min(90, roll));

  return { yaw, pitch, roll };
}

export { project, angularDistance, poseFromDeviceOrientation, DEG };
