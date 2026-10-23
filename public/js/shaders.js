/* GLSL: общий код + пять сцен (четыре 3D и финальная 2D). Каждая сцена — отдельная программа. */

export const VERT = `#version 300 es
void main(){
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uU;
uniform vec2 uMouse;
uniform float uShift;
uniform vec2 uJit;
out vec4 fragColor;
#define PI 3.14159265
#define ZERO min(int(uRes.x),0)
float gT;

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float h11(float n){ return fract(sin(n*127.1+1.7)*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float h31(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s; }
float fbmL(vec3 p){ return .6*vnoise(p)+.4*vnoise(p*2.03+17.1); }
float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
float smax(float a,float b,float k){ return -smin(-a,-b,k); }
float sdRoundCyl(vec3 p,float r,float h,float rr){
  vec2 d=vec2(length(p.xz)-r+rr,abs(p.y)-h+rr);
  return min(max(d.x,d.y),0.)+length(max(d,0.))-rr;
}
float sdRoundBox(vec3 p,vec3 b,float r){
  vec3 q=abs(p)-b+r;
  return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;
}
vec2 opU(vec2 a,vec2 b){ return a.x<b.x?a:b; }

/* студийное окружение: тёмная пустота + мягкие софтбоксы */
vec3 env(vec3 d){
  vec3 c=mix(vec3(.03,.021,.013),vec3(.17,.12,.075),smoothstep(-.3,1.,d.y));
  vec3 L1=normalize(vec3(-.55,.68,.48));
  float k=dot(d,L1);
  c+=vec3(1.,.93,.84)*(smoothstep(.925,.965,k)*7.+pow(max(k,0.),10.)*.7);
  vec3 L2=normalize(vec3(.85,.28,.15));
  c+=vec3(1.,.86,.68)*smoothstep(.975,.992,dot(d,L2))*4.5;
  vec3 L3=normalize(vec3(.1,.18,-.95));
  c+=vec3(1.,.68,.34)*pow(max(dot(d,L3),0.),7.)*1.1;
  return c;
}
`;

/* марш, нормаль, AO, тени, универсальное освещение — после того как сцена определила map() */
const TOOLS = `
#ifndef NSTEP
#define NSTEP 100
#endif
#ifndef TMAX
#define TMAX 30.
#endif
#ifndef STEP
#define STEP .85
#endif
#ifndef FOG
#define FOG .004
#endif
/* телефоны (COARSE подставляет stage.js): короче марш и тени — кадр заметно дешевле */
#ifdef COARSE
#undef NSTEP
#define NSTEP 68
#define SHADOW_N 10
#define REFL_N 24
#else
#define SHADOW_N 14
#define REFL_N 36
#endif

vec2 march(vec3 ro,vec3 rd){
  float t=0.; float id=-1.;
  for(int i=ZERO;i<NSTEP;i++){
    vec2 h=map(ro+rd*t);
    id=h.y;
    if(h.x<.0011*t+.0008) break;
    t+=max(h.x*STEP,.003*t);
    if(t>TMAX) return vec2(t,-1.);
  }
  /* досадка до поверхности: точка попадания не «плавает» от луча к лучу — ровные края и нормали */
  for(int i=ZERO;i<2;i++){
    vec2 h=map(ro+rd*t);
    t+=clamp(h.x,-.004*t,.004*t);
  }
  return vec2(t,id);
}
/* укороченный марш для отражений: там детали не нужны */
vec2 marchR(vec3 ro,vec3 rd){
  float t=0.; float id=-1.;
  for(int i=ZERO;i<REFL_N;i++){
    vec2 h=mapR(ro+rd*t);
    id=h.y;
    if(h.x<.004*t+.003) break;
    t+=max(h.x*.9,.02*t);
    if(t>TMAX*.5) return vec2(t,-1.);
  }
  return vec2(t,id);
}
vec3 calcN(vec3 p,float t){
  vec3 n=vec3(0.);
  float eps=.0012+t*.0007;
  for(int i=ZERO;i<4;i++){
    vec3 e=.5773*(2.*vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))-1.);
    n+=e*map(p+e*eps).x;
  }
  return normalize(n);
}
vec3 calcNR(vec3 p,float t){
  vec3 n=vec3(0.);
  float eps=.004+t*.002;
  for(int i=ZERO;i<4;i++){
    vec3 e=.5773*(2.*vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))-1.);
    n+=e*mapR(p+e*eps).x;
  }
  return normalize(n);
}
float calcAO(vec3 p,vec3 n){
  float o=0.,s=1.;
  for(int i=ZERO;i<3;i++){
    float h=.03+.16*float(i+1);
    float d=map(p+n*h).x;
    o+=(h-d)*s; s*=.6;
  }
  return clamp(1.-1.5*o,0.,1.);
}
float calcShadow(vec3 ro,vec3 rd,float mint,float maxt,float k){
  float res=1.,t=mint;
  for(int i=ZERO;i<SHADOW_N;i++){
    float h=map(ro+rd*t).x;
    res=min(res,k*h/t);
    t+=clamp(h,.03,.7);
    if(res<.003||t>maxt) break;
  }
  res=clamp(res,0.,1.);
  return res*res*(3.-2.*res);
}

vec3 lighting(vec3 p,vec3 n,vec3 rd,vec3 alb,float rough,float specAmt,float sssAmt){
  vec3 v=-rd;
  vec3 L=normalize(vec3(-.55,.68,.48));
  float ndl=dot(n,L);
  float sh=calcShadow(p+n*.012,L,.04,7.,9.);
  float ao=calcAO(p,n);
  vec3 col=alb*vec3(1.,.94,.86)*max(ndl,0.)*sh*1.9;
  vec3 amb=mix(vec3(.08,.052,.03),vec3(.36,.27,.18),n.y*.5+.5);
  col+=alb*amb*ao*1.25;
  col+=alb*vec3(.95,.74,.5)*max(dot(n,normalize(vec3(.85,.25,.15))),0.)*.5*ao;
  col+=alb*vec3(1.,.6,.3)*max(dot(n,normalize(vec3(.1,-.1,-.95))),0.)*.4;
  float th=clamp(-map(p-n*.11).x/.11,0.,1.);
  float wrap=clamp((ndl+.6)/1.6,0.,1.);
  col+=sssAmt*vec3(1.,.78,.58)*(1.-th)*wrap*alb*1.1;
  float fr=pow(1.-max(dot(n,v),0.),5.);
  vec3 r=reflect(rd,n);
  vec3 re=mix(env(r),env(normalize(r+n*rough*1.4)),rough)*mix(.45,1.,ao)*mix(.35,1.,sh);
  float F=mix(.045,1.,fr)*specAmt;
  return col*(1.-F)+re*F;
}
`;

const MAIN = `
void main(){
  gT=uTime;
  vec2 uv=(2.*(gl_FragCoord.xy+uJit)-uRes)/uRes.y;
  uv.x-=uShift;
  vec3 ro,ta; float fov;
  camera(ro,ta,fov);
  vec3 ww=normalize(ta-ro);
  vec3 uu=normalize(cross(ww,vec3(0,1,0)));
  vec3 vv=cross(uu,ww);
  vec3 rd=normalize(uv.x*uu+uv.y*vv+fov*ww);
  vec3 bg=background(rd);
  vec2 h=march(ro,rd);
  vec3 col=bg;
  if(h.y>0.){
    vec3 p=ro+rd*h.x;
    vec3 n=calcN(p,h.x);
    col=shade(p,n,rd,h.y,h.x);
    col=mix(bg,col,exp(-FOG*h.x*h.x));
  }
  if(any(isnan(col))||any(isinf(col))) col=bg;
  fragColor=vec4(min(col,vec3(24.)),1.);
}
`;

