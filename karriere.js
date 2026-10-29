// Alpine Resort Tycoon – Karriere (Bergbahn-Karriere, K1)
(function(){'use strict';
// ===== Karriere (K1): eigene Berg-Engine für Karriere-Berge =====
// Läuft getrennt vom Freien Spiel (Heimatberg bleibt unverändert). Benutzt die Zeichenteile des Spiels
// (pineN, liftStation, pylonN, gondola, personN, cannonN, chalet, groomer, car, bus, hut, flkDraw).
// Präfix: alles in diesem Block, nach außen nur window.KAR (für Tests).
const KDAYH0=6;                       // Tag beginnt 06:00
const KRT=24;                         // echte Sekunden je Spielstunde bei ×1 (tagsüber)
const KSL=28;                         // Saison = 4 Wochen
const KWN=['MO','DI','MI','DO','FR','SA','SO'];
const KWF=[.78,.74,.76,.84,.98,1.35,1.18]; // Gäste je Wochentag
const kcl=(a,lo,hi)=>Math.min(hi,Math.max(lo,a));
const kfmt=n=>{try{return new Intl.NumberFormat('de-DE').format(Math.round(n))+' €'}catch(e){return Math.round(n)+' €'}};
const knum=n=>{try{return new Intl.NumberFormat('de-DE').format(Math.round(n))}catch(e){return String(Math.round(n))}};
const kRNG=s=>{let q=(Math.abs(Math.round(s))*2654435761)%2147483646+1;const f=()=>(q=(q*16807)%2147483647)/2147483647;f();f();return f};
const kR=Math.random;
const kpick=a=>a[Math.floor(kR()*a.length)];
const kh=(x)=>{const h=Math.floor(x),m=Math.floor((x-h)*60);return String(h%24).padStart(2,'0')+':'+String(m).padStart(2,'0')};
const kesc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Catmull-Rom über [x,y,w]-Punkte, dicht abgetastet (Abstand ~st)
function kDense(P,st=3){const out=[];const n=P.length;for(let i=0;i<n-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(n-1,i+2)];const L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),m=Math.max(2,Math.ceil(L/st));
 for(let j=0;j<m;j++){const t=j/m,t2=t*t,t3=t2*t;const f=k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);out.push([f(0),f(1),f(2)])}}out.push(P[n-1].slice());
 // Bogenlänge und Normale
 let s=0;for(let i=0;i<out.length;i++){if(i)s+=Math.hypot(out[i][0]-out[i-1][0],out[i][1]-out[i-1][1]);const a=out[Math.max(0,i-1)],b=out[Math.min(out.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;out[i][3]=s;out[i][4]=-dy/l;out[i][5]=dx/l}return out}
// Punkt auf dichter Linie nach Bogenlänge s → [x,y,w,nx,ny]
function kAt(d,s){const L=d[d.length-1][3];s=kcl(s,0,L);let lo=0,hi=d.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(d[m][3]<=s)lo=m;else hi=m}const a=d[lo],b=d[hi],u=b[3]>a[3]?(s-a[3])/(b[3]-a[3]):0;
 return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u,a[4]+(b[4]-a[4])*u,a[5]+(b[5]-a[5])*u]}
// Polylinie (Wege) mit Bogenlänge
function kPoly(P){const d=P.map(p=>[p[0],p[1],0]);let s=0;for(let i=0;i<d.length;i++){if(i)s+=Math.hypot(d[i][0]-d[i-1][0],d[i][1]-d[i-1][1]);d[i][3]=s;d[i][4]=0;d[i][5]=0}return d}
function kQuad(a,c,b,n=10){const o=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]])}return o}
function kInPoly(x,y,P){let ins=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))ins=!ins}return ins}

// ===== Firmen-Vorteile =====
const KPERK=[
 {id:'lift',ic:'🚡',n:'Liftbau-Partner',d:'Lifte und Lift-Ausbau 10 % günstiger',c:2},
 {id:'bank',ic:'🏦',n:'Hausbank',d:'Kreditrahmen +50 %, Zinsen ein Drittel niedriger',c:1},
 {id:'kap',ic:'💰',n:'Startkapital',d:'+5.000 € Startgeld',c:2},
 {id:'raupe',ic:'🚜',n:'Gebrauchte Pistenraupe',d:'Start mit einer Pistenraupe',c:2},
 {id:'bw',ic:'⛑️',n:'Bergwacht-Verein',d:'1 Bergwacht von Anfang an, ohne Lohn',c:1},
 {id:'team',ic:'🤝',n:'Eingespieltes Team',d:'Personal 20 % günstiger, Liftwarte reparieren schneller',c:2},
 {id:'schnee',ic:'❄️',n:'Schneemacher',d:'Schneekanonen 15 % günstiger und 10 % weniger Strom',c:2},
 {id:'name',ic:'📰',n:'Guter Name',d:'Ruf startet 10 Punkte höher, neue Stufen sprechen sich 1 Tag schneller herum',c:2},
 {id:'wer',ic:'📣',n:'Werbeprofi',d:'Kampagnen 20 % günstiger',c:1},
 {id:'bau',ic:'🏗️',n:'Baumeister',d:'Baustellen sind 1 Tag früher fertig',c:3}];
const KPK=id=>!!(KG&&KG.perks&&KG.perks.includes(id));

// ===== Berg-Liste der Karriere =====
const KBERGE=[
 {id:'sonn',n:'Sonnleiten',sub:'der Familienhang',lv:'Leicht',lc:'#2e9e5b',st:3,sea:1,start:2500},
 {id:'bich',n:'Bichlberg',sub:'der Waldhang',lv:'Normal',lc:'#1e88e5',st:4,sea:2,start:600},
 {id:'alt',n:'Altberg',sub:'der Sanierungsfall',lv:'Schwer',lc:'#e8504a',st:4,sea:2,start:-8000},
 {id:'seek',n:'Seekar',sub:'der Berg hinter dem See',lv:'Schwer',lc:'#e8504a',st:5,sea:2,start:1000},
 {id:'eis',n:'Eisspitz',sub:'der Gipfelsturm',lv:'Sehr schwer',lc:'#7d3bd0',st:6,sea:3,start:300}];
const KV={}; // Berg-Vorlagen (Sonnleiten in K1)

// ===== Zustand =====
let KG=null;      // Spielstand des laufenden Berges
let KVOR=null;    // Vorlage des laufenden Berges
let KON=false;    // Karriere-Berg läuft
let KC=null;      // Karriere-Daten (Firma, Sterne, Vorteile)
const KKEY='art-karriere',KBK=id=>'art-kberg-'+id;
// Laufzeit (nicht gespeichert)
const KW={folks:[],cars:[],buses:[],pops:[],fx:[],chairs:{},q:{},groom:null,res:null,tech:null,school:[],win:[],T:0,acc:0,id:1,snow:[],last:0,raf:0,flk:0};

// ===== Berg-Vorlage 1: Sonnleiten – kurzer, breiter, flacher Familienhang =====
KV.sonn={id:'sonn',n:'Sonnleiten',bounds:{x0:-140,x1:1140,y0:150,y1:2140},home:{x:120,y:1060,S:1.0},
 desc:'Ein kurzer, breiter und flacher Hang über einem Dorf mit Kirche, Bauernhöfen und Obstwiesen. Viele Familien und Anfänger kommen her – sie achten stark auf den Preis.',
 stages:3,seasons:1,start:2500,
 // Gästemix: Familien, Anfänger, Profis, Snowboarder
 mix:{fam:.46,anf:.26,pro:.14,sb:.14},priceSens:1.35,
 wx:{sonne:.47,neuschnee:.24,tau:.19,sturm:.10},
 rivals:['Lift am Kogel','Familienlift Rauris','Hochbichl','Schischaukel Wald','Lärchenhang','Gerlitzer Lifte','Sonnenalm Kreuth','Moosbichl','Panoramalift Ried','Edelweiß-Lifte'],
 rivS:[620,560,520,470,430,390,350,300,260,220],
 // Pisten (Punkte [x,y,Breite]); Reihenfolge = Zeichenreihenfolge
 pistes:[
  {id:'ueb',n:'Übungshang',col:'b',st:1,pts:[[300,1160,10],[272,1172,22],[252,1250,30],[268,1318,34],[312,1348,20],[338,1362,10]]},
  {id:'main',n:'Sonnenhang',col:'b',st:2,pts:[[604,430,12],[566,416,18],[528,404,40],[492,420,62],[470,520,92],[512,690,118],[484,870,132],[522,1050,140],[526,1190,140],[534,1282,116],[600,1332,62],[652,1360,34],[690,1374,14]]},
  {id:'wald',n:'Waldabfahrt',col:'r',st:3,pts:[[604,430,12],[566,416,18],[528,404,30],[486,410,30],[440,428,30],[360,520,34],[262,640,36],[226,780,34],[262,930,34],[330,1060,36],[388,1180,38],[430,1270,40],[520,1318,40],[608,1346,30],[690,1374,14]]}],
 lifts:[
  {id:'tl',n:'Tellerlift',sh:'Teller',typ:'teller',st:1,b:[352,1352],t:[306,1150],cost:1800,days:0,pistes:['ueb'],q:[352,1378],qd:[1,0],exit:[300,1160],up:0},
  {id:'ses',n:'Sonnenhang-Sessel',sh:'Sessel',typ:'s2',st:2,b:[716,1368],t:[622,420],cost:0,days:2,pistes:['main','wald'],q:[690,1374],qd:[-1,0],exit:[604,430],up:1}],
 kassa:{x:500,y:1458},
 lots:[{id:'pw',n:'Parkplatz West',x0:-96,x1:420,y0:1500,y1:1556,base:1},{id:'po',n:'Parkplatz Ost',x0:580,x1:1096,y0:1500,y1:1556,cost:4000}],
 road:{y:1600},walkY:1492,bus:{x:470,y:1591},zebra:540,
 hut:{x:800,y:760,in:[[612,804],[690,796],[766,778]],cost:8000,days:2,st:2,n:'Sonnalm'},
 kinder:{x:148,y:1310,rx:74,ry:64,gate:[196,1362],cost:6000,days:2,st:1},
 school:{x:430,y:1404,cost:3500,days:1,st:1},
 garage:{x:868,y:1404},
 hotel:{x:700,y:1720,w:62,h:30,k:1,cost:15000,days:3,st:2,rooms:24,n:'Gasthof Sonnleiten'},
 cannons:{n:8,cost:10000,st:2},
 // Ziele (Pflicht, Zusatz, Meister)
 goals:[
  {k:'pf',t:'2 Sterne und Ausbau Stufe 3 offen',sh:'2 ★ + Stufe 3',ok:()=>kStars()>=2&&KG.stage>=3,lock:1},
  {k:'zu',t:'An 5 Tagen Familien zu mindestens 75 % zufrieden',sh:'Familien ≥ 75 %',prog:()=>Math.min(5,KG.famOK||0)+' / 5',ok:()=>(KG.famOK||0)>=5,lock:1},
  {k:'me',t:'Saisonergebnis über 75.000 €',sh:'75.000 € Ergebnis',prog:()=>kfmt(kSeaRes()),ok:()=>kSeaRes()>=75000,end:1}],
 stageInfo:[null,
  {n:'Übungshang',d:'Tellerlift, Übungshang, Kassa und Parkplatz West.'},
  {n:'Sonnenhang',d:'2er-Sessellift bis zum Gipfel und die breite blaue Hauptabfahrt „Sonnenhang“.',cost:8000,days:2,req:[['tl','Tellerlift gebaut'],['ruf',55,'Ruf mindestens 55 %'],['gst',150,'150 Gäste insgesamt']]},
  {n:'Waldabfahrt',d:'Rote Waldabfahrt durch den Mischwald – lockt Profis und Snowboarder.',cost:20000,days:2,req:[['stars',2,'2 Sterne'],['ruf',60,'Ruf mindestens 60 %']]}],
 fair:{ticket:[0,18,28,34],park:3,food:13,kids:7,school:24,hotel:52}
};
// --- Landschaft Sonnleiten ---
KV.sonn.bg=function(c){
 kSky(c,330);
 kRange(c,[[-40,180,150],[150,140,140],[330,170,130],[470,120,150],[660,150,140],[840,110,160],[1030,160,140]],340,{rock:['#b7c2d3','#ccd5e2'],shade:'#e9f0f7',cap:.5});
 c.fillStyle='#dfe9f3';c.beginPath();c.moveTo(-160,345);for(let x=-160;x<=1160;x+=40)c.lineTo(x,318+10*Math.sin(x/90)+6*Math.sin(x/37));c.lineTo(1160,400);c.lineTo(-160,400);c.fill();
 c.fillStyle='#ffffff';c.beginPath();c.moveTo(-160,440);c.bezierCurveTo(200,330,380,300,500,330);c.bezierCurveTo(640,300,820,350,1160,420);c.lineTo(1160,2300);c.lineTo(-160,2300);c.closePath();c.fill();
 kSnowGround(c,340,2200);
 // Gipfelkreuz
 c.strokeStyle='#7b5236';c.lineWidth=2.2;c.beginPath();c.moveTo(560,352);c.lineTo(560,326);c.moveTo(552,334);c.lineTo(568,334);c.stroke();
 // Gehweg oberhalb der Parkplätze, Weg zur Kassa
 c.fillStyle='#e2d4bb';c.fillRect(-110,1486,1220,12);c.fillStyle='#ead9be';c.fillRect(-110,1487,1220,3);
 kRoad(c,1600,-160,1160,34);
 // Gehsteig an der Straße (Nord) und Zebrastreifen
 c.fillStyle='#d9dee6';c.fillRect(-160,1576,1320,7);c.fillRect(-160,1617,1320,7);
 c.fillStyle='#fff';for(let i=0;i<5;i++)c.fillRect(530,1584+i*7,22,4);
 // Bushaltestelle
 c.fillStyle='#2e9e5b';c.fillRect(450,1564,1.6,14);c.beginPath();c.roundRect(444,1556,14,9,2);c.fill();c.fillStyle='#fff';c.font='700 6px Fredoka,sans-serif';c.textAlign='center';c.fillText('H',451,1563);
 kSign(c,451,1548,'🚌 Sonnleiten Dorf','#2e9e5b','#fff',5);
};
KV.sonn.paths=function(){const V=KV.sonn,k=V.kassa,W=V.walkY;return {
 kTl:kQuad([k.x,k.y+8],[392,1474],[356,1392],12).concat([[352,1380]]),
 kSes:kQuad([k.x,k.y+8],[630,1474],[690,1398],12),
 kKid:kQuad([k.x,k.y+8],[300,1476],[200,1368],14),
 kSchool:[[k.x,k.y+8],[460,1452],[436,1420]],
 busUp:[[470,1574],[478,1530],[488,W],[k.x,W],[k.x,k.y+8]],
 zebra:[[540,1636],[540,1574],[524,1530],[510,W],[k.x,W],[k.x,k.y+8]]}};
// Häuser, Kirche, Obstwiesen, Wald
KV.sonn.decor=function(D){const R=kRNG;
 D.house(190,1700,58,30,0);D.house(300,1770,50,28,2);D.house(820,1800,54,28,0);D.house(110,1860,52,28,1);D.house(620,1880,56,30,2);D.house(380,1900,48,26,0);D.house(880,1660,46,26,2);D.house(980,1940,52,28,1);D.house(30,1990,48,26,2);
 D.church(500,1790);
 for(const [x0,y0,nx,ny] of [[150,1940,5,3],[700,1950,6,3]])D.orchard(x0,y0,nx,ny);
 const mix=r=>r()<.35?'l':'p';
 const dens=(x,y)=>{if(y<360)return 0;if(y>1440&&y<1660)return 0;if(y>1640)return .35;return y<1300?.9:.6};
 D.scatter(-140,350,1140,1460,3000,11,dens,mix);D.scatter(-140,1660,1140,2380,760,12,dens,mix);
 for(const [x,y,ra,n,s] of [[120,560,120,170,21],[880,640,130,190,22],[860,1050,120,150,23],[80,950,110,140,24],[340,880,60,40,25],[900,1300,90,90,26],[-80,1200,90,90,28],[1080,900,100,120,29]])D.grove(x,y,ra,n,s,mix)};
// Blockflächen (keine Bäume)
KV.sonn.blocks=function(B){
 B.box(540,1330,800,1440);B.box(440,1400,580,1480);B.box(380,1370,470,1430);B.box(300,1340,410,1420); // Talstation, Kassa, Skischule, Tellerlift-Schlange
 B.box(-200,1484,1200,1640); // Parkplätze, Straße
 B.box(70,1236,226,1392);    // Kinderland
 B.box(440,1660,560,1800);   // Kirche
 B.box(820,1360,920,1420);   // Raupen-Garage
 B.line([[196,1360],[252,1408],[316,1442],[389,1463],[470,1470]],8);B.line([[500,1470],[620,1460],[705,1395]],7);B.line([[500,1470],[400,1462],[352,1376]],7);B.line([[612,804],[700,790],[778,772]],8);
 B.box(744,690,862,824); // Sonnalm
 B.box(660,1640,740,1740); // Gasthof
 B.line([[540,1630],[560,1700],[640,1730]],6);
};

// ===== Landschaftsteile =====
function kSky(c,y1,top='#5fb8ee',bot='#d6f0ff'){const g=c.createLinearGradient(0,-200,0,y1);g.addColorStop(0,top);g.addColorStop(1,bot);c.fillStyle=g;c.fillRect(-600,-600,2400,y1+600)}
function kSnowGround(c,y0,y1){const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#edf4fb');c.fillStyle=g;c.fillRect(-600,y0,2400,y1-y0+600);
 const r=kRNG(y0+7);c.fillStyle='rgba(150,190,225,.10)';for(let i=0;i<160;i++){c.beginPath();c.ellipse(-150+r()*1300,y0+r()*(y1-y0),16+r()*20,4+r()*5,0,0,7);c.fill()}}
function kRange(c,peaks,base,opt={}){const rock=opt.rock||['#8f96a6','#a9afbd'],snow=opt.snow||'#ffffff',sh=opt.shade||'#dfe8f2',r=kRNG(peaks.length*13+base);
 for(const [px,py,w] of peaks){const L=px-w,Rr=px+w;c.fillStyle=rock[0];c.beginPath();c.moveTo(L,base);c.lineTo(px,py);c.lineTo(px,base);c.closePath();c.fill();c.fillStyle=rock[1];c.beginPath();c.moveTo(Rr,base);c.lineTo(px,py);c.lineTo(px,base);c.closePath();c.fill();
  const h=(base-py)*(opt.cap||.42);c.fillStyle=sh;c.beginPath();c.moveTo(px,py);c.lineTo(px-w*h/(base-py),py+h);for(let q=0;q<4;q++){c.lineTo(px-w*h/(base-py)*(1-q/4)+(r()-.5)*4,py+h*(.75+r()*.3))}c.lineTo(px,py+h*.9);c.closePath();c.fill();
  c.fillStyle=snow;c.beginPath();c.moveTo(px,py);c.lineTo(px+w*h/(base-py),py+h);for(let q=1;q<4;q++)c.lineTo(px+w*h/(base-py)*(1-q/4),py+h*(.7+r()*.35));c.lineTo(px,py+h*.9);c.closePath();c.fill()}}
function kRoad(c,y,x0,x1,w=34){c.fillStyle='#c3c9d3';c.fillRect(x0,y-w/2-3,x1-x0,w+6);c.fillStyle='#4b5160';c.fillRect(x0,y-w/2,x1-x0,w);c.strokeStyle='#ffffff';c.lineWidth=1.4;c.setLineDash([12,10]);c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();c.setLineDash([])}
function kSign(c,x,y,t,bg='#fff',fg='#2b3040',fs=6){c.font='700 '+fs+'px Fredoka,sans-serif';const w=c.measureText(t).width+6;c.fillStyle=bg;c.beginPath();c.roundRect(x-w/2,y-fs*.85,w,fs*1.5,2);c.fill();c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(t,x,y);c.textBaseline='alphabetic'}
function kLot(c,L,gravel){const {x0,x1,y0,y1}=L;c.fillStyle='#c3c9d3';c.fillRect(x0-3,y0-3,x1-x0+6,y1-y0+6);c.fillStyle=gravel?'#b9ab93':'#5a6170';c.fillRect(x0,y0,x1-x0,y1-y0);
 if(gravel){const r=kRNG(x0);c.fillStyle='rgba(120,100,70,.35)';for(let i=0;i<220;i++)c.fillRect(x0+r()*(x1-x0),y0+r()*(y1-y0),1.1,1.1)}
 c.strokeStyle=gravel?'rgba(255,255,255,.55)':'rgba(255,255,255,.8)';c.lineWidth=1;for(let x=x0;x<=x1+.1;x+=kLotW){c.beginPath();c.moveTo(x,y0+2);c.lineTo(x,y1-8);c.stroke()}}
const kLotW=18;
function kLotFree(c,L){c.strokeStyle='rgba(150,165,185,.6)';c.lineWidth=1;c.setLineDash([5,4]);c.strokeRect(L.x0,L.y0,L.x1-L.x0,L.y1-L.y0);c.setLineDash([]);kSign(c,(L.x0+L.x1)/2,(L.y0+L.y1)/2,'🅿️ '+L.n+(L.st?' · ab Stufe '+L.st:''),'rgba(43,58,85,.65)','#fff',8)}
function kDecid(c,x,y,s,fruit){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='rgba(110,140,180,.22)';c.beginPath();c.ellipse(7,2,fruit?9:11,3,0,0,7);c.fill();
 c.strokeStyle='#7b5236';c.lineCap='round';const h=fruit?16:26;c.lineWidth=2.4;c.beginPath();c.moveTo(0,1);c.lineTo(0,-h*.55);c.stroke();
 const br=(x0,y0,a,l,w,d)=>{const x1=x0+Math.cos(a)*l,y1=y0+Math.sin(a)*l;c.lineWidth=w;c.strokeStyle='#7b5236';c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();
  if(d>0){br(x1,y1,a-.45,l*.68,w*.65,d-1);br(x1,y1,a+.42,l*.66,w*.65,d-1)}else{c.strokeStyle='#ffffff';c.lineWidth=w*.7;c.beginPath();c.moveTo(x1-1.2,y1-.4);c.lineTo(x1+1.2,y1-.6);c.stroke()}};
 br(0,-h*.55,-Math.PI/2,h*.35,1.9,fruit?2:3);br(0,-h*.5,-Math.PI/2-.7,h*.3,1.4,2);br(0,-h*.5,-Math.PI/2+.7,h*.3,1.4,2);
 c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.ellipse(0,-h*.95,fruit?6:8,2,0,0,7);c.fill();c.restore()}
function kChurch(c,x,y){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+6,y+3,48,6,0,0,7);c.fill();
 c.fillStyle='#f4efe6';c.fillRect(x-10,y-34,58,36);c.fillStyle='#ddd5c6';c.fillRect(x+30,y-34,18,36);c.fillStyle='#8a4a2e';c.beginPath();c.moveTo(x-14,y-32);c.lineTo(x-4,y-48);c.lineTo(x+52,y-48);c.lineTo(x+52,y-32);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-11,y-35);c.lineTo(x-3,y-46);c.lineTo(x+50,y-46);c.lineTo(x+50,y-36);c.closePath();c.fill();
 c.fillStyle='#a8dcf5';for(const q of [2,16,30]){c.beginPath();c.roundRect(x+q,y-26,7,14,[3.5,3.5,0,0]);c.fill();kWin(x+q,y-26,7,14)}
 c.fillStyle='#f4efe6';c.fillRect(x-32,y-80,24,82);c.fillStyle='#ddd5c6';c.fillRect(x-17,y-80,9,82);c.fillStyle='#3a404e';c.beginPath();c.roundRect(x-26,y-12,12,14,[6,6,0,0]);c.fill();
 c.fillStyle='#f2c53b';c.beginPath();c.arc(x-20,y-60,5,0,7);c.fill();c.strokeStyle='#2b3040';c.lineWidth=.8;c.beginPath();c.moveTo(x-20,y-60);c.lineTo(x-20,y-63.5);c.moveTo(x-20,y-60);c.lineTo(x-17.6,y-60);c.stroke();
 c.fillStyle='#3f8f6e';c.beginPath();c.moveTo(x-34,y-80);c.bezierCurveTo(x-40,y-92,x-26,y-98,x-24,y-106);c.lineTo(x-16,y-106);c.bezierCurveTo(x-14,y-98,x,y-92,x-6,y-80);c.closePath();c.fill();
 c.fillStyle='#fff';c.beginPath();c.moveTo(x-33,y-84);c.bezierCurveTo(x-35,y-92,x-26,y-96,x-24,y-104);c.lineTo(x-20,y-104);c.lineTo(x-22,y-90);c.closePath();c.fill();
 c.fillStyle='#3f8f6e';c.fillRect(x-21,y-118,2,12);c.strokeStyle='#f2c53b';c.lineWidth=1.2;c.beginPath();c.moveTo(x-20,y-126);c.lineTo(x-20,y-117);c.moveTo(x-23.5,y-123);c.lineTo(x-16.5,y-123);c.stroke()}
// Fenster für die Nacht vormerken (werden nachts warm beleuchtet)
function kWin(x,y,w,h){if(KW.winOn)KW.win.push([x,y,w,h])}
// ===== Statische Welt bauen =====
const KST={c:null,rs:1,x0:0,y0:0,trees:[],grid:{},tg:{},blocks:[],lines:[],objs:[],ver:0,houses:[]};
function kPisteGrid(){KST.grid={};for(const p of KW.pistes){for(const q of p.d){const k=Math.round(q[0]/24)+','+Math.round(q[1]/24);(KST.grid[k]||(KST.grid[k]=[])).push(q)}}}
function kOnP(x,y,m=0){const gx=Math.round(x/24),gy=Math.round(y/24);for(let a=-8;a<=8;a++)for(let b=-8;b<=8;b++){const L=KST.grid[(gx+a)+','+(gy+b)];if(L)for(const q of L)if(Math.hypot(q[0]-x,q[1]-y)<q[2]+m)return true}return false}
function kInBlock(x,y,m=0){for(const b of KST.blocks)if(x>b[0]-m&&x<b[2]+m&&y>b[1]-m&&y<b[3]+m)return true;
 for(const L of KVOR.lifts){const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=Math.max(0,Math.min(1,((x-L.b[0])*dx+(y-L.b[1])*dy)/l2)),px=L.b[0]+dx*u,py=L.b[1]+dy*u;if(Math.hypot(x-px,y-py)<(L.typ==='teller'?8:14)+16+m)return true}return false}
