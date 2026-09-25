import * as THREE from 'three';
import { OBJECTS } from './discoveries.js';
import { makeGasGiantTexture, makeRockyTexture, makeSunTexture, makeRingTexture } from '../textureFactory.js';

export const PLANETS = [
  {id:'mercury',name:'Mercury',radius:.7,orbit:13,color:'#ada093',period:88},
  {id:'venus',name:'Venus',radius:1.1,orbit:20,color:'#d5b077',period:225},
  {id:'earth',name:'Earth',radius:1.2,orbit:29,color:'#6ca4e8',period:365},
  {id:'mars',name:'Mars',radius:.85,orbit:39,color:'#cf7657',period:687},
  {id:'jupiter',name:'Jupiter',radius:4,orbit:59,color:'#d3b08c',period:4333},
  {id:'saturn',name:'Saturn',radius:3.4,orbit:84,color:'#e5d5ac',period:10759},
  {id:'uranus',name:'Uranus',radius:2.3,orbit:111,color:'#91d5de',period:30687},
  {id:'neptune',name:'Neptune',radius:2.2,orbit:143,color:'#668fe7',period:60190},
];
export const LAYERS = [
  {name:'Solar System',title:'Our Solar System',kicker:'A FAMILIAR CORNER OF INFINITY',subtitle:'Eight worlds. One extraordinary star.',distance:290},
  {name:'Nearby stars',title:'A sea of suns',kicker:'OUR SUN IS ONE OF MANY',subtitle:'Every point of light could have worlds of its own.',distance:330},
  {name:'Milky Way',title:'This is our galaxy.',kicker:'EVERY STAR YOU SEE BELONGS TO SOMETHING BIGGER',subtitle:'Our entire Solar System is a tiny part of this.',distance:390},
  {name:'Galaxies',title:'Islands of light',kicker:'BEYOND OUR GALACTIC HOME',subtitle:'Different shapes. Different histories. Countless worlds.',distance:440},
  {name:'Cosmic web',title:'And still, there is more.',kicker:'THE LARGEST STRUCTURES IN THE COSMOS',subtitle:'Galaxies gather along an immense web of matter.',distance:530},
  {name:'Weird cosmic objects',title:'Beautifully strange.',kicker:'THE UNIVERSE HAS A WILD SIDE',subtitle:'Choose a wonder. Fly closer. Discover its story.',distance:340},
];
function random(seed=32){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function particles(positions,colors,sizes,{opacity=1,size=1}={}) {
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,
    uniforms:{uOpacity:{value:opacity},uSize:{value:size},uTime:{value:0}},
    vertexShader:`attribute float aSize;varying vec3 vColor;uniform float uSize,uTime;
      void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);float shimmer=.94+.06*sin(uTime*.7+position.x);
      gl_PointSize=clamp(aSize*uSize*length(modelMatrix[0].xyz)*380./max(.03,-p.z),1.,50.)*shimmer;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 vColor;uniform float uOpacity;
      void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=exp(-r*r*5.)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(vColor,a*uOpacity);}`,
  });
  material.userData.opacity=opacity;
  return new THREE.Points(geometry,material);
}
function softTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffffff');g.addColorStop(.15,'#ffffffad');g.addColorStop(.5,'#ffffff1f');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const glowTexture=softTexture();
function glow(color,size,opacity=1){const m=new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});m.userData.opacity=opacity;const s=new THREE.Sprite(m);s.scale.setScalar(size);return s;}
function atmosphere(radius,color){return new THREE.Mesh(new THREE.SphereGeometry(radius*1.045,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{tint:{value:new THREE.Color(color)},uOpacity:{value:1}},vertexShader:'varying vec3 n,v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n,v;uniform vec3 tint;uniform float uOpacity;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(tint,a*.75*uOpacity);}'}));}

