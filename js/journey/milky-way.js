import * as THREE from 'three';
import { spaceNoise } from './surfaces.js?v=20261025d';
// A barred-spiral illustration: two prominent arms, fainter branches, a thin
// stellar disk, a thick central bulge and patchy absorbing dust lanes.
export function buildMilkyWay(particles,random,glow){
 const g=new THREE.Group(),rand=random(421),p=[],c=[],sizes=[],color=new THREE.Color();
 const normal=()=>Math.sqrt(-2*Math.log(Math.max(.0001,rand())))*Math.cos(rand()*Math.PI*2);
 for(let i=0;i<105000;i++){
  const kind=rand();let x,y,z,r,a;
  if(kind<.16){x=normal()*22;z=normal()*5;y=normal()*3;color.setHSL(.1,.28,.55+rand()*.22);}
  else if(kind<.28){r=Math.pow(rand(),1.6)*30;a=rand()*Math.PI*2;x=Math.cos(a)*r;z=Math.sin(a)*r;y=normal()*7*(1-r/34);color.setHSL(.11,.2,.48+rand()*.22);}
  else{r=22+Math.sqrt(rand())*120;const arm=rand()<.75?(i%2)*Math.PI:(i%2)*Math.PI+Math.PI/2;
   a=arm+Math.log(r/28)*2.3+normal()*(.09+r*.0008);if(kind>.85)a=rand()*Math.PI*2;
   x=Math.cos(a)*r;z=Math.sin(a)*r;y=normal()*(1.1+r*.009);color.setHSL(.57+rand()*.12,.18+rand()*.2,.38+rand()*.32);}
  p.push(x,y,z);c.push(color.r,color.g,color.b);sizes.push(.12+Math.pow(rand(),3)*.62);
 }
 g.add(particles(p,c,sizes,{size:1.25,opacity:.85}));
 const haze=new THREE.Mesh(new THREE.PlaneGeometry(310,310),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uOpacity:{value:.7}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float uOpacity;${spaceNoise}
 void main(){vec2 p=(vUv-.5)*310.;float r=length(p),a=atan(p.y,p.x);float phase=a-log(max(r,15.)/28.)*2.3;float arms=pow(.5+.5*cos(phase*2.+(fbm(vec3(p*.045,7.))-.5)*.7),8.);float branches=pow(.5+.5*cos(phase*2.+3.14),14.)*.3;float cloud=fbm(vec3(p*.09,2.)),fine=fbm(vec3(p*.35,3.));float taper=1.-smoothstep(105.,150.,r);float disk=(.035+(arms+branches)*.65)*taper*smoothstep(15.,30.,r);float bar=exp(-p.x*p.x/750.-p.y*p.y/45.);float bulge=exp(-r*r/280.);float lane=pow(.5+.5*cos(phase*2.+.3+cloud*.3),22.)*smoothstep(22.,50.,r);float density=(disk*(.3+cloud)*(.4+fine)+bar*.25+bulge*.35)*(1.-lane*.83);vec3 tint=mix(vec3(.27,.39,.61),vec3(.95,.65,.35),exp(-r*r/1400.));gl_FragColor=vec4(tint,min(1.,density*1.7)*uOpacity);}`}));haze.rotation.x=-Math.PI/2;g.add(haze);
 const core=glow(0xffd6a4,34,.22);core.position.y=.2;g.add(core);
 for(let i=0;i<35;i++){const r=40+rand()*95,a=i%2*Math.PI+Math.log(r/28)*2.3+(rand()-.5)*.16;const knot=glow(i%3?0x8caafa:0xe375a0,3+rand()*5,.13);knot.position.set(Math.cos(a)*r,1,Math.sin(a)*r);g.add(knot);}
 return g;
}
