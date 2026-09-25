// Original ambient synthesis. No media download, autoplay or film soundtrack.
export function createAudio(){
  let context,master,wind,voices=[],enabled=false;
  function setup(){
    context=new (window.AudioContext||window.webkitAudioContext)();
    master=context.createGain();master.gain.value=0;master.connect(context.destination);
    for(const [i,hz] of [55,82.4069,110,164.8138].entries()){
      const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=hz;oscillator.detune.value=i%2?3:-3;gain.gain.value=[.14,.06,.04,.018][i];oscillator.connect(gain);gain.connect(master);oscillator.start();voices.push(oscillator);
    }
    const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*3;}
    const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;
    wind=context.createGain();wind.gain.value=.015;source.connect(filter);filter.connect(wind);wind.connect(master);source.start();
  }
  return {
    async toggle(){if(!context)setup();enabled=!enabled;await context.resume();master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(enabled?.4:0,context.currentTime,.4);return enabled;},
    mood(layer,flight=false){if(!context)return;wind.gain.setTargetAtTime(flight?.15:.015,context.currentTime,.8);voices.forEach((v,i)=>v.detune.setTargetAtTime((i%2?3:-3)+layer*17,context.currentTime,2));},
    async visibility(hidden){if(!context)return;if(hidden)await context.suspend();else if(enabled)await context.resume();},
  };
}