// Diffuse stellar light and dust between the individually rendered stars.
// A procedural disk prevents the galaxy from looking like four isolated dotted lines.
function galacticHaze(radius, seed) {
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{uOpacity:{value:.8},seed:{value:seed}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float uOpacity,seed;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+4.;a*=.5;}return v;}
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);if(r>1.)discard;
      float clouds=fbm(p*14.+seed);float fine=fbm(p*65.+seed);
      float arms=pow(.5+.5*cos(4.*(a-r*6.2)+clouds*1.5),3.);
      float taper=pow(1.-smoothstep(.15,1.,r),1.4);
      float disk=(.08+arms*.65)*taper*(.3+clouds*1.4)*(.5+fine);
      float core=exp(-r*r*110.);
      float bar=exp(-p.x*p.x*35.-p.y*p.y*420.);
      disk*=smoothstep(.18,.55,fine+clouds*.25);
      core+=bar*.35;
      vec3 color=mix(vec3(.16,.23,.48),vec3(.68,.32,.37),smoothstep(.55,.8,clouds));
      color=mix(color,vec3(1.,.68,.36),exp(-r*r*12.));
      color*=disk; color+=vec3(1.6,1.05,.6)*core*.6;
      gl_FragColor=vec4(color,uOpacity);}`,
  });
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),material);
  plane.rotation.x=-Math.PI/2;return plane;
}

export function buildWorlds() {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#010207');
  scene.add(new THREE.AmbientLight(0x7794c5,.6));
  const fill=new THREE.DirectionalLight(0x8eafff,.65);fill.position.set(50,70,100);scene.add(fill);
  const layers=LAYERS.map(()=>new THREE.Group());layers.forEach((g,i)=>{g.visible=i===0;scene.add(g)});
  const rng=random(470),c=new THREE.Color();
  // A distant fixed star dome, outside every camera range.
  const bgP=[],bgC=[],bgS=[];
  for(let i=0;i<6000;i++){const z=rng()*2-1,a=rng()*Math.PI*2,r=1700;const q=Math.sqrt(1-z*z);bgP.push(Math.cos(a)*q*r,z*r,Math.sin(a)*q*r);c.setHSL(.58+rng()*.1,.25,.25+rng()*.6);bgC.push(c.r,c.g,c.b);bgS.push(1+rng()*3);}
  const background=particles(bgP,bgC,bgS,{opacity:.65,size:1.3});scene.add(background);
  const solar=layers[0],bodies=[],selectable=[];
  const sunlight=new THREE.PointLight(0xffeed4,3.5,0,0);solar.add(sunlight);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(5.3,64,48),new THREE.MeshBasicMaterial({map:makeSunTexture(),color:new THREE.Color(2.2,1.9,1.4)}));solar.add(sun);
  solar.add(glow(0xffad45,34,.65));solar.add(glow(0xffd685,17,.95));
  const loader=new THREE.TextureLoader();const earthMap=loader.load('./assets/earth.jpg');earthMap.colorSpace=THREE.SRGBColorSpace;
  for(let i=0;i<PLANETS.length;i++) {
    const p=PLANETS[i],body=new THREE.Group();let map;
    if(p.id==='earth')map=earthMap;
    else if(['jupiter','saturn','uranus','neptune','venus'].includes(p.id))map=makeGasGiantTexture({palette:p.id==='jupiter'?['#cfb28f','#f3e5cd','#996b51','#dcc3a5']:p.id==='saturn'?['#d8c397','#f1e1ba','#a8926b']:p.id==='venus'?['#a47741','#e5bd7d','#d7b381']:[p.color,p.color,'#6288a9'],seed:i+7});
    else map=makeRockyTexture({base:p.color,spots:[p.color,'#69564a','#b29276'],seed:i+12});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(p.radius,64,48),new THREE.MeshStandardMaterial({map,roughness:.92}));
    mesh.rotation.z=p.id==='uranus'?1.7:.15;mesh.userData.planet=p.id;body.add(mesh);selectable.push(mesh);
    if(['earth','venus','uranus','neptune'].includes(p.id))body.add(atmosphere(p.radius,p.id==='venus'?0xe1b86c:0x589fee));
    if(p.id==='saturn'){
      const geo=new THREE.RingGeometry(p.radius*1.3,p.radius*2.35,160);const pos=geo.attributes.position,uv=geo.attributes.uv;
      for(let v=0;v<pos.count;v++)uv.setXY(v,(Math.hypot(pos.getX(v),pos.getY(v))/p.radius-1.3)/1.05,.5);
      const ring=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:makeRingTexture(),color:0xe9d7b1,side:THREE.DoubleSide,transparent:true,opacity:.88,depthWrite:false}));ring.rotation.x=-Math.PI/2+.4;body.add(ring);
    }
    if(p.id==='earth'){
      const moon=new THREE.Mesh(new THREE.SphereGeometry(.3,24,16),new THREE.MeshStandardMaterial({map:makeRockyTexture({base:'#aaa9a2',seed:90}),roughness:1}));moon.position.set(2.6,.1,0);body.add(moon);
    }
    const orbitGeo=new THREE.BufferGeometry().setFromPoints(Array.from({length:241},(_,j)=>{const a=j/240*Math.PI*2;return new THREE.Vector3(Math.cos(a)*p.orbit,0,Math.sin(a)*p.orbit)}));
    const orbit=new THREE.Line(orbitGeo,new THREE.LineBasicMaterial({color:0x61738e,transparent:true,opacity:.2}));solar.add(orbit);
    const angle=[.7,2.1,3.85,5.1,1.1,3.35,5.4,2.25][i];
    bodies.push({ ...p,body,mesh,angle,orbitLine:orbit });solar.add(body);
  }
  const beltP=[],beltC=[],beltS=[];
  for(let i=0;i<5500;i++){const a=rng()*Math.PI*2,r=46+rng()*6;beltP.push(Math.cos(a)*r,(rng()-.5)*1.2,Math.sin(a)*r);beltC.push(.32,.3,.28);beltS.push(.12+rng()*.2)}solar.add(particles(beltP,beltC,beltS,{opacity:.7}));
  // Nearby suns: depth, a few foreground stars, and subtle clouds.
  const nearP=[],nearC=[],nearS=[];
  for(let i=0;i<9000;i++){const r=25+Math.pow(rng(),.45)*245,a=rng()*Math.PI*2,z=rng()*2-1,q=Math.sqrt(1-z*z);nearP.push(Math.cos(a)*q*r,z*r*.65,Math.sin(a)*q*r);c.setHSL(rng()<.4?.09:.61,.25,.6+rng()*.3);nearC.push(c.r*1.5,c.g*1.5,c.b*1.5);nearS.push(.3+Math.pow(rng(),7)*3.4)}
  layers[1].add(particles(nearP,nearC,nearS,{size:1.35}));layers[1].add(glow(0xffd399,8,1));
  for(let i=0;i<9;i++){const cloud=glow(i%2?0x5c3985:0x21435f,150,.13);cloud.position.set((rng()-.5)*320,(rng()-.5)*160,(rng()-.5)*320);layers[1].add(cloud)}
  // A single galaxy, with blue arms, warm bulge, pink star-forming regions.
  function galaxy(radius,count,seed) {
    const rand=random(seed),group=new THREE.Group(),pos=[],col=[],sizes=[];
    for(let i=0;i<count;i++){
      const core=rand()<.22,r=core?Math.pow(rand(),1.7)*radius*.2:Math.pow(rand(),.6)*radius;
      const arm=i%4;let a=arm*Math.PI/2+r/radius*6.2+(rand()-.5)*(.45+r/radius*.4);
      if(core||rand()<.17)a=rand()*Math.PI*2;
      const scatter=(rand()-.5)*radius*.045*(1-r/radius);
      pos.push(Math.cos(a)*r+scatter,(rand()-.5)*(core?radius*.095:radius*.022),Math.sin(a)*r+scatter);
      c.setHSL(core?.105:.58+rand()*.16,core?.28:.38,core?.65:.35+rand()*.4);
      const boost=core?1.1:.7+rand();col.push(c.r*boost,c.g*boost,c.b*boost);sizes.push((core?.35:.2)+rand()*.65);
    }
    group.add(galacticHaze(radius,seed));group.add(particles(pos,col,sizes,{size:radius/90}));group.add(glow(0xffd7a3,radius*.35,.55));
    for(let i=0;i<27;i++){const r=(.25+rand()*.65)*radius,a=i%4*Math.PI/2+r/radius*6.2;const cloud=glow(i%4===0?0xb4386b:0x426abd,radius*(.05+rand()*.1),.13);cloud.position.set(Math.cos(a)*r,0,Math.sin(a)*r);group.add(cloud)}
    return group;
  }
  const milky=galaxy(145,90000,76);milky.rotation.set(.2,.4,.15);layers[2].add(milky);
  // Separate stellar distributions for genuinely different galaxy morphologies.
  function otherGalaxy(radius,count,seed,type){
    if(type==='spiral'||type==='barred'){
      const g=galaxy(radius,count,seed);
      if(type==='barred'){const bar=glow(0xffcf91,radius*.8,.7);bar.scale.set(radius, radius*.17,1);g.add(bar);}return g;
    }
    const rand=random(seed),g=new THREE.Group(),p=[],co=[],sz=[];
    for(let i=0;i<count;i++){
      let x,y,z;const a=rand()*Math.PI*2,r=Math.pow(rand(),1.3)*radius,u=rand()*2-1;
      if(type==='irregular'){const k=i%5,cx=Math.sin(k*2.7)*radius*.55,cz=Math.cos(k*4.1)*radius*.5;x=cx+(rand()-.5)*radius*.8;y=(rand()-.5)*radius*.4;z=cz+(rand()-.5)*radius*.65;c.setHSL(.55+rand()*.35,.5,.55);}
      else {x=Math.cos(a)*r*Math.sqrt(1-u*u);z=Math.sin(a)*r*Math.sqrt(1-u*u);y=u*r*(type==='elliptical'?.7:.12);x*=type==='elliptical'?1.25:1;c.setHSL(.1,.3,.4+rand()*.4);}
      p.push(x,y,z);co.push(c.r,c.g,c.b);sz.push(.2+rand()*.7);
    }
    g.add(particles(p,co,sz,{size:radius/22}));
    if(type!=='irregular'){const light=glow(0xffd3a0,radius*1.3,.5);if(type==='lenticular')light.scale.y*=.32;g.add(light);}
    return g;
  }
  // A deliberately mixed gallery: spirals, bars, ellipsoids, disks and irregular clumps.
  const central=galaxy(23,9000,17);central.rotation.set(.35,0,.2);layers[3].add(central);
  for(let i=0;i<45;i++){
    const radius=7+rng()*13;const g=otherGalaxy(radius,1800,100+i,['spiral','elliptical','irregular','lenticular','barred'][i%5]);const a=rng()*Math.PI*2,r=50+rng()*190;
    g.position.set(Math.cos(a)*r,(rng()-.5)*190,Math.sin(a)*r);g.rotation.set(rng()*3,rng()*5,rng()*2);layers[3].add(g);
  }
  // A filament network with dense galaxy nodes and naturally empty voids.
  const nodes=Array.from({length:85},()=>new THREE.Vector3((rng()-.5)*600,(rng()-.5)*320,(rng()-.5)*490));
  const webP=[],webC=[],webS=[];
  for(let i=0;i<nodes.length;i++){
    const nearest=nodes.map((n,j)=>({n,j,d:n.distanceTo(nodes[i])})).filter(o=>o.j>i&&o.d<170).sort((a,b)=>a.d-b.d).slice(0,3);
    for(const {n} of nearest){for(let j=0;j<430;j++){
      const t=rng(),p=new THREE.Vector3().lerpVectors(nodes[i],n,t);const spread=(1-Math.sin(t*Math.PI))*.8+1.5;
      p.x+=(rng()-.5)*spread*6;p.y+=(rng()-.5)*spread*6;p.z+=(rng()-.5)*spread*6;
      webP.push(p.x,p.y,p.z);c.setHSL(.61+rng()*.12,.43,.32+rng()*.35);webC.push(c.r,c.g,c.b);webS.push(.2+rng()*.8);
    }}
    const node=glow(i%4?0x8a9fff:0xe7b69c,8+rng()*12,.6);node.position.copy(nodes[i]);layers[4].add(node);
    for(let j=0;j<160;j++){const p=nodes[i];webP.push(p.x+(rng()-.5)*10,p.y+(rng()-.5)*10,p.z+(rng()-.5)*10);webC.push(.9,.8,1.);webS.push(.2+rng()*.9)}
  }
  layers[4].add(particles(webP,webC,webS,{size:1.4}));
  const cosmicBodies=[],cosmicSelectable=[];
  for(let index=0;index<OBJECTS.length;index++){
    const item=OBJECTS[index],g=new THREE.Group(),radius=15;
    const angle=index/OBJECTS.length*Math.PI*2;
    g.position.set((index-2)*59,index%2?-18:20,0);
    const hit=new THREE.Mesh(new THREE.SphereGeometry(22,24,16),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.userData.cosmic=item.id;g.add(hit);cosmicSelectable.push(hit);
    const p=[],co=[],sz=[];const rand=random(900+index);
    for(let i=0;i<6500;i++){
      const a=rand()*Math.PI*2,u=rand()*2-1;
      let r,x,y,z;
      if(item.id==='blackhole'||item.id==='quasar'){r=7+Math.pow(rand(),.65)*20;x=Math.cos(a)*r;z=Math.sin(a)*r;y=(rand()-.5)*.7;c.setHSL(item.id==='blackhole'?.09:.58,.5,.55+rand()*.35);}
      else if(item.id==='wormhole'){r=8+Math.pow(rand(),2)*15;z=(r-8)*Math.sin(a*.5);x=Math.cos(a)*r;y=Math.sin(a)*r;c.setHSL(.64+r/180,.6,.65);}
      else {r=item.id==='supernova'?17+rand()*4:Math.pow(rand(),.6)*25;const q=Math.sqrt(1-u*u);x=Math.cos(a)*q*r;y=u*r;z=Math.sin(a)*q*r;if(item.id==='nebula'){x*=1+.35*Math.sin(y*.3);z*=.6;}c.setHSL(item.id==='supernova'?.02+rand()*.13:.55+rand()*.35,.6,.45+rand()*.3);}
      p.push(x,y,z);co.push(c.r,c.g,c.b);sz.push(.12+rand()*.42);
    }
    const cloud=particles(p,co,sz,{size:1.3});g.add(cloud);
    if(item.id==='blackhole'){
      g.add(new THREE.Mesh(new THREE.SphereGeometry(6.6,48,32),new THREE.MeshBasicMaterial({color:0x000000})));
      const ring=new THREE.Mesh(new THREE.TorusGeometry(7,.2,12,120),new THREE.MeshBasicMaterial({color:new THREE.Color(2,1.3,.65)}));g.add(ring);
    }else if(item.id==='quasar'){
      g.add(glow(0xaedfff,20,1));for(const sign of [-1,1]){const jet=new THREE.Mesh(new THREE.ConeGeometry(3,48,32,1,true),new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,uniforms:{uOpacity:{value:.6}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float uOpacity;void main(){float a=pow(vUv.y,1.5)*(.25+.75*pow(sin(vUv.x*3.14159),4.));gl_FragColor=vec4(.3,.65,1.,a*uOpacity);}'}));jet.position.y=sign*24;jet.rotation.z=sign>0?Math.PI:0;g.add(jet);}
    }else if(item.id==='nebula'){
      for(let j=0;j<16;j++){const mist=glow(j%2?0x853898:0x285a9f,25,.22);mist.position.set((rand()-.5)*30,(rand()-.5)*30,(rand()-.5)*15);g.add(mist);}
    }else if(item.id==='supernova'){
      g.add(glow(0xade9ff,5,1));for(let j=0;j<20;j++){const a=j/20*Math.PI*2;const wisp=glow(j%2?0xf58448:0x764ed1,12,.25);wisp.position.set(Math.cos(a)*18,Math.sin(a)*18,Math.sin(a*3)*5);g.add(wisp);}
    }else if(item.id==='wormhole'){
      for(let j=0;j<9;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(8+j*1.3,.07,8,96),new THREE.MeshBasicMaterial({color:j%2?0x78bfff:0xb886ff,transparent:true,opacity:.65-j*.045,blending:THREE.AdditiveBlending,depthWrite:false}));ring.position.z=-j*1.5;g.add(ring);}
    }
    g.rotation.z=.25;layers[5].add(g);cosmicBodies.push({...item,radius,body:g,cloud});
  }
  layers.forEach(group=>group.traverse(o=>{if(o.material){const m=o.material;m.userData.baseOpacity=m.opacity??1;if(m.uniforms?.uOpacity)m.userData.baseUniformOpacity=m.uniforms.uOpacity.value}}));
  function opacity(group,value){group.traverse(o=>{const m=o.material;if(!m)return;if(m.uniforms?.uOpacity)m.uniforms.uOpacity.value=(m.userData.baseUniformOpacity??1)*value;else{m.transparent=true;m.opacity=(m.userData.baseOpacity??1)*value;}});}
  function update(time,dt,moving=true,active=0){
    for(const b of bodies){if(moving)b.angle+=dt*.07*Math.pow(365/b.period,.4);b.body.position.set(Math.cos(b.angle)*b.orbit,0,Math.sin(b.angle)*b.orbit);if(moving)b.mesh.rotation.y+=dt*.08;}
    if(moving&&active===5)cosmicBodies.forEach(b=>{b.cloud.rotation.y+=dt*.045;});
    if(moving){sun.rotation.y+=dt*.03;background.rotation.y+=dt*.0005;}
    layers[active]?.traverse(o=>{if(o.material?.uniforms?.uTime)o.material.uniforms.uTime.value=time});
  }
  update(0,0,false);
  return {scene,layers,bodies,selectable,cosmicBodies,cosmicSelectable,opacity,update,background};
}
