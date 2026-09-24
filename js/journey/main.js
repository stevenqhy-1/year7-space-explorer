import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBlackHole } from './black-hole.js';
import { createPost } from './post.js';
import { createFlight } from './flight.js';
import { buildWorlds, PLANETS, LAYERS } from './worlds.js';
import { createAudio } from './audio.js';

const $=selector=>document.querySelector(selector);
const ease=t=>t*t*(3-2*t);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const layerDistance=index=>LAYERS[index].distance*(innerWidth<700?(index===0?2.45:1.85):1);
const reducedMedia=matchMedia('(prefers-reduced-motion: reduce)');
let gentle=reducedMedia.matches,quality='ultra';
try{const s=JSON.parse(localStorage.getItem('beyond-settings')||'{}');gentle=gentle||!!s.gentle;quality=s.quality==='balanced'?'balanced':'ultra';}catch{}
let renderer,post,hole,flight,worlds,camera,controls;
let mode='entrance',stage=0,paused=false,focus=null,transition=null,cameraTween=null;
let flightStart=0,clockTime=0,lastFrame=0,frameCount=0,frameWindow=0;
let measuredFps=60,slowSeconds=0,adaptiveScale=1,wheelSum=0,lastWheel=0;
const audio=createAudio(),mouse=new THREE.Vector2(),raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2(),temp=new THREE.Vector3();
const targetOffset=new THREE.Vector3();
let pointerDown=null,followPrevious=new THREE.Vector3();

function announce(message){$('#announcement').textContent=message;}
function saveSettings(){try{localStorage.setItem('beyond-settings',JSON.stringify({gentle,quality}));}catch{}}
function setMode(next){mode=next;document.body.dataset.mode=next;$('#entrance').hidden=next!=='entrance';$('#flight-ui').hidden=next!=='flight';$('#exploration').hidden=next!=='explore';if(controls)controls.enabled=next==='explore';}
function resize(){
  if(!renderer)return;
  const pixelRatio=Math.min(devicePixelRatio,quality==='ultra'?1.65:1)*adaptiveScale;
  renderer.setPixelRatio(pixelRatio);renderer.setSize(innerWidth,innerHeight);
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());post.resize(size.x,size.y);
  hole.uniforms.uResolution.value.set(innerWidth,innerHeight);flight.uniforms.uResolution.value.set(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
function fail(message){$('#loading').hidden=true;$('#unavailable').hidden=false;if(message)$('#unavailable p').textContent=message;}

function setup(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
    $('#cosmos').appendChild(renderer.domElement);
    post=createPost(renderer);hole=createBlackHole();flight=createFlight();
    camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.03,5000);
    camera.position.set(170,120,200);
    controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;
    controls.minDistance=2;controls.maxDistance=2600;controls.zoomSpeed=.6;controls.rotateSpeed=.5;
    controls.enabled=false;controls.maxPolarAngle=Math.PI*.88;
    resize();
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('The graphics connection was interrupted. Choose Try again to reopen your journey.');});
    requestAnimationFrame(draw);
    // Let the entrance render before generating the exploration layers.
    setTimeout(()=>{
      try{worlds=buildWorlds();$('#loading').style.opacity='0';setTimeout(()=>{$('#loading').hidden=true;},650);}
      catch(error){console.error(error);fail('The universe could not finish loading. Choose Try again to reopen the journey.');}
    },80);
  }catch(error){console.error(error);fail();}
}

