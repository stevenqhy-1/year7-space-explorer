// Kepler ellipse, with its attracting body at a focus. Angles are radians.
export function ellipsePosition(mean,a,e=0,inclination=0,apsis=0){
 if(!Number.isFinite(mean)||a<=0||e<0||e>=1)throw new RangeError('Expected a bound elliptical orbit.');
 let E=mean%(2*Math.PI);for(let i=0;i<8;i++)E-=(E-e*Math.sin(E)-mean%(2*Math.PI))/(1-e*Math.cos(E));
 const x=a*(Math.cos(E)-e),z=a*Math.sqrt(1-e*e)*Math.sin(E),c=Math.cos(apsis),s=Math.sin(apsis);
 return [x*c-z*s,(x*s+z*c)*Math.sin(inclination),(x*s+z*c)*Math.cos(inclination)];
}
export function advanceOrbit(angle,days,period){return (angle+days*2*Math.PI/period)%(2*Math.PI);}
