import test from 'node:test';
import assert from 'node:assert/strict';
import {clockRatio,horizonKm,CINEMA_RATIO,smoothJourney} from '../js/journey/relativity.js';
test('hovering clocks slow towards the horizon and recover far away',()=>{
 assert.ok(clockRatio(1.02)>clockRatio(3));
 assert.ok(Math.abs(clockRatio(3)-Math.sqrt(1.5))<1e-12);
 assert.ok(Math.abs(clockRatio(1e9)-1)<1e-8);
 for(const radius of [0,1,-1,NaN,Infinity])assert.throws(()=>clockRatio(radius),RangeError);
});
test('mass changes horizon size; cinematic preset is seven years per hour',()=>{
 assert.equal(horizonKm(1000),2953.25);
 assert.equal(horizonKm(1e6)/horizonKm(1000),1000);
 assert.equal(CINEMA_RATIO/24/365.25,7);
});
test('journeys are bounded, monotonic and start and finish at rest',()=>{
 assert.equal(smoothJourney(-1),0);assert.equal(smoothJourney(2),1);
 for(let i=1;i<=100;i++)assert.ok(smoothJourney(i/100)>=smoothJourney((i-1)/100));
 assert.ok(smoothJourney(.001)/.001<.0001);
 assert.ok((1-smoothJourney(.999))/.001<.0001);
});
