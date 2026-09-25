import * as THREE from 'three';

// A cinematic, approximate ray-bending model. This is deliberately not presented
// as a physically exact Kerr metric solver. Rays curve around a spherical mass,
// intersect a turbulent emissive disk and continue into the star background.
export function createBlackHole() {
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uMouse: { value: new THREE.Vector2() },
    uDive: { value: 0 },
    uQuality: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime, uDive, uQuality;
      uniform vec2 uResolution, uMouse;
      #define PI 3.14159265359
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      float fbm(vec2 p) {
        float v=0.; float a=.5;
        for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+13.2;a*=.5;}
        return v;
      }
      vec3 sky(vec3 d) {
        vec2 uv=vec2(atan(d.z,d.x)/6.28318,asin(clamp(d.y,-1.,1.))/PI);
        float cloud=fbm(uv*7.+vec2(3.2,1.1));
        float band=exp(-abs(uv.y+.14*sin(uv.x*7.))*9.);
        vec3 col=vec3(.0015,.002,.0035)+vec3(.016,.019,.029)*cloud*band;
        vec2 st=uv*vec2(1400.,700.);vec2 id=floor(st);vec2 f=fract(st)-.5;
        float seed=hash(id);float star=smoothstep(.992,1.,seed)*exp(-dot(f,f)*90.);
        col+=star*mix(vec3(.5,.64,.85),vec3(1.,.82,.59),hash(id+3.))*1.4;
        vec2 st2=uv*vec2(310.,155.);vec2 f2=fract(st2)-.5;
        col+=pow(max(0.,1.-length(f2)*2.),28.)*step(.993,hash(floor(st2)))*vec3(.6,.7,.9);
        return col;
      }
      vec4 disk(vec3 p) {
        float r=length(p.xz);
        float inner=2.65, outer=10.;
        if(r<inner||r>outer)return vec4(0.);
        float a=atan(p.z,p.x);
        float flow=uTime*.2/pow(r*.3,1.5);
        vec2 coord=vec2(r*3.2,a*5.-flow*3.);
        float turb=fbm(vec2(r*5.+fbm(vec2(a*3.,r))*.7,a*3.-flow));
        float strands=.55+.45*sin(r*36.+turb*13.+a*.8);
        strands=mix(strands,1.,.3);
        float knots=fbm(coord+vec2(turb*3.,0.));
        float edge=smoothstep(inner,inner+.35,r)*(1.-smoothstep(6.5,outer,r));
        float fall=pow(inner/r,2.1);
        float doppler=pow(1.+.43*cos(a+.5),2.);
        float intensity=(.8+knots*2.6)*strands*edge*fall*doppler;
        vec3 hot=mix(vec3(1.15,.35,.075),vec3(1.7,1.3,.8),pow(inner/r,.6));
        float flecks=pow(noise(vec2(r*95.,a*110.-flow*60.)),20.)*12.;
        hot*=intensity*2.0+flecks*fall*edge;
        return vec4(hot,clamp(edge*(.65+knots*.3),0.,.96));
      }
      void main() {
        vec2 screen=(vUv-.5)*2.;
        float aspect=uResolution.x/uResolution.y;
        screen.x*=aspect;
        // Reserve the lower part of the frame for a small invitation to enter.
        screen.y-=.22;
        float wide=aspect<1.?1.55:1.;
        float distance=mix(21.,2.2,uDive);
        vec3 ro=vec3(uMouse.x*.35,2.2+uMouse.y*.18,distance);
        vec3 forward=normalize(-ro);
        vec3 right=normalize(cross(forward,vec3(0.,1.,0.)));
        vec3 up=cross(right,forward);
        vec3 rd=normalize(forward+screen.x*right*.49*wide+screen.y*up*.49*wide);
        vec3 p=ro, dir=rd;
        float angular=length(cross(p,dir));
        float h2=angular*angular;
        vec3 light=vec3(0.);float trans=1.;bool swallowed=false;
        float closest=100.;
        for(int i=0;i<150;i++) {
          float r=length(p);closest=min(closest,r);
          if(r<1.02){swallowed=true;break;}
          if(r>32.)break;
          float stepSize=clamp(r*.095,.075,1.2);
          vec3 accel=-1.5*h2*p/pow(r,5.);
          vec3 nextDir=normalize(dir+accel*stepSize);
          vec3 next=p+nextDir*stepSize;
          if(p.y*next.y<0.) {
            float t=p.y/(p.y-next.y);
            vec3 hit=mix(p,next,t);
            vec4 emission=disk(hit);
            light+=trans*emission.rgb;
            trans*=1.-emission.a;
          }
          // A faint hot atmosphere around the disk, rather than a hard cutout.
          float halo=exp(-abs(p.y)*5.)*exp(-abs(r-3.8)*.65);
          light+=trans*vec3(1.,.48,.15)*halo*stepSize*.025;
          p=next;dir=nextDir;
        }
        if(!swallowed)light+=sky(dir)*trans;
        // Thin photon-ring shimmer, with a soft light falloff outside the shadow.
        float photon=exp(-abs(closest-1.5)*30.)*.14;
        light+=vec3(1.,.69,.34)*photon;
        float vignette=1.-.18*dot(vUv-.5,vUv-.5);
        light*=vignette;
        gl_FragColor=vec4(light,1.);
      }`,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  return { scene, camera: new THREE.Camera(), uniforms };
}