function kBuildWorld(){const V=KVOR;
 // Pisten: dichte Linien
 KW.pistes=V.pistes.map(p=>Object.assign({},p,{d:kDense(p.pts,3)}));KW.pmap={};for(const p of KW.pistes)KW.pmap[p.id]=p;
 kPisteGrid();
 KST.blocks=[];const B={box:(a,b,c2,d)=>KST.blocks.push([a,b,c2,d]),line:(P,w)=>{for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8);for(let j=0;j<=n;j++){const x=a[0]+(b[0]-a[0])*j/n,y=a[1]+(b[1]-a[1])*j/n;KST.blocks.push([x-w,y-w,x+w,y+w*1.6])}}}};
 V.blocks(B);
 for(const L of V.lifts){for(const e of [L.b,L.t]){const big=e===L.b;if(L.typ==='teller')B.box(e[0]-22,e[1]-26,e[0]+22,e[1]+30);else B.box(e[0]-(big?52:44),e[1]-34,e[0]+(big?52:44),e[1]+44)}}
 // Bäume und Häuser
 KST.trees=[];KST.tg={};KST.houses=[];KST.objs=[];
 const D={tree:(x,y,s,t='p',force)=>{if(!force){if(kOnP(x,y,12)||kInBlock(x,y,4))return 0;const gx=Math.round(x/10),gy=Math.round(y/10);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=KST.tg[(gx+a)+','+(gy+b)];if(L)for(const q of L)if(Math.hypot(q[0]-x,q[1]-y)<(t==='p'?6:9))return 0}}
   const k=Math.round(x/10)+','+Math.round(y/10);(KST.tg[k]||(KST.tg[k]=[])).push([x,y]);KST.trees.push({x,y,s,t});return 1},
  grove:(cx,cy,rad,n,sd,t)=>{const r=kRNG(sd);for(let i=0;i<n;i++){const a=r()*6.283,u=Math.sqrt(r()),x=cx+Math.cos(a)*rad*u,y=cy+Math.sin(a)*rad*u*.8;D.tree(x,y,.55+r()*.4+.6*(1-u),typeof t==='function'?t(r):t)}},
  scatter:(x0,y0,x1,y1,n,sd,dens,t)=>{const r=kRNG(sd);for(let i=0;i<n;i++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0),d=dens?dens(x,y):1;if(r()<d)D.tree(x,y,.55+r()*.7,typeof t==='function'?t(r,x,y):t)}},
  house:(x,y,w,h,k)=>{KST.blocks.push([x-w/2-10,y-h-30,x+w/2+10,y+14]);KST.houses.push({x,y,w,h,k})},
  church:(x,y)=>{KST.objs.push({y,f:c=>kChurch(c,x,y)})},
  orchard:(x0,y0,nx,ny)=>{KST.blocks.push([x0-20,y0-34,x0+nx*26+12,y0+ny*24-2]);KST.objs.push({y:y0-30,f:c=>{c.strokeStyle='#8f5a34';c.lineWidth=1;c.strokeRect(x0-14,y0-28,nx*26+6,ny*24+12)}});for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)D.tree(x0+i*26+(j%2)*6,y0+j*24,.7,'o',1)}};
 // Häuser zuerst eintragen (Blockflächen), dann Bäume
 const hs=[];const D0=Object.assign({},D,{scatter:()=>{},grove:()=>{},orchard:(...a)=>hs.push(['o',a])});V.decor(D0);
 for(const h of hs)D.orchard(...h[1]);
 V.decor(Object.assign({},D,{house:()=>{},church:()=>{},orchard:()=>{}}));
}
function kStaticRes(){const b=KVOR.bounds,area=(b.x1-b.x0)*(b.y1-b.y0),perf=typeof SET!=='undefined'&&SET.perf;return Math.min(kZ.S*kZ.dpr,Math.sqrt((perf?7e6:1.2e7)/area))}
function kBuildStatic(){const V=KVOR,b=V.bounds,rs=kStaticRes();const cv=KST.c&&KST.c.width===Math.ceil((b.x1-b.x0)*rs)?KST.c:document.createElement('canvas');cv.width=Math.ceil((b.x1-b.x0)*rs);cv.height=Math.ceil((b.y1-b.y0)*rs);
 const c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);c.setTransform(rs,0,0,rs,-b.x0*rs,-b.y0*rs);KST.rs=rs;KST.c=cv;KST.ver++;
 kWithGame(()=>{KW.winOn=0;V.bg(c);
  for(const L of V.lots){if(KG.lots[L.id])kLot(c,L,!KG.paved);else kLotFree(c,L)}
  kDrawPaths(c);kDrawPistes(c);
  // Objekte nach Tiefe: Bäume, Häuser, Kirche
  const O=KST.objs.slice();for(const t of KST.trees)O.push({y:t.y,f:c2=>t.t==='p'?pineN(c2,t.x,t.y,t.s):kDecid(c2,t.x,t.y,t.s,t.t==='o')});
  for(const h of KST.houses){if(KG.hotel&&V.hotel&&h.x===V.hotel.x&&h.y===V.hotel.y)continue;O.push({y:h.y,f:c2=>chalet(c2,h.x,h.y,h.w,h.h,h.k)})}
  O.sort((a,b)=>a.y-b.y);for(const o of O)o.f(c);
  // Laternen (Masten) am Gehweg und an der Straße
  for(let x=96;x<=920;x+=82)kLampPost(c,x,1488);for(let x=-100;x<=1100;x+=120)kLampPost(c,x,1576)});
 // Fenster der Dorfhäuser für die Nacht
 KST.winS=[];for(const h of KST.houses){if(KG.hotel&&V.hotel&&h.x===V.hotel.x&&h.y===V.hotel.y)continue;const r=kRNG(h.x*3+h.y);for(const [wx,wy] of chWin(h.x,h.y,h.w,h.h))if(r()<.7)KST.winS.push([wx,wy,6,6])}
 for(const q of [2,16,30])KST.winS.push([500+q,1790-26,7,14])}