/* ---------- Сцена 1: капля → творог → пресс → головка сыра ---------- */
const OBJ_MAP = `
#define NSTEP 84
#define TMAX 20.
#define STEP .7
#define FOG .006
/* положения комочков творога (посчитаны заранее) */
const vec3 CP[9]=vec3[9](vec3(0.4726,-0.4872,0.5309),vec3(-0.2345,0.8261,0.6330),vec3(0.4478,0.4881,0.3111),vec3(0.5365,0.9178,-0.3257),vec3(-0.1288,1.0952,-0.3220),vec3(0.4340,-0.8232,-0.8004),vec3(-0.6916,0.7535,0.6749),vec3(0.4347,0.3331,-0.2019),vec3(0.8677,0.5530,0.3386));
const float CR[9]=float[9](0.4439,0.4360,0.3868,0.4307,0.3590,0.4404,0.4483,0.4652,0.4647);
vec2 map(vec3 p){
  float u=uU;
  float pCurd=smoothstep(.14,.40,u);
  float pPress=smoothstep(.46,.70,u);
  float dFloor=p.y+1.3;

  /* всё, что внутри шара радиуса ~2 (капля, творог, головка, спутники), считаем только рядом с ним */
  float bs=length(p)-2.1;
  float body=bs;
  if(bs<.3){
    /* фазы идут по uniform'у, поэтому ветки когерентны: в готовой головке сыра капля и творог не считаются вовсе */
    float wheel=1e3, blob=1e3;
    if(pPress>.001) wheel=sdRoundCyl(p,.95,.26,.1);
    if(pPress<.999){
      float wob=.05*sin(p.x*4.+gT*2.)*sin(p.y*3.-gT*1.7)*sin(p.z*5.+gT*2.3);
      float drop=1e3, curds=1e3;
      if(pCurd<.999) drop=length(p*vec3(1.,.93,1.))-.92-wob*(1.-pCurd);
      if(pCurd<=.001) curds=drop;
      if(pCurd>.001){
        float spread=mix(0.,.9,pCurd)*(1.-pPress);
        for(int i=ZERO;i<9;i++){
          float fi=float(i);
          float rad=CR[i]*(1.+(1.-pCurd)*.65);
          vec3 c=CP[i]*spread;
          c+=.07*vec3(sin(gT*.8+fi*1.3),cos(gT*.9+fi*2.1),sin(gT*.7+fi*3.1))*pCurd*(1.-pPress);
          curds=smin(curds,length(p-c)-rad,.24-.17*pCurd*(1.-pPress));
        }
      }
      blob=mix(drop,curds,smoothstep(0.,.45,pCurd));
      blob+=.03*sin(p.x*5.+gT*.4)*sin(p.y*4.7-gT*.3)*sin(p.z*5.3)*smoothstep(.1,.5,pCurd)*(1.-pPress);
    }
    body=pPress>.999?wheel:(pPress<.001?blob:mix(blob,wheel,pPress));

    /* спутники-капельки вокруг капли */
    float sat=1e3;
    float sv=(1.-smoothstep(.0,.2,u));
    if(sv>.01){
      for(int i=ZERO;i<4;i++){
        float fi=float(i);
        float a=gT*(.5+.13*fi)+fi*1.7;
        vec3 c=vec3(cos(a)*1.45,sin(a*1.3+fi)*.5,sin(a)*1.45);
        sat=min(sat,length(p-c)-(.07+.03*h11(fi))*sv);
      }
    }
    body=smin(body,sat,.05);
  }
  vec2 res=vec2(body,1.);

  float plateUp=smoothstep(.46,.60,u)*(1.-smoothstep(.70,.80,u));
  if(plateUp>.005){
    float py=mix(2.4,.34,plateUp);
    float plate=sdRoundCyl(p-vec3(0.,py,0.),1.12,.07,.035);
    res=opU(res,vec2(plate,2.));
  }
  float hoopA=smoothstep(.40,.50,u)*(1.-smoothstep(.72,.82,u));
  if(hoopA>.005){
    float hr=1.0+(1.-hoopA)*.3;
    float hoop=max(abs(length(p.xz)-hr)-.05,abs(p.y-(1.-hoopA)*2.6)-.22);
    res=opU(res,vec2(hoop,2.));
  }
  res=opU(res,vec2(dFloor,3.));
  return res;
}
/* упрощённая карта для отражений в полу */
vec2 mapR(vec3 p){
  float u=uU;
  float pCurd=smoothstep(.14,.40,u);
  float pPress=smoothstep(.46,.70,u);
  float drop=length(p*vec3(1.,.93,1.))-.92;
  float curds=1e3;
  float spread=mix(0.,.9,pCurd)*(1.-pPress);
  for(int i=ZERO;i<6;i++){
    float rad=CR[i]*(1.+(1.-pCurd)*.65);
    curds=smin(curds,length(p-CP[i]*spread)-rad,.24-.17*pCurd*(1.-pPress));
  }
  float body=mix(mix(drop,curds,smoothstep(0.,.45,pCurd)),sdRoundCyl(p,.95,.26,.1),pPress);
  vec2 res=vec2(body,1.);
  float plateUp=smoothstep(.46,.60,u)*(1.-smoothstep(.70,.80,u));
  if(plateUp>.005) res=opU(res,vec2(sdRoundCyl(p-vec3(0.,mix(2.4,.34,plateUp),0.),1.12,.07,.035),2.));
  return res;
}`;

const OBJ_LOOK = `
void camera(out vec3 ro,out vec3 ta,out float fov){
  float u=uU;
  float a=.55+u*2.7+uMouse.x*.3;
  float R=3.7-.5*sin(u*3.14159);
  float cy=.7+.35*sin(u*3.)+uMouse.y*.2;
  ro=vec3(sin(a)*R,cy,cos(a)*R);
  ta=vec3(0.,-.05,0.);
  fov=1.85;
}
vec3 background(vec3 rd){
  vec3 c=mix(vec3(.025,.018,.011),vec3(.16,.115,.07),smoothstep(-.2,.6,rd.y));
  c+=vec3(.75,.55,.35)*exp(-pow(rd.y-.05,2.)*60.)*.05;
  return c;
}
vec3 bodyCol(vec3 p,vec3 n,out float rough,out float spec,out float sss){
  float u=uU;
  float pPress=smoothstep(.46,.70,u);
  float pAge=smoothstep(.62,.98,u);
  vec3 milk=vec3(.965,.945,.9);
  vec3 curd=vec3(.95,.89,.72);
  vec3 c=mix(milk,curd,smoothstep(.12,.5,u));
  float side=1.-smoothstep(.5,.9,abs(n.y));
  vec3 gold=vec3(.97,.73,.27);
  vec3 rind=vec3(.66,.38,.14);
  vec3 ch=mix(gold,rind,side*.9);
  ch*=.8+.4*fbmL(p*6.+3.);
  c=mix(c,ch,pAge);
  rough=mix(.16,.5,smoothstep(.2,.9,u));
  spec=mix(1.,.55,pAge);
  sss=mix(1.,.45,pAge);
  return c;
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float id,float t){
  if(id>1.5&&id<2.5){
    vec3 alb=vec3(.82,.78,.72);
    vec3 r=reflect(rd,n);
    float ao=calcAO(p,n);
    float fr=pow(1.-max(dot(n,-rd),0.),3.);
    return alb*.1+env(r)*alb*mix(.7,1.,ao)*1.55+vec3(.5,.36,.2)*fr*.4;
  }
  bool isFloor=id>2.5;
  float ro_=.6,sp=.45,ss=0.;
  vec3 alb=vec3(.11,.08,.05);
  if(!isFloor) alb=bodyCol(p,n,ro_,sp,ss);
  vec3 col=lighting(p,n,rd,alb,ro_,sp,ss);
  if(isFloor){
    float rr=length(p.xz);
    float fade=exp(-rr*rr*.045);
    /* отражение предмета в полу */
    vec3 rdr=reflect(rd,n);
    vec2 hr=marchR(p+n*.01,rdr);
    if(hr.y>0.&&hr.y<2.5){
      vec3 pp=p+n*.01+rdr*hr.x;
      vec3 nn=calcNR(pp,hr.x);
      vec3 a2=hr.y<1.5?mix(vec3(.96,.93,.8),vec3(.8,.55,.25),smoothstep(.55,.9,uU)):vec3(.68,.64,.58);
      vec3 rc=a2*(env(reflect(rdr,nn))*.5+vec3(.26,.2,.12));
      col=mix(col,rc,.55*pow(1.-max(dot(n,-rd),0.),1.6)+.18);
    }
    col*=mix(.25,1.,fade);
  }
  return col;
}`;