function startJourney(){
  if(mode!=='entrance'||!worlds)return;
  if(gentle){arrive();return;}
  setMode('flight');flightStart=performance.now();audio.mood(0,true);$('#skip-flight').focus();
}
function arrive(){
  if(!worlds)return;
  transition=null;stage=0;focus=null;document.body.dataset.focus='false';
  worlds.layers.forEach((g,i)=>{g.visible=i===0;g.scale.setScalar(1);worlds.opacity(g,1);});
  setMode('explore');updateInterface();audio.mood(0,false);
  controls.target.set(0,0,0);camera.position.set(170,120,210).setLength(gentle?layerDistance(0):layerDistance(0)*1.7);
  if(!gentle)tweenCamera(new THREE.Vector3(),new THREE.Vector3(170,120,210).setLength(layerDistance(0)),2.6);
  $('#go-out').focus({preventScroll:true});announce('Our Solar System. Explore a planet or travel further out.');
}
function restart(){
  transition=null;cameraTween=null;focus=null;stage=0;document.body.dataset.focus='false';
  hole.uniforms.uDive.value=0;setMode('entrance');audio.mood(0,false);$('#enter').focus({preventScroll:true});announce('Back at the black hole.');
}
function tweenCamera(target,position,duration=1.7){
  document.body.dataset.transitioning='true';
  cameraTween={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now(),duration:gentle?0:duration};
}
function updateInterface(){
  const info=LAYERS[stage];$('#location-kicker').textContent=info.kicker;$('#location-title').textContent=info.title;$('#location-subtitle').textContent=info.subtitle;
  document.body.dataset.stage=String(stage);$('#planet-dock').hidden=stage!==0;$('#planet-focus').hidden=!focus;
  document.querySelectorAll('.scale-stop').forEach((button,i)=>{button.classList.toggle('active',i===stage);button.setAttribute('aria-current',i===stage?'step':'false');});
  $('#go-in').disabled=stage===0&&!focus;$('#go-out').disabled=stage===LAYERS.length-1&&!focus;
  document.querySelectorAll('.planet-button').forEach(button=>{button.classList.toggle('active',button.dataset.planet===focus?.id);button.setAttribute('aria-pressed',String(button.dataset.planet===focus?.id));});
  $('#planet-labels').hidden=stage!==0||!!focus;
  if(worlds)worlds.bodies.forEach(body=>{body.orbitLine.visible=!focus;});
  $('#go-out span').textContent=focus?'Leave orbit':'Further out';
}
function clearFocus(animate=true){
  if(!focus)return;focus=null;document.body.dataset.focus='false';$('#planet-focus').hidden=true;
  if(animate)tweenCamera(new THREE.Vector3(),new THREE.Vector3(170,120,210).setLength(layerDistance(0)));
  updateInterface();
}
function goToStage(next){
  if(mode!=='explore'||!worlds||transition)return;
  next=clamp(next,0,LAYERS.length-1);
  if(next===stage){if(focus)clearFocus();return;}
  clearFocus(false);cameraTween=null;
  document.body.dataset.transitioning='true';
  const from=stage,outward=next>stage;
  const old=worlds.layers[from],incoming=worlds.layers[next];
  incoming.visible=true;incoming.scale.setScalar(outward?5:.008);worlds.opacity(incoming,0);
  stage=next;updateInterface();audio.mood(next);
  const direction=camera.position.clone().sub(controls.target).normalize();
  if(direction.y<.15)direction.y=.2;
  transition={old,incoming,outward,start:performance.now(),duration:gentle?0:3.2,fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),toPosition:direction.normalize().multiplyScalar(layerDistance(next))};
  wheelSum=0;announce(LAYERS[next].title);
}
function focusPlanet(id){
  if(mode!=='explore'||stage!==0||transition||!worlds)return;
  const body=worlds.bodies.find(b=>b.id===id);if(!body)return;
  focus=body;document.body.dataset.focus='true';$('#planet-name').textContent=body.name;updateInterface();
  body.body.getWorldPosition(temp);followPrevious.copy(temp);
  // The approach looks from the Sun-facing side so the planet is well lit.
  const dir=temp.clone().normalize().multiplyScalar(-1).add(new THREE.Vector3(.3,.4,.65)).normalize();
  const distance=body.radius*(body.id==='saturn'?7.5:5.7)*(innerWidth<700?1.45:1);
  targetOffset.copy(dir).multiplyScalar(distance);
  tweenCamera(temp,temp.clone().add(targetOffset),2.2);announce(body.name);
}