function kLampPost(c,x,y){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+3,y+1,4,1.4,0,0,7);c.fill();c.fillStyle='#5b6578';c.fillRect(x-.8,y-22,1.6,22);c.fillStyle='#2b3040';c.beginPath();c.roundRect(x-3,y-25,6,4,1.5);c.fill();c.fillStyle='#ffe9a8';c.fillRect(x-2,y-21.5,4,1.1)}
// Wege (Gehwege im Schnee)
function kDrawPaths(c){const P=KW.paths;c.lineCap='round';c.lineJoin='round';
 const draw=(L,w)=>{c.strokeStyle='#d8c4a4';c.lineWidth=w;c.beginPath();L.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.strokeStyle='#e6d6bb';c.lineWidth=w-3;c.stroke()};
 draw(P.kTl,9);draw(P.kSes,9);if(KG.b.kinder)draw(P.kKid,8);if(KG.b.school)draw(P.kSchool,7);
 if(KG.b.hut){c.strokeStyle='#e9dcc4';c.lineWidth=6;c.beginPath();const H=KVOR.hut.in;H.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
 if(KG.hotel){draw([[540,1636],[560,1690],[640,1724],[676,1724]],7)}
 c.strokeStyle='#d8c4a4';c.lineWidth=9;c.beginPath();c.moveTo(KVOR.kassa.x,KVOR.walkY);c.lineTo(KVOR.kassa.x,KVOR.kassa.y+6);c.stroke();c.strokeStyle='#e6d6bb';c.lineWidth=6;c.stroke()}
// Pisten zeichnen: offen (gespurt, Stangen) oder noch gesperrt (unberührter Schnee)
function kPisteOpen(p){return KG.stage>=p.st&&kLiftFor(p)}
function kLiftFor(p){for(const L of KVOR.lifts)if(L.pistes.includes(p.id)&&KG.l[L.id]&&KG.l[L.id].on)return 1;return 0}
function kDrawPistes(c){const PS=KW.pistes;
 for(let pass=0;pass<2;pass++)for(const p of PS){const op=kPisteOpen(p);c.fillStyle=pass?(op?'#ffffff':'#fbfdff'):(op?'#d9e6f3':'#e9f0f8');for(let i=0;i<p.d.length;i+=2){const q=p.d[i];c.beginPath();c.arc(q[0],q[1],q[2]+(pass?0:1.4),0,7);c.fill()}}
 c.strokeStyle='rgba(165,185,215,.32)';c.lineWidth=.7;for(const p of PS){if(!kPisteOpen(p))continue;for(const f of [-.62,-.3,0,.3,.62]){c.beginPath();const n0=p.d.length;let st=0;p.d.forEach((q,i)=>{if(i<n0*.04||i>n0*.93)return;const x=q[0]+q[4]*q[2]*f+Math.sin(q[1]/37+f*5)*3,y=q[1]+q[5]*q[2]*f;st?c.lineTo(x,y):c.moveTo(x,y);st=1});c.stroke()}}
 const PC={b:'#3a78d0',r:'#e8504a',s:'#2b3040'};for(const p of PS){if(!kPisteOpen(p))continue;let acc=0;for(let i=1;i<p.d.length;i++){const a=p.d[i-1],q=p.d[i];acc+=Math.hypot(q[0]-a[0],q[1]-a[1]);if(acc<34)continue;acc=0;
  for(const sd of [-1,1]){const x=q[0]+q[4]*(q[2]+4)*sd,y=q[1]+q[5]*(q[2]+4)*sd;if(kOnP(x,y,-1)||kInBlock(x,y,-6))continue;c.fillStyle=PC[p.col];c.fillRect(x,y-8,1.6,9);c.fillStyle=p.col==='s'?'#f2c53b':'#fff';c.fillRect(x,y-5,1.6,1.4)}}}
 // gesperrte Pisten: Schild
 for(const p of PS){if(kPisteOpen(p)||p.id==='ueb')continue;const q=p.d[Math.floor(p.d.length*.42)];kSign(c,q[0],q[1],'🔒 '+p.n+' · Stufe '+p.st,'rgba(43,58,85,.78)','#fff',10)}}
// Zeichenteile des Spiels auf Winter/Karriere einstellen (Uhrzeit für Fenster, Jahreszeit, Ausbau-Optik)
function kWithGame(fn){const g=(typeof G!=='undefined')?G:null;const sv={t:g&&g.t,kup:g&&g.kup,rupg:g&&g.rupg,su:g&&g.su,T:typeof T!=='undefined'?T:0,NW:window.NWIN};
 let s0,s1,s2;try{s0=SEAV;s1=SEAB;s2=SEAD;SEAV='w';SEAB=0;SEAD='w'}catch(e){}
 const hp=window.hutPos;
 try{if(g){g.t=kBrightT();g.kup=KG&&KG.kup?1:0;g.rupg=0;g.su=null}try{T=KW.T}catch(e){}window.NWIN={push:(...r)=>{if(KW.winOn)for(const q of r)KW.win.push(q)},length:0};window.hutPos=()=>KVOR&&KVOR.hut?{x:KVOR.hut.x,y:KVOR.hut.y}:{x:0,y:0};fn()}
 finally{if(g){g.t=sv.t;g.kup=sv.kup;g.rupg=sv.rupg;g.su=sv.su}try{T=sv.T}catch(e){}window.NWIN=sv.NW;window.hutPos=hp;try{SEAV=s0;SEAB=s1;SEAD=s2}catch(e){}}}
// Helligkeit des Spiels: bright() rechnet aus G.t/DAY – passende Zeit dafür liefern
function kBrightT(){const b=kBright();// bright(): p<.58→1, .58–.72 fällt auf 0
 return (b>=1?.3:b<=0?.8:.58+(1-b)*.14)*(typeof DAY!=='undefined'?DAY:200)}

// ===== Spielstand eines Karriere-Berges =====
function kNewState(id,perks){const V=KV[id],B=KBERGE.find(b=>b.id===id);
 const s={id,v:1,firm:KC&&KC.firm||'',perks:(perks||[]).slice(),day:1,t:6.5,money:V.start+((perks||[]).includes('kap')?5000:0),stage:1,
  l:{},b:{kinder:0,school:0,hut:0,kiosk:0,raupe:(perks||[]).includes('raupe')?1:0,bw:(perks||[]).includes('bw')?1:0,lw:0,cannons:0,bus:0},
  lots:{},paved:0,hotel:0,bau:[],
  price:{ticket:V.fair.ticket[1],park:V.fair.park,food:V.fair.food,kids:V.fair.kids,school:V.fair.school,hotel:V.fair.hotel},
  ruf:50+((perks||[]).includes('name')?10:0),wx:'sonne',wxN:'sonne',snow:42,pq:{},inc:{},cost:{},hist:[],gT:0,gDay:0,rej:0,famOK:0,
  sat:{},cmp:[],rv:V.rivS.slice(),seaM0:0,seaInc:0,seaCost:0,goals:{},done:0,pleite:0,lg:[],buzz:0,res:{},sea:1,kupg:0,dem:0,stars:1,seaHist:[],tu:0};
 for(const L of V.lifts)s.l[L.id]={on:0,typ:L.typ,lg:0,cond:100,brk:null};
 for(const L of V.lots)s.lots[L.id]=L.base?1:0;
 for(const p of V.pistes)s.pq[p.id]=100;
 s.wxN=kWxRoll(V);s.seaM0=s.money;return s}
function kWxRoll(V){const w=V.wx;let r=kR(),acc=0;for(const k in w){acc+=w[k];if(r<acc)return k}return 'sonne'}
function kSave(){if(!KG)return;try{localStorage.setItem(KBK(KG.id),JSON.stringify(KG))}catch(e){}}
function kLoad(id){try{const o=JSON.parse(localStorage.getItem(KBK(id))||'null');if(o&&o.id===id)return o}catch(e){}return null}
function kCareerLoad(){try{KC=JSON.parse(localStorage.getItem(KKEY)||'null')}catch(e){KC=null}if(!KC)KC={firm:'',best:{},perks:[],v:1,res:{}};if(!KC.best)KC.best={};if(!KC.res)KC.res={};return KC}
function kCareerSave(){try{localStorage.setItem(KKEY,JSON.stringify(KC))}catch(e){}}
const kXP=()=>{let n=0;for(const b of KBERGE)n+=KC&&KC.best[b.id]||0;return n};
const kWd=()=>(KG.day-1)%7,kWeek=()=>Math.floor(((KG.day-1)%KSL)/7)+1,kSeaN=()=>Math.floor((KG.day-1)/KSL)+1,kSeaD=()=>(KG.day-1)%KSL+1;
const kDayT=d=>KWN[(d-1)%7]+' • Woche '+(Math.floor(((d-1)%KSL)/7)+1);
// Helligkeit 0..1 aus der Uhrzeit
function kBright(){const t=KG?KG.t:12;if(t<6)return 0;if(t<7.5)return (t-6)/1.5;if(t<16.8)return 1;if(t<18.6)return 1-(t-16.8)/1.8;return 0}
// Lift-Daten
const KLT={teller:{n:'Tellerlift',cap:1,sp:15,v:30,co:4,up:110},s2:{n:'2er-Sessel',cap:2,sp:36,v:40,co:8,up:260},s4:{n:'4er-Sessel',cap:4,sp:40,v:46,co:8,up:380},s6:{n:'6er-Sessel',cap:6,sp:44,v:50,co:9,up:520}};
const kLC=(id)=>{const L=KVOR.lifts.find(x=>x.id===id);return L};

// ===== Simulation =====
function kLog(ic,tx){if(!KG)return;KG.lg.unshift({d:KG.day,t:KG.t,ic,tx});if(KG.lg.length>80)KG.lg.length=80;KW.lgNew=1}
function kPop(x,y,v,col){KW.pops.push({x,y,v,t:0,col:col||'#f2c53b'})}
function kEarn(k,v,x,y){if(!v)return;KG.money+=v;KG.inc[k]=(KG.inc[k]||0)+v;if(x!=null)kPop(x,y,v)}
function kSpend(k,v){KG.money-=v;KG.cost[k]=(KG.cost[k]||0)+v}
// --- Lifte ---
function kLiftGeo(id){const L=kLC(id),[bx,by]=L.b,[tx,ty]=L.t,len=Math.hypot(tx-bx,ty-by);return {L,bx,by,tx,ty,len,ux:(tx-bx)/len,uy:(ty-by)/len}}
function kLiftSetup(id){const st=KG.l[id],g=kLiftGeo(id),T0=KLT[st.typ],sp=T0.sp*Math.pow(.86,st.lg||0),n=Math.max(4,Math.floor(2*g.len/sp));
 const old=KW.lift&&KW.lift[id];const o=Object.assign(g,{T:T0,n,ph:old?old.ph:0,ch:Array.from({length:n},(_,i)=>({u:i*2/n,r:[]})),q:old?old.q:[],run:0,ridT:0,wait:[],cnt:0});
 if(old)for(const c of old.ch)for(const f of c.r){f.st='q';o.q.unshift(f)}
 (KW.lift||(KW.lift={}))[id]=o;return o}
function kLiftOpen(id){const st=KG.l[id];if(!st||!st.on)return 0;if(st.brk)return 0;if(KG.wx==='sturm'&&st.typ!=='teller')return 0;const t=KG.t;return t>=8.5&&t<16.25}
function kLiftPos(o,u,side){// u 0..1 bergauf (rechte Seite), 1..2 bergab
 const up=u<1,a=up?u:2-u,co=o.T.co,px=-o.uy,py=o.ux;const sd=up?1:-1;return [o.bx+(o.tx-o.bx)*a+px*co*sd,o.by+(o.ty-o.by)*a+py*co*sd]}
function kLiftStep(o,dt){const id=o.L.id,open=kLiftOpen(id),st=KG.l[id];
 const riders=o.ch.some(c=>c.r.length);o.run=st.on&&!st.brk&&!(KG.wx==='sturm'&&st.typ!=='teller')&&(open||riders);
 if(!o.run)return;const du=o.T.v*dt/o.len;
 for(const c of o.ch){const u0=c.u;c.u+=du;if(c.u>=2)c.u-=2;
  // Ankunft oben
  if(u0<1&&c.u>=1){for(const f of c.r)kUnload(o,f);c.r=[]}
  // Einstieg unten
  if((u0>1.6&&c.u<.4&&c.u<u0)||(u0<0&&c.u>=0)){if(open)kBoard(o,c)}}}
function kBoard(o,c){const cap=o.T.cap;let n=0;while(o.q.length&&n<cap){const f=o.q[0];const s0=kQSlot(o,0);if(Math.hypot(f.x-s0[0],f.y-s0[1])>9)break;o.q.shift();f.st='ride';f.ch=c;f.lid=o.L.id;c.r.push(f);n++;
  const w=(KG.t-(f.qT||KG.t))*60;f.waits=(f.waits||0)+1;f.wsum=(f.wsum||0)+w;o.wait.push(w);if(o.wait.length>20)o.wait.shift();f.sat-=Math.max(0,w-7)*.55;if(w>25)f.sat-=3;
  if(!f.ins&&!f.kid&&f.ty!=='staff'){}o.cnt++;KG.res.rides=(KG.res.rides||0)+1}}
function kQSlot(o,i){const L=o.L,bx=L.b[0],by=L.b[1];if(o.T.cap===1){const r=Math.floor(i/6),j=i%6;return [bx-15+(r%2?5-j:j)*6,by+18+r*7]}
 const r=Math.floor(i/9),j=i%9;return [bx-14-(r%2?8-j:j)*7,by+16+r*8]}
function kUnload(o,f){f.ch=null;const L=o.L;f.x=L.exit[0]+(kR()-.5)*6;f.y=L.exit[1]+(kR()-.5)*4;
 if(f.grp&&f.grp.st==='run'&&f.grp.lid===o.L.id){kSkiStart(f,'ueb',f.grp);return}
 const ps=L.pistes.filter(pid=>kPisteOpen(KW.pmap[pid]));let pid=ps[0];
 if(ps.length>1){const w=ps.map(p=>{const P=KW.pmap[p];if(P.col==='r')return f.ty==='pro'?2.2:f.ty==='sb'?1.8:f.ty==='fam'?.35:.08;return 1});let s=w.reduce((a,b)=>a+b,0),r=kR()*s;for(let i=0;i<ps.length;i++){r-=w[i];if(r<=0){pid=ps[i];break}}}
 kSkiStart(f,pid)}
// --- Skifahren ---
const KSPD={fam:46,anf:32,pro:72,sb:64,kid:30,ins:24};
function kSkiStart(f,pid,grp){const P=KW.pmap[pid];f.st='ski';f.pid=pid;f.s=0;f.grpRun=grp||null;
 f.v=(f.kid?KSPD.kid:KSPD[f.ty]||45)*(.85+kR()*.3)*(pid==='ueb'?.62:1)*(P.col==='r'?1.1:1);if(grp){f.v=17;f.o=0}else{f.o=(kR()*2-1)*.7}
 f.ph=kR()*6.28;f.amp=f.ty==='sb'?.9:f.ty==='pro'?.7:f.ty==='anf'?.25:.5;f.ateCk=0}
function kSkiPos(f){const P=KW.pmap[f.pid],q=kAt(P.d,f.s);let o;if(f.grpRun){o=Math.sin(f.s/34)*.55}else{const sw=Math.sin(f.s/(26+f.amp*14)+f.ph)*f.amp*.32;o=kcl(f.o+sw,-.88,.88)}
 return [q[0]+q[3]*q[2]*o,q[1]+q[4]*q[2]*o,q,o]}
function kSkiStep(f,dt){const P=KW.pmap[f.pid],Ld=P.d[P.d.length-1][3];
 // Hütte unterwegs
 if(f.pid==='main'&&KG.b.hut&&!f.ate&&!f.kid&&!f.grpRun&&KG.t>=11.2&&KG.t<14.2&&!f.ateCk){const sH=KW.hutS;if(f.s<sH&&f.s+f.v*dt>=sH){f.ateCk=1;if(kR()<.72){f.st='walk';f.path=KVOR.hut.in.map(p=>[p[0],p[1]]);f.pi=0;f.wsp=12;f.nx='hut';f.board0=1;return}}}
 // Ausweichen: langsamer, wenn vorne dicht (einfach)
 f.s+=f.v*dt;const [x,y,q,o]=kSkiPos(f);f.sv=(x-f.x)*20;f.x=x;f.y=y;f.lo=o;
 if(f.hurtAt&&f.s>=f.hurtAt){f.hurtAt=0;kHurt(f);return}
 if(f.s>=Ld){KG.pq[f.pid]=Math.max(0,KG.pq[f.pid]-(f.pid==='ueb'?.06:.035));f.runs=(f.runs||0)+1;f.sat+=((KG.pq[f.pid]||100)-68)/30*1.4+(f.pid==='wald'&&(f.ty==='pro'||f.ty==='sb')?1.6:0);kAfterRun(f)}}
// nach einer Abfahrt / Liftfahrt: weiter?
function kAfterRun(f){f.st='walk';f.path=null;
 if(f.grpRun){const g=f.grpRun;f.grpRun=null;if(g.st==='run'&&KG.t<g.end){kToQueue(f,'tl');return}}
 if(f.ins)return kInsHome(f);
 if(KG.t>=f.leaveT||!kAnyLiftFor(f))return kGoHome(f);
 // Kiosk am Mittag (wenn keine Hütte erreichbar)
 if(!f.ate&&KG.b.kiosk&&KG.t>=11.4&&KG.t<13.8&&(f.pid==='ueb'||!KG.b.hut)&&kR()<.7)return kGoKiosk(f);
 // Wechsel zwischen Übungshang und Sessel
 const lid=kChooseLift(f);kToQueue(f,lid)}
function kAnyLiftFor(f){for(const L of KVOR.lifts)if(KG.l[L.id].on&&KG.t<16.25&&(L.typ==='teller'||KG.wx!=='sturm'))return 1;return 0}
function kChooseLift(f){const ses=KG.l.ses&&KG.l.ses.on&&KG.wx!=='sturm'&&KG.stage>=2,tl=KG.l.tl&&KG.l.tl.on;
 if(!ses)return 'tl';if(!tl)return 'ses';
 const p={fam:.82,anf:.25,pro:.97,sb:.95}[f.ty]||.6;const anfP=f.ty==='anf'?Math.min(.75,.18+(f.runs||0)*.07):p;return kR()<anfP?'ses':'tl'}
// Wege zwischen Orten
function kRev(P){return P.slice().reverse()}
function kWhere(f){// Bereich, an dem der Gast gerade ist: kas | tl | ses | kid | sch
 const K=KVOR.kassa;if(Math.hypot(f.x-K.x,f.y-(K.y+8))<70||f.y>1480)return 'kas';
 if(f.st==='kidin'||Math.hypot(f.x-KVOR.kinder.x,f.y-KVOR.kinder.y)<90)return 'kid';
 if(Math.hypot(f.x-KVOR.school.x,f.y-KVOR.school.y)<26)return 'sch';
 if(f.x>560&&f.y>1300)return 'ses';return 'tl'}
// Weg von Bereich zu Bereich (immer über die Kassa)
function kRoute(from,to){const P=KW.paths,toK={tl:P.kTl,ses:P.kSes,kid:P.kKid,sch:P.kSchool};let path=[];if(from===to)return path;if(from!=='kas'&&toK[from])path=kRev(toK[from]);if(to!=='kas'&&toK[to])path=path.concat(toK[to]);else path.push([KVOR.kassa.x,KVOR.kassa.y+8]);return path}
function kToQueue(f,lid){const o=KW.lift[lid],here=kWhere(f);const path=here===lid?[]:kRoute(here,lid);
 const end=kQSlot(o,o.q.length+1);path.push(end);f.path=path;f.pi=0;f.st='walk';f.wsp=path.length>2?11:14;f.nx='q:'+lid}
function kJoinQ(f,lid){const o=KW.lift[lid];if(!o||!KG.l[lid].on||KG.t>=16.25||(lid==='ses'&&KG.wx==='sturm')){return f.ins?kInsHome(f):kGoHome(f)}f.st='q';f.qT=KG.t;f.lid=lid;o.q.push(f)}
function kQStep(o,dt){for(let i=0;i<o.q.length;i++){const f=o.q[i],[sx,sy]=kQSlot(o,i),dx=sx-f.x,dy=sy-f.y,d=Math.hypot(dx,dy);if(d>.3){const m=Math.min(d,14*dt);f.x+=dx/d*m;f.y+=dy/d*m;f.sv=0}}
 // Liftschluss: wer noch steht, geht heim
 if(KG.t>=16.25||!KG.l[o.L.id].on){while(o.q.length){const f=o.q.shift();if(f.ins)kInsHome(f);else kGoHome(f)}}}
// --- Gehen ---
function kZebraWait(f,p){const zb=KVOR.zebra;if(Math.abs(f.x-zb)>16)return 0;const Y0=1581,Y1=1619;const onRoad=f.y>Y0&&f.y<Y1;if(onRoad)return 0;if(!((f.y<=Y0&&p[1]>Y0)||(f.y>=Y1&&p[1]<Y1)))return 0;
 for(const c of KW.cars){if(c.st!=='in'&&c.st!=='leave')continue;const d=(zb-c.x)*c.dir;if(d>-14&&d<58)return 1}for(const b of KW.buses){const d=(zb-b.x)*b.dir;if(b.st!=='stop'&&d>-20&&d<70)return 1}return 0}
function kWalkStep(f,dt){if(!f.path||f.pi>=f.path.length){return kArrive(f)}if(kZebraWait(f,f.path[f.pi]))return;const p=f.path[f.pi],dx=p[0]-f.x,dy=p[1]-f.y,d=Math.hypot(dx,dy),m=(f.wsp||11)*2.3*(f.kid?.85:1)*dt;
 if(d<=m){f.x=p[0];f.y=p[1];f.pi++;if(f.pi>=f.path.length)kArrive(f)}else{f.x+=dx/d*m;f.y+=dy/d*m}}
function kArrive(f){const nx=f.nx||'';f.nx='';f.path=null;
 if(nx==='kassa')return kKassa(f);
 if(nx.startsWith('q:'))return kJoinQ(f,nx.slice(2));
 if(nx==='car')return kAtCar(f);
 if(nx==='hut'){f.st='hut';f.tEnd=KG.t+.55+kR()*.4;kHutSeat(f);return}
 if(nx==='hutback'){f.ate=1;kSkiStart(f,'main');f.s=KW.hutS+2;return}
 if(nx==='kiosk'){f.st='kiosk';f.tEnd=KG.t+.3+kR()*.2;return}
 if(nx==='kioskback'){kAfterRun(f);return}
 if(nx==='kid')return kKidIn(f);
 if(nx==='school'){f.st='sw';return}
 if(nx==='busw'){f.st='busw';return}
 if(nx==='hotelin'){f.st='gone';return}
 if(nx==='inshome'){f.st='gone';return}
 f.st='idle'}
// --- Ankunft, Kassa ---
function kKassa(f){f.st='kas';f.tEnd=KG.t+.03+kR()*.05}
function kKassaDone(f){const V=KVOR,P=KG.price,F=V.fair;if(!kAnyLiftFor(f)){f.sat-=15;kGoHome(f,1);return}
 if(f.kid&&f.toKid){kEarn('kid',P.kids,V.kinder.x,V.kinder.y-40);kWalk(f,KW.paths.kKid,'kid',10);return}
 const fairT=F.ticket[KG.stage]+(kStars()-1)*1.5,half=KG.t>=12,pr=f.kid?Math.round(P.ticket*.5):half?Math.round(P.ticket*.6):P.ticket,r=P.ticket/fairT;
 const sens=V.priceSens*(f.ty==='fam'?1.3:f.ty==='anf'?1.1:.8);
 if(r>1.12&&kR()<(r-1.12)*sens*.9){f.sat-=12;kGoHome(f,1);KG.res.prRej=(KG.res.prRej||0)+1;return}
 f.sat+=r>1?-(r-1)*45*sens:(1-r)*14;kEarn('tk',pr,V.kassa.x,V.kassa.y-30);f.paid=(f.paid||0)+pr;f.half=half;
 // Skischule buchen
 if(KG.b.school&&(f.ty==='anf'||f.kid&&!KG.b.kinder)&&!f.lessonD&&KG.t<14.4){const g=kSchoolSlot();if(g&&kR()<kcl(1.3-P.school/F.school*.55,.12,.85)){f.lessonD=1;g.pu.push(f);f.grp=g;kEarn('sch',P.school,V.school.x,V.school.y-30);f.paid+=P.school;f.sat+=6;kWalk(f,KW.paths.kSchool,'school',10);return}}
 kAfterRun(f)}
function kWalk(f,path,nx,sp){f.st='walk';f.path=path.map(p=>[p[0],p[1]]);f.pi=0;f.nx=nx;f.wsp=sp||11}
// --- Heimgehen ---
function kGoHome(f,noRide){const P=KW.paths,V=KVOR;f.leaving=1;
 if(f.kid&&f.st==='kidin'){kWalk(f,kRev(P.kKid).concat(kHomeTail(f)),f.hotelG?'hotelin':f.busG?'busw':'car',10);return}
 let path=[];const here=kWhere(f);
 if(!noRide)path=kRoute(here,'kas');
 path=path.concat(kHomeTail(f));kWalk(f,path,f.hotelG?'hotelin':f.busG?'busw':'car',11)}
function kHomeTail(f){const V=KVOR,k=V.kassa,W=V.walkY;if(f.hotelG)return kRev(KW.paths.zebra).concat([[560,1690],[640,1724],[V.hotel.x-20,V.hotel.y+4]]);if(f.busG)return kRev(KW.paths.busUp);
 const c=f.car;if(!c)return [[k.x,W]];return [[k.x,k.y+8],[k.x,W],[c.sx+9,W],[c.sx+9,1520]]}
function kAtCar(f){f.st='gone';const c=f.car;if(c){c.back++;if(c.back>=c.n&&c.st==='park'){c.st='out';c.tw=.4+kR()*.6}}}
// --- Hütte ---
function kHutSeat(f){const H=KVOR.hut,i=(KW.hutN=(KW.hutN||0)+1)%10;const sp=[[-26,6],[-20,6],[-12,6],[10,6],[14,6],[18,6],[-8,14],[-2,14],[4,14],[8,14]][i];f.x=H.x+sp[0];f.y=H.y+sp[1];f.sit=1}
function kHutDone(f){const V=KVOR,P=KG.price,r=P.food/V.fair.food;f.sit=0;f.ate=1;if(r<1.6||kR()<.5){const v=Math.round(P.food*(f.ty==='fam'?1.15:1));kEarn('food',v,V.hut.x,V.hut.y-46);f.paid+=v;f.sat+=r>1?-(r-1)*22:5}else f.sat-=4;
 kWalk(f,kRev(V.hut.in),'hutback',12)}
function kGoKiosk(f){const k=KVOR.kassa;const path=kRoute(kWhere(f),'kas').concat([[k.x+36,k.y+12]]);kWalk(f,path,'kiosk',11)}
function kKioskDone(f){const V=KVOR,P=KG.price;f.ate=1;const v=Math.round(P.food*.55);kEarn('food',v,V.kassa.x+36,V.kassa.y-14);f.paid+=v;f.sat+=3;
 kWalk(f,[[V.kassa.x,V.kassa.y+8]],'kioskback',11)}
// --- Kinderland ---
function kKidIn(f){f.st='kidin';f.kph=0;f.kt=0;const K=KVOR.kinder;f.x=K.gate[0];f.y=K.gate[1];f.sat+=7;kKidNext(f)}
function kKidNext(f){const K=KVOR.kinder;// Zauberteppich hinauf, dann im Bogen hinunter
 if(f.kph===0){f.kph=1;f.kt=0;f.kx0=f.x;f.ky0=f.y}else if(f.kph===1){f.kph=2;f.kt=0}else{f.kph=0;f.kt=0}}
function kKidStep(f,dt){const K=KVOR.kinder;if(KG.t>=f.leaveT){return kGoHome(f)}
 if(f.kph===1){// zum Teppich-Anfang gehen
  const tx=123,ty=1352,dx=tx-f.x,dy=ty-f.y,d=Math.hypot(dx,dy);if(d<1.5){f.kph=2;f.kt=0;f.st2='car'}else{const m=Math.min(d,9*dt);f.x+=dx/d*m;f.y+=dy/d*m}f.sv=0;return}
 if(f.kph===2){// Zauberteppich
  f.kt+=dt/9;f.x=123+14*f.kt;f.y=1352-96*f.kt;f.sv=0;if(f.kt>=1){f.kph=3;f.kt=0;f.kq=kR()<.5?1:-1}return}
 if(f.kph===3){// Abfahrt im Bogen durch das Kinderland
  f.kt+=dt/10;const t=f.kt,a=f.kq;f.x=138+a*Math.sin(t*Math.PI*1.6)*34+t*20;f.y=1258+t*92;f.sv=a*Math.cos(t*Math.PI*1.6)*40;if(t>=1){f.kph=1;f.kt=0}return}
 f.kph=1}
// --- Skischule ---
function kSchoolSlot(){const t=KG.t;let g=KW.school.find(g=>g.st==='wait'&&g.pu.length<6&&g.start-t<1.1&&g.start>t);if(!g&&KG.b.school){const nxt=Math.ceil(t-.5)+.5;if(nxt<=14.5&&nxt>=9.5&&nxt-t<1.1&&!KW.school.some(x=>x.start===nxt)){g={start:nxt,end:nxt+1.8,st:'wait',pu:[],ins:null,lid:'tl'};KW.school.push(g)}}return g}
function kSchoolStep(){const t=KG.t,S=KVOR.school;for(const g of KW.school){
 if(g.st==='wait'&&t>=g.start){g.pu=g.pu.filter(f=>!f.dead&&f.st==='sw');if(!g.pu.length){g.st='end';continue}
  g.st='run';const ins=kMkFolk('ins',0);ins.ins=1;ins.col='#d8433d';ins.x=S.x+10;ins.y=S.y+6;ins.grp=g;g.ins=ins;KW.folks.push(ins);
  kToQueue(ins,'tl');for(const f of g.pu){kToQueue(f,'tl')}}
 if(g.st==='run'&&t>=g.end){g.st='end';for(const f of g.pu){f.grp=null;f.lessonDone=1}}}
 KW.school=KW.school.filter(g=>g.st!=='end'||g.ins&&!g.ins.dead&&g.ins.st!=='gone')}
function kInsHome(f){const path=kRoute(kWhere(f),'sch');kWalk(f,path,'inshome',11);if(f.grp)f.grp.st='end'}
// --- Unfälle und Bergwacht ---
function kHurt(f){f.st='hurt';f.hT=KG.t;KG.res.hurt=(KG.res.hurt||0)+1;f.sat-=25;
 if(KG.b.bw){KW.res={f,st:'go',x:KVOR.garage.x-40,y:KVOR.garage.y+8,t:0,path:kResPath(f)};kLog('⛑️','Unfall auf der Piste '+KW.pmap[f.pid].n+' – die Bergwacht ist unterwegs.')}
 else{kLog('🤕','Unfall auf der Piste '+KW.pmap[f.pid].n+' – ohne Bergwacht dauert die Hilfe lange. Ruf −3.');KG.ruf=Math.max(5,KG.ruf-3)}}
function kResPath(f){const P=KW.pmap[f.pid],pts=[];for(let s=P.d[P.d.length-1][3];s>f.s;s-=40){const q=kAt(P.d,s);pts.push([q[0]+q[3]*q[2]*.82,q[1]+q[4]*q[2]*.82])}pts.push([f.x+10,f.y+4]);return pts}
function kResStep(dt){const R=KW.res;if(!R)return;const sp=56;
 if(R.st==='go'||R.st==='back'){const p=R.path[R.pi||0];if(!p){if(R.st==='go'){R.st='load';R.t=0}else{KW.res=null;const f=R.f;f.st='gone';return}return}
  const dx=p[0]-R.x,dy=p[1]-R.y,d=Math.hypot(dx,dy),m=sp*dt;R.a=Math.atan2(dy,dx);if(d<=m){R.x=p[0];R.y=p[1];R.pi=(R.pi||0)+1}else{R.x+=dx/d*m;R.y+=dy/d*m}if(R.st==='back'){R.f.x=R.x-Math.cos(R.a)*12;R.f.y=R.y-Math.sin(R.a)*12}return}
 if(R.st==='load'){R.t+=dt;if(R.t>2.4){R.st='back';R.path=kRev(R.path).concat([[KVOR.garage.x-40,KVOR.garage.y+8]]);R.pi=1;R.f.st='akja'}}}
// --- Gäste erzeugen ---
const KCOL=['#e8504a','#3a78d0','#f2a63b','#6cc07a','#b177e0','#2fb3b8','#ff7fae','#4b5ad8','#f06a2e'];
function kMkFolk(ty,kid){return {id:KW.id++,ty,kid:kid?1:0,col:kpick(KCOL),board:ty==='sb'&&!kid,x:0,y:0,st:'walk',sat:72,paid:0,runs:0,sv:0}}
function kLeaveT(ty,arr){const b={fam:14.1,anf:14.2,pro:15.4,sb:15.3}[ty]||15;return Math.max(arr+2.4,b+kR()*1.2)}
function kMix(){const M=KVOR.mix,st=KG.stage;const w={fam:M.fam,anf:M.anf,pro:M.pro*(st>=2?1:.15)*(st>=3?1.45:1),sb:M.sb*(st>=2?1:.2)*(st>=3?1.4:1)};
 // Werbung für eine Gruppe
 for(const c of KG.cmp)if(c.ty&&w[c.ty])w[c.ty]*=1.5;
 const s=w.fam+w.anf+w.pro+w.sb;let r=kR()*s;for(const k of ['fam','anf','pro','sb']){r-=w[k];if(r<=0)return k}return 'fam'}
function kGroup(ty){if(ty==='fam'){const n=2+(kR()<.55?2:1);const g=[];g.push(kMkFolk('fam',0));if(kR()<.85)g.push(kMkFolk('fam',0));while(g.length<n+ (g.length<2?0:0))g.push(kMkFolk('fam',1));return g.slice(0,4)}
 const n=ty==='pro'?1+(kR()<.5?1:0):1+Math.floor(kR()*3);return Array.from({length:n},()=>kMkFolk(ty,0))}
function kSetupFolk(f,arr,lt){f.leaveT=lt;f.arr=arr;f.hungry=kR()<.85;if(f.kid&&KG.b.kinder&&kR()<.82)f.toKid=1}
// Auto anlegen
function kSpots(){const out=[];for(const L of KVOR.lots){if(!KG.lots[L.id])continue;const n=Math.floor((L.x1-L.x0)/kLotW);for(let i=0;i<n;i++)out.push({lot:L.id,i,x:L.x0+kLotW*i+kLotW/2})}return out}
function kFreeSpot(){const sp=kSpots(),used=new Set(KW.cars.filter(c=>c.spot).map(c=>c.spot.lot+':'+c.spot.i));const free=sp.filter(s=>!used.has(s.lot+':'+s.i));if(!free.length)return null;
 // nahe am Weg zur Kassa bevorzugen
 free.sort((a,b)=>Math.abs(a.x-500)-Math.abs(b.x-500));return free[Math.floor(kR()*Math.min(4,free.length))]}
function kSpawnCar(ty){const sp=kFreeSpot();if(!sp){KG.rej++;KG.res.rej=(KG.res.rej||0)+1;return 0}
 const fromW=kR()<.5,y=fromW?1609:1591,x=fromW?KVOR.bounds.x0-40:KVOR.bounds.x1+40;
 const g=kGroup(ty),arr=KG.t,lt=kLeaveT(ty,arr);for(const f of g)kSetupFolk(f,arr,lt);
 const car={x,y,a:fromW?0:Math.PI,dir:fromW?1:-1,v:0,st:'in',spot:sp,sx:sp.x,col:kpick(['#e8504a','#3a78d0','#f2f2f2','#6cc07a','#f2c53b','#ff8fb8','#8e93b8','#2fb3b8']),ppl:g,n:g.length,back:0,ty};
 for(const f of g)f.car=car;KW.cars.push(car);return g.length}
function kCarStep(c,dt){const zb=KVOR.zebra;
 const blockedZ=()=>{for(const f of KW.folks){if(f.st==='walk'&&Math.abs(f.x-zb)<13&&f.y>1580&&f.y<1620)return 1}return 0};
 const ahead=(v)=>{for(const o of KW.cars){if(o===c||o.dir!==c.dir||Math.abs(o.y-c.y)>6||o.st==='park'||o.st==='turn'&&false)continue;const d=(o.x-c.x)*c.dir;if(d>0&&d<36)v=Math.min(v,Math.max(0,(d-26)*2))}const nz=(zb-c.x)*c.dir;if(nz>4&&nz<40&&blockedZ())v=0;return v};
 if(c.st==='in'){const tx=c.sx-c.dir*16,dist=(tx-c.x)*c.dir;let v=46;if(dist<60)v=Math.max(12,dist*.8);v=ahead(v);c.x+=c.dir*v*dt;if(dist<=1){c.x=tx;c.st='turn';c.tt=0;c.y0=c.y}return}
 if(c.st==='turn'){c.tt+=dt/1.7;const t=Math.min(1,c.tt),h=Math.PI/2;c.x=c.sx-c.dir*16+c.dir*16*Math.sin(t*h);c.y=c.y0+(1530-c.y0)*(1-Math.cos(t*h));c.a=(c.dir>0?0:Math.PI)+(c.dir>0?-1:1)*t*h;if(t>=1){c.st='park';c.a=-h;c.x=c.sx;c.y=1530;kUnloadCar(c)}return}
 if(c.st==='out'){c.tw-=dt;if(c.tw>0)return;c.st='back';c.tt=0;c.dir=kR()<.5?1:-1;return}
 if(c.st==='back'){// nur ausparken, wenn die Spur frei ist
  const ty2=c.dir>0?1609:1591;if(c.tt===0){for(const o of KW.cars){if(o===c||o.st==='park')continue;if(Math.abs(o.y-ty2)<6&&Math.abs(o.x-c.x)<46)return}}
  c.tt+=dt/1.9;const t=Math.min(1,c.tt),h=Math.PI/2;c.x=c.sx+c.dir*16*(1-Math.cos(t*h));c.y=1530+(ty2-1530)*Math.sin(t*h);c.a=-h+(c.dir>0?t*h:-t*h);if(t>=1){c.st='leave';c.y=ty2;c.a=c.dir>0?0:Math.PI;c.spot=null}return}
 if(c.st==='leave'){let v=ahead(48);c.x+=c.dir*v*dt;if(c.x<KVOR.bounds.x0-60||c.x>KVOR.bounds.x1+60)c.st='gone'}}
function kUnloadCar(c){const V=KVOR,W=V.walkY,k=V.kassa;let i=0;for(const f of c.ppl){f.x=c.sx+(i%2?-10:10);f.y=1530+(i>>1)*6;i++;const path=[[f.x,1514],[c.sx+9,W],[k.x,W],[k.x,k.y+8]];kWalk(f,path,'kassa',11);KW.folks.push(f);KG.gDay++;KG.gT++}
 kEarn('pk',KG.price.park,c.sx,1512);
 const r=KG.price.park/Math.max(1,V.fair.park);if(r>1.3)for(const f of c.ppl)f.sat-=(r-1.3)*10}
// Bus
function kBusStep(b,dt){const X=KVOR.bus.x;if(b.st==='in'){let v=40;const d=(X-b.x)*b.dir;if(d<70)v=Math.max(10,d*.8);if(d<=1){b.st='stop';b.tw=3.5;b.x=X;kBusUnload(b)}else b.x+=b.dir*v*dt;return}
 if(b.st==='stop'){b.tw-=dt;if(b.tw<=0){// Abholung
   const W=KW.folks.filter(f=>f.st==='busw');for(const f of W.slice(0,40)){f.st='gone';kAtBus(f)}b.st='leave'}return}
 if(b.st==='leave'){b.x+=b.dir*44*dt;if(b.x<KVOR.bounds.x0-80||b.x>KVOR.bounds.x1+80)b.st='gone'}}
function kAtBus(f){}
function kBusUnload(b){const V=KVOR,n=b.n||0;for(let i=0;i<n;i++){const ty=kMix(),f=kMkFolk(ty,0);const lt=kLeaveT(ty,KG.t);kSetupFolk(f,KG.t,Math.min(16.2,lt));f.busG=1;f.x=V.bus.x-14+(i%5)*6;f.y=1576+Math.floor(i/5)*2;kWalk(f,KW.paths.busUp,'kassa',11);KW.folks.push(f);KG.gDay++;KG.gT++}}
function kSpawnBus(n,pick){KW.buses.push({x:KVOR.bounds.x1+60,y:1591,dir:-1,st:'in',n,a:0,pick});}
// Hotelgäste (morgens aus dem Gasthof)
function kSpawnHotelG(n){const V=KVOR,H=V.hotel;for(let i=0;i<n;i++){const ty=kMix(),f=kMkFolk(ty,0);f.hotelG=1;kSetupFolk(f,KG.t,kLeaveT(ty,KG.t));f.x=H.x-20+kR()*6;f.y=H.y+4;
 const path=[[H.x-30,H.y+4],[640,1724],[560,1690]].concat(KW.paths.zebra);kWalk(f,path,'kassa',11);f.delay=Math.floor(i/4)*2.2+(i%4)*.35;KW.folks.push(f);KG.gDay++;KG.gT++}}

// ===== Tagesablauf, Wirtschaft =====
const KBASE={sonn:[0,110,260,380]};
const KWXF={sonne:1.12,neuschnee:1.22,tau:.82,sturm:.5};
const KWI={sonne:'☀️',neuschnee:'🌨️',tau:'🌡️',sturm:'🌪️'},KWNM={sonne:'Sonne',neuschnee:'Neuschnee',tau:'Tauwetter',sturm:'Sturm'};
function kFairT(){return KVOR.fair.ticket[KG.stage]+(kStars()-1)*1.5}
function kDemand(){const V=KVOR,base=KBASE[V.id]||KBASE.sonn,st=KG.stage;if(!Object.values(KG.l).some(l=>l.on))return 0;
 // neue Stufe spricht sich herum
 let b=base[st];if(KG.buzzD&&KG.day-KG.buzzD<KG.buzzN){const u=(KG.day-KG.buzzD+1)/(KG.buzzN+1);b=base[st-1]+(base[st]-base[st-1])*u}
 const r=KG.price.ticket/kFairT(),priceF=kcl(1.15-(r-.85)*V.priceSens*.9,.3,1.3);
 const q=kPQavg();let att=1+(KG.b.kinder?.07:0)+(KG.b.school?.05:0)+(KG.b.hut&&st>=2?.06:0)+(KG.b.kiosk?.02:0);
 let cmp=0;for(const c of KG.cmp)cmp+=c.eff;
 const d=b*KWF[kWd()]*(KWXF[KG.wx]||1)*(.35+KG.ruf/100*.95)*(.8+.1*kStars())*priceF*att*(.72+.28*q/100)*(1+cmp);
 return Math.round(d)}
function kPQavg(){let s=0,n=0;for(const p of KW.pistes){if(!kPisteOpen(p))continue;s+=KG.pq[p.id];n++}return n?s/n:100}
function kArrRate(t){if(t<8||t>=13.1)return 0;return t<9?1:t<10.6?1.6:t<12?.8:.62}
const KARRI=1*1+1.6*1.6+.8*1.4+.62*1.1;
// --- Wertung ---
function kOffer(){let o=0;const l=KG.l,b=KG.b;if(l.tl&&l.tl.on)o+=40;if(l.ses&&l.ses.on){o+=90;if(l.ses.typ==='s4')o+=40;if(l.ses.typ==='s6')o+=70}
 for(const k in l)o+=(l[k].lg||0)*10;
 for(const p of KW.pistes)if(kPisteOpen(p))o+=p.id==='ueb'?15:30;
 o+=(b.kinder?45:0)+(b.school?30:0)+(b.hut?50:0)+(b.kiosk?15:0)+(b.raupe?30:0)+(b.cannons?35:0)+(KG.hotel?45:0)+(b.bus?20:0)+(b.bw?15:0)+(b.lw?10:0)+(KG.paved?15:0)+(KG.stage-1)*40;
 for(const L of KVOR.lots)if(!L.base&&KG.lots[L.id])o+=15;return o}
function kScore(){return Math.round(kOffer()*.6+KG.ruf*2.2+kPQavg()*.8)}
const KSTH=[0,0,300,420,540,660];
function kStars(){if(!KG)return 1;const s=kScore();let n=1;for(let i=2;i<=5;i++)if(s>=KSTH[i])n=i;return n}
function kRank(){const me=kScore();return 1+KG.rv.filter(v=>v>me).length}
function kCredit(){const H=KG.hist.slice(-7);let avg=0;if(H.length)avg=H.reduce((a,h)=>a+h.inc,0)/H.length;return Math.round(Math.max(5000,avg*8)*(KPK('bank')?1.5:1)/100)*100}
function kSeaRes(){return Math.round((KG.seaInc||0)-(KG.seaCost||0))}
function kCanPay(v){return KG.money-v>=-kCredit()}
// --- Hauptschritt ---
function kStep(dt){if(!KG||KG.done)return;
 const busy=KW.folks.length>0||KW.cars.length>0||KW.buses.length>0;
 let nf=1;if((KG.t>=17.6||KG.t<7.2)&&!busy){nf=KW.groom&&KW.groom.st!=='home'?3.5:12}
 const dth=dt/KRT*nf,t0=KG.t;KG.t+=dth;KW.T+=dt;
 // Ereignisse über die Uhr
 if(t0<6&&KG.t>=6)kMorning();
 if(KG.t>=24){KG.t-=24;kMidnight()}
 // Ankunft
 const ar=kArrRate(KG.t);if(ar>0&&KG.dem>0){const car=KG.dem*(1-(KG.busShare||0))-KW.hotelN;KW.arrAcc=(KW.arrAcc||0)+Math.max(0,car)*ar/KARRI*dth/2.9;while(KW.arrAcc>=1){KW.arrAcc-=1;kSpawnCar(kMix())}}
 // Busse
 if(KG.b.bus){for(const bt of [8.65,9.65,10.65])if(t0<bt&&KG.t>=bt){kSpawnBus(Math.round(KG.dem*(KG.busShare||0)/3))}for(const bt of [15.3,16.05,16.7])if(t0<bt&&KG.t>=bt)kSpawnBus(0,1)}
 // Hotelgäste
 if(KG.hotel&&t0<8.1&&KG.t>=8.1){kSpawnHotelG(KW.hotelN||0)}
 // Lifte
 for(const id in KW.lift){const o=KW.lift[id];kLiftStep(o,dt);kQStep(o,dt)}
 kBrkStep();kSchoolStep();
 // Gäste
 for(const f of KW.folks){if(f.delay>0){f.delay-=dt;continue}
  switch(f.st){case 'walk':kWalkStep(f,dt);break;case 'ski':kSkiStep(f,dt);break;case 'ride':kRidePos(f);break;
   case 'kas':if(KG.t>=f.tEnd)kKassaDone(f);break;case 'hut':if(KG.t>=f.tEnd)kHutDone(f);break;case 'kiosk':if(KG.t>=f.tEnd)kKioskDone(f);break;
   case 'kidin':kKidStep(f,dt);break;case 'sw':if(!f.grp||f.grp.st==='end'){f.grp=null;kAfterRun(f)}break;
   case 'hurt':if(!KG.b.bw&&KG.t>f.hT+.7){f.sat-=5;kGoHome(f,1)}break;
   case 'busw':if(KG.t>17.2){f.st='gone'}break}
  if(f.st==='gone'&&!f.dead){f.dead=1;kGuestDone(f)}}
 if(KW.folks.some(f=>f.dead))KW.folks=KW.folks.filter(f=>!f.dead);
 for(const c of KW.cars)kCarStep(c,dt);if(KW.cars.some(c=>c.st==='gone'))KW.cars=KW.cars.filter(c=>c.st!=='gone');
 for(const b of KW.buses)kBusStep(b,dt);if(KW.buses.some(b=>b.st==='gone'))KW.buses=KW.buses.filter(b=>b.st!=='gone');
 // Unfälle
 if(KW.acc&&KW.acc.length&&KG.t>=KW.acc[0]){KW.acc.shift();const S=KW.folks.filter(f=>f.st==='ski'&&!f.grpRun&&f.pid!=='ueb');if(S.length&&!KW.res){const f=kpick(S);f.hurtAt=f.s+20}}
 kResStep(dt);kGroomStep(dt);kCanStep(dt,dth);
 // Sicherheitsnetz: abends alle weg
 if(KG.t>=19&&KG.t<19+dth*2){for(const f of KW.folks){if(f.st!=='gone'&&!f.dead){f.st='gone'}}for(const c of KW.cars)if(c.st==='park'){c.st='out';c.tw=kR()}}
 for(const p of KW.pops)p.t+=dt;KW.pops=KW.pops.filter(p=>p.t<1.1);
 // Ziele prüfen
 kGoalCheck();}
function kRidePos(f){const c=f.ch;if(!c){f.st='walk';return}const o=KW.lift[f.lid],p=kLiftPos(o,c.u),i=c.r.indexOf(f),cap=o.T.cap;
 if(cap===1){f.x=p[0]+1;f.y=p[1]+9;f.sv=0}else{f.x=p[0];f.y=p[1]+8}}
function kGuestDone(f){if(f.ins||f.ty==='staff')return;const k=f.kid?'fam':f.ty,S=KG.sat;const s=kcl(f.sat,0,100);(S[k]||(S[k]={n:0,s:0}));S[k].n++;S[k].s+=s;KG.res.satN=(KG.res.satN||0)+1;KG.res.satS=(KG.res.satS||0)+s}
// --- Morgen ---
function kMorning(){KG.wx=KG.wxN||'sonne';KG.dem=kDemand();KG.gDay=0;KG.rej=0;KG.inc={};KG.cost={};KG.sat={};KG.res={};KW.arrAcc=0;
 KG.busShare=KG.b.bus&&KG.dem>0?Math.min(.3,90/KG.dem):0;
 // Hotel
 KW.hotelN=0;if(KG.hotel){const H=KVOR.hotel,r=KG.price.hotel/KVOR.fair.hotel,occ=kcl(.2+.11*kStars()+KG.ruf/420-(r-1)*.9,.08,1);KG.hOcc=occ;KW.hotelN=Math.round(H.rooms*occ*1.7)}
 // Pannen und Unfälle planen
 for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;const p=.025+(1-s.cond/100)*.32;if(kR()<p){s.brkAt=9.4+kR()*5.6}else s.brkAt=0}
 const lam=.3+(KG.stage>=2?.35:0)+(kPQavg()<55?.4:0);KW.acc=[];let n=lam>1?1:0;if(kR()<lam%1)n++;for(let i=0;i<n;i++)KW.acc.push(9.6+kR()*5.5);KW.acc.sort((a,b)=>a-b);
 if(KG.wx==='sturm')kLog('🌪️','Sturm – der Sessellift bleibt heute zu.');
 kSave()}
