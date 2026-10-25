import * as THREE from 'three';
import { createLens } from './black-hole.js?v=20261025d';
import { ellipsePosition } from './orbits.js?v=20261025d';
import { makeRockyTexture } from '../textureFactory.js';
export const HORIZON_WORLDS=[
 {id:'tide',name:'Tide · ocean world',radius:6,orbit:88,color:0x4f94ad,angle:.35,e:.16,inclination:.09,apsis:.25},
 {id:'rime',name:'Rime · ice world',radius:7,orbit:145,color:0xc7e4f1,angle:2.5,e:.29,inclination:.23,apsis:1.1},
 {id:'haven',name:'Haven · rocky world',radius:6.5,orbit:208,color:0xc6a279,angle:4.4,e:.21,inclination:-.17,apsis:2.3}
];
export function buildHorizonSystem(){
 const group=new THREE.Group(),lens=createLens(235,{spatial:true});group.add(lens);
 const light=new THREE.PointLight(0xffd3a0,4,0,0);group.add(light);
 const bodies=[],selectable=[],orbits=[];
 for(const planet of HORIZON_WORLDS){
  const body=new THREE.Group();let material;
  if(planet.id==='tide')material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:'varying vec3 p,n;void main(){p=position;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p,n;uniform float uTime,uOpacity;void main(){float wave=sin(p.y*16.+sin(p.x*5.)+uTime*.6)*sin(p.z*11.-uTime*.3);float spec=pow(max(0.,dot(normalize(n),normalize(vec3(-.3,.5,1.)))),24.);vec3 c=mix(vec3(.015,.09,.14),vec3(.12,.34,.42),wave*.5+.5);c+=vec3(.65,.8,.86)*spec;gl_FragColor=vec4(c,uOpacity);}`});
  else material=new THREE.MeshStandardMaterial({map:makeRockyTexture({base:planet.id==='rime'?'#c0d6e0':'#ab896b',spots:planet.id==='rime'?['#eff9ff','#596c80','#a0bdce']:['#6d4e3a','#c5a27c','#9d7d5d'],seed:planet.id==='rime'?81:82}),roughness:.85});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(planet.radius,64,48),material);mesh.userData.horizon=planet.id;body.add(mesh);group.add(body);selectable.push(mesh);
  const points=Array.from({length:241},(_,i)=>new THREE.Vector3(...ellipsePosition(i/240*Math.PI*2,planet.orbit,planet.e,planet.inclination,planet.apsis)));
  const orbit=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xa89370,transparent:true,opacity:.19}));group.add(orbit);orbits.push(orbit);
  bodies.push({...planet,body,mesh});
 }
 function update(dt,moving){for(const b of bodies){if(moving){b.angle+=dt*.025*Math.pow(88/b.orbit,1.5);b.mesh.rotation.y+=dt*.06;}b.body.position.set(...ellipsePosition(b.angle,b.orbit,b.e,b.inclination,b.apsis));}}
 update(0,false);return {group,bodies,selectable,orbits,update};
}