/* ---------- Сцена 2: погреб созревания ---------- */
const CELLAR_MAP = `
#define NSTEP 84
#define TMAX 36.
#define STEP .8
#define FOG .006
#define LAMP_PERIOD 4.5
float sdBox2(vec2 p,vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
vec2 map(vec3 p){
  vec3 q=p; q.x=abs(q.x);
  float c=length(vec2(p.x,p.y-1.2));
  float dWall=3.1-c;
  float dFloor=p.y;
  vec2 res=vec2(min(dWall,dFloor),dWall<dFloor?4.:3.);
  /* рёбра свода */
  float rz=mod(p.z+LAMP_PERIOD*.5,LAMP_PERIOD)-LAMP_PERIOD*.5;
  float rib=max(abs(rz)-.16,abs(c-3.1+.12)-.12);
  res=opU(res,vec2(rib,4.));
  /* стеллажи */
  float zc=mod(q.z+.5,1.)-.5;
  float zid=floor(q.z+.5);
  for(int k=ZERO;k<3;k++){
    float yc=.3+float(k)*.85;
    float board=sdBox2(vec2(q.x-1.75,p.y-yc),vec2(.62,.035));
    res=opU(res,vec2(board,5.));
    float hs=h21(vec2(zid,float(k)+floor(p.x>0.?1.:0.)*7.));
    if(hs<.9){
      vec3 wp=vec3(q.x-1.75,p.y-yc-.035-.13,zc);
      float w=sdRoundCyl(wp,.43,.13,.04);
      res=opU(res,vec2(w,6.+hs));
    }
  }
  float zp=mod(q.z+1.,2.)-1.;
  float post=sdBox2(vec2(q.x-1.18,p.z>-1e3?zp:0.),vec2(.045,.045));
  post=max(post,abs(p.y-1.3)-1.3);
  res=opU(res,vec2(post,5.));
  return res;
}
vec2 mapR(vec3 p){ return map(p); }`;

const CELLAR_LOOK = `
void camera(out vec3 ro,out vec3 ta,out float fov){
  float u=uU;
  float z=mix(-1.,14.,u);
  ro=vec3(sin(u*5.)*.12+uMouse.x*.25,1.12+sin(u*7.)*.05+uMouse.y*.1,z);
  ta=ro+vec3(uMouse.x*.5,-.06+uMouse.y*.1,3.);
  fov=1.6;
}
vec3 background(vec3 rd){ return vec3(.03,.018,.01); }
vec3 lampPos(float zi){ return vec3(0.,2.55,zi*LAMP_PERIOD); }
vec3 shade(vec3 p,vec3 n,vec3 rd,float id,float t){
  vec3 alb;
  float rough=.6,spec=.2,sss=0.;
  if(id<3.5){ alb=vec3(.1,.085,.07)+.04*fbm(p*2.); rough=.5; spec=.35; }
  else if(id<4.5){ alb=vec3(.28,.24,.2)*(.6+.8*fbm(p*3.)); rough=.9; spec=.05; }
  else if(id<5.5){ alb=vec3(.16,.09,.045)*(.7+.6*fbm(p*vec3(1.,14.,1.))); rough=.7; spec=.1; }
  else {
    float hs=id-6.;
    vec3 gold=mix(vec3(.9,.62,.2),vec3(.98,.78,.34),hs*1.1);
    float side=1.-smoothstep(.4,.85,abs(n.y));
    alb=mix(gold,vec3(.5,.28,.1),side*.85)*(.75+.5*fbm(p*7.));
    rough=.5; spec=.4; sss=.4;
  }
  vec3 col=vec3(0.);
  float ao=calcAO(p,n);
  float zi=floor(p.z/LAMP_PERIOD+.5);
  for(int k=ZERO;k<2;k++){
    vec3 lp=lampPos(zi+float(k)-0.);
    if(k==1) lp=lampPos(zi+(p.z>zi*LAMP_PERIOD?1.:-1.));
    vec3 l=lp-p; float dl=length(l); l/=dl;
    float att=1./(1.+dl*dl*.08);
    float sh=1.;
    if(k==0) sh=calcShadow(p+n*.01,l,.05,dl,8.);
    col+=alb*vec3(1.,.72,.4)*max(dot(n,l),0.)*att*sh*7.;
    vec3 h=normalize(l-rd);
    col+=vec3(1.,.8,.5)*pow(max(dot(n,h),0.),mix(8.,60.,1.-rough))*att*spec*sh*3.;
  }
  col+=alb*vec3(.5,.28,.12)*ao*.28;
  col+=alb*vec3(1.,.7,.4)*max(dot(n,-rd),0.)*.25/(1.+t*.25);
  col*=mix(.4,1.,ao);
  return col;
}`;