// --- Mitternacht: Tagesabschluss ---
function kMidnight(){const V=KVOR,d=KG.day;
 // laufende Kosten
 const tm=KPK('team')?.8:1,c={};let up=0;for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;up+=KLT[s.typ].up+(s.lg||0)*30}c.lift=up*(KPK('team')?.9:1);
 c.kassa=90*tm;if(KG.b.hut)c.hut=110*tm;if(KG.b.kinder)c.kinder=80*tm;if(KG.b.school)c.school=70*tm;if(KG.b.kiosk)c.kiosk=30*tm;
 if(KG.b.raupe)c.raupe=130;if(KG.canRan)c.can=Math.round(260*(KPK('schnee')?.9:1));KG.canRan=0;
 let lots=0;for(const L of V.lots)if(KG.lots[L.id])lots++;c.lots=lots*25+(KG.paved?lots*10:0);
 if(KG.b.bus)c.bus=150;if(KG.hotel)c.hotel=170*tm;if(KG.b.lw)c.lw=130*tm;if(KG.b.bw&&!KPK('bw'))c.bw=140*tm;else if(KG.b.bw>1)c.bw=140*tm;
 // Hotel-Einnahmen der Nacht
 if(KG.hotel){const v=Math.round(V.hotel.rooms*(KG.hOcc||.4)*KG.price.hotel);kEarn('hot',v)}
 let cs=0;for(const k in c){c[k]=Math.round(c[k]);cs+=c[k]}
 // Zinsen
 if(KG.money<0){const z=Math.round(-KG.money*(.004+(5-kStars())*.0008)*(KPK('bank')?2/3:1));c.zins=z;cs+=z}
 for(const k in c)kSpend(k,c[k]);
 let inc=0;for(const k in KG.inc)if(k!=='bau')inc+=KG.inc[k];
 const g=KG.gDay,satA=KG.res.satN?KG.res.satS/KG.res.satN:null;
 // Ruf
 const r0=KG.ruf;if(satA!=null)KG.ruf+=(satA-KG.ruf)*.3;else KG.ruf-=1;
 if(KG.rej>5)KG.ruf-=Math.min(4,KG.rej/12);for(const cm of KG.cmp)KG.ruf+=cm.ruf||0;KG.ruf=kcl(KG.ruf,5,100);
 // Familien zufrieden?
 const fs=KG.sat.fam;let famA=null;if(fs&&fs.n>=5){famA=fs.s/fs.n;if(famA>=75){KG.famOK=(KG.famOK||0)+1;kLog('👨‍👩‍👧','Familien heute zu '+Math.round(famA)+' % zufrieden – Ziel: '+Math.min(5,KG.famOK)+' von 5 Tagen.')}}
 KG.hist.push({d,inc:Math.round(inc),cost:cs,g,rej:KG.rej,sat:satA==null?null:Math.round(satA),fam:famA==null?null:Math.round(famA),ruf:Math.round(KG.ruf),m:Math.round(KG.money),wx:KG.wx,st:kStars()});if(KG.hist.length>60)KG.hist.shift();
 KG.seaInc=(KG.seaInc||0)+inc;KG.seaCost=(KG.seaCost||0)+cs;
 KG.lastDay={inc:Math.round(inc),cost:cs,g,sat:satA,c,i:Object.assign({},KG.inc)};
 // Schnee und Pisten
 const dw={neuschnee:16,sturm:5,tau:-8,sonne:-1.5}[KG.wx]||0;KG.snow=Math.max(0,KG.snow+dw);
 for(const p of V.pistes){if(KG.wx==='tau')KG.pq[p.id]-=12;if(KG.wx==='neuschnee')KG.pq[p.id]=Math.max(KG.pq[p.id],82);KG.pq[p.id]=kcl(KG.pq[p.id],0,kSnowCap())}
 // Lifte altern
 for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;s.cond=Math.max(15,s.cond-(.9+(KW.lift[id]?KW.lift[id].cnt:0)/500));if(KW.lift[id])KW.lift[id].cnt=0}
 // Konkurrenz
 KG.rv=KG.rv.map(v=>Math.round(v+.8+kR()*2.2));
 // Kampagnen
 KG.cmp=KG.cmp.filter(cm=>cm.end>d);
 // Baustellen fertig
 KG.day++;kBauDone();
 // Pleite?
 if(KG.money<-kCredit()){KG.pleite=(KG.pleite||0)+1;if(KG.pleite===3||KG.pleite===5)kLog('⚠️','Die Kassa liegt seit '+KG.pleite+' Tagen unter dem Kreditrahmen. Nach 7 Tagen ist der Berg verloren!');if(KG.pleite>=7){KG.done=1;KG.lost=1;kSave();setTimeout(()=>kBergEnd(1),300);return}}else KG.pleite=0;
 KG.wxN=kWxRoll(V);
 // Saisonende?
 if((KG.day-1)%KSL===0){kSeasonEnd();return}
 kSave();kUIdirty()}
function kSnowCap(){return Math.min(100,KG.snow*2.4+8)}
// --- Baustellen ---
function kBauDays(days){return Math.max(0,days-(KPK('bau')?1:0))}
function kBauStart(it){if(it.days<=0){kBauApply(it);return}it.d0=KG.day;KG.bau.push(it);kLog('🚧','Baustelle: '+it.n+' – fertig am '+kDayT(KG.day+it.days)+' früh.');kUIdirty()}
function kBauDone(){const done=KG.bau.filter(b=>KG.day>=b.d0+b.days);KG.bau=KG.bau.filter(b=>KG.day<b.d0+b.days);for(const b of done)kBauApply(b,1)}
function kBauApply(b,late){if(b.k==='stage'){KG.stage=b.st;KG.buzzD=KG.day;KG.buzzN=KPK('name')?2:3;if(b.lift){KG.l[b.lift].on=1;kLiftSetup(b.lift)}kNeu(b.st)}
 else if(b.k==='lift'){KG.l[b.id].on=1;kLiftSetup(b.id)}
 else if(b.k==='b'){KG.b[b.id]=1;if(b.id==='hotel')KG.hotel=1}
 else if(b.k==='hotel'){KG.hotel=1}
 else if(b.k==='up'){kUp4()}
 kLog('✅',b.n+' ist fertig.');if(KG.t<13)KG.dem=kDemand();kRebuild();kUIdirty();kSave()}
// --- Pistenraupe ---
function kGroomPlan(){const out=[];const ps=KW.pistes.filter(p=>kPisteOpen(p)).sort((a,b)=>(b.id==='main')-(a.id==='main'));
 for(const p of ps){const L=p.d[p.d.length-1][3],up=[],dn=[];for(let s=L;s>=0;s-=12){const q=kAt(p.d,s);up.push([q[0]+q[3]*q[2]*.42,q[1]+q[4]*q[2]*.42])}for(let s=0;s<=L;s+=12){const q=kAt(p.d,s);dn.push([q[0]-q[3]*q[2]*.42,q[1]-q[4]*q[2]*.42])}out.push({p:p.id,pts:up},{p:p.id,pts:dn,fin:1})}
 return out}
function kGroomStep(dt){if(!KG.b.raupe)return;const t=KG.t;let R=KW.groom;
 if(!R){if(t>=19&&t<20&&KG.lastGroom!==KG.day&&!KW.folks.some(f=>f.st==='ski')){const G0=KVOR.garage;R=KW.groom={x:G0.x,y:G0.y+6,a:Math.PI,st:'run',legs:kGroomPlan(),li:0,pi:0,done:{}};let L=0,px=R.x,py=R.y;for(const lg of R.legs)for(const q of lg.pts){L+=Math.hypot(q[0]-px,q[1]-py);px=q[0];py=q[1]}R.sp=Math.max(40,L/66);KG.lastGroom=KG.day}else return}
 if(R.st==='home'){return}
 const sp=R.sp||40;let leg=R.legs[R.li];
 if(!leg){// zurück in die Garage
  const G0=KVOR.garage,dx=G0.x-R.x,dy=G0.y+6-R.y,d=Math.hypot(dx,dy);if(d<2){KW.groom=null;return}const m=Math.min(d,sp*dt);R.a=Math.atan2(dy,dx);R.x+=dx/d*m;R.y+=dy/d*m;return}
 // zum Anfang der Bahn fahren, dann ihr folgen (hinauf), am Ende über die Bahn wieder hinunter (rückwärts mit nächstem Versatz)
 const P=leg.pts,p=P[R.pi];if(!p){if(leg.fin)KG.pq[leg.p]=Math.max(KG.pq[leg.p],kSnowCap());R.li++;R.pi=0;return}
 const dx=p[0]-R.x,dy=p[1]-R.y,d=Math.hypot(dx,dy),m=sp*dt;if(d>0.01){const ta=Math.atan2(dy,dx);let da=ta-R.a;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;R.a+=da*Math.min(1,dt*6)}
 if(d<=m){R.x=p[0];R.y=p[1];R.pi++}else{R.x+=dx/d*m;R.y+=dy/d*m}}
// --- Schneekanonen ---
function kCanPos(){if(KW.canP)return KW.canP;const out=[];const p=KW.pmap.main,L=p.d[p.d.length-1][3];let sd=1;const n=KVOR.cannons.n;
 const okP=(x,y)=>{if(kOnP(x,y,6))return 0;for(const L of KVOR.lifts){const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(Math.hypot(x-L.b[0]-dx*u,y-L.b[1]-dy*u)<30)return 0}for(const b of KST.blocks)if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])return 0;return 1};
 for(let i=0;i<n*2&&out.length<n;i++){const s=L*(.1+.82*(i%n)/(n-1))+(i>=n?18:0),q=kAt(p.d,s);for(const sg of [sd,-sd]){const x=q[0]+q[3]*(q[2]+13)*sg,y=q[1]+q[4]*(q[2]+13)*sg;if(okP(x,y)){out.push({x,y,sd:sg,ph:kR()*20});break}}sd=-sd}
 const u=KW.pmap.ueb;for(const s of [40,120]){const q=kAt(u.d,s);const sg=q[3]<0?1:-1;const x=q[0]+q[3]*(q[2]+12)*sg,y=q[1]+q[4]*(q[2]+12)*sg;if(okP(x,y))out.push({x,y,sd:sg,ph:kR()*20})}
 return KW.canP=out}
function kCanStep(dt,dth){if(!KG.b.cannons)return;const t=KG.t,night=t>=20||t<5;KW.canOn=night&&KG.canAuto!==0&&KG.snow<75;if(KW.canOn){KG.canRan=1;KG.snow+=dth*.85}}
// --- Pannen ---
function kBrkStep(){const t=KG.t;for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;
 if(s.brkAt&&t>=s.brkAt&&!s.brk&&kLiftOpen(id)){const lw=KG.b.lw,dur=lw?(KPK('team')?.3:.45):1.2;s.brk={t0:t,end:t+dur,lw};s.brkAt=0;
  if(!lw){kSpend('tech',650);kLog('🔧',kLC(id).n+': Störung! Ohne Liftwart kommt ein Techniker von außen (650 €, über 1 Stunde).')}else kLog('🔧',kLC(id).n+': Störung – der Liftwart repariert.');kUIdirty()}
 if(s.brk&&t>=s.brk.end){s.brk=null;s.cond=Math.min(100,s.cond+6);kLog('✅',kLC(id).n+' läuft wieder.');kUIdirty()}}}
// --- Saisonende ---
function kSeasonEnd(){KG.seaHist.push({n:kSeaN()-1,inc:Math.round(KG.seaInc),cost:Math.round(KG.seaCost),res:kSeaRes(),st:kStars(),rank:kRank()});
 kGoalCheck(1);const last=kSeaN()-1>=KVOR.seasons;if(last){KG.done=1;kSave();kBergEnd(0);return}
 // weitere Saison (für spätere Berge): Ruf vergisst etwas, Saisonwerte zurücksetzen
 KG.ruf=Math.max(20,KG.ruf-15);KG.seaInc=0;KG.seaCost=0;KG.snow=40;kSave();kSeaWin()}
// --- Ziele ---
function kGoalCheck(fin){if(!KG||!KVOR)return;for(const g of KVOR.goals){if(KG.goals[g.k])continue;if(g.end&&!fin)continue;if(g.ok()){KG.goals[g.k]=1;if(!fin){kLog('🎯','Ziel geschafft: '+g.t);kToast('🎯 Ziel geschafft: '+g.sh,4000)}}}}
function kBergStars(){const g=KG.goals;if(!g.pf)return 0;return 1+(g.zu?1:0)+(g.me?1:0)}
// --- Neu freigeschaltet ---
function kNeu(st){const I=KVOR.stageInfo[st];KW.neu={st,n:I.n,d:I.d};kUIdirty()}
function kRebuild(){KW.canP=null;KW.hutS=kHutS();kBuildStatic()}
function kHutS(){const p=KW.pmap.main,H=KVOR.hut.in[0];let best=0,bd=1e9;for(const q of p.d){const d=Math.hypot(q[0]-H[0],q[1]-H[1]);if(d<bd){bd=d;best=q[3]}}return best}

// ===== Zeichnen =====
const kZ={S:1,camX:0,camY:0,dpr:2,cw:430,ch:900,cv:null,c:null};
function kViewW(){return kZ.cw/kZ.S}function kViewH(){return kZ.ch/kZ.S}
function kClamp(){const b=KVOR.bounds,vw=kViewW(),vh=kViewH();kZ.camX=vw>=b.x1-b.x0?(b.x0+b.x1-vw)/2:kcl(kZ.camX,b.x0,b.x1-vw);kZ.camY=vh>=b.y1-b.y0?(b.y0+b.y1-vh)/2:kcl(kZ.camY,b.y0,b.y1-vh)}
function kInV(x,y,m=60){return x>kZ.camX-m&&x<kZ.camX+kViewW()+m&&y>kZ.camY-m&&y<kZ.camY+kViewH()+m}
function kDraw(){const cv=kZ.cv,c=kZ.c;if(!cv||!KG)return;const k=kZ.S*kZ.dpr;c.setTransform(1,0,0,1,0,0);c.fillStyle='#eef4fb';c.fillRect(0,0,cv.width,cv.height);
 c.setTransform(k,0,0,k,-kZ.camX*k,-kZ.camY*k);
 const B=KVOR.bounds,rs=KST.rs,vw=kViewW(),vh=kViewH();if(KST.c){const sx=Math.max(0,(kZ.camX-B.x0)*rs),sy=Math.max(0,(kZ.camY-B.y0)*rs),sw=Math.min(KST.c.width-sx,vw*rs+2),sh=Math.min(KST.c.height-sy,vh*rs+2);
  if(sw>0&&sh>0)c.drawImage(KST.c,sx,sy,sw,sh,B.x0+sx/rs,B.y0+sy/rs,sw/rs,sh/rs)}
 KW.win=[];KW.winOn=kBright()<.7;const T0=KW.T;
 kWithGame(()=>{
  // Pistenzustand: abgefahrene Stellen (dezent)
  kDrawWear(c);
  const O=[];const add=(y,f)=>O.push({y,f});
  kDrawFences(c);
  for(const car of KW.cars)if(kInV(car.x,car.y))add(car.y+(car.st==='park'?-4:6),c2=>car2(c2,car));
  for(const b of KW.buses)if(kInV(b.x,b.y))add(b.y+8,c2=>bus(c2,b.x,b.y,b.dir>0?0:Math.PI,'#2e9e5b','SKIBUS'));
  kDrawBuildings(add,T0);
  for(const f of KW.folks){if(f.delay>0||f.st==='ride'&&KW.lift[f.lid]&&KW.lift[f.lid].T.cap>1||f.st==='gone'||f.st==='kas'&&0)continue;if(!kInV(f.x,f.y,20))continue;add(f.y,c2=>kPerson(c2,f,T0))}
  if(KW.groom&&KW.groom.st!=='home'){const R=KW.groom;add(R.y,c2=>groomer(c2,R.x,R.y,R.a-Math.PI/2,T0,true))}
  if(KW.res){const R=KW.res;add(R.y,c2=>kSled(c2,R,T0))}
  if(KG.b.cannons)for(const p of kCanPos())if(kInV(p.x,p.y))add(p.y,c2=>{c2.save();c2.translate(p.x,p.y);c2.scale(p.sd>0?-1:1,1);cannonN(c2,0,0,KW.canOn?1:0,T0+p.ph);c2.restore()});
  O.sort((a,b)=>a.y-b.y);for(const o of O)o.f(c);
  kDrawLifts(c,T0);
  if(KW.canOn&&KG.b.cannons)kCanSpray(c,T0);
 });
 kDrawNight(c);kDrawWeather(c);
 // Geldbeträge
 c.textAlign='center';for(const p of KW.pops){const a=1-p.t/1.1;c.globalAlpha=Math.max(0,a);c.font='700 9px Fredoka,sans-serif';c.strokeStyle='rgba(40,40,40,.55)';c.lineWidth=2.4;const s='+'+knum(p.v)+' €';c.strokeText(s,p.x,p.y-p.t*16);c.fillStyle=p.col;c.fillText(s,p.x,p.y-p.t*16)}c.globalAlpha=1}
function car2(c,cr){car(c,cr.x,cr.y,cr.a,cr.col)}
function kPerson(c,f,T0){const o=f;const st=f.st==='ski'||f.st==='q'||f.st==='ride'||f.st==='kidin'&&f.kph!==1||f.st==='hurt'?'ski':'walk';
 if(f.st==='hurt'){c.save();c.translate(f.x,f.y);c.rotate(1.35);personN(c,{x:0,y:0,st:'ski',col:f.col,kid:f.kid,board:f.board,sv:0},T0);c.restore();c.fillStyle='#e8504a';c.fillRect(f.x-1.2,f.y-24,2.4,7);c.fillRect(f.x-3.5,f.y-21.7,7,2.4);return}
 if(f.st==='akja')return;
 const q={x:f.x,y:f.y,st:st,col:f.col,kid:f.kid,board:f.board,sv:st==='ski'?f.sv:0,_px:f._px,_py:f._py,_pt:f._pt,_ms:f._ms};personN(c,q,T0);f._px=q._px;f._py=q._py;f._pt=q._pt;f._ms=q._ms;
 if(f.ins){c.fillStyle='#fff';c.font='700 4px Fredoka,sans-serif';c.textAlign='center'}}
function kSled(c,R,t){c.save();c.translate(R.x,R.y);const a=R.a||0;c.fillStyle='rgba(110,140,180,.3)';c.beginPath();c.ellipse(2,4,16,6,0,0,7);c.fill();c.rotate(a);
 // Akja hinten
 c.fillStyle='#f2701f';c.beginPath();c.roundRect(-26,-4,13,8,3);c.fill();c.fillStyle='#ffd0a8';c.fillRect(-24,-2.5,9,1.2);if(R.st==='back'){c.fillStyle=R.f.col;c.beginPath();c.roundRect(-24,-2.4,9,4.8,2);c.fill();c.fillStyle='#ffd9b5';c.beginPath();c.arc(-14.5,0,1.8,0,7);c.fill()}
 c.strokeStyle='#2b3040';c.lineWidth=.8;c.beginPath();c.moveTo(-13,0);c.lineTo(-9,0);c.stroke();
 // Motorschlitten
 c.fillStyle='#2b3040';c.fillRect(-9,-5,16,2);c.fillRect(-9,3,16,2);c.fillStyle='#d8433d';c.beginPath();c.roundRect(-8,-4,15,8,3);c.fill();c.fillStyle='#fff';c.fillRect(-2,-.8,5,1.6);c.fillRect(-.3,-2.5,1.6,5);
 c.fillStyle='rgba(190,230,255,.85)';c.beginPath();c.roundRect(5,-3,3,6,1);c.fill();c.fillStyle='#d8433d';c.beginPath();c.arc(-3,0,2.6,0,7);c.fill();c.fillStyle='#ffd9b5';c.beginPath();c.arc(-2.4,0,1.5,0,7);c.fill();
 c.restore()}
// abgefahrene Piste: hellgraue Flecken je nach Zustand
function kDrawWear(c){for(const p of KW.pistes){if(!kPisteOpen(p))continue;const q=KG.pq[p.id];if(q>85)continue;const a=(85-q)/85;const r=kRNG(p.d.length);c.fillStyle='rgba(170,185,205,'+(.28*a).toFixed(3)+')';for(let i=0;i<p.d.length;i+=6){const d=p.d[i];if(!kInV(d[0],d[1],60))continue;if(r()>a*.9)continue;const o=(r()*2-1)*.8;c.beginPath();c.ellipse(d[0]+d[3]*d[2]*o,d[1]+d[4]*d[2]*o,6+r()*10,2+r()*3,0,0,7);c.fill()}}}
// Anstell-Gitter + Wartezeit-Schild
function kDrawFences(c){for(const id in KW.lift){const o=KW.lift[id];if(!KG.l[id].on)continue;const L=o.L,bx=L.b[0],by=L.b[1];c.strokeStyle='#8a94a8';c.lineWidth=1;
 if(o.T.cap===1){for(let r=-1;r<4;r++){const y=by+14.5+r*7;let a=bx-19,b=bx+19;if(r>=0&&r<3){if(r%2===0)b=bx+12;else a=bx-12}c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.stroke();c.fillStyle='#5d667a';for(let x=a;x<=b;x+=12)c.fillRect(x-.7,y-1.4,1.4,2.8)}}
 else{const R=Math.max(6,Math.min(9,Math.ceil(o.q.length/9)+1));for(let r=-1;r<R;r++){const y=by+12+r*8;let a=bx-14-8*7-5,b=bx-8;if(r>=0&&r<R-1){if(r%2===0)a=bx-14-8*7+3;else b=bx-18}c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.stroke();c.fillStyle='#5d667a';for(let x=a;x<=b;x+=13)c.fillRect(x-.8,y-1.6,1.6,3.2)}c.beginPath();c.moveTo(bx-14-8*7-5,by+4);c.lineTo(bx-14-8*7-5,by+12+(R-1)*8);c.stroke()}
 const w=kWait(id),x=o.T.cap===1?bx-30:bx-82,y=by+(o.T.cap===1?20:6);c.fillStyle='#5d667a';c.fillRect(x-.8,y,1.6,14);c.fillStyle=w>22?'#e8504a':w>8?'#f2a63b':'#2e9e5b';c.beginPath();c.roundRect(x-16,y-12,32,13,2.5);c.fill();c.fillStyle='#fff';c.font='700 5.6px Fredoka,sans-serif';c.textAlign='center';c.fillText('WARTEZEIT',x,y-6.4);c.font='600 5px Fredoka,sans-serif';c.fillText(w<1?'keine':Math.round(w)+' Min.',x,y-1.4)}}
function kWait(id){const o=KW.lift[id];if(!o)return 0;// Schätzung aus Schlangenlänge und Förderleistung
 const perS=o.T.v/(o.len*2/o.n)*o.T.cap;const s=o.q.length/Math.max(.1,perS);return s/KRT*60}
// Lifte: Seile, Stützen, Sessel/Teller
function kDrawLifts(c,t){for(const id in KW.lift){const o=KW.lift[id];if(!KG.l[id].on)continue;const {bx,by,tx,ty,len,ux,uy}=o,co=o.T.co;
 if(!kInV(Math.min(bx,tx),Math.min(by,ty),Math.abs(tx-bx)+400)&&!kInV(bx,by,100))continue;
 if(o.T.cap===1){c.strokeStyle='#2a2e44';c.lineWidth=.8;c.beginPath();c.moveTo(bx,by-14);c.lineTo(tx,ty-14);c.stroke();
  const n=Math.max(2,Math.ceil(len/70));for(let i=1;i<n;i++){const px=bx+(tx-bx)*i/n,py=by+(ty-by)*i/n;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(px+3,py+2,5,1.6,0,0,7);c.fill();c.fillStyle='#6a6890';c.fillRect(px-1,py-17,2,18);c.fillStyle='#3a3f58';c.fillRect(px-4,py-17,8,1.6)}
  for(const ch of o.ch){if(ch.u>=1)continue;const x=bx+(tx-bx)*ch.u,y=by+(ty-by)*ch.u-14;c.strokeStyle='#2a2e44';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+9);c.stroke();c.fillStyle='#f2c53b';c.beginPath();c.arc(x,y+10,1.6,0,7);c.fill()}
  continue}
 c.strokeStyle='#161a28';c.lineWidth=1.2;const px=-uy,py=ux;for(const sd of [-1,1]){c.beginPath();c.moveTo(bx+px*co*sd,by+py*co*sd);c.lineTo(tx+px*co*sd,ty+py*co*sd);c.stroke()}
 const n=Math.max(2,Math.ceil(len/110));for(let i=1;i<n;i++){const x=bx+(tx-bx)*i/n,y=by+(ty-by)*i/n;if(kInV(x,y))pylonN(c,x,y,co+3)}
 const cap=o.T.cap;for(const ch of o.ch){if(ch.u<.03||ch.u>1.97||Math.abs(ch.u-1)<.03)continue;const [x,y]=kLiftPos(o,ch.u);if(!kInV(x,y,30))continue;const k={r:ch.r.map(f=>({col:f.col}))};c.save();c.translate(x,y);c.rotate(Math.sin(ch.u*40+t*.8)*.04);gondola(c,k,cap);c.restore()}
 }}
// Gebäude
function kDrawBuildings(add,t){const V=KVOR;
 // Kassa
 const K=V.kassa;add(K.y,c=>kKassaDraw(c,K.x,K.y));
 if(KG.b.kiosk)add(K.y+8,c=>kKioskDraw(c,K.x+38,K.y+8,t));
 // Lift-Stationen
 for(const L of V.lifts){const s=KG.l[L.id],bau=KG.bau.find(b=>b.lift===L.id||b.k==='lift'&&b.id===L.id);
  if(bau){add(L.b[1]+20,c=>kSite(c,L.b[0],L.b[1]+10,60,t));add(L.t[1]+20,c=>kSite(c,L.t[0],L.t[1]+10,50,t));continue}
  if(!s.on)continue;
  if(L.typ==='teller'||s.typ==='teller'){add(L.b[1]+12,c=>{stationN(c,L.b[0]+14,L.b[1],t);kBrkSign(c,L,t)});add(L.t[1]+12,c=>stationN(c,L.t[0]+14,L.t[1],t))}
  else{const co=KLT[s.typ].co;add(L.b[1]+22,c=>{liftStation(c,L.b[0],L.b[1],co,true);kBrkSign(c,L,t)});add(L.t[1]+18,c=>{liftStation(c,L.t[0],L.t[1],co,false);kSign(c,L.t[0],L.t[1]-36,'BERGSTATION','#fff','#2b3a55',5.5)})}}
 // Sonnalm
 if(KG.b.hut)add(V.hut.y,c=>{kHutDraw(c,V.hut.x,V.hut.y,t);kSign(c,V.hut.x,V.hut.y-56,'SONNALM','#8f5a34','#fff',6)});else if(KG.bau.find(b=>b.id==='hut'))add(V.hut.y,c=>kSite(c,V.hut.x,V.hut.y,64,t));
 // Kinderland
 const KL=V.kinder;if(KG.b.kinder){add(KL.y-60,c=>kKidBack(c,t));add(KL.y+40,c=>kKidCarpet(c,t));add(KL.y+64,c=>kKidFront(c,t))}else if(KG.bau.find(b=>b.id==='kinder'))add(KL.y,c=>kSite(c,KL.x,KL.y+10,90,t));
 // Skischule
 const SC=V.school;if(KG.b.school)add(SC.y,c=>kSchoolDraw(c,SC.x,SC.y,t));else if(KG.bau.find(b=>b.id==='school'))add(SC.y,c=>kSite(c,SC.x,SC.y,46,t));
 // Garage + Bergwacht
 if(KG.b.raupe)add(V.garage.y+8,c=>kGarage(c,V.garage.x,V.garage.y,t));
 if(KG.b.bw)add(1426,c=>kBwHut(c,808,1426,t));
 // Gasthof
 const H=V.hotel;if(KG.hotel)add(H.y,c=>kHotelDraw(c,H,t));else if(KG.bau.find(b=>b.id==='hotel'))add(H.y,c=>{chalet(c,H.x,H.y,H.w,H.h,H.k);kSite(c,H.x,H.y+6,80,t,1)});
 // Stufen-Baustelle (Waldabfahrt): Holzfäller
 const sb=KG.bau.find(b=>b.k==='stage');if(sb&&sb.st===3){const p=KW.pmap.wald;for(const fr of [.3,.6]){const q=p.d[Math.floor(p.d.length*fr)];add(q[1],c=>kSite(c,q[0],q[1],50,t))}}
}
function kHutDraw(c,x,y,t){let hp={x:0,y:0};try{hp=hutPos()}catch(e){}c.save();c.translate(x-hp.x,y-hp.y);try{hut(c,t)}catch(e){}c.restore()}
function kBrkSign(c,L,t){const s=KG.l[L.id];if(!s.brk)return;const x=L.b[0],y=L.b[1]-(L.typ==='teller'?24:44);kSign(c,x,y,'⚠️ STÖRUNG','#e8504a','#fff',6.5);
 // Liftwart / Techniker an der Station
 const sw=Math.sin(t*6)*.6;personN(c,{x:x+18,y:L.b[1]+16,st:'walk',col:s.brk.lw?'#f2a63b':'#5b6578'},t);c.fillStyle='#ffd84d';if(sw>0){c.beginPath();c.arc(x+22,L.b[1]+2,1.6,0,7);c.fill()}}
