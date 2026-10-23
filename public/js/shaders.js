/* GLSL: общий код + четыре сцены. Каждая сцена — отдельная программа. */

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

vec2 march(vec3 ro,vec3 rd){
  float t=0.; float id=-1.;
  for(int i=ZERO;i<NSTEP;i++){
    vec2 h=map(ro+rd*t);
    id=h.y;
    if(h.x<.0011*t+.0008) break;
    t+=max(h.x*STEP,.003*t);
    if(t>TMAX) return vec2(t,-1.);
  }
  return vec2(t,id);
}
/* укороченный марш для отражений: там детали не нужны */
vec2 marchR(vec3 ro,vec3 rd){
  float t=0.; float id=-1.;
  for(int i=ZERO;i<36;i++){
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
  for(int i=ZERO;i<14;i++){
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
  vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;
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
vec2 map(vec3 p){
  float u=uU;
  float pCurd=smoothstep(.14,.40,u);
  float pPress=smoothstep(.46,.70,u);
  float dFloor=p.y+1.3;

  float wob=.05*sin(p.x*4.+gT*2.)*sin(p.y*3.-gT*1.7)*sin(p.z*5.+gT*2.3);
  float drop=length(p*vec3(1.,.93,1.))-.92-wob*(1.-pCurd);

  float curds=1e3;
  float spread=mix(0.,.9,pCurd)*(1.-pPress);
  for(int i=ZERO;i<9;i++){
    float fi=float(i);
    vec3 dir=normalize(vec3(h11(fi+1.)-.5,h11(fi+7.)-.5,h11(fi+13.)-.5)*2.+vec3(0.,0.,.0001));
    float rad=(.32+.15*h11(fi+3.))*(1.+(1.-pCurd)*.65);
    vec3 c=dir*spread*(.55+.7*h11(fi+5.));
    c+=.07*vec3(sin(gT*.8+fi*1.3),cos(gT*.9+fi*2.1),sin(gT*.7+fi*3.1))*pCurd*(1.-pPress);
    curds=smin(curds,length(p-c)-rad,.24-.17*pCurd*(1.-pPress));
  }
  float blob=mix(drop,curds,smoothstep(0.,.45,pCurd));
  blob+=.03*sin(p.x*5.+gT*.4)*sin(p.y*4.7-gT*.3)*sin(p.z*5.3)*smoothstep(.1,.5,pCurd)*(1.-pPress);

  float wheel=sdRoundCyl(p,.95,.26,.1);
  float body=mix(blob,wheel,pPress);

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
    float fi=float(i);
    vec3 dir=normalize(vec3(h11(fi+1.)-.5,h11(fi+7.)-.5,h11(fi+13.)-.5)*2.+vec3(0.,0.,.0001));
    float rad=(.32+.15*h11(fi+3.))*(1.+(1.-pCurd)*.65);
    curds=smin(curds,length(p-dir*spread*(.55+.7*h11(fi+5.)))-rad,.24-.17*pCurd*(1.-pPress));
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
  if(d<.3) d=max(d,-eyes(q*vec3(1.,1.4,1.)+vec3(2.,0.,1.))*core+.0);
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
  if(d<.3) d=max(d,-eyes(q*vec3(1.,1.4,1.)+vec3(2.,0.,1.))*core);
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
  vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;
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

export const SCENES = [
  FLOW,
  scene(OBJ_MAP, OBJ_LOOK),
  scene(CELLAR_MAP, CELLAR_LOOK),
  scene(PROD_MAP, PROD_LOOK),
];

/* ---------- Пост-проход: блум, молочная шторка, виньетка, зерно, тон ---------- */
export const POST = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uWipe;
uniform float uFade;
out vec4 fragColor;
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);
}
uniform vec2 uTexRes;
vec3 tmS(vec3 c){ return c/(1.+c); }
vec3 fetchT(vec2 uv){ return tmS(texture(uTex,uv).rgb); }
/* FXAA в «сжатом» пространстве, потом обратно в линейное */
vec3 fxaa(vec2 uv){
  vec2 px=1./uTexRes;
  vec3 K=vec3(.299,.587,.114);
  vec3 nw=fetchT(uv+vec2(-1.,-1.)*px), ne=fetchT(uv+vec2(1.,-1.)*px);
  vec3 sw=fetchT(uv+vec2(-1.,1.)*px), se=fetchT(uv+vec2(1.,1.)*px);
  vec3 m=fetchT(uv);
  float lnw=dot(nw,K), lne=dot(ne,K), lsw=dot(sw,K), lse=dot(se,K), lm=dot(m,K);
  float lmin=min(lm,min(min(lnw,lne),min(lsw,lse)));
  float lmax=max(lm,max(max(lnw,lne),max(lsw,lse)));
  vec2 dir=vec2(-((lnw+lne)-(lsw+lse)),((lnw+lsw)-(lne+lse)));
  float red=max((lnw+lne+lsw+lse)*.03125,.0078125);
  float rcp=1./(min(abs(dir.x),abs(dir.y))+red);
  dir=clamp(dir*rcp,-8.,8.)*px;
  vec3 a=.5*(fetchT(uv+dir*(1./3.-.5))+fetchT(uv+dir*(2./3.-.5)));
  vec3 b=a*.5+.25*(fetchT(uv+dir*-.5)+fetchT(uv+dir*.5));
  float lb=dot(b,K);
  vec3 r=(lb<lmin||lb>lmax)?a:b;
  r=min(r,vec3(.995));
  return r/(1.-r);
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
  vec2 off=vec2(0.,1.)*edge*.012*(n2(uv*9.+uTime)-.5);
  vec2 cuv=uv+off+(uv-.5)*.004;
  vec3 col=fxaa(cuv);
  col.r=mix(col.r,texture(uTex,cuv+(uv-.5)*.0016).r,.5);
  col.b=mix(col.b,texture(uTex,cuv-(uv-.5)*.0016).b,.5);
  vec3 bl=vec3(0.);
  float w=1.;
  for(int i=2;i<=6;i++){ // постоянные границы — безопасно
    vec3 s=textureLod(uTex,cuv,float(i)).rgb;
    bl+=max(s-vec3(.9),0.)*w;
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
  col+=(h21(gl_FragCoord.xy+fract(uTime)*91.)-.5)*.03;
  col*=1.-uFade;
  fragColor=vec4(col,1.);
}`;
