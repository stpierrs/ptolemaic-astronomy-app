// Feature 5: Constellation Overlay
// Draws IAU constellation stick figures on a 2D canvas overlay over #feCanvas.
// Uses the same polar AE coordinate system as the starfield chart.
//
// Coordinate mapping (polar AE):
//   centre = NCP (dec = +90), edge = SCP (dec = -90)
//   r = (90 - dec) / 180    (0 at NCP, 1 at SCP)
//   angle = RA in radians (RA 0h = right, increases counter-clockwise when
//           viewed from outside, so we negate for canvas X rotation)

// Constellation data: arrays of [ra_deg, dec_deg] forming polylines.
// Each constellation is an object { name, lines: [[ra,dec],[ra,dec],...] }.
// A new polyline starts where an inner array ends with null.
// We encode as an array-of-segments: each segment is a list of [ra,dec] points.
const CONST_DATA = [
  { name: 'Orion', segs: [
    [[83.82,  -1.94], [81.57,  6.35], [79.17,  2.00], [74.64,  1.19], [72.46, -8.20], [67.21,-19.00]],
    [[83.82,  -1.94], [88.79,  7.41]],
    [[83.82,  -1.94], [84.05,-5.91]],
    [[84.05, -5.91],  [83.00,-9.67], [78.63,-13.51], [74.65,-17.82], [67.21,-19.00]],
    [[84.05, -5.91],  [88.39,-8.36]],
    [[74.64,  1.19],  [72.46,-8.20]],
    [[81.57,  6.35],  [79.17, 2.00]],
    [[88.79,  7.41],  [94.14,22.51]],
  ]},
  { name: 'Ursa Major', segs: [
    [[165.93,61.75],[178.46,53.69],[178.46,53.69],[183.86,57.03],[183.86,57.03],[193.51,55.96],[193.51,55.96],[200.98,54.93]],
    [[200.98,54.93],[206.89,49.31],[206.89,49.31],[210.96,49.63]],
    [[210.96,49.63],[213.91,56.38]],
    [[213.91,56.38],[218.78,54.93]],
    [[206.89,49.31],[205.00,46.00]],
    [[165.93,61.75],[152.09,61.75]],
    [[152.09,61.75],[143.50,59.03]],
    [[143.50,59.03],[137.32,56.38]],
    [[137.32,56.38],[134.80,48.04]],
    [[134.80,48.04],[143.50,59.03]],
  ]},
  { name: 'Cassiopeia', segs: [
    [[2.29, 59.15],[14.18,60.72],[21.45,56.54],[28.60,63.67],[40.51,56.54]],
  ]},
  { name: 'Leo', segs: [
    [[152.09,19.84],[154.99,23.77],[154.99,23.77],[158.51,26.00],[158.51,26.00],[168.53,15.43],[168.53,15.43],[177.26,14.57],[177.26,14.57],[177.67,20.52]],
    [[158.51,26.00],[168.53,15.43]],
    [[168.53,15.43],[174.18,11.97]],
    [[174.18,11.97],[177.26,14.57]],
  ]},
  { name: 'Scorpius', segs: [
    [[240.08,-22.62],[241.36,-28.22],[242.99,-29.83],[244.58,-15.72],[246.35,-26.11],[247.55,-37.10]],
    [[247.55,-37.10],[249.72,-34.29],[253.08,-37.30],[255.98,-29.22],[260.22,-25.01],[263.40,-37.10]],
    [[263.40,-37.10],[266.90,-40.13],[266.90,-40.13],[267.46,-32.35]],
  ]},
  { name: 'Cygnus', segs: [
    [[310.36,45.28],[318.23,38.04],[327.32,35.08],[345.68,41.17]],
    [[318.23,38.04],[319.65,27.96]],
    [[304.51,33.97],[318.23,38.04],[332.00,46.86]],
  ]},
  { name: 'Taurus', segs: [
    [[68.98,18.50],[65.73,21.14],[63.50,28.61],[56.87,24.11],[60.17,24.37]],
    [[68.98,18.50],[66.94,15.87],[68.50,8.89]],
    [[88.79,7.41],[79.17,5.62],[68.98,18.50]],
  ]},
  { name: 'Gemini', segs: [
    [[113.65,31.88],[106.03,25.13],[100.98,25.00],[94.14,22.51]],
    [[116.33,28.03],[108.50,24.50],[100.98,25.00]],
    [[106.03,25.13],[103.20,22.51],[98.00,23.78],[94.14,22.51]],
  ]},
  { name: 'Perseus', segs: [
    [[51.08,49.86],[50.36,40.01],[51.53,33.16],[56.87,33.16],[59.46,35.79]],
    [[56.87,33.16],[58.53,28.08],[63.50,28.61]],
    [[51.08,49.86],[45.00,53.50],[43.56,49.23]],
  ]},
  { name: 'Boötes', segs: [
    [[213.91,19.18],[210.96,38.31],[213.58,40.40],[220.48,40.39],[222.68,37.37]],
    [[213.91,19.18],[218.01,13.73]],
    [[213.58,40.40],[216.55,44.46]],
    [[210.96,38.31],[208.67,47.71]],
  ]},
  { name: 'Virgo', segs: [
    [[201.29,-11.16],[204.37,-11.16],[202.00,0.0],[192.50,10.96],[186.00,1.77],[181.36,6.42],[177.67,20.52]],
    [[202.00,0.0],[198.80,-16.00],[194.00,-10.27]],
  ]},
  { name: 'Aquarius', segs: [
    [[325.02,-15.82],[322.89,-9.09],[311.92,-9.09],[304.51,-0.02],[299.12,-11.17]],
    [[311.92,-9.09],[310.36,-14.04]],
    [[304.51,-0.02],[303.87,2.07]],
    [[303.87,2.07],[300.00,-8.00],[299.12,-11.17]],
  ]},
  { name: 'Capricornus', segs: [
    [[302.83,-17.81],[304.51,-12.54],[306.41,-14.78],[308.54,-14.78],[316.38,-16.76],[321.66,-16.66],[325.02,-15.82]],
    [[302.83,-17.81],[300.00,-22.00],[302.83,-17.81]],
  ]},
  { name: 'Sagittarius', segs: [
    [[274.40,-36.76],[275.25,-29.83],[276.99,-34.38],[278.05,-26.30],[276.99,-34.38]],
    [[275.25,-29.83],[278.05,-26.30],[283.82,-21.01],[286.74,-27.67]],
    [[278.05,-26.30],[271.45,-25.42],[268.38,-29.88],[271.45,-25.42],[274.40,-36.76]],
    [[283.82,-21.01],[285.65,-29.88]],
  ]},
  { name: 'Lyra', segs: [
    [[279.23,38.78],[282.52,33.36],[283.62,36.90],[284.73,33.50],[282.52,33.36]],
    [[279.23,38.78],[280.90,39.61]],
  ]},
  { name: 'Andromeda', segs: [
    [[2.10,29.09],[8.53,35.62],[17.43,35.62],[26.02,36.79],[30.86,46.46],[34.00,42.33]],
    [[8.53,35.62],[10.00,45.40]],
  ]},
  { name: 'Hercules', segs: [
    [[247.55,21.49],[255.07,31.60],[258.76,36.81],[263.73,31.35],[258.76,36.81]],
    [[258.76,36.81],[255.07,40.39],[255.07,31.60]],
    [[247.55,21.49],[250.32,14.39],[255.07,14.83],[260.43,22.38]],
    [[260.43,22.38],[263.73,31.35]],
  ]},
  { name: 'Aries', segs: [
    [[28.66,20.81],[26.02,20.30],[14.18,27.26],[9.94,23.46]],
  ]},
  { name: 'Pisces', segs: [
    [[30.86,15.18],[26.02,8.19],[18.00,8.00],[8.61,7.89],[356.65,12.17],[353.72,7.58],[351.80,15.35]],
    [[351.80,15.35],[348.63,15.35],[347.00,24.58]],
  ]},
  { name: 'Libra', segs: [
    [[229.25,-9.38],[229.25,-16.04],[222.69,-16.04],[218.78,-25.28],[229.25,-16.04]],
    [[222.69,-16.04],[221.56,-6.00],[229.25,-9.38]],
  ]},
];

