import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBlackHole } from './black-hole.js?v=20261026e';
import { createPost } from './post.js?v=20261026e';
import { createFlight } from './flight.js?v=20261026e';
import { buildWorlds, SUN, PLANETS, LAYERS, OBSERVABLE, COSMIC, HORIZON } from './worlds.js?v=20261026e';
import { OBJECTS, SCALES } from './discoveries.js?v=20261026e';
import { smoothJourney, clockRatio, horizonKm, CINEMA_RATIO } from './relativity.js?v=20261026e';
import { HORIZON_WORLDS } from './horizon-system.js?v=20261026e';
import { createAudio } from './audio.js?v=20261026e';

const $=selector=>document.querySelector(selector);
const ease=smoothJourney;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const layerDistance=index=>LAYERS[index].distance*(innerWidth<700?(index===0?2.45:index===COSMIC?2.6:1.85):1);
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
let pendingInfo=null,creditTimer=null,discoveryTimer=null,queuedStage=null;
let localSeconds=0,distantSeconds=0,scenic=false;
function setScenic(value){
 scenic=value;document.body.dataset.scenic=String(value);
 for(const selector of ['.masthead','#exploration','.experience-links'])$(selector).inert=value;
 $('#exit-scenic').hidden=!value;$('#scenic').setAttribute('aria-pressed',String(value));
 if(value){pendingInfo=null;clearTimeout(discoveryTimer);$('#exit-scenic').focus();}else $('#scenic').focus();
}
$('#scenic').onclick=()=>setScenic(true);$('#exit-scenic').onclick=()=>setScenic(false);
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
    camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.03,30000);
    camera.position.set(170,120,200);
    controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;
    controls.minDistance=2;controls.maxDistance=12000;controls.zoomSpeed=2.4;controls.rotateSpeed=.5;
    renderer.domElement.addEventListener('wheel',e=>{controls.zoomSpeed=e.ctrlKey?(stage===0?9:5):(stage===0?2.4:1.5);},{capture:true,passive:true});
    renderer.domElement.addEventListener('pointerdown',()=>{controls.zoomSpeed=stage===0?2.4:1.5;},{capture:true});
    controls.enabled=false;controls.maxPolarAngle=Math.PI*.88;
    resize();
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('The graphics connection was interrupted. Choose Try again to reopen your journey.');});
    requestAnimationFrame(draw);
    // Let the entrance render before generating the exploration layers.
    setTimeout(()=>{
      try{worlds=buildWorlds();if(location.hash==='#solar-system')arrive();$('#loading').style.opacity='0';setTimeout(()=>{$('#loading').hidden=true;},650);}
      catch(error){console.error(error);fail('The universe could not finish loading. Choose Try again to reopen the journey.');}
    },80);
  }catch(error){console.error(error);fail();}
}

