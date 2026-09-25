// Answers use stable text IDs, so reshuffling never changes correctness.
export const QUESTIONS = [
 {question:'Which planet could win a prize for rolling around the Sun on its side?',answer:'Uranus',choices:['Uranus','Mars','Earth','Mercury'],fact:'Uranus has an extreme axial tilt of about 98°. Imagine a spinning ball rolling on its side.'},
 {question:'Which planet has the hottest surface — even though it is not closest to the Sun?',answer:'Venus',choices:['Venus','Mercury','Jupiter','Neptune'],fact:'Venus’s thick atmosphere traps heat in a powerful greenhouse effect.'},
 {question:'You spot Saturn’s rings up close. What are they mostly made of?',answer:'Chunks of ice',choices:['Chunks of ice','One solid metal hoop','Glowing lava','Clouds of smoke'],fact:'The rings contain countless pieces of ice, with rock and dust mixed in.'},
 {question:'A light-year sounds like time. What does it actually measure?',answer:'Distance',choices:['Distance','A star’s age','Temperature','The speed of a planet'],fact:'It is how far light travels in one year: about 9.46 trillion kilometres.'},
 {question:'What would you find at the heart of a quasar?',answer:'A feeding supermassive black hole',choices:['A feeding supermassive black hole','A giant burning planet','A single ordinary star','A cluster of comets'],fact:'The brilliant light comes from hot material around a supermassive black hole. A quasar is an active galactic centre.'},
 {question:'Which space shortcut is still hypothetical?',answer:'A wormhole',choices:['A wormhole','The Milky Way','A nebula','Saturn’s rings'],fact:'Wormholes are theoretical ideas. Nobody has observed one, so our tunnel is an imaginative model.'},
 {question:'The Pillars of Creation are a huge stellar nursery. What is being born there?',answer:'New stars',choices:['New stars','Soccer pitches','Finished galaxies','Only black holes'],fact:'Dense regions of gas and dust can collapse under gravity to form stars.'},
 {question:'What can escape from inside a black hole’s event horizon?',answer:'Nothing, not even light',choices:['Nothing, not even light','Only radio waves','A very fast rocket','Sunlight'],fact:'The event horizon is the boundary beyond which signals cannot escape to a distant observer.'},
 {question:'Our Sun belongs to which enormous island of stars?',answer:'The Milky Way',choices:['The Milky Way','Andromeda','The Solar System galaxy','The Southern Ring'],fact:'The Solar System is a small part of the Milky Way, our home galaxy.'},
 {question:'Webb reveals hidden details in dusty clouds. What kind of light does it mainly detect?',answer:'Infrared light',choices:['Infrared light','Only visible green light','Sound waves','Only gamma rays'],fact:'Webb observes infrared light. Its images map invisible wavelengths into colours we can see.'}
];
export const PASS_SCORE = 8;
export function earnsBadge(score,total=QUESTIONS.length){return total>0&&score/total>=.8;}
export function shuffled(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