/* ---------- Сцена 3: витрина продукции ---------- */
const PROD_MAP = `
#define NSTEP 84
#define TMAX 30.
#define STEP .8
#define FOG .003
float sdPie(vec2 p,float w,float r){
  vec2 c=vec2(sin(w),cos(w));
  p.x=abs(p.x);
  float l=length(p)-r;
  float m=length(p-c*clamp(dot(p,c),0.,r));
  return max(l,m*sign(c.y*p.x-c.x*p.y));
}
float eyes(vec3 p){
  vec3 g=p*4.5;
  vec3 id=floor(g);
  vec3 f=fract(g)-.5;
  float hs=h31(id);
  vec3 j=(vec3(h31(id+1.3),h31(id+2.7),h31(id+4.1))-.5)*.3;
  float rad=.1+.13*h31(id+9.);
  float d=(length(f-j)-rad)/4.5;
  return hs>.55?d:.3;
}
vec2 cheeseWheel(vec3 p){
  vec3 q=p-vec3(0.,.32,0.);
  float w=sdRoundCyl(q,.9,.32,.05);
  float cut=sdPie(vec2(q.x,q.z)*vec2(1.,-1.),.5,2.);
  float d=max(w,-cut);
  float core=smoothstep(.0,.08,.82-length(q.xz));
  if(d<.3) d=max(d,-mix(.3,eyes(q*vec3(1.,1.4,1.)+vec3(2.,0.,1.)),core));
  return vec2(d,10.);
}
vec2 cheeseWedge(vec3 p){
  vec3 q=p-vec3(1.45,0.,1.15);
  q.xz=rot(-.55)*q.xz;
  q-=vec3(0.,.32,0.);
  q.xz=q.xz*vec2(1.,-1.);
  float w=sdRoundCyl(q+vec3(0.,0.,0.),.9,.32,.05);
  float pie=sdPie(vec2(q.x,q.z),.5,2.);
  float d=max(w,pie-.0);
  float core=smoothstep(.0,.08,.82-length(q.xz));
  if(d<.3) d=max(d,-mix(.3,eyes(q*vec3(1.,1.4,1.)+vec3(2.,0.,1.)),core));
  return vec2(d,10.);
}
vec2 jar(vec3 p){
  vec3 q=p-vec3(0.,.52,0.);
  float body=sdRoundCyl(q,.42,.5,.12);
  float lid=sdRoundCyl(q-vec3(0.,.56,0.),.44,.075,.03);
  vec2 r=vec2(body,11.);
  r=opU(r,vec2(lid,12.));
  return r;
}
vec2 butter(vec3 p){
  vec3 q=p-vec3(0.,.2,0.);
  float blk=sdRoundBox(q-vec3(.1,0.,0.),vec3(.55,.2,.33),.035);
  vec2 r=vec2(blk,13.);
  vec3 f=q-vec3(-.55,0.,0.);
  float foil=sdRoundBox(f,vec3(.42,.213,.348),.05)+.012*sin(f.y*30.+f.z*20.)*sin(f.x*26.)+.008*sin(f.x*37.+f.z*23.)*sin(f.y*29.);
  foil=max(foil,-(q.x-.18));
  r=opU(r,vec2(foil,14.));
  float sl=sdRoundBox(q-vec3(.95,-.0,.78),vec3(.04,.2,.33),.02);
  vec3 sq=q-vec3(.95,0.,.78);
  r=opU(r,vec2(sdRoundBox(vec3(rot(.4)*sq.xz,sq.y).xzy*vec3(1.,1.,1.),vec3(.33,.2,.04),.02),13.));
  return r;
}
vec2 bowl(vec3 p){
  vec3 q=p-vec3(0.,.58,0.);
  float outer=length(q*vec3(1.,1.15,1.))-.62;
  float inner=length((q-vec3(0.,.14,0.))*vec3(1.,1.15,1.))-.56;
  float b=max(max(outer,-inner),q.y-.2);
  b=min(b,sdRoundCyl(p-vec3(0.,.04,0.),.24,.04,.02));
  vec2 r=vec2(b,15.);
  float mound=length((q-vec3(0.,.12,0.))*vec3(1.,1.55,1.))-.54;
  mound+=.012*sin(q.x*21.)*sin(q.y*19.)*sin(q.z*23.);
  r=opU(r,vec2(mound,16.));
  for(int i=ZERO;i<3;i++){
    float fi=float(i);
    vec3 bp=q-vec3(cos(fi*2.1+.4)*.18,.38+.01*fi,sin(fi*2.1+.4)*.18);
    r=opU(r,vec2(length(bp)-.075,17.));
  }
  return r;
}
vec2 map(vec3 p){
  vec2 res=vec2(p.y,3.);
  vec3 c1=vec3(-3.9,0.,0.),c2=vec3(-1.3,0.,0.),c3=vec3(1.3,0.,0.),c4=vec3(3.9,0.,0.);
  float b;
  b=length(p-vec3(-3.4,.6,.6))-1.7;
  if(b<.2) res=opU(res,cheeseWheel(p-c1)); else res.x=min(res.x,b);
  if(b<.9){ vec2 w=cheeseWedge(p-c1); res=opU(res,w); }
  b=length(p-c2-vec3(0.,.6,0.))-.95;
  if(b<.2) res=opU(res,jar(p-c2)); else res.x=min(res.x,b);
  b=length(p-c3-vec3(0.3,.3,.3))-1.55;
  if(b<.2) res=opU(res,butter(p-c3)); else res.x=min(res.x,b);
  b=length(p-c4-vec3(0.,.6,0.))-.95;
  if(b<.2) res=opU(res,bowl(p-c4)); else res.x=min(res.x,b);
  return res;
}
/* упрощённая карта для отражений в полу */
vec2 mapR(vec3 p){
  vec2 res=vec2(1e3,0.);
  res=opU(res,vec2(sdRoundCyl(p-vec3(-3.9,.32,0.),.9,.32,.05),10.));
  res=opU(res,vec2(sdRoundCyl(p-vec3(-1.3,.52,0.),.42,.5,.12),11.));
  res=opU(res,vec2(sdRoundBox(p-vec3(1.4,.2,0.),vec3(.55,.2,.33),.035),13.));
  res=opU(res,vec2(length((p-vec3(3.9,.58,0.))*vec3(1.,1.15,1.))-.62,15.));
  return res;
}`;

const PROD_LOOK = `
void camera(out vec3 ro,out vec3 ta,out float fov){
  float v=uU*3.999;
  float i=floor(v);
  float f=smoothstep(.55,1.,fract(v));
  float k=min(i+f,3.);
  float tx=mix(-3.9,3.9,k/3.);
  float cx=tx+uMouse.x*.5;
  ro=vec3(cx*.96,1.1+uMouse.y*.15,4.4);
  ta=vec3(tx,.45,0.);
  fov=1.75;
}
vec3 background(vec3 rd){
  return mix(vec3(.03,.021,.013),vec3(.17,.12,.075),smoothstep(-.1,.5,rd.y));
}
vec3 matColor(vec3 p,vec3 n,float id,out float rough,out float spec,out float sss){
  rough=.5; spec=.5; sss=0.;
  if(id<3.5){ rough=.12; spec=1.; return vec3(.1,.072,.045); }
  if(id<10.5){
    vec3 q=p;
    float cutFace=1.-smoothstep(.3,.8,abs(n.y));
    vec3 body=vec3(.98,.78,.3)*(.85+.3*fbmL(q*9.));
    vec3 rind=vec3(.6,.34,.12)*(.8+.4*fbmL(q*7.));
    float r=length(p.xz);
    vec3 col=mix(body,rind,smoothstep(.25,.85,abs(n.y))*0.0+cutFace*0.75);
    rough=.5; spec=.5; sss=.5;
    return col;
  }
  if(id<11.5){
    float y=p.y;
    vec3 white=vec3(.95,.94,.92);
    float lab=smoothstep(.34,.36,y)*(1.-smoothstep(.78,.8,y));
    vec3 violet=vec3(.45,.22,.09);
    float gl=smoothstep(.012,.0,abs(y-.4))+smoothstep(.012,.0,abs(y-.74));
    vec3 col=mix(white,violet,lab);
    col=mix(col,vec3(.95,.75,.3),gl*lab);
    rough=.2; spec=.9; sss=.3;
    return col;
  }
  if(id<12.5){ rough=.28; spec=1.; return vec3(.9,.66,.24); }
  if(id<13.5){ rough=.3; spec=.7; sss=.6; return vec3(.98,.86,.45); }
  if(id<14.5){ rough=.25; spec=1.; return vec3(.78,.74,.62)*(.8+.4*fbmL(p*20.)); }
  if(id<15.5){ rough=.2; spec=.9; return vec3(.95,.93,.88); }
  if(id<16.5){ rough=.4; spec=.5; sss=.9; return vec3(.97,.95,.9); }
  rough=.15; spec=1.; return vec3(.5,.04,.1);
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float id,float t){
  float rough,spec,sss;
  vec3 alb=matColor(p,n,id,rough,spec,sss);
  vec3 col=lighting(p,n,rd,alb,rough,spec,sss);
  if(id<3.5){
    vec3 rdr=reflect(rd,n);
    vec2 hr=marchR(p+n*.01,rdr);
    if(hr.y>3.5){
      vec3 pp=p+n*.01+rdr*hr.x;
      vec3 nn=calcNR(pp,hr.x);
      vec3 a2=hr.y<10.5?vec3(.9,.7,.3):hr.y<11.5?vec3(.92,.89,.84):hr.y<13.5?vec3(.98,.86,.45):vec3(.95,.93,.88);
      vec3 rc=a2*(env(reflect(rdr,nn))*.45+vec3(.26,.2,.12));
      col=mix(col,rc,.5*pow(1.-max(dot(n,-rd),0.),1.4)+.14);
    }
    col*=exp(-length(p.xz-vec2(0.,0.))*.0);
  }
  return col;
}`;