function startJourney(){
  if(mode!=='entrance'||!worlds)return;
  $('#creator-credit').hidden=false;clearTimeout(creditTimer);creditTimer=setTimeout(()=>$('#creator-credit').hidden=true,3500);
  if(gentle){arrive();return;}
  setMode('flight');flightStart=performance.now();audio.mood(0,true);$('#skip-flight').focus();
}
function arrive(preserveCamera=false){
  if(!worlds)return;
  transition=null;cameraTween=null;queuedStage=null;stage=0;focus=null;worlds.background.scale.setScalar(1);worlds.background.position.set(0,0,0);document.body.dataset.focus='false';
  worlds.layers.forEach((g,i)=>{g.visible=i===0;g.scale.setScalar(1);g.position.set(0,0,0);worlds.opacity(g,1);});
  setMode('explore');updateInterface();audio.mood(0,false);
  if(!preserveCamera){controls.target.set(0,0,0);camera.position.set(170,120,210).setLength(gentle?layerDistance(0):layerDistance(0)*1.7);}
  if(!gentle&&!preserveCamera)tweenCamera(new THREE.Vector3(),new THREE.Vector3(170,120,210).setLength(layerDistance(0)),2.6);
  $('#go-out').focus({preventScroll:true});announce('Our Solar System. Explore a planet or travel further out.');
}
function restart(){
  transition=null;cameraTween=null;focus=null;stage=0;document.body.dataset.focus='false';
  pendingInfo=null;clearTimeout(discoveryTimer);queuedStage=null;worlds.background.scale.setScalar(1);worlds.background.position.set(0,0,0);$('#creator-credit').hidden=true;
  hole.uniforms.uDive.value=0;setMode('entrance');audio.mood(0,false);$('#enter').focus({preventScroll:true});announce('Back at the black hole.');
}
function tweenCamera(target,position,duration=2.2){
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  document.body.dataset.transitioning='true';
  cameraTween={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now(),duration:gentle?0:duration};
}
function updateInterface(){
  controls.zoomSpeed=stage===0?2.4:1.5;
  $('#solar-time').hidden=stage!==0;
  $('#galactic-dock').hidden=stage!==2||!!focus;$('#heart-note').hidden=stage!==2||focus?.id!=='sagittarius';
  $('#horizon-lab').hidden=stage!==HORIZON;$('#horizon-dock').hidden=stage!==HORIZON;
  const info=LAYERS[stage];$('#location-kicker').textContent=info.kicker;$('#location-title').textContent=info.title;$('#location-subtitle').textContent=info.subtitle;
  $('#horizon-status').textContent=stage===HORIZON&&focus?focus.name:'Black-hole system';
  document.querySelectorAll('[data-horizon]').forEach(b=>b.classList.toggle('active',b.dataset.horizon===focus?.id));
  document.body.dataset.stage=String(stage);$('#planet-dock').hidden=stage!==0;$('#planet-focus').hidden=!focus;
  document.querySelectorAll('.scale-stop').forEach((button,i)=>{button.classList.toggle('active',i===stage);button.setAttribute('aria-current',i===stage?'step':'false');});
  $('#cosmic-dock').hidden=stage!==COSMIC;$('#galaxy-legend').hidden=stage!==3;$('#object-info').hidden=stage!==COSMIC||!focus;
  $('#leave-planet').textContent=stage===COSMIC?'← Back to the collection':stage===HORIZON?'← Back to the system':stage===2?'← Back to the Milky Way':'← Back to the Solar System';
  $('#scale-comparison').textContent=SCALES[stage][0];$('#scale-caption').textContent=SCALES[stage][1];
  document.querySelectorAll('.cosmic-button').forEach(b=>{b.classList.toggle('active',b.dataset.cosmic===focus?.id);b.setAttribute('aria-pressed',String(b.dataset.cosmic===focus?.id));});
  $('#go-in').disabled=stage===0&&!focus;$('#go-out').disabled=stage>=OBSERVABLE&&!focus;
  document.querySelectorAll('.planet-button').forEach(button=>{button.classList.toggle('active',button.dataset.planet===focus?.id);button.setAttribute('aria-pressed',String(button.dataset.planet===focus?.id));});
  $('#planet-labels').hidden=true;

  $('#go-out span').textContent=focus?'Leave orbit':'Further out';
}
function clearFocus(animate=true){
  pendingInfo=null;clearTimeout(discoveryTimer);if(!focus)return;focus=null;document.body.dataset.focus='false';$('#planet-focus').hidden=true;
  if(animate)tweenCamera(new THREE.Vector3(),(stage===COSMIC?new THREE.Vector3(0,60,335):new THREE.Vector3(170,120,210)).setLength(layerDistance(stage)));
  updateInterface();
}
function goToStage(next){
  if(mode!=='explore'||!worlds)return;
  if(transition){queuedStage=clamp(next,0,LAYERS.length-1);return;}
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  next=clamp(next,0,LAYERS.length-1);
  if(next===stage){if(focus)clearFocus();return;}
  clearFocus(false);cameraTween=null;
  document.body.dataset.transitioning='true';
  const from=stage,outward=next>stage;
  const old=worlds.layers[from],incoming=worlds.layers[next];
  incoming.visible=true;incoming.scale.setScalar(outward?2.2:.45);worlds.opacity(incoming,0);
  stage=next;updateInterface();audio.mood(next);
  const direction=next===COSMIC?new THREE.Vector3(0,60,335).normalize():camera.position.clone().sub(controls.target).normalize();
  if(direction.y<.15)direction.y=.2;
  transition={old,incoming,outward,start:performance.now(),duration:gentle?0:6,fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),toPosition:direction.normalize().multiplyScalar(layerDistance(next))};
  if((from===0&&next===1)||(from===2&&next===3)){
    // Reveal the surrounding region during the flight, then land on its wide view.
    incoming.scale.setScalar(1);
    Object.assign(transition,{wideReveal:true,duration:gentle?0:8});
  }
  if(from===1&&next===2){
    // Re-express the whole neighbourhood in a small patch of the galactic disk.
    // Transform the camera with it so the first frame retains the same view.
    const anchor=new THREE.Vector3(62,3,50),factor=.08;
    old.scale.setScalar(factor);old.position.copy(anchor);incoming.scale.setScalar(1);
    worlds.background.scale.setScalar(factor);worlds.background.position.copy(anchor);
    camera.position.multiplyScalar(factor).add(anchor);controls.target.multiplyScalar(factor).add(anchor);
    Object.assign(transition,{galactic:true,duration:gentle?0:7.2,anchor,fromTarget:controls.target.clone(),startDistance:camera.position.distanceTo(controls.target),direction:camera.position.clone().sub(controls.target).normalize()});
  }
  if(outward&&next<=OBSERVABLE&&!transition.galactic&&!transition.wideReveal){
    // Match the old image while changing coordinate scale, then continue pulling back.
    const factor=Math.min(1,layerDistance(next)/Math.max(1,camera.position.length()*3));
    old.scale.setScalar(factor);camera.position.multiplyScalar(factor);controls.target.multiplyScalar(factor);
    worlds.background.scale.setScalar(factor);incoming.scale.setScalar(1);
    Object.assign(transition,{remapped:true,oldScale:factor,fromPosition:camera.position.clone(),fromTarget:controls.target.clone()});
  }
  wheelSum=0;announce(LAYERS[next].title);
}
function focusGalacticHeart(){
 if(mode!=='explore'||stage!==2||transition)return;
 focus=worlds.heartBody;document.body.dataset.focus='true';$('#planet-name').textContent=focus.name;pendingInfo=null;
 followPrevious.set(0,0,0);targetOffset.set(8,5,22).multiplyScalar(innerWidth<700?1.6:1);
 tweenCamera(new THREE.Vector3(),targetOffset.clone(),5.5);updateInterface();announce('Approaching Sagittarius A star. Scale is enlarged for exploration.');
}
$('#visit-heart').onclick=focusGalacticHeart;$('#home-galaxy-marker').onclick=()=>{if(stage===0)focusPlanet('earth');else goToStage(stage===1?0:stage===2?1:2);};
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

