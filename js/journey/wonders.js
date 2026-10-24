import * as THREE from 'three';
import { createLens } from './black-hole.js';
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const noise=`float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}float fbm(vec3 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.07+3.1;a*=.48;}return v;}`;
function portrait(kind,width=60){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uOpacity:{value:1},kind:{value:kind}},vertexShader:vertex,fragmentShader:`precision highp float;varying vec2 vUv;uniform float uTime,uOpacity,kind;${noise}
 void main(){vec2 uv=(vUv-.5)*2.;float r=length(uv),a=atan(uv.y,uv.x);vec3 col=vec3(0.);float alpha=0.;
 if(kind<.5){ // curved, layered wormhole throat
   float lens=1./(r+.12);float n=fbm(vec3(uv*4.,uTime*.08));float threads=pow(.5+.5*sin(a*22.+lens*8.-uTime*.9+n*5.),8.);
   float rim=exp(-pow((r-.38)*35.,2.));float body=smoothstep(.22,.38,r)*(1.-smoothstep(.65,1.,r));
   col=(mix(vec3(.14,.4,1.),vec3(.8,.25,1.),n)*(.2+threads*.8)*body+vec3(.55,.8,1.4)*rim);alpha=clamp(max(col.r,max(col.g,col.b)),0.,1.);
 }else if(kind<3.5){ // 32-layer volume integration through turbulent gas
   for(int j=0;j<32;j++){float z=-1.+float(j)/16.;vec3 p=vec3(uv,z);float d=length(p),n=fbm(p*4.+vec3(0,uTime*.025,0));float density;
     if(kind<1.5)density=exp(-pow((d-.64-n*.17)*19.,2.))*(.2+pow(n,3.)*7.);
     else if(kind<2.5)density=max(0.,n-.39)*3.*exp(-d*d*2.5)*(1.+sin(p.y*4.+p.x*2.));
     else density=exp(-pow((length(vec2(length(p.xy)*.8,p.z*1.6))-.58-n*.12)*17.,2.))*(.3+n);
     vec3 tint=mix(vec3(.1,.32,.9),vec3(1.,.24,.12),smoothstep(.4,.7,n));if(kind>1.5&&kind<2.5)tint=mix(vec3(.04,.4,.65),vec3(.8,.15,.48),n);
     float sampleAlpha=clamp(density*.10,0.,.35);col+=(1.-alpha)*tint*sampleAlpha*2.;alpha+=(1.-alpha)*sampleAlpha;
   }
 }else{ // compact hot star, corona, tilted lighthouse beams
   float core=exp(-r*r*120.);float halo=exp(-r*8.)*.3;
   vec2 p=mat2(cos(.3),-sin(.3),sin(.3),cos(.3))*uv;
   float beam=exp(-abs(p.x)*70.)*exp(-abs(p.y)*2.)*(.35+.65*pow(.5+.5*sin(uTime*2.),3.));
   col=vec3(.5,.8,1.5)*(core*2.+halo+beam*.8);
   if(kind>4.5){float field=pow(.5+.5*cos(a*8.+r*19.-uTime*.6),18.)*exp(-pow((r-.45)*3.,2.));col+=vec3(.7,.25,1.)*field*.55;}
   alpha=clamp(max(col.r,max(col.g,col.b)),0.,1.);
 }
 float edge=1.-smoothstep(.83,1.,r);gl_FragColor=vec4(col,alpha*edge*uOpacity);}`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width),material);mesh.userData.billboard=true;return mesh;
}
export function makeWonder(id){
 const g=new THREE.Group();
 if(id==='blackhole'||id==='quasar'){g.add(createLens(82));if(id==='quasar'){const jets=portrait(4,90);g.add(jets);}}
 else g.add(portrait({wormhole:0,supernova:1,nebula:2,planetary:3,pulsar:4,magnetar:5}[id]??2,68));
 return g;
}
export function makeObservable(particles,random){
 const g=new THREE.Group(),p=[],c=[],sizes=[],rand=random(119);
 // Spherical observable volume, not a physical wall or the whole universe.
 for(let i=0;i<26000;i++){const a=rand()*Math.PI*2,z=rand()*2-1,q=Math.sqrt(1-z*z),r=230*Math.cbrt(rand());const v=new THREE.Vector3(Math.cos(a)*q*r,z*r,Math.sin(a)*q*r);const filament=Math.sin(v.x*.055+Math.sin(v.z*.04))*Math.cos(v.y*.06);if(filament<-.35)continue;p.push(v.x,v.y,v.z);const t=r/230;c.push(.3+t*.45,.45-t*.16,.85-t*.4);sizes.push(.25+rand()*.75);}
 g.add(particles(p,c,sizes,{opacity:.35,size:1.5}));
 const nodes=Array.from({length:125},()=>{const a=rand()*Math.PI*2,z=rand()*2-1,q=Math.sqrt(1-z*z),r=215*Math.cbrt(rand());return new THREE.Vector3(Math.cos(a)*q*r,z*r,Math.sin(a)*q*r);}),fp=[],fc=[],fs=[];
 nodes.forEach((n,i)=>{nodes.map((v,j)=>({v,j,d:n.distanceTo(v)})).filter(o=>o.j>i&&o.d<115).sort((a,b)=>a.d-b.d).slice(0,3).forEach(({v})=>{for(let j=0;j<180;j++){const point=n.clone().lerp(v,rand());point.add(new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(4));fp.push(point.x,point.y,point.z);fc.push(.4,.6,1.);fs.push(.4+rand()*.65);}});});
 g.add(particles(fp,fc,fs,{opacity:.85,size:1.7}));
 const shell=new THREE.Mesh(new THREE.SphereGeometry(235,80,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uOpacity:{value:.32}},vertexShader:'varying vec3 n,v,p;void main(){p=position;vec4 q=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-q.xyz);gl_Position=projectionMatrix*q;}',fragmentShader:`varying vec3 n,v,p;uniform float uOpacity;${noise}void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);float f=fbm(p*.03);vec3 c=mix(vec3(.12,.21,.55),vec3(.95,.38,.13),f);gl_FragColor=vec4(c,(rim*.3+.009)*uOpacity);}`}));g.add(shell);
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(238,.16,4,240),new THREE.MeshBasicMaterial({color:0x9ea9d8,transparent:true,opacity:.3,depthWrite:false}));ring.rotation.set(i===0?Math.PI/2:0,i===1?Math.PI/2:0,.2);g.add(ring);}
 return g;
}
