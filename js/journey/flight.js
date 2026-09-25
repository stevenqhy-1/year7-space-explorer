import * as THREE from 'three';
export function createFlight(){
  const uniforms={uTime:{value:0},uProgress:{value:0},uResolution:{value:new THREE.Vector2()}};
  const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;varying vec2 vUv;uniform float uTime,uProgress;uniform vec2 uResolution;
    float hash(float x){return fract(sin(x*127.1)*43758.5453);}
    void main(){vec2 uv=(vUv-.5)*2.;uv.x*=uResolution.x/uResolution.y;
      float r=length(uv),a=atan(uv.y,uv.x);float spiral=a+uTime*.14+1.3/(r+.4);
      float filaments=pow(.5+.5*sin(spiral*13.+sin(r*10.-uTime*4.)),8.);
      float mist=pow(.5+.5*sin(spiral*5.-r*7.+uTime),3.)*.16;
      vec3 col=mix(vec3(.07,.12,.3),vec3(.45,.15,.07),.5+.5*sin(a*2.+uProgress*4.));
      col*=(filaments*.3+mist)*smoothstep(.05,.4,r);
      for(int j=0;j<3;j++){
        float sectors=180.+float(j)*137.;float id=floor((a+3.14159)/6.28318*sectors);
        float angle=fract((a+3.14159)/6.28318*sectors)-.5;
        float seed=hash(id+float(j)*200.);float z=fract(seed+uTime*(.23+float(j)*.05));
        float head=.09+z*z*2.4;float tail=.025+z*.32;float streak=exp(-angle*angle*(100.+float(j)*30.))*smoothstep(head-tail,head,r)*(1.-smoothstep(head,head+.016,r));
        col+=streak*mix(vec3(.4,.6,1.),vec3(1.,.73,.4),seed)*(.4+z*1.3);
      }
      col+=vec3(.35,.45,.65)*exp(-r*r*65.)*(.2+uProgress*.6);
      gl_FragColor=vec4(col,1.);
    }`});
  const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  return {scene,camera:new THREE.Camera(),uniforms};
}