function showDiscovery(id){
  const item=OBJECTS.find(o=>o.id===id);if(!item)return;
  $('#object-title').textContent=item.name;$('#object-tag').textContent=item.tag;$('#object-description').textContent=item.description;
  $('#object-facts').replaceChildren(...item.facts.map(f=>{const li=document.createElement('li');li.textContent=f;return li;}));
  $('#image-credit').textContent=item.caption;$('#object-scale').textContent=item.scale;$('#object-source').href=item.source;
  const hypothetical=item.id==='wormhole'||item.image===false;
  $('#no-photo').innerHTML=item.id==='wormhole'?'<span>∞</span>No photograph exists.<small>This wormhole is an imaginative model.</small>':'<span>✧</span>Conceptual model<small>'+item.caption+'</small>'; $('#object-image').hidden=hypothetical;$('#no-photo').hidden=!hypothetical;
  if(!hypothetical){$('#object-image').src=`assets/cosmic/${item.image||item.id}.jpg`;$('#object-image').alt=item.caption;}
  if(!$('#object-dialog').open)$('#object-dialog').showModal();
}
function focusCosmic(id){
  if(mode!=='explore'||stage!==COSMIC||transition||!worlds)return;
  const body=worlds.cosmicBodies.find(b=>b.id===id);if(!body)return;
  clearTimeout(discoveryTimer);const item=OBJECTS.find(o=>o.id===id);if(item.image!==false&&id!=='wormhole'){const img=new Image();img.src=`assets/cosmic/${item.image||id}.jpg`;}
  focus=body;pendingInfo=id;document.body.dataset.focus='true';$('#planet-name').textContent=body.name;updateInterface();
  body.body.getWorldPosition(temp);followPrevious.copy(temp);targetOffset.set(0,30,95).multiplyScalar(innerWidth<700?1.4:1);
  tweenCamera(temp,temp.clone().add(targetOffset),2.1);announce(body.name);
}
function focusHorizon(id){
  if(mode!=='explore'||stage!==HORIZON||transition)return;
  if(id==='overview'){clearFocus(false);tweenCamera(new THREE.Vector3(),new THREE.Vector3(170,120,210).setLength(layerDistance(HORIZON)),3);$('#horizon-status').textContent='Black-hole system';return;}
  if(id==='lens'){if($('#time-model').value==='physics'){$('#clock-radius').value='1.1';localSeconds=0;distantSeconds=0;}clearFocus(false);tweenCamera(new THREE.Vector3(),new THREE.Vector3(0,12,160),3.2);$('#horizon-status').textContent='Approaching the lens';return;}
  const body=worlds.horizon.bodies.find(b=>b.id===id);if(!body)return;
  if($('#time-model').value==='physics'){$('#clock-radius').value=String(body.orbit/20);localSeconds=0;distantSeconds=0;}
  focus=body;document.body.dataset.focus='true';$('#planet-name').textContent=body.name;$('#horizon-status').textContent=body.name;
  body.body.getWorldPosition(temp);followPrevious.copy(temp);targetOffset.set(15,12,38).multiplyScalar(innerWidth<700?1.6:1);
  tweenCamera(temp,temp.clone().add(targetOffset),3);updateInterface();
}
function timeText(seconds){if(seconds>=31557600)return (seconds/31557600).toFixed(2)+' yr';if(seconds>=86400)return (seconds/86400).toFixed(2)+' days';if(seconds>=3600)return (seconds/3600).toFixed(2)+' h';if(seconds>=60)return (seconds/60).toFixed(1)+' min';return seconds.toFixed(1)+' s';}
function updateClocks(dt,running){
  const cinematic=$('#time-model').value==='cinema',radius=Number($('#clock-radius').value),ratio=cinematic?CINEMA_RATIO:clockRatio(radius);
  if(running){localSeconds+=dt;distantSeconds+=dt*ratio;}
  $('#local-clock').textContent=timeText(localSeconds);$('#distant-clock').textContent=timeText(distantSeconds);
  $('#clock-ratio').textContent='1 hour here → '+timeText(3600*ratio)+' far away';
  $('#radius-value').textContent=radius.toFixed(2)+' × horizon radius';$('#clock-radius').disabled=cinematic;
  $('#horizon-size').textContent='Horizon radius ≈ '+Math.round(horizonKm(Number($('#hole-mass').value))).toLocaleString()+' km';
  $('#clock-explanation').textContent=cinematic?'A fictional Interstellar-style preset, not calculated from this model. Such an extreme ratio needs conditions beyond our simple non-rotating black hole.':'Teaching model: a hovering clock outside a non-rotating black hole, compared with a distant clock. It omits orbital motion and spin. Hovering near the horizon needs enormous thrust. At the same radius measured in horizon radii, the ratio is independent of mass.';
}
$('#horizon-dock').innerHTML='<button data-horizon="overview">System overview</button><button data-horizon="lens">Approach black hole</button>'+HORIZON_WORLDS.map(b=>`<button data-horizon="${b.id}">${b.name}</button>`).join('');
$('#horizon-dock').onclick=e=>{const b=e.target.closest('[data-horizon]');if(b)focusHorizon(b.dataset.horizon);};
$('#reset-clocks').onclick=()=>{localSeconds=0;distantSeconds=0;updateClocks(0,false);};
for(const id of ['time-model','clock-radius','hole-mass'])$('#'+id).addEventListener('input',()=>{localSeconds=0;distantSeconds=0;updateClocks(0,false);});