function kKassaDraw(c,x,y){const nt=kBright()<.5;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+4,y+3,32,5,0,0,7);c.fill();c.fillStyle='#e9e1d2';c.fillRect(x-26,y-24,52,26);c.fillStyle='#d6cbb7';c.fillRect(x+10,y-24,16,26);c.fillStyle='#c98a5a';c.fillRect(x-26,y-24,52,6);
 for(const q of [-20,-6,8]){c.fillStyle=nt?'#ffd98a':'#a8dcf5';c.fillRect(q+x,y-15,10,9);kWin(q+x,y-15,10,9);c.fillStyle='#8f5a34';c.fillRect(q+x-1,y-6,12,1.6)}
 c.fillStyle='#d8433d';c.beginPath();c.moveTo(x-31,y-23);c.lineTo(x-22,y-36);c.lineTo(x+22,y-36);c.lineTo(x+31,y-23);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-27,y-26);c.lineTo(x-21,y-34);c.lineTo(x+21,y-34);c.lineTo(x+27,y-26);c.closePath();c.fill();
 kSign(c,x,y-44,'🎫 KASSA','#2b3040','#fff',6);
 // Preistafel
 c.fillStyle='#2b3040';c.beginPath();c.roundRect(x-48,y-22,18,16,1.5);c.fill();c.fillStyle='#fff';c.font='700 3.2px Fredoka,sans-serif';c.textAlign='center';c.fillText('TAGESKARTE',x-39,y-17);c.font='700 4.6px Fredoka,sans-serif';c.fillStyle='#ffd84d';c.fillText(KG.price.ticket+' €',x-39,y-11.5);c.fillStyle='#5d667a';c.fillRect(x-40,y-6,1.4,8)}
function kKioskDraw(c,x,y,t){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+2,y+2,14,3,0,0,7);c.fill();c.fillStyle='#8f5a34';c.fillRect(x-11,y-12,22,13);c.fillStyle='#6e4426';c.fillRect(x+4,y-12,7,13);c.fillStyle='#ffe2a8';c.fillRect(x-9,y-9,12,5);
 for(let i=0;i<5;i++){c.fillStyle=i%2?'#fff':'#e8504a';c.beginPath();c.moveTo(x-13+i*5.2,y-12);c.lineTo(x-13+i*5.2+5.2,y-12);c.lineTo(x-13+i*5.2+5.2,y-16);c.lineTo(x-13+i*5.2,y-16);c.fill()}
 c.fillStyle='#fff';c.fillRect(x-13,y-18,26,2);kSign(c,x,y-23,'KIOSK','#e8504a','#fff',4.6);hSmoke(c,x+8,y-20,t,2)}
function kSchoolDraw(c,x,y,t){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+3,y+3,24,4,0,0,7);c.fill();
 c.fillStyle='#f3e9d8';c.fillRect(x-18,y-18,36,19);c.fillStyle='#e0d2bb';c.fillRect(x+8,y-18,10,19);c.fillStyle='#a8dcf5';c.fillRect(x-14,y-13,8,7);kWin(x-14,y-13,8,7);c.fillStyle='#5a3418';c.fillRect(x-2,y-11,7,12);
 c.fillStyle='#d8433d';c.beginPath();c.moveTo(x-22,y-17);c.lineTo(x,y-31);c.lineTo(x+22,y-17);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-18,y-19);c.lineTo(x,y-30);c.lineTo(x+4,y-28);c.lineTo(x-12,y-18);c.closePath();c.fill();
 kSign(c,x,y-36,'⛷️ SKISCHULE','#d8433d','#fff',5.2);
 // Helmregal und Fahne
 c.fillStyle='#8f5a34';c.fillRect(x+21,y-8,10,1.4);for(let i=0;i<3;i++){c.fillStyle=['#e8504a','#3a78d0','#f2c53b'][i];c.beginPath();c.arc(x+23+i*3.2,y-9.4,1.4,Math.PI,0);c.fill()}
 c.fillStyle='#8a93a5';c.fillRect(x-28,y-30,1,30);const w=Math.sin(t*3)*1.2;c.fillStyle='#d8433d';c.beginPath();c.moveTo(x-27,y-29);c.lineTo(x-18,y-27+w);c.lineTo(x-27,y-24);c.fill();
 // Flocki als Maskottchen
 c.save();c.translate(x-38,y+2);c.scale(.13,.13);try{flkDraw(c,t,0)}catch(e){}c.restore()}
function kKidBack(c,t){const K=KVOR.kinder;c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.ellipse(K.x,K.y,K.rx,K.ry,0,0,7);c.fill();
 for(let a=Math.PI*1.02;a<Math.PI*1.98;a+=.13){const x=K.x+Math.cos(a)*K.rx,y=K.y+Math.sin(a)*K.ry;c.fillStyle=['#e8504a','#f2c53b','#3a78d0','#6cc07a'][Math.round(a*7.7)%4];c.fillRect(x-.9,y-7,1.8,8)}
 c.strokeStyle='rgba(60,60,80,.45)';c.lineWidth=.6;c.beginPath();for(let a=Math.PI*1.02;a<Math.PI*1.98;a+=.05){const x=K.x+Math.cos(a)*K.rx,y=K.y+Math.sin(a)*K.ry-5;a<Math.PI*1.03?c.moveTo(x,y):c.lineTo(x,y)}c.stroke();
 const x=96,y=1268;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+3,y+2,18,4,0,0,7);c.fill();c.fillStyle='#f6c6d8';c.fillRect(x-14,y-16,28,18);c.fillStyle='#e6a6be';c.fillRect(x+4,y-16,10,18);c.fillStyle='#a8dcf5';c.fillRect(x-10,y-11,7,7);kWin(x-10,y-11,7,7);c.fillStyle='#8a4a2e';c.fillRect(x,y-9,5,11);
 c.fillStyle='#7d5bd0';c.beginPath();c.moveTo(x-18,y-15);c.lineTo(x,y-30);c.lineTo(x+18,y-15);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-14,y-17);c.lineTo(x,y-29);c.lineTo(x+4,y-26);c.lineTo(x-10,y-16);c.closePath();c.fill();
 kSign(c,K.x,K.y-78,'⭐ KINDERLAND','#f2a63b','#fff',6);
 for(const [bx,by,co] of [[180,1272,'#e8504a'],[196,1302,'#3a78d0'],[172,1340,'#f2a63b']]){c.strokeStyle=co;c.lineWidth=2.2;c.beginPath();c.arc(bx,by,8,Math.PI,0);c.stroke()}}
function kKidCarpet(c,t){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.moveTo(124,1352);c.lineTo(140,1258);c.lineTo(150,1258);c.lineTo(134,1352);c.fill();
 c.fillStyle='#5aa7e6';c.beginPath();c.moveTo(118,1350);c.lineTo(132,1256);c.lineTo(142,1256);c.lineTo(128,1350);c.closePath();c.fill();
 c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=.5;const o=(t*.11)%1;for(let i=0;i<10;i++){const u=(i/10+o)%1;c.beginPath();c.moveTo(118+u*14,1350-u*94);c.lineTo(128+u*14,1350-u*94);c.stroke()}}
function kKidFront(c,t){c.fillStyle='rgba(190,230,255,.45)';c.strokeStyle='rgba(60,120,190,.8)';c.lineWidth=.6;c.beginPath();c.moveTo(116,1350);c.lineTo(130,1256);c.lineTo(144,1256);c.lineTo(130,1350);c.closePath();c.fill();c.stroke();
 c.strokeStyle='rgba(60,120,190,.6)';for(let i=1;i<8;i++){const u=i/8;c.beginPath();c.moveTo(116+u*14,1350-u*94);c.lineTo(130+u*14,1350-u*94);c.stroke()}
 kSign(c,96,1366,'ZAUBERTEPPICH','#5aa7e6','#fff',5);
 c.save();c.translate(212,1332);c.scale(.2,.2);try{flkDraw(c,t,0)}catch(e){}c.restore();
 const b=Math.sin(t*2)*.8;c.fillStyle='#2b3040';c.beginPath();c.ellipse(80,1300+b,4,6,0,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.ellipse(80,1301+b,2.6,4.4,0,0,7);c.fill();c.fillStyle='#f2a63b';c.fillRect(79,1295+b,2,1.3)}
function kGarage(c,x,y,t){const out=KW.groom&&KW.groom.st!=='home';c.fillStyle='rgba(110,140,180,.28)';c.beginPath();c.ellipse(x+4,y+10,30,5,0,0,7);c.fill();
 c.fillStyle='#b9b2a6';c.fillRect(x-26,y-20,52,28);c.fillStyle='#a39b8e';c.fillRect(x+12,y-20,14,28);c.fillStyle=out?'#2b3040':'#8a5a3c';c.fillRect(x-14,y-12,24,20);if(!out){c.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<5;i++)c.fillRect(x-14,y-10+i*4,24,.8)}
 c.fillStyle='#c0392b';c.beginPath();c.moveTo(x-31,y-18);c.lineTo(x,y-36);c.lineTo(x+31,y-18);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-27,y-20);c.lineTo(x,y-35);c.lineTo(x+4,y-33);c.lineTo(x-20,y-19);c.closePath();c.fill();
 kSign(c,x,y-14,'PISTENRAUPE','#2f6fb5','#fff',3.6);c.fillStyle=out&&Math.sin(t*8)>0?'#ffb02e':'#d9862a';c.beginPath();c.arc(x+20,y-24,1.6,0,7);c.fill()}
function kBwHut(c,x,y,t){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+2,y+3,16,3,0,0,7);c.fill();c.fillStyle='#f4ede2';c.fillRect(x-12,y-14,24,15);c.fillStyle='#d8433d';c.beginPath();c.moveTo(x-15,y-13);c.lineTo(x,y-24);c.lineTo(x+15,y-13);c.closePath();c.fill();c.fillStyle='#fff';c.fillRect(x-14,y-15,28,2);
 c.fillStyle='#d8433d';c.fillRect(x-2,y-11,4,9);c.fillRect(x-5.5,y-8,11,3);kSign(c,x,y-28,'BERGWACHT','#d8433d','#fff',4.4);if(!KW.res){kSled(c,{x:x+24,y:y+6,a:0,st:'park'},t)}}
function kHotelDraw(c,H,t){chalet(c,H.x,H.y,H.w,H.h,H.k);kSign(c,H.x,H.y-H.h-24,'GASTHOF SONNLEITEN ★★','#8f5a34','#fff',5.4);for(const [wx,wy] of chWin(H.x,H.y,H.w,H.h))kWin(wx,wy,6,6);
 const occ=KG.hOcc||0;if(kBright()<.6&&occ>0){}}
function kSite(c,x,y,w,t,noFence){const h=w*.5;if(!noFence){c.fillStyle='rgba(185,171,147,.55)';c.beginPath();c.ellipse(x,y,w*.55,h*.45,0,0,7);c.fill();try{kbFence(c,x-w/2,x+w/2,y+h*.4,t)}catch(e){}}
 // Container, Kran-Mast, Arbeiter
 c.fillStyle='#f2a63b';c.fillRect(x-w*.4,y-8,16,9);c.fillStyle='#d98a2a';c.fillRect(x-w*.4+11,y-8,5,9);c.fillStyle='#fff';c.fillRect(x-w*.4+2,y-6,5,3);
 c.strokeStyle='#e8b52a';c.lineWidth=1.2;c.beginPath();c.moveTo(x+w*.25,y);c.lineTo(x+w*.25,y-36);c.lineTo(x-w*.05,y-36);c.moveTo(x+w*.25,y-36);c.lineTo(x+w*.35,y-36);c.stroke();c.strokeStyle='#5d667a';c.lineWidth=.5;const sw=Math.sin(t*1.3)*3;c.beginPath();c.moveTo(x+w*.02+sw,y-36);c.lineTo(x+w*.02+sw,y-20);c.stroke();c.fillStyle='#8f5a34';c.fillRect(x+w*.02+sw-4,y-20,8,3);
 const ph=t*1.6;personN(c,{x:x-4+Math.sin(ph)*5,y:y+4,st:'walk',col:'#f2a63b'},t);personN(c,{x:x+10,y:y+8,st:'walk',col:'#f2c53b'},t+1.3);
 kSign(c,x,y-44,'🚧 BAUSTELLE','#f2701f','#fff',5)}
function kCanSpray(c,t){for(const p of kCanPos()){if(!kInV(p.x,p.y))continue;for(let i=0;i<7;i++){const u=((t*.7+i/7+p.ph)%1),dir=-p.sd;const x=p.x+dir*(4+u*30)+Math.sin(u*9+i)*2,y=p.y-14-u*6+u*u*16;c.fillStyle='rgba(240,248,255,'+(.7*(1-u)).toFixed(2)+')';c.beginPath();c.arc(x,y,1.4+u*3,0,7);c.fill()}}}
// Nacht: abdunkeln, Fenster und Laternen
function kDrawNight(c){const b=kBright();if(b>=1)return;const a=(1-b)*.58;const vw=kViewW(),vh=kViewH();c.fillStyle='rgba(16,26,62,'+a.toFixed(3)+')';c.fillRect(kZ.camX-10,kZ.camY-10,vw+20,vh+20);
 if(b<.75){const g=Math.min(1,(.75-b)*2.2);c.fillStyle='rgba(255,214,130,'+(.9*g).toFixed(2)+')';for(const w of KW.win){if(!kInV(w[0],w[1]))continue;c.fillRect(w[0],w[1],w[2],w[3])}if(KST.winS)for(const w of KST.winS){if(!kInV(w[0],w[1]))continue;c.fillRect(w[0],w[1],w[2],w[3])}
  // Laternen am Gehweg und an der Straße
  for(let x=96;x<=920;x+=82){kLamp(c,x,1466,g)}for(let x=-100;x<=1100;x+=120){kLamp(c,x,1554,g)}
  if(KW.groom&&KW.groom.st!=='home'){const R=KW.groom,a2=R.a;const gr=c.createRadialGradient(R.x+Math.cos(a2)*26,R.y+Math.sin(a2)*26,2,R.x+Math.cos(a2)*26,R.y+Math.sin(a2)*26,34);gr.addColorStop(0,'rgba(255,240,190,'+(.55*g)+')');gr.addColorStop(1,'rgba(255,240,190,0)');c.fillStyle=gr;c.beginPath();c.arc(R.x+Math.cos(a2)*26,R.y+Math.sin(a2)*26,34,0,7);c.fill()}
  for(const car of KW.cars){if(car.st==='park')continue;const a2=car.a;c.fillStyle='rgba(255,240,190,'+(.35*g)+')';c.beginPath();c.moveTo(car.x+Math.cos(a2)*14,car.y+Math.sin(a2)*14);c.lineTo(car.x+Math.cos(a2+.35)*48,car.y+Math.sin(a2+.35)*48);c.lineTo(car.x+Math.cos(a2-.35)*48,car.y+Math.sin(a2-.35)*48);c.fill()}}}
function kLamp(c,x,y,g){if(!kInV(x,y))return;const gr=c.createRadialGradient(x,y+6,1,x,y+10,30);gr.addColorStop(0,'rgba(255,226,150,'+(.42*g).toFixed(2)+')');gr.addColorStop(1,'rgba(255,226,150,0)');c.fillStyle=gr;c.beginPath();c.ellipse(x,y+12,30,16,0,0,7);c.fill();c.fillStyle='rgba(255,236,170,'+(.95*g).toFixed(2)+')';c.beginPath();c.arc(x,y-1,2.2,0,7);c.fill()}
// Wetter: Schneefall, Sturm
function kDrawWeather(c){const w=KG.wx;if(w!=='neuschnee'&&w!=='sturm')return;if(KG.t<6||KG.t>22)return;const vw=kViewW(),vh=kViewH(),n=w==='sturm'?90:60,T0=KW.T;c.fillStyle='rgba(255,255,255,.85)';
 for(let i=0;i<n;i++){const sx=((i*97.3+T0*(w==='sturm'?70:14))%(vw+40))-20,sy=((i*57.7+T0*(w==='sturm'?30:22)+(i%7)*13)%(vh+40))-20;c.beginPath();c.arc(kZ.camX+sx,kZ.camY+sy,w==='sturm'?.9:1.2,0,7);c.fill()}}

// ===== Leinwand, Kamera, Eingabe, Schleife =====
function kCanvas(){let cv=document.getElementById('kc');if(!cv){cv=document.createElement('canvas');cv.id='kc';cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:2;display:none;touch-action:none';document.body.appendChild(cv);kInput(cv)}kZ.cv=cv;kZ.c=cv.getContext('2d');kResize();return cv}
function kResize(){const cv=kZ.cv;if(!cv)return;const perf=typeof SET!=='undefined'&&SET.perf;kZ.dpr=Math.min(window.devicePixelRatio||1,perf?1.5:2.4);kZ.cw=innerWidth;kZ.ch=innerHeight;cv.width=Math.round(kZ.cw*kZ.dpr);cv.height=Math.round(kZ.ch*kZ.dpr);if(KVOR)kClamp()}
addEventListener('resize',()=>{if(KON){kResize();kStaticMaybe()}});
let kSTo=0;function kStaticMaybe(){clearTimeout(kSTo);kSTo=setTimeout(()=>{if(!KON)return;const r=kStaticRes();if(Math.abs(r-KST.rs)/KST.rs>.18)kBuildStatic()},350)}
function kZoomAt(sx,sy,f){const wx=kZ.camX+sx/kZ.S,wy=kZ.camY+sy/kZ.S,b=KVOR.bounds;const minS=Math.max(kZ.cw/(b.x1-b.x0),.34);kZ.S=kcl(kZ.S*f,minS,2.7);kZ.camX=wx-sx/kZ.S;kZ.camY=wy-sy/kZ.S;kClamp();kStaticMaybe()}
function kInput(cv){const P=new Map();let drag=null,pin=null,moved=0,t0=0;
 cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});if(P.size===1){drag={x:e.clientX,y:e.clientY,cx:kZ.camX,cy:kZ.camY};moved=0;t0=performance.now()}if(P.size===2){const [a,b]=[...P.values()];pin={d:Math.hypot(a.x-b.x,a.y-b.y),S:kZ.S};drag=null;moved=1}});
 cv.addEventListener('pointermove',e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(P.size===2&&pin){const [a,b]=[...P.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;kZoomAt(mx,my,pin.S*d/pin.d/kZ.S);return}
  if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)moved=1;kZ.camX=drag.cx-dx/kZ.S;kZ.camY=drag.cy-dy/kZ.S;kClamp()}});
 const up=e=>{const had=P.has(e.pointerId);P.delete(e.pointerId);if(P.size<2)pin=null;if(had&&P.size===0){if(!moved&&performance.now()-t0<450)kTap(e.clientX,e.clientY);drag=null}};
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('wheel',e=>{e.preventDefault();kZoomAt(e.clientX,e.clientY,e.deltaY<0?1.12:1/1.12)},{passive:false})}
function kTap(sx,sy){const x=kZ.camX+sx/kZ.S,y=kZ.camY+sy/kZ.S;if(KW.open){kClose();return}const h=kHit(x,y);if(h)kOpenInfo(h)}
function kHit(x,y){const V=KVOR,hit=[];const d=(a,b)=>Math.hypot(x-a,y-b);
 for(const L of V.lifts){if(!KG.l[L.id].on&&!KG.bau.find(b=>b.lift===L.id))continue;if(d(L.b[0],L.b[1])<40||d(L.t[0],L.t[1]+6)<34)hit.push({k:'l:'+L.id,d:0});
  // Seil antippen
  const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(KG.l[L.id].on&&d(L.b[0]+dx*u,L.b[1]+dy*u)<14)hit.push({k:'l:'+L.id,d:1})}
 if(d(V.kassa.x,V.kassa.y-14)<32)hit.push({k:'kas',d:0});if(KG.b.kiosk&&d(V.kassa.x+38,V.kassa.y)<16)hit.push({k:'kio',d:0});
 if(KG.b.hut&&d(V.hut.x,V.hut.y-12)<40)hit.push({k:'hut',d:0});
 if(KG.b.kinder&&Math.hypot((x-V.kinder.x)/V.kinder.rx,(y-V.kinder.y)/V.kinder.ry)<1.1)hit.push({k:'kid',d:0});
 if(KG.b.school&&d(V.school.x,V.school.y-12)<30)hit.push({k:'sch',d:0});
 if(KG.b.raupe&&d(V.garage.x,V.garage.y-10)<32)hit.push({k:'rau',d:0});
 if(KG.hotel&&d(V.hotel.x,V.hotel.y-14)<40)hit.push({k:'hot',d:0});
 for(const L of V.lots)if(KG.lots[L.id]&&x>L.x0&&x<L.x1&&y>L.y0-6&&y<L.y1+6)hit.push({k:'park',d:2});
 for(const p of KW.pistes)if(kPisteOpen(p)){for(let i=0;i<p.d.length;i+=4){const q=p.d[i];if(d(q[0],q[1])<q[2]){hit.push({k:'p:'+p.id,d:3});break}}}
 hit.sort((a,b)=>a.d-b.d);return hit[0]?hit[0].k:null}
// Schleife
function kLoop(n){if(!KON)return;KW.raf=requestAnimationFrame(kLoop);const dt=Math.min(.05,(n-(KW.last||n))/1000);KW.last=n;
 if(!KW.paused&&!KW.modal&&KG&&!KG.done){const sp=KW.speed||1;for(let i=0;i<sp;i++)kStep(dt)}
 KW.fa=(KW.fa||0)+dt;const fps60=typeof SET!=='undefined'&&SET.fps===60&&!SET.perf;if(fps60||KW.fa>=1/31-.004){KW.fa=0;kDraw();kHud()}if(KW.dirty)kUI();
 KW.svT=(KW.svT||0)+dt;if(KW.svT>20){KW.svT=0;kSave()}}

// ===== Bedienung im Karriere-Berg =====
function kCloneCSS(){if(document.getElementById('kcss'))return;const map=[['#sheet','#ksheet'],['#bar','#kbar'],['#pz','#kpz'],['#ff','#kff'],['#rail','#krail'],['#toast','#ktoast'],['#lbar','#klbar'],['#abar','#kabar'],['#money','#kmoney'],['#day','#kday'],['#gst','#kgst'],['#ruf','#kruf']];
 const out=[];const re=new RegExp('('+map.map(m=>m[0].replace('#','#')).join('|')+')(?![\\w-])','g');const rep=s=>s.replace(re,m=>map.find(x=>x[0]===m)[1]);
 const walk=(rules,wrap)=>{for(const r of rules){if(r.cssRules&&r.media){walk(r.cssRules,x=>wrap('@media '+r.media.mediaText+'{'+x+'}'));continue}if(r.cssRules&&r.conditionText){walk(r.cssRules,x=>wrap('@supports '+r.conditionText+'{'+x+'}'));continue}
  if(r.selectorText&&re.test(r.selectorText)){re.lastIndex=0;out.push(wrap(rep(r.cssText)))}re.lastIndex=0}};
 for(const sh of document.styleSheets){let rules;try{rules=sh.cssRules}catch(e){continue}if(rules)walk(rules,x=>x)}
 const st=document.createElement('style');st.id='kcss';st.textContent=out.join('\n')+`
#kui{position:fixed;inset:0;z-index:3;pointer-events:none}#kui>*{pointer-events:auto}#kui[hidden]{display:none}
#ksheet{z-index:7}#ksheet.big{max-height:86vh}#ktoast{z-index:8}
#kabar{bottom:calc(48px + env(safe-area-inset-bottom,0px));flex-wrap:nowrap!important;gap:5px!important}#kabar .ch{flex:1 1 0!important;min-width:0;padding:3px 7px!important}#kabar .ch b{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}#kabar .ch .i{font-size:11px!important;color:#ffd84d}#kabar .ch.ok{background:#2e9e5b}
.kchip{display:inline-flex;align-items:center;gap:4px;background:var(--chip);border-radius:9px;padding:3px 8px;font-size:12.5px;font-weight:600;color:var(--tx);margin:0 4px 4px 0}
.kchip.g{background:#e3f5ea;color:#1d6e3e}.kchip.o{background:#fff0dc;color:#b8480c}.kchip.b{background:#e1efff;color:#1e5fb0}.kchip.r{background:#fde4e2;color:#b8302b}
.kgoal{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--line);font-size:13.5px}.kgoal:first-of-type{border-top:0}
.kgoal .s{flex:none;width:46px;color:#e8a33a;font-weight:700}.kgoal .s i{opacity:.25;font-style:normal}.kgoal small{display:block;color:var(--mut);font-size:12px}.kgoal .ok{color:#2e9e5b;font-weight:600}
.kcard{border:1px solid var(--line);border-radius:14px;padding:9px 11px;margin:8px 0;display:flex;gap:10px;align-items:center}.kcard .ic{font-size:26px;flex:none;width:34px;text-align:center}.kcard .tx{flex:1;min-width:0}.kcard .tx b{display:block;font-size:15px}.kcard .tx small{display:block;color:var(--mut);font-size:12.5px;line-height:1.3}.kcard .tx .rq{color:#b8480c}.kcard .tx .rq.ok{color:#2e9e5b}
.kcard.done{opacity:.6}.kcard .bt{flex:none;text-align:right}.kcard .bt small{display:block;color:var(--mut);font-size:11px;margin-top:3px}
.kpr{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--line)}.kpr:first-of-type{border-top:0}.kpr .tx{flex:1;min-width:0}.kpr .tx b{display:block;font-size:14.5px}.kpr .tx small{display:block;color:var(--mut);font-size:12px}
.kpr .v{min-width:56px;text-align:center;font-weight:600;font-size:16px}.kpr button{width:36px;height:34px;border:0;border-radius:10px;background:var(--chip);color:var(--tx);font:600 20px Fredoka,sans-serif;cursor:pointer}
.kpr .hi{color:#e8504a}.kpr .lo{color:#2e9e5b}
.kbar2{height:8px;border-radius:5px;background:var(--line);overflow:hidden;margin-top:4px}.kbar2 i{display:block;height:100%;background:linear-gradient(90deg,#f2c53b,#e8a33a)}
.kbars{display:flex;align-items:flex-end;gap:3px;height:90px;margin:8px 0 2px}.kbars div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:1px;min-width:0}.kbars i{display:block;border-radius:3px 3px 0 0}.kbars small{font-size:9px;color:var(--mut);text-align:center}
.klg{display:flex;gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:13px}.klg:first-of-type{border-top:0}.klg .t{flex:none;color:var(--mut);font-size:11.5px;width:62px}
#krail button{position:relative}
.kneu h3{font-size:26px!important;line-height:1.15}
`;document.head.appendChild(st)}
function kUIbuild(){if(document.getElementById('kui'))return;kCloneCSS();const d=document.createElement('div');d.id='kui';d.hidden=true;
 d.innerHTML=`<div id="kbar"><div class="chip" id="kmoney"></div><div class="chip" id="kday"></div><div class="chip" id="kgst"></div><div class="chip" id="kruf"></div></div>
<button class="rb" id="kpz">⏸</button><button class="rb" id="kff">×1</button>
<div id="krail"><button data-k="ziel"><span>🎯</span>Ziele</button><button data-k="bau"><span>🔨</span>Bauen</button><button data-k="pre"><span>💰</span>Preise</button><button data-k="wer"><span>📣</span><b class="l2" style="font-weight:600">Ruf &amp;<br>Werbung</b></button><button data-k="sta"><span>📊</span>Statistik</button><button data-k="opt"><span>⚙️</span>Optionen</button></div>
<div id="kabar"></div><div id="klbar"><span class="lw"><span class="lt"></span><span class="li">📖</span><span class="lx">Willkommen</span></span><span class="lk">›</span></div><div id="ksheet"></div><div id="ktoast"></div>`;
 document.body.appendChild(d);
 d.querySelectorAll('#krail button').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(KW.open===k){kClose();return}kOpen(k)});
 document.getElementById('kpz').onclick=()=>{KW.paused=!KW.paused;kHud(1)};
 document.getElementById('kff').onclick=()=>{KW.speed=KW.speed>=3?1:KW.speed+1;kHud(1)};
 document.getElementById('klbar').onclick=()=>kOpen('log');
 document.getElementById('kmoney').onclick=()=>kOpen('sta','fin');document.getElementById('kday').onclick=()=>kOpen('sta','heu');document.getElementById('kgst').onclick=()=>kOpen('sta','gst');document.getElementById('kruf').onclick=()=>kOpen('ziel','st');
 document.getElementById('ksheet').addEventListener('click',kSheetClick)}