/* ---------- Сцена 0: текучее молоко (карта высот, без рэймарчинга по SDF) ---------- */
const FLOW = HEAD + `
vec2 gC;
float H(vec2 p){
  float t=gT;
  vec2 d=p-gC;
  float r=length(d);
  /* воронка: чем ближе к центру, тем сильнее закрутка; прокрутка добавляет оборотов */
  float tw=(1.3+2.4*uU)*exp(-r*.34)+.3*sin(t*.17);
  d=rot(tw)*d;
  vec2 w=gC+d;
  w.x+=t*.20;
  for(int i=ZERO;i<4;i++){
    float fi=float(i);
    w+=vec2(sin(w.y*1.25+t*.29+fi*1.9),sin(w.x*1.05-t*.23+fi*2.7))*.55;
  }
  float h=.52*sin(w.x*1.15+w.y*.5)+.3*sin(w.y*1.7-w.x*.8+1.3)+.1*sin(length(w)*3.1-t*.7);
  h-=.4*exp(-r*r*.1)*(.55+.45*uU);
  return h*.55;
}
void main(){
  gT=uTime;
  vec2 uv=(2.*(gl_FragCoord.xy+uJit)-uRes)/uRes.y;
  uv.x-=uShift;
  float s=smoothstep(0.,1.,uU);
  vec3 ro=vec3(uMouse.x*.25,mix(2.3,1.15,s)+uMouse.y*.1,-3.2+uU*2.2);
  vec3 ta=vec3(0.,0.,ro.z+mix(3.4,2.6,s));
  gC=vec2(.8-.6*uU,ro.z+4.6);
  vec3 ww=normalize(ta-ro);
  vec3 uu=normalize(cross(ww,vec3(0,1,0)));
  vec3 vv=cross(uu,ww);
  vec3 rd=normalize(uv.x*uu+uv.y*vv+1.55*ww);

  vec3 sky=mix(vec3(.04,.028,.017),vec3(.17,.12,.075),smoothstep(-.1,.5,rd.y));
  vec3 col=sky;
  float tt=-1.;
  if(rd.y<-.0001){
    float t0=max((ro.y-.58)/-rd.y,0.);
    float t1=min((ro.y+.85)/-rd.y,38.);
    float t=t0, tp=t0, hp=0.;
    for(int i=ZERO;i<72;i++){
      vec3 p=ro+rd*t;
      float h=H(p.xz);
      float dy=p.y-h;
      if(dy<.0015*t+.002){ tt=t; break; }
      tp=t; hp=dy;
      t+=max(dy*.45,.0035*t);
      if(t>t1) break;
    }
    if(tt<0.&&t<t1) tt=t;
    if(tt>0.){
      /* уточнение: середина между последним «над» и первым «под» */
      for(int i=ZERO;i<3;i++){
        float tm=.5*(tp+tt);
        vec3 pm=ro+rd*tm;
        if(pm.y>H(pm.xz)) tp=tm; else tt=tm;
      }
    }
  }
  if(tt>0.){
    vec3 p=ro+rd*tt;
    float hh=H(p.xz);
    float e=.02+tt*.004;
    vec3 n=normalize(vec3(H(p.xz-vec2(e,0.))-H(p.xz+vec2(e,0.)),2.*e,H(p.xz-vec2(0.,e))-H(p.xz+vec2(0.,e))));
    vec3 v=-rd;
    vec3 L=normalize(vec3(-.55,.68,.48));
    float ndl=dot(n,L);
    float hn=smoothstep(-.45,.3,hh);
    float wr=clamp((ndl+.45)/1.45,0.,1.);
    /* самотень от гребней: короткий марш к свету по карте высот */
    float sh=1.;
    for(int i=ZERO;i<9;i++){
      float ds=.12+float(i)*.16;
      vec3 q=p+L*ds;
      sh=min(sh,clamp((q.y-H(q.xz))*5./ds+.25,0.,1.));
    }
    sh=sh*sh*(3.-2.*sh);
    vec3 alb=vec3(.96,.9,.79);
    vec3 c=alb*vec3(1.,.9,.8)*wr*wr*mix(.15,1.,sh)*1.2;
    c+=alb*mix(vec3(.05,.034,.02),vec3(.27,.2,.13),n.y*.5+.5)*mix(.25,1.,hn)*mix(.6,1.,sh);
    c+=alb*vec3(.95,.74,.5)*max(dot(n,normalize(vec3(.85,.25,.15))),0.)*.45*mix(.5,1.,sh);
    c+=alb*vec3(1.,.66,.4)*(1.-hn)*wr*sh*.28;
    float fr=pow(1.-max(dot(n,v),0.),5.);
    vec3 r=reflect(rd,n);
    vec3 re=env(r)*mix(.4,1.,hn)*mix(.4,1.,sh)+env(normalize(r+n*.35))*.2;
    float F=.1+fr*.85;
    c=c*(1.-F)+re*F;
    col=mix(sky,c,exp(-tt*tt*.0022));
  }
  if(any(isnan(col))||any(isinf(col))) col=sky;
  fragColor=vec4(min(col,vec3(24.)),1.);
}`;

const scene = (map, look) => HEAD + map + TOOLS + look + MAIN;


/* ---------- Временное накопление (TAA): сглаживает края и добавляет детали, пока кадр почти не меняется ----------
   Субпиксельный сдвиг камеры (uJit) + история, зажатая в окрестности текущего пикселя (без «шлейфов»). */
export const RESOLVE = `#version 300 es
precision highp float;
uniform sampler2D uCur;
uniform sampler2D uHist;
uniform float uAlpha;
out vec4 fragColor;
vec3 tm(vec3 c){ return c/(1.+c); }
vec3 itm(vec3 t){ t=min(t,vec3(.995)); return t/(1.-t); }
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);
  ivec2 hi=textureSize(uCur,0)-1;
  vec3 c=tm(texelFetch(uCur,p,0).rgb);
  vec3 mn=c, mx=c, m1=c, m2=c*c;
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      if(x==0&&y==0) continue;
      vec3 n=tm(texelFetch(uCur,clamp(p+ivec2(x,y),ivec2(0),hi),0).rgb);
      mn=min(mn,n); mx=max(mx,n); m1+=n; m2+=n*n;
    }
  }
  vec3 mean=m1/9., sig=sqrt(max(m2/9.-mean*mean,0.));
  vec3 lo=max(mn,mean-1.5*sig), up=min(mx,mean+1.5*sig);
  vec3 hr=tm(texelFetch(uHist,p,0).rgb);
  vec3 h=clamp(hr,lo,up);
  /* где история сильно не сходится с соседями (движение у краёв) — доверяем текущему кадру, иначе края «ломаются» */
  float rej=smoothstep(.035,.16,length(hr-h));
  fragColor=vec4(itm(mix(h,c,max(uAlpha,rej))),1.);
}`;

