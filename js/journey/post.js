import * as THREE from 'three';

// A small HDR bloom pipeline: full-resolution scene, two half-resolution blur
// targets, then exposure/tone mapping. The targets are reused across every layer.
export function createPost(renderer) {
  const options = { type: THREE.HalfFloatType, depthBuffer: true };
  const source = new THREE.WebGLRenderTarget(1, 1, options);
  const ping = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const pong = ping.clone();
  const ortho = new THREE.Camera();
  const vertexShader = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const blur = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { image: {value:null}, direction:{value:new THREE.Vector2()}, threshold:{value:0} },
    vertexShader,
    fragmentShader:`varying vec2 vUv;uniform sampler2D image;uniform vec2 direction;uniform float threshold;
      vec3 sampleLight(vec2 p){vec3 c=texture2D(image,p).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-threshold)/max(.001,max(c.r,max(c.g,c.b)));}
      void main(){vec3 c=sampleLight(vUv)*.227027;
        c+=sampleLight(vUv+direction*1.384615)*.316216;c+=sampleLight(vUv-direction*1.384615)*.316216;
        c+=sampleLight(vUv+direction*3.230769)*.070270;c+=sampleLight(vUv-direction*3.230769)*.070270;
        gl_FragColor=vec4(c,1.);}`,
  });
  const composite = new THREE.ShaderMaterial({
    depthTest:false, depthWrite:false,
    uniforms:{base:{value:source.texture},bloom:{value:pong.texture},strength:{value:.8},fade:{value:1}},
    vertexShader,
    fragmentShader:`varying vec2 vUv;uniform sampler2D base,bloom;uniform float strength,fade;
      vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
      void main(){vec3 c=texture2D(base,vUv).rgb+texture2D(bloom,vUv).rgb*strength;c=aces(c);c=pow(c,vec3(1./2.2));gl_FragColor=vec4(c*fade,1.);}`,
  });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2),blur);scene.add(quad);
  let width=1,height=1;
  return {
    resize(w,h){width=w;height=h;source.setSize(w,h);ping.setSize(Math.max(1,w>>1),Math.max(1,h>>1));pong.setSize(Math.max(1,w>>1),Math.max(1,h>>1));},
    render(world,camera,{bloom=.7,fade=1}={}){
      renderer.setRenderTarget(source);renderer.render(world,camera);
      quad.material=blur;blur.uniforms.image.value=source.texture;blur.uniforms.direction.value.set(3/width,0);blur.uniforms.threshold.value=.8;
      renderer.setRenderTarget(ping);renderer.render(scene,ortho);
      blur.uniforms.image.value=ping.texture;blur.uniforms.direction.value.set(0,3/height);blur.uniforms.threshold.value=0;
      renderer.setRenderTarget(pong);renderer.render(scene,ortho);
      blur.uniforms.image.value=pong.texture;blur.uniforms.direction.value.set(7/width,0);
      renderer.setRenderTarget(ping);renderer.render(scene,ortho);
      blur.uniforms.image.value=ping.texture;blur.uniforms.direction.value.set(0,7/height);
      renderer.setRenderTarget(pong);renderer.render(scene,ortho);
      quad.material=composite;composite.uniforms.strength.value=bloom;composite.uniforms.fade.value=fade;
      renderer.setRenderTarget(null);renderer.render(scene,ortho);
    },
  };
}