let kTT=0;function kToast(m,ms=2600){const t=document.getElementById('ktoast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(kTT);kTT=setTimeout(()=>t.classList.remove('on'),ms)}
function kUIdirty(){KW.dirty=1}
function kOpen(k,tab){KW.open=k;if(tab)KW.tab=tab;else if(k!=='inf')KW.tab=null;KW.dirty=1;kUI()}
function kClose(){KW.open=null;KW.inf=null;KW.dirty=1;kUI()}
// --- obere Leiste ---
let kHudS='';function kHud(force){if(!KG)return;const g=KW.folks.filter(f=>!f.ins&&f.st!=='gone').length;const st=kStars(),sc=kScore(),wi=KG.wx==='sonne'&&kBright()<.35?'🌙':KWI[KG.wx];
 const sea=KVOR.seasons,sn=KG.done?Math.min(kSeaN(),sea):kSeaN(),dd=KG.done&&kSeaN()>sea?KSL:kSeaD();const day=`<b>📅 ${KWN[kWd()]} • Woche ${kWeek()}<span style="opacity:.6">/4</span> ${wi}</b><small>Saison ${sn}${sea>1?' von '+sea:''} · ${kh(KG.t)}</small><span class="sbar"><i style="width:${Math.round((dd-1+Math.min(1,KG.t/24))/KSL*100)}%"></i></span>`;
 const mon=`<b>${kfmt(KG.money)}</b><small>${KG.money<0?'Kredit · bis −'+knum(kCredit()):'Heute '+(kTodayRes()>=0?'+':'')+knum(kTodayRes())+' €'}</small>`;
 const gs=`<b>👥 ${g}</b><small>😊 ${Math.round(KG.ruf)} %</small>`,rf=`<b>🏆 ${sc}</b><small>${'★'.repeat(st)}<span style="opacity:.35">${'★'.repeat(5-st)}</span></small>`;
 const s=day+mon+gs+rf+(KW.paused?1:0)+KW.speed;if(s===kHudS&&!force)return;kHudS=s;
 const $=id=>document.getElementById(id);$('kmoney').innerHTML=mon;$('kmoney').classList.toggle('neg',KG.money<0);$('kday').innerHTML=day;$('kgst').innerHTML=gs;$('kruf').innerHTML=rf;
 $('kpz').textContent=KW.paused?'▶':'⏸';$('kff').textContent='×'+KW.speed;kGoalBar();kLogBar()}
function kTodayRes(){let i=0;for(const k in KG.inc)if(k!=='bau')i+=KG.inc[k];return i}
let kGBs='';function kGoalBar(){const el=document.getElementById('kabar');if(!el)return;const h=KVOR.goals.map((g,i)=>{const ok=KG.goals[g.k];const pr=g.prog?g.prog():'';return `<button class="ch ${ok?'ok':''}" data-g="${i}"><span class="i">${ok?'✓':'★'.repeat(i+1)}</span><span style="min-width:0"><b>${g.sh}</b><small>${ok?'geschafft':pr||(i===0?'Pflicht':'offen')}</small></span></button>`}).join('');
 if(h!==kGBs){kGBs=h;el.innerHTML=h;el.querySelectorAll('.ch').forEach(b=>b.onclick=()=>kOpen('ziel','zi'))}el.classList.toggle('off',!!KW.open)}
let kLBs='';function kLogBar(){const el=document.getElementById('klbar');if(!el)return;const e=KG.lg[0];const s=e?(kh(e.t)+e.ic+e.tx):'';if(s===kLBs)return;kLBs=s;el.querySelector('.lt').textContent=e?kh(e.t):'';el.querySelector('.li').textContent=e?e.ic:'📖';el.querySelector('.lx').textContent=e?e.tx:'Noch keine Einträge';if(KW.lgNew){el.classList.remove('nw');void el.offsetWidth;el.classList.add('nw');KW.lgNew=0}}
// --- Fenster ---
function kUI(){KW.dirty=0;const sh=document.getElementById('ksheet');if(!sh)return;const o=KW.open;
 if(KW.neu&&!o){KW.open='neu'}
 const k=KW.open;if(!k){sh.classList.remove('on');sh.innerHTML='';kGoalBar();return}
 let h='';try{h=({bau:kBauHTML,pre:kPreHTML,wer:kWerHTML,sta:kStaHTML,ziel:kZielHTML,opt:kOptHTML,inf:kInfHTML,neu:kNeuHTML,log:kLogHTML,sea:kSeaHTML,end:kEndHTML,kre:kStaHTML})[k]()}catch(e){h='<h3>Fehler<a data-a="x">✕</a></h3><p class="hint">'+kesc(e.message)+'</p>';console.error(e)}
 const top=sh.dataset.k===k+(KW.tab||'')?sh.scrollTop:0;sh.innerHTML=h;sh.dataset.k=k+(KW.tab||'');sh.classList.add('on');sh.classList.toggle('big',k==='bau'||k==='end'||k==='sta'||k==='ziel');sh.scrollTop=top;kGoalBar()}
function kHead(t,tabs){return `<div class="bhead"><h3>${t}<a data-a="x">✕</a></h3>${tabs?`<div class="btab">${tabs.map(([id,ic,n])=>`<button data-a="tab" data-v="${id}" class="${KW.tab===id?'on':''}"><span>${ic}</span>${n}</button>`).join('')}</div>`:''}</div>`}
function kSheetClick(e){const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v;
 if(a==='x'){if(KW.open==='neu'){KW.neu=null}kClose();return}
 if(a==='tab'){KW.tab=v;kUI();return}
 if(a==='buy'){kBuy(v);return}
 if(a==='pr'){const [k,d]=v.split('|');kPrice(k,+d);return}
 if(a==='cmp'){kCmp(v);return}
 if(a==='go'){kOpen(v.split('|')[0],v.split('|')[1]);return}
 if(a==='ovh'){kOverhaul(v);return}
 if(a==='can'){KG.canAuto=KG.canAuto===0?1:0;kUI();return}
 if(a==='endnow'){if(KW.endAsk){KG.done=1;kSave();kBergEnd(0)}else{KW.endAsk=1;kUI()}return}
 if(a==='leave'){kLeave('map');return}
 if(a==='title'){kLeave('title');return}
 if(a==='restart'){if(KW.rsAsk){kRestartBerg()}else{KW.rsAsk=1;kUI()}return}
 if(a==='neuok'){KW.neu=null;kClose();return}
 if(a==='seaok'){KW.modal=0;kClose();return}
 if(a==='endmap'){kLeave('map');return}
 if(a==='look'){const [x,y]=v.split(',').map(Number);kLook(x,y);kClose();return}}
function kLook(x,y,S){kZ.S=S||Math.max(kZ.S,1.2);kZ.camX=x-kViewW()/2;kZ.camY=y-kViewH()/2;kClamp()}
// --- Bauen ---
function kCosts(){const V=KVOR,lf=KPK('lift')?.9:1,sf=KPK('schnee')?.85:1;return {tl:Math.round(V.lifts[0].cost*lf),s4:Math.round(16000*lf),lgS:Math.round(3500*lf),lgT:Math.round(800*lf),can:Math.round(V.cannons.cost*sf),raupe:5000,kiosk:1500,kinder:V.kinder.cost,school:V.school.cost,hut:V.hut.cost,hotel:V.hotel.cost,po:4000,paved:4000,bus:3000,lw:2500,bw:4000,st2:Math.round(V.stageInfo[2].cost*lf),st3:V.stageInfo[3].cost}}
function kReq(r){const [k,a]=r;if(k==='tl')return !!KG.l.tl.on;if(k==='ruf')return KG.ruf>=a;if(k==='gst')return KG.gT>=a;if(k==='stars')return kStars()>=a;if(k==='ses4')return KG.l.ses.typ==='s4';return false}
function kBuildItems(){const C=kCosts(),V=KVOR,st=KG.stage,l=KG.l,b=KG.b,bau=id=>KG.bau.find(x=>x.id===id||x.lift===id);
 const I=[];const add=(tab,o)=>{o.tab=tab;I.push(o)};
 // Ausbau
 for(const s of [2,3]){const S=V.stageInfo[s];const rq=S.req.map(r=>({t:r[r.length-1],ok:kReq(r)}));add('aus',{id:'st'+s,ic:s===2?'🚡':'🌲',n:'Ausbau Stufe '+s+': '+S.n,d:S.d,c:s===2?C.st2:C.st3,days:kBauDays(S.days),done:st>=s,bau:KG.bau.find(x=>x.k==='stage'&&x.st===s),lock:st<s-1?'erst Stufe '+(s-1):rq.some(r=>!r.ok)?'Voraussetzungen fehlen':'',rq})}
 // Lifte
 add('lif',{id:'tl',ic:'🎿',n:'Tellerlift am Übungshang',d:'Kleiner Schlepplift für Anfänger und Kinder. Ohne ihn kommt niemand auf den Hang.',c:C.tl,days:0,done:!!l.tl.on});
 add('lif',{id:'lgT',ic:'🟡',n:'Mehr Teller',d:'Dichter hängende Teller – mehr Gäste pro Stunde am Übungshang.',c:C.lgT,done:(l.tl.lg||0)>=2,lock:!l.tl.on?'erst Tellerlift':'',lv:(l.tl.lg||0)+' / 2'});
 add('lif',{id:'s4',ic:'🚡',n:'4er-Sessel statt 2er',d:'Doppelt so viele Plätze je Sessel – die Schlange an der Talstation wird kürzer.',c:C.s4,days:kBauDays(1),done:l.ses.typ==='s4',bau:bau('s4'),lock:st<2||!l.ses.on?'erst Stufe 2':''});
 add('lif',{id:'lgS',ic:'💺',n:'Mehr Sessel',d:'Zusätzliche Sessel am Seil – mehr Gäste pro Stunde.',c:C.lgS,done:(l.ses.lg||0)>=2,lock:st<2||!l.ses.on?'erst Stufe 2':'',lv:(l.ses.lg||0)+' / 2'});
 // Piste
 add('pis',{id:'raupe',ic:'🚜',n:'Pistenraupe mit Garage',d:'Präpariert nachts alle offenen Pisten. Ohne Raupe werden die Pisten immer schlechter.',c:C.raupe,done:!!b.raupe});
 add('pis',{id:'can',ic:'❄️',n:'Schneekanonen',d:'Beschneien nachts den Sonnenhang und den Übungshang, wenn der Schnee knapp wird. Strom kostet je Nacht.',c:C.can,done:!!b.cannons,lock:st<2?'erst Stufe 2':''});
 // Gastro und mehr
 add('gas',{id:'kiosk',ic:'🌭',n:'Kiosk an der Kassa',d:'Würstel, Tee und Kakao – die einfachste Mittagspause.',c:C.kiosk,days:0,done:!!b.kiosk});
 add('gas',{id:'kinder',ic:'⭐',n:'Kinderland mit Zauberteppich',d:'Besonderes Gebäude: bunter Kinderbereich mit Förderband, Bögen und Flocki. Familien kommen lieber und sind zufriedener.',c:C.kinder,days:kBauDays(V.kinder.days),done:!!b.kinder,bau:bau('kinder')});
 add('gas',{id:'school',ic:'⛷️',n:'Skischule',d:'Skikurse am Übungshang: Anfänger lernen in kleinen Gruppen hinter der Skilehrerin.',c:C.school,days:kBauDays(V.school.days),done:!!b.school,bau:bau('school')});
 add('gas',{id:'hut',ic:'🛖',n:'Sonnalm',d:'Hütte am Sonnenhang mit Sonnenterrasse. Mittagessen bringt viel Geld.',c:C.hut,days:kBauDays(V.hut.days),done:!!b.hut,bau:bau('hut'),lock:st<2?'erst Stufe 2':''});
 add('gas',{id:'hotel',ic:'🏨',n:'Gasthof im Dorf',d:'24 Zimmer: Hotelgäste kommen ohne Auto über den Zebrastreifen und bringen jede Nacht Geld.',c:C.hotel,days:kBauDays(V.hotel.days),done:!!KG.hotel,bau:bau('hotel'),lock:st<2?'erst Stufe 2':''});
 // Anreise
 add('anr',{id:'po',ic:'🅿️',n:'Parkplatz Ost',d:'28 weitere Stellplätze rechts der Kassa – ist der Parkplatz voll, drehen die Gäste um.',c:C.po,done:!!KG.lots.po});
 add('anr',{id:'paved',ic:'🛣️',n:'Parkplätze asphaltieren',d:'Kein Schotter mehr – sieht ordentlicher aus und bringt etwas Ansehen.',c:C.paved,done:!!KG.paved});
 add('anr',{id:'bus',ic:'🚌',n:'Skibus',d:'Morgens bringen 3 Busse bis zu 30 Gäste ohne Auto, nachmittags holen sie sie wieder ab.',c:C.bus,done:!!b.bus,up:'150 €/Tag'});
 // Personal
 add('per',{id:'lw',ic:'🔧',n:'Liftwart',d:'Repariert Störungen in kurzer Zeit. Ohne Liftwart kommt ein Techniker von außen (650 €, über 1 Stunde).',c:C.lw,done:!!b.lw,up:'130 €/Tag'});
 add('per',{id:'bw',ic:'⛑️',n:'Bergwacht',d:'Holt Verletzte mit dem Motorschlitten und Akja von der Piste. Ohne Bergwacht leidet der Ruf.',c:KPK('bw')?0:C.bw,done:!!b.bw,up:KPK('bw')?'Verein · ohne Lohn':'140 €/Tag'});
 return I}
function kBauHTML(){const tabs=[['aus','🏔️','Ausbau'],['lif','🚡','Lifte'],['pis','❄️','Piste'],['gas','🛖','Gastro'],['anr','🚗','Anreise'],['per','👷','Personal']];if(!KW.tab||!tabs.some(t=>t[0]===KW.tab))KW.tab='aus';
 const I=kBuildItems().filter(i=>i.tab===KW.tab);const open=I.filter(i=>!i.done),done=I.filter(i=>i.done);
 let h=kHead('🔨 Bauen',tabs)+`<p class="hint" style="margin:8px 0 2px">Kassa ${kfmt(KG.money)} · Kreditrahmen bis −${kfmt(kCredit())}</p>`;
 for(const i of open.concat(done))h+=kCardHTML(i);
 if(KW.tab==='pis'&&KG.b.cannons)h+=`<div class="row"><span>❄️ Schneekanonen automatisch nachts</span><button class="btn" data-a="can">${KG.canAuto===0?'Aus':'An'}</button></div>`;
 if(KW.tab==='aus')h+=`<p class="hint">Jede Stufe öffnet neue Pisten und lockt mehr Gäste an. Neue Stufen sprechen sich in ${KPK('name')?2:3} Tagen herum.</p>`;
 return h}
function kCardHTML(i){let btn='';if(i.done)btn=`<span class="kchip g">✓ ${i.lv?'voll':'gebaut'}</span>`;else if(i.bau)btn=`<span class="kchip o">🚧 im Bau<br>fertig ${kDayT(i.bau.d0+i.bau.days).split(' • ')[0]}</span>`;else if(i.lock)btn=`<button class="btn" disabled>${kfmt(i.c)}</button><small>${i.lock}</small>`;
 else{const ok=kCanPay(i.c);btn=`<button class="btn" data-a="buy" data-v="${i.id}" ${ok?'':'disabled'}>${i.c?kfmt(i.c):'gratis'}</button><small>${i.days?'Bauzeit '+i.days+(i.days===1?' Tag':' Tage'):'sofort'}${i.up?' · '+i.up:''}</small>`}
 const rq=i.rq&&!i.done?'<small>'+i.rq.map(r=>`<span class="rq ${r.ok?'ok':''}">${r.ok?'✓':'○'} ${r.t}</span>`).join(' · ')+'</small>':'';
 return `<div class="kcard ${i.done?'done':''}"><span class="ic">${i.ic}</span><span class="tx"><b>${i.n}${i.lv?' <span style="font-weight:400;color:var(--mut);font-size:13px">'+i.lv+'</span>':''}</b><small>${i.d}</small>${rq}</span><span class="bt">${btn}</span></div>`}
function kBuy(id){const I=kBuildItems().find(i=>i.id===id);if(!I||I.done||I.lock||I.bau)return;if(!kCanPay(I.c)){kToast('Zu wenig Geld – der Kreditrahmen reicht nicht.');return}
 const pay=()=>{KG.money-=I.c;KG.inc.bau=(KG.inc.bau||0);KG.cost.bau=(KG.cost.bau||0)+I.c;KG.seaBau=(KG.seaBau||0)+I.c};
 if(id==='st2'||id==='st3'){const s=+id[2];pay();kBauStart({k:'stage',st:s,n:'Ausbau Stufe '+s,days:I.days,lift:s===2?'ses':null,id:'st'+s})}
 else if(id==='tl'){pay();kBauStart({k:'lift',id:'tl',n:'Tellerlift',days:0})}
 else if(id==='lgT'||id==='lgS'){pay();const L=id==='lgT'?'tl':'ses';KG.l[L].lg=(KG.l[L].lg||0)+1;kLiftSetup(L);kLog('💺',(id==='lgT'?'Mehr Teller':'Mehr Sessel')+' eingebaut.')}
 else if(id==='s4'){pay();if(I.days>0){KG.bau.push({k:'up',id:'s4',lift:'ses',n:'4er-Sessel',d0:KG.day,days:I.days});kLog('🚧','Umbau auf 4er-Sessel – der Lift steht bis zum Morgen.');KG.l.ses.on=0}else kUp4()}
 else if(id==='raupe'||id==='can'||id==='kiosk'||id==='lw'||id==='bw'||id==='bus'){pay();KG.b[id==='can'?'cannons':id]=1;kLog('✅',I.n+' – gekauft.');if(id==='bus')kLog('🚌','Ab morgen fahren die Skibusse.')}
 else if(id==='kinder'||id==='school'||id==='hut'||id==='hotel'){pay();kBauStart({k:'b',id,n:I.n,days:I.days})}
 else if(id==='po'){pay();KG.lots.po=1;kLog('🅿️','Parkplatz Ost ist offen.')}
 else if(id==='paved'){pay();KG.paved=1}
 if(KG.t<13)KG.dem=kDemand();kSfx();kRebuild();kUI();kHud(1);kSave()}
function kUp4(){KG.l.ses.typ='s4';KG.l.ses.on=1;kLiftSetup('ses');kLog('🚡','Der Sonnenhang-Sessel ist jetzt ein 4er-Sessel.')}
function kSfx(){try{if(typeof sfx==='function')sfx('build',300)}catch(e){}}
// --- Preise ---
function kPreItems(){const F=KVOR.fair,b=KG.b;const I=[{k:'ticket',ic:'🎫',n:'Tageskarte',f:Math.round(kFairT()),min:5,max:80,st:1,sub:'Halbtag ab 12 Uhr: 60 % · Kinder: 50 %'},{k:'park',ic:'🅿️',n:'Parken',f:F.park,min:0,max:20,st:1}];
 I.push({k:'food',ic:'🍲',n:'Mittagsmenü',f:F.food,min:5,max:40,st:1,sub:b.hut?'Sonnalm · Kiosk-Snack: 55 %':'Kiosk-Snack: 55 % davon',hide:!b.hut&&!b.kiosk});
 I.push({k:'kids',ic:'⭐',n:'Kinderland Eintritt',f:F.kids,min:0,max:30,st:1,hide:!b.kinder});I.push({k:'school',ic:'⛷️',n:'Skikurs (2 Stunden)',f:F.school,min:5,max:80,st:1,hide:!b.school});I.push({k:'hotel',ic:'🏨',n:'Gasthof je Nacht',f:F.hotel,min:20,max:150,st:2,hide:!KG.hotel});
 return I.filter(i=>!i.hide)}
function kPreHTML(){let h=kHead('💰 Preise')+'<p class="hint" style="margin:8px 0 4px">Sonnleiten-Gäste achten stark auf den Preis. Fair heißt: so viel wie die Gegend gerade wert ist.</p>';
 for(const i of kPreItems()){const v=KG.price[i.k],r=v/Math.max(1,i.f);const cl=r>1.15?'hi':r<.9?'lo':'';const tx=r>1.3?'viel zu teuer':r>1.15?'zu teuer':r<.75?'sehr günstig':r<.9?'günstig':'fair';
  h+=`<div class="kpr"><span style="font-size:22px">${i.ic}</span><span class="tx"><b>${i.n}</b><small>fair ca. ${i.f} € · <span class="${cl}">${tx}</span>${i.sub?' · '+i.sub:''}</small></span><button data-a="pr" data-v="${i.k}|-${i.st}">−</button><span class="v">${v} €</span><button data-a="pr" data-v="${i.k}|${i.st}">+</button></div>`}
 return h}
function kPrice(k,d){const i=kPreItems().find(x=>x.k===k);if(!i)return;KG.price[k]=kcl(KG.price[k]+d,i.min,i.max);kUI();kHud(1)}
// --- Ruf & Werbung ---
const KCMP=[{id:'pla',ic:'🪧',n:'Plakate im Tal',d:'+8 % Gäste, etwas Ruf',c:600,days:5,eff:.08,ruf:.4},{id:'zei',ic:'📰',n:'Familien-Zeitung',d:'Mehr Familien, +10 % Gäste',c:1200,days:6,eff:.1,ruf:.5,ty:'fam'},{id:'sbv',ic:'🏂',n:'Snowboard-Video',d:'Mehr Snowboarder, +8 % Gäste',c:1500,days:5,eff:.08,ruf:.4,ty:'sb',st:2},{id:'rad',ic:'📻',n:'Radio Werbung',d:'+18 % Gäste, Ruf',c:2200,days:5,eff:.18,ruf:.8,st:2},{id:'onl',ic:'📱',n:'Online-Kampagne',d:'+24 % Gäste, mehr Ruf',c:3600,days:7,eff:.24,ruf:1.1,st:2}];
function kCmpCost(c){return Math.round(c.c*(KPK('wer')?.8:1)*(1+(KG.stage-1)*.35)/50)*50}
function kWerHTML(){const tabs=[['ruf','😊','Ruf'],['wer','📣','Werbung']];if(!KW.tab)KW.tab='ruf';let h=kHead('📣 Ruf & Werbung',tabs);
 if(KW.tab==='ruf'){const H=KG.hist.slice(-1)[0];h+=`<div class="kpi"><div><small>Ruf</small><b>${Math.round(KG.ruf)} %</b><div class="kbar2"><i style="width:${KG.ruf}%"></i></div></div><div><small>Gäste gestern zufrieden</small><b>${H&&H.sat!=null?H.sat+' %':'–'}</b></div></div>`;
  h+='<div class="bgh">Was die Gäste gerade sagen</div>'+kVoices().map(v=>`<div class="row"><span>${v[0]} ${v[1]}</span></div>`).join('');
  h+='<p class="hint">Der Ruf bewegt sich jeden Abend Richtung Zufriedenheit der Gäste. Wartezeiten, Preise, Pistenzustand, Essen und Kinderland zählen am meisten.</p>'}
 else{h+=`<p class="hint" style="margin:8px 0 4px">Werbung bringt für ein paar Tage mehr Gäste und etwas Ruf.${KPK('wer')?' Werbeprofi: 20 % günstiger.':''}</p>`;
  for(const c of KCMP){const run=KG.cmp.find(x=>x.id===c.id),lk=c.st&&KG.stage<c.st,cost=kCmpCost(c);h+=`<div class="kcard"><span class="ic">${c.ic}</span><span class="tx"><b>${c.n}</b><small>${c.d} · ${c.days} Tage</small></span><span class="bt">${run?`<span class="kchip g">läuft<br>bis ${KWN[(run.end-1)%7]}</span>`:lk?`<button class="btn" disabled>${kfmt(cost)}</button><small>ab Stufe ${c.st}</small>`:`<button class="btn" data-a="cmp" data-v="${c.id}" ${kCanPay(cost)?'':'disabled'}>${kfmt(cost)}</button>`}</span></div>`}}
 return h}
function kCmp(id){const c=KCMP.find(x=>x.id===id),cost=kCmpCost(c);if(!kCanPay(cost)||KG.cmp.find(x=>x.id===id))return;KG.money-=cost;KG.cost.wer=(KG.cost.wer||0)+cost;KG.seaWer=(KG.seaWer||0)+cost;KG.cmp.push({id,end:KG.day+c.days,eff:c.eff,ruf:c.ruf,ty:c.ty||null});kLog(c.ic,c.n+' läuft '+c.days+' Tage.');KG.dem=kDemand();kUI();kHud(1)}
function kVoices(){const out=[];const w=KW.lift&&KW.lift.ses?kWait('ses'):0,wt=KW.lift&&KW.lift.tl?kWait('tl'):0;const r=KG.price.ticket/kFairT();
 if(Math.max(w,wt)>15)out.push(['⏳','„Die Schlange am Lift ist viel zu lang!“']);if(r>1.15)out.push(['💸','„Die Tageskarte ist hier ganz schön teuer.“']);else if(r<.9)out.push(['💶','„So günstig – toll für Familien!“']);
 if(kPQavg()<60)out.push(['🧊','„Die Piste ist ganz zerfahren.“']);if(!KG.b.kinder)out.push(['👧','„Für die Kleinen gibt es hier nicht viel.“']);else out.push(['⭐','„Das Kinderland ist super!“']);
 if(!KG.b.hut&&!KG.b.kiosk)out.push(['🍽️','„Wo kann man hier etwas essen?“']);if(KG.rej>3)out.push(['🅿️','„Kein Parkplatz mehr frei – wir sind umgedreht.“']);if(KG.res.hurt&&!KG.b.bw)out.push(['⛑️','„Nach dem Unfall hat lange niemand geholfen.“']);
 if(KG.stage<2&&KG.gT>40)out.push(['🚡','„Ein richtiger Lift auf den Berg wäre schön.“']);if(!out.length)out.push(['😊','„Schöner Tag in Sonnleiten!“']);return out.slice(0,5)}
// --- Statistik ---
function kStaHTML(){const tabs=[['heu','📅','Heute'],['ver','📈','Verlauf'],['gst','👥','Gäste'],['fin','💶','Finanzen']];if(!KW.tab||!tabs.some(t=>t[0]===KW.tab))KW.tab='heu';let h=kHead('📊 Statistik',tabs);
 if(KW.tab==='heu'){const g=KG.gDay,inc=KG.inc;const L=[['tk','🎫 Tageskarten'],['pk','🅿️ Parken'],['food','🍲 Essen'],['kid','⭐ Kinderland'],['sch','⛷️ Skischule'],['hot','🏨 Gasthof']];let tot=0;for(const [k] of L)tot+=inc[k]||0;
  h+=`<div class="kpi"><div><small>Gäste heute</small><b>${g}</b>${KG.rej?`<i class="neg">${KG.rej} Autos abgewiesen</i>`:''}</div><div><small>Einnahmen heute</small><b>${kfmt(tot)}</b></div></div>`;
  h+=`<div class="wx wx2"><div><small>Heute</small>${KWI[KG.wx]} ${KWNM[KG.wx]}</div><div><small>Morgen</small>${KWI[KG.wxN]} ${KWNM[KG.wxN]}</div><div><small>Schnee</small>❄️ ${Math.round(KG.snow)} cm</div></div>`;
  h+='<div class="bgh">Einnahmen nach Quelle</div>'+L.filter(([k])=>inc[k]).map(([k,n])=>`<div class="row"><span>${n}</span><b>${kfmt(inc[k])}</b></div>`).join('')+(tot?'':'<p class="hint">Noch keine Einnahmen heute.</p>');
  h+='<div class="bgh">Lifte und Pisten</div>';for(const L2 of KVOR.lifts){if(!KG.l[L2.id].on)continue;h+=`<div class="row"><span>${L2.typ==='teller'?'🎿':'🚡'} ${L2.n}</span><b>Warten ${Math.round(kWait(L2.id))} Min.</b></div>`}
  for(const p of KW.pistes)if(kPisteOpen(p))h+=`<div class="row"><span>${p.col==='r'?'🔴':'🔵'} ${p.n}</span><b>Zustand ${Math.round(KG.pq[p.id])} %</b></div>`}
 if(KW.tab==='ver'){const H=KG.hist.slice(-14);const mx=Math.max(1,...H.map(x=>Math.max(x.inc,x.cost)));h+='<div class="bgh">Einnahmen 🟩 und Kosten 🟥 je Tag</div><div class="kbars">'+H.map(x=>`<div><i style="height:${Math.round(x.inc/mx*80)}px;background:#5fc27a"></i><i style="height:${Math.round(x.cost/mx*80)}px;background:#e8806f"></i><small>${KWN[(x.d-1)%7][0]}${KWN[(x.d-1)%7][1].toLowerCase()}</small></div>`).join('')+'</div>';
  const gm=Math.max(1,...H.map(x=>x.g));h+='<div class="bgh">Gäste je Tag</div><div class="kbars">'+H.map(x=>`<div><i style="height:${Math.round(x.g/gm*80)}px;background:#5aa7e6"></i><small>${x.g}</small></div>`).join('')+'</div>';
  if(!H.length)h+='<p class="hint">Nach dem ersten Tag erscheinen hier die Balken.</p>'}
 if(KW.tab==='gst'){const S=KG.sat,N={fam:'👨‍👩‍👧 Familien',anf:'🔰 Anfänger',pro:'⛷️ Profis',sb:'🏂 Snowboarder'};h+='<div class="bgh">Heute abgereiste Gäste · Zufriedenheit</div>';
  for(const k in N){const s=S[k];h+=`<div class="row"><span>${N[k]}</span><b>${s&&s.n?Math.round(s.s/s.n)+' % · '+s.n:'–'}</b></div>`}
  h+=`<div class="bgh">Ziel Familien</div><div class="row"><span>Tage mit Familien ≥ 75 % zufrieden</span><b>${Math.min(5,KG.famOK||0)} / 5</b></div><p class="hint">Familien mögen faire Preise, kurze Wartezeiten, das Kinderland und ein Mittagessen. Gezählt wird ein Tag ab 5 Familien-Gästen.</p>`}
 if(KW.tab==='fin'){const inc=KG.seaInc||0,cost=KG.seaCost||0;h+=`<div class="kpi"><div><small>Saison: Einnahmen</small><b>${kfmt(inc)}</b></div><div><small>Saison: laufende Kosten</small><b>${kfmt(cost)}</b></div><div><small>Betriebsergebnis</small><b class="${inc-cost>=0?'pos':'neg'}">${kfmt(inc-cost)}</b></div><div><small>Gebaut + Werbung</small><b>${kfmt((KG.seaBau||0)+(KG.seaWer||0))}</b></div></div>`;
  const L=KG.lastDay;if(L){h+='<div class="bgh">Kosten gestern</div>';const N={lift:'🚡 Lifte',kassa:'🎫 Kassa',hut:'🛖 Sonnalm',kinder:'⭐ Kinderland',school:'⛷️ Skischule',kiosk:'🌭 Kiosk',raupe:'🚜 Pistenraupe',can:'❄️ Schneekanonen (Strom)',lots:'🅿️ Parkplätze',bus:'🚌 Skibus',hotel:'🏨 Gasthof',lw:'🔧 Liftwart',bw:'⛑️ Bergwacht',zins:'🏦 Zinsen'};for(const k in L.c)h+=`<div class="row"><span>${N[k]||k}</span><b>${kfmt(L.c[k])}</b></div>`}
  h+=`<div class="bgh">Kredit</div><div class="row"><span>Kreditrahmen</span><b>${kfmt(kCredit())}</b></div><p class="hint">Die Kassa darf bis zum Kreditrahmen ins Minus gehen. Auf das Minus fallen jeden Tag Zinsen an${KPK('bank')?' (Hausbank: ein Drittel weniger)':''}. Liegt die Kassa 7 Tage hintereinander unter dem Rahmen, ist der Berg verloren.${KG.pleite?' <b style="color:#e8504a">Schon '+KG.pleite+' Tage darunter!</b>':''}</p>`}
 return h}
// --- Ziele, Sterne, Rangliste ---
function kZielHTML(){const tabs=[['zi','🎯','Ziele'],['st','⭐','Sterne'],['rk','🏆','Rangliste']];if(!KW.tab||!tabs.some(t=>t[0]===KW.tab))KW.tab='zi';let h=kHead('🎯 '+KVOR.n,tabs);
 if(KW.tab==='zi'){const B=KBERGE.find(b=>b.id===KG.id);h+=`<p class="hint" style="margin:8px 0 4px">Bis zum Ende von Saison ${KVOR.seasons}. Jedes Ziel ist ein Stern für die Karriere – ohne das Pflichtziel gibt es keinen.</p>`;
  KVOR.goals.forEach((g,i)=>{const ok=KG.goals[g.k];h+=`<div class="kgoal"><span class="s">${'★'.repeat(i+1)}<i>${'★'.repeat(2-i)}</i></span><span><b>${['Pflicht','Zusatz','Meister'][i]}:</b> ${g.t}<small>${ok?'<span class="ok">✓ geschafft</span>':g.prog?'Stand: '+g.prog():g.k==='pf'?'Sterne jetzt: '+kStars()+' · Stufe '+KG.stage:''}${g.end&&!ok?' · zählt am Saisonende':''}</small></span></div>`});
  h+=`<div class="bgh">Saison</div><div class="row"><span>Tag</span><b>${kSeaD()} von ${KSL}</b></div>`;
  if(KG.goals.pf)h+=`<p class="hint">Das Pflichtziel ist geschafft. Du kannst bis zum Saisonende weiterspielen, um die anderen Ziele zu holen – oder den Berg jetzt abschließen.</p><button class="btn" data-a="endnow" style="width:100%;margin-top:6px">${KW.endAsk?'Wirklich jetzt abschließen? Nochmal tippen':'🏁 Berg jetzt abschließen'}</button>`}
 if(KW.tab==='st'){const st=kStars(),sc=kScore(),nx=KSTH[Math.min(5,st+1)];h+=`<div class="kpi"><div><small>Sterne</small><b style="color:#e8a33a">${'★'.repeat(st)}<span style="opacity:.25">${'★'.repeat(5-st)}</span></b></div><div><small>Punkte</small><b>${sc}</b>${st<5?`<i>nächster Stern ab ${nx}</i>`:''}</div></div>`;
  h+=`<div class="bgh">Woraus die Punkte bestehen</div><div class="row"><span>🏗️ Angebot (Lifte, Pisten, Gebäude)</span><b>${Math.round(kOffer()*.6)}</b></div><div class="row"><span>😊 Ruf ${Math.round(KG.ruf)} %</span><b>${Math.round(KG.ruf*2.2)}</b></div><div class="row"><span>❄️ Pistenzustand ${Math.round(kPQavg())} %</span><b>${Math.round(kPQavg()*.8)}</b></div><p class="hint">Sterne: 2 ab ${KSTH[2]}, 3 ab ${KSTH[3]}, 4 ab ${KSTH[4]}, 5 ab ${KSTH[5]} Punkten.</p>`}
 if(KW.tab==='rk'){const L=KVOR.rivals.map((n,i)=>({n,s:KG.rv[i]})).concat([{n:KG.firm?kesc(KG.firm):'Dein Skigebiet',s:kScore(),me:1}]).sort((a,b)=>b.s-a.s);h+='<div class="bgh">Skigebiete der Gegend</div>'+L.map((r,i)=>`<div class="row" style="${r.me?'font-weight:600;color:var(--ac)':''}"><span>${i+1}. ${r.n}</span><b>${r.s}</b></div>`).join('')}
 return h}
// --- Optionen ---
function kOptHTML(){let h=kHead('⚙️ Optionen');h+=`<div class="row"><span>Firma</span><b>${kesc(KG.firm||'–')}</b></div><div class="row"><span>Berg</span><b>${KVOR.n}</b></div>`;
 h+=`<button class="tb blue" data-a="leave" style="width:100%;margin-top:12px;font-size:19px">🗺️ Zur Karriere-Karte</button><button class="tb orange" data-a="title" style="width:100%;margin-top:12px;font-size:19px">🏠 Hauptmenü</button>`;
 h+=`<p class="hint" style="margin-top:12px">Der Spielstand dieses Berges wird automatisch gespeichert.</p><button class="btn" data-a="restart" style="width:100%;margin-top:10px;background:#8a94a8;box-shadow:0 3px 0 #5d667a">${KW.rsAsk?'Wirklich von vorne? Nochmal tippen':'↺ '+KVOR.n+' neu beginnen'}</button>`;return h}
// --- Logbuch ---
function kLogHTML(){let h=kHead('📖 Logbuch');for(const e of KG.lg)h+=`<div class="klg"><span class="t">${KWN[(e.d-1)%7]} ${kh(e.t)}</span><span>${e.ic} ${kesc(e.tx)}</span></div>`;if(!KG.lg.length)h+='<p class="hint">Noch keine Einträge.</p>';return h}
// --- Neu freigeschaltet ---
function kNeuHTML(){const N=KW.neu;if(!N){KW.open=null;return ''}return `<div class="kneu"><h3>🎉 Ausbau Stufe ${N.st}: ${N.n}<a data-a="x">✕</a></h3><p style="margin:4px 0 10px;font-size:15px;color:var(--mut)">Neu freigeschaltet</p><p style="font-size:15px;line-height:1.4">${N.d}</p><p class="hint">Es spricht sich in ${KPK('name')?2:3} Tagen herum – dann kommen deutlich mehr Gäste.</p><button class="tb green" data-a="neuok" style="width:100%;margin-top:10px">Weiter</button></div>`}
// --- Saisonende (für Berge mit mehreren Saisons) ---
function kSeaWin(){KW.modal=1;kOpen('sea')}
function kSeaHTML(){const S=KG.seaHist.slice(-1)[0];if(!S)return '';return `<h3>📅 Saison ${S.n} vorbei<a data-a="seaok">✕</a></h3><div class="kpi"><div><small>Einnahmen</small><b>${kfmt(S.inc)}</b></div><div><small>Kosten</small><b>${kfmt(S.cost)}</b></div><div><small>Ergebnis</small><b>${kfmt(S.res)}</b></div><div><small>Sterne</small><b>${'★'.repeat(S.st)}</b></div></div><button class="tb green" data-a="seaok" style="width:100%;margin-top:10px">Nächste Saison</button>`}
// --- Info-Fenster ---
function kOpenInfo(k){KW.inf=k;kOpen('inf')}
function kInfHTML(){const k=KW.inf||'',V=KVOR;
 if(k.startsWith('l:')){const id=k.slice(2),L=kLC(id),s=KG.l[id],o=KW.lift[id];if(!s.on){const b=KG.bau.find(x=>x.lift===id);return kHead((L.typ==='teller'?'🎿 ':'🚡 ')+L.n)+(b?`<p class="hint">🚧 Im Bau – fertig ${kDayT(b.d0+b.days)} früh.</p>`:'<p class="hint">Noch nicht gebaut.</p>')}
  const w=kWait(id),T0=KLT[s.typ];const ovh=Math.round((id==='tl'?600:3000)*(KPK('lift')?.9:1));
  let h=kHead((s.typ==='teller'?'🎿 ':'🚡 ')+L.n)+`<div style="margin:4px 0"><span class="kchip b">${T0.n}</span>${s.lg?`<span class="kchip">+${s.lg} Ausbau</span>`:''}${s.brk?'<span class="kchip r">⚠️ Störung</span>':kLiftOpen(id)?'<span class="kchip g">in Betrieb</span>':'<span class="kchip">steht</span>'}</div>`;
  h+=`<div class="kpi"><div><small>Wartezeit</small><b>${w<1?'keine':Math.round(w)+' Min.'}</b></div><div><small>In der Schlange</small><b>${o?o.q.length:0}</b></div><div><small>Fahrten heute</small><b>${o?o.cnt:0}</b></div><div><small>Zustand</small><b>${Math.round(s.cond)} %</b></div></div>`;
  if(KG.wx==='sturm'&&s.typ!=='teller')h+='<p class="hint">🌪️ Bei Sturm steht der Sessellift.</p>';
  h+=`<div class="row"><span>🔧 Generalüberholung (Zustand 100 %, weniger Störungen)</span><button class="btn" data-a="ovh" data-v="${id}" ${s.cond>92||!kCanPay(ovh)?'disabled':''}>${kfmt(ovh)}</button></div><div class="row"><span>Ausbau</span><button class="btn" data-a="go" data-v="bau|lif">Baumenü ›</button></div>`;return h}
 const Hd={kas:'🎫 Kassa',kio:'🌭 Kiosk',hut:'🛖 Sonnalm',kid:'⭐ Kinderland',sch:'⛷️ Skischule',rau:'🚜 Pistenraupe',hot:'🏨 Gasthof Sonnleiten',park:'🅿️ Parkplätze'};
 if(Hd[k]){let h=kHead(Hd[k]);const inc=KG.inc;
  if(k==='kas')h+=`<div class="kpi"><div><small>Gäste heute</small><b>${KG.gDay}</b></div><div><small>Tageskarten heute</small><b>${kfmt(inc.tk||0)}</b></div></div><div class="row"><span>Tageskarte</span><button class="btn" data-a="go" data-v="pre">${KG.price.ticket} € ›</button></div>${KG.res.prRej?`<p class="hint">${KG.res.prRej} Gäste fanden die Karte zu teuer und sind umgekehrt.</p>`:''}`;
  if(k==='kio'||k==='hut')h+=`<div class="kpi"><div><small>Essen heute (alle)</small><b>${kfmt(inc.food||0)}</b></div><div><small>Mittagsmenü</small><b>${KG.price.food} €</b></div></div><p class="hint">Mittagszeit ist zwischen 11 und 14 Uhr.</p>`;
  if(k==='kid')h+=`<div class="kpi"><div><small>Kinderland heute</small><b>${kfmt(inc.kid||0)}</b></div><div><small>Kinder gerade</small><b>${KW.folks.filter(f=>f.st==='kidin').length}</b></div></div>`;
  if(k==='sch'){const g=KW.school.filter(x=>x.st==='run'||x.st==='wait');h+=`<div class="kpi"><div><small>Skikurse heute</small><b>${kfmt(inc.sch||0)}</b></div><div><small>Gruppen gerade</small><b>${g.length}</b></div></div><p class="hint">Kurse beginnen jeweils zur halben Stunde von 9:30 bis 14:30, bis zu 6 Teilnehmer je Gruppe.</p>`}
  if(k==='rau')h+=`<div class="kpi"><div><small>Pistenzustand</small><b>${Math.round(kPQavg())} %</b></div><div><small>Schnee</small><b>${Math.round(KG.snow)} cm</b></div></div><p class="hint">Die Raupe fährt ab 19 Uhr, wenn niemand mehr auf der Piste ist.${KG.snow<30?' Bei wenig Schnee kann auch die Raupe die Piste nicht mehr ganz herrichten.':''}</p>`;
  if(k==='hot')h+=`<div class="kpi"><div><small>Belegung</small><b>${Math.round((KG.hOcc||0)*100)} %</b></div><div><small>Zimmerpreis</small><b>${KG.price.hotel} €</b></div></div>`;
  if(k==='park'){const sp=kSpots().length,used=KW.cars.filter(c=>c.spot).length;h+=`<div class="kpi"><div><small>Belegt</small><b>${used} / ${sp}</b></div><div><small>Heute abgewiesen</small><b>${KG.rej}</b></div></div><div class="row"><span>Parken</span><button class="btn" data-a="go" data-v="pre">${KG.price.park} € ›</button></div>`}
  return h}
 if(k.startsWith('p:')){const p=KW.pmap[k.slice(2)];return kHead((p.col==='r'?'🔴 ':'🔵 ')+p.n)+`<div class="kpi"><div><small>Zustand</small><b>${Math.round(KG.pq[p.id])} %</b></div><div><small>Gäste darauf</small><b>${KW.folks.filter(f=>f.st==='ski'&&f.pid===p.id).length}</b></div></div>`}
 return kHead('Info')}
function kOverhaul(id){const c=Math.round((id==='tl'?600:3000)*(KPK('lift')?.9:1));if(!kCanPay(c))return;KG.money-=c;KG.cost.bau=(KG.cost.bau||0)+c;KG.seaBau=(KG.seaBau||0)+c;KG.l[id].cond=100;kLog('🔧',kLC(id).n+' generalüberholt.');kUI()}

// ===== Karriere: Titel, Firmenname, Landkarte, Berg-Fenster, Vorteile, Bilanz =====
function kOvCSS(){kCloneCSS();if(document.getElementById('kocss'))return;const s=document.createElement('style');s.id='kocss';s.textContent=`
body.kmode>*:not(#kc):not(#kui):not(#kov):not(#kname):not(script):not(style){display:none!important}
#kov{position:fixed;inset:0;z-index:100000;background:linear-gradient(#cfe8fb,#eef6fd 40%,#f7fbff);overflow:auto;-webkit-overflow-scrolling:touch;font-family:'Fredoka',sans-serif;color:var(--tx)}
#kov .kp{max-width:520px;margin:0 auto;padding:calc(14px + env(safe-area-inset-top,0px)) 14px calc(24px + env(safe-area-inset-bottom,0px))}
#kov .kh{display:flex;align-items:center;gap:8px;margin-bottom:8px}#kov .kh h2{flex:1;margin:0;font-size:22px}#kov .kh a{font-size:15px;font-weight:600;color:#33516f;cursor:pointer;padding:6px}
#kov .card{background:var(--bg);border-radius:20px;padding:14px 16px;box-shadow:0 4px 16px rgba(20,50,90,.12);margin-bottom:12px}
#kov .bgh{margin:12px 0 2px}
.kpk{display:flex;gap:10px;align-items:center;border-radius:14px;padding:8px 10px;margin:6px 0;background:var(--chip);border:2px solid transparent;cursor:pointer}
.kpk.on{background:#e7f7ec;border-color:#2e9e5b}.kpk.no{opacity:.5;cursor:default}
.kpk .ic{font-size:24px;flex:none;width:30px;text-align:center}.kpk .tx{flex:1;min-width:0}.kpk .tx b{display:block;font-size:14.5px}.kpk .tx small{display:block;color:var(--mut);font-size:12px;line-height:1.3}
.kpk .co{flex:none;text-align:right;font-size:12px;color:var(--mut)}.kpk .co b{display:block;color:#e8a33a;font-size:15px;letter-spacing:1px}
.kpk .tg{flex:none;width:40px;height:24px;border-radius:12px;background:#cfd9e6;position:relative}.kpk .tg:after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:left .15s}
.kpk.on .tg{background:#2e9e5b}.kpk.on .tg:after{left:19px}
.kpips{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap}.kpips i{width:14px;height:14px;border-radius:50%;background:#e8a33a;display:block}.kpips i.e{background:#e3e9f1}
#kname{position:fixed;inset:0;z-index:100002;background:rgba(20,40,70,.45);display:flex;align-items:center;justify-content:center;font-family:Fredoka,sans-serif}
#kname .box{width:min(360px,92vw);background:var(--bg);color:var(--tx);border-radius:22px;padding:18px 18px 16px;box-shadow:0 8px 30px rgba(0,0,0,.25)}
#kname input{width:100%;box-sizing:border-box;border:2px solid #1e88e5;border-radius:12px;padding:10px 12px;font:600 17px Fredoka,sans-serif;color:var(--tx);background:var(--bg);outline:none}
.kst{color:#e8a33a;letter-spacing:1px}.kst i{font-style:normal;opacity:.25}`;document.head.appendChild(s)}
function kOv(html){kOvCSS();let o=document.getElementById('kov');if(!o){o=document.createElement('div');o.id='kov';document.body.appendChild(o);o.addEventListener('click',kOvClick)}o.innerHTML='<div class="kp">'+html+'</div>';o.hidden=false;o.scrollTop=0;document.body.classList.add('kmode');return o}
function kOvHide(){const o=document.getElementById('kov');if(o)o.hidden=true}
// Titel: Auswahl „Freies Spiel“ oder „Karriere“
function kTitleList(){kCareerLoad();const nb=kNextBerg(),xp=kXP();const pr=KC.firm?`<br><i>${kesc(KC.firm)} · ★ ${xp} von 15${nb?' · weiter mit '+nb.n:''}</i>`:'';
 return `<button class="tsc" data-sc="free"><span class="ti">♾️</span><span><b>Freies Spiel</b>Dein Heimatberg mit Ostberg, Sommer, Therme und Arena. Ohne Frist, Schwierigkeit frei wählbar.</span></button>
 <button class="tsc" data-sc="kar"><span class="ti">🏔️</span><span><b>Karriere<span class="tl" style="background:#f2701f">Neu</span></b>5 Berge, jeder anders. Sterne sammeln, Erfahrung mitnehmen, Seilbahn-König der Alpen werden.${pr}</span></button>`}
function kNextBerg(){for(let i=0;i<KBERGE.length;i++){const b=KBERGE[i];if(!kOpenB(i))return null;if(!(KC.best[b.id]>=3)&&!(KC.best[b.id]>=1&&kOpenB(i+1)&&i+1<KBERGE.length))return b}return null}
function kOpenB(i){if(i<=0)return true;if(i>=KBERGE.length)return false;return (KC.best[KBERGE[i-1].id]||0)>=1}
// Einstieg aus dem Titel
function kCareerOpen(){kCareerLoad();if(!KC.firm){kNameBox();return}kMap()}
function kNameBox(){kOvCSS();let d=document.getElementById('kname');if(d)d.remove();d=document.createElement('div');d.id='kname';const sug=['Bergbahnen Alpenblick GmbH','Bergbahnen Gipfelglück','Seilbahnen Edelweiß AG','Alpenlift GmbH'];
 d.innerHTML=`<div class="box"><div style="font-size:34px;text-align:center">🏔️</div><div style="font:600 21px Fredoka,sans-serif;text-align:center;margin:2px 0 4px">Deine Bergbahn-Firma</div>
 <div style="font-size:13.5px;color:var(--mut);text-align:center;line-height:1.35;margin-bottom:12px">In der Karriere übernimmst du 5 Berge nacheinander. Jeder Stern bringt Erfahrung für Firmen-Vorteile. Wie heißt deine Firma?</div>
 <input id="knin" maxlength="34" value="${kesc(KC.firm||sug[0])}"><div style="font-size:12px;color:var(--mut);margin:8px 0 4px">Vorschläge</div><div>${sug.slice(1).map(s=>`<span class="kchip" data-s="${kesc(s)}" style="cursor:pointer">${kesc(s)}</span>`).join('')}</div>
 <button class="tb orange" id="knok" style="width:100%;margin-top:12px">Karriere starten</button><div id="knno" style="text-align:center;margin-top:10px;font-weight:600;color:#33516f;cursor:pointer">Abbrechen</div></div>`;
 document.body.appendChild(d);const inp=d.querySelector('#knin');d.querySelectorAll('[data-s]').forEach(c=>c.onclick=()=>{inp.value=c.dataset.s});
 d.querySelector('#knok').onclick=()=>{const v=inp.value.trim().slice(0,34);if(!v){inp.focus();return}KC.firm=v;kCareerSave();d.remove();kMap()};
 d.querySelector('#knno').onclick=()=>{d.remove();if(!document.body.classList.contains('kmode')){}else{kToTitle()}};
 setTimeout(()=>{try{inp.select()}catch(e){}},50)}
// Landkarte
function kMap(){kCareerLoad();const xp=kXP(),nb=kNextBerg();
 let h=`<div class="kh"><h2>🏔️ Karriere</h2><a data-o="title">Hauptmenü</a></div><div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px"><div style="min-width:0"><b style="font-size:16px">${kesc(KC.firm)}</b><br><small style="color:var(--mut)">${xp} von 15 Sternen · Ziel: Seilbahn-König der Alpen</small><div class="kbar2" style="max-width:220px"><i style="width:${xp/15*100}%"></i></div></div><div style="text-align:right;flex:none"><span class="kchip o">⭐ ${xp} Erfahrung</span><br><a data-o="name" style="font-size:12px;color:var(--mut);cursor:pointer">Name ändern</a></div></div>
 <canvas id="kmap" style="width:100%;height:470px;border-radius:16px;display:block;position:static;margin-top:10px;touch-action:manipulation"></canvas></div>`;
 if(nb){const i=KBERGE.indexOf(nb);h+=`<div class="card" style="display:flex;align-items:center;gap:10px"><div style="flex:1"><small style="color:var(--mut)">Nächster Berg · ${i+1} von 5</small><br><b>${nb.n} – ${nb.sub}</b><br><small style="color:var(--mut)">${nb.lv} · ${nb.st} Ausbaustufen · ${nb.sea} ${nb.sea>1?'Saisons':'Saison'}</small></div><button class="btn" data-o="berg" data-v="${nb.id}" style="font-size:15px;padding:8px 14px">Ansehen ›</button></div>`}
 h+=`<div class="card"><b>So funktioniert die Karriere</b><p class="hint">Jeder Berg hat 3 Ziele. Das Pflichtziel bringt den ersten Stern und öffnet den nächsten Berg. Jeder Stern ist 1 Erfahrung – damit wählst du vor jedem Berg Firmen-Vorteile. Jeder Berg kann wiederholt werden, es zählt das beste Ergebnis.</p></div>`;
 kOv(h);requestAnimationFrame(kMapDraw)}
function kMapNodes(){return [{x:.22,y:.84,k:'s'},{x:.62,y:.69,k:'b'},{x:.27,y:.47,k:'a'},{x:.78,y:.33,k:'k'},{x:.45,y:.14,k:'e'}]}
function kMapDraw(){const cv=document.getElementById('kmap');if(!cv)return;const W=cv.clientWidth,H=cv.clientHeight,d=2;cv.width=W*d;cv.height=H*d;const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);const R=kRNG(4);
 let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#eaf3fb');g.addColorStop(1,'#f7fbff');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.strokeStyle='rgba(150,180,210,.25)';c.lineWidth=1;for(let k=0;k<9;k++){c.beginPath();for(let x=0;x<=W;x+=8){const y=30+k*52+10*Math.sin(x/37+k)+6*Math.sin(x/13+k*2);x?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 c.strokeStyle='#9fd3ef';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(-10,H*.86);c.bezierCurveTo(W*.3,H*.8,W*.35,H*.7,W*.55,H*.72);c.bezierCurveTo(W*.75,H*.72,W*.8,H*.62,W+10,H*.6);c.stroke();
 const N=kMapNodes().map((q,i)=>Object.assign({},q,{x:q.x*W,y:q.y*H,b:KBERGE[i],i}));
 c.strokeStyle='#c9b18b';c.lineWidth=7;c.beginPath();c.moveTo(N[0].x,N[0].y+18);for(let i=1;i<N.length;i++){const a=N[i-1],b=N[i];c.bezierCurveTo(a.x+(i%2?60:-60),a.y-10,b.x+(i%2?-40:40),b.y+50,b.x,b.y+18)}c.stroke();
 c.strokeStyle='#efe2c8';c.lineWidth=4;c.stroke();c.setLineDash([5,6]);c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();c.setLineDash([]);
 kWithGame(()=>{for(let i=0;i<150;i++){const x=R()*W,y=40+R()*(H-40);if(N.some(q=>Math.hypot(q.x-x,(q.y-y)*1.3)<56))continue;c.save();c.translate(x,y);c.scale(.32,.32);pineN(c,0,0,1);c.restore()}});
 const nb=kNextBerg();KW.mapN=N;
 for(const q of N){const lk=!kOpenB(q.i),st=KC.best[q.b.id]||0,cur=nb&&nb.id===q.b.id;c.save();if(lk)c.filter='grayscale(.85) opacity(.6)';kMapIcon(c,q);c.restore();
  c.font='500 10.5px Fredoka,sans-serif';const sw=lk?c.measureText('erst 1 ★ am Berg davor').width:0;c.font='600 12px Fredoka,sans-serif';const t=(lk?'🔒 ':'')+q.b.n,tw=c.measureText(t).width;const bw=Math.max(tw,sw,62)+18,bx=q.x-bw/2,by=q.y+24;
  c.fillStyle=lk?'rgba(255,255,255,.85)':'#fff';c.strokeStyle=cur?'#e8504a':lk?'#c5d0dd':'#2e9e5b';c.lineWidth=2;c.beginPath();c.roundRect(bx,by,bw,36,9);c.fill();c.stroke();
  c.fillStyle=lk?'#8a97ab':'#23324a';c.textAlign='center';c.textBaseline='middle';c.fillText(t,q.x,by+12);
  if(lk){c.fillStyle='#8a97ab';c.font='500 10.5px Fredoka,sans-serif';c.fillText('erst 1 ★ am Berg davor',q.x,by+26)}
  else if(cur&&!st){c.fillStyle='#e8504a';c.font='700 11px Fredoka,sans-serif';const sv=kLoad(q.b.id);c.fillText(sv&&!sv.done?'▶ Weiterspielen':'▶ Spielen',q.x,by+26)}
  else{c.font='700 12px sans-serif';c.fillStyle='#e8a33a';c.fillText('★'.repeat(st)+'☆'.repeat(3-st),q.x,by+26)}
  if(cur){c.strokeStyle='rgba(232,80,74,.55)';c.lineWidth=3;c.setLineDash([4,4]);c.beginPath();c.ellipse(q.x,q.y-2,42,31,0,0,7);c.stroke();c.setLineDash([])}
  c.textBaseline='alphabetic'}
 c.font='600 11px Fredoka,sans-serif';c.fillStyle=kXP()>=12&&(KC.best.eis||0)>=1?'#c8941a':'#8a97ab';c.textAlign='right';c.fillText((kXP()>=12&&(KC.best.eis||0)>=1?'👑 ':'')+'Seilbahn-König der Alpen',W-8,18);
 cv.onclick=e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(const q of N)if(Math.hypot(q.x-x,(q.y+10-y)*.9)<44){kBergWin(q.b.id);return}}}