/* ---------- Пост-проход: бикубическое увеличение, резкость, блум, молочная шторка, виньетка, тон ---------- */
export const POST = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uTexRes;
uniform float uTime;
uniform vec2 uWipe;
uniform float uFade;
out vec4 fragColor;
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);
}
vec3 tmS(vec3 c){ return c/(1.+c); }
vec3 fT(vec2 uv){ return tmS(texture(uTex,uv).rgb); }

/* Catmull-Rom за 5 билинейных выборок — в «сжатом» пространстве, чтобы блики не звенели */
vec3 bicubic(vec2 uv){
  vec2 tp=uv*uTexRes;
  vec2 c=floor(tp-.5)+.5;
  vec2 f=tp-c;
  vec2 w0=f*(-.5+f*(1.-.5*f));
  vec2 w1=1.+f*f*(-2.5+1.5*f);
  vec2 w2=f*(.5+f*(2.-1.5*f));
  vec2 w3=f*f*(-.5+.5*f);
  vec2 s=w1+w2;
  vec2 o=w2/s;
  vec2 t0=(c-1.)/uTexRes, t3=(c+2.)/uTexRes, t12=(c+o)/uTexRes;
  vec3 r=fT(vec2(t12.x,t0.y))*(s.x*w0.y)
        +fT(vec2(t0.x,t12.y))*(w0.x*s.y)
        +fT(t12)*(s.x*s.y)
        +fT(vec2(t3.x,t12.y))*(w3.x*s.y)
        +fT(vec2(t12.x,t3.y))*(s.x*w3.y);
  return r/(s.x*w0.y+w0.x*s.y+s.x*s.y+w3.x*s.y+s.x*w3.y);
}
/* резкость: нерезкая маска, зажатая диапазоном соседей (без ореолов) */
vec3 sharpen(vec2 uv,vec3 c){
  vec2 px=1./uTexRes;
  vec3 a=fT(uv+vec2(px.x,0.)), b=fT(uv-vec2(px.x,0.)), d=fT(uv+vec2(0.,px.y)), e=fT(uv-vec2(0.,px.y));
  vec3 mn=min(c,min(min(a,b),min(d,e))), mx=max(c,max(max(a,b),max(d,e)));
  vec3 blur=(a+b+d+e)*.25;
  return clamp(c+(c-blur)*.55,mn,mx);
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }

float cover(vec2 uv,float asp,out float edge){
  float n=(n2(uv*vec2(2.6*asp,1.7)+vec2(0.,uTime*.12))-.5)*.34+(n2(uv*vec2(7.*asp,4.)-uTime*.2)-.5)*.07;
  float fe=mix(-.45,1.45,uWipe.x)+n;
  float de=mix(-.45,1.45,uWipe.y)+n;
  float a=1.-smoothstep(fe-.012,fe+.012,uv.y);
  float b=1.-smoothstep(de-.012,de+.012,uv.y);
  float e1=(1.-smoothstep(0.,.05,abs(uv.y-fe)))*step(.001,uWipe.x)*step(uWipe.x,.999);
  float e2=(1.-smoothstep(0.,.05,abs(uv.y-de)))*step(.001,uWipe.y)*step(uWipe.y,.999);
  edge=max(e1,e2);
  return a*(1.-b);
}

void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  float edge;
  float cv=cover(uv,asp,edge);
  vec2 cuv=uv+vec2(0.,1.)*edge*.012*(n2(uv*9.+uTime)-.5);
  vec3 t=sharpen(cuv,bicubic(cuv));
  t=min(t,vec3(.995));
  vec3 col=t/(1.-t);
  /* блум: 4 выборки на уровень вместо одной — без блочности мип-цепочки */
  vec3 bl=vec3(0.);
  float w=1.;
  for(int i=2;i<=6;i++){ // постоянные границы — безопасно
    float L=float(i);
    vec2 px=exp2(L)/uTexRes;
    vec3 s=textureLod(uTex,cuv+px*vec2(-.7,-.7),L).rgb+textureLod(uTex,cuv+px*vec2(.7,-.7),L).rgb
          +textureLod(uTex,cuv+px*vec2(-.7,.7),L).rgb+textureLod(uTex,cuv+px*vec2(.7,.7),L).rgb;
    bl+=max(s*.25-vec3(.9),0.)*w;
    w*=1.05;
  }
  col+=bl*.17;
  col=aces(col*1.05);
  col=pow(col,vec3(1./2.2));
  col+=vec3(.020,.012,.004)*(1.-col);

  float v=length((uv-.5)*vec2(1.,.85));
  col*=1.-.55*smoothstep(.35,.95,v);

  vec3 milk=mix(vec3(.96,.93,.87),vec3(1.,.99,.96),smoothstep(0.,1.,uv.y*.8+.1));
  milk*=.95+.05*n2(uv*vec2(3.*asp,6.)+uTime*.05);
  milk=mix(milk,vec3(1.),edge*.55);
  milk*=1.-.12*smoothstep(.45,.95,v);
  col=mix(col,milk,cv);
  fragColor=vec4(col,1.);
}`;

/* ---------- Финальное сглаживание краёв на размере экрана (FXAA 3.11, расширенный поиск края) + дизеринг ----------
   Работает по уже увеличенной картинке: убирает «ступеньки» там, где накопление кадров не успевает (при прокрутке). */
export const FXAA = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform float uFade;
out vec4 fragColor;
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float lm(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
vec3 S(vec2 uv){ return textureLod(uTex,uv,0.).rgb; }
float L(vec2 uv){ return lm(S(uv)); }
vec3 fin(vec3 col){
  vec2 fc=gl_FragCoord.xy+fract(uTime)*91.;
  col+=(h21(fc)+h21(fc+37.7)-1.)*(1.5/255.)+(h21(fc+11.3)-.5)*.012;
  return col*(1.-uFade);
}
void main(){
  vec2 px=1./uRes;
  vec2 uv=gl_FragCoord.xy*px;
  vec3 rgbM=S(uv);
  float lM=lm(rgbM);
  float lN=L(uv+vec2(0.,px.y)), lS=L(uv-vec2(0.,px.y)), lE=L(uv+vec2(px.x,0.)), lW=L(uv-vec2(px.x,0.));
  float mx=max(lM,max(max(lN,lS),max(lE,lW))), mn=min(lM,min(min(lN,lS),min(lE,lW)));
  float range=mx-mn;
  if(range<max(.0312,mx*.125)){ fragColor=vec4(fin(rgbM),1.); return; }
  float lNW=L(uv+vec2(-px.x,px.y)), lNE=L(uv+px), lSW=L(uv-px), lSE=L(uv+vec2(px.x,-px.y));
  float lNS=lN+lS, lWE=lW+lE, lNWSW=lNW+lSW, lNESE=lNE+lSE, lNWNE=lNW+lNE, lSWSE=lSW+lSE;
  float edgeH=abs(-2.*lW+lNWSW)+abs(-2.*lM+lNS)*2.+abs(-2.*lE+lNESE);
  float edgeV=abs(-2.*lN+lNWNE)+abs(-2.*lM+lWE)*2.+abs(-2.*lS+lSWSE);
  bool horz=edgeH>=edgeV;
  float l1=horz?lS:lW, l2=horz?lN:lE;
  float g1=l1-lM, g2=l2-lM;
  bool is1=abs(g1)>=abs(g2);
  float grad=.25*max(abs(g1),abs(g2));
  float stepL=horz?px.y:px.x;
  float lAvg;
  if(is1){ stepL=-stepL; lAvg=.5*(l1+lM); } else lAvg=.5*(l2+lM);
  vec2 cur=uv;
  if(horz) cur.y+=stepL*.5; else cur.x+=stepL*.5;
  vec2 off=horz?vec2(px.x,0.):vec2(0.,px.y);
  vec2 p1=cur-off, p2=cur+off;
  float e1=L(p1)-lAvg, e2=L(p2)-lAvg;
  bool d1=abs(e1)>=grad, d2=abs(e2)>=grad;
  if(!d1) p1-=off;
  if(!d2) p2+=off;
  for(int i=0;i<14;i++){
    if(d1&&d2) break;
    if(!d1){ e1=L(p1)-lAvg; d1=abs(e1)>=grad; if(!d1) p1-=off; }
    if(!d2){ e2=L(p2)-lAvg; d2=abs(e2)>=grad; if(!d2) p2+=off; }
  }
  float dist1=horz?uv.x-p1.x:uv.y-p1.y;
  float dist2=horz?p2.x-uv.x:p2.y-uv.y;
  bool dir1=dist1<dist2;
  float dstN=min(dist1,dist2), span=dist1+dist2;
  bool lowM=(lM-lAvg)<0.;
  bool good=dir1?((e1<0.)!=lowM):((e2<0.)!=lowM);
  float pix=good?-dstN/span+.5:0.;
  float lAll=(2.*(lNS+lWE)+lNWSW+lNESE)/12.;
  float sub=smoothstep(0.,1.,clamp(abs(lAll-lM)/range,0.,1.));
  sub=sub*sub*.75;
  float fo=max(pix,sub);
  vec2 fuv=uv;
  if(horz) fuv.y+=fo*stepL; else fuv.x+=fo*stepL;
  fragColor=vec4(fin(S(fuv)),1.);
}`;