$('#scale-stops').innerHTML=LAYERS.map((layer,i)=>`<button class="scale-stop ${i===0?'active':''}" data-stage="${i}" aria-current="${i===0?'step':'false'}">${layer.name}</button>`).join('');
$('#scale-stops').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)goToStage(Number(b.dataset.stage));});
$('#planet-dock').innerHTML=PLANETS.map(p=>`<button class="planet-button" data-planet="${p.id}" style="--planet:${p.color}" aria-pressed="false">${p.name}</button>`).join('');
$('#planet-dock').addEventListener('click',e=>{const b=e.target.closest('[data-planet]');if(b)focusPlanet(b.dataset.planet);});
$('#planet-labels').innerHTML=PLANETS.map(p=>`<span class="world-label" data-label="${p.id}">${p.name}</span>`).join('');
$('#enter').onclick=startJourney;$('#enter-hole').onclick=startJourney;$('#skip-flight').onclick=arrive;$('#home').onclick=restart;
$('#go-in').onclick=()=>focus?clearFocus():goToStage(stage-1);
$('#go-out').onclick=()=>focus?clearFocus():goToStage(stage+1);
$('#leave-planet').onclick=()=>clearFocus();
$('#pause').onclick=()=>{paused=!paused;$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').innerHTML=paused?'▷ <span>Resume</span>':'Ⅱ <span>Pause</span>';};
$('#retry-render').onclick=()=>location.reload();
$('#sound').onclick=async()=>{
  try{const enabled=await audio.toggle();$('#sound').setAttribute('aria-pressed',String(enabled));$('#sound').setAttribute('aria-label',enabled?'Turn ambient sound off':'Turn ambient sound on');$('#sound .utility-label').textContent=enabled?'Sound on':'Sound off';}
  catch{announce('Sound is unavailable in this browser. You can continue exploring silently.');}
};
$('#settings').onclick=()=>$('#settings-dialog').showModal();$('.close-dialog').onclick=()=>$('#settings-dialog').close();
$('#settings-dialog').addEventListener('click',e=>{if(e.target===$('#settings-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#quality').value=quality;$('#quality').onchange=e=>{quality=e.target.value;adaptiveScale=1;slowSeconds=0;resize();saveSettings();};
$('#reduced-motion').checked=gentle;$('#reduced-motion').onchange=e=>{gentle=e.target.checked;saveSettings();if(gentle&&mode==='flight')arrive();};
reducedMedia.addEventListener('change',e=>{if(e.matches){gentle=true;$('#reduced-motion').checked=true;if(mode==='flight')arrive();}});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('Use your browser’s full-screen command to expand the view.');}};
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
document.addEventListener('visibilitychange',()=>{audio.visibility(document.hidden).catch(()=>{});lastFrame=performance.now();});
window.addEventListener('resize',resize);
window.addEventListener('pointermove',e=>mouse.set((e.clientX/innerWidth-.5)*2,-(e.clientY/innerHeight-.5)*2));
$('#cosmos').addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};if(mode==='explore')cameraTween=null;});
$('#cosmos').addEventListener('pointerup',e=>{
  if(mode!=='explore'||stage!==0||!pointerDown||transition)return;
  const moved=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(moved>6)return;
  pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(worlds.selectable)[0];if(hit)focusPlanet(hit.object.userData.planet);
});
$('#cosmos').addEventListener('wheel',e=>{
  if(mode!=='explore'||transition||cameraTween)return;
  const now=performance.now();if(now-lastWheel>250)wheelSum=0;lastWheel=now;wheelSum+=e.deltaY;
  const distance=camera.position.distanceTo(controls.target),reference=layerDistance(stage);
  if(focus&&e.deltaY>0&&distance>focus.radius*19){clearFocus();wheelSum=0;}
  else if(!focus&&e.deltaY>0&&distance>reference*1.7&&wheelSum>80)goToStage(stage+1);
  else if(!focus&&e.deltaY<0&&stage>0&&distance<reference*.28&&wheelSum< -80)goToStage(stage-1);
},{passive:true});
window.addEventListener('keydown',e=>{
  if($('#settings-dialog').open)return;
  if(e.key==='Escape'&&mode==='flight')arrive();else if(e.key==='Escape'&&focus)clearFocus();
  else if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;
  else if(mode==='explore'&&(e.key==='+'||e.key==='=')){e.preventDefault();goToStage(stage-1);}
  else if(mode==='explore'&&e.key==='-'){e.preventDefault();goToStage(stage+1);}
});
function updateLabels(){
  $('#planet-labels').hidden=stage!==0||!!focus||!!transition;
  if(stage!==0||focus||transition)return;
  for(const b of worlds.bodies){
    const label=$(`[data-label="${b.id}"]`);temp.copy(b.body.position);temp.y+=b.radius+1.6;temp.project(camera);
    const x=(temp.x*.5+.5)*innerWidth,y=(-temp.y*.5+.5)*innerHeight;
    const visible=temp.z<1&&x>20&&x<innerWidth-145&&y>230&&y<innerHeight-180;
    label.style.opacity=visible?'1':'0';label.style.left=x+'px';label.style.top=y+'px';
  }
}
function updateExploration(now,dt){
  const moving=!paused&&!gentle;
  worlds.update(clockTime,dt,moving,stage);
  document.body.dataset.transitioning=String(!!transition||!!cameraTween);
  if(transition){
    const tr=transition,t=tr.duration?clamp((now-tr.start)/(tr.duration*1000)):1,e=ease(t);
    tr.old.scale.setScalar(tr.outward?Math.pow(.006,e):Math.pow(5,e));
    tr.incoming.scale.setScalar(tr.outward?Math.pow(5,1-e):Math.pow(.008,1-e));
    worlds.opacity(tr.old,1-ease(clamp(t*1.5)));worlds.opacity(tr.incoming,ease(clamp((t-.15)/.85)));
    camera.position.lerpVectors(tr.fromPosition,tr.toPosition,e);controls.target.copy(tr.fromTarget).multiplyScalar(1-e);
    if(t===1){tr.old.visible=false;tr.old.scale.setScalar(1);worlds.opacity(tr.old,1);tr.incoming.scale.setScalar(1);worlds.opacity(tr.incoming,1);transition=null;}
  }else if(cameraTween){
    const tw=cameraTween,t=tw.duration?clamp((now-tw.start)/(tw.duration*1000)):1,e=ease(t);
    if(focus){focus.body.getWorldPosition(temp);tw.to.copy(temp).add(targetOffset);tw.targetTo.copy(temp);followPrevious.copy(temp);}
    camera.position.lerpVectors(tw.from,tw.to,e);controls.target.lerpVectors(tw.targetFrom,tw.targetTo,e);
    if(t===1)cameraTween=null;
  }else if(focus){
    focus.body.getWorldPosition(temp);const delta=temp.clone().sub(followPrevious);camera.position.add(delta);controls.target.add(delta);followPrevious.copy(temp);
  }
  controls.enabled=!transition;controls.update();updateLabels();
  if(!transition&&!cameraTween){
    const distance=camera.position.distanceTo(controls.target),reference=layerDistance(stage);
    if(focus&&distance>focus.radius*19)clearFocus();
    else if(!focus&&stage<LAYERS.length-1&&distance>reference*1.9)goToStage(stage+1);
    else if(!focus&&stage>0&&distance<reference*.24)goToStage(stage-1);
  }
  post.render(worlds.scene,camera,{bloom:stage===0?.65:.85});
}
function draw(now){
  requestAnimationFrame(draw);
  if(document.hidden){lastFrame=now;return;}
  const rawDt=(now-(lastFrame||now))/1000;const dt=Math.min(rawDt,.05);lastFrame=now;
  if(!paused&&!gentle)clockTime+=dt;
  frameCount++;frameWindow+=rawDt;
  if(frameWindow>2){measuredFps=frameCount/frameWindow;document.body.dataset.fps=String(Math.round(measuredFps));frameCount=0;frameWindow=0;if(measuredFps<26)slowSeconds+=2;else slowSeconds=Math.max(0,slowSeconds-1);if(slowSeconds>=6&&adaptiveScale>.65){adaptiveScale-=.15;slowSeconds=0;resize();}}
  if(mode==='entrance'){
    hole.uniforms.uTime.value=clockTime;hole.uniforms.uMouse.value.lerp(gentle?new THREE.Vector2():mouse,.025);
    post.render(hole.scene,hole.camera,{bloom:.95});
  }else if(mode==='flight'){
    const elapsed=(now-flightStart)/1000;
    if(elapsed<3.6){
      const t=elapsed/3.6;hole.uniforms.uDive.value=ease(t);hole.uniforms.uTime.value=clockTime;
      post.render(hole.scene,hole.camera,{bloom:1.1,fade:1-ease(clamp((t-.76)/.24))});
      $('#flight-caption').textContent='Leave the familiar behind.';
    }else if(elapsed<10){
      const t=(elapsed-3.6)/6.4;flight.uniforms.uTime.value=elapsed-3.6;flight.uniforms.uProgress.value=t;
      post.render(flight.scene,flight.camera,{bloom:1.1,fade:ease(clamp(t*6))*(1-ease(clamp((t-.8)/.2)))});
      $('#flight-caption').textContent=t<.5?'Somewhere, a small blue world is waiting.':'Welcome to our corner of the cosmos.';
    }else arrive();
  }else if(worlds)updateExploration(now,dt);
}
setMode('entrance');setup();
