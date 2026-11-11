'use client';
import {useEffect,useRef} from 'react';
// One continuous fog field, rendered per pixel: no tiles or overlapping sprite edges.
const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
uniform vec2 resolution;uniform float elapsed;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float mist(vec2 p){float n=0.,a=.55;mat2 turn=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){n+=a*noise(p);p=turn*p*1.93+vec2(7.13,3.71);a*=.48;}return n;}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution,p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
 float t=max(0.,elapsed-3.45);
 vec2 flow=p/(1.+t*.14)+vec2(t*.025,-t*.018);
 float warp=mist(flow*1.3+vec2(8.,3.));
 float density=mist(flow*2.2+vec2(warp*.65,warp*.4));
 float envelope=smoothstep(3.45,4.6,elapsed)*(1.-smoothstep(7.9,9.4,elapsed));
 float clearing=smoothstep(5.7,8.9,elapsed)*(1.-smoothstep(.1,1.25,length(p*vec2(.7,1.))));
 float alpha=envelope*mix(.86,1.,density)*(1.-clearing*.85);
 vec3 color=mix(vec3(.64,.68,.70),vec3(.94,.95,.95),smoothstep(.1,.9,density));
 color+=(hash(gl_FragCoord.xy)-.5)/255.;
 gl_FragColor=vec4(color,alpha);
}`;
export default function CloudPassage(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false});
  const fallback=()=>{canvas.dataset.renderer='fallback'};
  if(!gl){fallback();return;}
  const shader=(kind:number,source:string)=>{const s=gl.createShader(kind)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;};
  const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment);
  if(!v||!f){if(v)gl.deleteShader(v);if(f)gl.deleteShader(f);fallback();return;}
  const program=gl.createProgram()!;gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteShader(v);gl.deleteShader(f);gl.deleteProgram(program);fallback();return;}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const size=gl.getUniformLocation(program,'resolution'),time=gl.getUniformLocation(program,'elapsed');
  const resize=()=>{const ratio=Math.min(1.25,devicePixelRatio);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(size,canvas.width,canvas.height);};
  resize();window.addEventListener('resize',resize);canvas.dataset.renderer='continuous-fog';
  const start=performance.now();let frame=0;
  const paint=(ms:number)=>{const seconds=(ms-start)/1000;gl.uniform1f(time,seconds);gl.drawArrays(gl.TRIANGLES,0,6);if(seconds<9.5)frame=requestAnimationFrame(paint)};
  frame=requestAnimationFrame(paint);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(v);gl.deleteShader(f);};
 },[]);
 return <canvas ref={ref} className="cloud-passage" aria-hidden="true"/>;
}