function kMapIcon(c,q){const x=q.x,y=q.y;const tri=(x0,x1,xt,yt,yb,L,D)=>{c.fillStyle=L;c.beginPath();c.moveTo(x0,yb);c.lineTo(xt,yt);c.lineTo(xt,yb);c.fill();c.fillStyle=D;c.beginPath();c.moveTo(x1,yb);c.lineTo(xt,yt);c.lineTo(xt,yb);c.fill()};
 c.fillStyle='rgba(110,140,180,.22)';c.beginPath();c.ellipse(x+4,y+20,40,7,0,0,7);c.fill();
 kWithGame(()=>{
 if(q.k==='s'){c.fillStyle='#fff';c.strokeStyle='#cfdcea';c.lineWidth=1.2;c.beginPath();c.moveTo(x-38,y+18);c.quadraticCurveTo(x,y-34,x+38,y+18);c.closePath();c.fill();c.stroke();for(const [a,b] of [[-26,8],[22,6],[-14,14],[28,14]]){c.save();c.translate(x+a,y+b);c.scale(.3,.3);pineN(c,0,0,1);c.restore()}c.fillStyle='#3f8f6e';c.fillRect(x+10,y+2,5,12);c.beginPath();c.arc(x+12.5,y+1,3.4,0,7);c.fill();c.fillStyle='#e8a33a';c.font='16px sans-serif';c.textAlign='center';c.fillText('☀',x-22,y-14)}
 if(q.k==='b'){c.fillStyle='#fff';c.strokeStyle='#cfdcea';c.beginPath();c.moveTo(x-40,y+18);c.bezierCurveTo(x-30,y-20,x+10,y-30,x+40,y+18);c.closePath();c.fill();c.stroke();for(let i=0;i<14;i++){const a=-34+i*5,b=12-((i*7)%11);c.save();c.translate(x+a,y+b);c.scale(.28,.28);pineN(c,0,0,1);c.restore()}c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(x+4,y-18);c.quadraticCurveTo(x+16,y-6,x+2,y+2);c.quadraticCurveTo(x-10,y+10,x+6,y+18);c.stroke()}
 if(q.k==='a'){tri(x-38,x-2,x-18,y-20,y+18,'#a3a8b4','#868b98');tri(x-6,x+38,x+16,y-28,y+18,'#b2b6c0','#8d919d');c.fillStyle='#fff';c.beginPath();c.moveTo(x+16,y-28);c.lineTo(x+10,y-16);c.lineTo(x+22,y-16);c.fill();c.fillStyle='#7a6a5a';c.fillRect(x-4,y+6,10,8);c.fillStyle='#5a4a3a';c.fillRect(x-6,y+4,14,3)}
 if(q.k==='k'){c.fillStyle='#4fc3cf';c.beginPath();c.ellipse(x,y+14,38,8,0,0,7);c.fill();for(const [a,h,w] of [[-26,34,10],[-14,44,9],[-3,30,8],[8,48,10],[22,36,9]])tri(x+a-w,x+a+w,x+a,y+8-h,y+8,'#f1e8da','#cfc0a8');c.fillStyle='#fff';c.fillRect(x+6,y+12,12,3)}
 if(q.k==='e'){tri(x-40,x+40,x,y-44,y+18,'#9097a6','#6f7685');c.fillStyle='#eef7fd';c.beginPath();c.moveTo(x,y-44);c.lineTo(x-20,y-8);c.lineTo(x-6,y-14);c.lineTo(x+4,y-4);c.lineTo(x+20,y-10);c.closePath();c.fill();c.fillStyle='#cfe8f7';c.beginPath();c.moveTo(x,y-44);c.lineTo(x+4,y-4);c.lineTo(x+20,y-10);c.fill()}})}