$('#cosmic-dock').innerHTML=OBJECTS.map(o=>`<button class="cosmic-button" data-cosmic="${o.id}" aria-pressed="false">${o.name}</button>`).join('');
$('#cosmic-dock').onclick=e=>{const b=e.target.closest('[data-cosmic]');if(b)focusCosmic(b.dataset.cosmic);};
$('#object-info').onclick=()=>focus&&showDiscovery(focus.id);
function closeDiscovery(){const d=$('#object-dialog');if(gentle){d.close();return;}d.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(18px)'}],{duration:240,easing:'ease-in'}).finished.then(()=>d.close());}
$('#close-object').onclick=closeDiscovery;$('#object-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDiscovery();});
$('#scale-guide').onclick=()=>$('#scale-dialog').showModal();$('#close-scale').onclick=()=>$('#scale-dialog').close();

$('#scale-stops').innerHTML=LAYERS.map((layer,i)=>`<button class="scale-stop ${i===0?'active':''}" data-stage="${i}" aria-current="${i===0?'step':'false'}">${layer.name}</button>`).join('');
$('#scale-stops').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)goToStage(Number(b.dataset.stage));});
$('#planet-dock').innerHTML=[SUN,...PLANETS].map(p=>`<button class="planet-button" data-planet="${p.id}" style="--planet:${p.color}" aria-pressed="false">${p.name}</button>`).join('');
$('#planet-dock').addEventListener('click',e=>{const b=e.target.closest('[data-planet]');if(b)focusPlanet(b.dataset.planet);});
$('#enter').onclick=startJourney;$('#enter-hole').onclick=startJourney;$('#skip-flight').onclick=()=>arrive();$('#home').onclick=restart;
$('#go-in').onclick=()=>focus?clearFocus():goToStage(stage-1);
$('#go-out').onclick=()=>focus?clearFocus():goToStage(stage+1);
$('#leave-planet').onclick=()=>clearFocus();
$('#solar-speed').onchange=e=>{if(worlds)worlds.solarClock.rate=Number(e.target.value);};
$('#pause').onclick=()=>{paused=!paused;$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').innerHTML=paused?'▷ <span>Resume</span>':'Ⅱ <span>Pause</span>';};
$('#retry-render').onclick=()=>location.reload();
$('#sound').onclick=async()=>{
  try{const enabled=await audio.toggle();$('#sound').setAttribute('aria-pressed',String(enabled));$('#sound').setAttribute('aria-label',enabled?'Turn ambient sound off':'Turn ambient sound on');$('#sound .utility-label').textContent=enabled?'Sound on':'Sound off';}
  catch{announce('Sound is unavailable in this browser. You can continue exploring silently.');}
};
for(const id of ['open-gallery','open-challenge'])$('#'+id).addEventListener('click',()=>{pendingInfo=null;clearTimeout(discoveryTimer);});
$('#settings').onclick=()=>{pendingInfo=null;clearTimeout(discoveryTimer);$('#settings-dialog').showModal();};$('.close-dialog').onclick=()=>$('#settings-dialog').close();
$('#settings-dialog').addEventListener('click',e=>{if(e.target===$('#settings-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#quality').value=quality;$('#quality').onchange=e=>{quality=e.target.value;adaptiveScale=1;slowSeconds=0;resize();saveSettings();};
$('#reduced-motion').checked=gentle;$('#reduced-motion').onchange=e=>{gentle=e.target.checked;saveSettings();if(gentle&&mode==='flight')arrive();};
reducedMedia.addEventListener('change',e=>{if(e.matches){gentle=true;$('#reduced-motion').checked=true;if(mode==='flight')arrive();}});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('Use your browser’s full-screen command to expand the view.');}};
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
document.addEventListener('visibilitychange',()=>{audio.visibility(document.hidden).catch(()=>{});lastFrame=performance.now();});
window.addEventListener('resize',resize);
window.addEventListener('pointermove',e=>mouse.set((e.clientX/innerWidth-.5)*2,-(e.clientY/innerHeight-.5)*2));
$('#cosmos').addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};if(mode==='explore'){cameraTween=null;pendingInfo=null;clearTimeout(discoveryTimer);}});
$('#cosmos').addEventListener('pointerup',e=>{
  if(scenic||mode!=='explore'||(stage!==0&&stage!==2&&stage!==COSMIC&&stage!==HORIZON)||!pointerDown||transition)return;
  const moved=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(moved>6)return;
  pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(stage===2?[worlds.heartHit]:stage===COSMIC?worlds.cosmicSelectable:stage===HORIZON?worlds.horizon.selectable:worlds.selectable)[0];if(hit){if(stage===2)focusGalacticHeart();else if(stage===COSMIC)focusCosmic(hit.object.userData.cosmic);else if(stage===HORIZON)focusHorizon(hit.object.userData.horizon);else focusPlanet(hit.object.userData.planet);}
});
$('#cosmos').addEventListener('wheel',e=>{
  if(mode!=='explore'||transition||cameraTween||stage>OBSERVABLE)return;
  const now=performance.now();if(now-lastWheel>250)wheelSum=0;lastWheel=now;wheelSum+=e.deltaY;
  const distance=camera.position.distanceTo(controls.target),reference=layerDistance(stage);
  if(focus&&e.deltaY>0&&distance>focus.radius*19){clearFocus();wheelSum=0;}
  else if(!focus&&stage<OBSERVABLE&&e.deltaY>0&&distance>reference*1.7&&wheelSum>80)goToStage(stage+1);
  else if(!focus&&e.deltaY<0&&stage>0&&distance<reference*.28&&wheelSum< -80){if(stage===2)focusGalacticHeart();else goToStage(stage-1);}
},{passive:true});
window.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]'))return;
  if(e.key==='Escape'&&scenic){setScenic(false);return;}
  if(e.key.toLowerCase()==='h'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){setScenic(!scenic);return;}
  if(e.key==='Escape'&&mode==='flight')arrive();else if(e.key==='Escape'&&focus)clearFocus();
  else if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;
  else if(mode==='explore'&&stage<=OBSERVABLE&&(e.key==='+'||e.key==='=')){e.preventDefault();goToStage(stage-1);}
  else if(mode==='explore'&&stage<OBSERVABLE&&e.key==='-'){e.preventDefault();goToStage(stage+1);}
});
function updateExploration(now,dt){
  const moving=!paused&&!gentle;
  worlds.update(clockTime,dt,moving,stage,camera);
  if(stage===HORIZON)updateClocks(dt,!paused);
  if(stage===0){const days=Math.floor(worlds.solarClock.days);$('#solar-elapsed').textContent=days.toLocaleString()+(days===1?' day':' days')+' travelled'+(paused||gentle||worlds.solarClock.rate===0?' · paused':'');}
  document.body.dataset.transitioning=String(!!transition||!!cameraTween);
  if(transition){
    const tr=transition,t=tr.duration?clamp((now-tr.start)/(tr.duration*1000)):1,e=ease(t);
    if(tr.galactic){
      controls.target.copy(tr.fromTarget).multiplyScalar(1-e);
      const distance=tr.startDistance*Math.pow(layerDistance(2)/tr.startDistance,e);
      camera.position.copy(controls.target).addScaledVector(tr.direction,distance);
      worlds.opacity(tr.old,1-ease(clamp(t/.85)));worlds.opacity(tr.incoming,ease(clamp((t-.08)/.78)));
      worlds.background.scale.setScalar(.08*Math.pow(1/.08,e));worlds.background.position.copy(tr.anchor).multiplyScalar(1-e);
    }else if(tr.wideReveal){
      tr.old.scale.setScalar(Math.pow(.035,e));tr.incoming.scale.setScalar(1);
      worlds.opacity(tr.old,1-ease(clamp(t/.7)));
      worlds.opacity(tr.incoming,ease(clamp((t-.05)/.4)));
      controls.target.copy(tr.fromTarget).multiplyScalar(1-e);
      const offset=tr.fromPosition.clone().sub(tr.fromTarget);
      const distance=offset.length()*Math.pow(tr.toPosition.length()/Math.max(.01,offset.length()),e);
      camera.position.copy(offset.normalize().lerp(tr.toPosition.clone().normalize(),e).normalize().multiplyScalar(distance)).add(controls.target);
    }else{
    tr.old.scale.setScalar((tr.oldScale||1)*(tr.outward?Math.pow(.2,e):Math.pow(2.2,e)));
    tr.incoming.scale.setScalar(tr.remapped?1:tr.outward?Math.pow(2.2,1-e):Math.pow(.45,1-e));
    if(tr.remapped)worlds.background.scale.setScalar(tr.oldScale*Math.pow(1/tr.oldScale,e));
    worlds.opacity(tr.old,1-ease(clamp(t/.88)));worlds.opacity(tr.incoming,ease(clamp((t-.08)/.82)));
    controls.target.copy(tr.fromTarget).multiplyScalar(1-e);
    const fromOffset=tr.fromPosition.clone().sub(tr.fromTarget),endDistance=tr.toPosition.length();
    const distance=fromOffset.length()*Math.pow(endDistance/Math.max(.01,fromOffset.length()),e);
    camera.position.copy(fromOffset.normalize().lerp(tr.toPosition.clone().normalize(),e).normalize().multiplyScalar(distance)).add(controls.target);
    }
    if(t===1){tr.old.position.set(0,0,0);tr.old.visible=false;tr.old.scale.setScalar(1);worlds.opacity(tr.old,1);tr.incoming.scale.setScalar(1);worlds.opacity(tr.incoming,1);transition=null;if(queuedStage!==null){const next=queuedStage;queuedStage=null;goToStage(next);}}
  }else if(cameraTween){
    const tw=cameraTween,t=tw.duration?clamp((now-tw.start)/(tw.duration*1000)):1,e=ease(t);
    if(focus){focus.body.getWorldPosition(temp);tw.to.copy(temp).add(targetOffset);tw.targetTo.copy(temp);followPrevious.copy(temp);}
    camera.position.lerpVectors(tw.from,tw.to,e);controls.target.lerpVectors(tw.targetFrom,tw.targetTo,e);
    if(t===1){cameraTween=null;if(pendingInfo){const id=pendingInfo;pendingInfo=null;discoveryTimer=setTimeout(()=>{if(!scenic&&mode==='explore'&&stage===COSMIC&&focus?.id===id&&!document.querySelector('dialog[open]'))showDiscovery(id);},gentle?0:750);}}
  }else if(focus){
    focus.body.getWorldPosition(temp);const delta=temp.clone().sub(followPrevious);camera.position.add(delta);controls.target.add(delta);followPrevious.copy(temp);
  }
  controls.enabled=!transition&&!cameraTween&&!document.querySelector('dialog[open]');if(transition||cameraTween)camera.lookAt(controls.target);else controls.update();worlds.orient(camera);
  if(!transition&&!cameraTween&&stage<=OBSERVABLE){
    const distance=camera.position.distanceTo(controls.target),reference=layerDistance(stage);
    if(focus&&distance>focus.radius*19)clearFocus();
    else if(!focus&&stage<OBSERVABLE&&distance>reference*1.9)goToStage(stage+1);
    else if(!focus&&stage>0&&distance<reference*.24){if(stage===2)focusGalacticHeart();else goToStage(stage-1);}
  }
  worlds.solarOrbits.forEach(line=>line.visible=!focus);
  if(stage===HORIZON)worlds.horizon.orbits.forEach(line=>{line.visible=!scenic&&!focus&&camera.position.distanceTo(controls.target)>300;});
  if(stage===2&&!transition){const near=1-ease(clamp((camera.position.length()-25)/150));worlds.opacity(worlds.milky,1-near*.98);worlds.galacticHeart.visible=near>.01;worlds.opacity(worlds.galacticHeart,near);}
  else if(stage!==2&&!transition){worlds.galacticHeart.visible=false;worlds.opacity(worlds.milky,1);}
  const marker=$('#home-galaxy-marker'),leader=$('#earth-leader'),anchor=worlds.homeAnchors[stage];
  let show=!!anchor&&!transition&&(!focus||focus.id==='earth');
  if(show){
    temp.copy(anchor).project(camera);
    const x=(temp.x*.5+.5)*innerWidth,y=(-temp.y*.5+.5)*innerHeight;
    show=temp.z>-1&&temp.z<1&&x>12&&x<innerWidth-12&&y>90&&y<innerHeight-110;
    if(show){const lx=x+(x>innerWidth*.68?-65:48),ly=y+(y<160?35:-36);
      marker.style.left=lx+'px';marker.style.top=ly+'px';
      const line=leader.querySelector('line'),dot=leader.querySelector('circle');
      line.setAttribute('x1',x);line.setAttribute('y1',y);line.setAttribute('x2',lx+17);line.setAttribute('y2',ly+17);dot.setAttribute('cx',x);dot.setAttribute('cy',y);
      marker.title=stage===0?'Our home planet':stage===1?'Earth is inside this Solar System':stage===2?'Approximate location of our Solar System':'Earth is within our home galaxy; location is illustrative';
    }
  }
  marker.hidden=!show;leader.toggleAttribute('hidden',!show);
  post.render(worlds.scene,camera,{bloom:stage===3?0:stage===0?.55:.65});
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
    const progress=clamp((elapsed-3)/10);
    hole.uniforms.uTime.value=clockTime;hole.uniforms.uDive.value=ease(clamp(elapsed/4.5));
    flight.uniforms.uTime.value=elapsed;flight.uniforms.uProgress.value=progress;
    if(elapsed<4.5){
      post.render(hole.scene,hole.camera,{bloom:1,nextScene:flight.scene,nextCamera:flight.camera,mix:ease(clamp((elapsed-2.8)/1.7))});
      $('#flight-caption').textContent='Beyond the familiar. Into the unknown.';
    }else if(elapsed<16){
      const arrival=ease(clamp((elapsed-10)/6));
      worlds.layers.forEach((g,i)=>g.visible=i===0);worlds.update(clockTime,dt,!gentle,0,camera);
      const direction=new THREE.Vector3(0,.12,1).lerp(new THREE.Vector3(170,120,210).normalize(),arrival).normalize();
      camera.position.copy(direction).multiplyScalar(layerDistance(0)*Math.pow(3.8,1-arrival));controls.target.set(0,0,0);camera.lookAt(controls.target);
      post.render(flight.scene,flight.camera,{bloom:.85,nextScene:worlds.scene,nextCamera:camera,mix:ease(clamp((elapsed-10)/4))});
      $('#flight-caption').textContent=elapsed<10?'Through a passage of light.':'One star. Eight worlds. Home.';
    }else arrive(true);
  }else if(worlds)updateExploration(now,dt);
}
setMode('entrance');setup();