/* ---------- Сцена 4 (2D): молоко растекается и плещется по экрану ----------
   Настоящая жидкость на GPU (метод «stable fluids»): скорость и «толщина молока» живут в малых текстурах,
   каждый кадр — перенос, завихрения, давление (Якоби), вычитание градиента. Затем шейдер рисует
   по толщине поверхность молока: чёткий край (изолиния), мениск, глянец, тёплый отсвет на фоне. */
const SIM_HEAD = `#version 300 es
precision highp float;
uniform vec2 uTexel;
uniform sampler2D uVel;
uniform sampler2D uDye;
uniform sampler2D uAux;
uniform float uDt;
uniform float uK;
in vec2 vUv;
out vec4 fragColor;
`;
/* вершинный шейдер сима: те же 3 вершины, но с vUv */
export const SIM_VERT = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const sim = (body) => SIM_HEAD + body;
export const SIM = {
  /* добавка в текстуру (аддитивное смешивание): гауссово пятно */
  splat: `#version 300 es
precision highp float;
uniform vec4 uPt;      /* x,y, радиус, форма */
uniform vec4 uVal;
uniform float uAsp;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 d=(vUv-uPt.xy)*vec2(uAsp,1.);
  float g=exp(-dot(d,d)/(uPt.z*uPt.z));
  fragColor=vec4(uVal.xyz*g,0.);
}`,
  /* перенос величины по полю скорости (bilinear, обратный по времени), затухание, стенки */
  advect: sim(`
uniform float uDiss;
void main(){
  vec2 v=texture(uVel,vUv).xy;
  vec2 p=vUv-uDt*v*uTexel*uK;
  vec4 c=texture(uAux,p);
  fragColor=c/(1.+uDiss*uDt);
}`),
  /* перенос толщины. «Поверхностное натяжение»: где молока больше порога — оно набирает плотность, где меньше — тает,
     поэтому край остаётся чётким. Внизу — «ванна» с уровнем и волнами от места падения (uPool); сама струя рисуется в MILK2D аналитически. */
  advectDye: sim(`
uniform float uDiss;
uniform vec4 uSrc;   /* .w — аспект экрана */
uniform vec4 uPool;  /* уровень, x падения, амплитуда волн, время */
void main(){
  vec2 v=texture(uVel,vUv).xy;
  vec2 p=vUv-uDt*v*uTexel*uK;
  vec4 c=texture(uDye,p);
  float r=c.r, tn=c.g;
  vec2 dt=1./vec2(textureSize(uDye,0));
  float nb=texture(uDye,p+vec2(dt.x,0.)).r+texture(uDye,p-vec2(dt.x,0.)).r+texture(uDye,p+vec2(0.,dt.y)).r+texture(uDye,p-vec2(0.,dt.y)).r;
  r=mix(r,nb*.25,clamp(uDt*22.,0.,.45));
  r+=uDt*9.*r*(1.-min(r,1.))*(r-.35)*step(r,1.);
  r-=uDt*max(r-1.,0.)*.5;
  r=max(r-uDt*(uDiss+5.*(1.-smoothstep(uPool.x+.015,uPool.x+.16,vUv.y))*step(uPool.x+.004,vUv.y)),0.); /* молоко над гладью впитывается в ванну */
  /* ванна: гладь с мелкой зыбью и кольцами волн от струи */
  float dx=(vUv.x-uPool.y)*uSrc.w;
  float wv=uPool.z*sin(44.*abs(dx)-5.*uPool.w)*exp(-2.6*abs(dx))+.004*sin(9.*vUv.x*uSrc.w+1.1*uPool.w)+.0025*sin(23.*vUv.x*uSrc.w-1.7*uPool.w)+.011*exp(-dx*dx/.0022)*(.8+.2*sin(uPool.w*3.1));
  float pool=smoothstep(uPool.x+wv+.005,uPool.x+wv-.005,vUv.y);
  r=max(r,pool); tn=max(tn,pool*.5);
  fragColor=vec4(min(r,1.8),tn,0.,0.);
}`),
  /* дивергенция скорости со стенками (на границе нормальная компонента отражается — молоко бьётся о края) */
  div: sim(`
void main(){
  vec2 L=vUv-vec2(uTexel.x,0.), R=vUv+vec2(uTexel.x,0.), T=vUv+vec2(0.,uTexel.y), B=vUv-vec2(0.,uTexel.y);
  float vL=texture(uVel,L).x, vR=texture(uVel,R).x, vT=texture(uVel,T).y, vB=texture(uVel,B).y;
  vec2 C=texture(uVel,vUv).xy;
  if(L.x<0.) vL=-C.x;
  if(R.x>1.) vR=-C.x;
  if(T.y>1.) vT=C.y; /* сверху граница открытая: через неё втекает струя */
  if(B.y<0.) vB=-C.y;
  fragColor=vec4(.5*(vR-vL+vT-vB),0.,0.,0.);
}`),
  curl: sim(`
void main(){
  float L=texture(uVel,vUv-vec2(uTexel.x,0.)).y, R=texture(uVel,vUv+vec2(uTexel.x,0.)).y;
  float T=texture(uVel,vUv+vec2(0.,uTexel.y)).x, B=texture(uVel,vUv-vec2(0.,uTexel.y)).x;
  fragColor=vec4(.5*(R-L-T+B),0.,0.,0.);
}`),
  /* завихрения + сила тяжести (молоко стекает вниз, густое — быстрее) */
  vort: sim(`
uniform float uGrav;
uniform vec4 uPool;
void main(){
  float L=texture(uAux,vUv-vec2(uTexel.x,0.)).x, R=texture(uAux,vUv+vec2(uTexel.x,0.)).x;
  float T=texture(uAux,vUv+vec2(0.,uTexel.y)).x, B=texture(uAux,vUv-vec2(0.,uTexel.y)).x;
  float C=texture(uAux,vUv).x;
  vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));
  f/=length(f)+1e-4;
  f*=uK*C*vec2(1.,-1.);
  vec2 v=texture(uVel,vUv).xy+f*uDt;
  float m=texture(uDye,vUv).r;
  v.y-=uGrav*uDt*smoothstep(.1,.8,m);
  /* в ванне течение вязкое и быстро затихает */
  float pl=smoothstep(uPool.x+.012,uPool.x-.02,vUv.y);
  v/=1.+uDt*26.*pl;
  fragColor=vec4(clamp(v,-400.,400.),0.,0.);
}`),
  pressure: sim(`
void main(){
  float L=texture(uAux,vUv-vec2(uTexel.x,0.)).x, R=texture(uAux,vUv+vec2(uTexel.x,0.)).x;
  float T=texture(uAux,vUv+vec2(0.,uTexel.y)).x, B=texture(uAux,vUv-vec2(0.,uTexel.y)).x;
  float d=texture(uVel,vUv).x;
  fragColor=vec4((L+R+B+T-d)*.25,0.,0.,0.);
}`),
  grad: sim(`
void main(){
  float L=texture(uAux,vUv-vec2(uTexel.x,0.)).x, R=texture(uAux,vUv+vec2(uTexel.x,0.)).x;
  float T=texture(uAux,vUv+vec2(0.,uTexel.y)).x, B=texture(uAux,vUv-vec2(0.,uTexel.y)).x;
  vec2 v=texture(uVel,vUv).xy-vec2(R-L,T-B);
  /* стенки: скорость, направленная в стену, гасится */
  if(vUv.x<uTexel.x&&v.x<0.) v.x=0.;
  if(vUv.x>1.-uTexel.x&&v.x>0.) v.x=0.;
  if(vUv.y<uTexel.y&&v.y<0.) v.y=0.;
  if(vUv.y>1.-uTexel.y&&v.y>0.) v.y=0.;
  fragColor=vec4(v,0.,0.);
}`),
};