// Berg-Fenster
const KBINFO={
 sonn:{goals:['2 Sterne und Ausbau Stufe 3 offen','An 5 Tagen Familien zu mindestens 75 % zufrieden','Saisonergebnis über 75.000 €'],spec:[['👨‍👩‍👧 Gäste','viele Familien und Anfänger'],['💶 Preise','Gäste achten stark auf den Preis'],['⭐ Besonderes Gebäude','Kinderland mit Zauberteppich']],tip:'Tipp: Kinderland, Skischule und faire Preise'},
 bich:{goals:['Schneekanonen in Betrieb und 2 Sterne','Platz 6 oder besser in der Rangliste','Pistenzustand in der letzten Woche nie unter 60 %'],spec:[['🌡️ Tauwetter','1,7-mal so oft'],['❄️ Neuschnee','nur 60 %'],['🚧 Engstellen','2 · Umfahrung baubar'],['💧 Besonderes Gebäude','Speicherteich']],tip:'Tipp: viel Kunstschnee nötig'},
 alt:{goals:['Schulden weg und Pistenraupe im Einsatz','3 Sterne','Alle alten Lifte saniert oder ersetzt, Kassa mindestens +50.000 €'],spec:[['🏚️ Start','Schulden −8.000 €, alte Lifte'],['⛰️ Form','zwei Hänge mit Gabelung'],['🚡 Besonderes Gebäude','Nostalgie-Sessellift']],tip:'Tipp: Liftbau-Partner und Hausbank'},
 seek:{goals:['3 Sterne','Einmal 1.000 Gäste an einem Tag','Platz 3 oder besser in der Rangliste'],spec:[['🌊 Lage','hinter einem See, wenig Platz im Tal'],['⛴️ Seeschiff','bringt Gäste vom großen Parkplatz'],['🏨 Besonderes Gebäude','Seehotel mit Steg']],tip:'Tipp: Anreise ist der Engpass'},
 eis:{goals:['4 Sterne','Platz 1 in der Rangliste','Platz 1 schon am Ende der 2. Saison'],spec:[['🌪️ Wetter','öfter Sturm, obere Lifte stehen'],['⚠️ Lawinengefahr','nach Neuschnee erst sprengen'],['🍽️ Besonderes Gebäude','Gipfelrestaurant am Gletscher']],tip:'Tipp: Konkurrenz baut schnell aus'}};
function kBergWin(id){kCareerLoad();const i=KBERGE.findIndex(b=>b.id===id),B=KBERGE[i],I=KBINFO[id],lk=!kOpenB(i),av=!!KV[id],sv=kLoad(id),best=KC.best[id]||0,R=KC.res[id];
 const img=av?kThumb(id):'';const perks=(KC.perks||[]).filter(p=>KPERK.find(x=>x.id===p));const used=kPerkUsed(perks),xp=kXP();
 let h=`<div class="kh"><a data-o="map">‹ Karte</a><h2 style="text-align:center">${B.n}</h2><span style="width:50px"></span></div><div class="card">`;
 h+=img?`<img src="${img}" style="width:100%;height:230px;object-fit:cover;border-radius:14px;display:block">`:`<div style="height:120px;border-radius:14px;background:linear-gradient(#dfeaf6,#f3f8fd);display:flex;align-items:center;justify-content:center;font-size:44px">🏔️</div>`;
 h+=`<div style="margin:10px 0 2px"><b style="font-size:18px">${B.n} – ${B.sub}</b></div><div style="margin:6px 0 2px"><span class="kchip b">${B.lv}</span><span class="kchip">🏗️ ${B.st} Ausbaustufen</span><span class="kchip">📅 ${B.sea} ${B.sea>1?'Saisons':'Saison'}</span><span class="kchip">💶 Start ${kfmt(B.start)}</span></div>`;
 if(av)h+=`<p style="margin:6px 0;font-size:13.5px;color:#33516f;line-height:1.35">${KV[id].desc}</p>`;
 h+=`<div class="bgh">🎯 Ziele <small style="font-weight:400">· jedes Ziel ein Stern</small></div>`+I.goals.map((g,j)=>`<div class="kgoal"><span class="s">${'★'.repeat(j+1)}<i>${'★'.repeat(2-j)}</i></span><span><b>${['Pflicht','Zusatz','Meister'][j]}:</b> ${g}${j===0&&i<4?`<small>Ohne diesen Stern bleibt ${KBERGE[i+1].n} zu</small>`:''}</span></div>`).join('');
 h+=`<div class="bgh">🌦️ Besonderheiten</div>`+I.spec.map(s=>`<div class="row"><span>${s[0]}</span><b style="text-align:right">${s[1]}</b></div>`).join('');
 h+=`<div class="bgh">🧰 Firmen-Vorteile <small style="font-weight:400">· ${used} von ${xp} Erfahrung verteilt</small></div><div style="padding:6px 0 2px">${perks.length?perks.map(p=>{const P=KPERK.find(x=>x.id===p);return `<span class="kchip g">${P.ic} ${P.n}</span>`}).join(''):'<span style="color:var(--mut);font-size:13px">'+(xp?'noch keine gewählt':'Erfahrung bekommst du mit dem ersten Stern')+'</span>'} ${xp?'<a data-o="perk" data-v="'+id+'" style="font-size:13px;color:var(--ac);font-weight:600;cursor:pointer">Ändern ›</a>':''}</div>`;
 h+=`<div class="row" style="border:0;padding-top:10px"><span><small style="color:var(--mut)">Bester Versuch</small><br><b>${best?'<span class="kst">'+'★'.repeat(best)+'<i>'+'★'.repeat(3-best)+'</i></span>'+(R&&R.res!=null?' · Ergebnis '+kfmt(R.res):''):R?'0 Sterne':'– noch nicht gespielt'}</b></span></div>`;
 if(lk)h+=`<button class="tb orange" disabled style="width:100%;margin-top:6px">🔒 erst 1 ★ auf ${KBERGE[i-1].n}</button>`;
 else if(!av)h+=`<button class="tb orange" disabled style="width:100%;margin-top:6px">🚧 Dieser Berg kommt im nächsten Schritt</button><p class="hint" style="text-align:center">${B.n} wird als nächster Karriere-Berg gebaut.</p>`;
 else if(sv&&!sv.done){h+=`<button class="tb orange" data-o="play" data-v="${id}" style="width:100%;margin-top:6px">▶ ${B.n} weiterspielen<small>${kDayT(sv.day)} · ${kfmt(sv.money)}</small></button><button class="btn" data-o="fresh" data-v="${id}" style="width:100%;margin-top:12px;background:#8a94a8;box-shadow:0 3px 0 #5d667a">${KW.frAsk===id?'Wirklich neu beginnen? Nochmal tippen':'↺ Neu beginnen (mit den gewählten Vorteilen)'}</button><p class="hint">Beim Weiterspielen gelten die Vorteile vom Start dieses Versuchs.</p>`}
 else h+=`<button class="tb orange" data-o="fresh" data-v="${id}" style="width:100%;margin-top:6px">▶ ${B.n} ${R?'nochmal ':''}spielen</button>`;
 h+='</div>';kOv(h)}
function kPerkUsed(P){let n=0;for(const p of P){const x=KPERK.find(q=>q.id===p);if(x)n+=x.c}return n}
function kPerkWin(id){kCareerLoad();const xp=kXP(),sel=(KC.perks||[]).slice();KW.perkSel=sel;KW.perkB=id;kPerkRender()}
function kPerkRender(){const xp=kXP(),sel=KW.perkSel,used=kPerkUsed(sel),B=KBERGE.find(b=>b.id===KW.perkB),I=KBINFO[KW.perkB];
 let h=`<div class="kh"><a data-o="berg" data-v="${KW.perkB}">‹ Zurück</a><h2 style="text-align:center">🧰 Firmen-Vorteile</h2><span style="width:50px"></span></div><div class="card">`;
 h+=`<div class="kpi" style="grid-template-columns:1fr 1fr"><div><small>Erfahrung · ${xp-used} übrig</small><b>⭐ ${used} von ${xp} verteilt</b><div class="kpips">${'<i></i>'.repeat(used)}${'<i class="e"></i>'.repeat(Math.max(0,xp-used))}</div></div><div><small>Für den Berg</small><b>${B.n}</b><small>${I.tip}</small></div></div>`;
 h+=`<p class="hint" style="margin:6px 0 4px">Vor jedem Berg frei neu verteilen. Während eines Berges bleibt die Auswahl fest. Gilt nur in der Karriere.</p>`;
 for(const p of KPERK){const on=sel.includes(p.id),no=!on&&p.c>xp-used;h+=`<div class="kpk ${on?'on':''} ${no?'no':''}" data-o="ptg" data-v="${p.id}"><span class="ic">${p.ic}</span><span class="tx"><b>${p.n}</b><small>${p.d}</small></span><span class="co"><b>${'★'.repeat(p.c)}</b>${no?'fehlt '+(p.c-(xp-used))+' ★':on?'gewählt':''}</span><span class="tg"></span></div>`}
 h+=`<button class="tb green" data-o="pok" style="width:100%;margin-top:8px">✓ Übernehmen</button></div>`;kOv(h)}
function kOvClick(e){const b=e.target.closest('[data-o]');if(!b)return;const o=b.dataset.o,v=b.dataset.v;
 if(o==='title'){kToTitle();return}if(o==='map'){KW.frAsk=null;kMap();return}if(o==='name'){kNameBox();return}
 if(o==='berg'){KW.frAsk=null;kBergWin(v);return}if(o==='perk'){kPerkWin(v);return}
 if(o==='ptg'){const s=KW.perkSel,i=s.indexOf(v),P=KPERK.find(x=>x.id===v);if(i>=0)s.splice(i,1);else if(kPerkUsed(s)+P.c<=kXP())s.push(v);kPerkRender();return}
 if(o==='pok'){KC.perks=KW.perkSel.slice();kCareerSave();kBergWin(KW.perkB);return}
 if(o==='play'){kStart(v,0);return}
 if(o==='fresh'){const sv=kLoad(v);if(sv&&!sv.done&&KW.frAsk!==v){KW.frAsk=v;kBergWin(v);return}KW.frAsk=null;kStart(v,1);return}}
function kToTitle(){kOvHide();const n=document.getElementById('kname');if(n)n.remove();document.body.classList.remove('kmode');try{showTitle()}catch(e){}}
// Vorschaubild eines Berges (aus der Vorlage gezeichnet)
const KTH={};function kThumb(id){if(KTH[id])return KTH[id];const g0=KG,v0=KVOR,on0=KON,st0={c:KST.c,rs:KST.rs},pist0=KW.pistes,pm0=KW.pmap,paths0=KW.paths,z0=Object.assign({},kZ);let url='';
 try{KVOR=KV[id];KG=kNewState(id,[]);KG.stage=3;for(const k in KG.l)KG.l[k].on=1;KG.l.ses.typ='s4';KG.b.hut=1;KG.b.kinder=1;KG.b.school=1;KG.b.kiosk=1;KW.paths=KVOR.paths();kBuildWorld();kZ.S=.5;kZ.dpr=1;KST.c=null;
  const b=KVOR.bounds,rs=.62;const cv=document.createElement('canvas');cv.width=Math.ceil((b.x1-b.x0)*rs);cv.height=Math.ceil((b.y1-b.y0)*rs);const c=cv.getContext('2d');c.setTransform(rs,0,0,rs,-b.x0*rs,-b.y0*rs);
  kWithGame(()=>{KW.winOn=0;KVOR.bg(c);for(const L of KVOR.lots)kLot(c,L,0);kDrawPaths(c);kDrawPistes(c);const O=KST.objs.slice();for(const t of KST.trees)O.push({y:t.y,f:c2=>t.t==='p'?pineN(c2,t.x,t.y,t.s):kDecid(c2,t.x,t.y,t.s,t.t==='o')});for(const h of KST.houses)O.push({y:h.y,f:c2=>chalet(c2,h.x,h.y,h.w,h.h,h.k)});
   for(const L of KVOR.lifts){const co=L.typ==='teller'?0:8;O.push({y:L.b[1]+22,f:c2=>L.typ==='teller'?stationN(c2,L.b[0]+14,L.b[1],0):liftStation(c2,L.b[0],L.b[1],co,true)});O.push({y:L.t[1]+18,f:c2=>L.typ==='teller'?stationN(c2,L.t[0]+14,L.t[1],0):liftStation(c2,L.t[0],L.t[1],co,false)});
    O.push({y:3000,f:c2=>{c2.strokeStyle='#161a28';c2.lineWidth=1.2;for(const sd of [-1,1]){c2.beginPath();c2.moveTo(L.b[0]+sd*co,L.b[1]-(co?0:14));c2.lineTo(L.t[0]+sd*co,L.t[1]-(co?0:14));c2.stroke()}}})}
   O.push({y:KVOR.hut.y,f:c2=>hut(c2,0)});O.push({y:KVOR.kassa.y,f:c2=>kKassaDraw(c2,KVOR.kassa.x,KVOR.kassa.y)});O.push({y:KVOR.kinder.y-60,f:c2=>kKidBack(c2,0)});O.push({y:KVOR.kinder.y+40,f:c2=>kKidCarpet(c2,0)});
   O.sort((a,b)=>a.y-b.y);for(const o of O)o.f(c)});
  // Ausschnitt: Hang und Tal
  const out=document.createElement('canvas');out.width=640;out.height=520;const oc=out.getContext('2d');const x0=-40,y0=660,w=1080,h=w*520/640;oc.drawImage(cv,(x0-b.x0)*rs,(y0-b.y0)*rs,w*rs,h*rs,0,0,640,520);url=out.toDataURL('image/jpeg',.82)}
 catch(e){console.error(e)}
 finally{KG=g0;KVOR=v0;KON=on0;KST.c=st0.c;KST.rs=st0.rs;KW.pistes=pist0;KW.pmap=pm0;KW.paths=paths0;Object.assign(kZ,z0);if(KVOR){kBuildWorld()}}
 return KTH[id]=url}
// Berg starten / verlassen
function kStart(id,fresh){kCareerLoad();KVOR=KV[id];if(!KVOR)return;let s=fresh?null:kLoad(id);if(!s||s.done){s=kNewState(id,KC.perks||[]);s.firm=KC.firm}KG=s;
 KW.folks=[];KW.cars=[];KW.buses=[];KW.pops=[];KW.lift={};KW.school=[];KW.groom=null;KW.res=null;KW.neu=null;KW.open=null;KW.paused=false;KW.modal=0;KW.speed=1;KW.endAsk=0;KW.rsAsk=0;KW.canP=null;KW.acc=[];
 KW.paths=KVOR.paths();kBuildWorld();for(const id2 in KG.l)if(KG.l[id2].on)kLiftSetup(id2);KW.hutS=kHutS();
 if(fresh||!KG.dem){KG.dem=kDemand();if(KG.t>=6&&KG.day===1&&!KG.started){KG.wx='sonne';KG.started=1;kLog('🏔️','Willkommen in '+KVOR.n+'! Baue zuerst den Tellerlift (🔨 Bauen › Lifte).')}}
 KW.hotelN=0;kOvCSS();kOvHide();const n=document.getElementById('kname');if(n)n.remove();document.body.classList.add('kmode');kUIbuild();kCanvas();kZ.cv.style.display='block';document.getElementById('kui').hidden=false;
 const H=KVOR.home;kZ.S=H.S;kZ.camX=H.x-kViewW()/2+200;kZ.camY=1400-kViewH()*.55;kClamp();kBuildStatic();KON=true;KW.last=0;cancelAnimationFrame(KW.raf);KW.raf=requestAnimationFrame(kLoop);kHud(1);kUI();
 if(KG.day===1&&KG.t<7&&!KG.l.tl.on)setTimeout(()=>kToast('Tipp: Baue zuerst den Tellerlift – 🔨 Bauen › Lifte',5000),900);kSave()}
function kLeave(to){kSave();KON=false;cancelAnimationFrame(KW.raf);if(kZ.cv)kZ.cv.style.display='none';const u=document.getElementById('kui');if(u)u.hidden=true;KW.open=null;
 if(to==='map')kMap();else kToTitle()}
function kRestartBerg(){const id=KG.id;KW.rsAsk=0;try{localStorage.removeItem(KBK(id))}catch(e){}KG=null;kStart(id,1)}
// Berg-Bilanz
function kBergEnd(lost){const st=lost?0:kBergStars();kCareerLoad();const before=KC.best[KG.id]||0;KC.best[KG.id]=Math.max(before,st);KC.res[KG.id]={st,res:kSeaHistRes(),d:Date.now()};kCareerSave();KW.endR={st,before,lost,xp:kXP()};KG.done=1;kSave();KW.modal=1;KW.paused=true;kOpen('end')}
function kSeaHistRes(){const S=KG.seaHist;if(!S.length)return kSeaRes();return S.reduce((a,s)=>a+s.res,0)}
function kEndHTML(){const R=KW.endR||{st:0,before:0,xp:kXP()};const i=KBERGE.findIndex(b=>b.id===KG.id),nx=KBERGE[i+1];const gain=Math.max(0,R.st-R.before);
 let h=`<div class="kneu"><h3>${R.lost?'💸 Pleite!':'🏁 '+KVOR.n+' – Bilanz'}</h3></div>`;
 if(R.lost)h+=`<p style="font-size:15px">Die Kassa lag 7 Tage hintereinander unter dem Kreditrahmen. Der Berg ist verloren – du kannst ihn jederzeit neu beginnen.</p>`;
 else{h+=`<div style="text-align:center;font-size:44px;color:#e8a33a;letter-spacing:4px;margin:6px 0">${'★'.repeat(R.st)}<span style="opacity:.2">${'★'.repeat(3-R.st)}</span></div>`;
  h+=KVOR.goals.map((g,j)=>`<div class="kgoal"><span class="s">${KG.goals[g.k]?'✅':'❌'}</span><span><b>${['Pflicht','Zusatz','Meister'][j]}:</b> ${g.t}${g.prog?'<small>'+g.prog()+'</small>':''}</span></div>`).join('');
  h+=`<div class="kpi"><div><small>Neue Erfahrung</small><b>⭐ +${gain}</b><i>${R.before?'bisher bestes: '+R.before+' ★':''}</i></div><div><small>Erfahrung gesamt</small><b>⭐ ${R.xp}</b></div><div><small>Saisonergebnis</small><b>${kfmt(kSeaHistRes())}</b></div><div><small>Sterne des Gebiets</small><b>${'★'.repeat(kStars())}</b></div></div>`;
  if(R.st>=1&&nx)h+=`<p class="hint">🔓 ${nx.n} ist jetzt offen.</p>`;if(R.st===0)h+=`<p class="hint">Ohne das Pflichtziel gibt es keinen Stern. Versuch es nochmal – es zählt das beste Ergebnis.</p>`}
 h+=`<button class="tb green" data-a="endmap" style="width:100%;margin-top:10px">🗺️ Zur Karriere-Karte</button>`;return h}

// ===== Einbindung ins Titelbild =====
(function(){const orig=window.tScn;window.tScn=function(on){$('tscn').hidden=!on;for(const id of ['tcont','tnew','tsv'])$(id).style.display=on?'none':'';$('tnote').textContent=on&&(hasSave||started)?'Freies Spiel: Ein neues Freies Spiel löscht deinen jetzigen Spielstand. Die Karriere hat eigene Spielstände.':'';
 if(!on)return;$('tscl').innerHTML=kTitleList();
 document.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{const k=b.dataset.sc;if(k==='free'){$('tscn').hidden=true;tDiff(true);return}if(k==='kar'){newAsk=false;$('tnote').textContent='';kCareerOpen();return}})};
 window.addEventListener('pagehide',()=>{if(KON)kSave()});document.addEventListener('visibilitychange',()=>{if(KON&&document.visibilityState==='hidden')kSave()})})();
// Test-Zugang
window.KAR={get G(){return KG},get V(){return KVOR},W:KW,Z:kZ,ST:KST,step:kStep,start:kStart,leave:kLeave,open:kOpen,map:kMap,career:()=>KC,careerOpen:kCareerOpen,buy:kBuy,stars:kStars,score:kScore,demand:kDemand,ui:kUI,draw:kDraw,build:kBuildStatic,
 setCam:(x,y,S)=>{if(S)kZ.S=S;kZ.camX=x;kZ.camY=y;kClamp()},thumb:kThumb,end:kBergEnd,seaRes:kSeaRes,mid:kMidnight,morning:kMorning,credit:kCredit,offer:kOffer,pq:kPQavg,wait:kWait,perkWin:kPerkWin,bergWin:kBergWin,fairT:kFairT,items:kBuildItems,canPos:kCanPos,
 all:()=>{KG.money=1e6;KG.stage=3;KG.ruf=80;KG.gT=500;for(const id of ['tl','kiosk','po','raupe','can','kinder','school','hut','hotel','bus','lw','bw','paved','lgT','lgS'])kBuy(id);KG.l.ses.on=1;kUp4();KG.bau.slice().forEach(b=>kBauApply(b));KG.bau=[];KW.neu=null;KG.money=50000;kRebuild();kUI()}};

})();
