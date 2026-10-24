import * as THREE from 'three';
export function createFlight(){
 const uniforms={uTime:{value:0},uProgress:{value:0},uResolution:{value:new THREE.Vector2()}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`precision highp float;varying vec2 vUv;uniform float uTime,uProgress;uniform vec2 uResolution;
 float hash(float n){return fract(sin(n*127.1)*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*157.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+157.),hash(n+158.),f.x),f.y);}
 void main(){vec2 uv=(vUv-.5)*2.;uv.x*=uResolution.x/uResolution.y;
   float journey=smoothstep(0.,.25,uProgress)*(1.-smoothstep(.75,1.,uProgress));
   vec2 bend=vec2(sin(uTime*.32)*.18,cos(uTime*.24)*.11)*journey;
   uv-=bend;float twist=.10*sin(uTime*.21)*journey;uv=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*uv;
   float r=length(uv),a=atan(uv.y,uv.x),depth=1./(r+.13);
   float dust=noise(vec2(a*8.+sin(depth*.4),depth*2.-uTime*.6));
   float silk=pow(.5+.5*sin(a*16.+depth*2.+dust*4.-uTime*.32),10.);
   vec3 cold=mix(vec3(.018,.04,.09),vec3(.06,.18,.3),dust);
   vec3 col=cold*(.3+silk*.9)*smoothstep(.04,.28,r);
   col+=vec3(.12,.065,.025)*pow(dust,3.)*journey;
   for(int layer=0;layer<4;layer++){
     float sectors=200.+float(layer)*113.;float sector=(a+3.141593)/6.283185*sectors;
     float id=floor(sector),seed=hash(id+float(layer)*700.);float lane=fract(sector)-.5;
     float travel=fract(seed+uTime*(.12+float(layer)*.019));float head=.025+travel*travel*2.8;
     float tail=(.015+travel*.27)*(.3+journey*.7);
     float line=exp(-lane*lane*170.)*smoothstep(head-tail,head,r)*(1.-smoothstep(head,head+.009,r));
     col+=line*mix(vec3(.38,.67,1.),vec3(1.,.82,.55),seed)*(.2+travel)*(.5+journey*.7);
   }
   // A distant warm destination gradually replaces the cold passage.
   col+=vec3(1.,.74,.36)*exp(-r*r*100.)*smoothstep(.45,.95,uProgress)*.8;
   col*=1.-smoothstep(.7,2.4,r)*.25;gl_FragColor=vec4(col,1.);
 }`});
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));return {scene,camera:new THREE.Camera(),uniforms};
}
