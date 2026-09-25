import { OBJECTS } from './discoveries.js';
import { QUESTIONS, PASS_SCORE, earnsBadge, shuffled } from './challenge-data.js';
const $=s=>document.querySelector(s);
const gallery=[
 {name:'Cosmic Cliffs',file:'cliffs',caption:'A sculpted landscape of gas and dust in the Carina Nebula. Webb NIRCam + MIRI; NASA, ESA, CSA, STScI. Infrared mapped to visible colours.',source:'https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-and-miri-composite-image/'},
 {name:'Pillars of Creation',...imageFrom('nebula')},
 {name:'Southern Ring Nebula',file:'ring',caption:'Shells of gas shed by an ageing star. Webb NIRCam; NASA, ESA, CSA, STScI. Infrared mapped to visible colours.',source:'https://science.nasa.gov/asset/webb/southern-ring-nebula-nircam-image/'},
 {name:'Cassiopeia A',...imageFrom('supernova')},
 {name:'A black hole’s shadow',...imageFrom('blackhole')},
 {name:'A quasar through a cosmic lens',...imageFrom('quasar')}
];
function imageFrom(id){const item=OBJECTS.find(o=>o.id===id);return {file:id,caption:item.caption,source:item.source};}
let selectedImage=0;
$('#gallery-grid').innerHTML=gallery.map((item,i)=>`<button class="gallery-card" data-image="${i}" aria-label="View ${item.name}"><img src="assets/cosmic/${item.file}.jpg" alt="${item.name}" loading="lazy"><span>${item.name}<b aria-hidden="true">↗</b></span></button>`).join('');
function openImage(i){selectedImage=(i+gallery.length)%gallery.length;const item=gallery[selectedImage];$('#gallery-grid').hidden=true;$('#gallery-view').hidden=false;$('#gallery-photo').src=`assets/cosmic/${item.file}.jpg`;$('#gallery-photo').alt=item.caption;$('#gallery-caption').textContent=item.caption;$('#gallery-photo-title').textContent=item.name;$('#gallery-position').textContent=`${selectedImage+1} / ${gallery.length}`;$('#gallery-source').href=item.source;$('#gallery-back').focus();}
$('#gallery-grid').onclick=e=>{const b=e.target.closest('[data-image]');if(b)openImage(Number(b.dataset.image));};
$('#gallery-prev').onclick=()=>openImage(selectedImage-1);$('#gallery-next').onclick=()=>openImage(selectedImage+1);
$('#gallery-back').onclick=()=>{$('#gallery-grid').hidden=false;$('#gallery-view').hidden=true;$(`[data-image="${selectedImage}"]`).focus();};
$('#gallery-dialog').addEventListener('keydown',e=>{if($('#gallery-view').hidden)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();openImage(selectedImage+(e.key==='ArrowRight'?1:-1));}});
$('#open-gallery').onclick=()=>{$('#gallery-dialog').showModal();};
$('#close-gallery').onclick=()=>$('#gallery-dialog').close();

const storageKey='beyond-challenge-v1';let best=0,persistent=true,round=[],index=0,score=0,answered=false;
try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}').best;best=Number.isInteger(value)&&value>=0&&value<=QUESTIONS.length?value:0;}catch{persistent=false;}
function updateRecord(){const earned=earnsBadge(best);$('#challenge-record').textContent=best?`Personal best: ${best} / ${QUESTIONS.length}${earned?' · Cosmic Explorer badge earned':''}`:'Your first expedition starts here.';$('#challenge-earned').hidden=!earned;$('#open-challenge').classList.toggle('has-badge',earned);$('#open-challenge').setAttribute('aria-label',earned?'Space challenge — badge earned':'Space challenge');$('#record-note').textContent=persistent?'Your best score and badge stay on this browser.':'Progress is available for this visit; browser storage is unavailable.';}
function saveRecord(){best=Math.max(best,score);try{localStorage.setItem(storageKey,JSON.stringify({best}));}catch{persistent=false;}updateRecord();}
function startRound(){round=shuffled(QUESTIONS);index=0;score=0;$('#challenge-intro').hidden=true;$('#challenge-result').hidden=true;$('#challenge-round').hidden=false;renderQuestion();}
function renderQuestion(){answered=false;const q=round[index];$('#question-number').textContent=`QUESTION ${index+1} OF ${round.length}`;$('#quiz-progress').value=index;$('#quiz-score').textContent=`${score} correct`;$('#quiz-question').textContent=q.question;$('#quiz-feedback').hidden=true;$('#quiz-next').hidden=true;$('#quiz-choices').replaceChildren(...shuffled(q.choices).map(choice=>{const button=document.createElement('button');button.className='quiz-choice';button.textContent=choice;button.onclick=()=>answer(choice,button);return button;}));$('#quiz-question').focus();}
function answer(choice,button){if(answered)return;answered=true;const q=round[index],correct=choice===q.answer;if(correct)score++;for(const b of $('#quiz-choices').children){b.disabled=true;if(b.textContent===q.answer)b.classList.add('correct');}if(!correct)button.classList.add('incorrect');$('#quiz-score').textContent=`${score} correct`;$('#quiz-progress').value=index+1;$('#quiz-feedback').textContent=`${correct?'You got it!':`The answer is: ${q.answer}.`} ${q.fact}`;$('#quiz-feedback').hidden=false;$('#quiz-next').hidden=false;$('#quiz-next').textContent=index===round.length-1?'See my result ↗':'Next question ↗';$('#quiz-next').focus();}
function finishRound(){saveRecord();$('#challenge-round').hidden=true;$('#challenge-result').hidden=false;const pass=earnsBadge(score,round.length);$('#result-title').textContent=pass?'Cosmic Explorer unlocked.':'A little closer to the cosmos.';$('#result-score').textContent=`${score} / ${round.length} · ${Math.round(score/round.length*100)}%`;$('#result-message').textContent=pass?'You earned your badge. Keep wondering, keep exploring.':`You need ${PASS_SCORE} correct answers to earn the badge. Take another journey, then try again — you’ve got this.`;$('#result-badge').hidden=!pass;$('#download-badge').hidden=!pass;$('#result-title').focus();}
$('#quiz-next').onclick=()=>{if(!answered)return;if(++index===round.length)finishRound();else renderQuestion();};
$('#start-challenge').onclick=startRound;$('#retry-challenge').onclick=startRound;
$('#open-challenge').onclick=()=>{$('#challenge-dialog').showModal();};
$('#close-challenge').onclick=()=>$('#challenge-dialog').close();
$('#challenge-home').onclick=()=>{$('#challenge-result').hidden=true;$('#challenge-intro').hidden=false;$('#start-challenge').focus();};
updateRecord();
