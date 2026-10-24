// Stationary clock outside a non-rotating (Schwarzschild) black hole.
// The cinematic preset is deliberately separate from this teaching model.
export function clockRatio(radiusInHorizons){
  if(!Number.isFinite(radiusInHorizons)||radiusInHorizons<=1)throw new RangeError('The clock must be outside the horizon.');
  return 1/Math.sqrt(1-1/radiusInHorizons);
}
export function horizonKm(solarMasses){return 2.95325*solarMasses;}
export const CINEMA_RATIO=7*365.25*24;
export function smoothJourney(t){t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);}