/* рисует молоко по полю толщины (HDR, дальше общий пост-проход). Не использует камеру и jitter. */
export const MILK2D = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uU;
uniform vec2 uMouse;
uniform float uShift;
uniform vec2 uJit;
uniform sampler2D uTex;
uniform vec2 uTexRes;
uniform vec4 uStr;   /* x струи, полуширина (в высотах экрана), время, уровень ванны */
out vec4 fragColor;
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
vec2 field(vec2 uv){ vec4 d=texture(uTex,uv); return d.rg; }
/* струя из «бочки»: цельная колонка, по ней вниз бегут волны толщины, к ванне она тоньше. Поле «толщины», как у симуляции. */
float strm(vec2 uv,float asp){
  float t=uStr.z, y=uv.y;
  float x0=uStr.x+(.017*sin(y*5.5+t*.7)+.006*sin(y*13.-t*1.9))/asp;
  float w=uStr.y*1.5*(1.+.14*sin(y*9.-t*2.6)+.06*sin(y*21.+t*3.3))*mix(.8,1.15,smoothstep(.2,1.,y));
  float d=abs(uv.x-x0)*asp;
  float s=1.15*(1.-smoothstep(0.,1.,d/w));
  float yf=1.1-1.25*clamp(uU/.1,0.,1.);
  return s*smoothstep(yf-.04,yf+.02,y)*smoothstep(uStr.w-.07,uStr.w-.02,y);
}
float th(vec2 uv){ return max(texture(uTex,uv).r,strm(uv,uRes.x/uRes.y)); }
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  vec2 tx=1./uTexRes;
  /* фон: тёплый тёмный, как страница; лёгкое свечение сверху */
  vec3 bg=vec3(.030,.020,.012)*(.8+.5*(1.-smoothstep(.2,1.,uv.y)))+vec3(.016,.010,.005)*(1.-smoothstep(0.,.9,length((uv-vec2(.5,1.05))*vec2(asp*.7,1.))));
  /* толщина со сглаживанием (9 выборок) — убирает сетку билинейной интерполяции */
  vec2 e=tx*1.15;
  float c=th(uv);
  float a=th(uv+vec2(e.x,0.)), b=th(uv-vec2(e.x,0.)), d=th(uv+vec2(0.,e.y)), f=th(uv-vec2(0.,e.y));
  float s=(c*2.+a+b+d+f)/6.;
  /* градиент по большему шагу */
  vec2 e2=tx*2.4;
  float gx=th(uv+vec2(e2.x,0.))-th(uv-vec2(e2.x,0.));
  float gy=th(uv+vec2(0.,e2.y))-th(uv-vec2(0.,e2.y));
  vec2 g=vec2(gx,gy);
  /* поверхность: край — изолиния толщины, у края мениск, дальше плато */
  float thr=.36;
  float w=max(fwidth(s),1e-3)*.9;
  float m=smoothstep(thr-w,thr+w,s);
  float depth=smoothstep(thr,1.,s);
  float h=sqrt(clamp((s-thr)/.3,0.,1.))*.5+depth*.5;
  vec3 n=normalize(vec3(-g*(5.5+3.*depth),1.));
  vec3 L=normalize(vec3(-.45,.7,.62));
  vec3 V=vec3(0.,0.,1.);
  float dif=clamp(dot(n,L)*.5+.5,0.,1.);
  vec3 H=normalize(L+V);
  float spec=pow(max(dot(n,H),0.),90.)*1.4+pow(max(dot(n,H),0.),14.)*.18;
  float fr=pow(1.-max(n.z,0.),3.);
  /* цвет: от тёплого сливочного на тонких краях к белому в толще (g — «жирность» из источника) */
  vec3 cream=vec3(.98,.92,.80), white=vec3(1.,.985,.955);
  float tint=clamp(texture(uTex,uv).g,0.,1.);  /* g — «жирность» из симуляции */
  vec3 base=mix(cream,white,clamp(depth*.9+tint*.35,0.,1.));
  /* подповерхностное рассеяние: тонкий слой светится тёплым, в толще — мягкая тень */
  vec3 col=base*(.55+.62*dif)*(.82+.28*h);
  col+=vec3(1.,.93,.82)*fr*.28;
  col+=vec3(1.,.97,.92)*spec*(.5+.5*depth);
  /* отражение «софтбокса»: широкий мягкий блик вдоль нормали */
  vec3 R=reflect(-V,n);
  col+=vec3(1.,.96,.9)*smoothstep(.78,1.,dot(normalize(R+vec3(.35,-.5,0.)),vec3(0.,0.,1.)))*.22*depth;
  /* тёплый отсвет и контактная тень на фоне вокруг молока */
  vec2 bl=vec2(0.);
  float halo=0.;
  for(int i=0;i<8;i++){
    float an=float(i)*.785398+.3;
    vec2 o=vec2(cos(an),sin(an));
    halo+=th(uv+o*tx*7.)+th(uv+o*tx*16.);
  }
  halo=clamp(halo/16.,0.,1.);
  vec3 bgc=bg*(1.-.6*halo)+vec3(.30,.20,.10)*halo*halo*.55;
  col=mix(bgc,col,m);
  /* внизу молоко уходит в тень: подпись читается */
  /* ванна темнеет с глубиной (под текстом), верх приглушён под меню */
  float lvl=uStr.w;
  col*=mix(vec3(1.),vec3(.40,.33,.26),smoothstep(.0,.24,lvl-uv.y))*mix(1.,.5,smoothstep(.86,1.,uv.y));
  /* едва заметное зерно, чтобы градиенты не «полосились» */
  col+=(h21(gl_FragCoord.xy+uTime*13.)-.5)*.004;
  fragColor=vec4(max(col,0.),1.);
}`;

export const SCENES = [
  FLOW,
  scene(OBJ_MAP, OBJ_LOOK),
  scene(CELLAR_MAP, CELLAR_LOOK),
  scene(PROD_MAP, PROD_LOOK),
  MILK2D,
];