function raDecToXY(raDeg, decDeg, cx, cy, radius, rotRad) {
  const r = ((90 - decDeg) / 180) * radius;
  // RA 0 = East on chart; increase CCW. Rotate by sidereal time (negative = CW in canvas).
  const angle = (raDeg * Math.PI / 180) + rotRad;
  return [
    cx + r * Math.cos(angle),
    cy + r * Math.sin(angle),
  ];
}

export class ConstellationOverlay {
  constructor(canvas, model) {
    this._canvas = canvas;
    this._model  = model;
    this._ctx    = canvas.getContext('2d');

    this._resizeObserver = new ResizeObserver(() => this._resize());
    const parent = canvas.parentElement;
    if (parent) this._resizeObserver.observe(parent);
    this._resize();

    model.addEventListener('update', () => this._draw());
    this._draw();
  }

  _resize() {
    const parent = this._canvas.parentElement;
    if (!parent) return;
    this._canvas.width  = parent.clientWidth;
    this._canvas.height = parent.clientHeight;
    this._draw();
  }

  _draw() {
    const model = this._model;
    // Only draw when stars are shown AND the user is in the overhead disc view.
    // In InsideVault (optical / first-person dome) mode the flat polar-AE canvas
    // renders as a warped 2D disc pasted over the 3D hemisphere — hide it there.
    // Constellations in first-person mode would require a 3D ShaderMaterial pass
    // (same approach as StarfieldChart.localMesh) — that's a future enhancement.
    if (model.state.ShowStars === false || model.state.InsideVault) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      return;
    }

    const W = this._canvas.width;
    const H = this._canvas.height;
    const ctx = this._ctx;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.48;

    // Sidereal rotation angle from model
    const skyRotDeg = (model.computed && model.computed.SkyRotAngle) ? model.computed.SkyRotAngle : 0;
    const rotRad = skyRotDeg * Math.PI / 180;

    ctx.save();

    // Clip to disc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(160, 200, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const con of CONST_DATA) {
      for (const seg of con.segs) {
        if (seg.length < 2) continue;
        ctx.beginPath();
        let first = true;
        for (const [ra, dec] of seg) {
          const [x, y] = raDecToXY(ra, dec, cx, cy, radius, rotRad);
          if (first) { ctx.moveTo(x, y); first = false; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Label constellation names at first star of first segment
    ctx.fillStyle = 'rgba(180, 210, 255, 0.45)';
    ctx.font = `${Math.max(9, Math.round(radius * 0.028))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const con of CONST_DATA) {
      if (!con.segs.length || !con.segs[0].length) continue;
      const [ra0, dec0] = con.segs[0][0];
      const [lx, ly] = raDecToXY(ra0, dec0, cx, cy, radius, rotRad);
      ctx.fillText(con.name, lx, ly - 8);
    }

    ctx.restore();
  }

  destroy() {
    this._resizeObserver.disconnect();
  }
}
