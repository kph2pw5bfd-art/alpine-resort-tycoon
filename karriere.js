// Alpine Resort Tycoon – Karriere (Bergbahn-Karriere, K1 + K2 + K3 + K4 + K5)
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
const KV={}; // Berg-Vorlagen (K1 Sonnleiten, K2 Bichlberg, K3 Altberg, K4 Seekar, K5 Eisspitz)

// ===== Zustand =====
let KG=null;      // Spielstand des laufenden Berges
let KVOR=null;    // Vorlage des laufenden Berges
let KON=false;    // Karriere-Berg läuft
let KC=null;      // Karriere-Daten (Firma, Sterne, Vorteile)
const KKEY='art-karriere',KBK=id=>'art-kberg-'+id;
// Laufzeit (nicht gespeichert)
const KW={folks:[],cars:[],buses:[],pops:[],fx:[],chairs:{},q:{},groom:null,res:null,tech:null,school:[],win:[],T:0,acc:0,id:1,snow:[],last:0,raf:0,flk:0};

// ===== Berg-Vorlage 1: Sonnleiten – kurzer, breiter, flacher Familienhang =====
KV.sonn={id:'sonn',n:'Sonnleiten',bounds:{x0:-140,x1:1140,y0:150,y1:2140},home:{x:120,y:1060,S:1.0,cx:320,cy:1400},parkY:1530,valleyY:1480,famGoal:1,
 welcome:'Willkommen in Sonnleiten! Baue zuerst den Tellerlift (🔨 Bauen › Lifte).',tip:'Tipp: Baue zuerst den Tellerlift – 🔨 Bauen › Lifte',tipIf:()=>!KG.l.tl.on,preHint:'Sonnleiten-Gäste achten stark auf den Preis. Fair heißt: so viel wie die Gegend gerade wert ist.',
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
 hut:{x:800,y:760,in:[[612,804],[690,796],[766,778]],cost:8000,days:2,st:2,n:'Sonnalm',pid:'main'},
 bwHut:{x:808,y:1426},
 kinder:{x:148,y:1310,rx:74,ry:64,gate:[196,1362],cost:6000,days:2,st:1},
 school:{x:430,y:1404,cost:3500,days:1,st:1},
 garage:{x:868,y:1404},
 hotel:{x:700,y:1720,w:62,h:30,k:1,cost:15000,days:3,st:2,rooms:24,n:'Gasthof Sonnleiten',sign:'GASTHOF SONNLEITEN ★★',
  pin:()=>[[670,1724],[640,1724],[560,1690]].concat(KW.paths.zebra),pout:()=>kRev(KW.paths.zebra).concat([[560,1690],[640,1724],[680,1724]])},
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
KV.sonn.lamps=function(){const o=[];for(let x=96;x<=920;x+=82)o.push([x,1488]);for(let x=-100;x<=1100;x+=120)o.push([x,1576]);return o};
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

// ===== Berg-Vorlage 2: Bichlberg – langer, schmaler Waldhang mit S-Kurven, Engstellen, Speicherteich =====
KV.bich={id:'bich',n:'Bichlberg',am:'am Bichlberg',bounds:{x0:-120,x1:1120,y0:-30,y1:2200},home:{x:300,y:1700,S:1.0,cx:330,cy:1760},
 desc:'Ein langer, schmaler Hang in S-Kurven durch dichten Mischwald. Der Schnee ist hier knapp – ohne Schneekanonen geht es nicht. An zwei Engstellen stauen sich die Gäste.',
 stages:4,seasons:2,start:600,snow0:34,kioskAlways:1,runRef:700,
 welcome:'Willkommen am Bichlberg! Der untere Sessel läuft schon. Der Schnee ist knapp – spare auf Schneekanonen (🔨 Bauen › Piste).',
 tip:'Tipp: Ohne Schneekanonen wird die Piste bei Tauwetter schnell grün – 🔨 Bauen › Piste',
 preHint:'Am Bichlberg kommen viele Könner – sie zahlen für eine lange Abfahrt etwas mehr. Fair heißt: so viel wie die Gegend gerade wert ist.',
 mix:{fam:.32,anf:.16,pro:.30,sb:.22},priceSens:1.05,
 // Tauwetter 1,7-mal so oft, Neuschnee nur 60 % von Sonnleiten
 wx:{sonne:.466,neuschnee:.144,tau:.32,sturm:.07},
 snowDW:{neuschnee:15,sturm:4,tau:-9,sonne:-1.5},tauPQ:.001,
 rivals:['Hochwaldlift','Gaisberg-Bahnen','Lifte am Kreuzjoch','Schattseit-Lift','Rauchkogel','Zwieselalm','Brandnerhang','Tauernblick-Lifte','Waldegg','Schlossberglift'],
 rivS:[740,680,630,580,530,480,440,400,350,300],rivG:1.3,
 parkY:1902,valleyY:1700,walkY:1864,road:{y:1972},bus:{x:380,y:1963},zebra:null,starTh:[0,0,340,460,580,700],
 // Pisten: lange Abfahrt in Abschnitten (Stufe nach Höhe), Zubringer von den Stationen, Umfahrung der unteren Engstelle
 pistes:[
  {id:'main',n:'Bichlberg-Abfahrt',col:'b',st:1,wear:.05,sec:[[1462,1],[960,2],[642,3],[-1e9,4]],
   pts:[[520,182,28],[598,300,33],[640,430,35],[566,560,34],[440,650,35],[364,760,33],[372,850,24],[384,890,15],[400,930,24],[430,980,34],[560,1070,36],[648,1170,32],[648,1235,22],[640,1275,14],[620,1318,22],[566,1390,34],[452,1480,38],[418,1600,44],[452,1690,44],[400,1740,30],[324,1758,16]]},
  {id:'umf',n:'Umfahrung',col:'r',st:2,need:'umf',via:'main',wear:.055,pts:[[636,1126,22],[690,1160,26],[736,1200,27],[764,1290,27],[732,1380,27],[650,1430,27],[560,1452,26]]},
  {id:'c1',n:'Zubringer',col:'b',st:1,conn:1,pts:[[278,1398,9],[344,1438,10],[414,1468,12]]},
  {id:'c2',n:'Zubringer',col:'b',st:2,conn:1,pts:[[264,1012,9],[331,994,10],[402,968,12]]},
  {id:'c3',n:'Zubringer',col:'b',st:3,conn:1,pts:[[276,632,9],[339,644,10],[406,650,12]]},
  {id:'c4',n:'Zubringer',col:'b',st:4,conn:1,pts:[[452,196,9],[473,194,10],[496,186,12]]}],
 // Lift-Kette: jede Ausbaustufe ein Abschnitt, Mittelstationen teilen sich die Station
 lifts:[
  {id:'l1',n:'Talsessel',sh:'Sessel 1',typ:'s2',st:1,b:[236,1770],t:[252,1390],nx:'l2',conn:'c1',pistes:['c1','main'],exit:[270,1402],bn:'Talstation',tn:'Mittelstation 1',ovh:1500,up:1,upF:.6},
  {id:'l2',n:'Mittelsessel',sh:'Sessel 2',typ:'s2',st:2,b:[252,1390],t:[238,1006],nx:'l3',conn:'c2',pistes:['c2','main'],exit:[256,1016],bn:'Mittelstation 1',tn:'Mittelstation 2',ovh:1500,up:1,upF:.6},
  {id:'l3',n:'Waldsessel',sh:'Sessel 3',typ:'s2',st:3,b:[238,1006],t:[250,624],nx:'l4',conn:'c3',pistes:['c3','main'],exit:[268,636],bn:'Mittelstation 2',tn:'Mittelstation 3',ovh:1500,up:1,upF:.6},
  {id:'l4',n:'Gipfelsessel',sh:'Sessel 4',typ:'s2',st:4,b:[250,624],t:[428,192],nx:null,conn:'c4',pistes:['c4','main'],exit:[446,204],bn:'Mittelstation 3',tn:'Bergstation',ovh:1500,up:1,upF:.6}],
 kassa:{x:360,y:1830},
 lots:[{id:'p1',n:'Parkplatz',x0:-96,x1:300,y0:1872,y1:1928,base:1},{id:'p2',n:'Parkplatz Ost',x0:440,x1:944,y0:1872,y1:1928,cost:3000}],
 hut:{x:790,y:560,in:[[602,552],[690,562],[766,566]],cost:9000,days:2,st:4,n:'Waldhütte',pid:'main'},
 garage:{x:604,y:1792},bwHut:{x:530,y:1810},bwStart:[554,1818],resPre:[[520,1772],[440,1756]],
 hotel:{x:770,y:1836,w:62,h:30,k:1,cost:15000,days:3,st:2,rooms:24,n:'Gasthof Bichl',sign:'GASTHOF BICHL ★★',
  pin:()=>[[740,1846],[740,1864],[360,1864],[360,1838]],pout:()=>[[360,1838],[360,1864],[740,1864],[740,1846],[752,1840]]},
 cannons:{cost:6000,st:1},can2:{cost:8000,st:3},
 teich:{cost:12000,days:3,st:2,poly:[[740,930],[800,900],[880,912],[918,960],[900,1020],[830,1046],[756,1030],[724,982]],pump:[890,1050]},
 umf:{cost:8000,days:2,st:2},
 goals:[
  {k:'pf',t:'Schneekanonen in Betrieb und 2 Sterne',sh:'Kanonen + 2 ★',prog:()=>(KG.canEver?'Kanonen ✓':KG.b.cannons?'Kanonen gekauft':'keine Kanonen')+' · '+kStars()+' ★',ok:()=>!!KG.canEver&&kStars()>=2,lock:1},
  {k:'zu',t:'Platz 6 oder besser in der Rangliste',sh:'Platz 6',prog:()=>'jetzt Platz '+kRank(),ok:()=>kRank()<=6,lock:1},
  {k:'me',t:'Pistenzustand in der letzten Woche nie unter 60 %',sh:'Piste ≥ 60 %',prog:()=>kBichLW(),ok:()=>!!KG.lwSeen&&(KG.lwMin==null||KG.lwMin>=60),end:1}],
 stageInfo:[null,
  {n:'Talabfahrt',d:'2er-Sessel bis zur Mittelstation 1 und der untere Teil der Bichlberg-Abfahrt.'},
  {n:'Mittelstation 2',d:'Zweiter Sessel bis zur Mittelstation 2. Die Abfahrt wird doppelt so lang – mit der unteren Engstelle.',cost:5000,days:2,req:[['ruf',52,'Ruf mindestens 52 %'],['gst',120,'120 Gäste insgesamt']]},
  {n:'Mittelstation 3',d:'Dritter Sessel bis zur Mittelstation 3 – die Abfahrt führt jetzt auch durch die obere Engstelle.',cost:12000,days:2,req:[['can',1,'Schneekanonen gekauft'],['ruf',58,'Ruf mindestens 58 %']]},
  {n:'Gipfel',d:'Gipfelsessel bis ganz oben – die ganze Bichlberg-Abfahrt in S-Kurven. Die Waldhütte kann gebaut werden.',cost:20000,days:3,req:[['stars',2,'2 Sterne'],['ruf',62,'Ruf mindestens 62 %']]}],
 fair:{ticket:[0,22,28,33,38],park:3,food:13,kids:7,school:24,hotel:50}
};
// Pistenzustand in der letzten Woche (Meister-Ziel)
function kBichLW(){const last=kSeaN()===KVOR.seasons&&kSeaD()>=KSL-6;if(KG.lwSeen)return 'tiefster Wert bisher: '+Math.round(KG.lwMin)+' %';return last?'zählt ab heute':'zählt ab MO • Woche 4 der Saison '+KVOR.seasons}
KV.bich.init=function(s){s.l.l1.on=1;s.snow=34;s.b.can2=0;s.b.teich=0;s.b.umf=0;s.b.bus2=0;s.wat=100};
KV.bich.lamps=function(){const o=[];for(let x=-40;x<=960;x+=82)o.push([x,1860]);for(let x=-100;x<=1100;x+=120)o.push([x,1948]);return o};
// Ausbau-Abschnitte und Zubringer verknüpfen, Engstellen finden
KV.bich.world=function(){const M=KW.pmap.main;const near=(P,x,y)=>{let b=0,bd=1e9;for(const q of P.d){const d=Math.hypot(q[0]-x,q[1]-y);if(d<bd){bd=d;b=q[3]}}return b};
 for(const id of ['c1','c2','c3','c4']){const C=KW.pmap[id],e=C.d[C.d.length-1];C.next={p:'main',s:near(M,e[0],e[1])}}
 const U=KW.pmap.umf,u0=U.d[0],u1=U.d[U.d.length-1];U.next={p:'main',s:near(M,u1[0],u1[1])};M.br={s:near(M,u0[0],u0[1]),p:'umf'};
 // Engstellen: wo die Abfahrt schmaler als 24 ist
 const E=[];let cur=null;for(const q of M.d){if(q[2]<=23.5&&q[1]<1600){if(!cur){cur={s0:q[3],s1:q[3],w:q[2],y:q[1]}}cur.s1=q[3];if(q[2]<cur.w){cur.w=q[2];cur.y=q[1]}}else if(cur){E.push(cur);cur=null}}if(cur)E.push(cur);
 E.sort((a,b)=>a.s0-b.s0);E.forEach((e,i)=>{e.id='e'+(i+1);e.n='Engstelle '+(i+1);e.h=i===0?.36:.3;e.vf=.62;e.q=[];e.last=-1e9});M.eng=E;KW.eng=E};
KV.bich.paths=function(){const k=KV.bich.kassa,W=KV.bich.walkY;return {
 kL1:[[k.x,k.y+8],[328,1848],[292,1834]],
 busUp:[[380,1948],[372,1906],[366,W],[k.x,W],[k.x,k.y+8]],
 zebra:[]}};
KV.bich.drawPaths=function(c){const k=KVOR.kassa,W=KVOR.walkY;
 kPathLine(c,[[k.x,k.y+8],[328,1848],[292,1834],[262,1816]],9);kPathLine(c,[[k.x,k.y+6],[k.x,W]],9);
 kPathLine(c,[[380,1946],[372,1906],[366,W]],7);
 if(KG.b.hut){c.strokeStyle='#e9dcc4';c.lineWidth=6;c.lineCap='round';c.beginPath();KVOR.hut.in.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
 if(KG.hotel)kPathLine(c,[[740,1846],[740,W]],7)};
// Wer ist wo? kas = Tal/Kassa · l1..l4 = am Fuß dieses Liftes (Talstation, Mittelstationen)
KV.bich.where=function(f){const K=KVOR.kassa;if(Math.hypot(f.x-K.x,f.y-K.y)<70||f.y>1840)return 'kas';
 for(const L of KVOR.lifts){if(Math.hypot(f.x-L.b[0],f.y-L.b[1])<120)return L.id}return f.y>1650?'kas':'x'};
KV.bich.route=function(from,to,f){const P=KW.paths,K=KVOR.kassa;
 if(from===to)return to==='l1'&&f&&f.x>270&&f.y<1800?[[292,1798]]:[];
 if(from==='kas'&&to==='l1')return P.kL1.slice();
 if(from==='l1'&&to==='kas')return (f&&f.x>270&&f.y<1800?[[292,1800]]:[]).concat(kRev(P.kL1));
 return [[K.x,K.y+8]]};
KV.bich.chooseLift=function(f){return 'l1'};
// Aussteigen oben: weiter mit dem nächsten Sessel oder über den Zubringer abfahren
KV.bich.unload=function(o,f){const L=o.L,nx=L.nx;
 if(nx&&KG.l[nx].on&&kLiftOpen(nx)&&KG.t<15.3&&!f.leaving){const p0={pro:.86,sb:.82,fam:.55,anf:.3}[f.ty]||.6;let p=f.kid?p0*.8:p0;const w=kWait(nx);if(w>18)p*=.55;else if(w>10)p*=.8;
  if(kR()<p){kToQueue(f,nx);return}}
 kSkiStart(f,L.conn)};
// Umfahrung: Könner nehmen sie gern, bei Stau an der Engstelle auch andere
KV.bich.branch=function(f,br){if(!KG.b.umf)return 0;const E=KW.eng&&KW.eng[1];const jam=E?E.q.length:0;let p={pro:.8,sb:.72,fam:.28,anf:.08}[f.ty]||.4;if(f.kid)p*=.5;if(jam>=3)p+=.25;if(jam>=7)p+=.2;return kR()<Math.min(.95,p)};
// Lift geschlossen, Gast steht an einer Mittelstation: auf Skiern hinunter
KV.bich.descend=function(f){if(f.st==='hurt'&&f.pid){f.st='ski';f.v=Math.min(f.v||20,20);f.leaveT=0;f.engIn=null;f.engQ=null;f.engHold=0;return true}
 if(f.st==='ski')return false;const w=KV.bich.where(f);if(w==='kas'||w==='l1')return false;const lo=kLowerOf(w);if(!lo)return false;
 f.leaveT=0;f.x=lo.exit[0];f.y=lo.exit[1];kSkiStart(f,lo.conn);return true};
// Nebel am Morgen
KV.bich.busT=function(){return KG.b.bus2?[8.4,8.9,9.4,9.9,10.4]:[8.65,9.65,10.65]};
KV.bich.morning=function(){if(KG.b.bus2&&KG.dem>0)KG.busShare=Math.min(.45,150/KG.dem);KG.fog=(KG.wx==='sonne'||KG.wx==='tau')&&kR()<.38?1:0;if(KG.fog)kLog('🌫️','Morgennebel im Tal – die Gäste kommen heute etwas später.');for(const e of KW.eng||[])e.q=[]};
// Speicherteich, Meister-Ziel, Stau aufräumen
KV.bich.tick=function(dt,dth){// Tauwetter weicht die Piste tagsüber auf (die Raupe richtet sie nachts wieder her)
 if(KG.wx==='tau'&&KG.t>=10&&KG.t<16)for(const k in KG.pq)KG.pq[k]=Math.max(0,KG.pq[k]-dth*2.4);
 if(KG.b.teich){if(KW.canOn)KG.wat=Math.max(0,KG.wat-dth*6);else KG.wat=Math.min(100,KG.wat+dth*4)}
 if(kSeaN()===KVOR.seasons&&kSeaD()>=KSL-6&&KG.t>=8.6&&KG.t<16.25&&!KG.done){const q=kPQavg();KG.lwSeen=1;KG.lwMin=KG.lwMin==null?q:Math.min(KG.lwMin,q)}
 for(const e of KW.eng||[])if(e.q.length)e.q=e.q.filter(f=>f.st==='ski'&&f.engQ===e&&!f.dead)};
// Schneekanonen: Abdeckung (unten/oben) und Wasser (Bach allein reicht nur halb)
function kBichCov(){const M=KW.pmap.main,L=M.d[M.d.length-1][3],s0=kOpenS(M),y0=960;let lo=0,hi=0;const sMid=(()=>{for(const q of M.d)if(q[1]>=y0)return q[3];return L})();
 lo=L-Math.max(s0,sMid);hi=Math.max(0,sMid-s0);const tot=L-s0;let c=KG.b.cannons?lo:0;if(KG.b.can2)c+=hi;return tot>0?kcl(c/tot,0,1):0}
KV.bich.canF=function(){return kBichCov()*(KG.b.teich&&KG.wat>0?1:.5)};
KV.bich.canCost=function(){return 150+(KG.b.can2?150:0)};
KV.bich.costs=function(c,tm){if(KG.b.teich)c.teich=Math.round(60*tm);if(KG.b.bus2)c.bus=(c.bus||0)+100};
KV.bich.canPos=function(){const M=KW.pmap.main,out=[];let acc=0,side=1;const r=kRNG(7);
 const ok=(x,y)=>{if(kOnP(x,y,4)||kOnP(x,y-12,7)||kOnP(x+(x<0?0:0),y-20,4))return 0;for(const L of KVOR.lifts){const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(Math.hypot(x-L.b[0]-dx*u,y-L.b[1]-dy*u)<30)return 0}for(const b of KST.blocks)if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])return 0;return 1};
 for(let i=1;i<M.d.length;i++){const a=M.d[i-1],q=M.d[i];acc+=Math.hypot(q[0]-a[0],q[1]-a[1]);if(acc<92)continue;if(q[1]>1700)continue;const up=q[1]<960;if(up&&!KG.b.can2||!up&&!KG.b.cannons)continue;if(!kPtOpen(M,q))continue;
  for(const sg of [side,-side]){const x=q[0]+q[4]*(q[2]+12)*sg,y=q[1]+q[5]*(q[2]+12)*sg;if(ok(x,y)){out.push({x,y,sd:sg,ph:r()*20});acc=0;side=-side;break}}}
 return out};
// Angebot (für die Sterne)
KV.bich.offer=function(){let o=0;const b=KG.b;for(const id in KG.l){const l=KG.l[id];if(!l.on)continue;o+=45+(l.typ==='s4'?25:l.typ==='s6'?45:0)+(l.lg||0)*10}
 o+=(KG.stage-1)*40;o+=30;if(b.umf)o+=30;
 o+=(b.cannons?35:0)+(b.can2?25:0)+(b.teich?45:0)+(b.raupe?30:0)+(b.kiosk?15:0)+(b.hut?50:0)+(KG.hotel?45:0)+(b.bus?20:0)+(b.bus2?10:0)+(b.bw?15:0)+(b.lw?10:0)+(KG.paved?15:0);
 for(const L of KVOR.lots)if(!L.base&&KG.lots[L.id])o+=15;return o};
KV.bich.att=function(){return (KG.b.umf?.03:0)+(KG.hotel?.02:0)};
// Pistenraupe: Abfahrt hinauf und hinunter, Umfahrung über die Abfahrt erreichen (nie quer durch den Wald)
KV.bich.groomPlan=function(){const M=KW.pmap.main,L=M.d[M.d.length-1][3],s0=kOpenS(M),off=(P,s,k)=>{const q=kAt(P.d,s);return [q[0]+q[3]*q[2]*k,q[1]+q[4]*q[2]*k]};const run=(P,a,b,k)=>{const o=[];if(a>b)for(let s=a;s>=b;s-=12)o.push(off(P,s,k));else for(let s=a;s<=b;s+=12)o.push(off(P,s,k));return o};
 const A=[[560,1786],[480,1762],[400,1756]];const out=[{p:'x',pts:A},{p:'main',pts:run(M,L,s0,.42)},{p:'main',pts:run(M,s0,L,-.42),fin:1}];
 if(KG.b.umf&&kPisteOpen(KW.pmap.umf)){const U=KW.pmap.umf,UL=U.d[U.d.length-1][3];out.push({p:'x',pts:run(M,L,U.next.s,0)},{p:'umf',pts:run(U,UL,0,.4)},{p:'umf',pts:run(U,0,UL,-.4),fin:1},{p:'x',pts:run(M,U.next.s,L,0)})}
  out.push({p:'x',pts:kRev(A)});return out};
// Bauen
KV.bich.items=function(){const V=KVOR,st=KG.stage,l=KG.l,b=KG.b,lf=KPK('lift')?.9:1,sf=KPK('schnee')?.85:1,bau=id=>KG.bau.find(x=>x.id===id||x.lift===id);
 const I=[];const add=(tab,o)=>{o.tab=tab;I.push(o)};
 for(const s of [2,3,4]){const S=V.stageInfo[s];const rq=S.req.map(r=>({t:r[r.length-1],ok:kReq(r)}));add('aus',{id:'st'+s,ic:['','','🚡','🌲','🏔️'][s],n:'Ausbau Stufe '+s+': '+S.n,d:S.d,c:Math.round(S.cost*lf),days:kBauDays(S.days),done:st>=s,bau:KG.bau.find(x=>x.k==='stage'&&x.st===s),lock:st<s-1?'erst Stufe '+(s-1):rq.some(r=>!r.ok)?'Voraussetzungen fehlen':'',rq})}
 for(const L of V.lifts){if(st<L.st)continue;const s=l[L.id],on=s.on,nm=L.n,rt=L.bn+' → '+L.tn+'. ',lk=!on?'im Bau':'';
  const t4=s.typ==='s4'||s.typ==='s6',b4=KG.bau.find(x=>x.k==='up'&&x.lift===L.id);
  if(L.id==='l1'&&t4)add('lif',{id:'up6_l1',ic:'🚡',n:nm+': 6er-Sessel',d:rt+'Noch mehr Plätze am Talsessel – hier steigen alle Gäste ein.',c:Math.round(18000*lf),days:kBauDays(1),done:s.typ==='s6',bau:b4});
  else add('lif',{id:'up4_'+L.id,ic:'🚡',n:nm+': 4er-Sessel',d:rt+'Doppelt so viele Plätze je Sessel – die Schlange wird kürzer. Der Lift steht bis zum nächsten Morgen.',c:Math.round(6000*lf),days:kBauDays(1),done:t4,bau:b4,lock:lk});
  add('lif',{id:'lg_'+L.id,ic:'💺',n:nm+': mehr Sessel',d:rt+'Zusätzliche Sessel am Seil – mehr Gäste pro Stunde.',c:Math.round(2500*lf),done:(s.lg||0)>=2,lock:lk,lv:(s.lg||0)+' / 2'})}
 add('pis',{id:'can',ic:'❄️',n:'Schneekanonen unten',d:'Beschneien nachts die Abfahrt bis zur Mittelstation 2. Ohne Speicherteich reicht das Bachwasser nur für halbe Leistung.',c:Math.round(V.cannons.cost*sf),done:!!b.cannons,up:'Strom je Nacht'});
 add('pis',{id:'can2',ic:'❄️',n:'Schneekanonen oben',d:'Weitere Kanonen bis zum Gipfel – dann wird die ganze Abfahrt beschneit.',c:Math.round(V.can2.cost*sf),done:!!b.can2,lock:st<3?'erst Stufe 3':!b.cannons?'erst Kanonen unten':''});
 add('pis',{id:'teich',ic:'💧',n:'Speicherteich',d:'Besonderes Gebäude: Teich mit Pumpenhaus am Hang. Die Kanonen bekommen genug Wasser und schaffen die volle Leistung.',c:V.teich.cost,days:kBauDays(V.teich.days),done:!!b.teich,bau:bau('teich'),lock:st<2?'erst Stufe 2':'',up:'60 €/Tag'});
 add('pis',{id:'umf',ic:'🔴',n:'Umfahrung der unteren Engstelle',d:'Rote Piste durch den Wald um die Engstelle 2 herum. Könner fahren lieber außen herum – der Stau wird kleiner.',c:V.umf.cost,days:kBauDays(V.umf.days),done:!!b.umf,bau:bau('umf'),lock:st<2?'erst Stufe 2':''});
 add('pis',{id:'raupe',ic:'🚜',n:'Pistenraupe mit Garage',d:'Präpariert nachts die ganze offene Abfahrt. Ohne Raupe werden die Pisten immer schlechter.',c:5000,done:!!b.raupe});
 add('gas',{id:'kiosk',ic:'🌭',n:'Kiosk an der Kassa',d:'Würstel, Tee und Kakao – die einfachste Mittagspause.',c:1500,days:0,done:!!b.kiosk});
 add('gas',{id:'hut',ic:'🛖',n:'Waldhütte',d:'Hütte oberhalb der Engstellen. Wer vom Gipfel abfährt, kehrt mittags gern ein.',c:V.hut.cost,days:kBauDays(V.hut.days),done:!!b.hut,bau:bau('hut'),lock:st<4?'erst Stufe 4':''});
 add('gas',{id:'hotel',ic:'🏨',n:'Gasthof Bichl',d:'24 Zimmer direkt am Gehweg: Hotelgäste kommen ohne Auto und bringen jede Nacht Geld.',c:V.hotel.cost,days:kBauDays(V.hotel.days),done:!!KG.hotel,bau:bau('hotel'),lock:st<2?'erst Stufe 2':''});
 add('anr',{id:'p2',ic:'🅿️',n:'Parkplatz Ost',d:'28 weitere Stellplätze rechts der Kassa – ist der Parkplatz voll, drehen die Gäste um.',c:3000,done:!!KG.lots.p2});
 add('anr',{id:'paved',ic:'🛣️',n:'Parkplätze asphaltieren',d:'Kein Schotter mehr – sieht ordentlicher aus und bringt etwas Ansehen.',c:4000,done:!!KG.paved});
 add('anr',{id:'bus',ic:'🚌',n:'Skibus',d:'Morgens bringen 3 Busse je bis zu 30 Gäste ohne Auto, nachmittags holen sie sie wieder ab.',c:3000,done:!!b.bus,up:'150 €/Tag'});
 add('anr',{id:'bus2',ic:'🚌',n:'Skibus alle 30 Minuten',d:'5 Busse am Morgen statt 3 – bis zu 150 Gäste ohne Auto. Hilft, wenn die Parkplätze voll sind.',c:4000,done:!!b.bus2,lock:!b.bus?'erst Skibus':st<3?'erst Stufe 3':'',up:'+100 €/Tag'});
 add('per',{id:'lw',ic:'🔧',n:'Liftwart',d:'Repariert Störungen in kurzer Zeit. Ohne Liftwart kommt ein Techniker von außen (650 €, über 1 Stunde).',c:2500,done:!!b.lw,up:'130 €/Tag'});
 add('per',{id:'bw',ic:'⛑️',n:'Bergwacht',d:'Holt Verletzte mit dem Motorschlitten und Akja von der langen Abfahrt. Ohne Bergwacht leidet der Ruf.',c:KPK('bw')?0:4000,done:!!b.bw,up:KPK('bw')?'Verein · ohne Lohn':'140 €/Tag'});
 return I};
KV.bich.buy=function(id,I,pay){
 if(/^st[234]$/.test(id)){const s=+id[2];pay();kBauStart({k:'stage',st:s,n:'Ausbau Stufe '+s,days:I.days,lift:'l'+s,id:'st'+s});return true}
 if(id.startsWith('up4_')||id==='up6_l1'){const L=id.slice(4),typ=id.startsWith('up6')?'s6':'s4';pay();if(I.days>0){KG.bau.push({k:'up',id,lift:L,typ,n:kLC(L).n+': '+KLT[typ].n,d0:KG.day,days:I.days});kLog('🚧','Umbau '+kLC(L).n+' auf '+KLT[typ].n+' – der Lift steht bis zum Morgen.');KG.l[L].on=0;if(KW.lift[L])for(const f of KW.lift[L].q.splice(0))kGoHome(f)}else kUpLift(L,typ);return true}
 if(id.startsWith('lg_')){const L=id.slice(3);pay();KG.l[L].lg=(KG.l[L].lg||0)+1;kLiftSetup(L);kLog('💺','Mehr Sessel am '+kLC(L).n+'.');return true}
 if(id==='can2'){pay();KG.b.can2=1;kLog('❄️','Schneekanonen oben – gekauft.');return true}
 if(id==='teich'||id==='umf'){pay();kBauStart({k:'b',id,n:I.n,days:I.days});return true}
 if(id==='p2'){pay();KG.lots.p2=1;kLog('🅿️','Parkplatz Ost ist offen.');return true}
 if(id==='bus2'){pay();KG.b.bus2=1;kLog('🚌','Ab morgen fährt der Skibus alle 30 Minuten.');return true}
 return false};
// Gebäude zeichnen
KV.bich.drawB=function(add,t){const V=KVOR;
 const K=V.kassa;add(K.y,c=>kKassaDraw(c,K.x,K.y));if(KG.b.kiosk)add(K.y+8,c=>kKioskDraw(c,K.x+38,K.y+8,t));
 // Lift-Stationen: Talstation, Mittelstationen (eine Station für zwei Sessel), Bergstation
 for(const L of V.lifts){const s=KG.l[L.id],bau=KG.bau.find(b=>b.lift===L.id&&b.k!=='up'),lo=kLowerOf(L.id);
  if(bau){if(!lo)add(L.b[1]+20,c=>kSite(c,L.b[0],L.b[1]+10,60,t));add(L.t[1]+20,c=>kSite(c,L.t[0],L.t[1]+10,50,t));continue}
  const up=KG.bau.find(b=>b.k==='up'&&b.lift===L.id);
  if(!s.on&&!up)continue;const co=KLT[s.typ].co;
  if(!lo)add(L.b[1]+22,c=>{liftStation(c,L.b[0],L.b[1],co,true);kBrkSign(c,L,t);if(up)kSign(c,L.b[0],L.b[1]-48,'🚧 UMBAU','#f2701f','#fff',6)});
  else if(up)add(L.b[1]+30,c=>kSign(c,L.b[0],L.b[1]-56,'🚧 UMBAU','#f2701f','#fff',6));
  const nx=L.nx&&KG.l[L.nx]&&KG.l[L.nx].on;
  add(L.t[1]+18,c=>{liftStation(c,L.t[0],L.t[1],nx?KLT[KG.l[L.nx].typ].co:co,false);kSign(c,L.t[0],L.t[1]-36,L.tn.toUpperCase(),'#fff','#2b3a55',5.5);if(nx){const N=kLC(L.nx);kBrkSign(c,N,t)}})}
 // Waldhütte
 if(KG.b.hut)add(V.hut.y,c=>{kHutDraw(c,V.hut.x,V.hut.y,t);kSign(c,V.hut.x,V.hut.y-56,'WALDHÜTTE','#8f5a34','#fff',6)});else if(KG.bau.find(b=>b.id==='hut'))add(V.hut.y,c=>kSite(c,V.hut.x,V.hut.y,64,t));
 // Speicherteich: Pumpenhaus
 const T=V.teich,[px,py]=T.pump;if(KG.b.teich)add(py,c=>kPumpDraw(c,px,py,t));else if(KG.bau.find(b=>b.id==='teich'))add(py-40,c=>kSite(c,830,980,90,t));
 // Umfahrung im Bau: Holzfäller
 if(KG.bau.find(b=>b.id==='umf'))for(const [x,y] of [[736,1200],[740,1370]])add(y,c=>kSite(c,x,y,50,t));
 // Garage + Bergwacht
 if(KG.b.raupe)add(V.garage.y+8,c=>kGarage(c,V.garage.x,V.garage.y,t));
 if(KG.b.bw)add(V.bwHut.y,c=>kBwHut(c,V.bwHut.x,V.bwHut.y,t));
 // Gasthof
 const H=V.hotel;if(KG.hotel)add(H.y,c=>kHotelDraw(c,H,t));else if(KG.bau.find(b=>b.id==='hotel'))add(H.y,c=>{chalet(c,H.x,H.y,H.w,H.h,H.k);kSign(c,H.x,H.y-H.h-24,H.sign,'#8f5a34','#fff',5.4);kSite(c,H.x,H.y+6,80,t,1)});
 // neue Abschnitte im Bau: Holzfäller auf der Trasse
 const sb=KG.bau.find(b=>b.k==='stage');if(sb){const S={2:[[560,1070],[620,1318]],3:[[364,760],[400,930]],4:[[598,300],[566,560]]}[sb.st]||[];for(const [x,y] of S)add(y,c=>kSite(c,x,y,50,t))}
 // Engstellen: Warnschilder, Stau-Anzeige
 for(const E of KW.eng||[]){if(!kPtOpen(KW.pmap.main,kAt(KW.pmap.main.d,E.s0)))continue;const M=KW.pmap.main,q=kAt(M.d,E.s0-6);for(const sd of [-1,1]){const x=q[0]+q[3]*(q[2]+10)*sd,y=q[1]+q[4]*(q[2]+10)*sd;add(y,c=>kEngSign(c,x,y))}
  if(E.q.length>=4){const m=kAt(M.d,E.s0-8),sd=m[3]>0?1:-1,x=m[0]+m[3]*(m[2]+34)*sd,y=m[1]+m[4]*(m[2]+34)*sd;add(y+30,c=>kSign(c,x,y-26,'⏳ STAU · '+E.q.length,'#e8504a','#fff',6.5))}}};
function kEngSign(c,x,y){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+1.5,y+1,3.5,1.2,0,0,7);c.fill();c.fillStyle='#5d667a';c.fillRect(x-.6,y-12,1.2,12);
 c.fillStyle='#f2c53b';c.beginPath();c.moveTo(x,y-19);c.lineTo(x+5,y-11);c.lineTo(x-5,y-11);c.closePath();c.fill();c.strokeStyle='#2b3040';c.lineWidth=.5;c.stroke();c.fillStyle='#2b3040';c.fillRect(x-.45,y-17,.9,3.4);c.fillRect(x-.45,y-12.8,.9,.9)}
function kPumpDraw(c,x,y,t){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+4,y+2,20,4,0,0,7);c.fill();c.fillStyle='#cfd6df';c.fillRect(x-16,y-18,32,20);c.fillStyle='#aab3c0';c.fillRect(x+4,y-18,12,20);c.fillStyle='#3a78d0';c.fillRect(x-12,y-10,8,12);
 c.fillStyle='#5b6578';c.beginPath();c.moveTo(x-19,y-17);c.lineTo(x-13,y-26);c.lineTo(x+13,y-26);c.lineTo(x+19,y-17);c.closePath();c.fill();c.fillStyle='#fff';c.fillRect(x-14,y-26,28,3);
 c.fillStyle='#a8dcf5';c.fillRect(x+6,y-13,7,6);kWin(x+6,y-13,7,6);if(KW.canOn)hSmoke(c,x+10,y-24,t,1);kSign(c,x,y-34,'💧 SPEICHERTEICH','#2f86cf','#fff',5.5)}
// Teich: Wasserspiegel sinkt, wenn die Kanonen laufen
KV.bich.drawDyn=function(c,t){kBichGreen(c);kBichTeich(c,t,0)};
function kBichTeich(c,t,force){const T=KVOR.teich,P=T.poly,cx=820,cy=972;if(!force&&!kInV(cx,cy,200))return;
 if(!KG.b.teich){if(KG.stage>=2&&!KG.bau.find(b=>b.id==='teich')){c.strokeStyle='rgba(120,150,190,.55)';c.lineWidth=1;c.setLineDash([5,4]);c.beginPath();P.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.closePath();c.stroke();c.setLineDash([]);kSign(c,cx,cy,'💧 Speicherteich · im Baumenü','rgba(43,58,85,.65)','#fff',8)}else if(KG.bau.find(b=>b.id==='teich')){c.fillStyle='rgba(185,171,147,.5)';c.beginPath();P.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.closePath();c.fill()}return}
 const sc=(k,dy=0)=>{c.beginPath();P.forEach((q,i)=>{const x=cx+(q[0]-cx)*k,y=cy+(q[1]-cy)*k+dy;i?c.lineTo(x,y):c.moveTo(x,y)});c.closePath()};
 // Damm/Ufer und Zaun
 c.fillStyle='#d9e6f3';sc(1.1);c.fill();c.fillStyle='#c9b9a0';sc(1.0);c.fill();
 const lv=.62+.38*KG.wat/100;const g=c.createLinearGradient(0,900,0,1046);g.addColorStop(0,'#7cc4e4');g.addColorStop(1,'#4f9fcf');c.fillStyle=g;sc(lv,(1-lv)*14);c.fill();
 // Eisrand oben und Glanz
 c.save();sc(lv,(1-lv)*14);c.clip();c.fillStyle='rgba(235,247,255,.92)';c.beginPath();c.moveTo(700,880);c.lineTo(940,880);c.lineTo(940,930);c.lineTo(870,934);c.lineTo(810,930);c.lineTo(760,952);c.lineTo(700,960);c.closePath();c.fill();
 c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1;const o=Math.sin(t*.6)*3;for(const [x,y,w] of [[800,975,40],[840,1000,30],[780,1010,22]]){c.beginPath();c.moveTo(x-w/2+o,y);c.lineTo(x+w/2+o,y);c.stroke()}c.restore();
 c.strokeStyle='#8f5a34';c.lineWidth=.9;sc(1.18);c.stroke();c.fillStyle='#8f5a34';for(const q of P){const x=cx+(q[0]-cx)*1.18,y=cy+(q[1]-cy)*1.18;c.fillRect(x-.6,y-5,1.2,5)}
 // Leitung zu den Kanonen
 c.strokeStyle='rgba(90,110,140,.35)';c.lineWidth=1.4;c.setLineDash([4,3]);c.beginPath();c.moveTo(726,990);c.quadraticCurveTo(690,1060,686,1120);c.stroke();c.setLineDash([])}
// aper Stellen bei Tauwetter / wenig Schnee (unten zuerst)
KV.bich.drawOver=function(c,t){
 // Morgennebel im Tal
 if(KG.fog&&KG.t>=5.5&&KG.t<10.8){const a=KG.t<9.6?1:1-(KG.t-9.6)/1.2;const r=kRNG(4);for(let i=0;i<30;i++){const x=-80+r()*1180,y=1560+r()*520,w=110+r()*170;if(!kInV(x,y,w))continue;const g=c.createRadialGradient(x,y,4,x,y,w);g.addColorStop(0,'rgba(248,251,255,'+(.5*a).toFixed(2)+')');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.ellipse(x,y,w,w*.3,0,0,7);c.fill()}}};
function kBichGreen(c){const M=KW.pmap.main,pq=KG.pq.main,sn=KG.snow;let k=0;if(pq<62)k=(62-pq)/62;if(sn<14)k=Math.max(k,(14-sn)/14*.8);if(KG.wx==='tau'&&sn<30)k=Math.max(k,.18);if(k<=0)return;
 const r=kRNG(9);for(const P of [M,KW.pmap.umf]){if(!kPisteOpen(P))continue;for(const q of P.d){const rv=r(),a=r()*6.28,u=.45+r()*.55,wr=6+r()*12;if(q[1]<1150||!kPtOpen(P,q))continue;const lowF=kcl((q[1]-1150)/500,0,1);if(rv>.07*k*(.3+lowF))continue;if(!kInV(q[0],q[1],40))continue;
  const x=q[0]+Math.cos(a)*q[2]*u,y=q[1]+Math.sin(a)*q[2]*.6*u,w=wr*(.6+k*.6);c.fillStyle='rgba(205,215,200,.9)';c.beginPath();c.ellipse(x,y,w+2.5,(w+2.5)*.5,0,0,7);c.fill();c.fillStyle='#8fae6a';c.beginPath();for(let j=0;j<9;j++){const tt=j/9*6.283,rr=w*(.7+.3*Math.sin(j*2.3+x));c.lineTo(x+Math.cos(tt)*rr,y+Math.sin(tt)*rr*.48)}c.closePath();c.fill();c.fillStyle='#a9c27e';c.beginPath();c.ellipse(x-w*.15,y-w*.08,w*.45,w*.18,0,0,7);c.fill()}}}
// Tippen
KV.bich.hit=function(x,y,hit,d){if((KG.b.teich||KG.bau.find(b=>b.id==='teich'))&&(kInPoly(x,y,KVOR.teich.poly)||d(KVOR.teich.pump[0],KVOR.teich.pump[1]-10)<26))hit.push({k:'tei',d:0});
 for(const E of KW.eng||[]){const m=kAt(KW.pmap.main.d,(E.s0+E.s1)/2);if(kPtOpen(KW.pmap.main,m)&&d(m[0],m[1])<34)hit.push({k:'eng:'+E.id,d:1})}
 if(KG.b.bw&&d(KVOR.bwHut.x,KVOR.bwHut.y-10)<20)hit.push({k:'bwh',d:0})};
KV.bich.infHTML=function(k){
 if(k==='tei'){if(!KG.b.teich)return kHead('💧 Speicherteich')+'<p class="hint">🚧 Im Bau.</p>';return kHead('💧 Speicherteich')+`<div class="kpi"><div><small>Wasserstand</small><b>${Math.round(KG.wat)} %</b><div class="kbar2"><i style="width:${Math.round(KG.wat)}%;background:linear-gradient(90deg,#7cc4e4,#2f86cf)"></i></div></div><div><small>Kanonen-Leistung</small><b>${Math.round(KV.bich.canF()*100)} %</b></div></div><p class="hint">Nachts holen die Schneekanonen das Wasser aus dem Teich, tagsüber füllt ihn der Bach wieder auf. Ist er leer, schaffen die Kanonen nur halbe Leistung.</p>`}
 if(k.startsWith('eng:')){const E=(KW.eng||[]).find(e=>'eng:'+e.id===k);if(!E)return '';const lower=E.id==='e2';return kHead('🚧 '+E.n)+`<div class="kpi"><div><small>Warten gerade</small><b>${E.q.length}</b></div><div><small>Breite</small><b>${Math.round(E.w*2)} m</b></div></div><p class="hint">Hier wird die Abfahrt so schmal, dass die Gäste nur einzeln durchfahren. Wenn viele kommen, entsteht Stau – das kostet Laune.${lower?(KG.b.umf?' Die Umfahrung entlastet die Stelle.':' Abhilfe: die rote Umfahrung (🔨 Bauen › Piste).'):' Abhilfe: Gäste verteilen – mehr Sessel unten, damit nicht alle zum Gipfel fahren, oder Preise und Werbung.'}</p>`+(lower&&!KG.b.umf&&KG.stage>=2?'<div class="row"><span>Umfahrung</span><button class="btn" data-a="go" data-v="bau|pis">Baumenü ›</button></div>':'')}
 if(k==='bwh')return kHead('⛑️ Bergwacht')+`<p class="hint">Die Bergwacht holt Verletzte mit Motorschlitten und Akja von der Abfahrt.${KW.res?' Gerade im Einsatz.':''}</p>`;
 return ''};
KV.bich.pisteInfo=function(p){if(p.id!=='main')return '';let h='<div class="bgh">Engstellen</div>';for(const E of KW.eng||[]){const op=kPtOpen(p,kAt(p.d,E.s0));h+=`<div class="row"><span>🚧 ${E.n}</span><b>${op?(E.q.length?E.q.length+' warten':'frei'):'noch gesperrt'}</b></div>`}return h};
KV.bich.staExtra=function(){let h='';for(const E of KW.eng||[]){if(!kPtOpen(KW.pmap.main,kAt(KW.pmap.main.d,E.s0)))continue;h+=`<div class="row"><span>🚧 ${E.n}</span><b>${E.q.length?E.q.length+' warten':'frei'}</b></div>`}
 if(KG.b.cannons)h+=`<div class="row"><span>❄️ Schneekanonen</span><b>${Math.round(KV.bich.canF()*100)} % Leistung</b></div>`;if(KG.b.teich)h+=`<div class="row"><span>💧 Speicherteich</span><b>${Math.round(KG.wat)} % voll</b></div>`;return h};
KV.bich.voices=function(out){const n=(KW.eng||[]).reduce((a,e)=>a+e.q.length,0);if(n>=5)out.push(['🚧','„An der Engstelle steht man ewig!“']);
 if(KG.pq.main<55||KG.snow<12)out.push(['🌱','„Unten wird die Piste schon grün.“']);if(KG.stage>=3&&kPQavg()>78)out.push(['🌲','„Die lange Abfahrt durch den Wald ist herrlich!“'])};
KV.bich.thumbPrep=function(G){G.b.cannons=1;G.b.can2=1;G.b.teich=1;G.b.umf=1};
KV.bich.thumbObjs=function(O){O.push({y:880,f:c2=>kBichTeich(c2,0,1)});O.push({y:1050,f:c2=>kPumpDraw(c2,890,1050,0)})};
KV.bich.thumbR={x:-60,y:850,w:1120};
// Landschaft: Voralpen-Hügel, weißer Hang, Straße und Gehweg
KV.bich.bg=function(c){
 kSky(c,170,'#79b6df','#e3eef6');
 const hill=(base,amp,sd,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(-160,base+60);for(let x=-160;x<=1180;x+=20)c.lineTo(x,base-amp*(.55+.45*Math.sin(x/140+sd))-amp*.25*Math.sin(x/53+sd*2));c.lineTo(1180,base+80);c.closePath();c.fill()};
 hill(110,40,1,'#c7d6e4');hill(140,36,2.6,'#b4c8da');
 const r=kRNG(3);for(let i=0;i<260;i++){const x=-140+r()*1300,y=96+r()*60;c.fillStyle='rgba(60,110,90,'+(.18+r()*.15)+')';c.beginPath();c.moveTo(x-3,y);c.lineTo(x,y-8);c.lineTo(x+3,y);c.fill()}
 c.fillStyle='#ffffff';c.beginPath();c.moveTo(-160,214);c.bezierCurveTo(200,190,420,150,520,158);c.bezierCurveTo(660,150,860,190,1180,204);c.lineTo(1180,2400);c.lineTo(-160,2400);c.closePath();c.fill();
 kSnowGround(c,170,2280);
 c.strokeStyle='#7b5236';c.lineWidth=2.2;c.beginPath();c.moveTo(556,160);c.lineTo(556,134);c.moveTo(548,142);c.lineTo(564,142);c.stroke();
 const W=KVOR.walkY,RY=KVOR.road.y;
 c.fillStyle='#e2d4bb';c.fillRect(-110,W-6,1220,12);c.fillStyle='#ead9be';c.fillRect(-110,W-5,1220,3);
 kRoad(c,RY,-160,1160,34);c.fillStyle='#d9dee6';c.fillRect(-160,RY-24,1320,7);c.fillRect(-160,RY+17,1320,7);
 const bx=KVOR.bus.x-20;c.fillStyle='#2e9e5b';c.fillRect(bx,RY-36,1.6,14);c.beginPath();c.roundRect(bx-6,RY-44,14,9,2);c.fill();c.fillStyle='#fff';c.font='700 6px Fredoka,sans-serif';c.textAlign='center';c.fillText('H',bx+1,RY-37);
 kSign(c,bx+1,RY-52,'🚌 Bichl Dorf','#2e9e5b','#fff',5)};
KV.bich.staticExtra=function(c){// Ortsschild und Wegweiser an der Talstation
 kSign(c,-70,1940,'BICHL','#f2c53b','#2b3040',7)};
// Dorf südlich der Straße, dichter Mischwald am ganzen Hang
KV.bich.decor=function(D){
 for(const [x,y,w,h,k] of [[60,2060,52,28,1],[230,2096,56,30,0],[420,2060,48,26,2],[600,2104,58,30,1],[780,2064,50,28,0],[960,2100,54,28,2],[-80,2110,48,26,0],[1080,2050,46,26,1]])D.house(x,y,w,h,k);
 const mix=r=>r()<.22?'l':'p';
 D.scatter(-140,176,1140,1868,6200,51,(x,y)=>y<178?0:y>1700?.55:.97,mix);D.scatter(-140,2010,1140,2260,520,52,()=>.55,mix);
 for(const [x,y,ra,n,s] of [[900,300,120,160,61],[60,300,110,120,62],[960,1300,120,150,63],[-60,1100,100,120,64],[880,1640,90,80,65]])D.grove(x,y,ra,n,s,mix)};
KV.bich.blocks=function(B){
 B.box(150,1730,300,1862);B.box(318,1780,446,1862);B.box(560,1752,648,1818);B.box(500,1776,580,1820);B.box(700,1760,840,1860);
 B.box(-200,1856,1200,2000);
 // Anstell-Bereiche an den Mittelstationen
 for(const [x,y] of [[252,1390],[238,1006],[250,624]])B.box(x-80,y-6,x+4,y+84);
 // Speicherteich, Waldhütte, Hüttenweg
 B.box(696,870,946,1074);B.box(740,500,850,590);B.line([[602,552],[690,562],[766,566]],8);
 // Gehwege im Tal
 B.line([[360,1838],[328,1848],[292,1834],[262,1816]],8);B.line([[380,1946],[372,1906],[366,1866]],6);B.line([[740,1846],[740,1864]],6)};

// ===== Berg-Vorlage 3: Altberg – altes Skigebiet mit Gabelung (Westhang Sonne / Osthang Schatten), alte Lifte sanieren oder abreißen =====
// Lifte: ab Altbergbahn (2er 1971, läuft beim Start, unsaniert) · gs Gipfelsessel (Einersessel 1958, stillgelegt) · ol Ostlift (Schlepplift 1968, stillgelegt) · wl Westlift (neu, Stufe 4)
// Zustand je Lift: zs 0 unsaniert · 1 saniert · 2 neu; gs.nost = Nostalgie-Sessel, gs.ch = gewählte Variante ('n'|'s')
KV.alt={id:'alt',n:'Altberg',am:'am Altberg',bounds:{x0:-100,x1:1100,y0:150,y1:2200},home:{x:470,y:1560,S:1.0,cx:470,cy:1560},
 desc:'Ein verlassenes Skigebiet aus den 70ern – du übernimmst es mit Schulden. Zwei Hänge treffen sich an der Gabelung: der sonnige Westhang und der schattige Osthang. Drei alte Lifte warten: sanieren oder abreißen?',
 stages:4,seasons:2,start:-8000,snow0:40,kioskAlways:1,runRef:620,credMin:20000,
 welcome:'Willkommen am Altberg! Die alte Altbergbahn läuft noch – aber sie ruckelt. Tippe auf einen alten Lift: sanieren oder abreißen?',
 tip:'Tipp: Alte Lifte haben 3-mal so oft Pannen – saniere die Altbergbahn bald (🔨 Bauen › Lifte)',tipIf:()=>KG.l.ab.zs===0,
 preHint:'Am Altberg kennen die Gäste noch die alten Zeiten – mit jedem Ausbau ist der Berg mehr wert. Fair heißt: so viel wie die Gegend gerade wert ist.',
 mix:{fam:.3,anf:.2,pro:.28,sb:.22},priceSens:1.1,
 wx:{sonne:.5,neuschnee:.2,tau:.2,sturm:.1},
 rivals:['Gamskogel-Bahnen','Sonnkar-Lifte','Hochalm Prein','Schattberg-Lift','Edelweißhang','Rauchalm','Tauernblick','Kesselfall-Lifte','Wiesenkogel','Zwölferlift'],
 rivS:[720,660,610,560,510,460,420,380,330,280],rivG:1.2,
 parkY:1812,valleyY:1700,walkY:1770,road:{y:1884},bus:{x:446,y:1875},zebra:null,starTh:[0,0,290,410,530,650],
 pistes:[
  {id:'west',n:'Westhang',col:'b',st:1,sec:[[960,1],[-1e9,3]],pts:[[548,700,46],[470,780,44],[396,880,48],[334,1000,52],[312,1120,54],[344,1250,56],[386,1370,54],[404,1480,50],[400,1570,46]]},
  {id:'ost',n:'Osthang',col:'r',st:2,sec:[[930,2],[-1e9,3]],pts:[[548,700,46],[630,790,38],[700,910,40],[742,1050,40],[718,1200,40],[668,1340,40],[652,1460,42],[642,1570,44]]},
  {id:'gh',n:'Gipfelhang',col:'b',st:3,pts:[[540,318,30],[590,400,44],[612,520,50],[590,630,50],[548,700,46]]},
  {id:'rinne',n:'Altberg-Rinne',col:'s',st:4,wear:.05,pts:[[566,334,18],[620,360,20],[680,382,22],[758,480,22],[806,620,22],[818,780,24],[798,920,26],[760,1020,30],[742,1052,34]]},
  {id:'zab',n:'Zubringer',col:'b',st:1,conn:1,pts:[[552,906,10],[538,942,11],[496,962,12],[446,972,14],[400,974,16]]},
  {id:'zao',n:'Zubringer',col:'r',st:2,conn:1,pts:[[562,906,10],[604,926,11],[650,940,12],[690,946,16]]},
  {id:'zgs',n:'Zubringer',col:'b',st:3,conn:1,pts:[[452,314,9],[494,318,11],[530,322,14]]},
  {id:'zwl',n:'Zubringer',col:'b',st:4,conn:1,pts:[[228,974,9],[262,978,11],[300,982,14]]},
  {id:'zol',n:'Zubringer',col:'r',st:2,conn:1,pts:[[838,1078,9],[808,1076,11],[778,1070,14]]}],
 lifts:[
  {id:'ab',n:'Altbergbahn',sh:'Altbergbahn',typ:'s2',st:1,b:[548,1626],t:[566,858],exit:[556,900],pistes:['zab','zao','west','ost'],bn:'Talstation',tn:'Gabelung',ovh:2500,up:1,upF:.7},
  {id:'gs',n:'Gipfelsessel',sh:'Gipfelsessel',typ:'s1',st:3,b:[500,846],t:[436,300],exit:[452,312],py:[.45,.65,.84],pistes:['zgs','gh','rinne','west','ost'],bn:'Gabelung',tn:'Gipfel',ovh:3000,up:1,upF:.7},
  {id:'ol',n:'Ostlift',sh:'Ostlift',typ:'schlepp',st:2,b:[880,1600],t:[856,1066],exit:[840,1076],pistes:['zol','ost'],bn:'Talstation Ost',tn:'Bergstation Ost',ovh:2000,up:1,upF:.7},
  {id:'wl',n:'Westlift',sh:'Westlift',typ:'s6',st:4,b:[150,1600],t:[206,962],exit:[226,972],pistes:['zwl','west'],bn:'Talstation West',tn:'Bergstation West',ovh:3000,up:1,upF:.7}],
 kassa:{x:420,y:1716},
 lots:[{id:'pw',n:'Parkplatz',x0:-90,x1:330,y0:1784,y1:1840,base:1},{id:'po',n:'Parkplatz Ost',x0:560,x1:1090,y0:1784,y1:1840,base:1}],
 hut:{x:690,y:640,in:[[626,656],[648,660],[668,652]],cost:8000,days:2,st:3,n:'Gabelhütte',pid:'gh'},
 garage:{x:20,y:1690},bwHut:{x:330,y:1708},bwStart:[352,1714],
 hotel:{x:762,y:1756,w:110,h:44,k:2,cost:18000,days:3,st:2,rooms:30,n:'Hotel Alpenrose',sign:'HOTEL ALPENROSE ★★★',
  pin:()=>[[740,1770],[420,1770],[420,1724]],pout:()=>[[420,1724],[420,1770],[740,1770],[752,1760]]},
 cannons:{cost:9000,st:2},
 goals:[
  {k:'pf',t:'Schuldenfrei (Kassa über 0 €) und 2 Sterne',sh:'Schuldenfrei + 2 ★',prog:()=>(KG.money>0?'schuldenfrei ✓':'noch '+kfmt(-KG.money)+' Schulden')+' · '+kStars()+' ★',ok:()=>KG.money>0&&kStars()>=2,lock:1},
  {k:'zu',t:'Alle 3 alten Lifte wieder in Betrieb – saniert oder neu – und Platz 6 oder besser',sh:'3 Lifte + Platz 6',prog:()=>kAltOldN()+' / 3 Lifte · Platz '+kRank(),ok:()=>kAltOldN()>=3&&kRank()<=6,lock:1},
  {k:'me',t:'In der letzten Woche der 2. Saison keine einzige Liftpanne',sh:'Keine Panne',prog:()=>kAltLW(),ok:()=>!!KG.lwSeen&&!KG.lwBrk,end:1}],
 stageInfo:[null,
  {n:'Westhang',d:'Die alte Altbergbahn bis zur Gabelung und der sonnige Westhang.'},
  {n:'Osthang',d:'Der rote Osthang auf der Schattseite wird freigeräumt – dort hält der Schnee länger. Der alte Ostlift kann saniert oder ersetzt werden.',cost:5000,days:2,req:[['ruf',50,'Ruf mindestens 50 %'],['gst',120,'120 Gäste insgesamt']]},
  {n:'Gipfel',d:'Der alte Gipfelsessel fährt wieder bis ganz oben. Der Gipfelhang und die Gabelhütte werden frei.',req:[['stars',2,'2 Sterne'],['ruf',56,'Ruf mindestens 56 %']]},
  {n:'Westlift und Rinne',d:'Ein neuer 6er-Sessel am Westhang und die schwarze Altberg-Rinne vom Gipfel – für Könner.',cost:25000,days:3,req:[['stars',3,'3 Sterne'],['ruf',62,'Ruf mindestens 62 %']]}],
 fair:{ticket:[0,20,25,31,36],park:3,food:13,kids:7,school:24,hotel:62}
};
const KALT_OLD=['ab','gs','ol'];
function kAltOldN(){let n=0;for(const id of KALT_OLD){const s=KG.l[id];if(s.on&&s.zs>=1)n++}return n}
function kAltLW(){if(KG.lwBrk)return 'Panne in der letzten Woche ✗';if(KG.lwSeen)return 'bisher keine Panne';return 'zählt ab MO • Woche 4 der Saison '+KVOR.seasons}
function kAltSt(id){const s=KG.l[id];if(s.nost)return 'nost';return s.zs===0?'old':s.zs===1?'san':'neu'}
KV.alt.init=function(s){const l=s.l;l.ab.on=1;l.ab.zs=0;l.ab.cond=62;l.gs.zs=0;l.gs.cond=18;l.gs.nost=0;l.gs.ch='';l.ol.zs=0;l.ol.cond=25;l.wl.zs=2;s.snow=40};
KV.alt.lamps=function(){const o=[],W=KVOR.walkY,R=KVOR.road.y;for(let x=60;x<=960;x+=90)o.push([x,W-4]);for(let x=-80;x<=1080;x+=120)o.push([x,R-26]);return o};
// Zubringer und Abzweige verknüpfen
KV.alt.world=function(){const P=KW.pmap,near=(Q,x,y)=>{let b=0,bd=1e9;for(const q of Q.d){const d=Math.hypot(q[0]-x,q[1]-y);if(d<bd){bd=d;b=q[3]}}return b};
 for(const [c,t] of [['zab','west'],['zao','ost'],['zgs','gh'],['zwl','west'],['zol','ost'],['rinne','ost']]){const C=P[c],e=C.d[C.d.length-1];C.next={p:t,s:near(P[t],e[0],e[1])}}
 const G=P.gh,GL=G.d[G.d.length-1][3];G.next={p:'west',s:0};G.brs=[{s:near(G,566,334),p:'rinne',k:'rinne'},{s:GL-5,p:'ost',k:'ost'}]};
KV.alt.paths=function(){const k=KV.alt.kassa,W=KV.alt.walkY;return {busUp:[[446,1858],[446,W],[k.x,W],[k.x,k.y+8]],zebra:[]}};
KV.alt.drawPaths=function(c){const k=KVOR.kassa,W=KVOR.walkY;
 kPathLine(c,[[k.x,k.y+6],[k.x,W]],9);kPathLine(c,[[k.x+20,k.y+8],[466,1728],[484,1722]],8);kPathLine(c,[[446,1858],[446,W]],7);
 kPathLine(c,[[440,1594],[466,1632]],7);
 if(KG.stage>=2)kPathLine(c,[[652,1616],[642,1700],[572,1732],[490,1730]],7);
 if(KG.l.wl.on){kPathLine(c,[[k.x-20,k.y+10],[330,1742],[176,1708]],7);kPathLine(c,[[352,1612],[262,1680],[176,1708]],7)}
 if(KG.l.ol.on){kPathLine(c,[[690,1606],[790,1700]],7);kPathLine(c,[[k.x,W],[884,W],[884,1704]],7)}
 if(KG.hotel)kPathLine(c,[[740,1756],[740,W]],7);
 if(KG.b.hut){c.strokeStyle='#e9dcc4';c.lineWidth=6;c.lineCap='round';c.beginPath();KVOR.hut.in.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}};
// Wo ist der Gast? kas Tal/Kassa · ab/wl/ol Talstationen · wb/ob Ende West-/Osthang · abt Gabelung (Bergstation Altbergbahn) · gst Gipfel · wlt/olt Bergstationen
KV.alt.where=function(f){const K=KVOR.kassa,d=(x,y)=>Math.hypot(f.x-x,f.y-y);if(d(K.x,K.y)<70||f.y>1735)return 'kas';
 if(d(548,1626)<80)return 'ab';if(d(150,1600)<90)return 'wl';if(d(880,1600)<90)return 'ol';
 if(d(400,1570)<120)return 'wb';if(d(642,1570)<120)return 'ob';
 if(d(566,870)<80||d(500,880)<70)return 'abt';if(d(436,300)<70)return 'gst';if(d(206,962)<60)return 'wlt';if(d(856,1066)<60)return 'olt';
 return f.y>1640?'kas':'x'};
KV.alt.route=function(from,to,f){if(from===to)return [];const k=KVOR.kassa,W=KVOR.walkY,K0=[k.x,k.y+8];
 const T={
  ab:{kas:[K0,[472,1732]],wb:[[440,1594],[466,1632]],ob:[[652,1616],[642,1700],[572,1732]],wl:[[176,1708],[330,1742],[472,1732]],ol:[[884,1704],[884,W],[600,W],[572,1734]]},
  wl:{kas:[K0,[330,1742],[176,1708]],wb:[[352,1612],[262,1680],[176,1708]],ob:[[652,1616],[642,1700],[572,1734],[330,1742],[176,1708]],ab:[[472,1732],[330,1742],[176,1708]]},
  ol:{kas:[K0,[k.x,W],[884,W],[884,1704]],ob:[[690,1606],[790,1700]],wb:[[440,1594],[466,1660],[k.x+30,W],[884,W],[884,1704]],ab:[[572,1734],[600,W],[884,W],[884,1704]]},
  gs:{abt:[[524,906]]},
  kas:{wb:[[440,1594],[466,1660],[k.x+26,k.y+8]],ob:[[652,1616],[642,1700],[572,1734],K0],ab:[[472,1732],K0],wl:[[176,1708],[330,1742],K0],ol:[[884,1704],[884,W],[k.x,W],K0]}};
 const r=T[to]&&T[to][from];if(r)return r.map(p=>p.slice());
 if(to==='kas')return [K0];
 return KVOR.route(from,'kas',f).concat(KVOR.route('kas',to,f))};
// Welcher Lift als Nächstes? Wartezeit zählt mit
KV.alt.chooseLift=function(f){const w=KVOR.where(f),l=KG.l,C=[];const ok=id=>l[id]&&l[id].on&&kLiftOpen(id);const add=(id,p)=>{if(ok(id)&&p>0)C.push([id,p/(1+kWait(id)/8)])};
 add('ab',1);
 if(w==='wb'||w==='kas')add('wl',w==='wb'?1.1:.5);
 if(w==='ob'||w==='kas'){const p0=(l.ol.typ==='schlepp'?{pro:1,sb:.8,fam:.35,anf:.15}:{pro:1,sb:.9,fam:.7,anf:.3})[f.ty]||.5;add('ol',(w==='ob'?1:.3)*p0*(f.kid?.5:1))}
 if(!C.length)return 'ab';let s=0;for(const c of C)s+=c[1];let r=kR()*s;for(const c of C){r-=c[1];if(r<=0)return c[0]}return C[0][0]};
// Aussteigen oben: an der Gabelung weiter zum Gipfelsessel oder über einen Zubringer abfahren
KV.alt.unload=function(o,f){const id=o.L.id,ty=f.ty;
 if(id==='ab'){const g=KG.l.gs;if(g.on&&kLiftOpen('gs')&&KG.t<15.3&&!f.leaving&&KG.stage>=3){let p={pro:.82,sb:.78,fam:.5,anf:.18}[ty]||.5;if(f.kid)p*=.7;const w=kWait('gs');if(w>20)p*=.45;else if(w>10)p*=.75;if(kR()<p){kToQueue(f,'gs');return}}
  let q={pro:.6,sb:.55,fam:.28,anf:.08}[ty]||.4;if(f.kid)q*=.5;kSkiStart(f,kPisteOpen(KW.pmap.zao)&&kR()<q?'zao':'zab');return}
 kSkiStart(f,{gs:'zgs',ol:'zol',wl:'zwl'}[id]||'zab')};
// Abzweige am Gipfelhang: schwarze Rinne (Könner), an der Gabelung Westhang oder Osthang
KV.alt.branch=function(f,b){if(!kPisteOpen(KW.pmap[b.p]))return 0;const ty=f.ty;let p;
 if(b.k==='rinne')p={pro:.42,sb:.32,fam:.02,anf:0}[ty]||.1;else{p={pro:.62,sb:.58,fam:.3,anf:.1}[ty]||.4;if(f.kid)p*=.5}
 return kR()<p};
// Lift zu, Gast steht oben: auf Skiern hinunter
KV.alt.descend=function(f){if(f.st==='hurt'&&f.pid){f.st='ski';f.v=Math.min(f.v||20,20);f.leaveT=0;f.engIn=null;f.engQ=null;f.engHold=0;return true}
 if(f.st==='ski')return false;const m={abt:['zab',[556,900]],gst:['zgs',[452,312]],wlt:['zwl',[226,972]],olt:['zol',[840,1076]]}[KVOR.where(f)];if(!m)return false;
 f.leaveT=0;f.x=m[1][0];f.y=m[1][1];kSkiStart(f,m[0]);return true};
// Bergwacht: Anfahrt je nach Talende
KV.alt.resPre=function(f){let P=KW.pmap[f.pid],g=0;while(P&&P.next&&g++<6)P=KW.pmap[P.next.p];return P&&P.id==='ost'?[[372,1700],[470,1738],[620,1734],[668,1640]]:[[372,1660]]};
// Pannen: unsaniert 3-mal so oft, saniert etwas öfter als neu; frisch überholt sehr selten
KV.alt.brkP=function(id,s){const m=s.zs===0?3:s.zs===1?1.4:1;return Math.min(.45,(.008+(1-s.cond/100)*.3)*m)};
KV.alt.onBrk=function(id){if(kSeaN()===KVOR.seasons&&kSeaD()>=KSL-6&&!KG.done){if(!KG.lwBrk)kLog('⚠️','Panne in der letzten Woche – das Meister-Ziel ist nicht mehr zu schaffen.');KG.lwBrk=(KG.lwBrk||0)+1}};
// Sonnseite: Westhang wird nachmittags weich · letzte Woche beobachten
KV.alt.tick=function(dt,dth){if(KG.wx==='sonne'&&KG.t>=13&&KG.t<16.25&&KG.pq.west>40)KG.pq.west=Math.max(40,KG.pq.west-dth*2.2);
 if(kSeaN()===KVOR.seasons&&kSeaD()>=KSL-6&&KG.t>=8.5&&KG.t<16.25&&!KG.done)KG.lwSeen=1};
// Schattseite: Osthang (und Rinne) verlieren bei Tauwetter nur halb so viel
KV.alt.midnight=function(){if(KG.wx==='tau')for(const k of ['ost','rinne'])KG.pq[k]=Math.min(100,KG.pq[k]+6)};
KV.alt.onBoard=function(o,f){if(o.L.id==='gs'&&KG.l.gs.nost&&!f.nosP){f.nosP=1;f.sat+=2;const v=3;kEarn('nos',v,o.L.b[0],o.L.b[1]-40);f.paid=(f.paid||0)+v}};
// Angebot (für die Sterne)
KV.alt.offer=function(){let o=0;const b=KG.b,l=KG.l;for(const id in l){const s=l[id];if(!s.on)continue;o+=45+({s4:25,s6:45,g8:60}[s.typ]||0)+(s.nost?40:0)+(s.zs===0?-20:s.zs===1?10:20)+(s.lg||0)*10}
 o+=(KG.stage-1)*40;for(const p of KW.pistes)if(!p.conn&&kPisteOpen(p))o+=30;
 o+=(b.cannons?35:0)+(b.raupe?30:0)+(b.kiosk?15:0)+(b.hut?50:0)+(KG.hotel?55:0)+(b.bus?20:0)+(b.bus2?10:0)+(b.bw?15:0)+(b.lw?10:0)+(KG.paved?15:0);
 for(const L of KVOR.lots)if(!L.base&&KG.lots[L.id])o+=15;return o};
KV.alt.busT=function(){return KG.b.bus2?[8.4,8.9,9.4,9.9,10.4]:[8.65,9.65,10.65]};
KV.alt.morning=function(){if(KG.b.bus2&&KG.dem>0)KG.busShare=Math.min(.45,150/KG.dem)};
KV.alt.costs=function(c,tm){if(KG.b.bus2)c.bus=(c.bus||0)+100};
KV.alt.att=function(){return (KG.l.gs.on&&KG.l.gs.nost?.04:0)+(KG.hotel?.02:0)};
// Schneekanonen am West- und Osthang (unterer Teil)
KV.alt.canPos=function(){const out=[],r=kRNG(7);const ok=(x,y)=>{if(kOnP(x,y,4)||kOnP(x,y-12,7))return 0;for(const L of KVOR.lifts){const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(Math.hypot(x-L.b[0]-dx*u,y-L.b[1]-dy*u)<30)return 0}for(const b of KST.blocks)if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])return 0;return 1};
 for(const pid of ['west','ost']){const P=KW.pmap[pid];if(!kPisteOpen(P))continue;let acc=0,side=1;for(let i=1;i<P.d.length;i++){const a=P.d[i-1],q=P.d[i];acc+=Math.hypot(q[0]-a[0],q[1]-a[1]);if(acc<110)continue;if(q[1]<930||q[1]>1530||!kPtOpen(P,q))continue;
  for(const sg of [side,-side]){const x=q[0]+q[4]*(q[2]+12)*sg,y=q[1]+q[5]*(q[2]+12)*sg;if(ok(x,y)){out.push({x,y,sd:sg,ph:r()*20});acc=0;side=-side;break}}}}
 return out};
// Pistenraupe: nur auf Pisten und über den freien Talboden
KV.alt.groomPlan=function(){const P=KW.pmap,L=Q=>Q.d[Q.d.length-1][3],off=(Q,s,k)=>{const q=kAt(Q.d,s);return [q[0]+q[3]*q[2]*k,q[1]+q[4]*q[2]*k]},run=(Q,a,b,k)=>{const o=[];if(a>b)for(let s=a;s>=b;s-=12)o.push(off(Q,s,k));else for(let s=a;s<=b;s+=12)o.push(off(Q,s,k));o.push(off(Q,b,k));return o};
 const W=P.west,O=P.ost,G=P.gh,R=P.rinne,w0=kOpenS(W),o0=kOpenS(O);
 const out=[{p:'x',pts:[[60,1716],[260,1700],[372,1612]]},{p:'west',pts:run(W,L(W),w0,.42)}];
 if(kPisteOpen(G)){out.push({p:'gh',pts:run(G,L(G),0,.42)});
  if(kPisteOpen(R))out.push({p:'x',pts:[off(R,0,.4)]},{p:'rinne',pts:run(R,0,L(R),.4)},{p:'rinne',pts:run(R,L(R),0,-.4),fin:1},{p:'x',pts:[off(G,0,-.42)]});
  out.push({p:'gh',pts:run(G,0,L(G),-.42),fin:1})}
 out.push({p:'west',pts:run(W,w0,L(W),-.42),fin:1});
 if(kPisteOpen(O))out.push({p:'x',pts:[[520,1584]]},{p:'ost',pts:run(O,L(O),o0,.42)},{p:'ost',pts:run(O,o0,L(O),-.42),fin:1},{p:'x',pts:[[520,1584],[372,1612],[260,1700],[60,1716]]});
 else out.push({p:'x',pts:[[372,1612],[260,1700],[60,1716]]});
 return out};
// Bauen
KV.alt.items=function(){const V=KVOR,st=KG.stage,l=KG.l,b=KG.b,lf=KPK('lift')?.9:1,sf=KPK('schnee')?.85:1,bau=id=>KG.bau.find(x=>x.id===id);
 const I=[];const add=(tab,o)=>{o.tab=tab;I.push(o);return o};const S=V.stageInfo;
 const rqOf=s=>S[s].req.map(r=>({t:r[r.length-1],ok:kReq(r)})),lkOf=s=>st<s-1?'erst Stufe '+(s-1):rqOf(s).some(r=>!r.ok)?'Voraussetzungen fehlen':'';
 const sB=s=>KG.bau.find(x=>x.k==='stage'&&x.st===s),upB=L=>KG.bau.find(x=>x.k==='up'&&x.lift===L);
 const upLk=(L,id)=>{const u=upB(L);return u&&u.id!==id?'Umbau läuft':''},upOf=(L,id)=>{const u=upB(L);return u&&u.id===id?u:null};
 add('aus',{id:'st2',ic:'🔴',n:'Ausbau Stufe 2: '+S[2].n,d:S[2].d,c:S[2].cost,days:kBauDays(S[2].days),done:st>=2,bau:sB(2),lock:lkOf(2),rq:rqOf(2)});
 const g=l.gs;
 const o3n={id:'st3n',lift:'gs',kind:'a',ic:'🪑',n:'Ausbau Stufe 3: Gipfelsessel sanieren → Nostalgie-Sessellift',d:'Der Einersessel von 1958 wird liebevoll saniert: Holzsessel mit roten Decken, alte Holzstation. Ruf +5 und 3 € Aufpreis je Gast. Gipfelhang und Gabelhütte werden frei.',c:Math.round(9000*lf),days:kBauDays(4),done:st>=3&&g.ch==='n',bau:g.ch==='n'?sB(3):null,lock:g.ch?'':lkOf(3),rq:rqOf(3),
  pro:['Holzsessel mit roten Decken, alte Holzstation – Fotomotiv','Ruf +5 · Aufpreis „Nostalgiefahrt“ 3 € je Gast'],con:['nur 1 Gast pro Sessel und langsam – an der Gabelung bildet sich eine Schlange','Pannen etwas öfter als bei neuen Liften · nicht ausbaubar']};
 const o3s={id:'st3s',lift:'gs',kind:'n',ic:'🏗️',n:'Ausbau Stufe 3: Gipfelsessel abreißen → neuer 6er-Sessel',d:'Abriss des alten Einersessels und ein neuer 6er-Sessel bis zum Gipfel. Später auf 8er-Gondel ausbaubar. Gipfelhang und Gabelhütte werden frei.',c:Math.round(22000*lf),days:kBauDays(6),done:st>=3&&g.ch==='s',bau:g.ch==='s'?sB(3):null,lock:g.ch?'':lkOf(3),rq:rqOf(3),
  pro:['viele Gäste schnell auf den Gipfel, kaum Pannen','später auf 8er-Gondel ausbaubar'],con:['kein Nostalgie-Bonus, deutlich teurer','6 Tage Bauzeit']};
 if(g.ch!=='s')add('aus',o3n);if(g.ch!=='n')add('aus',o3s);
 add('aus',{id:'st4',ic:'⚫',n:'Ausbau Stufe 4: '+S[4].n,d:S[4].d,c:Math.round(S[4].cost*lf),days:kBauDays(S[4].days),done:st>=4,bau:sB(4),lock:lkOf(4),rq:rqOf(4)});
 // Lifte: Altbergbahn
 const A=l.ab;
 if(A.zs===0)add('lif',{id:'san_ab',lift:'ab',kind:'a',ic:'🔧',n:'Altbergbahn sanieren',d:'Neue Seile, Bremsen und Polster für den 2er-Sessel von 1971 – danach viel weniger Pannen. Der Lift steht bis zum nächsten Morgen.',c:Math.round(4000*lf),days:kBauDays(1),bau:upOf('ab','san_ab'),lock:upLk('ab','san_ab'),
  pro:['Pannen fast so selten wie bei einem neuen Lift','günstig · nur 1 Tag Bauzeit'],con:['bleibt ein 2er-Sessel','Pannen etwas öfter als neu']});
 if(A.zs<2)add('lif',{id:'neu_ab',lift:'ab',kind:'n',ic:'🏗️',n:'Altbergbahn abreißen → neuer 4er-Sessel',d:'Abriss und Neubau: doppelt so viele Plätze je Sessel, kaum Pannen. Der Lift steht 2 Tage.',c:Math.round(16000*lf),days:kBauDays(2),bau:upOf('ab','neu_ab'),lock:upLk('ab','neu_ab'),
  pro:['doppelt so viele Plätze – kürzere Schlange','kaum Pannen, später 6er möglich'],con:['teuer','2 Tage ohne Lift – in der Zeit kommen kaum Gäste']});
 else add('lif',{id:'up6_ab',lift:'ab',ic:'🚡',n:'Altbergbahn: 6er-Sessel',d:'Noch mehr Plätze – hier steigen fast alle Gäste ein. Der Lift steht bis zum nächsten Morgen.',c:Math.round(14000*lf),days:kBauDays(1),done:A.typ==='s6',bau:upOf('ab','up6_ab'),lock:upLk('ab','up6_ab')});
 if(A.zs>=1)add('lif',{id:'lg_ab',ic:'💺',n:'Altbergbahn: mehr Sessel',d:'Zusätzliche Sessel am Seil – mehr Gäste pro Stunde.',c:Math.round(2500*lf),done:(A.lg||0)>=2,lock:upB('ab')?'Umbau läuft':'',lv:(A.lg||0)+' / 2'});
 // Ostlift
 const O=l.ol,lo2=st<2?'erst Stufe 2':'';
 if(O.zs===0)add('lif',{id:'san_ol',lift:'ol',kind:'a',ic:'🔧',n:'Ostlift sanieren',d:'Der Schlepplift von 1968 fährt wieder: zwei Gäste je Bügel auf den unteren Osthang. Läuft auch bei Sturm.',c:Math.round(3000*lf),days:kBauDays(1),bau:upOf('ol','san_ol'),lock:lo2||upLk('ol','san_ol'),
  pro:['sehr günstig · 1 Tag Bauzeit','läuft auch bei Sturm'],con:['Schlepplift – Familien und Anfänger fahren ungern','Pannen etwas öfter als neu']});
 if(O.zs<2)add('lif',{id:'neu_ol',lift:'ol',kind:'n',ic:'🏗️',n:'Ostlift abreißen → neuer 4er-Sessel',d:'Ein bequemer 4er-Sessel auf den unteren Osthang – für alle Gäste. Bauzeit 2 Tage.',c:Math.round(13000*lf),days:kBauDays(2),bau:upOf('ol','neu_ol'),lock:lo2||upLk('ol','neu_ol'),
  pro:['bequem für alle Gäste','kaum Pannen'],con:['steht bei Sturm wie alle Sessel','deutlich teurer']});
 if(O.zs>=1&&O.on)add('lif',{id:'lg_ol',ic:O.typ==='schlepp'?'🪝':'💺',n:'Ostlift: '+(O.typ==='schlepp'?'mehr Bügel':'mehr Sessel'),d:'Dichter hängende '+(O.typ==='schlepp'?'Bügel':'Sessel')+' – mehr Gäste pro Stunde.',c:Math.round(2000*lf),done:(O.lg||0)>=2,lock:upB('ol')?'Umbau läuft':'',lv:(O.lg||0)+' / 2'});
 // Gipfelsessel
 if(st<3){if(g.ch!=='s')add('lif',Object.assign({},o3n));if(g.ch!=='n')add('lif',Object.assign({},o3s))}
 else if(g.ch){if(g.nost)add('lif',{id:'neu_gs',lift:'gs',kind:'n',ic:'🏗️',n:'Nostalgie-Sessel abreißen → neuer 6er-Sessel',d:'Viele Gäste schnell auf den Gipfel. Der Nostalgie-Bonus fällt weg. Bauzeit 6 Tage.',c:Math.round(22000*lf),days:kBauDays(6),bau:upOf('gs','neu_gs'),lock:upLk('gs','neu_gs'),
   pro:['6 Gäste je Sessel statt 1','später auf 8er-Gondel ausbaubar'],con:['kein Ruf-Bonus und kein Aufpreis mehr','6 Tage ohne Gipfel']});
  else if(g.zs===2){add('lif',{id:'g8_gs',lift:'gs',ic:'🚠',n:'Gipfelsessel: 8er-Gondelbahn',d:'Geschlossene Kabinen bis zum Gipfel – noch mehr Gäste pro Stunde. Bauzeit 2 Tage.',c:Math.round(18000*lf),days:kBauDays(2),done:g.typ==='g8',bau:upOf('gs','g8_gs'),lock:upLk('gs','g8_gs')});
   add('lif',{id:'lg_gs',ic:'💺',n:'Gipfelsessel: mehr '+(g.typ==='g8'?'Kabinen':'Sessel'),d:'Zusätzliche '+(g.typ==='g8'?'Kabinen':'Sessel')+' am Seil – mehr Gäste pro Stunde.',c:Math.round(3000*lf),done:(g.lg||0)>=2,lock:upB('gs')?'Umbau läuft':'',lv:(g.lg||0)+' / 2'})}}
 if(st>=4&&l.wl.on)add('lif',{id:'lg_wl',ic:'💺',n:'Westlift: mehr Sessel',d:'Zusätzliche Sessel am Seil – mehr Gäste pro Stunde.',c:Math.round(3000*lf),done:(l.wl.lg||0)>=2,lv:(l.wl.lg||0)+' / 2'});
 // Piste, Gastro, Anreise, Personal
 add('pis',{id:'raupe',ic:'🚜',n:'Pistenraupe mit Garage',d:'Präpariert nachts alle offenen Pisten – auch den sulzigen Westhang. Ohne Raupe werden die Pisten immer schlechter.',c:5000,done:!!b.raupe});
 add('pis',{id:'can',ic:'❄️',n:'Schneekanonen',d:'Beschneien nachts den unteren West- und Osthang, wenn der Schnee knapp wird.',c:Math.round(V.cannons.cost*sf),done:!!b.cannons,lock:st<2?'erst Stufe 2':'',up:'Strom je Nacht'});
 add('gas',{id:'kiosk',ic:'🌭',n:'Kiosk an der Kassa',d:'Würstel, Tee und Kakao – die einfachste Mittagspause.',c:1500,days:0,done:!!b.kiosk});
 add('gas',{id:'hut',ic:'🛖',n:'Gabelhütte sanieren',d:'Die verfallene Hütte am Gipfelhang wird wieder aufgesperrt – mit Sonnenterrasse. Wer vom Gipfel kommt, kehrt mittags gern ein.',c:V.hut.cost,days:kBauDays(V.hut.days),done:!!b.hut,bau:bau('hut'),lock:st<3?'erst Stufe 3':''});
 add('gas',{id:'hotel',ic:'🏨',n:'Hotel Alpenrose sanieren',d:'Das Hotel steht seit 2003 leer. Saniert hat es 30 Zimmer ★★★ – Hotelgäste kommen ohne Auto und bringen jede Nacht Geld.',c:V.hotel.cost,days:kBauDays(V.hotel.days),done:!!KG.hotel,bau:bau('hotel'),lock:st<2?'erst Stufe 2':''});
 add('anr',{id:'paved',ic:'🛣️',n:'Straße und Parkplätze asphaltieren',d:'Keine Schlaglöcher und kein Schotter mehr – sieht ordentlich aus und bringt etwas Ansehen.',c:5000,done:!!KG.paved});
 add('anr',{id:'bus',ic:'🚌',n:'Skibus',d:'Morgens bringen 3 Busse bis zu 30 Gäste ohne Auto, nachmittags holen sie sie wieder ab.',c:3000,done:!!b.bus,up:'150 €/Tag'});
 add('anr',{id:'bus2',ic:'🚌',n:'Skibus alle 30 Minuten',d:'5 Busse am Morgen statt 3 – bis zu 150 Gäste ohne Auto. Hilft, wenn die Parkplätze voll sind.',c:4000,done:!!b.bus2,lock:!b.bus?'erst Skibus':st<3?'erst Stufe 3':'',up:'+100 €/Tag'});
 add('per',{id:'lw',ic:'🔧',n:'Liftwart',d:'Repariert Störungen in kurzer Zeit. Ohne Liftwart kommt ein Techniker von außen (650 €, über 1 Stunde). Pannen verhindert er nicht – dafür hilft nur Sanieren und Generalüberholen.',c:2500,done:!!b.lw,up:'130 €/Tag'});
 add('per',{id:'bw',ic:'⛑️',n:'Bergwacht',d:'Holt Verletzte mit dem Motorschlitten und Akja von der Piste. Ohne Bergwacht leidet der Ruf.',c:KPK('bw')?0:4000,done:!!b.bw,up:KPK('bw')?'Verein · ohne Lohn':'140 €/Tag'});
 return I};
KV.alt.buy=function(id,I,pay){
 if(id==='st2'||id==='st4'){const s=+id[2];pay();kBauStart({k:'stage',st:s,n:'Ausbau Stufe '+s+': '+KVOR.stageInfo[s].n,days:I.days,lift:s===4?'wl':null,id});return true}
 if(id==='st3n'||id==='st3s'){const n=id==='st3n',g=KG.l.gs;pay();g.ch=n?'n':'s';g.typ=n?'s1':'s6';g.zs=n?1:2;g.nost=n?1:0;kBauStart({k:'stage',st:3,n:n?'Gipfel: Nostalgie-Sessel':'Gipfel: neuer 6er-Sessel',days:I.days,lift:'gs',id,nost:n});return true}
 const U={san_ab:['ab','s2',1],neu_ab:['ab','s4',2],up6_ab:['ab','s6',2],san_ol:['ol','schlepp',1],neu_ol:['ol','s4',2],neu_gs:['gs','s6',2],g8_gs:['gs','g8',2]}[id];
 if(U){const [L,typ,zs]=U,san=id.startsWith('san');pay();
  if(I.days>0){KG.bau.push({k:'up',id,lift:L,typ,zs,quiet:san,n:I.n,d0:KG.day,days:I.days});kLog('🚧',(san?'Sanierung ':'Umbau ')+kLC(L).n+' – fertig '+kDayT(KG.day+I.days)+' früh.');
   if(KG.l[L].on){KG.l[L].on=0;if(KW.lift[L])for(const f of KW.lift[L].q.splice(0))kGoHome(f)}}
  else{kUpLift(L,typ,san);KV.alt.applied({k:'up',id,lift:L,zs})}return true}
 if(id==='bus2'){pay();KG.b.bus2=1;kLog('🚌','Ab morgen fährt der Skibus alle 30 Minuten.');return true}
 if(id.startsWith('lg_')){const L=id.slice(3);pay();KG.l[L].lg=(KG.l[L].lg||0)+1;kLiftSetup(L);kLog('💺',(KG.l[L].typ==='schlepp'?'Mehr Bügel am ':'Mehr Sessel am ')+kLC(L).n+'.');return true}
 return false};
KV.alt.applied=function(b){if(b.k==='up'&&b.zs!=null){const s=KG.l[b.lift];s.zs=b.zs;s.cond=100;if(b.zs===2){s.nost=0;if(b.lift==='gs')s.ch='s'}if(b.id&&b.id.startsWith('san'))kLog('🔧',kLC(b.lift).n+' ist saniert – Zustand 100 %.')}
 if(b.k==='stage'&&b.st===3){const s=KG.l.gs;s.cond=100;if(s.nost){KG.ruf=Math.min(100,KG.ruf+5);kLog('🪑','Der Nostalgie-Sessel fährt wieder – die Leute reden davon. Ruf +5.')}}
 if(b.k==='stage'&&b.st===4)KG.l.wl.cond=100};
// --- Zeichenteile: alte Lifte, Stationen, Absperrung, ausgebleichte Gebäude ---
function kAOldPylon(c,x,y,hw,fresh){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+5,y+2,hw+3,2.2,0,0,7);c.fill();
 const a=fresh?'#8a5a3c':'#7d5a44',b=fresh?'#a8714b':'#9a6e52';c.strokeStyle=a;c.lineWidth=1.3;c.beginPath();c.moveTo(x-2.5,y);c.lineTo(x-.8,y-30);c.moveTo(x+2.5,y);c.lineTo(x+.8,y-30);c.stroke();
 c.lineWidth=.6;c.strokeStyle=b;for(let k=0;k<5;k++){const y0=y-k*6,y1=y-(k+1)*6,w0=2.5-k*.34,w1=2.5-(k+1)*.34;c.beginPath();c.moveTo(x-w0,y0);c.lineTo(x+w1,y1);c.moveTo(x+w0,y0);c.lineTo(x-w1,y1);c.stroke()}
 c.fillStyle=fresh?'#5b3f2e':'#6b4a36';c.fillRect(x-hw-1,y-32,hw*2+2,2.2);if(fresh){c.fillStyle='#c8323a';c.fillRect(x-1,y-31.6,2,1.2)}else{c.fillStyle='#b5774f';c.fillRect(x-hw,y-31.6,3,1.2);c.fillRect(x+hw-5,y-31.6,4,1.2)}}
function kARider(c,f,x,y){c.fillStyle=f.col;c.beginPath();c.roundRect(x-2.4,y,4.8,6.6,1.6);c.fill();c.fillStyle='#ffd9b5';c.beginPath();c.arc(x,y-.8,1.5,0,7);c.fill();c.fillStyle=f.col;c.beginPath();c.arc(x,y-1.5,1.5,Math.PI,0);c.fill();
 c.strokeStyle='#2a2e44';c.lineWidth=.8;c.beginPath();c.moveTo(x-1,y+8.4);c.lineTo(x-1.6,y+12.4);c.moveTo(x+1,y+8.4);c.lineTo(x+1.6,y+12.4);c.stroke()}
function kAChair1(c,k,nost){c.strokeStyle='#2a2e44';c.lineWidth=.9;c.beginPath();c.moveTo(0,-1);c.lineTo(0,9);c.stroke();
 c.fillStyle=nost?'#a8673e':'#7d6a5a';c.fillRect(-3.4,4.6,1.4,5.6);
 if(k.r.length){kARider(c,k.r[0],0,2.6);if(nost){c.fillStyle='#c8323a';c.fillRect(-3,7.6,6,3.4);c.fillStyle='#fff';for(let i=0;i<3;i++)c.fillRect(-2.6+i*2,7.6,.8,3.4)}}
 c.fillStyle=nost?'#a8673e':'#7d6a5a';c.fillRect(-3.4,9,6.8,1.8);c.strokeStyle=nost?'#8a4a2e':'#5b4d42';c.lineWidth=.7;c.beginPath();c.moveTo(-3.4,11);c.lineTo(-3.4,13);c.moveTo(3.4,11);c.lineTo(3.4,13);c.lineTo(5,13);c.stroke()}
function kAChair2(c,k,fresh){c.strokeStyle=fresh?'#2b3040':'#4b3a30';c.lineWidth=.9;c.beginPath();c.moveTo(0,-1);c.lineTo(0,5);c.moveTo(-5.5,5);c.lineTo(5.5,5);c.stroke();
 c.fillStyle=fresh?'#2f6fb5':'#857565';c.fillRect(-6,4.6,12,1.4);c.fillRect(-6,4.6,1.3,6);c.fillRect(4.7,4.6,1.3,6);
 k.r.slice(0,2).forEach((f,i)=>kARider(c,f,i?2.8:-2.8,2.8));
 c.fillStyle=fresh?'#3a78d0':'#8a7a6a';c.fillRect(-6.2,9.4,12.4,1.9);c.strokeStyle=fresh?'#2b3040':'#5b4d42';c.lineWidth=.7;c.beginPath();c.moveTo(-6,11.3);c.lineTo(-6,13);c.moveTo(6,11.3);c.lineTo(6,13);c.stroke()}
function kACabin(c,k){c.fillStyle='#2a2e44';c.fillRect(-1,-1.5,2,6);c.fillStyle='#c8323a';c.beginPath();c.roundRect(-7,4,14,13,3);c.fill();c.fillStyle='#bfe6fa';c.beginPath();c.roundRect(-5.5,6,11,5.5,1.6);c.fill();
 k.r.slice(0,3).forEach((f,i)=>{c.fillStyle='#ffd9b5';c.beginPath();c.arc(-3+i*3,9.2,1.2,0,7);c.fill()});c.fillStyle='rgba(0,0,0,.18)';c.fillRect(-7,14.5,14,2.5)}
// alte Holzstation: old verwittert · off verrammelt · san saniert · nost liebevoll saniert (rote Zier)
function kAOldStation(c,x,y,big,st){const w=big?40:34,h=big?24:20,warm=st==='nost'||st==='san';c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+4,y+4,w*.8,5,0,0,7);c.fill();
 const wood=warm?'#b9784a':'#8c7462',dark=warm?'#93583a':'#6f5a4c';c.fillStyle=wood;c.fillRect(x-w/2,y-h,w,h+2);c.fillStyle=dark;c.fillRect(x+w/2-w*.3,y-h,w*.3,h+2);
 c.strokeStyle='rgba(40,25,15,.25)';c.lineWidth=.5;for(let yy=y-h+3;yy<y;yy+=3){c.beginPath();c.moveTo(x-w/2,yy);c.lineTo(x+w/2,yy);c.stroke()}
 c.fillStyle='#4b3f39';c.fillRect(x-w/2-6,y-h-4,w+12,3);c.strokeStyle=st==='nost'?'#c8323a':warm?'#3a78d0':'#5d5550';c.lineWidth=1.6;c.beginPath();c.ellipse(x,y-h-1,w*.42,3.2,0,0,7);c.stroke();
 c.fillStyle=st==='nost'?'#7a3b2a':st==='san'?'#5b6578':'#5f5650';c.beginPath();c.moveTo(x-w/2-8,y-h-4);c.lineTo(x-w/2+2,y-h-13);c.lineTo(x+w/2-2,y-h-13);c.lineTo(x+w/2+8,y-h-4);c.closePath();c.fill();
 c.fillStyle='#fff';c.beginPath();c.moveTo(x-w/2-5,y-h-6);c.lineTo(x-w/2+3,y-h-12);c.lineTo(x+w/2-3,y-h-12);c.lineTo(x+w/2+5,y-h-6);c.closePath();c.fill();
 if(st==='off'){c.fillStyle='#a07a52';for(const [a,b] of [[-.32,-.55],[.08,-.4]]){c.save();c.translate(x+a*w,y+b*h);c.rotate(-.25);c.fillRect(-7,-1.5,14,3);c.restore()}}
 else{const nt=kBright()<.5;c.fillStyle=nt?'#ffd98a':warm?'#ffe7b0':'#9fc3d6';c.fillRect(x-w/2+4,y-h+5,7,6);kWin(x-w/2+4,y-h+5,7,6);if(st==='nost'){c.fillStyle='#c8323a';for(let i=0;i<5;i++)c.fillRect(x-w/2+i*w/5,y-h-4,w/10,2)}}
 if(st==='old'||st==='off'){c.fillStyle='rgba(120,70,40,.35)';c.fillRect(x-w/2+2,y-6,8,6);c.fillRect(x+4,y-h+2,6,3)}}
function kATape(c,x0,y0,x1,y1){c.strokeStyle='#e8504a';c.lineWidth=1.3;c.setLineDash([3,3]);c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();c.strokeStyle='#fff';c.lineDashOffset=3;c.stroke();c.setLineDash([]);c.lineDashOffset=0;
 for(const [x,y] of [[x0,y0],[x1,y1]]){c.fillStyle='#e8504a';c.fillRect(x-.8,y-2,1.6,8)}}
// ausgebleichtes Gebäude (einmal vorgezeichnet, ohne Canvas-Filter – geht auch auf dem iPhone)
const KAGR={};
function kAGrey(c,key,x0,y0,w,h,fn){let cv=KAGR[key];const S=4;if(!cv){cv=document.createElement('canvas');cv.width=Math.ceil(w*S);cv.height=Math.ceil(h*S);const g=cv.getContext('2d');g.setTransform(S,0,0,S,-x0*S,-y0*S);kWithGame(()=>{KW.winOn=0;fn(g)});
  const m=document.createElement('canvas');m.width=cv.width;m.height=cv.height;m.getContext('2d').drawImage(cv,0,0);g.setTransform(1,0,0,1,0,0);
  g.globalCompositeOperation='saturation';g.globalAlpha=.8;g.fillStyle='hsl(0,0%,50%)';g.fillRect(0,0,cv.width,cv.height);g.globalAlpha=.16;g.globalCompositeOperation='source-atop';g.fillStyle='#6b4a30';g.fillRect(0,0,cv.width,cv.height);
  g.globalAlpha=1;g.globalCompositeOperation='destination-in';g.drawImage(m,0,0);g.globalCompositeOperation='source-over';KAGR[key]=cv}
 c.drawImage(cv,x0,y0,w,h)}
function kABoards(c,P){c.fillStyle='#8a6a48';for(const [a,b,r] of P){c.save();c.translate(a,b);c.rotate(r);c.fillRect(-7,-1.4,14,2.8);c.restore()}}
// Seil und Stützen eines stehenden Liftes (stillgelegt, im Umbau)
function kAPy(L,len,drag){if(L.py)return L.py;const n=Math.max(2,Math.ceil(len/(drag?70:110))),o=[];for(let i=1;i<n;i++)o.push(i/n);return o}
function kAltRope(add,L,st){const s=KG.l[L.id],T0=KLT[s.typ],[bx,by]=L.b,[tx,ty]=L.t,len=Math.hypot(tx-bx,ty-by),co=T0.co,ux=(tx-bx)/len,uy=(ty-by)/len,PY=kAPy(L,len,T0.drag);
 for(const u of PY){const x=bx+(tx-bx)*u,y=by+(ty-by)*u;add(y,c=>{if(T0.drag){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+3,y+2,5,1.6,0,0,7);c.fill();c.fillStyle='#8a6048';c.fillRect(x-1,y-17,2,18);c.fillStyle='#5b3f2e';c.fillRect(x-4,y-17,8,1.6)}else if(st==='neu')pylonN(c,x,y,co+3);else kAOldPylon(c,x,y,co+2,st!=='old'&&st!=='off')})}
 add(1e5,c=>{c.strokeStyle=st==='neu'?'#161a28':'#3a2f2a';c.lineWidth=T0.drag?.8:1;if(T0.drag){c.beginPath();c.moveTo(bx,by-14);c.lineTo(tx,ty-14);c.stroke();return}const px=-uy,py=ux;for(const sd of [-1,1]){c.beginPath();c.moveTo(bx+px*co*sd,by+py*co*sd);c.lineTo(tx+px*co*sd,ty+py*co*sd);c.stroke()}})}
const KALAB={ab:s=>['ALTBERGBAHN'+(s.zs===0?' · 1971':s.zs===1?' · saniert':''),'GABELUNG'],gs:s=>[s.nost?'NOSTALGIE-SESSEL':'GIPFELSESSEL','GIPFEL'],ol:s=>['OSTLIFT',''],wl:s=>['WESTLIFT','']};
function kAltSta(add,L,st,t){const s=KG.l[L.id],T0=KLT[s.typ],co=T0.co,lab=KALAB[L.id](s);
 if(T0.drag){for(const [p,big] of [[L.b,1],[L.t,0]]){const [x,y]=p;add(y+10,c=>{if(st==='off'){c.save();c.globalAlpha=.8;stationN(c,x+14,y,0);c.restore()}else stationN(c,x+14,y,t);if(big&&st!=='off'){kBrkSign(c,L,t);kSign(c,x,y-26,lab[0],'#fff','#2b3a55',5.5)}})}
  if(st==='off')add(L.b[1]+30,c=>{kATape(c,L.b[0]-22,L.b[1]+26,L.b[0]+24,L.b[1]+26);kSign(c,L.b[0],L.b[1]+48,'⛔ AUSSER BETRIEB · seit 1998','#e8504a','#fff',5.5)});return}
 for(const [p,big] of [[L.b,1],[L.t,0]]){const [x,y]=p,tx=lab[big?0:1];
  if(st==='neu'){const bg=big&&L.id!=='gs';add(y+(bg?22:18),c=>{liftStation(c,x,y,co,bg);if(big)kBrkSign(c,L,t);if(tx)kSign(c,x,y-(bg?30:36),tx,'#fff','#2b3a55',5.5)})}
  else add(y+8,c=>{kAOldStation(c,x,y,!!big,st);if(big&&st!=='off')kBrkSign(c,L,t);if(tx&&st!=='off')kSign(c,x,y-(big?44:40),tx,st==='nost'?'#7a3b2a':st==='old'?'#8c7462':'#fff',st==='nost'||st==='old'?'#fff':'#2b3a55',5.5)})}
 if(L.id==='gs'&&st==='off')add(890,c=>{kATape(c,478,866,522,866);kSign(c,500,882,'⛔ GIPFELSESSEL · seit 1994 zu','#e8504a','#fff',5.5)})}
// Gebäude zeichnen
KV.alt.drawB=function(add,t){const V=KVOR,K=V.kassa,l=KG.l;add(K.y,c=>kKassaDraw(c,K.x,K.y));if(KG.b.kiosk)add(K.y+8,c=>kKioskDraw(c,K.x+38,K.y+8,t));
 for(const L of V.lifts){const s=l[L.id],up=KG.bau.find(b=>b.k==='up'&&b.lift===L.id),sb=KG.bau.find(b=>b.k==='stage'&&b.lift===L.id),st=kAltSt(L.id);
  if(sb){add(L.b[1]+20,c=>kSite(c,L.b[0],L.b[1]+10,60,t));add(L.t[1]+20,c=>kSite(c,L.t[0],L.t[1]+10,50,t));continue}
  if(up){const san=up.id.startsWith('san'),run=KW.lift[L.id]&&KW.lift[L.id].run;
   if(san){kAltSta(add,L,st==='old'?'old':st,t);if(!run)kAltRope(add,L,'old')}
   else{add(L.b[1]+20,c=>kSite(c,L.b[0],L.b[1]+10,60,t));add(L.t[1]+20,c=>kSite(c,L.t[0],L.t[1]+10,50,t));if(!run)kAltRope(add,L,'off')}
   add(L.b[1]+40,c=>kSign(c,L.b[0],L.b[1]-(san?58:52),san?'🔧 SANIERUNG':'🏗️ NEUBAU','#f2701f','#fff',6));continue}
  if(!s.on){if(L.id==='gs'||L.id==='ol'){kAltRope(add,L,'off');kAltSta(add,L,'off',t)}continue}
  kAltSta(add,L,st,t)}
 // Wegweiser im Wald zwischen den Hängen
 add(772,c=>{const x=548,y=772;c.fillStyle='#7b5236';c.fillRect(x-1,y-24,2,24);kSign(c,x-22,y-26,'↙ WESTHANG ☀','#3a78d0','#fff',5);kSign(c,x+24,y-16,'OSTHANG ❄ ↘','#e8504a','#fff',5)});
 // Gabelhütte
 const H0=V.hut,hb=KG.bau.find(b=>b.id==='hut');
 if(KG.b.hut){add(H0.y-1,c=>{chalet(c,H0.x,H0.y,52,28,1);for(const [wx,wy] of chWin(H0.x,H0.y,52,28))kWin(wx,wy,6,6);kSign(c,H0.x,H0.y-50,'GABELHÜTTE','#8f5a34','#fff',5.5);
   c.fillStyle='#c9a77a';c.fillRect(H0.x-30,H0.y+2,60,16);c.strokeStyle='rgba(120,90,60,.4)';c.lineWidth=.5;for(let x=H0.x-30;x<H0.x+30;x+=5){c.beginPath();c.moveTo(x,H0.y+2);c.lineTo(x,H0.y+18);c.stroke()}
   for(const x of [H0.x-22,H0.x-6,H0.x+10,H0.x+24]){c.fillStyle='#7b5236';c.fillRect(x-.4,H0.y-4,.8,12);c.fillStyle='#e8504a';c.beginPath();c.arc(x,H0.y-4,4.5,Math.PI,0);c.fill();c.fillStyle='#fff';c.fillRect(x-4.5,H0.y-4.6,9,.8)}})}
 else add(H0.y,c=>{kAGrey(c,'hut',H0.x-42,H0.y-60,84,70,g=>chalet(g,H0.x,H0.y,52,28,1));if(hb)kSite(c,H0.x,H0.y+8,64,t,1);else{kABoards(c,[[H0.x-16,H0.y-14,-.3],[H0.x+12,H0.y-14,.25]]);kSign(c,H0.x,H0.y-50,'GABELHÜTTE · verfallen','#8c7462','#fff',5.5)}});
 // Hotel Alpenrose
 const H=V.hotel;if(KG.hotel)add(H.y,c=>kHotelDraw(c,H,t));
 else add(H.y,c=>{kAGrey(c,'hotel',H.x-H.w/2-16,H.y-H.h-46,H.w+32,H.h+56,g=>chalet(g,H.x,H.y,H.w,H.h,H.k));if(KG.bau.find(b=>b.id==='hotel'))kSite(c,H.x,H.y+6,80,t,1);else{kABoards(c,[[H.x-40,H.y-20,-.25],[H.x-14,H.y-20,.25],[H.x+12,H.y-20,-.25],[H.x+38,H.y-20,.25]]);kSign(c,H.x,H.y-H.h-24,'HOTEL ALPENROSE · leer seit 2003','#8c7462','#fff',5.4)}});
 // Garage + Bergwacht
 if(KG.b.raupe)add(V.garage.y+8,c=>kGarage(c,V.garage.x,V.garage.y,t));
 if(KG.b.bw)add(V.bwHut.y,c=>kBwHut(c,V.bwHut.x,V.bwHut.y,t));
 // Ausbau-Baustellen
 const sbt=KG.bau.find(b=>b.k==='stage');if(sbt){const S={2:[[700,910],[668,1340]],4:[[758,480],[798,920]]}[sbt.st]||[];for(const [x,y] of S)add(y,c=>kSite(c,x,y,50,t))}};
// laufende Lifte: alter Look, eigene Stützen, Einersessel, Schlepplift-Bügel, Gondeln
KV.alt.liftLook=function(c,o,t){const id=o.L.id,s=KG.l[id],T0=o.T,{bx,by,tx,ty,len,ux,uy}=o,co=T0.co,st=kAltSt(id),PY=kAPy(o.L,len,T0.drag);
 if(T0.drag){c.strokeStyle=st==='neu'?'#2a2e44':'#4b3a30';c.lineWidth=.8;c.beginPath();c.moveTo(bx,by-14);c.lineTo(tx,ty-14);c.stroke();
  for(const u of PY){const px=bx+(tx-bx)*u,py=by+(ty-by)*u;if(!kInV(px,py))continue;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(px+3,py+2,5,1.6,0,0,7);c.fill();c.fillStyle=st==='old'?'#8a6048':'#a8714b';c.fillRect(px-1,py-17,2,18);c.fillStyle='#5b3f2e';c.fillRect(px-4,py-17,8,1.6)}
  for(const ch of o.ch){if(ch.u>=1)continue;const [x,y0]=kLiftPos(o,ch.u),y=y0-14;if(!kInV(x,y,20))continue;c.strokeStyle='#2a2e44';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+9);c.stroke();c.strokeStyle=st==='old'?'#8a7a6a':'#3a3f58';c.lineWidth=1.1;c.beginPath();c.moveTo(x-3.5,y+9.5);c.lineTo(x+3.5,y+9.5);c.stroke()}
  return true}
 c.strokeStyle=st==='neu'?'#161a28':'#3a2f2a';c.lineWidth=s.typ==='s1'?.9:1.2;const px=-uy,py=ux;for(const sd of [-1,1]){c.beginPath();c.moveTo(bx+px*co*sd,by+py*co*sd);c.lineTo(tx+px*co*sd,ty+py*co*sd);c.stroke()}
 for(const u of PY){const x=bx+(tx-bx)*u,y=by+(ty-by)*u;if(!kInV(x,y))continue;if(st==='neu')pylonN(c,x,y,co+3);else kAOldPylon(c,x,y,co+2,st!=='old')}
 const cap=T0.cap;for(const ch of o.ch){if(ch.u<.03||ch.u>1.97||Math.abs(ch.u-1)<.03)continue;const [x,y]=kLiftPos(o,ch.u);if(!kInV(x,y,30))continue;const k={r:ch.r.map(f=>({col:f.col}))};
  c.save();c.translate(x,y);c.rotate(Math.sin(ch.u*40+t*.8)*(st==='old'?.09:.04));if(s.typ==='s1')kAChair1(c,k,!!s.nost);else if(s.typ==='g8')kACabin(c,k);else if(st==='neu')gondola(c,k,cap);else kAChair2(c,k,st!=='old');c.restore()}
 return true};
// Warteschlange am Gipfelsessel: zwischen Westhang und Bergstation der Altbergbahn, 8 je Reihe
KV.alt.qSlot=function(o,i){if(o.L.id!=='gs')return null;const bx=500,by=846,r=Math.floor(i/8),j=i%8;return [bx+18-(r%2?7-j:j)*6.4,by+18+r*6.6]};
KV.alt.fence=function(c,o,id){if(id!=='gs')return false;const bx=500,by=846,n=o.q.length,R=Math.max(4,Math.min(10,Math.ceil(n/8)+1));c.strokeStyle=KG.l.gs.nost?'#8f5a34':'#8a94a8';c.lineWidth=1;
 for(let r=0;r<R;r++){const y=by+18+r*6.6+3.3;let a=bx-30,b=bx+24;if(r<R-1){if(r%2===0)a=bx-22;else b=bx+16}c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.stroke();c.fillStyle='#5d667a';for(let x=a;x<=b;x+=12)c.fillRect(x-.7,y-1.4,1.4,2.8)}
 const w=kWait(id),x=bx+32,y=by+44;c.fillStyle='#5d667a';c.fillRect(x-.8,y,1.6,12);c.fillStyle=w>22?'#e8504a':w>8?'#f2a63b':'#2e9e5b';c.beginPath();c.roundRect(x-16,y-12,32,13,2.5);c.fill();c.fillStyle='#fff';c.font='700 5.6px Fredoka,sans-serif';c.textAlign='center';c.fillText('WARTEZEIT',x,y-6.4);c.font='600 5px Fredoka,sans-serif';c.fillText(w<1?'keine':Math.round(w)+' Min.',x,y-1.4);return true};
// Sonnseite: sulzige Stellen am Westhang am Nachmittag · Sonn-/Schattseite leicht getönt
KV.alt.drawDyn=function(c,t){
 if(kInV(300,1100,600)){const g=c.createLinearGradient(520,0,1000,0);g.addColorStop(0,'rgba(120,150,200,0)');g.addColorStop(.25,'rgba(120,150,200,.07)');g.addColorStop(1,'rgba(120,150,200,.12)');c.fillStyle=g;c.fillRect(520,640,600,980);
  const g2=c.createLinearGradient(0,0,520,0);g2.addColorStop(0,'rgba(255,220,140,.08)');g2.addColorStop(1,'rgba(255,220,140,0)');c.fillStyle=g2;c.fillRect(-100,640,620,980)}
 if(KG.wx!=='sonne'||KG.t<13||KG.t>17.5)return;const W=KW.pmap.west;if(!kPisteOpen(W))return;const a=kcl((KG.t-13)/1.5,0,1)*kcl((100-KG.pq.west)/30,.3,1);const r=kRNG(21);c.fillStyle='rgba(190,178,150,'+(.26*a).toFixed(3)+')';
 for(let i=0;i<W.d.length;i+=5){const q=W.d[i],r1=r(),r2=r(),r3=r(),r4=r();if(r1>.5||!kPtOpen(W,q)||!kInV(q[0],q[1],40))continue;const o=(r2*2-1)*.75;c.beginPath();c.ellipse(q[0]+q[4]*q[2]*o,q[1]+q[5]*q[2]*o,5+r3*9,1.6+r4*2.4,0,0,7);c.fill()}};
// Tippen: stillgelegte Lifte, verfallene Hütte und Hotel
KV.alt.hit=function(x,y,hit,d){for(const id of ['gs','ol']){const s=KG.l[id],L=kLC(id);if(s.on||KG.bau.find(b=>b.lift===id))continue;if(d(L.b[0],L.b[1])<40||d(L.t[0],L.t[1])<34){hit.push({k:'old:'+id,d:0});continue}
  const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(d(L.b[0]+dx*u,L.b[1]+dy*u)<14)hit.push({k:'old:'+id,d:1})}
 const H=KVOR.hut;if(!KG.b.hut&&d(H.x,H.y-12)<40)hit.push({k:'oldhut',d:0});const T=KVOR.hotel;if(!KG.hotel&&d(T.x,T.y-20)<55)hit.push({k:'oldhot',d:0})};
const KAINFO={ab:['🚡','Altbergbahn','2er-Sessel · Baujahr 1971'],gs:['🪑','Alter Gipfelsessel','Einersessel · Baujahr 1958 · stillgelegt seit 1994'],ol:['🪝','Alter Ostlift','Schlepplift · Baujahr 1968 · stillgelegt seit 1998']};
function kAOptHTML(i){let btn;if(i.done)btn='<span class="kchip g">✓ gebaut</span>';else if(i.bau)btn=`<span class="kchip o" style="display:block;text-align:center">🚧 im Bau · fertig ${kDayT(i.bau.d0+i.bau.days)} früh</span>`;
 else if(i.lock)btn=`<button class="btn" disabled style="width:100%">${kfmt(i.c)} · ${i.lock}</button>`;else btn=`<button class="tb ${i.kind==='n'?'green':'orange'}" data-a="buy" data-v="${i.id}" style="width:100%" ${kCanPay(i.c)?'':'disabled'}>${i.kind==='n'?'Bauen':i.id.startsWith('san')||i.id==='st3n'?'Sanieren':'Kaufen'} · ${kfmt(i.c)}</button>`;
 const rq=i.rq&&!i.done&&!i.bau?'<div style="font-size:12px;margin:2px 0 4px">'+i.rq.map(r=>`<span style="color:${r.ok?'#2e9e5b':'#b8480c'}">${r.ok?'✓':'○'} ${r.t}</span>`).join(' · ')+'</div>':'';
 return `<div class="kopt ${i.kind||'a'}"><h4>${i.ic} ${i.n.replace(/^Ausbau Stufe 3: /,'')}<span>${kfmt(i.c)}</span></h4><div style="font-size:12.5px;color:var(--mut)">⏱ ${i.days?i.days+(i.days===1?' Tag':' Tage')+' Bauzeit':'sofort'}${i.id.startsWith('st3')?' · zugleich Ausbau Stufe 3':''}</div>${i.pro?'<ul>'+i.pro.map(p=>`<li class="p">${p}</li>`).join('')+i.con.map(p=>`<li class="m">${p}</li>`).join('')+'</ul>':`<p style="font-size:13px;margin:4px 0 8px">${i.d}</p>`}${rq}${btn}</div>`}
function kAOpts(id){const seen={},out=[];for(const i of kBuildItems())if(i.lift===id&&!seen[i.id]&&!i.done){seen[i.id]=1;out.push(i)}return out}
function kADecide(id){const s=KG.l[id],I=KAINFO[id],c=Math.round(s.cond);let h=kHead(I[0]+' '+I[1])+`<div style="display:flex;gap:10px;align-items:center;margin:6px 0"><div style="font-size:34px">🏚️</div><div style="flex:1;font-size:13.5px;line-height:1.35"><b>${I[2]}</b><br><span style="color:var(--mut)">${kLC(id).bn} → ${kLC(id).tn}</span></div></div>`;
 h+=`<div style="font-size:12.5px;color:var(--mut)">Zustand</div><div class="kzb"><i style="width:${c}%"></i></div><div style="font-size:12px;color:#b8302a;margin-bottom:4px">${c} % · so nicht mehr fahrbereit</div>`;
 for(const i of kAOpts(id))h+=kAOptHTML(i);
 return h+'<p class="hint" style="text-align:center">Die Entscheidung ist endgültig. Saniert kann später noch abgerissen werden – abgerissen nicht mehr zurück.</p>'}
KV.alt.infHTML=function(k){
 if(k.startsWith('old:'))return kADecide(k.slice(4));
 if(k==='oldhut'||k==='oldhot'){const it=kBuildItems().find(i=>i.id===(k==='oldhut'?'hut':'hotel'));return kHead(k==='oldhut'?'🏚️ Gabelhütte':'🏚️ Hotel Alpenrose')+`<p class="hint">${k==='oldhut'?'Die alte Hütte an der Gabelung ist seit Jahren zu. Die Sonnenterrasse liegt genau am Gipfelhang.':'Das Hotel steht seit 2003 leer. Die Zimmer sind verstaubt, der Ausblick ist noch derselbe.'}</p>`+(it?kCardHTML(it):'')}
 return ''};
KV.alt.liftInfo=function(id){const s=KG.l[id],st=kAltSt(id);const n={old:'unsaniert'+(id==='ab'?' · Baujahr 1971':''),san:'saniert',nost:'Nostalgie-Sessel (saniert)',neu:'neu'}[st],bk={old:'3-mal so oft',san:'etwas öfter als neu',nost:'etwas öfter als neu',neu:'selten'}[st];
 let h=`<div class="bgh">Anlage</div><div class="row"><span>Zustand der Anlage</span><b>${n}</b></div><div class="row"><span>Pannen</span><b>${bk}</b></div>`;
 if(s.nost)h+=`<div class="row"><span>🪑 Nostalgiefahrt heute</span><b>${kfmt(KG.inc.nos||0)}</b></div>`;
 const O=kAOpts(id).filter(i=>i.kind);if(O.length)h+='<div class="bgh">Sanieren oder neu bauen</div>'+O.map(kAOptHTML).join('');return h};
KV.alt.pisteInfo=function(p){if(p.id==='west')return '<p class="hint">☀️ Sonnseite: bei Sonne wird der Westhang ab 13 Uhr weich und sulzig. Die Raupe richtet ihn nachts wieder her.</p>';if(p.id==='ost'||p.id==='rinne')return '<p class="hint">❄️ Schattseite: bei Tauwetter verliert der Hang nur halb so viel.</p>';return ''};
KV.alt.staExtra=function(){let h='<div class="bgh">Alte Lifte</div>';for(const id of ['ab','gs','ol','wl']){const s=KG.l[id];if(!s.on)continue;h+=`<div class="row"><span>🔧 ${kLC(id).n} · ${{old:'unsaniert',san:'saniert',nost:'Nostalgie',neu:'neu'}[kAltSt(id)]}</span><b>Zustand ${Math.round(s.cond)} %</b></div>`}
 if(kSeaN()===KVOR.seasons)h+=`<div class="row"><span>🏁 Letzte Woche</span><b>${kAltLW()}</b></div>`;return h};
KV.alt.voices=function(out){const l=KG.l;if(l.ab.on&&l.ab.zs===0)out.push(['🔩','„Die alte Altbergbahn quietscht und ruckelt.“']);
 if(KG.wx==='sonne'&&KG.t>=13.5&&kPisteOpen(KW.pmap.west))out.push(['☀️','„Am Westhang wird es am Nachmittag sulzig.“']);
 if(KG.wx==='tau'&&kPisteOpen(KW.pmap.ost))out.push(['❄️','„Auf der Schattseite ist der Schnee noch gut!“']);
 if(l.gs.on&&l.gs.nost)out.push(['🪑','„Der alte Einersessel – wie früher mit Opa!“']);
 if(!KG.hotel&&KG.stage>=2)out.push(['🏚️','„Schade um das schöne alte Hotel.“'])};
KV.alt.thumbPrep=function(G){G.l.ab.zs=2;G.l.ab.typ='s4';G.l.gs.typ='s1';G.l.gs.nost=1;G.l.gs.zs=1;G.l.gs.ch='n';G.l.ol.zs=1;G.b.cannons=1;G.hotel=1};
KV.alt.thumbR={x:20,y:280,w:1000};
// Landschaft: breiter Doppelgipfel, Sonn- und Schattseite, alte Straße
KV.alt.bg=function(c){kSky(c,250,'#6aaedc','#e1edf6');
 kRange(c,[[-80,150,140],[120,110,150],[300,150,130],[700,140,140],[880,100,160],[1080,150,140]],300,{rock:['#a3a8b4','#b9bdc7'],shade:'#e6edf4',cap:.45});
 c.fillStyle='#9aa0ad';c.beginPath();c.moveTo(250,320);c.lineTo(380,214);c.lineTo(440,236);c.lineTo(478,196);c.lineTo(560,232);c.lineTo(640,214);c.lineTo(780,320);c.closePath();c.fill();
 c.fillStyle='#b4b9c4';c.beginPath();c.moveTo(478,196);c.lineTo(560,232);c.lineTo(640,214);c.lineTo(780,320);c.lineTo(520,320);c.closePath();c.fill();
 c.fillStyle='#ffffff';c.beginPath();c.moveTo(-120,330);c.bezierCurveTo(160,300,330,250,450,262);c.bezierCurveTo(560,258,700,280,1120,320);c.lineTo(1120,2300);c.lineTo(-120,2300);c.closePath();c.fill();
 kSnowGround(c,280,2240);
 for(const [x,y,w] of [[360,300,40],[640,296,46],[720,330,30],[300,340,26]]){c.fillStyle='#a9aeb9';c.beginPath();c.moveTo(x-w/2,y+8);c.lineTo(x-w/4,y-4);c.lineTo(x+w/3,y-2);c.lineTo(x+w/2,y+8);c.closePath();c.fill();c.fillStyle='#fff';c.fillRect(x-w/4,y-4,w/2,2)}
 c.strokeStyle='#7b5236';c.lineWidth=2.2;c.beginPath();c.moveTo(478,268);c.lineTo(478,242);c.moveTo(470,250);c.lineTo(486,250);c.stroke();
 // freier Talboden zwischen den Pisten-Enden
 c.fillStyle='rgba(225,236,246,.6)';c.beginPath();c.ellipse(522,1588,120,22,0,0,7);c.fill();
 const W=KVOR.walkY,RY=KVOR.road.y;c.fillStyle='#e2d4bb';c.fillRect(-110,W-6,1220,12);c.fillStyle='#ead9be';c.fillRect(-110,W-5,1220,3);
 kRoad(c,RY,-160,1160,34);if(!KG.paved){const r=kRNG(RY);c.fillStyle='#6b6f78';c.fillRect(-160,RY-17,1320,34);c.fillStyle='rgba(40,40,50,.35)';for(let i=0;i<60;i++){c.beginPath();c.ellipse(-150+r()*1300,RY-13+r()*26,3+r()*5,1.4+r(),0,0,7);c.fill()}c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=1.2;c.setLineDash([12,14]);c.beginPath();c.moveTo(-160,RY);c.lineTo(1160,RY);c.stroke();c.setLineDash([])}
 c.fillStyle='#d9dee6';c.fillRect(-160,RY-24,1320,7);c.fillRect(-160,RY+17,1320,7);
 const bx=KVOR.bus.x-20;c.fillStyle='#2e9e5b';c.fillRect(bx,RY-36,1.6,14);c.beginPath();c.roundRect(bx-6,RY-44,14,9,2);c.fill();c.fillStyle='#fff';c.font='700 6px Fredoka,sans-serif';c.textAlign='center';c.fillText('H',bx+1,RY-37);
 kSign(c,bx+1,RY-52,'🚌 Altberg Dorf','#2e9e5b','#fff',5)};
KV.alt.staticExtra=function(c){kSign(c,-56,1862,'ALTBERG','#f2c53b','#2b3040',7)};
KV.alt.decor=function(D){for(const [x,y,w,h,k] of [[150,2000,52,28,1],[300,2050,48,26,0],[640,2030,56,30,2],[850,2010,50,28,0],[480,2120,46,26,1],[-40,2080,48,26,2],[1020,2060,50,28,1]])D.house(x,y,w,h,k);
 const mix=r=>r()<.25?'l':'p';
 D.scatter(-90,260,1090,1640,4800,51,(x,y)=>y<300?0:y>1560?.45:.95,mix);D.scatter(-90,1950,1090,2240,460,52,()=>.55,mix)};
KV.alt.blocks=function(B){
 B.box(360,1650,480,1732);B.box(-200,1740,1200,1990);B.box(690,1680,840,1770);B.box(-14,1648,60,1704);B.box(306,1676,372,1722);
 B.box(430,1550,610,1600);   // Talboden zwischen den Pisten-Enden
 B.box(640,590,744,668);B.box(536,744,562,776); // Gabelhütte, Wegweiser
 B.box(466,856,530,940);     // Anstellbereich Gipfelsessel
 B.box(470,1636,542,1722);B.box(70,1606,142,1700);B.box(800,1606,872,1700); // Anstellbereiche im Tal
 B.line([[440,1594],[466,1632]],7);B.line([[652,1616],[642,1700],[572,1732]],7);B.line([[352,1612],[262,1680],[176,1708]],7);B.line([[690,1606],[790,1700]],7);B.line([[884,1704],[884,1770]],6);
 B.line([[626,656],[648,660],[668,652]],8);B.line([[60,1716],[260,1700],[372,1612]],10)};

// ===== Berg-Vorlage 4: Seekar – Berg hinter dem See: Brücke, Seeschiff, Seebahn, Seehotel, Felsweg mit Galerie =====
// Anreise: kleiner Parkplatz Nord (8 Plätze, über die Brücke) · großer Parkplatz Süd (3 Reihen) → zu Fuß über die Brücke, mit dem Seeschiff oder (Stufe 5) mit der Seebahn.
// Zwei Kassen: West (Anleger, Seehotel) und Ost (Brücke, Parkplatz Nord, Skibus, Seebahn) – jeder Gast kauft dort, wo er ankommt.
const kSN=x=>1562+8*Math.sin(x/70)+5*Math.sin(x/23),kSS=x=>1846+12*Math.sin(x/60+1)+6*Math.sin(x/19);
const kWL=y=>200-60*Math.sin((y-300)/1100*Math.PI),kWR=y=>810+50*Math.sin((y-300)/1100*Math.PI);
const KSLAKE=[];for(let x=-160;x<=1160;x+=20)KSLAKE.push([x,kSN(x)]);for(let x=1160;x>=-160;x-=20)KSLAKE.push([x,kSS(x)]);
const KSE={WY:1544,KO:[726,1532],BX:879,PX:500,SBX:790,SBS:1952,SBN:1474,GY:1922,F1:1999,F2:2077,
 dockN:1602,dockS:1810,lane:[522,478],cap:60,sbV:80,goalG:500};
KV.seek={id:'seek',n:'Seekar',am:'am Seekar',bounds:{x0:-140,x1:1140,y0:150,y1:2260},home:{x:640,y:1560,S:1.0,cx:640,cy:1640},
 desc:'Ein steiles Kar zwischen hellen Felswänden – direkt hinter einem See. Im Tal ist kaum Platz: nur 8 Parkplätze an der Talstation. Der große Parkplatz liegt am anderen Ufer – ohne Schiff gehen die Gäste zu Fuß über die Brücke.',
 stages:5,seasons:2,start:1000,snow0:44,kioskAlways:1,runRef:760,arrShift:.45,
 welcome:'Willkommen am Seekar! Der Talsessel läuft. Die meisten Gäste parken am anderen Ufer und gehen zu Fuß über die Brücke – mit einem Seeschiff ginge es viel schneller (🔨 Bauen › Anreise).',
 tip:'Tipp: Das Seeschiff bringt die Gäste schnell über den See – 🔨 Bauen › Anreise',tipIf:()=>!KG.b.ship,
 preHint:'Am Seekar ist die Fahrt mit Schiff und Seebahn in der Tageskarte enthalten. Fair heißt: so viel wie die Gegend gerade wert ist.',
 mix:{fam:.3,anf:.18,pro:.3,sb:.22},priceSens:1.0,
 wx:{sonne:.5,neuschnee:.22,tau:.18,sturm:.1},
 rivals:['Zinnenbahnen','Seeblick-Lifte','Dolomitenhang','Felsenkar','Rosengarten-Lifte','Seiser Hang','Kristallkar','Marmolata-Lifte','Lago Bianco','Sellaritt'],
 rivS:[790,730,670,610,560,510,460,410,360,310],rivG:1.2,
 parkY:1960,valleyY:1500,walkY:KSE.WY,road:{y:2216},bus:{x:990,y:1530},zebra:null,starTh:[0,0,300,430,560,690],
 pistes:[
  {id:'ka',n:'Karabfahrt',col:'b',st:1,sec:[[1090,1],[-1e9,2]],pts:[[508,420,92],[488,560,112],[452,720,86],[420,880,58],[432,1040,46],[476,1190,44],[506,1330,50],[520,1440,56]]},
  {id:'fw',n:'Felsweg',col:'r',st:3,wear:.05,pts:[[420,610,40],[338,652,30],[250,722,28],[204,800,28],[230,880,28],[320,990,30],[410,1054,32]]},
  {id:'zr',n:'Zackenrinne',col:'s',st:4,wear:.055,pts:[[624,336,12],[668,356,16],[722,400,20],[758,470,20],[784,560,22],[772,660,22],[744,780,24],[724,880,26],[684,946,24],[610,984,22],[540,1012,26],[470,1034,30]]},
  {id:'zm',n:'Zubringer',col:'b',st:1,conn:1,pts:[[606,1104,10],[560,1112,11],[512,1120,14]]},
  {id:'zk',n:'Zubringer',col:'b',st:2,conn:1,pts:[[656,656,10],[612,654,11],[566,650,14]]},
  {id:'zg',n:'Zubringer',col:'b',st:4,conn:1,pts:[[598,334,10],[560,360,12],[526,398,16]]}],
 lifts:[
  {id:'ts',n:'Talsessel',sh:'Talsessel',typ:'s4',st:1,b:[656,1468],t:[640,1092],nx:'ks',exit:[606,1100],py:[.3,.62],pistes:['zm','ka'],bn:'Talstation',tn:'Mittelstation',ovh:2500,up:1,upF:.7},
  {id:'ks',n:'Karsessel',sh:'Karsessel',typ:'s6',st:2,b:[640,1092],t:[688,640],nx:'gg',exit:[656,652],py:[.15,.42,.7],pistes:['zk','ka','fw'],bn:'Mittelstation',tn:'Karstation',ovh:3000,up:1,upF:.7},
  {id:'gg',n:'Gipfelgondel',sh:'Gipfelgondel',typ:'g8',st:4,b:[688,640],t:[612,318],exit:[612,336],pistes:['zg','zr','ka','fw'],bn:'Karstation',tn:'Gipfel',ovh:3500,up:1,upF:.7}],
 kassa:{x:420,y:1532},
 lots:[{id:'pn',n:'Parkplatz Nord',x0:926,x1:1070,y0:1446,y1:1494,base:1},{id:'r1',n:'Parkplatz Süd · Reihe 1',x0:40,x1:634,y0:1932,y1:1988,base:1},
  {id:'r2',n:'Reihe 2',x0:40,x1:634,y0:2010,y1:2066},{id:'r3',n:'Reihe 3',x0:40,x1:634,y0:2088,y1:2144,st:3}],
 hut:{x:330,y:522,in:[[396,540],[372,534],[352,530]],cost:9000,days:2,st:2,n:'Karhütte',pid:'ka'},
 garage:{x:380,y:1440},bwHut:{x:1102,y:1470},bwStart:[1102,1486],
 hotel:{x:210,y:1522,w:118,h:76,k:2,cost:25000,days:3,st:2,rooms:40,n:'Seehotel',sign:'SEEHOTEL ★★★★',
  pin:()=>[[214,1528],[260,1544],[400,1544],[420,1540]],pout:()=>[[400,1544],[260,1544],[214,1528]]},
 cannons:{cost:9000,st:2},
 goals:[
  {k:'pf',t:'3 Sterne',sh:'3 ★',prog:()=>kStars()+' ★',ok:()=>kStars()>=3,lock:1},
  {k:'zu',t:'Einmal '+knum(KSE.goalG)+' Gäste an einem Tag',sh:knum(KSE.goalG)+' Gäste',prog:()=>'bester Tag: '+knum(Math.max(KG.maxG||0,KG.gDay||0)),ok:()=>Math.max(KG.maxG||0,KG.gDay||0)>=KSE.goalG,lock:1},
  {k:'me',t:'Platz 3 oder besser in der Rangliste',sh:'Platz 3',prog:()=>'jetzt Platz '+kRank(),ok:()=>kRank()<=3,end:1}],
 stageInfo:[null,
  {n:'Talabfahrt',d:'Der Talsessel bis zur Mittelstation und der untere Teil der Karabfahrt.'},
  {n:'Kar',d:'Der 6er-Karsessel fährt von der Mittelstation ins breite Kar. Die ganze Karabfahrt ist offen, die Karhütte kann gebaut werden.',cost:12000,days:2,req:[['ruf',52,'Ruf mindestens 52 %'],['gst',150,'150 Gäste insgesamt']]},
  {n:'Felsweg',d:'Die rote Abfahrt zweigt im Kar ab und führt durch eine Felsgalerie an der Wand entlang – ein Erlebnis für Könner.',cost:10000,days:2,req:[['stars',2,'2 Sterne'],['ruf',56,'Ruf mindestens 56 %']]},
  {n:'Gipfel',d:'Eine 8er-Gondelbahn bis zum Gipfel und die schwarze Zackenrinne zwischen den Felsen.',cost:30000,days:4,req:[['stars',3,'3 Sterne'],['ruf',60,'Ruf mindestens 60 %']]},
  {n:'Seebahn',d:'Eine 8er-Gondelbahn über den See vom großen Parkplatz zur Talstation – sie fährt den ganzen Tag in beide Richtungen.',cost:45000,days:5,req:[['ship',1,'Seeschiff fährt'],['stars',3,'3 Sterne'],['ruf',64,'Ruf mindestens 64 %']]}],
 fair:{ticket:[0,21,25,29,32,35],park:4,food:14,kids:7,school:24,hotel:95}
};
KV.seek.init=function(s){s.l.ts.on=1;s.snow=44;s.b.ship=0;s.b.ship2=0;s.b.bus2=0;s.shipD=0;s.ship2D=0;s.maxG=0;s.sbLg=0};
KV.seek.req=function(r){if(r[0]==='ship')return !!KG.b.ship;return null};
KV.seek.lamps=function(){const o=[];for(let x=20;x<=1060;x+=90){if(Math.abs(x-KSE.PX)<24||Math.abs(x-330)<40||x>140&&x<300||Math.abs(x-KSE.BX)<30)continue;o.push([x,Math.min(1556,kSN(x)-6)])}
 for(let y=1600;y<=1840;y+=80){o.push([868,y]);o.push([926,y])}for(let x=40;x<=1080;x+=110){if(x>440&&x<560)continue;o.push([x,Math.max(1868,kSS(x)+16)])}for(let x=-80;x<=1080;x+=120)o.push([x,2192]);return o};
KV.seek.world=function(){const P=KW.pmap,K=P.ka,near=(Q,x,y)=>{let b=0,bd=1e9;for(const q of Q.d){const d=Math.hypot(q[0]-x,q[1]-y);if(d<bd){bd=d;b=q[3]}}return b};
 for(const id of ['zm','zk','zg','fw','zr']){const C=P[id],e=C.d[C.d.length-1];C.next={p:'ka',s:near(K,e[0],e[1])}}
 K.brs=[{s:near(K,420,610),p:'fw',k:'fw'}]};
KV.seek.paths=function(){return {busUp:[],zebra:[]}};
// Wo ist der Gast? kw/ko Kassen · end Ende der Karabfahrt · ts Talstation · mit/kar/gip Stationen · sud Südufer · pro Promenade
KV.seek.where=function(f){const d=(x,y)=>Math.hypot(f.x-x,f.y-y);if(f.y>1600)return 'sud';
 if(d(420,1540)<60)return 'kw';if(d(KSE.KO[0],KSE.KO[1]+8)<46)return 'ko';
 if(d(520,1450)<90&&f.y<1500)return 'end';if(f.x>500&&f.x<660&&f.y>1470&&f.y<1540)return 'ts';
 if(d(640,1092)<90)return 'mit';if(d(688,640)<80)return 'kar';if(d(612,318)<70)return 'gip';
 if(f.y>1490)return 'pro';return 'x'};
KV.seek.route=function(from,to,f){const W=KSE.WY;if(from===to)return [];if(!f)f={x:420,y:1540};
 if(to==='ts'){if(from==='end')return [[552,1470],[574,1494]];if(from==='kw')return [[440,1544],[560,1544]];if(from==='ko')return [[700,1544],[650,1544]];if(from==='pro')return [[f.x,W],[f.x<600?560:650,W]];return [[574,1494]]}
 if(to==='ks'||to==='gg')return [];
 if(to==='kas'){if(from==='end')return [[552,1478],[560,1510],[540,W],[440,W],[420,1540]];if(from==='ko')return [[700,W],[440,W],[420,1540]];return [[f.x,W],[440,W],[420,1540]]}
 return KVOR.route(from,'kas',f)};
KV.seek.chooseLift=function(){return 'ts'};
// Aussteigen oben: weiter mit dem nächsten Lift oder abfahren
KV.seek.unload=function(o,f){const id=o.L.id,ty=f.ty,up=(nx,p0)=>{if(!KG.l[nx].on||!kLiftOpen(nx)||KG.t>=15.3||f.leaving)return 0;let p=p0[ty]||.5;if(f.kid)p*=.7;const w=kWait(nx);if(w>20)p*=.45;else if(w>10)p*=.75;if(kR()<p){kToQueue(f,nx);return 1}return 0};
 if(id==='ts'){if(KG.stage>=2&&up('ks',{pro:.88,sb:.84,fam:.62,anf:.3}))return;kSkiStart(f,'zm');return}
 if(id==='ks'){if(KG.stage>=4&&up('gg',{pro:.8,sb:.74,fam:.36,anf:.1}))return;kSkiStart(f,'zk');return}
 const zr=kPisteOpen(KW.pmap.zr),p={pro:.46,sb:.36,fam:.03,anf:0}[ty]||.2;kSkiStart(f,zr&&!f.kid&&kR()<p?'zr':'zg')};
// Abzweig Felsweg: nur wer auf der linken Hälfte fährt (kein Sprung über die Piste)
KV.seek.branch=function(f,b){if(!kPisteOpen(KW.pmap.fw))return 0;if((f.lo||0)<-.05)return 0;let p={pro:.85,sb:.78,fam:.25,anf:.04}[f.ty]||.4;if(f.kid)p*=.4;return kR()<p};
KV.seek.descend=function(f){if(f.st==='hurt'&&f.pid){f.st='ski';f.v=Math.min(f.v||20,20);f.leaveT=0;f.engIn=null;f.engQ=null;f.engHold=0;return true}
 if(f.st==='ski')return false;const m={mit:['zm',[606,1100]],kar:['zk',[656,652]],gip:['zg',[612,336]]}[KVOR.where(f)];if(!m)return false;
 f.leaveT=0;f.x=m[1][0];f.y=m[1][1];kSkiStart(f,m[0]);return true};
KV.seek.hideF=function(f){return f.st==='ski'&&f.pid==='fw'&&f.y>748&&f.y<834};
KV.seek.resPre=function(){return [[1080,1440],[960,1428],[860,1428],[740,1424],[620,1418],[560,1420]]};
// Warteschlangen: Talstation (zwei Blöcke links), Mittel- und Karstation (rechts)
KV.seek.qSlot=function(o,i){const id=o.L.id;
 if(id==='ts'){if(i<63){const r=Math.floor(i/9),j=i%9;return [642-(r%2?8-j:j)*7,1484+r*8]}const k=Math.min(i-63,39),r=Math.floor(k/8),j=k%8;return [570-(r%2?7-j:j)*7.4,1532-r*8]}
 if(id==='ks'){const k=Math.min(i,62),r=Math.floor(k/9),j=k%9;return [666+(r%2?8-j:j)*7,1108+r*7]}
 if(id==='gg'){const k=Math.min(i,41),r=Math.floor(k/7),j=k%7;return [704+(r%2?6-j:j)*6.5,656+r*7]}return null};
function kSeeFenceBlock(c,x0,x1,ys,dir){c.strokeStyle='#8a94a8';c.lineWidth=1;for(let r=0;r<ys.length;r++){const y=ys[r];let a=x0,b=x1;if(r>0&&r<ys.length-1){if(r%2===dir)a=x0+8;else b=x1-8}c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.stroke();c.fillStyle='#5d667a';for(let x=a;x<=b;x+=12)c.fillRect(x-.7,y-1.4,1.4,2.8)}}
function kSeeWaitSign(c,id,x,y){const w=kWait(id);c.fillStyle='#5d667a';c.fillRect(x-.8,y,1.6,12);c.fillStyle=w>22?'#e8504a':w>8?'#f2a63b':'#2e9e5b';c.beginPath();c.roundRect(x-16,y-12,32,13,2.5);c.fill();c.fillStyle='#fff';c.font='700 5.6px Fredoka,sans-serif';c.textAlign='center';c.fillText('WARTEZEIT',x,y-6.4);c.font='600 5px Fredoka,sans-serif';c.fillText(w<1?'keine':Math.round(w)+' Min.',x,y-1.4)}
KV.seek.fence=function(c,o,id){const n=o.q.length;
 if(id==='ts'){const R=Math.max(3,Math.min(7,Math.ceil(n/9)+1)),ys=[];for(let r=0;r<=R;r++)ys.push(1480+r*8);kSeeFenceBlock(c,580,648,ys,0);
  if(n>60){const R2=Math.min(5,Math.ceil((n-63)/8)+1),y2=[];for(let r=0;r<=R2;r++)y2.push(1536-r*8);kSeeFenceBlock(c,508,576,y2,1)}kSeeWaitSign(c,id,700,1462);return true}
 if(id==='ks'){const R=Math.max(3,Math.min(7,Math.ceil(n/9)+1)),ys=[];for(let r=0;r<=R;r++)ys.push(1104+r*7);kSeeFenceBlock(c,660,728,ys,1);kSeeWaitSign(c,id,744,1100);return true}
 if(id==='gg'){const R=Math.max(3,Math.min(6,Math.ceil(n/7)+1)),ys=[];for(let r=0;r<=R;r++)ys.push(652+r*7);kSeeFenceBlock(c,698,748,ys,1);kSeeWaitSign(c,id,762,700);return true}return false};
// Lifte zeichnen: eigene Stützenplätze (nie auf einer Piste)
KV.seek.liftLook=function(c,o,t){const s=KG.l[o.L.id],T0=o.T,{bx,by,tx,ty,len,ux,uy}=o,co=T0.co,PY=kAPy(o.L,len,0);
 c.strokeStyle='#161a28';c.lineWidth=1.2;const px=-uy,py=ux;for(const sd of [-1,1]){c.beginPath();c.moveTo(bx+px*co*sd,by+py*co*sd);c.lineTo(tx+px*co*sd,ty+py*co*sd);c.stroke()}
 for(const u of PY){const x=bx+(tx-bx)*u,y=by+(ty-by)*u;if(kInV(x,y))pylonN(c,x,y,co+3)}
 const cap=T0.cap;for(const ch of o.ch){if(ch.u<.03||ch.u>1.97||Math.abs(ch.u-1)<.03)continue;const [x,y]=kLiftPos(o,ch.u);if(!kInV(x,y,30))continue;const k={r:ch.r.map(f=>({col:f.col}))};
  c.save();c.translate(x,y);c.rotate(Math.sin(ch.u*40+t*.8)*.04);if(s.typ==='g8')kACabin(c,k);else gondola(c,k,cap);c.restore()}return true};

// ---------- Anreise: Wege, Seeschiff, Seebahn, Autos, Skibus ----------
function kSeeCarX(c){return c.sx+9}
// Weg vom Auto zum Gehweg oberhalb von Reihe 1 (zwischen den Autos hindurch) bzw. auf die Promenade
function kSeeFromCar(c){const x=kSeeCarX(c);if(c.lot==='pn')return [[x,c.py+6],[x,1500],[x,KSE.WY]];return [[x,c.py],[x,KSE.GY]]}
function kSeeToCar(c){return kRev(kSeeFromCar(c))}
const KSW={ // Teilstrecken
 sToShip:[[KSE.PX,KSE.GY],[KSE.PX,1884]],
 sToSb:[[700,KSE.GY],[728,1946]],
 sToBridgeN:[[700,KSE.GY],[740,1900],[870,1890],[KSE.BX,1880],[KSE.BX,KSE.WY]],
 nToKO:[[760,KSE.WY],[KSE.KO[0],KSE.WY],[KSE.KO[0],KSE.KO[1]+8]],
 nToKW:[[440,KSE.WY],[420,1540]]};
function kSeePathLen(P,x,y){let L=0,px=x,py=y;for(const p of P){L+=Math.hypot(p[0]-px,p[1]-py);px=p[0];py=p[1]}return L}
// Seeschiff: Fahrplan (zwei Schiffe, je 30 Minuten; das zweite 15 Minuten versetzt)
function kSeeShipOn(i){return !!KG.b.ship&&(i===0||!!KG.b.ship2)&&KG.day>=(i?KG.ship2D:KG.shipD)&&KG.wx!=='sturm'}
function kSeeT0(i){return 7.5+i*.25}
function kSeeK(i){return Math.floor((18-kSeeT0(i))/.5)}
function kSeePh(i,t){const T0=kSeeT0(i),K=kSeeK(i);if(!kSeeShipOn(i)||t<T0||t>=T0+(K+1)*.5)return {st:'S',k:-1};const z=(t-T0)/.5,k=Math.floor(z),p=(z-k)*.5;
 if(p<.2)return {st:'go',u:p/.2,k};if(p<.25)return {st:'N',k};if(p<.45)return {st:'back',u:(p-.25)/.2,k};return {st:'S',k}}
function kSeeDeps(i,side){const out=[];if(!kSeeShipOn(i))return out;const T0=kSeeT0(i);for(let k=0;k<=kSeeK(i);k++)out.push(side==='S'?T0+k*.5:T0+k*.5+.25);return out}
function kSeeNextDep(side,t){let b=null;for(const i of [0,1])for(const d of kSeeDeps(i,side))if(d>=t&&(b==null||d<b))b=d;return b}
function kSeeShipN(){return (kSeeShipOn(0)?1:0)+(kSeeShipOn(1)?1:0)}
function kSeeShipPos(i){const sh=KW.ships&&KW.ships[i],ph=kSeePh(i,KG.t),e=u=>u*u*(3-2*u);let y=KSE.dockS,mv=0,dir=0;
 if(ph.st==='N')y=KSE.dockN;else if(ph.st==='go'){y=KSE.dockS+(KSE.dockN-KSE.dockS)*e(ph.u);mv=1;dir=-1}else if(ph.st==='back'){y=KSE.dockN+(KSE.dockS-KSE.dockN)*e(ph.u);mv=1;dir=1}
 return {x:KSE.lane[i],y,mv,dir,ph}}
// Seebahn
function kSeeSbOn(){return KG.stage>=5&&KG.wx!=='sturm'}
function kSeeSbLen(){return KSE.SBS-KSE.SBN}
function kSeeSbSetup(){const len=kSeeSbLen(),sp=62*Math.pow(.86,KG.sbLg||0),n=Math.max(6,Math.floor(2*len/sp));const old=KW.sbw;const o={n,len,ch:Array.from({length:n},(_,i)=>({u:i*2/n,r:[]})),q:old?old.q:{S:[],N:[]},cnt:old?old.cnt:0};
 if(old)for(const c of old.ch)for(const f of c.r)o.ch[0].r.push(f);KW.sbw=o;return o}
function kSeeSbRate(){const o=KW.sbw||kSeeSbSetup(),sp=2*o.len/o.n;return KRT*KSE.sbV/sp*8}   // Gäste je Spielstunde und Richtung
function kSeeSbPos(u){const up=u<1,a=up?u:2-u,x=KSE.SBX+(up?10:-10);return [x,KSE.SBS-(KSE.SBS-KSE.SBN)*a]}
// geschätzte Dauer bis zur Kassa (Spielstunden) – danach entscheidet sich die Gruppe
function kSeeEst(m,side,from){const t=KG.t,x=from[0],y=from[1];
 if(m==='walk')return (side==='S'?Math.abs(y-KSE.GY)+kSeePathLen(KSW.sToBridgeN,x,KSE.GY)+kSeePathLen(KSW.nToKO,KSE.BX,KSE.WY):Math.abs(x-KSE.BX)+kSeePathLen(kRev(KSW.sToBridgeN),KSE.BX,KSE.WY)+300)/(13*2.3*KRT)*1.25;
 if(m==='ship'){if(!kSeeShipN())return null;const d=side==='S'?Math.abs(x-KSE.PX)+Math.abs(y-1884)+80:Math.abs(x-KSE.PX)+80,ta=t+d/(11*2.3*KRT),nd=kSeeNextDep(side,ta);if(nd==null)return null;
  const q=(KW.shipQ?KW.shipQ[side].length:0)+KW.folks.filter(g=>g.nx==='shipq'&&(g.y>1700)===(side==='S')).length;const per=KSE.cap,iv=.5/kSeeShipN();let w=nd-t+Math.floor(q/per)*iv;if(side==='N'&&nd+Math.floor(q/per)*iv>18.3)return null;return w+.2+.1}
 if(m==='sb'){if(!kSeeSbOn()||t>18.3)return null;const d=side==='S'?Math.abs(x-728)+Math.abs(y-KSE.GY)+60:Math.abs(x-812)+60;const q=KW.sbw?KW.sbw.q[side].length:0;return d/(11*2.3*KRT)+q/kSeeSbRate()+kSeeSbLen()/KSE.sbV/KRT+.06}
 return null}
function kSeeChoose(side,from){const o=[['walk',kSeeEst('walk',side,from)]];for(const m of ['ship','sb']){const v=kSeeEst(m,side,from);if(v!=null)o.push([m,v])}
 let best='walk',bv=1e9;for(const [m,v] of o){const vv=v*(.85+kR()*.3);if(vv<bv){bv=vv;best=m}}return best}
// Unterwegs zur Kassa (Ankunft) bzw. heim (abends)
function kSeeCount(m,n){const A=KG.res.arr||(KG.res.arr={});A[m]=(A[m]||0)+n}
function kSeeGoKassa(f,path,ko,sp){f.kasP=ko?[KSE.KO[0],KSE.KO[1]]:[KVOR.kassa.x,KVOR.kassa.y];kWalk(f,path,'kassa',sp||11)}
function kSeeDepart(f,m,from){// Südufer → Nordufer
 const P=from.slice();if(m==='walk'){f.sat-=5;kSeeGoKassa(f,P.concat(KSW.sToBridgeN,KSW.nToKO),1,13);return}
 if(m==='ship'){kWalk(f,P.concat(KSW.sToShip),'shipq',11);return}
 if(m==='sb'){kWalk(f,P.concat(KSW.sToSb),'sbq',11);return}}
// abends: zurück zum Auto, zum Bus, ins Hotel
KV.seek.goHome=function(f){const w=KVOR.where(f),W=KSE.WY;let P=[];
 if(w==='end')P=[[552,1478],[560,1510],[560,W]];else if(w==='sud'){f.st='gone';return}else P=[[f.x,Math.max(f.y,W)]];
 const here=P[P.length-1];
 if(f.hotelG){kWalk(f,P.concat(KVOR.hotel.pout()),'hotelin',11);return}
 if(f.busG){kWalk(f,P.concat([[990+(kR()-.5)*30,W+6]]),'busw',11);return}
 const c=f.car;if(!c){kWalk(f,P,'inshome',11);return}
 if(c.lot==='pn'){kWalk(f,P.concat([[kSeeCarX(c),W]],kSeeToCar(c)),'car',11);return}
 let m=kSeeChoose('N',here);f.retM=m;
 if(m==='ship'){kWalk(f,P.concat([[KSE.PX,W]]),'shipq',11);return}
 if(m==='sb'){kWalk(f,P.concat([[812,W]]),'sbq',11);return}
 kSeeWalkHome(f,P)};
function kSeeWalkHome(f,P){const c=f.car;f.retM='walk';kWalk(f,P.concat([[KSE.BX,KSE.WY]],kRev(KSW.sToBridgeN),[[kSeeCarX(c),KSE.GY]],kSeeToCar(c).slice(1)),'car',13)}
// Ankunft am Anleger oder an der Seebahn: anstellen (fährt nichts mehr → zu Fuß)
KV.seek.arrive=function(f,nx){if(nx==='shipq'||nx==='sbq'){const side=f.y>1700?'S':'N',ship=nx==='shipq';
  const ok=ship?(kSeeNextDep(side,KG.t)!=null&&(side==='S'||KG.t<18.25)):kSeeSbOn()&&KG.t<18.5;
  if(!ok){kSeeFallback(f,side);return true}
  f.st=ship?'shipw':'sbw';f.qs=side;f.qT=KG.t;(ship?(KW.shipQ||(KW.shipQ={S:[],N:[]})):(KW.sbw||kSeeSbSetup()).q)[side].push(f);return true}
 if(nx==='busw'){f.st='busw';return true}
 return false};
function kSeeFallback(f,side){if(side==='S'){kSeeCount('walk',1);kSeeGoKassa(f,[[KSE.PX,KSE.GY]].concat(KSW.sToBridgeN,KSW.nToKO),1,13);f.sat-=5;return}
 if(f.car)kSeeWalkHome(f,[[f.x,KSE.WY]]);else f.st='gone'}
function kSeeQSlot(kind,side,i){
 if(kind==='ship'){if(side==='S'){if(i<30)return [KSE.PX+[0,-6,6][i%3],1790+Math.floor(i/3)*6.4];const j=i-30;return [488-Math.floor(j/2)*7,1866+(j%2)*8]}
  if(i<33)return [KSE.PX+[0,-6,6][i%3],1624-Math.floor(i/3)*6.6];const j=i-33;return [486-Math.floor(j/2)*7,1552+(j%2)*7]}
 if(side==='S'){const k=Math.min(i,71),r=Math.floor(k/9),j=k%9;return [776-(r%2?8-j:j)*7,1968+r*7]}
 const k=Math.min(i,48),r=Math.floor(k/7),j=k%7;return [812+(r%2?6-j:j)*7,1486+r*7]}
KV.seek.folkStep=function(f,dt){const st=f.st;
 if(st==='shipw'||st==='sbw'){const Q=st==='shipw'?KW.shipQ[f.qs]:KW.sbw.q[f.qs],i=Q.indexOf(f);if(i<0)return;const [sx,sy]=kSeeQSlot(st==='shipw'?'ship':'sb',f.qs,i),dx=sx-f.x,dy=sy-f.y,d=Math.hypot(dx,dy);if(d>.3){const m=Math.min(d,26*dt);f.x+=dx/d*m;f.y+=dy/d*m}f.sv=0;return}
 if(st==='shipb'){const sh=KW.ships[f.shipI],g=f.gang,dx=g[0]-f.x,dy=g[1]-f.y,d=Math.hypot(dx,dy),m=60*dt;if(d<=m){kSeeAboard(sh,f)}else{f.x+=dx/d*m;f.y+=dy/d*m}}};
function kSeeAboard(sh,f){f.st='ship';f.hide=1;const i=sh.bd.indexOf(f);if(i>=0)sh.bd.splice(i,1);sh.load.push(f)}
// Schiffe bewegen, ein- und aussteigen
function kSeeShipTick(t0,t1){if(!KW.ships)KW.ships=[{load:[],bd:[]},{load:[],bd:[]}];if(!KW.shipQ)KW.shipQ={S:[],N:[]};
 for(const i of [0,1]){const sh=KW.ships[i],a=kSeePh(i,t0),b=kSeePh(i,t1);const gx=KSE.lane[i]+(i?12:-12);
  if(a.st!==b.st||a.k!==b.k){
   if((a.st==='S'||a.st==='N')&&(b.st==='go'||b.st==='back')){for(const f of sh.bd.slice())kSeeAboard(sh,f);sh.dep={t:t1,dir:b.st==='go'?'N':'S',n:sh.load.length};(KW.shipLog||(KW.shipLog=[])).push({t:t1,i,dir:sh.dep.dir,n:sh.load.length});KG.res.shipN=(KG.res.shipN||0)+sh.load.length;sh.used=(sh.used||0)+sh.load.length;sh.trips=(sh.trips||0)+1}
   if(a.st==='go'&&b.st==='N')kSeeShipUnload(sh,'N',[gx,KSE.dockN]);
   if(a.st==='back'&&b.st==='S')kSeeShipUnload(sh,'S',[gx,KSE.dockS])}
  // einsteigen, solange das Schiff liegt und noch fährt
  const side=b.st==='N'?'N':b.st==='S'?'S':null;if(!side||b.k<0&&!(kSeeShipOn(i)&&t1>=kSeeT0(i)-.08&&t1<kSeeT0(i)))continue;
  const Q=KW.shipQ[side];while(Q.length&&sh.load.length+sh.bd.length<KSE.cap){const f=Q.shift();f.st='shipb';f.shipI=i;f.gang=[gx,side==='N'?KSE.dockN:KSE.dockS];sh.bd.push(f)}}
 // nach der letzten Abfahrt: wer noch am Anleger Nord wartet, geht zu Fuß
 if(KG.t>18.26&&KW.shipQ.N.length)for(const f of KW.shipQ.N.splice(0))kSeeFallback(f,'N')}
function kSeeShipUnload(sh,side,g){let k=0;for(const f of sh.load){f.hide=0;f.x=g[0];f.y=g[1]+(k%3-1)*5;f.delay=k*.035;k++;
  if(side==='N')kSeeGoKassa(f,[[KSE.PX,g[1]-6],[KSE.PX,1550]].concat(KSW.nToKW),0,11);
  else if(f.car)kWalk(f,[[KSE.PX,g[1]+6],[KSE.PX,1884],[KSE.PX,KSE.GY],[kSeeCarX(f.car),KSE.GY]].concat(kSeeToCar(f.car).slice(1)),'car',11);else f.st='gone'}
 sh.load=[]}
// Seebahn: Kabinen im Kreis, Einstieg an beiden Stationen
function kSeeSbTick(dt){if(KG.stage<5)return;const o=KW.sbw||kSeeSbSetup();const riders=o.ch.some(c=>c.r.length),on=kSeeSbOn()&&KG.t>=7.4&&KG.t<18.6;o.run=on||riders&&KG.wx!=='sturm';if(!o.run)return;
 const du=KSE.sbV*dt/o.len;for(const c of o.ch){const u0=c.u;c.u+=du;
  if(u0<1&&c.u>=1){kSeeSbOut(c,'N');if(on)kSeeSbIn(o,c,'N')}
  if(c.u>=2){c.u-=2;kSeeSbOut(c,'S');if(on)kSeeSbIn(o,c,'S')}}
 if(!on&&KG.t>=18.6)for(const s of ['S','N'])for(const f of o.q[s].splice(0))kSeeFallback(f,s)}
function kSeeSbIn(o,c,side){const Q=o.q[side],s0=kSeeQSlot('sb',side,0);let n=0;while(Q.length&&c.r.length<8&&n<8){const f=Q[0];if(Math.hypot(f.x-s0[0],f.y-s0[1])>40)break;Q.shift();f.st='sbr';f.hide=1;f.sbTo=side==='S'?'N':'S';c.r.push(f);n++;o.cnt++;KG.res.sbN=(KG.res.sbN||0)+1}}
function kSeeSbOut(c,side){const keep=[];let k=0;for(const f of c.r){if(f.sbTo!==side){keep.push(f);continue}f.hide=0;f.delay=k*.05;k++;
  if(side==='N'){f.x=772;f.y=1500;kSeeGoKassa(f,[[772,1524],[760,KSE.WY]].concat(KSW.nToKO.slice(1)),1,11)}
  else{f.x=764;f.y=1938;if(f.car)kWalk(f,[[730,1930],[700,KSE.GY],[kSeeCarX(f.car),KSE.GY]].concat(kSeeToCar(f.car).slice(1)),'car',11);else f.st='gone'}}
 c.r=keep}
// Autos: Parkplatz Nord über die Brücke, Parkplatz Süd über die Zufahrt und die Fahrgassen
function kSeeRnd(P,r=12){const out=[P[0]];for(let i=1;i<P.length-1;i++){const a=P[i-1],b=P[i],c=P[i+1],l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]),rr=Math.min(r,l1/2,l2/2);if(rr<1){out.push(b);continue}
  const p1=[b[0]+(a[0]-b[0])/l1*rr,b[1]+(a[1]-b[1])/l1*rr],p2=[b[0]+(c[0]-b[0])/l2*rr,b[1]+(c[1]-b[1])/l2*rr];for(let k=0;k<=6;k++){const t=k/6,u=1-t;out.push([u*u*p1[0]+2*u*t*b[0]+t*t*p2[0],u*u*p1[1]+2*u*t*b[1]+t*t*p2[1]])}}
 out.push(P[P.length-1]);return kPoly(out)}
function kSeeSpots(){const out=[];for(const L of KVOR.lots){if(!KG.lots[L.id])continue;const n=Math.floor((L.x1-L.x0)/kLotW);for(let i=0;i<n;i++){const x=L.x0+kLotW*i+kLotW/2;
  out.push({lot:L.id,i,x,y:L.id==='pn'?1470:L.id==='r1'?1960:L.id==='r2'?2038:2116,nose:L.id==='pn'||L.id==='r1'?-Math.PI/2:Math.PI/2})}}return out}
function kSeeFreeSpot(){const used=new Set(KW.cars.filter(c=>c.spot).map(c=>c.spot.lot+':'+c.spot.i));const free=kSeeSpots().filter(s=>!used.has(s.lot+':'+s.i));if(!free.length)return null;
 const rk={pn:0,r1:1,r2:2,r3:3};free.sort((a,b)=>rk[a.lot]-rk[b.lot]||b.x-a.x);return free[Math.floor(kR()*Math.min(3,free.length))]}
const kSeeFY=c=>c.lot==='r3'?KSE.F2:KSE.F1;
function kSeeInPts(c){const W=KVOR.bounds.x0-40,E=KVOR.bounds.x1+40,s=c.fromW?[W,2225]:[E,2207],sx=c.sx;
 if(c.lot==='pn')return [s,[912,s[1]],[912,1508],[sx-16,1508],[sx,1492],[sx,1470]];
 const F=kSeeFY(c)-4,dn=c.nose>0;return [s,[678,s[1]],[678,F],[sx+18,F],[sx,F+(dn?14:-14)],[sx,c.py]]}
function kSeeRevPts(c){const sx=c.sx;if(c.lot==='pn')return [[sx,1470],[sx,1494],[sx-14,1508]];const F=kSeeFY(c)+4;return [[sx,c.py],[sx,c.py<F?F-12:F+12],[sx-14,F]]}
function kSeeOutPts(c){const W=KVOR.bounds.x0-80,E=KVOR.bounds.x1+80,east=kR()<.5,sx=c.sx;
 if(c.lot==='pn')return [[sx-14,1508],[1078,1508],[1090,1519],[1078,1530],[896,1530],[896,east?2225:2207],east?[E,2225]:[W,2207]];
 const F=kSeeFY(c)+4;return [[sx-14,F],[664,F],[664,east?2225:2207],east?[E,2225]:[W,2207]]}
// Fahrzeug folgt seinem Weg; hält, wenn vorne jemand fährt
function kSeeMove(v,dt,sp){const L=v.d[v.d.length-1][3];
 if(!v.prio){let blk=0;const ma=v.rev?v.a+Math.PI:v.a,mx=Math.cos(ma),my=Math.sin(ma);for(const o of KW.cars.concat(KW.buses)){if(o===v||o.st==='park'||o.st==='gone'||o.x==null||o.st==='in'&&o.turnS!=null&&o.s>o.turnS+4)continue;const dx=o.x-v.x,dy=o.y-v.y,al=dx*mx+dy*my,la=Math.abs(dx*my-dy*mx);if(al>0&&al<((v.bus||o.bus)?42:30)&&la<8){blk=1;break}}
  if(blk){v.wt=(v.wt||0)+dt;if(v.wt<2.5)return 0}else v.wt=0}
 const rem=L-v.s;let s2=sp;if(v.slow&&rem<36)s2=Math.max(7,sp*rem/36);v.s=Math.min(L,v.s+s2*dt);
 const p=kAt(v.d,v.s),q1=kAt(v.d,Math.min(L,v.s+3)),q0=kAt(v.d,Math.max(0,v.s-3));v.x=p[0];v.y=p[1];if(Math.hypot(q1[0]-q0[0],q1[1]-q0[1])>.5){let a=Math.atan2(q1[1]-q0[1],q1[0]-q0[0]);if(v.rev)a+=Math.PI;v.a=a}return v.s>=L}
KV.seek.spawnCar=function(ty){const sp=kSeeFreeSpot();if(!sp){KG.rej++;KG.res.rej=(KG.res.rej||0)+1;return 0}
 const g=kGroup(ty),arr=KG.t,lt=kLeaveT(ty,arr);for(const f of g)kSetupFolk(f,arr,lt);
 const c={st:'in',spot:sp,sx:sp.x,py:sp.y,lot:sp.lot,nose:sp.nose,fromW:kR()<.5,col:kpick(['#e8504a','#3a78d0','#f2f2f2','#6cc07a','#f2c53b','#ff8fb8','#8e93b8','#2fb3b8']),ppl:g,n:g.length,back:0,ty,slow:1};
 c.d=kSeeRnd(kSeeInPts(c),14);c.s=0;{const P=kSeeInPts(c),tp=P[P.length-3];let bd=1e9;for(const q of c.d){const d=Math.hypot(q[0]-tp[0],q[1]-tp[1]);if(d<bd){bd=d;c.turnS=q[3]}}}const p=kAt(c.d,0);c.x=p[0];c.y=p[1];c.a=c.fromW?0:Math.PI;for(const f of g)f.car=c;KW.cars.push(c);return g.length};
KV.seek.carStep=function(c,dt){
 if(c.st==='in'){if(kSeeMove(c,dt,c.y>2190?170:c.lot==='pn'&&c.y>1540?110:84)){c.st='park';c.x=c.sx;c.y=c.py;c.a=c.nose;kSeeUnloadCar(c)}return}
 if(c.st==='park')return;
 if(c.st==='out'){c.tw-=dt;if(c.tw>0)return;// rückwärts ausparken, wenn die Fahrgasse frei ist
  const P=kSeeRevPts(c),e=P[2];for(const o of KW.cars){if(o===c||o.st==='park')continue;if(Math.hypot(o.x-e[0],o.y-e[1])<34)return}
  c.st='rev';c.d=kSeeRnd(P,10);c.s=0;c.rev=1;c.prio=1;c.slow=0;return}
 if(c.st==='rev'){if(kSeeMove(c,dt,16)){c.st='leave';c.rev=0;c.prio=0;c.d=kSeeRnd(kSeeOutPts(c),14);c.s=0;c.spot=null}return}
 if(c.st==='leave'){if(kSeeMove(c,dt,c.y>2190?170:c.lot==='pn'&&c.y>1540?110:84))c.st='gone'}};
function kSeeUnloadCar(c){const g=c.ppl;let i=0;const m=c.lot==='pn'?'pn':kSeeChoose('S',[kSeeCarX(c),c.py]);
 for(const f of g){f.x=c.sx+(i%2?-7:7);f.y=c.py+(c.nose<0?6:-6)+(i>>1)*4;f.delay=i*.3;f.mode=m;KW.folks.push(f);KG.gDay++;KG.gT++;i++;
  const P=kSeeFromCar(c);if(m==='pn')kSeeGoKassa(f,P.concat(KSW.nToKO),1,11);else kSeeDepart(f,m,P)}
 kSeeCount(m,g.length);kEarn('pk',KG.price.park,c.sx,c.py-20);const r=KG.price.park/Math.max(1,KVOR.fair.park);if(r>1.3)for(const f of g)f.sat-=(r-1.3)*10}
// Skibus: über die Brücke zur Haltestelle am Wendeplatz Nord
KV.seek.spawnBus=function(n,pick){const E=KVOR.bounds.x1+70,W=KVOR.bounds.x0-90,P=[[E,2207],[912,2207],[912,1508],[1078,1508],[1090,1519],[1078,1530],[KVOR.bus.x,1530],[896,1530],[896,2207],[W,2207]];
 const b={st:'in',n,pick,bus:1,d:kSeeRnd(P,16),s:0};b.stopS=0;let best=1e9;for(const q of b.d){const d=Math.abs(q[0]-KVOR.bus.x)+Math.abs(q[1]-1530);if(d<best){best=d;b.stopS=q[3]}}const p=kAt(b.d,0);b.x=p[0];b.y=p[1];b.a=Math.PI;KW.buses.push(b)};
KV.seek.busStep=function(b,dt){
 if(b.st==='in'){const sp=b.y>2190?100:b.y>1540?70:40;if(b.s+sp*dt>=b.stopS){b.s=b.stopS;const q=kAt(b.d,b.s);b.x=q[0];b.y=q[1];b.st='stop';b.tw=3.5;if(b.n)kSeeBusUnload(b);return}kSeeMove(b,dt,sp);return}
 if(b.st==='stop'){b.tw-=dt;if(b.tw<=0){if(b.pick){const Wt=KW.folks.filter(f=>f.st==='busw');for(const f of Wt.slice(0,44))f.st='gone'}b.st='leave'}return}
 if(b.st==='leave'){if(kSeeMove(b,dt,b.y>2190?100:b.y>1540?70:40))b.st='gone'}};
function kSeeBusUnload(b){const n=b.n||0;for(let i=0;i<n;i++){const ty=kMix(),f=kMkFolk(ty,0);kSetupFolk(f,KG.t,Math.min(16.2,kLeaveT(ty,KG.t)));f.busG=1;f.mode='bus';f.x=b.x+18-(i%6)*7;f.y=KSE.WY+3+Math.floor(i/6)*2;f.delay=i*.07;
  kSeeGoKassa(f,[[f.x,KSE.WY]].concat(KSW.nToKO),1,11);KW.folks.push(f);KG.gDay++;KG.gT++}kSeeCount('bus',n)}
KV.seek.busPickT=function(){return KG.b.bus2?[15.1,15.5,15.9,16.3,16.7,17.05]:[15.3,15.8,16.3,16.8]};
KV.seek.busT=function(){return KG.b.bus2?[8.4,8.9,9.4,9.9,10.4]:[8.65,9.65,10.65]};
// Tagesablauf
KV.seek.morning=function(){KW.shipQ={S:[],N:[]};KW.ships=[{load:[],bd:[]},{load:[],bd:[]}];KW.shipLog=[];if(KG.stage>=5){KW.sbw=null;kSeeSbSetup()}
 KG.res.arr={pn:0,walk:0,ship:0,sb:0,bus:0,hot:0};if(KG.b.bus&&KG.dem>0)KG.busShare=Math.min(KG.b.bus2?.42:.35,(KG.b.bus2?200:120)/KG.dem);
 if(KG.wx==='sturm'&&(KG.b.ship||KG.stage>=5))kLog('⛴️','Sturm – '+(KG.stage>=5?'Schiff und Seebahn bleiben':'das Schiff bleibt')+' heute im Hafen. Die Gäste gehen über die Brücke.')};
KV.seek.midnight=function(){KG.maxG=Math.max(KG.maxG||0,KG.gDay||0)};
KV.seek.tick=function(dt,dth){const t0=KG.t-dth,t1=KG.t;if(t0<8.1&&t1>=8.1&&KG.hotel)kSeeCount('hot',KW.hotelN||0);
 kSeeShipTick(t0,t1);kSeeSbTick(dt)};
KV.seek.costs=function(c,tm){c.kassa=(c.kassa||0)+60*tm;if(KG.b.ship)c.ship=180+(KG.b.ship2?180:0);if(KG.stage>=5)c.sb=450+(KG.sbLg||0)*40;if(KG.b.bus2)c.bus=(c.bus||0)+100};
KV.seek.att=function(){return (KG.hotel?.02:0)+(KG.stage>=3?.02:0)+(KG.b.ship?.02:0)};
KV.seek.offer=function(){let o=0;const b=KG.b;for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;o+=45+({s4:25,s6:45,g8:60}[s.typ]||0)+(s.lg||0)*10}
 o+=(KG.stage-1)*40;for(const p of KW.pistes)if(!p.conn&&kPisteOpen(p))o+=30;
 o+=(b.cannons?35:0)+(b.raupe?30:0)+(b.kiosk?15:0)+(b.hut?50:0)+(KG.hotel?60:0)+(b.bus?20:0)+(b.bus2?10:0)+(b.bw?15:0)+(b.lw?10:0)+(KG.paved?15:0)+(b.ship?40:0)+(b.ship2?20:0)+(KG.stage>=5?60+(KG.sbLg||0)*10:0);
 for(const L of KVOR.lots)if(!L.base&&KG.lots[L.id])o+=15;return o};
// Schneekanonen am unteren Teil der Karabfahrt
KV.seek.canPos=function(){const out=[],r=kRNG(7),P=KW.pmap.ka;const ok=(x,y)=>{if(kOnP(x,y,4)||kOnP(x,y-12,7))return 0;for(const L of KVOR.lifts){const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(Math.hypot(x-L.b[0]-dx*u,y-L.b[1]-dy*u)<30)return 0}for(const b of KST.blocks)if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])return 0;return 1};
 let acc=0,side=1;for(let i=1;i<P.d.length;i++){const a=P.d[i-1],q=P.d[i];acc+=Math.hypot(q[0]-a[0],q[1]-a[1]);if(acc<100)continue;if(q[1]<700||q[1]>1410||!kPtOpen(P,q))continue;
  for(const sg of [side,-side]){const x=q[0]+q[4]*(q[2]+12)*sg,y=q[1]+q[5]*(q[2]+12)*sg;if(ok(x,y)){out.push({x,y,sd:sg,ph:r()*20});acc=0;side=-side;break}}}return out};
// Pistenraupe: Karabfahrt hinauf, Zackenrinne und Felsweg, wieder hinunter
KV.seek.groomPlan=function(){const P=KW.pmap,L=Q=>Q.d[Q.d.length-1][3],off=(Q,s,k)=>{const q=kAt(Q.d,s);return [q[0]+q[3]*q[2]*k,q[1]+q[4]*q[2]*k]},run=(Q,a,b,k)=>{const o=[];if(a>b)for(let s=a;s>=b;s-=12)o.push(off(Q,s,k));else for(let s=a;s<=b;s+=12)o.push(off(Q,s,k));o.push(off(Q,b,k));return o};
 const K=P.ka,F=P.fw,Z=P.zr,G=P.zg,k0=kOpenS(K),fb=K.brs[0].s;const out=[{p:'x',pts:[[440,1446],[490,1440]]},{p:'ka',pts:run(K,L(K),k0,.42)}];
 if(kPisteOpen(Z))out.push({p:'x',pts:run(G,L(G),0,0)},{p:'zr',pts:run(Z,0,L(Z),.4)},{p:'zr',pts:run(Z,L(Z),0,-.4),fin:1},{p:'x',pts:run(G,0,L(G),0)});
 if(kPisteOpen(F)){out.push({p:'ka',pts:run(K,k0,fb,-.42)},{p:'fw',pts:run(F,0,L(F),.4)},{p:'fw',pts:run(F,L(F),0,-.4),fin:1},{p:'ka',pts:run(K,fb,L(K),-.42),fin:1})}
 else out.push({p:'ka',pts:run(K,k0,L(K),-.42),fin:1});
 out.push({p:'x',pts:[[490,1440],[440,1446]]});return out};
// ---------- Bauen ----------
KV.seek.items=function(){const V=KVOR,st=KG.stage,l=KG.l,b=KG.b,lf=KPK('lift')?.9:1,sf=KPK('schnee')?.85:1,bau=id=>KG.bau.find(x=>x.id===id);
 const I=[];const add=(tab,o)=>{o.tab=tab;I.push(o);return o};const S=V.stageInfo;
 for(const s of [2,3,4,5]){const rq=S[s].req.map(r=>({t:r[r.length-1],ok:kReq(r)}));add('aus',{id:'st'+s,ic:['','','🚡','🔴','🚠','⛴️'][s],n:'Ausbau Stufe '+s+': '+S[s].n,d:S[s].d,c:Math.round(S[s].cost*lf),days:kBauDays(S[s].days),done:st>=s,bau:KG.bau.find(x=>x.k==='stage'&&x.st===s),lock:st<s-1?'erst Stufe '+(s-1):rq.some(r=>!r.ok)?'Voraussetzungen fehlen':'',rq})}
 const T=l.ts,upB=L=>KG.bau.find(x=>x.k==='up'&&x.lift===L);
 add('lif',{id:'up6_ts',ic:'🚡',n:'Talsessel: 6er-Sessel',d:'Talstation → Mittelstation. Mehr Plätze je Sessel – hier steigen alle Gäste ein. Der Lift steht bis zum nächsten Morgen.',c:Math.round(16000*lf),days:kBauDays(1),done:T.typ==='s6',bau:upB('ts')});
 add('lif',{id:'lg_ts',ic:'💺',n:'Talsessel: mehr Sessel',d:'Zusätzliche Sessel am Seil – mehr Gäste pro Stunde.',c:Math.round(2500*lf),done:(T.lg||0)>=2,lock:upB('ts')?'Umbau läuft':'',lv:(T.lg||0)+' / 2'});
 if(st>=2&&l.ks.on)add('lif',{id:'lg_ks',ic:'💺',n:'Karsessel: mehr Sessel',d:'Mittelstation → Karstation. Zusätzliche Sessel am Seil.',c:Math.round(3000*lf),done:(l.ks.lg||0)>=2,lv:(l.ks.lg||0)+' / 2'});
 if(st>=4&&l.gg.on)add('lif',{id:'lg_gg',ic:'🚠',n:'Gipfelgondel: mehr Kabinen',d:'Karstation → Gipfel. Zusätzliche Kabinen am Seil.',c:Math.round(3500*lf),done:(l.gg.lg||0)>=2,lv:(l.gg.lg||0)+' / 2'});
 if(st>=5)add('lif',{id:'lg_sb',ic:'🚠',n:'Seebahn: mehr Kabinen',d:'Parkplatz Süd ⇄ Talstation. Mehr Kabinen am Seil – mehr Gäste pro Stunde in beide Richtungen.',c:Math.round(4000*lf),done:(KG.sbLg||0)>=2,lv:(KG.sbLg||0)+' / 2'});
 add('pis',{id:'raupe',ic:'🚜',n:'Pistenraupe mit Garage',d:'Präpariert nachts alle offenen Pisten – auch den Felsweg und die Zackenrinne. Ohne Raupe werden die Pisten immer schlechter.',c:5000,done:!!b.raupe});
 add('pis',{id:'can',ic:'❄️',n:'Schneekanonen',d:'Beschneien nachts den unteren Teil der Karabfahrt, wenn der Schnee knapp wird.',c:Math.round(V.cannons.cost*sf),done:!!b.cannons,lock:st<2?'erst Stufe 2':'',up:'Strom je Nacht'});
 add('gas',{id:'kiosk',ic:'🌭',n:'Kiosk an der Kassa West',d:'Würstel, Tee und Kakao direkt an der Promenade.',c:1500,days:0,done:!!b.kiosk});
 add('gas',{id:'hut',ic:'🛖',n:'Karhütte',d:'Hütte im Kar mit Sonnenterrasse. Wer die Karabfahrt fährt, kehrt mittags gern ein.',c:V.hut.cost,days:kBauDays(V.hut.days),done:!!b.hut,bau:bau('hut'),lock:st<2?'erst Stufe 2':''});
 add('gas',{id:'hotel',ic:'🏨',n:'Seehotel ★★★★',d:'Besonderes Gebäude: 4 Stockwerke mit Balkonen, Spa unter dem Glasdach und eigenem Steg. 40 Zimmer – die Hotelgäste kommen ohne Auto und bringen jede Nacht Geld.',c:V.hotel.cost,days:kBauDays(V.hotel.days),done:!!KG.hotel,bau:bau('hotel'),lock:st<2?'erst Stufe 2':''});
 add('anr',{id:'ship',ic:'⛴️',n:'Seeschiff „Seekar“',d:'Pendelt mit 60 Plätzen zwischen dem Parkplatz Süd und der Talstation – alle 30 Minuten, Überfahrt 12 Minuten. Mit den beiden Anlegern.',c:8000,days:kBauDays(1),done:!!b.ship,bau:bau('ship'),up:'180 €/Tag'});
 add('anr',{id:'ship2',ic:'⛴️',n:'Zweites Schiff „Zinne“',d:'Fährt 15 Minuten versetzt – dann geht alle 15 Minuten ein Schiff. Ab dem nächsten Morgen.',c:12000,done:!!b.ship2,lock:!b.ship?'erst Seeschiff':st<3?'erst Stufe 3':'',up:'180 €/Tag'});
 add('anr',{id:'r2',ic:'🅿️',n:'Parkplatz Süd · Reihe 2',d:'33 weitere Stellplätze am anderen Ufer. Ist alles voll, drehen die Gäste um.',c:4000,done:!!KG.lots.r2});
 add('anr',{id:'r3',ic:'🅿️',n:'Parkplatz Süd · Reihe 3',d:'Noch einmal 33 Stellplätze, mit eigener Fahrgasse.',c:6000,done:!!KG.lots.r3,lock:st<3?'erst Stufe 3':''});
 add('anr',{id:'paved',ic:'🛣️',n:'Parkplätze asphaltieren',d:'Kein Schotter mehr – sieht ordentlicher aus und bringt etwas Ansehen.',c:4000,done:!!KG.paved});
 add('anr',{id:'bus',ic:'🚌',n:'Skibus über die Brücke',d:'Morgens bringen 3 Busse Gäste aus den Hotels am See bis zur Haltestelle an der Talstation, nachmittags holen sie sie wieder ab.',c:3000,done:!!b.bus,up:'150 €/Tag'});
 add('anr',{id:'bus2',ic:'🚌',n:'Skibus alle 30 Minuten',d:'5 Busse am Morgen statt 3 – deutlich mehr Gäste ohne Auto. Hilft, wenn die Parkplätze voll sind.',c:4000,done:!!b.bus2,lock:!b.bus?'erst Skibus':st<3?'erst Stufe 3':'',up:'+100 €/Tag'});
 add('per',{id:'lw',ic:'🔧',n:'Liftwart',d:'Repariert Störungen in kurzer Zeit. Ohne Liftwart kommt ein Techniker von außen (650 €, über 1 Stunde).',c:2500,done:!!b.lw,up:'130 €/Tag'});
 add('per',{id:'bw',ic:'⛑️',n:'Bergwacht',d:'Holt Verletzte mit Motorschlitten und Akja – auch aus der Felsgalerie und der Zackenrinne. Ohne Bergwacht leidet der Ruf.',c:KPK('bw')?0:4000,done:!!b.bw,up:KPK('bw')?'Verein · ohne Lohn':'140 €/Tag'});
 return I};
KV.seek.buy=function(id,I,pay){
 if(/^st[2345]$/.test(id)){const s=+id[2];pay();kBauStart({k:'stage',st:s,n:'Ausbau Stufe '+s+': '+KVOR.stageInfo[s].n,days:I.days,lift:{2:'ks',4:'gg'}[s]||null,id});return true}
 if(id==='up6_ts'){pay();KG.bau.push({k:'up',id,lift:'ts',typ:'s6',n:'Talsessel: 6er-Sessel',d0:KG.day,days:I.days});kLog('🚧','Umbau Talsessel auf 6er-Sessel – der Lift steht bis zum Morgen.');KG.l.ts.on=0;if(KW.lift.ts)for(const f of KW.lift.ts.q.splice(0))kGoHome(f);return true}
 if(id==='lg_sb'){pay();KG.sbLg=(KG.sbLg||0)+1;kSeeSbSetup();kLog('🚠','Mehr Kabinen an der Seebahn.');return true}
 if(id.startsWith('lg_')){const L=id.slice(3);pay();KG.l[L].lg=(KG.l[L].lg||0)+1;kLiftSetup(L);kLog('💺','Mehr '+(KG.l[L].typ==='g8'?'Kabinen':'Sessel')+' am '+kLC(L).n+'.');return true}
 if(id==='ship'){pay();kBauStart({k:'b',id:'ship',n:'Seeschiff „Seekar“ mit Anlegern',days:I.days});return true}
 if(id==='ship2'){pay();KG.b.ship2=1;KG.ship2D=KG.t<7.3?KG.day:KG.day+1;kLog('⛴️','Das zweite Schiff „Zinne“ fährt '+(KG.ship2D===KG.day?'ab heute':'ab morgen früh')+' – dann alle 15 Minuten.');return true}
 if(id==='r2'||id==='r3'){pay();KG.lots[id]=1;kLog('🅿️','Parkplatz Süd · Reihe '+id[1]+' ist offen.');return true}
 if(id==='bus2'){pay();KG.b.bus2=1;kLog('🚌','Ab morgen fährt der Skibus alle 30 Minuten.');return true}
 return false};
KV.seek.applied=function(b){if(b.k==='b'&&b.id==='ship'){KG.shipD=KG.day;kLog('⛴️','Das Seeschiff „Seekar“ legt ab heute alle 30 Minuten ab.')}if(b.k==='stage'&&b.st===5){KW.sbw=null;kSeeSbSetup()}};
// ---------- Zeichnen ----------
// Dolomiten-Zacken (hinten)
function kSeeDolo(c,x0,x1,base,top,sd,P){const r=kRNG(sd);
 const tower=(x,w,t,b,L,D,sn)=>{const sx=x+w*(.38+r()*.2),n1=t+w*(.15+r()*.3),n2=t+w*(.1+r()*.4);
  c.fillStyle=L;c.beginPath();c.moveTo(x,b);c.lineTo(x+w*.06,n1+w*.6);c.lineTo(x+w*.18,n1);c.lineTo(sx-w*.08,t+w*.12);c.lineTo(sx,t);c.lineTo(sx,b);c.closePath();c.fill();
  c.fillStyle=D;c.beginPath();c.moveTo(sx,b);c.lineTo(sx,t);c.lineTo(sx+w*.1,t+w*.08);c.lineTo(x+w*.82,n2);c.lineTo(x+w*.95,n2+w*.7);c.lineTo(x+w,b);c.closePath();c.fill();
  c.strokeStyle='rgba(90,80,70,.16)';c.lineWidth=1;for(let k=0;k<3;k++){const q=x+w*(.15+r()*.7),y=t+w*.4+r()*30;c.beginPath();c.moveTo(q,y);c.lineTo(q+(r()-.5)*4,b-10);c.stroke()}
  if(sn){c.fillStyle='rgba(255,255,255,.95)';for(let y=t+w*.5;y<b-6;y+=18+r()*26){const q=x+w*(.08+r()*.55),l=6+r()*w*.35;c.beginPath();c.moveTo(q,y);c.lineTo(q+l,y-1.5);c.lineTo(q+l-2,y+2);c.lineTo(q+2,y+2.5);c.closePath();c.fill()}}};
 for(const lay of [0,1]){let x=x0-30;while(x<x1){const w=(lay?22:18)+r()*(lay?44:30),h=top(x+w/2)*(lay?1:1.12)+(r()-.4)*(lay?70:50),b=base-(lay?0:30)+r()*18,t=b-h;
  if(lay&&r()<.18){x+=w*.6;continue}tower(x,w,t,b,lay?P[Math.floor(r()*2)]:'#dfe3ea',lay?P[2+Math.floor(r()*2)]:'#c9cfd9',lay);x+=w*(lay?.62+r()*.3:.7)}}}
// helle Felswand entlang des Tals (Facetten)
function kSeeWall(c,edge,y0,y1,side,sd){const r=kRNG(sd),P=['#ece6dc','#e0d8cb','#d1c7b6','#bfb3a0'];
 for(let y=y0;y<y1;y+=22){const e0=edge(y)+(r()-.5)*14,e1=edge(y+22)+(r()-.5)*14,far=side<0?-180:1180;
  for(let k=0;k<6;k++){const u0=k/6,u1=(k+1)/6,xa=far+(e0-far)*u0,xb=far+(e0-far)*u1,xc=far+(e1-far)*u1,xd=far+(e1-far)*u0;c.fillStyle=P[Math.floor(r()*3)];c.beginPath();c.moveTo(xa,y-r()*6);c.lineTo(xb,y-r()*6);c.lineTo(xc,y+24);c.lineTo(xd,y+24);c.closePath();c.fill()}
  c.fillStyle=P[3];c.beginPath();c.moveTo(e0,y);c.lineTo(e0-side*7,y);c.lineTo(e1-side*7,y+23);c.lineTo(e1,y+23);c.closePath();c.fill();
  c.fillStyle='rgba(255,255,255,.9)';for(let k=0;k<2;k++){const x=far+(e0-far)*(.15+r()*.75);c.beginPath();c.ellipse(x,y+6+r()*10,7+r()*10,2.4,0,0,7);c.fill()}}
 // Fuß der Wand: Schutt
 c.fillStyle='rgba(205,190,165,.5)';const yb=y1;c.beginPath();c.moveTo(edge(yb-80),yb-80);c.lineTo(edge(yb)+side*-40,yb+30);c.lineTo(edge(yb)+side*30,yb+30);c.closePath();c.fill()}
function kSeeSteg(c,x,y0,y1,w){c.fillStyle='rgba(20,60,80,.25)';c.fillRect(x-w/2+3,y0,w,y1-y0+3);c.fillStyle='#a8774c';c.fillRect(x-w/2,y0,w,y1-y0);c.fillStyle='#8f5a34';for(let y=y0;y<y1;y+=5)c.fillRect(x-w/2,y,w,.8);c.fillStyle='#6e4426';for(let y=y0+6;y<y1;y+=16){c.fillRect(x-w/2-1,y,2,4);c.fillRect(x+w/2-1,y,2,4)}}
KV.seek.bg=function(c){
 kSky(c,420,'#3f9be0','#cfeafb');
 kSeeDolo(c,-120,1140,340,x=>110+150*Math.exp(-Math.pow((x-230)/120,2))+190*Math.exp(-Math.pow((x-780)/130,2))+50*Math.exp(-Math.pow((x-500)/60,2)),11,['#f1ebe2','#e6ddcf','#cfc4b2','#bdb09b']);
 c.fillStyle='#ffffff';c.beginPath();c.moveTo(-160,360);c.bezierCurveTo(200,330,380,300,520,310);c.bezierCurveTo(680,300,860,330,1160,350);c.lineTo(1160,2320);c.lineTo(-160,2320);c.closePath();c.fill();
 kSnowGround(c,300,1560);
 kSeeWall(c,kWL,290,1370,-1,31);kSeeWall(c,kWR,290,1370,1,32);
 // Promenade Nord
 const W=KSE.WY;c.fillStyle='#e4d7c4';c.beginPath();c.moveTo(-160,1496);for(let x=-160;x<=1160;x+=20)c.lineTo(x,kSN(x)-3);c.lineTo(1160,1496);c.closePath();c.fill();
 c.fillStyle='#d8c9b3';for(let x=-160;x<=1160;x+=20)c.fillRect(x,kSN(x)-5,10,3);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(-160,W-2,1320,4);
 // See
 const g=c.createLinearGradient(0,1550,0,1860);g.addColorStop(0,'#5fd3d4');g.addColorStop(.5,'#2fb3c0');g.addColorStop(1,'#1f8fb0');c.fillStyle=g;c.beginPath();KSLAKE.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.closePath();c.fill();
 c.save();c.beginPath();KSLAKE.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.closePath();c.clip();const r2=kRNG(5);c.fillStyle='rgba(255,255,255,.18)';for(let i=0;i<90;i++){const x=-120+r2()*1260,y=1590+r2()*240;c.fillRect(x,y,10+r2()*30,1.2)}
 c.fillStyle='rgba(230,248,255,.8)';for(let x=-160;x<1160;x+=14){c.beginPath();c.ellipse(x,kSS(x)-3,9,3,0,0,7);c.fill();c.beginPath();c.ellipse(x+7,kSN(x)+3,7,2.4,0,0,7);c.fill()}c.restore();
 // Ufer Süd und Promenade Süd
 c.fillStyle='#e4d7c4';c.beginPath();for(let x=-160;x<=1160;x+=20)c.lineTo(x,kSS(x)+2);for(let x=1160;x>=-160;x-=20)c.lineTo(x,kSS(x)+32);c.closePath();c.fill();
 // Anleger und Stege
 kSeeSteg(c,330,kSN(330)-6,1600,20);
 if(KG.hotel){kSeeSteg(c,236,kSN(236)-4,1612,10);c.fillStyle='#a8774c';c.fillRect(224,1602,24,10)}
 if(KG.b.ship||KG.bau.find(b=>b.id==='ship')){const bau=!KG.b.ship;c.globalAlpha=bau?.55:1;kSeeSteg(c,KSE.PX,kSN(KSE.PX)-6,1630,16);c.fillStyle='#a8774c';c.fillRect(KSE.PX-16,1616,32,14);kSeeSteg(c,KSE.PX,1782,kSS(KSE.PX)+4,16);c.fillStyle='#a8774c';c.fillRect(KSE.PX-16,1782,32,14);c.globalAlpha=1;
  kSign(c,584,1566,'⚓ ANLEGER TALSTATION','#1f6fb0','#fff',5);kSign(c,590,1866,'⚓ ANLEGER PARKPLATZ','#1f6fb0','#fff',5)}
 else{c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1;c.setLineDash([4,4]);c.strokeRect(KSE.PX-16,1556,32,74);c.strokeRect(KSE.PX-16,1782,32,66);c.setLineDash([]);kSign(c,KSE.PX,1706,'⚓ Anleger · kommt mit dem Seeschiff','rgba(31,111,176,.75)','#fff',6)}
 // Ruderboote am Bootshaus
 for(const [x,y,col,a] of [[316,1590,'#e8504a',0],[346,1594,'#3a78d0',.15]]){c.save();c.translate(x,y);c.rotate(a);c.fillStyle='rgba(20,60,80,.25)';c.beginPath();c.ellipse(2,2,4.6,11,0,0,7);c.fill();c.fillStyle=col;c.beginPath();c.ellipse(0,0,4,10,0,0,7);c.fill();c.fillStyle='#fff';c.fillRect(-3,-2,6,1.2);c.fillRect(-3,3,6,1.2);c.restore()}
 // Uferstraße Süd
 kRoad(c,KVOR.road.y,-160,1160,34);c.fillStyle='#d9dee6';c.fillRect(-160,KVOR.road.y-24,1320,7);
 // Zufahrt und Fahrgassen
 c.fillStyle='#c3c9d3';c.fillRect(653,1987,36,KVOR.road.y-1987-14);c.fillStyle='#5a6170';c.fillRect(656,1990,30,KVOR.road.y-1990-17);
 c.fillStyle='#5a6170';c.fillRect(40,1990,616,18);if(KG.lots.r3)c.fillRect(40,2068,616,18);
 c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1;c.setLineDash([6,6]);c.beginPath();c.moveTo(48,KSE.F1);c.lineTo(650,KSE.F1);c.moveTo(671,1998);c.lineTo(671,KVOR.road.y-20);if(KG.lots.r3){c.moveTo(48,KSE.F2);c.lineTo(650,KSE.F2)}c.stroke();c.setLineDash([]);
 c.fillStyle='#fff';c.beginPath();c.moveTo(674,2150);c.lineTo(678,2140);c.lineTo(682,2150);c.closePath();c.fill();c.beginPath();c.moveTo(660,2140);c.lineTo(664,2150);c.lineTo(668,2140);c.closePath();c.fill();
 // Gehweg über Reihe 1 und zur Brücke
 kPathLine(c,[[30,KSE.GY],[700,KSE.GY],[740,1900],[870,1890],[KSE.BX,1880]],8);kPathLine(c,[[KSE.PX,KSE.GY],[KSE.PX,kSS(KSE.PX)+8]],7);kPathLine(c,[[700,KSE.GY],[730,1944]],7);
 // Brücke (Fahrbahn, Gehsteig links, Geländer) und Brückenauffahrt
 const y0=1540,y1=KVOR.road.y-17;c.fillStyle='rgba(20,60,80,.28)';for(let y=1600;y<1840;y+=60)c.fillRect(880,y+12,50,8);
 c.fillStyle='#4b5160';c.fillRect(887,y0,34,y1-y0);c.strokeStyle='#fff';c.lineWidth=1.4;c.setLineDash([12,10]);c.beginPath();c.moveTo(904,y0+6);c.lineTo(904,y1-4);c.stroke();c.setLineDash([]);
 c.fillStyle='#d9dee6';c.fillRect(872,y0,15,1880-y0);c.fillStyle='#cfd6df';c.fillRect(868,1552,4,310);c.fillRect(921,1552,4,310);c.fillStyle='#9aa3b2';for(let y=1552;y<1862;y+=12){c.fillRect(868,y,4,1.2);c.fillRect(921,y,4,1.2)}
 kSign(c,964,1700,'BRÜCKE','#5b6578','#fff',6);
 // Zebrastreifen am Brückenkopf Nord, Wendeplatz mit Bushaltestelle
 c.fillStyle='#5a6170';c.beginPath();c.roundRect(884,1494,210,46,[0,14,14,0]);c.fill();c.fillStyle='#fff';for(let i=0;i<5;i++)c.fillRect(888+i*7,W-4,4,9);
 c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1;c.setLineDash([6,6]);c.beginPath();c.moveTo(926,1519);c.lineTo(1074,1519);c.stroke();c.setLineDash([]);
 c.fillStyle='#d9dee6';c.fillRect(884,1540,214,6);const hx=KVOR.bus.x+18;c.fillStyle='#2e9e5b';c.fillRect(hx,W-14,1.6,14);c.beginPath();c.roundRect(hx-6,W-22,14,9,2);c.fill();c.fillStyle='#fff';c.font='700 6px Fredoka,sans-serif';c.textAlign='center';c.fillText('H',hx+1,W-15);kSign(c,hx+1,W-30,'🚌 Seekar · Talstation','#2e9e5b','#fff',5);
 // Gipfelkreuz
 c.strokeStyle='#7b5236';c.lineWidth=2.2;c.beginPath();c.moveTo(560,316);c.lineTo(560,290);c.moveTo(552,298);c.lineTo(568,298);c.stroke()};
KV.seek.staticExtra=function(c){kSign(c,-60,2196,'SEEKAR','#f2c53b','#2b3040',7);
 // Bänke an der Promenade
 for(const x of [540,620,960])c.fillStyle='#8f5a34',c.fillRect(x-9,kSN(x)-12,18,2.4),c.fillRect(x-8,kSN(x)-10,1.4,4),c.fillRect(x+6.6,kSN(x)-10,1.4,4)};
KV.seek.drawPaths=function(c){if(KG.b.hut){c.strokeStyle='#e9dcc4';c.lineWidth=6;c.lineCap='round';c.beginPath();KVOR.hut.in.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
 kPathLine(c,[[552,1478],[560,1510],[560,KSE.WY]],7)};
KV.seek.decor=function(D){const mix=r=>r()<.45?'l':'p';
 D.scatter(150,780,880,1476,1300,81,(x,y)=>{if(x<kWL(y)+12||x>kWR(y)-12)return 0;return y<1000?.32:.66},mix);
 D.scatter(-140,1300,1140,1486,420,82,()=>.6,mix);
 for(const [x,y] of [[320,1100],[600,1250],[580,960],[300,1290],[770,1240],[770,1000],[240,1410],[1000,1380]])D.grove(x,y,40,22,x+y,mix);
 for(const [x,y] of [[10,1930],[0,2010],[14,2100],[-90,1960],[-100,2080],[1060,2250],[60,2252],[980,2010],[1010,1940],[980,2110],[1090,1960],[1100,2080],[760,2120],[800,2160],[860,2060]])D.tree(x,y,.9,'p',1)};
KV.seek.blocks=function(B){
 B.box(-200,1488,1200,1620);B.box(-200,1540,1200,1880);B.box(-200,1850,1200,2300); // Promenade, See, Südufer
 B.box(872,1420,1120,1500);B.box(354,1396,412,1456);B.box(1080,1440,1124,1494); // Parkplatz Nord, Garage, Bergwacht
 B.box(120,1400,310,1530); // Seehotel
 B.box(290,476,376,546);B.box(660,1098,734,1176);B.box(694,640,756,706);B.box(500,1466,700,1540); // Karhütte, Anstellbereiche
 B.line(KV.seek.resPre(),8);B.line([[440,1446],[490,1440]],8);B.line([[396,540],[372,534],[352,530]],8);B.line([[552,1478],[560,1510]],7)};
// Gebäude, Stationen, Galerie, Seebahn, Schiffe
function kSeeKassaOst(c,x,y){const nt=kBright()<.5;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+3,y+3,24,4,0,0,7);c.fill();c.fillStyle='#e9e1d2';c.fillRect(x-20,y-20,40,22);c.fillStyle='#d6cbb7';c.fillRect(x+8,y-20,12,22);
 for(const q of [-16,-4]){c.fillStyle=nt?'#ffd98a':'#a8dcf5';c.fillRect(x+q,y-13,9,8);kWin(x+q,y-13,9,8);c.fillStyle='#8f5a34';c.fillRect(x+q-1,y-5,11,1.4)}
 c.fillStyle='#2f6f78';c.beginPath();c.moveTo(x-24,y-19);c.lineTo(x-17,y-30);c.lineTo(x+17,y-30);c.lineTo(x+24,y-19);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-20,y-22);c.lineTo(x-15,y-28);c.lineTo(x+15,y-28);c.lineTo(x+20,y-22);c.closePath();c.fill();kSign(c,x,y-37,'🎫 KASSA OST','#2b3040','#fff',5.4)}
function kSeeHotel(c,H,t){const x=H.x,y=H.y,nt=kBright()<.55;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+8,y+3,80,7,0,0,7);c.fill();
 // Spa-Anbau mit Glasdach
 c.fillStyle='#e9e1d2';c.fillRect(x+58,y-20,34,22);c.fillStyle='rgba(170,220,245,.9)';c.beginPath();c.moveTo(x+56,y-20);c.quadraticCurveTo(x+75,y-36,x+94,y-20);c.closePath();c.fill();c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=.6;for(let i=1;i<5;i++){c.beginPath();c.moveTo(x+56+i*7.6,y-20);c.lineTo(x+56+i*7.6,y-30+Math.abs(i-2.5)*3);c.stroke()}
 c.fillStyle='#5fd3d4';c.fillRect(x+62,y-8,26,6);if(nt){c.fillStyle='rgba(120,230,255,.5)';c.fillRect(x+62,y-8,26,6)}hSmoke(c,x+80,y-26,t,1);
 // Haupthaus
 c.fillStyle='#f6efe2';c.fillRect(x-60,y-74,118,76);c.fillStyle='#e3d6c3';c.fillRect(x+22,y-74,36,76);
 const occ=KG.hOcc||.5,r=kRNG(KG.day*7+3);for(let f=0;f<4;f++){for(let i=0;i<7;i++){const wx=x-54+i*15.4,wy=y-66+f*17;c.fillStyle='#a8dcf5';c.fillRect(wx,wy,9,10);c.fillStyle='rgba(255,255,255,.5)';c.fillRect(wx,wy,3,10);if(r()<occ)kWin(wx,wy,9,10)}
  c.fillStyle='#8f5a34';c.fillRect(x-62,y-55+f*17,122,2.2);c.fillStyle='#a8774c';for(let i=0;i<14;i++)c.fillRect(x-60+i*8.6,y-58+f*17,1,4)}
 c.fillStyle='#3a404e';c.beginPath();c.roundRect(x-8,y-14,16,16,[7,7,0,0]);c.fill();
 c.fillStyle='#2f6f78';c.beginPath();c.moveTo(x-68,y-72);c.lineTo(x-52,y-94);c.lineTo(x+52,y-94);c.lineTo(x+66,y-72);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-64,y-75);c.lineTo(x-50,y-92);c.lineTo(x+50,y-92);c.lineTo(x+62,y-75);c.closePath();c.fill();
 for(const dx of [-30,0,30]){c.fillStyle='#f6efe2';c.fillRect(x+dx-5,y-104,10,12);c.fillStyle='#2f6f78';c.beginPath();c.moveTo(x+dx-7,y-102);c.lineTo(x+dx,y-110);c.lineTo(x+dx+7,y-102);c.fill();c.fillStyle='#a8dcf5';c.fillRect(x+dx-2.5,y-100,5,5);kWin(x+dx-2.5,y-100,5,5)}
 kSign(c,x,y-118,H.sign,'#2f6f78','#fff',6.5)}
function kSeeBootshaus(c,x,y){c.fillStyle='rgba(20,60,80,.3)';c.fillRect(x-22,y+2,48,6);c.fillStyle='#6e4426';for(const dx of [-18,-4,10,20])c.fillRect(x+dx,y-2,2.4,10);
 c.fillStyle='#8f5a34';c.fillRect(x-22,y-24,44,26);c.fillStyle='#6e4426';c.fillRect(x+6,y-24,16,26);c.fillStyle='#2b3040';c.fillRect(x-12,y-12,18,14);c.fillStyle='#b9764a';c.beginPath();c.moveTo(x-27,y-22);c.lineTo(x,y-40);c.lineTo(x+27,y-22);c.closePath();c.fill();
 c.fillStyle='#fff';c.beginPath();c.moveTo(x-23,y-24);c.lineTo(x,y-38);c.lineTo(x+4,y-36);c.lineTo(x-16,y-23);c.closePath();c.fill();kSign(c,x,y-47,'BOOTSHAUS','#8f5a34','#fff',5)}
// Doppelender-Fähre von oben (fährt vorwärts wie rückwärts)
function kSeeShipDraw(c,x,y,n,mv,dir,name,t){const L=36,Wd=12,nt=kBright()<.55;c.save();c.translate(x,y);
 if(mv){c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=1.1;const s=-dir;for(let i=1;i<5;i++){const yy=s*(L+i*9),w=4+i*4;c.beginPath();c.moveTo(-w,yy+s*i*2);c.lineTo(0,yy-s*4);c.lineTo(w,yy+s*i*2);c.stroke()}
  c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(0,dir*(L-2),5,3,0,0,7);c.fill()}
 c.fillStyle='rgba(15,55,75,.28)';c.beginPath();c.ellipse(4,4,Wd+3,L+3,0,0,7);c.fill();
 const hull=()=>{c.beginPath();c.moveTo(0,-L);c.quadraticCurveTo(Wd,-L+6,Wd,-L+16);c.lineTo(Wd,L-16);c.quadraticCurveTo(Wd,L-6,0,L);c.quadraticCurveTo(-Wd,L-6,-Wd,L-16);c.lineTo(-Wd,-L+16);c.quadraticCurveTo(-Wd,-L+6,0,-L);c.closePath()};
 c.fillStyle='#d5dde8';hull();c.fill();c.save();c.translate(-1,-1.5);c.fillStyle='#ffffff';hull();c.fill();c.strokeStyle='#1f6fb0';c.lineWidth=1.6;c.stroke();
 // Deck vorne/hinten mit Fahrgästen, Kabine in der Mitte
 c.fillStyle='#c9a77a';c.beginPath();c.roundRect(-Wd+3,-L+9,2*Wd-6,10,3);c.fill();c.beginPath();c.roundRect(-Wd+3,L-19,2*Wd-6,10,3);c.fill();
 c.fillStyle='#eef2f7';c.beginPath();c.roundRect(-Wd+2.5,-L+20,2*Wd-5,2*L-40,4);c.fill();c.fillStyle='#d9e1ec';c.fillRect(Wd-6,-L+20,3.5,2*L-40);
 for(let i=0;i<6;i++){c.fillStyle=nt?'#ffd98a':'#a8dcf5';c.fillRect(-Wd+3.2,-L+23+i*5.4,1.8,3.6);c.fillRect(Wd-5,-L+23+i*5.4,1.8,3.6)}
 c.fillStyle='#f2c53b';c.beginPath();c.arc(0,0,3.6,0,7);c.fill();c.fillStyle='#2b3040';c.beginPath();c.arc(0,0,1.8,0,7);c.fill();
 const k=Math.min(24,Math.round(n/2.5)),cols=['#e8504a','#3a78d0','#6cc07a','#f2a63b','#b177e0','#2fb3b8'];for(let i=0;i<k;i++){const fr=i%2,j=i>>1;c.fillStyle=cols[(i*7+n)%6];c.beginPath();c.arc(-Wd+5.4+(j%6)*2.6,(fr?L-14:-L+14)+((j/6|0)-.5)*3.4,1.3,0,7);c.fill()}
 c.restore();c.restore();if(kZ.S>.7)kSign(c,x,y-L-10,'⛴ '+name,'#1f6fb0','#fff',5.2)}
function kSeeBigPylon(c,x,y,hw,water){if(water){c.fillStyle='rgba(20,60,80,.3)';c.beginPath();c.ellipse(x+6,y+3,hw+8,4,0,0,7);c.fill();c.fillStyle='#b9c2cf';c.beginPath();c.ellipse(x,y,hw+3,3.4,0,0,7);c.fill();c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.ellipse(x,y+3,hw+6,2,0,0,Math.PI);c.fill()}
 c.strokeStyle='#5d667a';c.lineWidth=2;c.beginPath();c.moveTo(x-hw*.7,y);c.lineTo(x-2,y-46);c.moveTo(x+hw*.7,y);c.lineTo(x+2,y-46);c.stroke();c.lineWidth=.7;c.strokeStyle='#8a94a8';for(let k=0;k<6;k++){const y0=y-k*7.6,y1=y-(k+1)*7.6,w0=hw*.7-k*hw*.1,w1=hw*.7-(k+1)*hw*.1;c.beginPath();c.moveTo(x-w0,y0);c.lineTo(x+w1,y1);c.moveTo(x+w0,y0);c.lineTo(x-w1,y1);c.stroke()}
 c.fillStyle='#3a3f58';c.fillRect(x-hw-2,y-49,hw*2+4,3.4);c.fillStyle='#e8504a';c.fillRect(x-1.5,y-52,3,3)}
function kSeeSbCabin(c,n){c.fillStyle='#2a2e44';c.fillRect(-1,-1.5,2,6);c.fillStyle='#1f6fb0';c.beginPath();c.roundRect(-7,4,14,13,3);c.fill();c.fillStyle='#bfe6fa';c.beginPath();c.roundRect(-5.5,6,11,5.5,1.6);c.fill();
 for(let i=0;i<Math.min(3,n);i++){c.fillStyle='#ffd9b5';c.beginPath();c.arc(-3+i*3,9.2,1.2,0,7);c.fill()}c.fillStyle='rgba(0,0,0,.18)';c.fillRect(-7,14.5,14,2.5)}
// Felsgalerie am Felsweg: Dach über der Piste, Pfeiler zur Talseite
function kSeeGalerie(c){const F=KW.pmap.fw,Y0=752,Y1=830,row=[];for(let y=Y0;y<=Y1;y+=3){let q=F.d[0];for(const p of F.d)if(Math.abs(p[1]-y)<Math.abs(q[1]-y))q=p;row.push([q[0],y,q[2]])}
 const L=q=>Math.min(q[0]-q[2]-4,kWL(q[1])+6),Rr=q=>q[0]+q[2]+5,H=11;
 for(let i=0;i<row.length-1;i++){const q=row[i];c.fillStyle=i%4<2?'#b8b0a2':'#4a4f60';c.fillRect(Rr(q)-1,q[1]-H,4,H+2)}
 c.fillStyle='#bdb5a7';c.beginPath();row.forEach((q,i)=>i?c.lineTo(Rr(q)+3,q[1]-H):c.moveTo(L(q),q[1]-H));for(let i=row.length-1;i>=0;i--)c.lineTo(L(row[i]),row[i][1]-H);c.closePath();c.fill();
 c.fillStyle='#d9d3c8';c.beginPath();row.forEach((q,i)=>i?c.lineTo(Rr(q)+3,q[1]-H-3):c.moveTo(L(q),q[1]-H-3));for(let i=row.length-1;i>=0;i--)c.lineTo(Rr(row[i])+3,row[i][1]-H);c.closePath();c.fill();
 const r=kRNG(17);c.fillStyle='rgba(255,255,255,.95)';for(const q of row){if(r()<.35)continue;const x0=L(q)+4+r()*((Rr(q)-L(q))*.7);c.beginPath();c.ellipse(x0,q[1]-H-1,5+r()*8,2.2,0,0,7);c.fill()}
 const q1=row[row.length-1],q0=row[0];c.fillStyle='#2e3240';c.beginPath();c.roundRect(L(q1)+2,q1[1]-H+1,Rr(q1)-L(q1)-2,H,[4,4,0,0]);c.fill();c.fillStyle='#bdb5a7';c.fillRect(L(q1),q1[1]-H-2,Rr(q1)-L(q1)+3,3);
 c.fillStyle='rgba(46,50,64,.55)';c.fillRect(L(q0)+2,q0[1]-H-3,Rr(q0)-L(q0)-2,3);kSign(c,q0[0]+44,Y0-24,'FELSGALERIE','#5b6578','#fff',5.5)}
KV.seek.drawB=function(add,t){const V=KVOR,K=V.kassa;add(K.y,c=>kKassaDraw(c,K.x,K.y));if(KG.b.kiosk)add(K.y+8,c=>kKioskDraw(c,K.x+38,K.y+8,t));add(KSE.KO[1],c=>kSeeKassaOst(c,KSE.KO[0],KSE.KO[1]));
 add(1574,c=>kSeeBootshaus(c,330,1574));
 // Lift-Stationen als Kette: Talstation, Mittelstation, Karstation, Gipfel
 for(const L of V.lifts){const s=KG.l[L.id],bau=KG.bau.find(b=>b.lift===L.id&&b.k!=='up'),lo=kLowerOf(L.id);
  if(bau){add(L.t[1]+20,c=>kSite(c,L.t[0],L.t[1]+10,50,t));continue}
  const up=KG.bau.find(b=>b.k==='up'&&b.lift===L.id);if(!s.on&&!up)continue;const co=KLT[s.typ].co;
  if(!lo)add(L.b[1]+22,c=>{liftStation(c,L.b[0],L.b[1],co,true);kSign(c,L.b[0],L.b[1]-30,'TALSTATION','#fff','#2b3a55',5.5);kBrkSign(c,L,t);if(up)kSign(c,L.b[0],L.b[1]-48,'🚧 UMBAU','#f2701f','#fff',6)});
  else if(up)add(L.b[1]+30,c=>kSign(c,L.b[0],L.b[1]-56,'🚧 UMBAU','#f2701f','#fff',6));
  const nx=L.nx&&KG.l[L.nx]&&KG.l[L.nx].on;add(L.t[1]+18,c=>{liftStation(c,L.t[0],L.t[1],nx?KLT[KG.l[L.nx].typ].co:co,false);kSign(c,L.t[0],L.t[1]-36,L.tn.toUpperCase(),'#fff','#2b3a55',5.5);if(nx)kBrkSign(c,kLC(L.nx),t)})}
 // Karhütte
 const H0=V.hut;if(KG.b.hut)add(H0.y+2,c=>{chalet(c,H0.x,H0.y,48,26,1);for(const [wx,wy] of chWin(H0.x,H0.y,48,26))kWin(wx,wy,6,6);kSign(c,H0.x,H0.y-46,'KARHÜTTE','#8f5a34','#fff',5.5);
  c.fillStyle='#c9a77a';c.fillRect(H0.x-28,H0.y+4,56,12);c.strokeStyle='rgba(120,90,60,.4)';c.lineWidth=.5;for(let x=H0.x-28;x<H0.x+28;x+=5){c.beginPath();c.moveTo(x,H0.y+4);c.lineTo(x,H0.y+16);c.stroke()}
  for(const x of [H0.x-18,H0.x-2,H0.x+14]){c.fillStyle='#7b5236';c.fillRect(x-.4,H0.y,.8,10);c.fillStyle='#e8504a';c.beginPath();c.arc(x,H0.y,4.4,Math.PI,0);c.fill();c.fillStyle='#fff';c.fillRect(x-4.4,H0.y-.6,8.8,.8)}hSmoke(c,H0.x+12,H0.y-34,t,1)});
 else if(KG.bau.find(b=>b.id==='hut'))add(H0.y,c=>kSite(c,H0.x,H0.y,60,t));
 // Seehotel
 const H=V.hotel;if(KG.hotel)add(H.y,c=>kSeeHotel(c,H,t));else if(KG.bau.find(b=>b.id==='hotel'))add(H.y,c=>kSite(c,H.x,H.y-10,110,t));
 else if(KG.stage>=2)add(H.y,c=>{c.strokeStyle='rgba(120,150,190,.6)';c.lineWidth=1;c.setLineDash([5,4]);c.strokeRect(150,1446,150,76);c.setLineDash([]);kSign(c,225,1484,'🏨 Seehotel · im Baumenü','rgba(43,58,85,.65)','#fff',7)});
 // Garage + Bergwacht
 if(KG.b.raupe)add(V.garage.y+8,c=>kGarage(c,V.garage.x,V.garage.y,t));if(KG.b.bw)add(V.bwHut.y,c=>kBwHut(c,V.bwHut.x,V.bwHut.y,t));
 // Felsgalerie
 const sb=KG.bau.find(b=>b.k==='stage');if(KG.stage>=3)add(838,c=>kSeeGalerie(c));
 if(sb){const S={2:[[470,780],[690,860]],3:[[214,790],[300,970]],4:[[750,520],[700,920]],5:[[KSE.SBX,KSE.SBS+10],[KSE.SBX,KSE.SBN+16]]}[sb.st]||[];for(const [x,y] of S)add(y,c=>kSite(c,x,y,56,t))}
 // Seebahn
 if(KG.stage>=5){const X=KSE.SBX,o=KW.sbw;add(KSE.SBS+22,c=>{liftStation(c,X,KSE.SBS,10,true);kSign(c,X,KSE.SBS-30,'🚠 SEEBAHN · SÜD','#1f6fb0','#fff',5.5);kSign(c,X+38,KSE.SBS+8,'🎫 inkl.','#fff','#1f6fb0',4.6)});
  add(KSE.SBN+18,c=>{liftStation(c,X,KSE.SBN,10,false);kSign(c,X,KSE.SBN-36,'🚠 SEEBAHN','#1f6fb0','#fff',5.5)});
  for(const u of [.32,.66]){const y=KSE.SBS-(KSE.SBS-KSE.SBN)*u;add(y,c=>kSeeBigPylon(c,X,y,14,1))}
  add(1e5,c=>{if(!kInV(X,1700,400))return;c.strokeStyle='#161a28';c.lineWidth=1.2;for(const sd of [-1,1]){c.beginPath();c.moveTo(X+10*sd,KSE.SBS);c.lineTo(X+10*sd,KSE.SBN);c.stroke()}
   if(o)for(const ch of o.ch){if(ch.u<.07||ch.u>1.93||Math.abs(ch.u-1)<.06)continue;const [x,y]=kSeeSbPos(ch.u);if(!kInV(x,y,30))continue;c.save();c.translate(x,y);c.rotate(Math.sin(ch.u*30+t*.8)*.03);kSeeSbCabin(c,ch.r.length);c.restore()}})}
 // Seeschiffe
 if(KG.b.ship)for(const i of [0,1]){if(i&&!KG.b.ship2)continue;const p=kSeeShipPos(i),sh=KW.ships&&KW.ships[i];add(p.y+36,c=>kSeeShipDraw(c,p.x,p.y,sh?sh.load.length:0,p.mv,p.dir,i?'ZINNE':'SEEKAR',t))}};
// Fenster des Seekars
function kSeeShipHTML(){const on=kSeeShipN(),st=!KG.b.ship?(KG.bau.find(b=>b.id==='ship')?'im Bau':'noch nicht gekauft'):KG.wx==='sturm'?'Sturm – im Hafen':on?'fährt':'ab morgen';
 const Q=KW.shipQ||{S:[],N:[]},dir=KG.t<13?'N':'S',LG=(KW.shipLog||[]).filter(e=>e.dir===dir),aus=LG.length?Math.round(LG.reduce((a,e)=>a+e.n,0)/(LG.length*KSE.cap)*100):0;
 let h=kHead('⛴ Seeschiff „Seekar“')+`<div style="margin:4px 0"><span class="kchip b">60 Plätze</span><span class="kchip ${on?'g':'o'}">${st}</span><span class="kchip">Überfahrt 12 Min.</span></div>`;
 h+=`<div class="kpi"><div><small>Warten am Anleger Süd</small><b>${Q.S.length}</b></div><div><small>Warten am Anleger Nord</small><b>${Q.N.length}</b></div><div><small>Fahrgäste heute</small><b>${knum(KG.res.shipN||0)}</b></div><div><small>Auslastung ${dir==='N'?'zur Talstation':'zurück'}</small><b>${aus} %</b><div class="kbar2"><i style="width:${aus}%;background:linear-gradient(90deg,#7cc4e4,#2f86cf)"></i></div></div></div>`;
 const L=(KW.shipLog||[]).slice(-2).map(e=>[e.t,e.dir,e.n+' / 60',e.i]);const nx=[];for(const i of [0,1])for(const side of ['S','N'])for(const d of kSeeDeps(i,side))if(d>KG.t)nx.push([d,side==='S'?'N':'S','–',i]);nx.sort((a,b)=>a[0]-b[0]);
 const rows=L.concat(nx.slice(0,4-L.length));if(rows.length)h+='<div class="bgh">Fahrplan</div><div class="kfp" style="display:grid;grid-template-columns:auto 1fr auto;gap:3px 10px;font-size:13px">'+'<span style="color:var(--mut);font-size:11.5px">ab</span><span style="color:var(--mut);font-size:11.5px">Richtung</span><span style="color:var(--mut);font-size:11.5px">an Bord</span>'+rows.map(r=>`<span>${kh(r[0])}</span><span>${r[1]==='N'?'Süd → Talstation':'Talstation → Süd'}${KG.b.ship2?' · '+(r[3]?'Zinne':'Seekar'):''}</span><b>${r[2]}</b>`).join('')+'</div>';
 h+=`<div class="row"><span>⛴ Zweites Schiff „Zinne“</span><b>${KG.b.ship2?'fährt versetzt · alle 15 Min.':'im Baumenü (ab Stufe 3)'}</b></div><div class="row"><span>🎫 Schiffsfahrt</span><b>in der Tageskarte</b></div>`;
 h+='<p class="hint">Ohne Schiff gehen die Gäste vom großen Parkplatz zu Fuß über die Brücke – das dauert über eine Stunde und kostet Laune. Bei Sturm bleibt das Schiff im Hafen.</p>';
 if(!KG.b.ship||KG.stage>=3&&!KG.b.ship2)h+='<div class="row"><span>Anreise</span><button class="btn" data-a="go" data-v="bau|anr">Baumenü ›</button></div>';return h}
function kSeeSbHTML(){const o=KW.sbw;if(KG.stage<5)return kHead('🚠 Seebahn')+'<p class="hint">🚧 Im Bau.</p>';const r=Math.round(kSeeSbRate());
 return kHead('🚠 Seebahn')+`<div style="margin:4px 0"><span class="kchip b">8er-Gondel</span><span class="kchip ${kSeeSbOn()?'g':'o'}">${KG.wx==='sturm'?'Sturm – steht':kSeeSbOn()?'fährt in beide Richtungen':'steht'}</span></div><div class="kpi"><div><small>Warten Süd</small><b>${o?o.q.S.length:0}</b></div><div><small>Warten Nord</small><b>${o?o.q.N.length:0}</b></div><div><small>Fahrgäste heute</small><b>${knum(KG.res.sbN||0)}</b></div><div><small>Je Stunde und Richtung</small><b>bis ${knum(r)}</b></div></div><div class="row"><span>Strecke</span><b>Parkplatz Süd ⇄ Talstation</b></div><div class="row"><span>🎫 Fahrt</span><b>in der Tageskarte</b></div><div class="row"><span>Mehr Kabinen</span><button class="btn" data-a="go" data-v="bau|lif">Baumenü ›</button></div><p class="hint">Die Seebahn fährt ohne Fahrplan – wer kommt, steigt ein. Bei Sturm steht sie.</p>`}
function kSeeAnrHTML(){const A=KG.res.arr||{},g=KG.gDay,best=Math.max(KG.maxG||0,g);
 let h=`<div class="kpi"><div><small>Gäste heute</small><b>${knum(g)}</b><i>${best>=KSE.goalG?'Ziel: '+knum(KSE.goalG)+' an einem Tag ✓':'bester Tag: '+knum(best)+' · Ziel '+knum(KSE.goalG)}</i></div><div><small>Autos abgewiesen</small><b class="${KG.rej?'neg':''}">${KG.rej}</b></div></div>`;
 h+='<div class="bgh">Wie die Gäste heute kamen</div>';for(const [k,n] of [['pn','🅿️ Parkplatz Nord (8 Plätze)'],['walk','🚶 zu Fuß über die Brücke'],['ship','⛴ Seeschiff'],['sb','🚠 Seebahn'],['bus','🚌 Skibus'],['hot','🏨 Seehotel']])h+=`<div class="row"><span>${n}</span><b>${knum(A[k]||0)}</b></div>`;
 const sp=kSeeSpots().length,used=KW.cars.filter(c=>c.spot).length;h+=`<div class="row"><span>🅿️ Parkplätze belegt</span><b>${used} / ${sp}</b></div>`;
 h+='<div class="bgh">Ausbau Anreise</div>';const I=kBuildItems().filter(i=>i.tab==='anr'&&i.id!=='paved');for(const i of I)h+=kCardHTML(i);
 h+=`<div class="kcard ${KG.stage>=5?'done':''}"><span class="ic">🚠</span><span class="tx"><b>Seebahn (Ausbau Stufe 5)</b><small>8er-Gondel über den See – fährt hin und zurück, auch abends</small></span><span class="bt">${KG.stage>=5?'<span class="kchip g">✓ gebaut</span>':'<button class="btn" data-a="go" data-v="bau|aus">Ausbau ›</button>'}</span></div>`;
 return h+'<p class="hint">Am Südufer entscheidet jede Gruppe selbst: zu Fuß, Schiff oder Seebahn – je nachdem, was gerade am schnellsten geht.</p>'}
KV.seek.staTab=['anr','🚗','Anreise'];KV.seek.staTabHTML=kSeeAnrHTML;
KV.seek.hit=function(x,y,hit,d){if(KG.b.ship)for(const i of [0,1]){if(i&&!KG.b.ship2)continue;const p=kSeeShipPos(i);if(Math.abs(x-p.x)<16&&Math.abs(y-p.y)<40)hit.push({k:'ship',d:0})}
 if(Math.abs(x-KSE.PX)<20&&(y>1550&&y<1632||y>1780&&y<1860))hit.push({k:'ship',d:.5});
 if(KG.stage>=5&&(d(KSE.SBX,KSE.SBS)<40||d(KSE.SBX,KSE.SBN)<34))hit.push({k:'sbahn',d:0});
 if(d(KSE.KO[0],KSE.KO[1]-12)<26)hit.push({k:'kas',d:0});
 if(x>868&&x<925&&y>1560&&y<1860)hit.push({k:'brk',d:1});
 if(KG.b.bw&&d(KVOR.bwHut.x,KVOR.bwHut.y-10)<20)hit.push({k:'bwh',d:0})};
KV.seek.infHTML=function(k){if(k==='ship')return kSeeShipHTML();if(k==='sbahn')return kSeeSbHTML();
 if(k==='brk'){const n=KW.folks.filter(f=>f.st==='walk'&&f.x>866&&f.x<892&&f.y>1540&&f.y<1880).length;return kHead('🌉 Brücke')+`<div class="kpi"><div><small>Gerade zu Fuß unterwegs</small><b>${n}</b></div><div><small>Heute zu Fuß gekommen</small><b>${knum((KG.res.arr||{}).walk||0)}</b></div></div><p class="hint">Der Fußweg vom großen Parkplatz über die Brücke dauert über eine Stunde. Die Gäste kommen müde und spät an – mit Schiff oder Seebahn geht es schneller.</p><div class="row"><span>Anreise</span><button class="btn" data-a="go" data-v="sta|anr">Übersicht ›</button></div>`}
 if(k==='bwh')return kHead('⛑️ Bergwacht')+`<p class="hint">Die Bergwacht holt Verletzte mit Motorschlitten und Akja von der Piste.${KW.res?' Gerade im Einsatz.':''}</p>`;return ''};
KV.seek.pisteInfo=function(p){if(p.id==='fw')return '<p class="hint">🪨 Der Felsweg führt durch eine Felsgalerie an der Wand entlang – Könner lieben ihn.</p>';if(p.id==='zr')return '<p class="hint">⚫ Die Zackenrinne ist steil und schmal – nur für Könner.</p>';return ''};
KV.seek.staExtra=function(){const Q=KW.shipQ||{S:[],N:[]};let h='<div class="bgh">Anreise</div>';if(KG.b.ship)h+=`<div class="row"><span>⛴ Seeschiff · warten Süd / Nord</span><b>${Q.S.length} / ${Q.N.length}</b></div>`;if(KG.stage>=5&&KW.sbw)h+=`<div class="row"><span>🚠 Seebahn · warten Süd / Nord</span><b>${KW.sbw.q.S.length} / ${KW.sbw.q.N.length}</b></div>`;
 return h+`<div class="row"><span>🚶 heute zu Fuß über die Brücke</span><b>${knum((KG.res.arr||{}).walk||0)}</b></div>`};
KV.seek.voices=function(out){const A=KG.res.arr||{};if((A.walk||0)>30)out.push(['🚶','„Der Weg über die Brücke ist ewig weit!“']);if(KW.shipQ&&KW.shipQ.S.length>70)out.push(['⛴','„Am Anleger wartet man ewig auf das Schiff.“']);
 if(KG.b.ship&&(A.ship||0)>20)out.push(['⛴','„Mit dem Schiff über den See – herrlich!“']);if(KG.stage>=3&&kPisteOpen(KW.pmap.fw))out.push(['🪨','„Der Felsweg durch die Galerie ist spektakulär!“']);if(KG.stage>=5)out.push(['🚠','„Mit der Seebahn direkt vom Parkplatz zum Lift – super!“'])};
KV.seek.thumbPrep=function(G){G.b.ship=1;G.b.ship2=1;G.hotel=1;G.b.hut=1;for(const k in G.lots)G.lots[k]=1;G.paved=1};
KV.seek.thumbObjs=function(O){O.push({y:1522,f:c=>kSeeHotel(c,KV.seek.hotel,0)});O.push({y:1640,f:c=>kSeeShipDraw(c,KSE.lane[0],KSE.dockN,30,0,0,'SEEKAR',0)});O.push({y:1740,f:c=>kSeeShipDraw(c,KSE.lane[1],1700,40,1,-1,'ZINNE',0)});O.push({y:838,f:c=>kSeeGalerie(c)})};
KV.seek.thumbR={x:-40,y:880,w:1120};
// See: leichtes Glitzern
KV.seek.drawDyn=function(c,t){if(!kInV(500,1700,500))return;c.save();c.beginPath();KSLAKE.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.closePath();c.clip();const r=kRNG(12);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=.9;
 for(let i=0;i<40;i++){const x=-100+r()*1240,y=1580+r()*250,ph=r()*6.28,a=.5+.5*Math.sin(t*1.3+ph);if(a<.4||!kInV(x,y,20))continue;c.globalAlpha=a;c.beginPath();c.moveTo(x,y);c.lineTo(x+8+r()*10,y);c.stroke()}c.restore()};
KV.seek.onStart=function(){KW.ships=null;KW.shipQ={S:[],N:[]};KW.sbw=null;KW.shipLog=[]};

// ===== Berg-Vorlage 5: Eisspitz – Hochgebirge: Felsrinnen, Gletscher, Pendelbahn zum Gipfel, 3S-Gletscherexpress, Lawinengefahr, Windgrenzen =====
// Kette: Almbahn (Tal → Alm) · Kesselbahn (Alm → Kessel) · Rinnenlift (Kessel → Rinnenkopf) · Gletscherbahn (Kessel → Gletscherstation) · Gletscherlift (Schlepplift am Gletscher)
// Pendelbahn (Gletscherstation ⇄ Gipfel, eigene Steuerung KW.pb) · 3S-Gletscherexpress (Tal Ost → Gletscher Ost, fährt auch bei Sturm)
// Lawinen: Warnstufe KG.lw 1–5; ab 3 sind Nordrinne, Teufelsrinne und Gipfelabfahrt morgens zu (KG.lwz), bis gesprengt (Sprengmast 7:15, Sprengtrupp, Sprengflug).
// Wind: KG.wind = Wind am Gipfel (km/h) für den ganzen Tag; jede Bahn hat eine Windgrenze (KEI.lim) und einen Höhenfaktor (KEI.wf).
const KEG0=180,KEG1=990;
const kEgL=x=>620+18*Math.sin(x/47)+10*Math.sin(x/17);           // Unterkante Gletscher (Eisbruch)
const kEgT=x=>{const u=kcl((x-KEG0)/(KEG1-KEG0),0,1);return kEgL(x)-280*Math.pow(Math.sin(Math.PI*u),.45)-30*Math.exp(-Math.pow((x-560)/110,2))+10*Math.sin(x/29)};
const kErL=x=>790+18*Math.sin(x/53+1)+8*Math.sin(x/13);           // Unterkante Felsband
const kEsf=x=>{const d=Math.abs(x-572);if(d<62)return 1;if(d>112)return 0;const u=(112-d)/50;return u*u*(3-2*u)};   // Schneesattel
const kEtop=x=>(x>KEG0-6&&x<KEG1+6?kEgL(x)+2:598+20*Math.sin(x/41)+9*Math.sin(x/11)),kElow=x=>kErL(x)+24*Math.sin(x/37+2)+10*Math.sin(x/9);
// Straße mit zwei Kehren (Mittellinie, von Osten zum Wendeplatz im Dorf)
const KER=(()=>{const P=[[1300,2238]];const arc=(cx,cy,R,a0,a1)=>{for(let i=0;i<=14;i++){const a=a0+(a1-a0)*i/14;P.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R])}};
 arc(520,2150,50,Math.PI/2,Math.PI*1.5);arc(880,2020,50,Math.PI/2,-Math.PI/2);for(const q of [[760,1962],[600,1952],[520,1946],[456,1932],[420,1900],[408,1860],[410,1806],[430,1760],[458,1722]])P.push(q);return P})();
const KEI={K:[420,1600],KO:[1080,1662],G1:1790,G3:1812,F12:1865,F3:1890,WP:[478,1700],
 PB:{b:[486,494],t:[548,262]},REST:[282,540],HELI:[910,1724],BW:[836,1720],
 lim:{am:90,kb:85,rl:75,gb:70,gt:65,s3:110,pb:60},wf:{am:.6,kb:.8,rl:.95,gb:.95,gt:.95,s3:.95,pb:1},
 shut:['nr','tr','gpa'],mast:{nr:[690,646],tr:[384,616],gpa:[630,300]},sn:{nr:'Nordrinne',tr:'Teufelsrinne',gpa:'Gipfelabfahrt'},
 pbV:46,pbTT:.2,pbDW:.05,pbCap:[60,80,100]};
KV.eis={id:'eis',n:'Eisspitz',am:'am Eisspitz',bounds:{x0:-140,x1:1140,y0:90,y1:2160},home:{x:520,y:1520,S:1.0,cx:540,cy:1520},
 desc:'Ein steiler Hochgebirgsberg: Felsrinnen, ein großer Gletscher und ganz oben die Eisspitz-Pyramide. Oft Sturm – dann stehen die oberen Bahnen. Nach Neuschnee sind die Rinnen erst nach dem Sprengen offen. Die Konkurrenz baut schnell aus.',
 stages:6,seasons:3,start:300,snow0:46,kioskAlways:1,runRef:900,arrShift:.2,credMin:12000,
 welcome:'Willkommen am Eisspitz! Die Almbahn läuft. Oben wartet viel Arbeit: Kessel, Rinnen, Gletscher und der Gipfel. Achte auf Wind und Lawinen – 📊 Statistik › Berg.',
 tip:'Tipp: Wind und Lawinenlage findest du unter 📊 Statistik › Berg',tipIf:()=>KG.stage<2,
 preHint:'Am Eisspitz zahlen Könner gern mehr – mit jeder Stufe ist der Berg mehr wert. Fair heißt: so viel wie die Gegend gerade wert ist.',
 mix:{fam:.18,anf:.12,pro:.42,sb:.28},priceSens:.95,
 wx:{sonne:.42,neuschnee:.26,tau:.1,sturm:.22},wxF:{sturm:.62},
 rivals:['Gletscherbahnen Pitz','Hintertux-Lifte','Stubaier Eisgrat','Kaunertal-Gletscher','Sölden-Rettenbach','Mölltaler Gletscher','Kitzsteinhorn','Dachstein-Gletscher','Zugspitz-Bahnen','Titlis-Lifte'],
 rivS:[860,790,730,670,610,560,510,460,410,360],rivG:1.45,
 parkY:1825,valleyY:1560,walkY:KEI.G1,road:{y:1948},bus:{x:478,y:1700},zebra:null,starTh:[0,0,340,480,640,900],
 pistes:[
  {id:'za',n:'Zubringer',col:'b',st:1,conn:1,pts:[[446,1216,10],[470,1238,12],[494,1260,16]]},
  {id:'ta',n:'Talabfahrt',col:'b',st:1,pts:[[500,1266,30],[440,1294,36],[372,1322,34],[330,1372,32],[336,1420,34],[396,1460,36],[452,1514,40],[486,1550,42]]},
  {id:'ka',n:'Kesselabfahrt',col:'r',st:2,pts:[[664,980,28],[704,1034,30],[742,1094,30],[704,1164,28],[626,1206,28],[556,1232,26],[488,1240,22]]},
  {id:'zr',n:'Zubringer',col:'b',st:3,conn:1,pts:[[798,586,9],[762,602,10],[732,632,11],[717,672,12]]},
  {id:'nr',n:'Nordrinne',col:'s',st:3,wear:.05,pts:[[716,676,12],[712,730,13],[720,790,14],[712,848,16],[700,898,22]]},
  {id:'gs',n:'Gletscherpiste',col:'b',st:4,ice:1,pts:[[704,388,24],[742,424,36],[756,476,46],[724,530,50],[662,572,44],[606,604,34]]},
  {id:'zgt',n:'Zubringer',col:'b',st:4,conn:1,pts:[[686,432,8],[702,436,11],[718,438,14]]},
  {id:'zga',n:'Zubringer',col:'r',st:4,conn:1,pts:[[438,594,9],[474,606,11],[514,618,13],[552,626,16]]},
  {id:'ga',n:'Gletscherabfahrt',col:'r',st:4,pts:[[566,630,28],[580,670,28],[596,712,26],[600,756,24],[576,810,24],[556,862,26],[574,926,30],[588,980,28],[592,1036,26]]},
  {id:'ztr',n:'Zubringer',col:'y',st:4,conn:1,route:1,pts:[[410,592,9],[382,598,11],[356,602,14]]},
  {id:'tr',n:'Teufelsrinne',col:'y',st:4,route:1,wear:.02,pts:[[350,604,16],[304,660,13],[278,730,12],[286,806,13],[318,880,16],[352,960,20],[378,1050,22],[398,1124,22]]},
  {id:'gpa',n:'Gipfelabfahrt',col:'s',st:5,via:'gs',wear:.05,pts:[[580,280,12],[608,306,13],[644,330,15],[676,352,17],[700,382,22]]},
  {id:'z3',n:'Zubringer',col:'b',st:6,conn:1,pts:[[850,466,10],[818,472,14],[790,476,18]]}],
 lifts:[
  {id:'am',n:'Almbahn',sh:'Almbahn',typ:'s4',st:1,b:[548,1576],t:[430,1196],nx:'kb',exit:[448,1212],py:[.2,.4,.6],pistes:['za','ta'],bn:'Talstation',tn:'Alm',ovh:2500,upF:.7},
  {id:'kb',n:'Kesselbahn',sh:'Kesselbahn',typ:'s6',st:2,b:[430,1196],t:[644,950],exit:[660,966],py:[.33,.58],pistes:['ka'],bn:'Alm',tn:'Kessel',ovh:3000,upF:.7},
  {id:'rl',n:'Rinnenlift',sh:'Rinnenlift',typ:'s4',st:3,b:[800,970],t:[820,568],exit:[800,584],py:[.32,.62],pistes:['zr','nr'],bn:'Kessel',tn:'Rinnenkopf',ovh:2500,upF:.7},
  {id:'gb',n:'Gletscherbahn',sh:'Gletscherbahn',typ:'g8',st:4,b:[530,975],t:[420,572],exit:[438,592],py:[.3,.66],pistes:['zga','ga','ztr','tr'],bn:'Kessel',tn:'Gletscherstation',ovh:3500,upF:.7},
  {id:'gt',n:'Gletscherlift',sh:'Gletscherlift',typ:'schlepp',st:4,b:[540,560],t:[670,424],exit:[686,430],py:[.5],pistes:['zgt','gs'],bn:'Gletscherstation',tn:'Gletscher oben',ovh:1500,upF:.6},
  {id:'s3',n:'Gletscherexpress 3S',sh:'3S',typ:'s3',st:6,b:[984,1612],t:[868,452],exit:[850,466],py:[.3,.62],pistes:['z3','gs'],bn:'Talstation Ost',tn:'Gletscher Ost',ovh:6000,upF:.6}],
 kassa:{x:420,y:1600},
 lots:[{id:'r1',n:'Parkplatz · Reihe 1',x0:-130,x1:356,y0:1800,y1:1850,base:1},{id:'r2',n:'Reihe 2',x0:-130,x1:356,y0:1880,y1:1930},{id:'r3',n:'Reihe 3',x0:560,x1:902,y0:1820,y1:1870,st:3}],
 hut:{x:282,y:1160,in:[[452,1220],[392,1196],[334,1172]],cost:8000,days:2,st:2,n:'Almhütte',pid:'za'},
 garage:{x:300,y:1590},bwHut:{x:836,y:1720},bwStart:[860,1726],
 cannons:{cost:9000,st:2},
 goals:[
  {k:'pf',t:'4 Sterne',sh:'4 ★',prog:()=>kStars()+' ★',ok:()=>kStars()>=4,lock:1},
  {k:'zu',t:'Platz 1 in der Rangliste',sh:'Platz 1',prog:()=>'jetzt Platz '+kRank(),ok:()=>kRank()<=1,lock:1},
  {k:'me',t:'Platz 1 schon am Ende der 2. Saison',sh:'Platz 1 nach Saison 2',prog:()=>KG.r2==null?(kSeaN()<=2?'zählt am letzten Tag der 2. Saison · jetzt Platz '+kRank():'–'):KG.r2?'Platz 1 am Ende der 2. Saison ✓':'am Ende der 2. Saison Platz '+KG.r2p,ok:()=>KG.r2===1,lock:1}],
 stageInfo:[null,
  {n:'Almbahn',d:'Die Almbahn bis zur Alm und die blaue Talabfahrt.'},
  {n:'Kessel',d:'Der 6er-Sessel fährt von der Alm in den Kessel unter dem Felsband. Die rote Kesselabfahrt ist offen, die Almhütte kann gebaut werden.',cost:14000,days:2,req:[['ruf',50,'Ruf mindestens 50 %'],['gst',150,'150 Gäste insgesamt']]},
  {n:'Rinnen',d:'Der Rinnenlift fährt auf den Rinnenkopf am Gletscherrand. Von dort geht die schwarze Nordrinne durch die Felsen in den Kessel. Ab jetzt zählt die Lawinengefahr: nach Neuschnee erst sprengen.',cost:16000,days:3,req:[['stars',2,'2 Sterne'],['ruf',55,'Ruf mindestens 55 %']]},
  {n:'Gletscher',d:'Eine 8er-Gondelbahn fährt auf den Gletscher. Dort ein Schlepplift, die blaue Gletscherpiste, die rote Gletscherabfahrt über den Schneesattel und die Teufelsrinne als Skiroute. Das Gletscherrestaurant kann gebaut werden.',cost:38000,days:4,req:[['stars',3,'3 Sterne'],['ruf',60,'Ruf mindestens 60 %']]},
  {n:'Gipfel',d:'Eine Pendelbahn mit zwei großen Kabinen fährt von der Gletscherstation auf den Gipfel – mit Aussichtsplattform auf 3.402 m und der schwarzen Gipfelabfahrt. Bei viel Wind steht sie.',cost:50000,days:5,req:[['stars',3,'3 Sterne'],['ruf',64,'Ruf mindestens 64 %']]},
  {n:'3S-Gletscherexpress',d:'Eine 3S-Bahn mit großen Kabinen fährt direkt vom Tal Ost auf den Gletscher – an zwei Tragseilen, auch bei Sturm. Mit eigener Kassa an der Talstation Ost.',cost:75000,days:6,req:[['stars',4,'4 Sterne'],['ruf',68,'Ruf mindestens 68 %']]}],
 fair:{ticket:[0,22,27,32,37,42,47],park:5,food:15,kids:7,school:24,hotel:90}
};

KV.eis.init=function(s){s.l.am.on=1;s.snow=46;s.lw=1;s.lw0=1;s.lwz={};s.wind=20;s.b.bus2=0;s.b.grest=0;s.b.zaun=0;s.b.mast={};s.pbLg=0;s.r2=null;s.lwH=0;s.heliAuto=0;s.maxG=0};
KV.eis.req=function(r){return null};
// ---------- Lawinen, Wind: Grundfunktionen ----------
function kEisShut(id){return !!(KG.lwz&&KG.lwz[id])}
function kEisOpenP(id){const p=KW.pmap[id];return !!p&&kPisteOpen(p)&&!kEisShut(id)}
function kEisWS(id){if(id==='s3'&&KG.stage<6)return 0;return (KG.wind||0)*(KEI.wf[id]||1)>KEI.lim[id]}
function kEisWindAt(id){return Math.round((KG.wind||0)*(KEI.wf[id]||1))}
KV.eis.windStop=function(id){return kEisWS(id)};
KV.eis.liftV=function(id){if(id==='kb'&&kEisWindAt('kb')>KEI.lim.kb*.85)return .6;return 1};
function kEisSlow(){return kEisWindAt('kb')>KEI.lim.kb*.85&&!kEisWS('kb')}
// ---------- Pisten verknüpfen ----------
KV.eis.world=function(){const P=KW.pmap,near=(Q,x,y)=>{let b=0,bd=1e9;for(const q of Q.d){const d=Math.hypot(q[0]-x,q[1]-y);if(d<bd){bd=d;b=q[3]}}return b};
 for(const [c,t] of [['za','ta'],['zr','nr'],['zgt','gs'],['gs','ga'],['zga','ga'],['ztr','tr'],['gpa','gs'],['z3','gs']]){const C=P[c],e=C.d[C.d.length-1];C.next={p:t,s:near(P[t],e[0],e[1])}}};
KV.eis.paths=function(){return {busUp:[],zebra:[]}};
// Wo ist der Gast? kas Kassa/Dorf · tal Talstation · ost Tal Ost (3S) · alm Alm · kes Kessel · gst Gletscherstation · gto Gletscherlift oben · rk Rinnenkopf · g3 3S oben · gip Gipfel
KV.eis.where=function(f){const d=(x,y)=>Math.hypot(f.x-x,f.y-y);
 if(d(KEI.KO[0],KEI.KO[1])<70||f.x>860&&f.y>1560&&f.y<1720)return 'ost';
 if(f.y>1700||d(420,1608)<64)return 'kas';
 if(f.y>1470)return 'tal';
 if(d(440,1214)<110&&f.y>1110)return 'alm';
 if(f.y>880&&f.y<1080&&f.x>430&&f.x<900)return 'kes';
 if(f.y<310)return 'gip';
 if(d(820,576)<50)return 'rk';
 if(d(860,462)<46)return 'g3';
 if(d(680,430)<36)return 'gto';
 if(f.y>470&&f.y<650&&f.x>360&&f.x<600)return 'gst';
 return 'x'};
KV.eis.route=function(from,to,f){if(!f)f={x:420,y:1610};
 if(to==='am'){if(from==='kas')return [[440,1614],[556,1616]];if(from==='tal')return [[Math.max(500,f.x),Math.max(f.y,1592)]];if(from==='ost')return [[940,1660],[800,1652],[640,1648]];return []}
 if(to==='s3'){if(from==='kas')return [[452,1622],[560,1644],[800,1652],[900,1660]];if(from==='tal')return [[Math.max(560,f.x),1644],[800,1652],[900,1660]];return []}
 if(to==='kas'){if(from==='ost')return [[940,1660],[800,1652],[560,1644],[440,1614],[420,1610]];if(from==='tal')return [[Math.max(500,f.x),Math.max(f.y,1606)],[440,1614],[420,1610]];return [[420,1610]]}
 return []};
// Skifahren nach einem kurzen Weg (ohne Sprung)
function kEisGoSki(f,pid,P){if(!P||!P.length){kSkiStart(f,pid);return}kWalk(f,P,'sk:'+pid,12)}
function kEisUp(f,id,P){if(!KG.l[id]||!KG.l[id].on||!kLiftOpen(id)||KG.t>=15.3||f.leaving)return 0;let p=P[f.ty]||.4;if(f.kid)p*=.6;const w=kWait(id);if(w>20)p*=.45;else if(w>10)p*=.75;return kR()<p}
function kEisMiss(f,id){if(f.lwM||!(f.ty==='pro'||f.ty==='sb'))return;if(kPisteOpen(KW.pmap[id])&&kEisShut(id)){f.lwM=1;f.sat-=3}}
// Kessel: Gletscherbahn, Rinnenlift oder Kesselabfahrt
function kEisKes(f){kEisMiss(f,'nr');const g=KG.stage>=4&&kEisUp(f,'gb',{pro:.72,sb:.7,fam:.34,anf:.1}),r=kEisOpenP('nr')&&kEisUp(f,'rl',{pro:.5,sb:.42,fam:0,anf:0});
 if(g&&r)return kR()<.6?'gb':'rl';if(g)return 'gb';if(r)return 'rl';return null}
KV.eis.chooseLift=function(f){const w=KVOR.where(f),ty=f.ty,ok=id=>KG.l[id]&&KG.l[id].on&&kLiftOpen(id);
 if(w==='ost'){if(ok('s3'))return 's3';return 'am'}
 if(w==='alm'){if(kEisUp(f,'kb',{pro:.86,sb:.8,fam:.34,anf:.12}))return 'kb';kEisGoSki(f,'za',[[448,1216]]);return null}
 if(w==='kes'){const c=kEisKes(f);if(c)return c;kEisGoSki(f,'ka',[[664,982]]);return null}
 if(w==='gst'){kEisAtGst(f);return null}
 if(w==='gto'){kEisGoSki(f,'zgt',[[686,432]]);return null}
 if(ok('s3')&&(ty==='pro'||ty==='sb')&&kR()<.22&&kWait('s3')<kWait('am')+6)return 's3';
 return 'am'};
// Aussteigen oben
KV.eis.unload=function(o,f){const id=o.L.id;
 if(id==='am'){if(KG.stage>=2&&kEisUp(f,'kb',{pro:.88,sb:.84,fam:.36,anf:.12})){kToQueue(f,'kb');return}kSkiStart(f,'za');return}
 if(id==='kb'){const c=kEisKes(f);if(c){kToQueue(f,c);return}kSkiStart(f,'ka');return}
 if(id==='rl'){kSkiStart(f,'zr');return}
 if(id==='gb'){kEisAtGst(f);return}
 if(id==='gt'){kSkiStart(f,'zgt');return}
 if(id==='s3'){kSkiStart(f,'z3');return}
 kSkiStart(f,o.L.pistes[0])};
// an der Gletscherstation: Restaurant, Pendelbahn, Gletscherlift, Teufelsrinne oder Gletscherabfahrt
function kEisAtGst(f){const ty=f.ty,sk=ty==='pro'||ty==='sb';
 if(f.leaving||KG.t>=f.leaveT){f.leaveT=0;kEisGoSki(f,'zga',[[438,594]]);return}
 if(KG.b.grest&&!f.ate&&KG.t>=11.2&&KG.t<14.2&&!f.kid&&kR()<.62){kEisRest(f);return}
 const O=[];
 if(kEisPbOk()&&KG.t<15.4){if(sk&&kEisOpenP('gpa'))O.push(['pbs',{pro:.55,sb:.42}[ty]]);else{if(sk)kEisMiss(f,'gpa');if(!f.viewD)O.push(['pbv',{fam:.34,anf:.24,pro:.12,sb:.1}[ty]||.15])}}
 if(KG.l.gt.on&&kLiftOpen('gt')&&KG.t<15.6){let p={fam:.62,anf:.58,pro:.3,sb:.42}[ty]||.4;const w=kWait('gt');if(w>15)p*=.5;O.push(['gt',p])}
 if(sk){if(kEisOpenP('tr'))O.push(['tr',{pro:.34,sb:.4}[ty]]);else kEisMiss(f,'tr')}
 O.push(['ga',ty==='fam'||ty==='anf'?.25:.5]);
 let s=0;for(const o of O)s+=o[1];let r=kR()*s,pick='ga';for(const o of O){r-=o[1];if(r<=0){pick=o[0];break}}
 if(pick==='pbs'||pick==='pbv'){kEisPbQ(f,'B',pick==='pbs'?'s':'v');return}
 if(pick==='gt'){kToQueue(f,'gt');return}
 if(pick==='tr'){kEisGoSki(f,'ztr',[[410,592]]);return}
 kEisGoSki(f,'zga',[[438,594]])}
// Gletscherrestaurant mit Sonnenterrasse
function kEisRestSeat(i){const S=[[-44,12],[-34,12],[-24,12],[-14,12],[-4,12],[6,12],[16,12],[26,12],[-40,20],[-28,20],[-16,20],[-4,20],[8,20],[20,20],[32,20],[42,12]];const q=S[i%S.length];return [KEI.REST[0]+q[0],KEI.REST[1]+q[1]]}
function kEisRest(f){const i=(KW.restN=(KW.restN||0)+1);const s=kEisRestSeat(i);kWalk(f,[[420,586],[376,566],[s[0],s[1]+8],s],'rest',11)}
function kEisRestDone(f){const P=KG.price,r=P.food/KVOR.fair.food;f.ate=1;f.sit=0;
 if(r<1.7||kR()<.45){const v=Math.round(P.food*1.35*(f.ty==='pro'?1.15:1));kEarn('food',v,KEI.REST[0],KEI.REST[1]-74);f.paid=(f.paid||0)+v;f.sat+=(r>1?-(r-1)*20:6)+3}else f.sat-=4;
 kWalk(f,[[f.x,f.y+8],[376,566],[430,588]],'gst',11)}
KV.eis.arrive=function(f,nx){if(nx.startsWith('sk:')){kSkiStart(f,nx.slice(3));return true}
 if(nx==='rest'){f.st='rest';f.sit=1;f.tEnd=KG.t+.45+kR()*.4;return true}
 if(nx==='gst'){kEisAtGst(f);return true}
 if(nx==='pbq'){kEisPbJoin(f);return true}
 if(nx==='view'){f.st='view';f.tEnd=Math.min(16.1,KG.t+.22+kR()*.25);return true}
 if(nx==='busw'){f.st='busw';return true}
 return false};
KV.eis.folkStep=function(f,dt){const st=f.st;
 if(st==='rest'){if(KG.t>=f.tEnd)kEisRestDone(f);return}
 if(st==='view'){if(KG.t>=f.tEnd){f.viewD=1;kEisPbQ(f,'T','d')}return}
 if(st==='pbw'){const pb=KW.pb;if(!pb)return;const Q=pb.q[f.pbS],i=Q.indexOf(f);if(i<0)return;const [sx,sy]=kEisPbSlot(f.pbS,i),dx=sx-f.x,dy=sy-f.y,d=Math.hypot(dx,dy);if(d>.3){const m=Math.min(d,26*dt);f.x+=dx/d*m;f.y+=dy/d*m}f.sv=0}};
// Abfahren nach Hause: von jeder Station über die passende Piste
KV.eis.descend=function(f){if(f.st==='hurt'&&f.pid){f.st='ski';f.v=Math.min(f.v||20,20);f.leaveT=0;f.engIn=null;f.engQ=null;f.engHold=0;return true}
 if(f.st==='ski')return false;const w=KVOR.where(f),go=(pid,P)=>{f.leaveT=0;kEisGoSki(f,pid,P);return true};
 if(w==='alm')return go('za',[[448,1216]]);if(w==='kes')return go('ka',[[664,982]]);if(w==='gst')return go('zga',[[438,594]]);if(w==='gto')return go('zgt',[[686,432]]);
 if(w==='rk')return go(kEisOpenP('nr')?'zr':'zr',[[798,586]]);if(w==='g3')return go('z3',[[850,466]]);
 if(w==='gip'){f.leaveT=0;kEisPbQ(f,'T','d');return true}
 return false};
KV.eis.resPre=function(f){const P=KW.pmap[f.pid];if(!P)return [];if(['nr','zr','ga','zga','gs','zgt','z3','gpa','tr','ztr'].includes(f.pid)||P.next&&['ga','gs','tr','nr'].includes(P.next.p))return [[420,1610],[480,1530],[452,1514],[396,1460],[336,1420],[330,1372],[372,1322],[440,1294],[500,1266],[560,1232],[626,1206],[704,1164],[742,1094],[704,1034],[664,980]];return [[420,1610],[480,1530]]};
// ---------- Warteschlangen ----------
KV.eis.qSlot=function(o,i){const id=o.L.id,k=(n,c)=>{const m=Math.min(i,n-1);return [Math.floor(m/c),m%c]};
 if(id==='am'){const [r,j]=k(80,10);return [566+(r%2?9-j:j)*7.4,1598+r*8]}
 if(id==='kb'){const [r,j]=k(60,10);return [412-(r%2?9-j:j)*7,1212+r*7]}
 if(id==='rl'){const [r,j]=k(48,8);return [818+(r%2?7-j:j)*7,986+r*7]}
 if(id==='gb'){const [r,j]=k(48,8);return [512-(r%2?7-j:j)*7,994+r*7]}
 if(id==='gt'){const [r,j]=k(24,6);return [528-(r%2?5-j:j)*7,572+r*7]}
 if(id==='s3'){const [r,j]=k(60,10);return [962-(r%2?9-j:j)*7.4,1630+r*8]}
 return null};
function kEisFence(c,x0,x1,y0,dy,R,dir){const ys=[];for(let r=0;r<=R;r++)ys.push(y0+r*dy);if(dy<0)ys.reverse();kSeeFenceBlock(c,x0,x1,ys,dir)}
function kEisPbFence(c){if(KG.stage<5||!KW.pb)return;const nB=KW.pb.q.B.length,nT=KW.pb.q.T.length;kEisFence(c,404,456,497,6.5,Math.max(2,Math.min(6,Math.ceil(nB/7)+1)),0);kEisFence(c,492,536,279,6.5,Math.max(2,Math.min(6,Math.ceil(nT/6)+1)),1)}
KV.eis.fence=function(c,o,id){const n=o.q.length,R=(per,mn,mx)=>Math.max(mn,Math.min(mx,Math.ceil(n/per)+1));if(id==='am')kEisPbFence(c);
 if(id==='am'){kEisFence(c,560,640,1594,8,R(10,3,8),0);kSeeWaitSign(c,id,652,1574);return true}
 if(id==='kb'){kEisFence(c,342,418,1208,7,R(10,3,7),0);kSeeWaitSign(c,id,336,1196);return true}
 if(id==='rl'){kEisFence(c,812,872,982,7,R(8,3,6),0);kSeeWaitSign(c,id,884,968);return true}
 if(id==='gb'){kEisFence(c,458,518,990,7,R(8,3,6),0);kSeeWaitSign(c,id,446,980);return true}
 if(id==='gt'){kEisFence(c,488,534,568,7,R(6,2,4),0);return true}
 if(id==='s3'){kEisFence(c,890,968,1626,8,R(10,3,7),0);kSeeWaitSign(c,id,880,1610);return true}
 return false};

// ---------- Pendelbahn: zwei große Kabinen, die eine fährt hinauf, die andere hinunter ----------
function kEisPbOk(){return KG.stage>=5&&!kEisWS('pb')&&KG.t>=8.4&&KG.t<16.25}
function kEisPbCap(){return KEI.pbCap[Math.min(2,KG.pbLg||0)]}
function kEisPbPh(i,t){const Pd=2*(KEI.pbTT+KEI.pbDW),dw=KEI.pbDW,tt=KEI.pbTT,e=u=>u*u*(3-2*u);
 if(KG.stage<5||kEisWS('pb')||t<8.4||t>=17.15)return {st:i?'T':'B',u:i?1:0,k:-1};
 const zz=(t-8.4)+(i?Pd/2:0),z=zz%Pd,k=Math.floor(zz/Pd);
 if(z<dw)return {st:'B',u:0,k};if(z<dw+tt)return {st:'up',u:e((z-dw)/tt),k};if(z<2*dw+tt)return {st:'T',u:1,k};return {st:'dn',u:1-e((z-2*dw-tt)/tt),k}}
function kEisPbSlot(side,i){if(side==='B'){const m=Math.min(i,39),r=Math.floor(m/7),j=m%7;return [450-(r%2?6-j:j)*7,500+r*6.5]}
 const m=Math.min(i,35),r=Math.floor(m/6),j=m%6;return [530-(r%2?5-j:j)*7,282+r*6.5]}
function kEisPbInit(){if(!KW.pb)KW.pb={cab:[{r:[]},{r:[]}],q:{B:[],T:[]},n:0,up:0};return KW.pb}
// anstellen: s = Gipfelabfahrt, v = Aussicht, d = hinunter
function kEisPbQ(f,side,kind){kEisPbInit();f.pbK=kind;f.pbS=side;const Q=KW.pb.q[side],sl=kEisPbSlot(side,Q.length+1);const P=side==='B'?[[452,Math.min(f.y,588)],[452,Math.min(f.y,536)],sl]:[[Math.min(f.x,546),Math.max(f.y,276)],sl];kWalk(f,P,'pbq',11)}
function kEisPbJoin(f){const pb=kEisPbInit();if(f.pbS==='B'&&(!kEisPbOk()||KG.t>=15.55)){kEisAtGstNoPb(f);return}f.st='pbw';f.qT=KG.t;pb.q[f.pbS].push(f)}
function kEisAtGstNoPb(f){f.viewD=1;if(f.pbK==='s'&&kEisOpenP('tr')&&kR()<.5){kEisGoSki(f,'ztr',[[410,592]]);return}kEisGoSki(f,'zga',[[438,594]])}
function kEisPbPos(i){const ph=kEisPbPh(i,KG.t),{b,t}=KEI.PB,dx=t[0]-b[0],dy=t[1]-b[1],l=Math.hypot(dx,dy),s=i?1:-1,co=9;const u=ph.u;return {x:b[0]+dx*u+(-dy/l)*co*s,y:b[1]+dy*u+(dx/l)*co*s+Math.sin(u*Math.PI)*10,ph}}
function kEisPbTick(t0,t1){if(KG.stage<5)return;const pb=kEisPbInit();
 for(const i of [0,1]){const C=pb.cab[i],a=kEisPbPh(i,t0),b=kEisPbPh(i,t1);
  if(a.st!==b.st||a.k!==b.k){
   if(a.st==='up'&&b.st!=='up')kEisPbOut(C,'T');
   if(a.st==='dn'&&b.st!=='dn')kEisPbOut(C,'B');
   if((a.st==='B'||a.st==='T')&&(b.st==='up'||b.st==='dn')){pb.n+=C.r.length;if(b.st==='up')pb.up+=C.r.length;KG.res.pbN=(KG.res.pbN||0)+C.r.length}}
  // einsteigen, solange die Kabine an der Station steht
  if(b.k<0)continue;const side=b.st==='B'?'B':b.st==='T'?'T':null;if(!side)continue;if(side==='B'&&t1>=15.55)continue;
  const Q=pb.q[side],s0=kEisPbSlot(side,0);while(Q.length&&C.r.length<kEisPbCap()){const f=Q[0];if(Math.hypot(f.x-s0[0],f.y-s0[1])>60)break;Q.shift();f.st='pbr';f.hide=1;f.pbTo=side==='B'?'T':'B';C.r.push(f);
   const w=(KG.t-(f.qT||KG.t))*60;f.sat-=Math.max(0,w-12)*.4}}
 // nach der letzten Bergfahrt: wer unten wartet, fährt mit der Gletscherbahn-Seite weiter
 if(t1>=15.55)for(const f of pb.q.B.splice(0))kEisAtGstNoPb(f);
 // nach der letzten Talfahrt (Sicherheitsnetz)
 if(t1>=17.15){for(const f of pb.q.T.splice(0)){f.st='gone'}for(const C of pb.cab)for(const f of C.r.splice(0)){f.hide=0;f.st='gone'}}}
function kEisPbOut(C,side){let k=0;const keep=[];for(const f of C.r){if(f.pbTo!==side){keep.push(f);continue}f.hide=0;f.delay=k*.05;k++;
  if(side==='T'){f.x=560+(k%4)*4;f.y=282+(k%3)*3;if(f.pbK==='s'&&kEisOpenP('gpa'))kEisGoSki(f,'gpa',[[580,282]]);else{const sp=kEisView(k);kWalk(f,[[566,276],sp],'view',8)}}
  else{f.x=458-(k%4)*4;f.y=510+(k%3)*3;f.viewD=1;if(f.leaving||KG.t>=f.leaveT||KG.t>=16.25){f.leaveT=0;kEisGoSki(f,'zga',[[452,536],[452,586],[438,594]])}else kWalk(f,[[452,536],[452,586],[438,590]],'gst',11)}}
 C.r=keep}
function kEisView(k){const P=[[578,248],[584,247],[590,246],[596,246],[574,252],[582,252],[590,252],[598,251],[570,256],[588,257]];const q=P[(KW.vN=(KW.vN||0)+1)%P.length];return [q[0]+(kR()-.5)*2,q[1]]}
// ---------- Anreise: Autos über die Straße mit den Kehren, Skibus zum Wendeplatz ----------
function kEiOff(P,o){const n=P.length,out=[];for(let i=0;i<n;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(n-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;out.push([P[i][0]+(-dy/l)*o,P[i][1]+(dx/l)*o])}return out}
const KERIN=kEiOff(KER,7),KEROUT=kEiOff(KER.slice().reverse(),7);
const KEIX={r12:35,r3:26};   // Abzweig von der Straße (Index in KER)
function kEisSpots(){const out=[];for(const L of KVOR.lots){if(!KG.lots[L.id])continue;const n=Math.floor((L.x1-L.x0)/kLotW);for(let i=0;i<n;i++){const x=L.x0+kLotW*i+kLotW/2;out.push({lot:L.id,i,x,y:L.id==='r1'?1825:L.id==='r2'?1905:1845,nose:L.id==='r2'?Math.PI/2:-Math.PI/2})}}return out}
function kEisFreeSpot(){const used=new Set(KW.cars.filter(c=>c.spot).map(c=>c.spot.lot+':'+c.spot.i));const free=kEisSpots().filter(s=>!used.has(s.lot+':'+s.i));if(!free.length)return null;
 const rk={r1:0,r2:1,r3:2};free.sort((a,b)=>rk[a.lot]-rk[b.lot]||(a.lot==='r3'?a.x-b.x:b.x-a.x));return free[Math.floor(kR()*Math.min(3,free.length))]}
function kEisInPts(c){const sx=c.sx;
 if(c.lot==='r3')return KERIN.slice(0,KEIX.r3+1).concat([[906,1956],[906,1904],[sx+18,1886],[sx,1872],[sx,c.py]]);
 const F=KEI.F12-4,dn=c.lot==='r2';return KERIN.slice(0,KEIX.r12+1).concat([[414,1874],[396,F],[sx+18,F],[sx,F+(dn?14:-14)],[sx,c.py]])}
function kEisRevPts(c){const sx=c.sx;if(c.lot==='r3')return [[sx,c.py],[sx,1878],[sx-14,1894]];const F=KEI.F12+4;return [[sx,c.py],[sx,c.py<F?F-12:F+12],[sx-14,F]]}
function kEisOutPts(c){const sx=c.sx,j3=KER.length-1-KEIX.r3,j12=KER.length-1-KEIX.r12;
 if(c.lot==='r3')return [[sx-14,1894],[918,1894],[918,1950]].concat(KEROUT.slice(j3));
 return [[sx-14,KEI.F12+4],[392,KEI.F12+4],[402,1884]].concat(KEROUT.slice(j12))}
function kEisCarSp(c){const y=c.y,x=c.x;if(y>1990)return 90;if(c.st==='in'&&c.s>c.turnS-40||c.st==='leave'&&c.s<70)return 26;return 70}
KV.eis.spawnCar=function(ty){const sp=kEisFreeSpot();if(!sp){KG.rej++;KG.res.rej=(KG.res.rej||0)+1;return 0}
 const g=kGroup(ty),arr=KG.t,lt=kLeaveT(ty,arr);for(const f of g)kSetupFolk(f,arr,lt);
 const c={st:'in',spot:sp,sx:sp.x,py:sp.y,lot:sp.lot,nose:sp.nose,col:kpick(['#e8504a','#3a78d0','#f2f2f2','#6cc07a','#f2c53b','#ff8fb8','#8e93b8','#2fb3b8']),ppl:g,n:g.length,back:0,ty,slow:1};
 const P=kEisInPts(c);c.d=kSeeRnd(P,14);c.s=0;{const tp=P[P.length-3];let bd=1e9;for(const q of c.d){const d=Math.hypot(q[0]-tp[0],q[1]-tp[1]);if(d<bd){bd=d;c.turnS=q[3]}}}const p=kAt(c.d,0);c.x=p[0];c.y=p[1];c.a=Math.PI;for(const f of g)f.car=c;KW.cars.push(c);return g.length};
KV.eis.carStep=function(c,dt){
 if(c.st==='in'){if(kSeeMove(c,dt,kEisCarSp(c))){c.st='park';c.x=c.sx;c.y=c.py;c.a=c.nose;kEisUnloadCar(c)}return}
 if(c.st==='park')return;
 if(c.st==='out'){c.tw-=dt;if(c.tw>0)return;const P=kEisRevPts(c),e=P[2];for(const o of KW.cars){if(o===c||o.st==='park')continue;if(Math.hypot(o.x-e[0],o.y-e[1])<34)return}
  c.st='rev';c.d=kSeeRnd(P,10);c.s=0;c.rev=1;c.prio=1;c.slow=0;return}
 if(c.st==='rev'){if(kSeeMove(c,dt,16)){c.st='leave';c.rev=0;c.prio=0;c.d=kSeeRnd(kEisOutPts(c),14);c.s=0;c.spot=null}return}
 if(c.st==='leave'){if(kSeeMove(c,dt,kEisCarSp(c)))c.st='gone'}};
// Wege zwischen Auto und Kassa
function kEisCarX(c){return c.sx+9}
function kEisFromCar(c){const x=kEisCarX(c);if(c.lot==='r3')return [[x,c.py],[x,KEI.G3],[566,KEI.G3],[562,1720],[540,1660],[452,1620],[420,1610]];return [[x,c.py],[x,KEI.G1],[360,KEI.G1],[386,1720],[404,1652],[420,1612]]}
function kEisFromCar3S(c){const x=kEisCarX(c);return [[x,c.py],[x,KEI.G3],[920,KEI.G3],[968,1724],[1054,1686],[KEI.KO[0],KEI.KO[1]+8]]}
function kEisUnloadCar(c){let i=0;const s3=KG.stage>=6&&KG.l.s3.on&&!kEisWS('s3')&&c.lot==='r3'&&(c.ty==='pro'||c.ty==='sb')&&kR()<.5;
 for(const f of c.ppl){f.x=c.sx+(i%2?-7:7);f.y=c.py+(c.nose<0?6:-6)+(i>>1)*4;f.delay=i*.3;KW.folks.push(f);KG.gDay++;KG.gT++;i++;
  if(s3){f.kasP=[KEI.KO[0],KEI.KO[1]];kWalk(f,kEisFromCar3S(c),'kassa',11)}else{f.kasP=null;kWalk(f,kEisFromCar(c),'kassa',11)}}
 kEarn('pk',KG.price.park,c.sx,c.py-20);const r=KG.price.park/Math.max(1,KVOR.fair.park);if(r>1.3)for(const f of c.ppl)f.sat-=(r-1.3)*10}
KV.eis.goHome=function(f){const w=KVOR.where(f);let P=[];
 if(w==='ost')P=[[Math.min(f.x,1000),Math.max(f.y,1650)]];else if(w==='tal')P=[[Math.max(500,f.x),Math.max(f.y,1606)],[440,1614]];else P=[[f.x,Math.max(f.y,1606)]];
 if(f.busG){kWalk(f,P.concat([[452,1626],[470+(kR()-.5)*16,1668]]),'busw',11);return}
 const c=f.car;if(!c){kWalk(f,P,'inshome',11);return}const x=kEisCarX(c);
 if(c.lot==='r3'){if(w==='ost')P=P.concat([[968,1724],[920,KEI.G3],[x,KEI.G3],[x,c.py]]);else P=P.concat([[452,1620],[540,1660],[562,1720],[566,KEI.G3],[x,KEI.G3],[x,c.py]]);kWalk(f,P,'car',11);return}
 if(w==='ost')P=P.concat([[940,1660],[800,1652],[560,1644],[440,1614]]);
 kWalk(f,P.concat([[404,1652],[386,1720],[360,KEI.G1],[x,KEI.G1],[x,c.py]]),'car',11)};
// Skibus: über die Kehren zum Wendeplatz im Dorf und wieder hinunter
const KEBUS=(()=>{const W=KEI.WP;return KERIN.concat([[W[0]-6,W[1]+18],[W[0]+16,W[1]+10],[W[0]+20,W[1]-10],[W[0]+2,W[1]-20],[W[0]-18,W[1]-10]]).concat(KEROUT.slice(1))})();
KV.eis.spawnBus=function(n,pick){const b={st:'in',n,pick,bus:1,d:kSeeRnd(KEBUS,16),s:0};let best=1e9;for(const q of b.d){const d=Math.hypot(q[0]-(KEI.WP[0]+4),q[1]-(KEI.WP[1]-20));if(d<best){best=d;b.stopS=q[3]}}const p=kAt(b.d,0);b.x=p[0];b.y=p[1];b.a=Math.PI;KW.buses.push(b)};
KV.eis.busStep=function(b,dt){const sp=b.y>1990?80:56;
 if(b.st==='in'){if(b.s+sp*dt>=b.stopS){b.s=b.stopS;const q=kAt(b.d,b.s);b.x=q[0];b.y=q[1];b.st='stop';b.tw=3.5;if(b.n)kEisBusUnload(b);return}kSeeMove(b,dt,sp);return}
 if(b.st==='stop'){b.tw-=dt;if(b.tw<=0){if(b.pick){const Wt=KW.folks.filter(f=>f.st==='busw');for(const f of Wt.slice(0,44))f.st='gone'}b.st='leave'}return}
 if(b.st==='leave'){if(kSeeMove(b,dt,sp))b.st='gone'}};
function kEisBusUnload(b){const n=b.n||0;for(let i=0;i<n;i++){const ty=kMix(),f=kMkFolk(ty,0);kSetupFolk(f,KG.t,Math.min(16.2,kLeaveT(ty,KG.t)));f.busG=1;f.x=b.x-10+(i%6)*5;f.y=b.y-10-Math.floor(i/6)*2;f.delay=i*.07;
  kWalk(f,[[f.x,1664],[452,1626],[420,1610]],'kassa',11);KW.folks.push(f);KG.gDay++;KG.gT++}}
KV.eis.busPickT=function(){return KG.b.bus2?[15.1,15.5,15.9,16.3,16.7,17.05]:[15.3,15.8,16.3,16.8]};
KV.eis.busT=function(){return KG.b.bus2?[8.4,8.9,9.4,9.9,10.4]:[8.65,9.65,10.65]};
// ---------- Lawinen: Sperren, Sprengen ----------
function kEisBlast(id,how){if(!kEisShut(id))return;delete KG.lwz[id];(KW.blast||(KW.blast=[])).push({id,T:KW.T});KG.res.lwB=(KG.res.lwB||0)+1;
 kLog('💥',KEI.sn[id]+' gesprengt ('+how+') – die Abfahrt ist offen.');kUIdirty()}
function kEisClosed(){return KEI.shut.filter(id=>kEisShut(id))}
// heute überhaupt erreichbar? (fährt der Lift dorthin)
function kEisReach(id){return id==='nr'?!kEisWS('rl'):id==='tr'?!kEisWS('gb'):KG.stage>=5&&!kEisWS('pb')}
function kEisHeliCan(){return KG.b.bw&&!KW.heli&&kEisClosed().length>0&&KG.t>=6.9&&KG.t<15}
function kEisHeli(auto){if(!kEisHeliCan())return 0;kSpend('heli',1500);const pad=KEI.HELI,T=kEisClosed();const pts=[[pad[0],pad[1]-6]];for(const id of ['nr','gpa','tr'])if(T.includes(id)){const m=KEI.mast[id];pts.push([m[0]-40,m[1]-30,id])}pts.push([pad[0],pad[1]-6]);
 KW.heli={pts,i:1,x:pad[0],y:pad[1]-6,a:0,h:0};kLog('🚁','Sprengflug'+(auto?' (automatisch)':'')+' gestartet – 1.500 €.');kUIdirty();return 1}
function kEisHeliStep(dt){const H=KW.heli;if(!H)return;const p=H.pts[H.i];if(!p){KW.heli=null;return}const dx=p[0]-H.x,dy=p[1]-H.y,d=Math.hypot(dx,dy),sp=150,m=sp*dt;
 H.h=Math.min(1,H.h+dt*.8);H.a=Math.atan2(dy,dx);if(d<=m){H.x=p[0];H.y=p[1];if(p[2]){H.hold=(H.hold||0)+dt;if(H.hold<.9)return;H.hold=0;kEisBlast(p[2],'Sprengflug')}H.i++;if(H.i>=H.pts.length){KW.heli=null}}else{H.x+=dx/d*m;H.y+=dy/d*m}}
// ---------- Tagesablauf ----------
KV.eis.morning=function(){const W={sonne:[10,34],tau:[22,48],neuschnee:[32,72],sturm:[76,122]}[KG.wx]||[15,40];KG.wind=Math.round(W[0]+kR()*(W[1]-W[0]));
 const d={neuschnee:2,sturm:1,tau:-1,sonne:-1}[KG.wx]||0;KG.lw0=kcl((KG.lw0||1)+d-.4,1,5);KG.lw=Math.max(1,Math.round(KG.lw0)-(KG.b.zaun?1:0));
 KG.lwz={};KW.blast=[];KW.heli=null;KW.trupp=null;KW.natL=null;KW.natA=null;KW.pb=null;kEisPbInit();KW.restN=0;
 if(KG.lw>=3&&KG.stage>=3)for(const id of KEI.shut)if(kPisteOpen(KW.pmap[id]))KG.lwz[id]={z:1};
 if(KG.lw>=4&&KG.stage>=1)KW.natL={t:9.2+kR()*2.6};
 if(KG.b.bus&&KG.dem>0)KG.busShare=Math.min(KG.b.bus2?.42:.32,(KG.b.bus2?200:110)/KG.dem)};
KV.eis.windLog=function(){const st=[];for(const id of ['pb','gb','gt','rl','kb','am','s3']){if(id==='pb'?KG.stage<5:!KG.l[id].on)continue;if(kEisWS(id))st.push(id==='pb'?'Pendelbahn':kLC(id).n)}
 if(st.length)kLog('🌪️','Wind am Gipfel '+KG.wind+' km/h – '+st.join(', ')+(st.length>1?' stehen':' steht')+' heute.'+(kEisSlow()?' Die Kesselbahn fährt langsam.':''));else if(kEisSlow())kLog('💨','Wind am Gipfel '+KG.wind+' km/h – die Kesselbahn fährt heute langsam.');
 if(KG.stage>=3&&KG.lw>=3){const z=kEisClosed();const tx='Lawinenwarnstufe '+KG.lw+' – '+(z.length?z.map(i=>KEI.sn[i]).join(', ')+' gesperrt, bis gesprengt.':'die Rinnen sind offen.');kLog('⚠️',tx);if(z.length)kToast('⚠️ '+tx,4200)}};
KV.eis.tick=function(dt,dth){const t0=KG.t-dth,t1=KG.t;
 // Sprengmasten um 7:15
 if(t0<7.25&&t1>=7.25)for(const id of kEisClosed())if(KG.b.mast&&KG.b.mast[id])kEisBlast(id,'Sprengmast');
 // Sprengflug automatisch, Sprengtrupp der Bergwacht ab 7:00 (eine Rinne pro Stunde)
 if(t0<7&&t1>=7){if(KG.heliAuto&&KG.lw>=4&&kEisClosed().some(id=>!(KG.b.mast&&KG.b.mast[id])&&kEisReach(id)))kEisHeli(1);
  if(KG.b.bw&&!KW.heli&&kEisClosed().some(id=>!(KG.b.mast&&KG.b.mast[id]))){KW.trupp={q:['nr','tr','gpa'].filter(id=>kEisShut(id)&&!(KG.b.mast&&KG.b.mast[id])),t:7.25};kLog('🧨','Der Sprengtrupp der Bergwacht ist unterwegs – eine Rinne pro Stunde.')}}
 const TR=KW.trupp;if(TR){while(TR.q.length&&!kEisShut(TR.q[0]))TR.q.shift();if(!TR.q.length)KW.trupp=null;else if(t1>=TR.t+1){kEisBlast(TR.q.shift(),'Sprengtrupp');TR.t=t1;if(!TR.q.length)KW.trupp=null}}
 kEisHeliStep(dt);
 if(KW.natL&&t1>=KW.natL.t){KW.natL=null;KW.natA={T:KW.T};kLog('🏔️','Eine Lawine ist im Lawinenstrich abgegangen – der Damm hat sie aufgefangen.')}
 // gesperrte Zeit zählt für den Ruf
 if(t1>8.5&&t1<16.25)KG.lwH=(KG.lwH||0)+dth*kEisClosed().length;
 kEisPbTick(t0,t1)};
KV.eis.midnight=function(){KG.maxG=Math.max(KG.maxG||0,KG.gDay||0);
 if(KG.lwH>0){KG.ruf=Math.max(5,KG.ruf-Math.min(2.5,KG.lwH*.22));KG.lwH=0}
 for(const id of ['nr','tr','gpa'])KG.pq[id]=Math.min(kSnowCap(),(KG.pq[id]||80)+5);
 if(kSeaN()===2&&kSeaD()===KSL&&KG.r2==null){KG.r2p=kRank();KG.r2=KG.r2p<=1?1:0;kLog(KG.r2?'🏆':'📉',KG.r2?'Ende der 2. Saison auf Platz 1 – Meister-Ziel geschafft!':'Ende der 2. Saison auf Platz '+KG.r2p+' – das Meister-Ziel ist nicht mehr zu schaffen.')}};
KV.eis.costs=function(c,tm){if(KG.stage>=5)c.pb=Math.round((520+(KG.pbLg||0)*60)*tm);if(KG.stage>=6)c.kassa=(c.kassa||0)+70*tm;if(KG.b.bus2)c.bus=(c.bus||0)+100;
 const nm=Object.keys(KG.b.mast||{}).length;if(nm)c.mast=nm*25;if(KG.b.grest)c.grest=Math.round(160*tm)};
KV.eis.att=function(){return (KG.b.grest?.05:0)+(KG.stage>=5&&!kEisWS('pb')?.03:0)+(KG.stage>=6?.03:0)};
KV.eis.offer=function(){let o=0;const b=KG.b;for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;o+=45+({s4:25,s6:45,g8:60,s3:90,schlepp:5}[s.typ]||0)+(s.lg||0)*10}
 if(KG.stage>=5)o+=80+(KG.pbLg||0)*15;o+=(KG.stage-1)*40;for(const p of KW.pistes)if(!p.conn&&kPisteOpen(p))o+=30;
 o+=(b.cannons?35:0)+(b.raupe?30:0)+(b.kiosk?15:0)+(b.hut?50:0)+(b.grest?90:0)+(b.bus?20:0)+(b.bus2?10:0)+(b.bw?15:0)+(b.lw?10:0)+(KG.paved?15:0)+(b.zaun?20:0)+Object.keys(b.mast||{}).length*10;
 for(const L of KVOR.lots)if(!L.base&&KG.lots[L.id])o+=15;return o};
// Schneekanonen an der Talabfahrt
KV.eis.canPos=function(){const out=[],r=kRNG(9),P=KW.pmap.ta;const ok=(x,y)=>{if(kOnP(x,y,4)||kOnP(x,y-12,7))return 0;for(const L of KVOR.lifts){const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(Math.hypot(x-L.b[0]-dx*u,y-L.b[1]-dy*u)<30)return 0}for(const b of KST.blocks)if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])return 0;return 1};
 let acc=0,side=1;for(let i=1;i<P.d.length;i++){const a=P.d[i-1],q=P.d[i];acc+=Math.hypot(q[0]-a[0],q[1]-a[1]);if(acc<90||q[1]>1500)continue;
  for(const sg of [side,-side]){const x=q[0]+q[4]*(q[2]+12)*sg,y=q[1]+q[5]*(q[2]+12)*sg;if(ok(x,y)){out.push({x,y,sd:sg,ph:r()*20});acc=0;side=-side;break}}}return out};
// Pistenraupe: Talabfahrt, Kesselabfahrt, Gletscherabfahrt und Gletscherpiste hinauf – auf der anderen Seite wieder hinunter (Rinnen und Skiroute bleiben unpräpariert)
KV.eis.groomPlan=function(){const P=KW.pmap,L=Q=>Q.d[Q.d.length-1][3],off=(Q,s,k)=>{const q=kAt(Q.d,s);return [q[0]+q[3]*q[2]*k,q[1]+q[4]*q[2]*k]},run=(Q,a,b,k)=>{const o=[];if(a>b)for(let s=a;s>=b;s-=12)o.push(off(Q,s,k));else for(let s=a;s<=b;s+=12)o.push(off(Q,s,k));o.push(off(Q,b,k));return o};
 const up=[],dn=[];up.push({p:'x',pts:[[300,1560],[440,1556]]},{p:'ta',pts:run(P.ta,L(P.ta),0,.42)});dn.unshift({p:'ta',pts:run(P.ta,0,L(P.ta),-.42),fin:1});
 if(kPisteOpen(P.ka)){up.push({p:'x',pts:[[520,1258]]},{p:'ka',pts:run(P.ka,L(P.ka),0,.42)});dn.unshift({p:'ka',pts:run(P.ka,0,L(P.ka),-.42),fin:1},{p:'x',pts:[[520,1258]]})}
 if(kPisteOpen(P.ga)){up.push({p:'x',pts:[[630,1000],[600,1040]]},{p:'ga',pts:run(P.ga,L(P.ga),0,.4)});dn.unshift({p:'ga',pts:run(P.ga,0,L(P.ga),-.4),fin:1},{p:'x',pts:[[600,1040],[630,1000]]})}
 if(kPisteOpen(P.gs)){up.push({p:'gs',pts:run(P.gs,L(P.gs),0,.42)});dn.unshift({p:'gs',pts:run(P.gs,0,L(P.gs),-.42),fin:1})}
 return up.concat(dn,[{p:'x',pts:[[440,1556],[300,1560]]}])};

// ---------- Bauen ----------
KV.eis.items=function(){const V=KVOR,st=KG.stage,l=KG.l,b=KG.b,lf=KPK('lift')?.9:1,sf=KPK('schnee')?.85:1,bau=id=>KG.bau.find(x=>x.id===id);
 const I=[];const add=(tab,o)=>{o.tab=tab;I.push(o);return o};const S=V.stageInfo;
 for(const s of [2,3,4,5,6]){const rq=S[s].req.map(r=>({t:r[r.length-1],ok:kReq(r)}));add('aus',{id:'st'+s,ic:['','','🪑','⚫','🧊','🚡','🚠'][s],n:'Ausbau Stufe '+s+': '+S[s].n,d:S[s].d,c:Math.round(S[s].cost*lf),days:kBauDays(S[s].days),done:st>=s,bau:KG.bau.find(x=>x.k==='stage'&&x.st===s),lock:st<s-1?'erst Stufe '+(s-1):rq.some(r=>!r.ok)?'Voraussetzungen fehlen':'',rq})}
 const upB=L=>KG.bau.find(x=>x.k==='up'&&x.lift===L),A=l.am;
 add('lif',{id:'up6_am',ic:'🚡',n:'Almbahn: 6er-Sessel',d:'Talstation → Alm. Hier steigen alle Gäste ein – mehr Plätze je Sessel. Der Lift steht bis zum nächsten Morgen.',c:Math.round(16000*lf),days:kBauDays(1),done:A.typ==='s6',bau:upB('am')});
 add('lif',{id:'lg_am',ic:'💺',n:'Almbahn: mehr Sessel',d:'Zusätzliche Sessel am Seil – mehr Gäste pro Stunde.',c:Math.round(2500*lf),done:(A.lg||0)>=2,lock:upB('am')?'Umbau läuft':'',lv:(A.lg||0)+' / 2'});
 if(st>=2&&l.kb.on)add('lif',{id:'lg_kb',ic:'💺',n:'Kesselbahn: mehr Sessel',d:'Alm → Kessel. Zusätzliche Sessel am Seil.',c:Math.round(3000*lf),done:(l.kb.lg||0)>=2,lv:(l.kb.lg||0)+' / 2'});
 if(st>=3&&l.rl.on)add('lif',{id:'lg_rl',ic:'💺',n:'Rinnenlift: mehr Sessel',d:'Kessel → Rinnenkopf. Zusätzliche Sessel am Seil.',c:Math.round(3000*lf),done:(l.rl.lg||0)>=2,lv:(l.rl.lg||0)+' / 2'});
 if(st>=4&&l.gb.on)add('lif',{id:'lg_gb',ic:'🚠',n:'Gletscherbahn: mehr Kabinen',d:'Kessel → Gletscherstation. Zusätzliche Kabinen am Seil.',c:Math.round(4000*lf),done:(l.gb.lg||0)>=2,lv:(l.gb.lg||0)+' / 2'});
 if(st>=4&&l.gt.on)add('lif',{id:'lg_gt',ic:'🎿',n:'Gletscherlift: mehr Bügel',d:'Schlepplift am Gletscher. Mehr Bügel – kürzere Schlange.',c:Math.round(1500*lf),done:(l.gt.lg||0)>=2,lv:(l.gt.lg||0)+' / 2'});
 if(st>=5)add('lif',{id:'pb_lg',ic:'🚡',n:'Pendelbahn: größere Kabinen',d:'Gletscherstation ⇄ Gipfel. '+kEisPbCap()+' → '+KEI.pbCap[Math.min(2,(KG.pbLg||0)+1)]+' Plätze je Kabine.',c:Math.round(((KG.pbLg||0)?14000:9000)*lf),done:(KG.pbLg||0)>=2,lv:(KG.pbLg||0)+' / 2'});
 if(st>=6&&l.s3.on)add('lif',{id:'lg_s3',ic:'🚠',n:'3S-Gletscherexpress: mehr Kabinen',d:'Tal Ost → Gletscher Ost. Zusätzliche Kabinen.',c:Math.round(6000*lf),done:(l.s3.lg||0)>=2,lv:(l.s3.lg||0)+' / 2'});
 add('pis',{id:'raupe',ic:'🚜',n:'Pistenraupe mit Garage',d:'Präpariert nachts die offenen Pisten bis hinauf zum Gletscher. Rinnen und Skiroute bleiben unpräpariert.',c:5000,done:!!b.raupe});
 add('pis',{id:'can',ic:'❄️',n:'Schneekanonen',d:'Beschneien nachts die Talabfahrt, wenn der Schnee knapp wird.',c:Math.round(V.cannons.cost*sf),done:!!b.cannons,lock:st<2?'erst Stufe 2':'',up:'Strom je Nacht'});
 for(const [id,s0] of [['nr',3],['tr',4],['gpa',5]])add('pis',{id:'mast_'+id,ic:'📡',n:'Sprengmast '+KEI.sn[id],d:'Sprengt die Rinne automatisch um 7:15 – nach Neuschnee ist sie offen, bevor die Lifte fahren.',c:6000,done:!!(b.mast&&b.mast[id]),lock:st<s0?'erst Stufe '+s0:'',up:'25 €/Tag'});
 add('pis',{id:'zaun',ic:'🚧',n:'Schneezäune',d:'Lawinenverbauung am Hang über den Rinnen: die Warnstufe ist dauerhaft eine Stufe niedriger.',c:12000,days:kBauDays(2),done:!!b.zaun,bau:bau('zaun'),lock:st<3?'erst Stufe 3':''});
 add('gas',{id:'kiosk',ic:'🌭',n:'Kiosk an der Kassa',d:'Würstel, Tee und Kakao im Dorf.',c:1500,days:0,done:!!b.kiosk});
 add('gas',{id:'hut',ic:'🛖',n:'Almhütte',d:'Gemütliche Hütte an der Alm. Wer zur Talabfahrt fährt, kehrt mittags gern ein.',c:V.hut.cost,days:kBauDays(V.hut.days),done:!!b.hut,bau:bau('hut'),lock:st<2?'erst Stufe 2':''});
 add('gas',{id:'grest',ic:'🍽️',n:'Gletscherrestaurant mit Eisgrotte',d:'Besonderes Gebäude: Glaskubus auf dem Fels an der Gletscherstation, mit Sonnenterrasse und einer Eisgrotte im Gletscher. Gletscher-Preise – die Gäste zahlen gern mehr.',c:30000,days:kBauDays(4),done:!!b.grest,bau:bau('grest'),lock:st<4?'erst Stufe 4':'',up:'160 €/Tag'});
 add('anr',{id:'r2',ic:'🅿️',n:'Parkplatz · Reihe 2',d:'27 weitere Stellplätze an der Fahrgasse. Ist alles voll, drehen die Gäste um.',c:4000,done:!!KG.lots.r2});
 add('anr',{id:'r3',ic:'🅿️',n:'Parkplatz · Reihe 3',d:'19 Stellplätze östlich der Straße, mit eigener Zufahrt. Ab Stufe 6 gehen die Gäste von hier auch zum 3S.',c:6000,done:!!KG.lots.r3,lock:st<3?'erst Stufe 3':''});
 add('anr',{id:'paved',ic:'🛣️',n:'Parkplätze asphaltieren',d:'Kein Schotter mehr – sieht ordentlicher aus und bringt etwas Ansehen.',c:4000,done:!!KG.paved});
 add('anr',{id:'bus',ic:'🚌',n:'Skibus aus dem Nachbardorf',d:'Morgens bringen 3 Busse Gäste über die Kehren bis zum Wendeplatz an der Kassa, nachmittags holen sie sie wieder ab.',c:3000,done:!!b.bus,up:'150 €/Tag'});
 add('anr',{id:'bus2',ic:'🚌',n:'Skibus alle 30 Minuten',d:'5 Busse am Morgen statt 3 – deutlich mehr Gäste ohne Auto. Hilft, wenn die Parkplätze voll sind.',c:4000,done:!!b.bus2,lock:!b.bus?'erst Skibus':st<3?'erst Stufe 3':'',up:'+100 €/Tag'});
 add('per',{id:'lw',ic:'🔧',n:'Liftwart',d:'Repariert Störungen in kurzer Zeit. Ohne Liftwart kommt ein Techniker von außen (650 €, über 1 Stunde).',c:2500,done:!!b.lw,up:'130 €/Tag'});
 add('per',{id:'bw',ic:'⛑️',n:'Bergwacht mit Sprengtrupp',d:'Holt Verletzte mit Motorschlitten und Akja. Ab Stufe 3 sprengt ihr Sprengtrupp gesperrte Rinnen (eine pro Stunde), dazu der Hubschrauber für Sprengflüge.',c:KPK('bw')?0:4000,done:!!b.bw,up:KPK('bw')?'Verein · ohne Lohn':'140 €/Tag'});
 return I};
KV.eis.buy=function(id,I,pay){
 if(/^st[23456]$/.test(id)){const s=+id[2];pay();kBauStart({k:'stage',st:s,n:'Ausbau Stufe '+s+': '+KVOR.stageInfo[s].n,days:I.days,lift:{2:'kb',3:'rl',4:'gb',6:'s3'}[s]||null,id});return true}
 if(id==='up6_am'){pay();KG.bau.push({k:'up',id,lift:'am',typ:'s6',n:'Almbahn: 6er-Sessel',d0:KG.day,days:I.days});kLog('🚧','Umbau Almbahn auf 6er-Sessel – der Lift steht bis zum Morgen.');KG.l.am.on=0;if(KW.lift.am)for(const f of KW.lift.am.q.splice(0))kGoHome(f);return true}
 if(id==='pb_lg'){pay();KG.pbLg=(KG.pbLg||0)+1;kLog('🚡','Die Pendelbahn hat jetzt Kabinen für '+kEisPbCap()+' Gäste.');return true}
 if(id.startsWith('mast_')){const k=id.slice(5);pay();KG.b.mast=Object.assign({},KG.b.mast||{},{[k]:1});kLog('📡','Sprengmast '+KEI.sn[k]+' steht – ab morgen sprengt er um 7:15 automatisch.');kRebuild();return true}
 if(id==='zaun'){pay();kBauStart({k:'b',id:'zaun',n:'Schneezäune',days:I.days});return true}
 if(id==='grest'){pay();kBauStart({k:'b',id:'grest',n:'Gletscherrestaurant mit Eisgrotte',days:I.days});return true}
 if(id.startsWith('lg_')){const L=id.slice(3);pay();KG.l[L].lg=(KG.l[L].lg||0)+1;kLiftSetup(L);kLog('💺','Mehr '+(KG.l[L].typ==='schlepp'?'Bügel':KG.l[L].typ==='g8'||KG.l[L].typ==='s3'?'Kabinen':'Sessel')+' am '+kLC(L).n+'.');return true}
 if(id==='r2'||id==='r3'){pay();KG.lots[id]=1;kLog('🅿️','Parkplatz · Reihe '+id[1]+' ist offen.');return true}
 if(id==='bus2'){pay();KG.b.bus2=1;kLog('🚌','Ab morgen fährt der Skibus alle 30 Minuten.');return true}
 return false};
KV.eis.applied=function(b){if(b.k==='stage'&&b.st===4){KG.l.gt.on=1;kLiftSetup('gt')}if(b.k==='stage'&&b.st===5){KW.pb=null;kEisPbInit()}if(b.k==='stage'&&b.st===6)kLog('🎫','An der Talstation Ost gibt es jetzt eine eigene Kassa für den 3S-Gletscherexpress.')};
KV.eis.act=function(a,v){if(a==='eheli'){if(!kEisHeli(0))kToast(KG.b.bw?'Gerade nichts zu sprengen.':'Erst die Bergwacht anstellen (🔨 Bauen › Personal).');kUI();return true}
 if(a==='eauto'){KG.heliAuto=KG.heliAuto?0:1;kUI();return true}return false};

// ---------- Zeichnen: Landschaft ----------
function kEisPeak(c,x,y,w,b,L,D){c.fillStyle=L;c.beginPath();c.moveTo(x-w,b);c.lineTo(x,y);c.lineTo(x+w*.08,b);c.closePath();c.fill();c.fillStyle=D;c.beginPath();c.moveTo(x,y);c.lineTo(x+w,b);c.lineTo(x+w*.08,b);c.closePath();c.fill();
 c.fillStyle='rgba(255,255,255,.95)';c.beginPath();c.moveTo(x,y);c.lineTo(x-w*.32,y+(b-y)*.36);c.lineTo(x-w*.14,y+(b-y)*.3);c.lineTo(x-w*.05,y+(b-y)*.42);c.lineTo(x+w*.1,y+(b-y)*.28);c.lineTo(x+w*.26,y+(b-y)*.34);c.closePath();c.fill()}
function kEisPOff(p,m,sd){return p.d.map((q,i)=>{const a=p.d[Math.max(0,i-1)],b=p.d[Math.min(p.d.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [q[0]+(-dy/l)*(q[2]+m)*sd,q[1]+(dx/l)*(q[2]+m)*sd]})}
function kEisLn(c,P,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();P.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke()}
KV.eis.bg=function(c){const R=kRNG;
 const gs=c.createLinearGradient(0,-200,0,420);gs.addColorStop(0,'#3f8fd8');gs.addColorStop(1,'#d5ecfb');c.fillStyle=gs;c.fillRect(-600,-600,2400,1200);
 kEisPeak(c,110,190,240,520,'#e3e0dc','#b9b4ad');kEisPeak(c,1010,170,250,520,'#e3e0dc','#b9b4ad');kEisPeak(c,320,240,150,480,'#d8d4cd','#aaa49c');kEisPeak(c,820,230,160,480,'#d8d4cd','#aaa49c');
 // Eisspitz: steile Pyramide
 c.fillStyle='#d4cfc7';c.beginPath();c.moveTo(250,520);c.lineTo(548,120);c.lineTo(560,520);c.closePath();c.fill();c.fillStyle='#9e978d';c.beginPath();c.moveTo(548,120);c.lineTo(880,520);c.lineTo(560,520);c.closePath();c.fill();
 {const r=R(9);c.strokeStyle='rgba(80,70,60,.18)';c.lineWidth=1;for(let i=0;i<26;i++){const y=150+r()*330,t=(y-120)/400,x=548-(298*t)*r()*.9;c.beginPath();c.moveTo(x,y);c.lineTo(x-6+r()*4,y+20+r()*20);c.stroke()}
  c.fillStyle='rgba(255,255,255,.95)';for(let i=0;i<16;i++){const y=160+r()*300,t=(y-120)/400,x=548-(298*t)*(.1+r()*.8),l=6+r()*16;c.beginPath();c.moveTo(x,y);c.lineTo(x+l,y-1);c.lineTo(x+l-3,y+2.6);c.lineTo(x+2,y+3);c.closePath();c.fill()}}
 c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.moveTo(548,120);c.lineTo(532,170);c.lineTo(546,160);c.lineTo(556,182);c.lineTo(566,150);c.closePath();c.fill();
 kSnowGround(c,560,1620);
 // Gletscher
 c.fillStyle='#e9f5fd';c.beginPath();c.moveTo(KEG0,kEgL(KEG0));for(let x=KEG0;x<=KEG1;x+=10)c.lineTo(x,kEgT(x));for(let x=KEG1;x>=KEG0;x-=10)c.lineTo(x,kEgL(x));c.closePath();c.fill();
 const gg=c.createLinearGradient(0,330,0,640);gg.addColorStop(0,'rgba(170,215,240,0)');gg.addColorStop(1,'rgba(120,190,230,.35)');c.fillStyle=gg;c.fill();
 c.lineCap='round';for(const [x,y,l,a] of [[262,420,40,.25],[300,452,28,.2],[404,380,30,.1],[894,600,22,-.15],[836,388,26,-.3]]){c.save();c.translate(x,y);c.rotate(a);c.strokeStyle='#5fa3cf';c.lineWidth=4;c.beginPath();c.moveTo(-l/2,0);c.quadraticCurveTo(0,3,l/2,0);c.stroke();c.strokeStyle='#1d5f8a';c.lineWidth=1.6;c.stroke();
  for(let i=-1;i<=1;i+=2){c.fillStyle='#e8504a';c.fillRect(i*(l/2+5)-.6,-8,1.2,8)}c.strokeStyle='rgba(232,80,74,.8)';c.lineWidth=.6;c.beginPath();c.moveTo(-l/2-5,-6);c.lineTo(l/2+5,-6);c.stroke();c.restore()}
 // Eisbruch (Seracs) an der Unterkante – nie auf einer Piste
 for(let x=KEG0;x<KEG1;x+=14){const y=kEgL(x);if(kOnP(x+7,y,10)||kEsf(x+7)>.5)continue;c.fillStyle='#bfe2f5';c.beginPath();c.moveTo(x,y-4);c.lineTo(x+7,y-12);c.lineTo(x+14,y-3);c.lineTo(x+12,y+8);c.lineTo(x+2,y+8);c.closePath();c.fill();c.fillStyle='#7cc4e4';c.fillRect(x+7,y-4,5,10)}
 // Felsband (Facetten), läuft am Schneesattel flach aus; Lücke für den Lawinenstrich
 const gap=x=>x>118&&x<206,r2=R(23),LT=['#e6dfd3','#dad1c2','#e0d8ca'],DK=['#c2b7a4','#b0a490','#b9ad99'];
 for(let x=-160;x<1160;x+=22){const w=22,t0=kEtop(x)+(kElow(x)-kEtop(x))*kEsf(x),t1=kEtop(x+w)+(kElow(x+w)-kEtop(x+w))*kEsf(x+w),b0=kElow(x),b1=kElow(x+w),n=3+Math.floor(r2()*2);if(b0-t0<4&&b1-t1<4)continue;
  for(let k=0;k<n;k++){const ya=t0+(b0-t0)*k/n,yb=t0+(b0-t0)*(k+1)/n,ya1=t1+(b1-t1)*k/n,yb1=t1+(b1-t1)*(k+1)/n,mx=x+w*(.3+r2()*.4),my=(ya+ya1)/2-2-r2()*5,mb=(yb+yb1)/2+r2()*3;if(gap(x+w/2)||gap(x+3)||gap(x+w-3))continue;
   c.fillStyle=LT[Math.floor(r2()*3)];c.beginPath();c.moveTo(x-.5,ya);c.lineTo(mx,my);c.lineTo(mx,mb);c.lineTo(x-.5,yb+.5);c.closePath();c.fill();c.fillStyle=DK[Math.floor(r2()*3)];c.beginPath();c.moveTo(mx,my);c.lineTo(x+w+.5,ya1);c.lineTo(x+w+.5,yb1+.5);c.lineTo(mx,mb);c.closePath();c.fill();
   if(k<n-1&&r2()<.4){c.fillStyle='rgba(255,255,255,.96)';c.beginPath();c.moveTo(x+1,yb);c.lineTo(mx,mb-2);c.lineTo(x+w-1,yb1);c.lineTo(mx,mb+2.4);c.closePath();c.fill()}}
  if(!gap(x+w/2)){c.fillStyle='rgba(255,255,255,.95)';c.beginPath();c.moveTo(x-1,t0+1);c.lineTo(x+w*.5,(t0+t1)/2-3);c.lineTo(x+w+1,t1+1);c.lineTo(x+w*.5,(t0+t1)/2+3);c.closePath();c.fill()}}
 // Rinnen als Couloirs: Schneefüllung, Schattenwand links, Sonnenwand rechts (nur im Felsband)
 c.save();c.beginPath();for(let x=-160;x<=1160;x+=8)c.lineTo(x,kEtop(x)+3);for(let x=1160;x>=-160;x-=8)c.lineTo(x,kElow(x)+6);c.closePath();c.clip();
 for(const [p,m] of [[KW.pmap.tr,6],[KW.pmap.nr,6]]){const Lf=kEisPOff(p,m,1),Rt=kEisPOff(p,m,-1),Lw=kEisPOff(p,m+5,1),Rw=kEisPOff(p,m+4,-1);kEisLn(c,Lw,12,'#a99d89');kEisLn(c,Rw,10,'#d3c9b8');
  const g=c.createLinearGradient(0,600,0,840);g.addColorStop(0,'#fbfdff');g.addColorStop(1,'#eef4fa');c.fillStyle=g;c.beginPath();Lf.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));for(let i=Rt.length-1;i>=0;i--)c.lineTo(Rt[i][0],Rt[i][1]);c.closePath();c.fill();
  kEisLn(c,kEisPOff(p,m-3,1),5,'rgba(150,175,205,.28)');kEisLn(c,Lf,1.2,'rgba(90,78,64,.55)');kEisLn(c,Rt,1,'rgba(120,108,92,.45)');
  const r4=R(p.d.length);for(let i=6;i<p.d.length-6;i+=7)for(const [P,sd,col] of [[Lw,1,'#958873'],[Rw,-1,'#c4b8a4']]){const q=P[i];if(r4()<.55){c.fillStyle=col;c.beginPath();c.moveTo(q[0],q[1]-6);c.lineTo(q[0]+sd*-5,q[1]);c.lineTo(q[0],q[1]+6);c.closePath();c.fill()}}}
 c.restore();
 // Schuttkegel unter dem Felsband
 c.fillStyle='rgba(214,204,188,.55)';for(const x of [40,446,900,1020]){const y=kErL(x)+8;c.beginPath();c.moveTo(x-10,y-4);c.lineTo(x+40,y+42);c.lineTo(x-56,y+42);c.closePath();c.fill()}
 // Lawinenstrich mit Auffangdamm
 c.fillStyle='#f2f7fc';c.beginPath();c.moveTo(130,592);c.quadraticCurveTo(170,700,150,800);c.quadraticCurveTo(140,900,104,980);c.lineTo(226,980);c.quadraticCurveTo(196,900,200,800);c.quadraticCurveTo(206,690,196,592);c.closePath();c.fill();
 c.strokeStyle='#8f8576';c.lineWidth=2.4;c.beginPath();c.moveTo(130,592);c.quadraticCurveTo(170,700,150,800);c.moveTo(196,592);c.quadraticCurveTo(206,690,200,800);c.stroke();
 {const r3=R(41);for(let i=0;i<34;i++){const x=110+r3()*110,y=950+r3()*60;c.fillStyle='rgba(180,200,225,.5)';c.beginPath();c.ellipse(x+2,y+2,6+r3()*5,3,0,0,7);c.fill();c.fillStyle='#fbfdff';c.beginPath();c.ellipse(x,y,6+r3()*5,3,0,0,7);c.fill()}}
 c.fillStyle='#b1a593';c.beginPath();c.moveTo(70,1040);c.quadraticCurveTo(162,990,256,1040);c.lineTo(250,1052);c.quadraticCurveTo(162,1006,76,1052);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.moveTo(78,1038);c.quadraticCurveTo(162,992,248,1038);c.lineTo(244,1032);c.quadraticCurveTo(162,990,82,1032);c.closePath();c.fill();
 kSign(c,162,1070,'LAWINENDAMM','#5b6578','#fff',5);
 // Schneezäune (Lawinenverbauung)
 if(KG.b.zaun){c.strokeStyle='#6e4426';c.lineWidth=1.2;for(const [x0,y0,n] of [[30,592,5],[70,562,4],[892,640,4],[950,610,4],[620,232,3],[300,640,2]])for(let i=0;i<n;i++){const x=x0+i*18,y=y0+(i%2)*3;c.beginPath();c.moveTo(x,y);c.lineTo(x+14,y-2);for(let k=0;k<5;k++){c.moveTo(x+k*3.4,y-k*.4);c.lineTo(x+k*3.4,y-k*.4-6)}c.stroke()}kSign(c,100,542,'SCHNEEZÄUNE','#6e4426','#fff',4.5)}
 // Tal: Straße mit Kehren, Wendeplatz, Fahrgassen
 c.fillStyle='#f4f8fc';c.fillRect(-600,1640,2400,1000);
 c.lineCap='round';c.lineJoin='round';c.strokeStyle='#c3c9d3';c.lineWidth=40;c.beginPath();KER.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();
 const W=KEI.WP;c.fillStyle='#c3c9d3';c.beginPath();c.arc(W[0],W[1],34,0,7);c.fill();
 if(KG.lots.r3){c.fillStyle='#c3c9d3';c.fillRect(901,1876,25,96);c.fillRect(548,1877,378,26)}c.fillRect(-140,1852,560,26);
 c.strokeStyle='#4b5160';c.lineWidth=32;c.beginPath();KER.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.fillStyle='#4b5160';c.beginPath();c.arc(W[0],W[1],30,0,7);c.fill();
 c.fillStyle='#5a6170';c.fillRect(-140,1856,556,18);if(KG.lots.r3){c.fillRect(552,1881,370,18);c.fillRect(904,1880,18,90)}
 c.strokeStyle='#fff';c.lineWidth=1.4;c.setLineDash([12,10]);c.beginPath();KER.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();
 c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1;c.setLineDash([6,6]);c.beginPath();c.moveTo(-130,KEI.F12);c.lineTo(392,KEI.F12);if(KG.lots.r3){c.moveTo(560,KEI.F3);c.lineTo(912,KEI.F3);c.moveTo(913,1890);c.lineTo(913,1960)}c.stroke();c.setLineDash([]);
 c.fillStyle='#e8eef5';c.beginPath();c.arc(W[0],W[1],12,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(W[0],W[1],9,0,7);c.fill();
 // Haltestelle am Wendeplatz
 const hx=W[0]+30,hy=W[1]-26;c.fillStyle='#2e9e5b';c.fillRect(hx,hy-14,1.6,14);c.beginPath();c.roundRect(hx-6,hy-22,14,9,2);c.fill();c.fillStyle='#fff';c.font='700 6px Fredoka,sans-serif';c.textAlign='center';c.fillText('H',hx+1,hy-15);
 // Gipfelkreuz
 c.strokeStyle='#7b5236';c.lineWidth=2.2;c.beginPath();c.moveTo(548,128);c.lineTo(548,100);c.moveTo(540,108);c.lineTo(556,108);c.stroke()};
KV.eis.staticExtra=function(c){kSign(c,1060,2196,'EISSPITZ','#f2c53b','#2b3040',7);kSign(c,KEI.WP[0]+31,KEI.WP[1]-56,'🚌 Eisspitz · Kassa','#2e9e5b','#fff',5)};
KV.eis.drawPaths=function(c){const G1=KEI.G1,G3=KEI.G3;
 kPathLine(c,[[-120,G1],[360,G1],[386,1720],[404,1652],[420,1612]],8);kPathLine(c,[[420,1612],[556,1616]],8);kPathLine(c,[[452,1622],[470,1668]],6);
 if(KG.lots.r3){kPathLine(c,[[452,1620],[540,1660],[562,1720],[566,G3]],7);kPathLine(c,[[566,G3],[900,G3]],7)}
 if(KG.stage>=6||KG.bau.find(b=>b.k==='stage'&&b.st===6)){kPathLine(c,[[452,1622],[560,1644],[800,1652],[940,1660],[1060,1676]],7);if(KG.lots.r3)kPathLine(c,[[900,G3],[968,1724],[1054,1686]],7)}
 if(KG.b.hut){c.strokeStyle='#e9dcc4';c.lineWidth=6;c.lineCap='round';c.beginPath();KVOR.hut.in.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
 if(KG.b.grest){kEisLn(c,[[430,588],[376,566],[330,556]],6,'#cfe4f2');kEisLn(c,[[430,588],[376,566],[330,556]],3,'#e6f3fb');kEisLn(c,[[352,478],[372,520],[376,562]],4,'#cfe4f2')}};
KV.eis.lamps=function(){const o=[];for(let x=-100;x<=340;x+=88)o.push([x,KEI.G1-6]);for(let x=470;x<=540;x+=70)o.push([x,1624]);o.push([392,1700]);if(KG.lots.r3)for(let x=600;x<=880;x+=90)o.push([x,KEI.G3-6]);if(KG.stage>=6)for(const x of [640,800,960])o.push([x,1640]);return o};
KV.eis.decor=function(D){const mix=r=>r()<.5?'l':'p';
 // Dorf mit Kirche
 for(const [x,y,w,h,k] of [[-70,1650,50,26,1],[10,1712,44,24,3],[-100,1742,48,24,2],[60,1642,40,22,4],[110,1752,44,22,1],[660,1748,46,24,2],[740,1770,44,24,4],[724,1600,44,22,3]])D.house(x,y,w,h,k);
 D.church(190,1700);
 D.scatter(-120,1090,1120,1540,1500,51,(x,y)=>y<1180?.18:.6,mix);D.scatter(-120,960,1120,1100,260,52,()=>.16,'p');
 for(const [x,y] of [[200,1300],[640,1310],[880,1200],[760,1420],[100,1420],[940,1470],[600,1420]])D.grove(x,y,46,26,x+y,mix);
 for(const [x,y] of [[-110,1960],[-80,2040],[20,2010],[110,1990],[210,2050],[300,2000],[620,2040],[700,2100],[980,2100],[1060,2010],[1080,1920],[1000,1800],[-120,1700],[1100,1760]])D.tree(x,y,.9,'p')};
KV.eis.blocks=function(B){
 B.box(-200,1780,440,1950);B.box(540,1800,940,1910);B.box(890,1870,940,1990); // Parkplätze, Fahrgassen, Zufahrt
 B.line(KER,24);B.box(430,1650,530,1740);B.box(360,1560,480,1640);B.box(552,1586,660,1668); // Straße, Wendeplatz, Kassa, Anstellbereich
 B.box(266,1546,334,1602);B.box(150,1570,250,1712);B.box(780,1690,960,1760);B.box(890,1590,1000,1680);B.box(1040,1620,1120,1700); // Garage, Bergwacht, 3S, Kassa Ost
 B.line([[-120,KEI.G1],[360,KEI.G1],[386,1720],[404,1652],[420,1612]],8);B.line([[452,1620],[540,1660],[562,1720],[566,KEI.G3]],8);B.line([[452,1622],[560,1644],[800,1652],[940,1660],[1060,1676]],8);B.line([[900,KEI.G3],[968,1724],[1054,1686]],8);
 B.box(80,560,226,1062);B.box(232,1100,336,1176);B.box(336,1200,424,1266);B.line(KVOR.hut.in,8); // Lawinenstrich, Almhütte, Anstellen Kesselbahn
 B.box(452,982,524,1046);B.box(806,976,890,1044);B.box(560,1080,640,1130);B.box(760,700,880,830); // Anstellen Kessel, Baustelle
 B.box(214,470,352,552)};

// ---------- Zeichnen: Gebäude, Stationen, Bahnen ----------
function kEisPlate(c,x,y,t,dark){c.fillStyle=dark?'#2b3040':'#fff';c.beginPath();c.roundRect(x-27,y-31,54,12,2);c.fill();c.fillStyle=dark?'#fff':'#2b3a55';c.font='700 5.4px Fredoka,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(t,x,y-24.8,50);c.textBaseline='alphabetic'}
function kEisPpl(c,x,y,col,t){personN(c,{x,y,st:'walk',col:col||KCOL[Math.floor(Math.abs(x*7+y*3))%KCOL.length],sv:0},t)}
function kEisKassa3S(c,x,y){const nt=kBright()<.5;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+3,y+3,24,4,0,0,7);c.fill();c.fillStyle='#e9e1d2';c.fillRect(x-20,y-20,40,22);c.fillStyle='#d6cbb7';c.fillRect(x+8,y-20,12,22);
 for(const q of [-16,-4]){c.fillStyle=nt?'#ffd98a':'#a8dcf5';c.fillRect(x+q,y-13,9,8);kWin(x+q,y-13,9,8);c.fillStyle='#8f5a34';c.fillRect(x+q-1,y-5,11,1.4)}
 c.fillStyle='#2b3040';c.beginPath();c.moveTo(x-24,y-19);c.lineTo(x-17,y-30);c.lineTo(x+17,y-30);c.lineTo(x+24,y-19);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x-20,y-22);c.lineTo(x-15,y-28);c.lineTo(x+15,y-28);c.lineTo(x+20,y-22);c.closePath();c.fill();kSign(c,x,y-37,'🎫 KASSA 3S','#2b3040','#fff',5.4)}
function kEisGipfel(c,t){const x=548,y=262;c.fillStyle='#8d8a86';c.beginPath();c.moveTo(x-46,y+8);c.lineTo(x-30,y-6);c.lineTo(x+40,y-8);c.lineTo(x+56,y+8);c.closePath();c.fill();
 c.fillStyle='#e9e6e0';c.fillRect(x-30,y-30,52,28);c.fillStyle='#cfcac1';c.fillRect(x+8,y-30,14,28);for(let i=0;i<4;i++){c.fillStyle='#a8dcf5';c.fillRect(x-26+i*9,y-24,6,9);kWin(x-26+i*9,y-24,6,9)}
 c.fillStyle='#e8504a';c.fillRect(x-32,y-34,56,5);c.fillStyle='#8d8f98';c.fillRect(x+22,y-14,34,3);c.strokeStyle='#5d667a';c.lineWidth=.8;for(let i=0;i<7;i++){c.beginPath();c.moveTo(x+24+i*5,y-14);c.lineTo(x+24+i*5,y-19);c.stroke()}c.beginPath();c.moveTo(x+22,y-19);c.lineTo(x+56,y-19);c.stroke();
 // Windsack
 const w=Math.min(1,(KG.wind||0)/60),fl=Math.sin(t*6)*1.5*w;c.fillStyle='#5d667a';c.fillRect(x-38,y-36,1.2,30);c.fillStyle='#f2701f';c.beginPath();c.moveTo(x-37,y-36);c.lineTo(x-37+12*(.3+.7*w),y-35+fl);c.lineTo(x-37+12*(.3+.7*w),y-32+fl);c.lineTo(x-37,y-31);c.closePath();c.fill();c.fillStyle='#fff';c.fillRect(x-33,y-35.5+fl*.5,2,4.4);
 kSign(c,x-4,y-44,'GIPFEL 3.402 m','#2b3040','#fff',5.5)}
function kEisRestDraw(c,t){const x=KEI.REST[0],y=KEI.REST[1],nt=kBright()<.55;c.fillStyle='#9c958c';c.beginPath();c.moveTo(x-70,y+10);c.lineTo(x-58,y-8);c.lineTo(x+60,y-10);c.lineTo(x+72,y+10);c.closePath();c.fill();
 c.fillStyle='#d9dee6';c.fillRect(x-56,y-16,112,8);c.fillStyle='#5b6578';c.fillRect(x-50,y-62,82,46);
 const g=c.createLinearGradient(0,y-62,0,y-16);g.addColorStop(0,nt?'#ffe2a0':'#bfe6fa');g.addColorStop(1,nt?'#f2b85a':'#7cc4e4');c.fillStyle=g;c.fillRect(x-47,y-59,76,40);
 c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=.8;for(let i=1;i<8;i++){c.beginPath();c.moveTo(x-47+i*9.5,y-59);c.lineTo(x-47+i*9.5,y-19);c.stroke()}c.beginPath();c.moveTo(x-47,y-39);c.lineTo(x+29,y-39);c.stroke();
 c.fillStyle='rgba(255,233,168,.9)';for(let i=0;i<6;i++){c.beginPath();c.arc(x-40+i*12,y-27,1.6,0,7);c.fill()}
 const n=KW.folks.filter(f=>f.st==='rest').length;for(let i=0;i<Math.min(7,2+Math.floor(n/3));i++)kEisPpl(c,x-36+i*10,y-21,null,t);
 c.fillStyle='#e9e6e0';c.fillRect(x+32,y-52,22,36);c.fillStyle='#fff';c.fillRect(x-54,y-66,112,6);c.fillStyle='#f2f6fa';c.fillRect(x-50,y-72,104,6);hSmoke(c,x+44,y-72,t,1);
 for(const dx of [-30,0,30]){c.fillStyle='#8f5a34';c.fillRect(x+dx-.5,y-8,1,8);c.fillStyle=dx?'#e8504a':'#f2c53b';c.beginPath();c.arc(x+dx,y-8,6,Math.PI,0);c.fill()}
 kSign(c,x,y-82,'GLETSCHERRESTAURANT','#2f6f78','#fff',6)}
function kEisGrotte(c){const x=352,y=468;c.fillStyle='#7cc4e4';c.beginPath();c.ellipse(x,y,22,16,0,Math.PI,0);c.fill();c.fillStyle='#3a8fc0';c.beginPath();c.ellipse(x,y,15,11,0,Math.PI,0);c.fill();c.fillStyle='#1d5f8a';c.beginPath();c.ellipse(x,y,9,7,0,Math.PI,0);c.fill();
 c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.ellipse(x-10,y-12,6,2,-.4,0,7);c.fill();kSign(c,x,y-24,'❄ EISGROTTE','#1d5f8a','#fff',5)}
function kEisGazex(c,x,y){c.fillStyle='rgba(60,70,90,.25)';c.beginPath();c.ellipse(x+3,y+2,8,2.4,0,0,7);c.fill();c.fillStyle='#6b7385';c.fillRect(x-1.6,y-22,3.2,22);c.fillStyle='#e8504a';c.save();c.translate(x,y-22);c.rotate(.5);c.fillRect(-2.4,-2,13,4.4);c.restore();c.fillStyle='#f2c53b';c.fillRect(x-5,y-6,10,6);c.fillStyle='#2b3040';c.fillRect(x-5,y-6,10,1.4)}
function kEisHeliDraw(c,x,y,a,t,fly){c.save();c.translate(x,y);if(fly){c.fillStyle='rgba(40,60,90,.18)';c.beginPath();c.ellipse(8,26,12,4,0,0,7);c.fill()}c.scale(Math.cos(a)<0?-1:1,1);
 c.fillStyle='#e8504a';c.beginPath();c.ellipse(0,0,10,5,0,0,7);c.fill();c.fillRect(6,-2,14,3);c.fillStyle='#bfe6fa';c.beginPath();c.ellipse(-4,-1,4,3,0,0,7);c.fill();c.fillStyle='#2b3040';c.fillRect(-6,5,12,1.2);
 const rw=fly?16*Math.abs(Math.cos(t*30)):16;c.strokeStyle='#2b3040';c.lineWidth=1;c.beginPath();c.moveTo(-rw,-7);c.lineTo(rw,-7);c.stroke();c.fillRect(-.6,-7,1.2,3);c.restore()}
function kEisBwDraw(c,t){const x=KEI.BW[0],y=KEI.BW[1];c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+4,y+3,28,5,0,0,7);c.fill();c.fillStyle='#e8504a';c.fillRect(x-22,y-24,44,26);c.fillStyle='#fff';c.fillRect(x-22,y-28,44,5);c.fillRect(x-4,y-18,8,3);c.fillRect(x-1.5,y-20.5,3,8);
 c.fillStyle='#a8dcf5';c.fillRect(x+8,y-16,8,7);kWin(x+8,y-16,8,7);kSign(c,x,y-36,'BERGWACHT','#e8504a','#fff',5);
 const [hx,hy]=KEI.HELI;c.fillStyle='#9aa3b2';c.beginPath();c.ellipse(hx,hy,24,9,0,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.4;c.beginPath();c.ellipse(hx,hy,18,6.6,0,0,7);c.stroke();c.fillStyle='#fff';c.font='700 8px sans-serif';c.textAlign='center';c.fillText('H',hx,hy+3);
 if(!KW.heli)kEisHeliDraw(c,hx,hy-6,0,t,0);if(!KW.res)kSled(c,{x:x-34,y:y+6,a:0,st:'park'},t)}
// Stationen
KV.eis.drawB=function(add,t){const V=KVOR,K=V.kassa,l=KG.l;add(K.y,c=>kKassaDraw(c,K.x,K.y));if(KG.b.kiosk)add(K.y+8,c=>kKioskDraw(c,K.x+38,K.y+8,t));
 if(KG.stage>=6)add(KEI.KO[1],c=>kEisKassa3S(c,KEI.KO[0],KEI.KO[1]));
 const sb=KG.bau.find(b=>b.k==='stage');
 for(const L of V.lifts){const s=l[L.id],bau=KG.bau.find(b=>b.lift===L.id&&b.k!=='up'),up=KG.bau.find(b=>b.k==='up'&&b.lift===L.id),lo=kLowerOf(L.id);
  if(bau){add(L.t[1]+20,c=>kSite(c,L.t[0],L.t[1]+10,50,t));if(!lo)add(L.b[1]+20,c=>kSite(c,L.b[0]+(L.id==='gb'?-40:0),L.b[1]+30,50,t));continue}
  if(!s.on&&!up)continue;const co=KLT[s.typ].co;
  if(L.id==='gt'){add(L.b[1]+12,c=>{stationN(c,L.b[0]+14,L.b[1],t);kSign(c,L.b[0]+14,L.b[1]-24,'GLETSCHERLIFT','#fff','#2b3a55',5);kBrkSign(c,L,t)});add(L.t[1]+12,c=>stationN(c,L.t[0]+14,L.t[1],t));continue}
  const big3=L.id==='s3',lab={am:['TALSTATION','ALM'],kb:['','KESSEL'],rl:['RINNENLIFT','RINNENKOPF'],gb:['GLETSCHERBAHN','GLETSCHERSTATION'],s3:['3S · GLETSCHEREXPRESS','3S · GLETSCHER OST']}[L.id];
  if(!lo)add(L.b[1]+22,c=>{liftStation(c,L.b[0],L.b[1],big3?14:co,true);kEisPlate(c,L.b[0],L.b[1],lab[0],big3);kBrkSign(c,L,t);if(up)kSign(c,L.b[0],L.b[1]-48,'🚧 UMBAU','#f2701f','#fff',6)});
  else if(up)add(L.b[1]+30,c=>kSign(c,L.b[0],L.b[1]-56,'🚧 UMBAU','#f2701f','#fff',6));
  const nx=L.nx&&l[L.nx]&&l[L.nx].on;add(L.t[1]+18,c=>{liftStation(c,L.t[0],L.t[1],big3?14:nx?KLT[l[L.nx].typ].co:co,false);kSign(c,L.t[0],L.t[1]-36,lab[1],big3?'#2b3040':'#fff',big3?'#fff':'#2b3a55',5.5);if(nx)kBrkSign(c,kLC(L.nx),t)})}
 // Pendelbahn
 if(KG.stage>=5){const {b}=KEI.PB;add(b[1]+22,c=>{liftStation(c,b[0],b[1],10,true);kEisPlate(c,b[0],b[1],'PENDELBAHN · GIPFEL');if(kEisWS('pb'))kSign(c,b[0],b[1]-46,'💨 WIND – STEHT','#5b6578','#fff',5.5)});
  const m=[b[0]+(KEI.PB.t[0]-b[0])*.5,b[1]+(KEI.PB.t[1]-b[1])*.5+14];add(m[1],c=>{kSeeBigPylon(c,m[0],m[1],17);c.fillStyle='#3a3f58';c.fillRect(m[0]-23,m[1]-50,46,4)});
  add(1e5,c=>{if(!kInV(500,400,320))return;kEisPbRope(c);for(const i of [0,1]){const p=kEisPbPos(i),C=KW.pb&&KW.pb.cab[i];if(p.ph.u<.05||p.ph.u>.95)continue;kEisPbCab(c,p.x,p.y,C?C.r.length:0)}})}
 if(KG.stage>=5||sb&&sb.st===5)add(270,c=>kEisGipfel(c,t));
 // Almhütte
 const H0=V.hut;if(KG.b.hut)add(H0.y+2,c=>{chalet(c,H0.x,H0.y,48,26,2);for(const [wx,wy] of chWin(H0.x,H0.y,48,26))kWin(wx,wy,6,6);kSign(c,H0.x,H0.y-46,'ALMHÜTTE','#8f5a34','#fff',5.5);
  c.fillStyle='#c9a77a';c.fillRect(H0.x-28,H0.y+4,56,12);c.strokeStyle='rgba(120,90,60,.4)';c.lineWidth=.5;for(let x=H0.x-28;x<H0.x+28;x+=5){c.beginPath();c.moveTo(x,H0.y+4);c.lineTo(x,H0.y+16);c.stroke()}
  for(const x of [H0.x-18,H0.x-2,H0.x+14]){c.fillStyle='#7b5236';c.fillRect(x-.4,H0.y,.8,10);c.fillStyle='#e8504a';c.beginPath();c.arc(x,H0.y,4.4,Math.PI,0);c.fill();c.fillStyle='#fff';c.fillRect(x-4.4,H0.y-.6,8.8,.8)}hSmoke(c,H0.x+12,H0.y-34,t,1)});
 else if(KG.bau.find(b=>b.id==='hut'))add(H0.y,c=>kSite(c,H0.x,H0.y,60,t));
 // Gletscherrestaurant + Eisgrotte
 if(KG.b.grest){add(KEI.REST[1],c=>kEisRestDraw(c,t));add(470,c=>kEisGrotte(c))}else if(KG.bau.find(b=>b.id==='grest'))add(KEI.REST[1],c=>kSite(c,KEI.REST[0],KEI.REST[1],90,t));
 else if(KG.stage>=4)add(KEI.REST[1],c=>{c.strokeStyle='rgba(120,150,190,.6)';c.lineWidth=1;c.setLineDash([5,4]);c.strokeRect(220,478,126,62);c.setLineDash([]);kSign(c,283,508,'🍽️ Gletscherrestaurant · im Baumenü','rgba(43,58,85,.65)','#fff',5.5)});
 if(KG.bau.find(b=>b.id==='zaun'))add(600,c=>kSite(c,90,600,50,t));
 // Garage, Bergwacht
 if(KG.b.raupe)add(V.garage.y+8,c=>kGarage(c,V.garage.x,V.garage.y,t));if(KG.b.bw)add(KEI.BW[1],c=>kEisBwDraw(c,t));
 // Sprengmasten und Sprengtrupp
 for(const id of KEI.shut)if(KG.b.mast&&KG.b.mast[id]){const [x,y]=KEI.mast[id];add(y,c=>kEisGazex(c,x,y))}
 if(KW.trupp&&KW.trupp.q.length){const id=KW.trupp.q[0],[x,y]=KEI.mast[id];add(y+6,c=>{kEisPpl(c,x-8,y+4,'#f2701f',t);kEisPpl(c,x+6,y+6,'#f2701f',t);c.fillStyle='#e8504a';c.fillRect(x+12,y-14,1,14);c.fillRect(x+13,y-14,6,4)})}
 // Ausbau-Baustellen
 if(sb){const S={2:[[560,1110],[650,1000]],3:[[820,760]],4:[[490,800],[610,520]],5:[[500,420],[600,300]],6:[[930,1120],[930,700]]}[sb.st]||[];for(const [x,y] of S)add(y,c=>kSite(c,x,y,56,t))}};
// Pendelbahn: Seile mit Durchhang, Kabinen
function kEisPbRope(c){const {b,t}=KEI.PB,dx=t[0]-b[0],dy=t[1]-b[1],l=Math.hypot(dx,dy),px=-dy/l,py=dx/l,co=9;const P=(u,s)=>[b[0]+dx*u+px*co*s,b[1]+dy*u+py*co*s+Math.sin(u*Math.PI)*10];
 c.strokeStyle='#161a28';c.lineWidth=1.3;for(const s of [-1,1]){c.beginPath();for(let u=0;u<=1.001;u+=.05){const [x,y]=P(u,s);u?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 c.lineWidth=.6;c.strokeStyle='rgba(22,26,40,.6)';for(const s of [-1,1]){c.beginPath();for(let u=0;u<=1.001;u+=.05){const [x,y]=P(u,s*.55);u?c.lineTo(x,y+3):c.moveTo(x,y+3)}c.stroke()}}
function kEisPbCab(c,x,y,n){c.save();c.translate(x,y);c.fillStyle='#2a2e44';c.fillRect(-1.5,-2,3,9);c.fillRect(-8,-3,16,3);c.fillStyle='#e8504a';c.beginPath();c.roundRect(-14,7,28,22,4);c.fill();c.fillStyle='#bfe6fa';c.beginPath();c.roundRect(-11.5,10,23,9,2);c.fill();
 const k=Math.min(6,Math.ceil(n/12));for(let i=0;i<k;i++){c.fillStyle='#ffd9b5';c.beginPath();c.arc(-8.5+i*3.4,14.4,1.3,0,7);c.fill()}c.fillStyle='#fff';c.fillRect(-14,22,28,2);c.fillStyle='rgba(0,0,0,.18)';c.fillRect(-14,26,28,3);c.restore()}
// 3S-Kabine
function kEis3SCab(c,n){c.fillStyle='#2a2e44';c.fillRect(-1.2,-2,2.4,7);c.fillRect(-6,-3,12,2.4);c.fillStyle='#2b3040';c.beginPath();c.roundRect(-10,5,20,15,3);c.fill();c.fillStyle='#bfe6fa';c.beginPath();c.roundRect(-8.5,7,17,6,1.6);c.fill();c.fillStyle='#f2c53b';c.fillRect(-10,16,20,1.4);
 for(let i=0;i<Math.min(5,Math.ceil(n/6));i++){c.fillStyle='#ffd9b5';c.beginPath();c.arc(-6+i*3,10,1.2,0,7);c.fill()}c.fillStyle='rgba(0,0,0,.18)';c.fillRect(-10,18,20,2.5)}
KV.eis.liftLook=function(c,o,t){const id=o.L.id,s=KG.l[id],T0=o.T,{bx,by,tx,ty,len,ux,uy}=o,co=T0.co,PY=kAPy(o.L,len,T0.drag);
 if(T0.drag){c.strokeStyle='#2a2e44';c.lineWidth=.8;c.beginPath();c.moveTo(bx,by-14);c.lineTo(tx,ty-14);c.stroke();
  for(const u of PY){const px=bx+(tx-bx)*u,py=by+(ty-by)*u;if(!kInV(px,py))continue;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(px+3,py+2,5,1.6,0,0,7);c.fill();c.fillStyle='#6a6890';c.fillRect(px-1,py-17,2,18);c.fillStyle='#3a3f58';c.fillRect(px-4,py-17,8,1.6)}
  for(const ch of o.ch){if(ch.u>=1)continue;const [x,y0]=kLiftPos(o,ch.u),y=y0-14;if(!kInV(x,y,20))continue;c.strokeStyle='#2a2e44';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+9);c.stroke();c.strokeStyle='#3a3f58';c.lineWidth=1.1;c.beginPath();c.moveTo(x-3.5,y+9.5);c.lineTo(x+3.5,y+9.5);c.stroke()}return true}
 const px=-uy,py=ux;c.strokeStyle='#161a28';c.lineWidth=id==='s3'?1.4:1.2;for(const sd of [-1,1]){c.beginPath();c.moveTo(bx+px*co*sd,by+py*co*sd);c.lineTo(tx+px*co*sd,ty+py*co*sd);c.stroke()}
 if(id==='s3'){c.lineWidth=.7;c.strokeStyle='rgba(22,26,40,.7)';for(const sd of [-1,1]){c.beginPath();c.moveTo(bx+px*(co-4)*sd,by+py*(co-4)*sd+2);c.lineTo(tx+px*(co-4)*sd,ty+py*(co-4)*sd+2);c.stroke()}}
 for(const u of PY){const x=bx+(tx-bx)*u,y=by+(ty-by)*u;if(!kInV(x,y))continue;if(id==='s3')kSeeBigPylon(c,x,y,co+6);else pylonN(c,x,y,co+3)}
 const cap=T0.cap;for(const ch of o.ch){if(ch.u<.03||ch.u>1.97||Math.abs(ch.u-1)<.03)continue;const [x,y]=kLiftPos(o,ch.u);if(!kInV(x,y,30))continue;
  c.save();c.translate(x,y);c.rotate(Math.sin(ch.u*40+t*.8)*(id==='s3'?.015:.04));if(id==='s3'){c.scale(1.35,1.35);kEis3SCab(c,ch.r.length)}else if(s.typ==='g8')kACabin(c,{r:ch.r.map(f=>({col:f.col}))});else gondola(c,{r:ch.r.map(f=>({col:f.col}))},cap);c.restore()}
 return true};
// Sperren, Sprengungen, Lawinen (unter den Gästen)
function kEisBar(c,x,y,tx){c.fillStyle='#2b3040';c.fillRect(x-16,y-1,1.6,9);c.fillRect(x+14,y-1,1.6,9);for(let i=0;i<6;i++){c.fillStyle=i%2?'#fff':'#e8504a';c.fillRect(x-16+i*5.2,y-2,5.2,3)}if(tx)kSign(c,x,y-10,tx,'#e8504a','#fff',5)}
const KESHUT={nr:[[748,594],[716,690]],tr:[[384,598],[350,612]],gpa:[[574,288],[600,304]]};
KV.eis.drawDyn=function(c,t){
 for(const id of kEisClosed()){const P=KESHUT[id];kEisBar(c,P[0][0],P[0][1],'GESPERRT · LAWINE');kEisBar(c,P[1][0],P[1][1])}
 // Sprengung: Blitz am Mast, Schneewolke rollt die gesperrte Rinne hinunter
 if(KW.blast&&KW.blast.length){KW.blast=KW.blast.filter(b=>t-b.T<5);for(const b of KW.blast){const u=t-b.T,[mx,my]=KEI.mast[b.id];
  if(u<.9){c.fillStyle=`rgba(255,220,120,${((1-u/.9)*.95).toFixed(2)})`;c.beginPath();for(let i=0;i<12;i++){const a=i/12*6.283,rr=(i%2?7:17)*(1+u);c.lineTo(mx+Math.cos(a)*rr,my-24+Math.sin(a)*rr)}c.closePath();c.fill()}
  const P=KW.pmap[b.id],L=P.d[P.d.length-1][3],r=kRNG(b.id.length*7),A=Math.max(0,1-Math.max(0,u-3)/2);for(let i=0;i<46;i++){const fr=i/46,s=Math.min(L,Math.min(1,u/3.2)*L*(.35+fr*.65)),q=kAt(P.d,s),ox=(r()-.5)*q[2]*1.6,oy=-r()*6,sz=6+fr*10+r()*5;c.fillStyle=`rgba(150,175,210,${(.35*A).toFixed(2)})`;c.beginPath();c.arc(q[0]+ox+sz*.3,q[1]+oy+sz*.35,sz*.75,0,7);c.fill();c.fillStyle=`rgba(255,255,255,${(A*(.8+r()*.2)).toFixed(2)})`;c.beginPath();c.arc(q[0]+ox,q[1]+oy,sz,0,7);c.fill()}}}
 // Lawine im Lawinenstrich (nur bei hoher Warnstufe)
 if(KW.natA){const u=t-KW.natA.T;if(u>6){KW.natA=null}else{const r=kRNG(77);for(let i=0;i<70;i++){const fr=i/70,yy=600+Math.min(1,u/3.2)*fr*420,x=165+(r()-.5)*(26+fr*50)-fr*14,s=7+fr*13+r()*6,a=Math.max(0,1-Math.max(0,u-3.5)/2.5);c.fillStyle=`rgba(150,175,210,${(a*.35).toFixed(2)})`;c.beginPath();c.arc(x+s*.3,yy+s*.35,s*.7,0,7);c.fill();c.fillStyle=`rgba(255,255,255,${(a*(.75+r()*.25)).toFixed(2)})`;c.beginPath();c.arc(x,yy,s,0,7);c.fill()}}}};
KV.eis.drawOver=function(c,t){const H=KW.heli;if(H)kEisHeliDraw(c,H.x,H.y-H.h*14,H.a,t,1)};

// ---------- Antippen, Fenster ----------
KV.eis.hit=function(x,y,hit,d){if(KG.stage>=5&&(d(KEI.PB.b[0],KEI.PB.b[1])<34||d(548,256)<34))hit.push({k:'pb',d:0});
 if(KG.stage>=5)for(const i of [0,1]){const p=kEisPbPos(i);if(Math.abs(x-p.x)<16&&y>p.y&&y<p.y+32)hit.push({k:'pb',d:0})}
 for(const id of KEI.shut){const [mx,my]=KEI.mast[id];if(KG.b.mast&&KG.b.mast[id]&&d(mx,my-10)<18)hit.push({k:'law',d:0})}
 if(x>70&&x<256&&y>580&&y<1060)hit.push({k:'law',d:2});
 if(KG.b.grest&&(d(KEI.REST[0],KEI.REST[1]-30)<46||d(352,462)<20))hit.push({k:'grest',d:0});
 if(KG.stage>=6&&d(KEI.KO[0],KEI.KO[1]-12)<26)hit.push({k:'kas',d:0});
 if(KG.b.bw&&(d(KEI.BW[0],KEI.BW[1]-12)<26||d(KEI.HELI[0],KEI.HELI[1])<24))hit.push({k:'bwh',d:0});
 if(KW.heli&&d(KW.heli.x,KW.heli.y-14)<26)hit.push({k:'law',d:0})};
function kEisCSS(){if(document.getElementById('keiscss'))return;const s=document.createElement('style');s.id='keiscss';s.textContent=`.lws{display:flex;gap:4px;margin:8px 0 4px}.lws div{flex:1;text-align:center;border-radius:8px;padding:6px 0;font-weight:700;font-size:15px;color:#fff;opacity:.3}.lws div.on{opacity:1;outline:3px solid #2b3040;outline-offset:1px}
.kwind{display:grid;grid-template-columns:1fr auto auto auto;gap:5px 10px;font-size:13.5px;align-items:center;margin:4px 0}.kwind .h{color:var(--mut);font-size:11.5px}`;document.head.appendChild(s)}
const KELWN=['','gering','mäßig','erheblich','groß','sehr groß'],KELWC=['','#6cc07a','#f2c53b','#f2a63b','#e8504a','#7a2f2f'];
function kEisLawHTML(){kEisCSS();const st=KG.stage,mast=KG.b.mast||{};let h=`<div class="lws">${[1,2,3,4,5].map(i=>`<div class="${KG.lw===i?'on':''}" style="background:${KELWC[i]}">${i}</div>`).join('')}</div>`;
 h+=`<div style="font-size:13px;color:var(--mut);margin-bottom:6px">Warnstufe ${KG.lw} · ${KELWN[KG.lw]} – steigt mit Neuschnee und Sturm, sinkt mit Sonne${KG.b.zaun?' · Schneezäune: eine Stufe weniger':''}</div>`;
 if(st<3)return h+'<p class="hint">Gesperrt wird erst ab Ausbau Stufe 3 – dann gibt es Rinnen, die nach Neuschnee gesprengt werden müssen.</p>';
 h+=`<div class="bgh">${KG.lw>=3?'Heute gesperrt, bis gesprengt':'Abfahrten'}</div>`;
 for(const id of KEI.shut){const p=KW.pmap[id];if(!kPisteOpen(p))continue;const z=kEisShut(id),how=mast[id]?'Sprengmast 7:15':KW.trupp&&KW.trupp.q[0]===id?'Sprengtrupp · frei um '+kh(KW.trupp.t+1):KW.trupp&&KW.trupp.q.includes(id)?'Sprengtrupp · wartet':'';
  h+=`<div class="row"><span>${p.col==='y'?'🟡':'⚫'} ${p.n}</span><b>${z?`<span class="kchip ${how?'o':'r'}">${how||'gesperrt'}</span>`:'<span class="kchip g">offen</span>'}</b></div>`}
 h+=`<div class="row"><span>🔵 Gletscher, Kessel, Tal</span><b><span class="kchip g">offen</span></b></div>`;
 h+='<div class="bgh">Sprengen</div>';
 const card=(ic,n,s,btn)=>`<div class="kcard"><span class="ic">${ic}</span><span class="tx"><b>${n}</b><small>${s}</small></span><span class="bt">${btn}</span></div>`;
 h+=card('🧨','Sprengtrupp (Bergwacht)','beginnt um 7:00 · eine Rinne pro Stunde · gratis',KG.b.bw?'<span class="kchip g">✓ dabei</span>':'<button class="btn" data-a="go" data-v="bau|per">Bergwacht ›</button>');
 const can=kEisHeliCan();h+=card('🚁','Sprengflug','alle gesperrten Rinnen in rund 30 Minuten · 1.500 € je Flug',!KG.b.bw?'<small>erst Bergwacht</small>':KW.heli?'<span class="kchip o">fliegt</span>':`<button class="btn" data-a="eheli" ${can&&kCanPay(1500)?'':'disabled'}>1.500 €</button>`);
 if(KG.b.bw)h+=`<div class="row"><span>🚁 Sprengflug automatisch ab Warnstufe 4</span><button class="btn" data-a="eauto" style="${KG.heliAuto?'':'background:#8a94a8;box-shadow:0 3px 0 #5d667a'}">${KG.heliAuto?'an':'aus'}</button></div>`;
 const nm=KEI.shut.filter(id=>mast[id]).length,av=KEI.shut.filter(id=>kPisteOpen(KW.pmap[id])).length;h+=card('📡','Sprengmasten','sprengen automatisch um 7:15 · 6.000 € je Rinne',`<span class="kchip ${nm?'g':''}">${nm} von ${av}</span>`);
 h+=card('🚧','Schneezäune','Warnstufe dauerhaft eine Stufe niedriger · 12.000 €',KG.b.zaun?'<span class="kchip g">✓ gebaut</span>':'<button class="btn" data-a="go" data-v="bau|pis">Baumenü ›</button>');
 return h+'<p class="hint">Gesperrte Abfahrten fehlen den Profis – das kostet Laune und Ruf. Je früher gesprengt, desto weniger.</p>'}
function kEisWindHTML(){kEisCSS();const w=KG.wind||0;let h=`<div class="kpi"><div><small>Wind am Gipfel</small><b>${w} km/h</b><i>${w>=75?'Sturm':w>=50?'stürmisch':w>=30?'windig':'ruhig'}</i></div><div><small>Wind im Tal</small><b>${Math.round(w*.38)} km/h</b></div></div>`;
 h+='<div class="bgh">Welche Bahnen bei Wind fahren</div><div class="kwind"><span class="h">Bahn</span><span class="h">Wind am Lift</span><span class="h">fährt bis</span><span class="h">jetzt</span>';
 const row=(ic,n,id)=>{const st=kEisWS(id),sl=id==='kb'&&kEisSlow();h+=`<span>${ic} ${n}</span><span style="text-align:right">${kEisWindAt(id)} km/h</span><span style="text-align:right">${KEI.lim[id]} km/h</span><b><span class="kchip ${st?'r':sl?'o':'g'}">${st?'steht':sl?'langsam':'fährt'}</span></b>`};
 if(KG.stage>=5)row('🚡','Pendelbahn Gipfel','pb');if(KG.l.gb.on)row('🚠','Gletscherbahn','gb');if(KG.l.gt.on)row('🎿','Gletscherlift','gt');if(KG.l.rl.on)row('🪑','Rinnenlift','rl');if(KG.l.kb.on)row('🪑','Kesselbahn','kb');row('🪑','Almbahn','am');if(KG.l.s3.on)row('🚠','3S-Gletscherexpress','s3');
 h+='</div><p class="hint">Je höher eine Bahn, desto mehr Wind bekommt sie ab – im Tal weht nur ein Teil des Gipfelwinds. Die Kesselbahn fährt ab '+Math.round(KEI.lim.kb*.85)+' km/h langsamer.'+(KG.stage>=6?' Der 3S-Gletscherexpress hängt an zwei Tragseilen und fährt auch bei Sturm – dann ist er der einzige Weg auf den Gletscher.':' Ab Stufe 6 kommt der 3S-Gletscherexpress – er fährt auch bei Sturm.')+'</p>';
 return h}
function kEisPbHTML(){const pb=KW.pb||{q:{B:[],T:[]}},cap=kEisPbCap(),ws=kEisWS('pb');let h=kHead('🚡 Pendelbahn Gipfel')+`<div style="margin:4px 0"><span class="kchip b">2 Kabinen · je ${cap} Plätze</span><span class="kchip ${ws?'r':kEisPbOk()?'g':''}">${ws?'Wind '+KG.wind+' km/h – steht':kEisPbOk()?'fährt alle 15 Minuten':'steht'}</span></div>`;
 h+=`<div class="kpi"><div><small>Warten unten</small><b>${pb.q.B.length}</b></div><div><small>Warten am Gipfel</small><b>${pb.q.T.length}</b></div><div><small>Auf der Plattform</small><b>${KW.folks.filter(f=>f.st==='view').length}</b></div><div><small>Fahrgäste heute</small><b>${knum(KG.res.pbN||0)}</b></div></div>`;
 h+=`<div class="row"><span>Strecke</span><b>Gletscherstation ⇄ Gipfel 3.402 m</b></div><div class="row"><span>💨 Windgrenze</span><b>${KEI.lim.pb} km/h · heute ${KG.wind} km/h</b></div><div class="row"><span>Größere Kabinen</span><button class="btn" data-a="go" data-v="bau|lif">Baumenü ›</button></div>`;
 return h+'<p class="hint">Eine Kabine fährt hinauf, die andere hinunter. Profis fahren die schwarze Gipfelabfahrt, die anderen genießen die Aussicht auf der Plattform und fahren wieder hinunter. Letzte Bergfahrt 15:30.</p>'}
function kEisBergHTML(){return '<div class="bgh">🌪️ Bergwetter</div>'+kEisWindHTML()+'<div class="bgh">⚠️ Lawinenlage</div>'+kEisLawHTML()}
KV.eis.infHTML=function(k){if(k==='pb')return kEisPbHTML();
 if(k==='law')return kHead('⚠️ Lawinenlage')+kEisLawHTML();if(k==='wind')return kHead('🌪️ Bergwetter am Eisspitz')+kEisWindHTML();
 if(k==='grest')return kHead('🍽️ Gletscherrestaurant')+`<div class="kpi"><div><small>Gäste gerade</small><b>${KW.folks.filter(f=>f.st==='rest').length}</b></div><div><small>Essen heute (alle)</small><b>${kfmt(KG.inc.food||0)}</b></div></div><div class="row"><span>Gletscher-Preis</span><b>${Math.round(KG.price.food*1.35)} € (Menü ${KG.price.food} €)</b></div><p class="hint">Glaskubus mit Sonnenterrasse an der Gletscherstation – mit Eisgrotte. Mittagszeit ist zwischen 11 und 14 Uhr.</p>`;
 if(k==='bwh')return kHead('⛑️ Bergwacht')+`<p class="hint">Holt Verletzte mit Motorschlitten und Akja von der Piste.${KW.res?' Gerade im Einsatz.':''} Ab Stufe 3 sprengt ihr Sprengtrupp die gesperrten Rinnen, der Hubschrauber fliegt Sprengflüge.</p><div class="row"><span>Lawinenlage</span><button class="btn" data-a="go" data-v="sta|berg">Übersicht ›</button></div>`;
 return ''};
KV.eis.kioskOK=function(f){const w=KVOR.where(f);return w==='tal'||w==='kas'};
KV.eis.staTab=['berg','🏔️','Berg'];KV.eis.staTabHTML=kEisBergHTML;
KV.eis.staExtra=function(){let h='<div class="bgh">Berg</div>'+`<div class="row"><span>💨 Wind am Gipfel</span><b>${KG.wind||0} km/h</b></div>`;if(KG.stage>=3){const z=kEisClosed();h+=`<div class="row"><span>⚠️ Lawinenwarnstufe</span><b>${KG.lw} · ${z.length?z.length+' gesperrt':'alles offen'}</b></div>`}return h};
KV.eis.liftInfo=function(id){return `<div class="row"><span>💨 Windgrenze</span><b>${KEI.lim[id]} km/h · heute am Lift ${kEisWindAt(id)} km/h</b></div>`+(id==='kb'&&kEisSlow()?'<p class="hint">💨 Viel Wind – die Kesselbahn fährt heute langsamer.</p>':'')+(id==='s3'?'<p class="hint">Zwei Tragseile, ein Zugseil – die 3S-Bahn fährt auch bei Sturm.</p>':'')};
KV.eis.windHint=function(id){return `<p class="hint">🌪️ Zu viel Wind am Lift (${kEisWindAt(id)} km/h, Grenze ${KEI.lim[id]} km/h) – die Bahn steht heute.</p>`};
KV.eis.pisteInfo=function(p){const id=p.id;let h='';if(KEI.shut.includes(id))h+=kEisShut(id)?'<p class="hint">⚠️ Wegen Lawinengefahr gesperrt, bis gesprengt.</p>':'';
 if(id==='tr')h+='<p class="hint">🟡 Skiroute: nicht präpariert, gelb-schwarz markiert – durch eine Felsrinne bis zur Alm.</p>';if(id==='nr')h+='<p class="hint">⚫ Steil und eng zwischen den Felswänden – nur für Könner.</p>';if(id==='gpa')h+='<p class="hint">⚫ Vom Gipfel über den steilen Grat auf den Gletscher.</p>';if(id==='gs')h+='<p class="hint">🧊 Auf dem Gletscher – Spalten sind abgesperrt.</p>';
 return h};
KV.eis.voices=function(out){if(KG.stage>=3&&kEisClosed().length&&KG.t>8.5)out.push(['⚠️','„Die Rinnen sind schon wieder zu – wann wird gesprengt?“']);if(kEisWS('pb')&&KG.stage>=5)out.push(['💨','„Die Pendelbahn steht wegen Wind – schade!“']);
 if(KG.stage>=5&&!kEisWS('pb'))out.push(['🏔️','„Die Aussicht vom Gipfel ist unglaublich!“']);if(KG.b.grest)out.push(['🍽️','„Mittagessen im Glaskubus am Gletscher – traumhaft.“']);if(KG.stage>=6&&KG.wx==='sturm')out.push(['🚠','„Zum Glück fährt der 3S auch bei Sturm.“'])};
KV.eis.thumbPrep=function(G){G.b.grest=1;G.b.hut=1;G.b.zaun=1;G.b.mast={nr:1,tr:1,gpa:1};G.b.bw=1;for(const k in G.lots)G.lots[k]=1;G.paved=1;G.wind=20};
KV.eis.thumbObjs=function(O){O.push({y:540,f:c=>kEisRestDraw(c,0)});O.push({y:470,f:c=>kEisGrotte(c)});O.push({y:270,f:c=>kEisGipfel(c,0)});O.push({y:3000,f:c=>{kEisPbRope(c);kEisPbCab(c,476,470,30);kEisPbCab(c,532,330,30)}})};
KV.eis.thumbR={x:-60,y:220,w:1200};
KV.eis.onStart=function(){KW.pb=null;KW.blast=[];KW.heli=null;KW.trupp=null;KW.natA=null;KW.natL=null;if(KG&&KG.wind==null)KG.wind=20;if(KG&&!KG.lwz)KG.lwz={}};

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
 KW.pistes=V.pistes.map(p=>Object.assign({},p,{d:kDense(p.pts,3)}));KW.pmap={};for(const p of KW.pistes)KW.pmap[p.id]=p;if(V.world)V.world();
 kPisteGrid();
 KST.blocks=[];const B={box:(a,b,c2,d)=>KST.blocks.push([a,b,c2,d]),line:(P,w)=>{for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8);for(let j=0;j<=n;j++){const x=a[0]+(b[0]-a[0])*j/n,y=a[1]+(b[1]-a[1])*j/n;KST.blocks.push([x-w,y-w,x+w,y+w*1.6])}}}};
 V.blocks(B);
 for(const L of V.lifts){for(const e of [L.b,L.t]){const big=e===L.b;if(L.typ==='teller')B.box(e[0]-22,e[1]-26,e[0]+22,e[1]+30);else B.box(e[0]-(big?52:44),e[1]-34,e[0]+(big?52:44),e[1]+44)}}
 // Bäume und Häuser
 KST.trees=[];KST.tg={};KST.houses=[];KST.objs=[];KST.churchW=[];
 const D={tree:(x,y,s,t='p',force)=>{if(!force){if(kOnP(x,y,12)||kInBlock(x,y,4))return 0;const gx=Math.round(x/10),gy=Math.round(y/10);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=KST.tg[(gx+a)+','+(gy+b)];if(L)for(const q of L)if(Math.hypot(q[0]-x,q[1]-y)<(t==='p'?6:9))return 0}}
   const k=Math.round(x/10)+','+Math.round(y/10);(KST.tg[k]||(KST.tg[k]=[])).push([x,y]);KST.trees.push({x,y,s,t});return 1},
  grove:(cx,cy,rad,n,sd,t)=>{const r=kRNG(sd);for(let i=0;i<n;i++){const a=r()*6.283,u=Math.sqrt(r()),x=cx+Math.cos(a)*rad*u,y=cy+Math.sin(a)*rad*u*.8;D.tree(x,y,.55+r()*.4+.6*(1-u),typeof t==='function'?t(r):t)}},
  scatter:(x0,y0,x1,y1,n,sd,dens,t)=>{const r=kRNG(sd);for(let i=0;i<n;i++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0),d=dens?dens(x,y):1;if(r()<d)D.tree(x,y,.55+r()*.7,typeof t==='function'?t(r,x,y):t)}},
  house:(x,y,w,h,k)=>{KST.blocks.push([x-w/2-10,y-h-30,x+w/2+10,y+14]);KST.houses.push({x,y,w,h,k})},
  church:(x,y)=>{KST.objs.push({y,f:c=>kChurch(c,x,y)});KST.churchW.push([x,y])},
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
  for(const [x,y] of KVOR.lamps())kLampPost(c,x,y);if(V.staticExtra)V.staticExtra(c)});
 // Fenster der Dorfhäuser für die Nacht
 KST.winS=[];for(const h of KST.houses){if(KG.hotel&&V.hotel&&h.x===V.hotel.x&&h.y===V.hotel.y)continue;const r=kRNG(h.x*3+h.y);for(const [wx,wy] of chWin(h.x,h.y,h.w,h.h))if(r()<.7)KST.winS.push([wx,wy,6,6])}
 for(const [cx,cy] of KST.churchW)for(const q of [2,16,30])KST.winS.push([cx+q,cy-26,7,14])}
function kLampPost(c,x,y){c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(x+3,y+1,4,1.4,0,0,7);c.fill();c.fillStyle='#5b6578';c.fillRect(x-.8,y-22,1.6,22);c.fillStyle='#2b3040';c.beginPath();c.roundRect(x-3,y-25,6,4,1.5);c.fill();c.fillStyle='#ffe9a8';c.fillRect(x-2,y-21.5,4,1.1)}
// Wege (Gehwege im Schnee)
function kPathLine(c,L,w){c.lineCap='round';c.lineJoin='round';c.strokeStyle='#d8c4a4';c.lineWidth=w;c.beginPath();L.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.strokeStyle='#e6d6bb';c.lineWidth=w-3;c.stroke()}
function kDrawPaths(c){if(KVOR.drawPaths)return KVOR.drawPaths(c);const P=KW.paths;c.lineCap='round';c.lineJoin='round';
 const draw=(L,w)=>{c.strokeStyle='#d8c4a4';c.lineWidth=w;c.beginPath();L.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.strokeStyle='#e6d6bb';c.lineWidth=w-3;c.stroke()};
 draw(P.kTl,9);draw(P.kSes,9);if(KG.b.kinder)draw(P.kKid,8);if(KG.b.school)draw(P.kSchool,7);
 if(KG.b.hut){c.strokeStyle='#e9dcc4';c.lineWidth=6;c.beginPath();const H=KVOR.hut.in;H.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
 if(KG.hotel){draw([[540,1636],[560,1690],[640,1724],[676,1724]],7)}
 c.strokeStyle='#d8c4a4';c.lineWidth=9;c.beginPath();c.moveTo(KVOR.kassa.x,KVOR.walkY);c.lineTo(KVOR.kassa.x,KVOR.kassa.y+6);c.stroke();c.strokeStyle='#e6d6bb';c.lineWidth=6;c.stroke()}
// Pisten zeichnen: offen (gespurt, Stangen) oder noch gesperrt (unberührter Schnee)
function kPisteOpen(p){return KG.stage>=p.st&&(!p.need||KG.b[p.need])&&kLiftFor(p)}
// Abschnitte einer langen Piste: Stufe nach Höhe (p.sec = [[yAb,Stufe],…] von unten nach oben)
function kSecSt(p,y){if(!p.sec)return p.st;for(const [y0,st] of p.sec)if(y>=y0)return st;return p.sec[p.sec.length-1][1]}
function kPtOpen(p,q){return !p.sec||KG.stage>=kSecSt(p,q[1])}
// erste offene Stelle (Bogenlänge) einer Piste
function kOpenS(p){if(!p.sec)return 0;for(const q of p.d)if(kPtOpen(p,q))return q[3];return p.d[p.d.length-1][3]}
function kLiftFor(p){if(p.via)return kPisteOpen(KW.pmap[p.via]);for(const L of KVOR.lifts)if(L.pistes.includes(p.id)&&KG.l[L.id]&&KG.l[L.id].on)return 1;return 0}
function kDrawPistes(c){const PS=KW.pistes;
 for(let pass=0;pass<2;pass++)for(const p of PS){const op0=kPisteOpen(p);for(let i=0;i<p.d.length;i+=2){const q=p.d[i],op=op0&&kPtOpen(p,q);c.fillStyle=pass?(op?'#ffffff':'#fbfdff'):(op?'#d9e6f3':'#e9f0f8');c.beginPath();c.arc(q[0],q[1],q[2]+(pass?0:1.4),0,7);c.fill()}}
 c.strokeStyle='rgba(165,185,215,.32)';c.lineWidth=.7;for(const p of PS){if(!kPisteOpen(p)||p.route)continue;for(const f of [-.62,-.3,0,.3,.62]){c.beginPath();const n0=p.d.length;let st=0;p.d.forEach((q,i)=>{if(i<n0*.04||i>n0*.93||!kPtOpen(p,q)){st=0;return}const x=q[0]+q[4]*q[2]*f+Math.sin(q[1]/37+f*5)*3,y=q[1]+q[5]*q[2]*f;st?c.lineTo(x,y):c.moveTo(x,y);st=1});c.stroke()}}
 for(const p of PS){if(!p.route||!kPisteOpen(p))continue;const r=kRNG(p.d.length*3);for(let i=0;i<p.d.length;i+=3){const q=p.d[i];for(let k=0;k<2;k++){const x=q[0]+(r()*2-1)*q[2]*.7,y=q[1]+(r()*2-1)*4;c.fillStyle='rgba(150,180,215,.35)';c.beginPath();c.ellipse(x+1.5,y+1.2,4,1.6,0,0,7);c.fill();c.fillStyle='rgba(255,255,255,.95)';c.beginPath();c.ellipse(x,y,3.6,1.5,0,0,7);c.fill()}}}
 const PC={b:'#3a78d0',r:'#e8504a',s:'#2b3040',y:'#f2c53b'};for(const p of PS){if(!kPisteOpen(p))continue;let acc=0;for(let i=1;i<p.d.length;i++){const a=p.d[i-1],q=p.d[i];acc+=Math.hypot(q[0]-a[0],q[1]-a[1]);if(acc<34||!kPtOpen(p,q))continue;acc=0;
  for(const sd of [-1,1]){const x=q[0]+q[4]*(q[2]+4)*sd,y=q[1]+q[5]*(q[2]+4)*sd;if(kOnP(x,y,-1)||kInBlock(x,y,-6))continue;c.fillStyle=PC[p.col];c.fillRect(x,y-8,1.6,9);c.fillStyle=p.col==='s'?'#f2c53b':p.col==='y'?'#2b3040':'#fff';c.fillRect(x,y-5,1.6,p.col==='y'?2:1.4)}}}
 // gesperrte Pisten: Schild
 for(const p of PS){if(p.id==='ueb'||p.conn)continue;
  if(p.sec&&kPisteOpen(p)){// gesperrte Abschnitte einzeln beschriften
   for(let st=KG.stage+1;st<=KVOR.stages;st++){const Q=p.d.filter(q=>kSecSt(p,q[1])===st);if(!Q.length)continue;const q=Q[Math.floor(Q.length*.5)];kSign(c,q[0],q[1],'🔒 Ausbau Stufe '+st,'rgba(43,58,85,.78)','#fff',10)}continue}
  if(kPisteOpen(p))continue;const q=p.d[Math.floor(p.d.length*.42)];kSign(c,q[0],q[1],(p.need&&KG.bau.find(b=>b.id===p.need)?'🚧 '+p.n+' · im Bau':'🔒 '+p.n+(p.need&&KG.stage>=p.st?' · im Baumenü':' · Stufe '+p.st)),'rgba(43,58,85,.78)','#fff',10)}}
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
  lots:{},paved:0,hotel:0,bau:[],wat:100,
  price:{ticket:V.fair.ticket[1],park:V.fair.park,food:V.fair.food,kids:V.fair.kids,school:V.fair.school,hotel:V.fair.hotel},
  ruf:50+((perks||[]).includes('name')?10:0),wx:'sonne',wxN:'sonne',snow:42,pq:{},inc:{},cost:{},hist:[],gT:0,gDay:0,rej:0,famOK:0,
  sat:{},cmp:[],rv:V.rivS.slice(),seaM0:0,seaInc:0,seaCost:0,goals:{},done:0,pleite:0,lg:[],buzz:0,res:{},sea:1,kupg:0,dem:0,stars:1,seaHist:[],tu:0};
 for(const L of V.lifts)s.l[L.id]={on:0,typ:L.typ,lg:0,cond:100,brk:null};
 for(const L of V.lots)s.lots[L.id]=L.base?1:0;
 for(const p of V.pistes)s.pq[p.id]=100;
 if(V.init)V.init(s);s.wxN=kWxRoll(V);s.seaM0=s.money;return s}
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
const KLT={teller:{n:'Tellerlift',cap:1,sp:15,v:30,co:4,up:110,drag:1},schlepp:{n:'Schlepplift',cap:2,sp:20,v:30,co:3,up:150,drag:1},s1:{n:'Einersessel',cap:1,sp:30,v:30,co:5,up:180,chair:1},g8:{n:'8er-Gondel',cap:8,sp:62,v:56,co:10,up:640},s2:{n:'2er-Sessel',cap:2,sp:36,v:40,co:8,up:260},s4:{n:'4er-Sessel',cap:4,sp:40,v:46,co:8,up:380},s6:{n:'6er-Sessel',cap:6,sp:44,v:50,co:9,up:520},s3:{n:'3S-Bahn',cap:28,sp:150,v:72,co:12,up:900}};
// Wind: steht ein Lift? (Berge mit eigener Windgrenze: KVOR.windStop)
function kWS(id){if(KVOR&&KVOR.windStop)return KVOR.windStop(id);const s=KG.l[id];return KG.wx==='sturm'&&!KLT[s.typ].drag}
const kLC=(id)=>{const L=KVOR.lifts.find(x=>x.id===id);return L};
// Lift, dessen Bergstation am Fuß dieses Liftes liegt (Lift-Kette)
const kLowerOf=(id)=>KVOR.lifts.find(x=>x.nx===id);

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
function kLiftOpen(id){const st=KG.l[id];if(!st||!st.on)return 0;if(st.brk)return 0;if(kWS(id))return 0;const t=KG.t;return t>=8.5&&t<16.25}
function kLiftPos(o,u,side){// u 0..1 bergauf (rechte Seite), 1..2 bergab
 const up=u<1,a=up?u:2-u,co=o.T.co,px=-o.uy,py=o.ux;const sd=up?1:-1;return [o.bx+(o.tx-o.bx)*a+px*co*sd,o.by+(o.ty-o.by)*a+py*co*sd]}
function kLiftStep(o,dt){const id=o.L.id,open=kLiftOpen(id),st=KG.l[id];
 const riders=o.ch.some(c=>c.r.length);o.run=(st.on||riders)&&!st.brk&&!kWS(id)&&(open||riders);
 if(!o.run)return;const du=o.T.v*dt/o.len*(KVOR.liftV?KVOR.liftV(id):1);
 for(const c of o.ch){const u0=c.u;c.u+=du;if(c.u>=2)c.u-=2;
  // Ankunft oben
  if(u0<1&&c.u>=1){for(const f of c.r)kUnload(o,f);c.r=[]}
  // Einstieg unten
  if((u0>1.6&&c.u<.4&&c.u<u0)||(u0<0&&c.u>=0)){if(open)kBoard(o,c)}}}
function kBoard(o,c){const cap=o.T.cap;let n=0,k=0;// die ersten Plätze der Schlange steigen gemeinsam ein (alle, die schon an ihrem Platz stehen)
 const s0=kQSlot(o,0),lim=cap>1?9+7*cap:9;for(;k<Math.min(cap,o.q.length);k++){const f=o.q[k];if(Math.hypot(f.x-s0[0],f.y-s0[1])>lim)break}
 while(o.q.length&&n<k){const f=o.q[0];o.q.shift();f.st='ride';f.ch=c;f.lid=o.L.id;c.r.push(f);n++;
  const w=(KG.t-(f.qT||KG.t))*60;f.waits=(f.waits||0)+1;f.wsum=(f.wsum||0)+w;o.wait.push(w);if(o.wait.length>20)o.wait.shift();f.sat-=Math.max(0,w-7)*.55;if(KVOR.onBoard)KVOR.onBoard(o,f);if(w>25)f.sat-=3;
  if(!f.ins&&!f.kid&&f.ty!=='staff'){}o.cnt++;KG.res.rides=(KG.res.rides||0)+1}}
function kQSlot(o,i){if(KVOR.qSlot){const r=KVOR.qSlot(o,i);if(r)return r}const L=o.L,bx=L.b[0],by=L.b[1];if(o.T.cap===1){const r=Math.floor(i/6),j=i%6;return [bx-15+(r%2?5-j:j)*6,by+18+r*7]}
 const r=Math.floor(i/9),j=i%9;return [bx-14-(r%2?8-j:j)*7,by+16+r*8]}
function kUnload(o,f){f.ch=null;const L=o.L;f.x=L.exit[0]+(kR()-.5)*6;f.y=L.exit[1]+(kR()-.5)*4;
 if(f.grp&&f.grp.st==='run'&&f.grp.lid===o.L.id){kSkiStart(f,'ueb',f.grp);return}
 if(KVOR.unload){KVOR.unload(o,f);return}
 const ps=L.pistes.filter(pid=>kPisteOpen(KW.pmap[pid]));let pid=ps[0];
 if(ps.length>1){const w=ps.map(p=>{const P=KW.pmap[p];if(P.col==='r')return f.ty==='pro'?2.2:f.ty==='sb'?1.8:f.ty==='fam'?.35:.08;return 1});let s=w.reduce((a,b)=>a+b,0),r=kR()*s;for(let i=0;i<ps.length;i++){r-=w[i];if(r<=0){pid=ps[i];break}}}
 kSkiStart(f,pid)}
// --- Skifahren ---
const KSPD={fam:46,anf:32,pro:72,sb:64,kid:30,ins:24};
function kSkiStart(f,pid,grp,s0){const P=KW.pmap[pid];f.st='ski';f.pid=pid;f.s=s0||0;f.runS=0;f.s0r=f.s;f.grpRun=grp||null;f.engIn=null;f.engQ=null;f.engHold=0;f.brCk=0;
 f.v=(f.kid?KSPD.kid:KSPD[f.ty]||45)*(.85+kR()*.3)*(pid==='ueb'?.62:1)*(P.col==='r'?1.1:1);if(grp){f.v=17;f.o=0}else{f.o=(kR()*2-1)*.7}
 f.ph=kR()*6.28;f.amp=f.ty==='sb'?.9:f.ty==='pro'?.7:f.ty==='anf'?.25:.5;f.ateCk=0}
function kSkiPos(f){const P=KW.pmap[f.pid],q=kAt(P.d,f.s);let o;if(f.grpRun){o=Math.sin(f.s/34)*.55}else{const sw=Math.sin(f.s/(26+f.amp*14)+f.ph)*f.amp*.32;o=kcl(f.o+sw,-.88,.88)}
 return [q[0]+q[3]*q[2]*o,q[1]+q[4]*q[2]*o,q,o]}
function kSkiStep(f,dt){const P=KW.pmap[f.pid],Ld=P.d[P.d.length-1][3];
 // Hütte unterwegs
 if(KVOR.hut&&f.pid===KVOR.hut.pid&&KG.b.hut&&!f.ate&&!f.kid&&!f.grpRun&&KG.t>=11.2&&KG.t<14.2&&!f.ateCk){const sH=KW.hutS;if(f.s<sH&&f.s+f.v*dt>=sH){f.ateCk=1;if(kR()<.72){f.st='walk';f.path=KVOR.hut.in.map(p=>[p[0],p[1]]);f.pi=0;f.wsp=12;f.nx='hut';f.board0=1;return}}}
 // Ausweichen: langsamer, wenn vorne dicht (einfach)
 if(P.eng&&kEngStep(f,P,dt))return;
 const BRS=P.brs||(P.br?[P.br]:null);if(BRS&&!f.engHold)for(const br of BRS){if(f.s<br.s&&f.s+f.v*dt>=br.s){if(KVOR.branch&&KVOR.branch(f,br)){kSkiSwitch(f,br.p,br.s2||0);return}}}
 if(!f.engHold)f.s+=f.v*dt*(f.engIn?f.engIn.vf:1);const [x,y,q,o]=kSkiPos(f);f.sv=(x-f.x)*20;f.x=x;f.y=y;f.lo=o;
 if(f.hurtAt&&f.s>=f.hurtAt){f.hurtAt=0;kHurt(f);return}
 if(f.s>=Ld){if(P.next){// Übergang auf die nächste Piste (Zubringer → Abfahrt, Umfahrung → Abfahrt)
   if(!P.conn){KG.pq[f.pid]=Math.max(0,KG.pq[f.pid]-(P.wear||.035));if(P.col==='r'&&(f.ty==='pro'||f.ty==='sb'))f.sat+=1.2}
   kSkiSwitch(f,P.next.p,P.next.s);return}
  KG.pq[f.pid]=Math.max(0,KG.pq[f.pid]-(P.wear||(f.pid==='ueb'?.06:.035)));f.runs=(f.runs||0)+1;const rl=KVOR.runRef?kcl(((f.runS||0)+Math.max(0,f.s-(f.s0r||0)))/KVOR.runRef,.6,2.2):1;f.sat+=(((KG.pq[f.pid]||100)-68)/30*1.4+(P.col==='r'&&(f.ty==='pro'||f.ty==='sb')?1.6:0))*rl;kAfterRun(f)}}
// auf eine andere Piste wechseln, ohne Sprung (seitliche Lage aus der echten Position)
function kSkiSwitch(f,pid,s){const P=KW.pmap[pid],P0=KW.pmap[f.pid];f.runS=(f.runS||0)+Math.max(0,f.s-(f.s0r||0));f.s0r=s;f.pid=pid;f.s=s;f.engIn=null;f.engQ=null;f.engHold=0;f.brCk=0;const q=kAt(P.d,s);const o=((f.x-q[0])*q[3]+(f.y-q[1])*q[4])/Math.max(4,q[2]);f.o=kcl(o,-.8,.8)}
// Engstellen: nur einer nach dem anderen hinein, sonst warten (Stau)
function kEngStep(f,P,dt){if(f.engIn){if(f.s>=f.engIn.s1)f.engIn=null;return 0}
 const E=P.eng.find(e=>e.s1>f.s&&e.s0>f.s-2);if(!E)return 0;
 const free=()=>KW.T-E.last>=E.h;
 if(f.engQ===E){const i=E.q.indexOf(f);if(i<0){f.engQ=null;f.engHold=0;return 0}
  if(i===0&&free()){E.q.shift();f.engQ=null;f.engHold=0;f.engIn=E;E.last=KW.T;f.o=kcl(f.o,-.5,.5);KG.res.engW=(KG.res.engW||0)+(KW.T-(f.engT||KW.T));return 0}
  // zum Warteplatz rutschen und stehen bleiben
  const ts=E.s0-4-Math.floor(i/3)*7.5-(i%3?2:0),lane=[0,-.5,.5][i%3];f.engHold=1;if(f.s<ts)f.s=Math.min(ts,f.s+Math.min(f.v,16)*dt);f.o+=(lane-f.o)*Math.min(1,dt*3);
  f.sat-=dt/KRT*60*.3;const [x,y,q,o]=kSkiPos(f);f.sv=(x-f.x)*20;f.x=x;f.y=y;f.lo=o;return 1}
 if(f.s+f.v*dt>=E.s0-2){if(!E.q.length&&free()){f.engIn=E;E.last=KW.T;f.o=kcl(f.o,-.5,.5);return 0}
  E.q.push(f);f.engQ=E;f.engT=KW.T;f.engHold=1;KG.res.engN=(KG.res.engN||0)+1;return 0}
 return 0}
// nach einer Abfahrt / Liftfahrt: weiter?
function kAfterRun(f){f.st='walk';f.path=null;
 if(f.grpRun){const g=f.grpRun;f.grpRun=null;if(g.st==='run'&&KG.t<g.end){kToQueue(f,'tl');return}}
 if(f.ins)return kInsHome(f);
 if(KG.t>=f.leaveT||!kAnyLiftFor(f))return kGoHome(f);
 // Kiosk am Mittag (wenn keine Hütte erreichbar)
 if(!f.ate&&KG.b.kiosk&&KG.t>=11.4&&KG.t<13.8&&(f.pid==='ueb'||!KG.b.hut||KVOR.kioskAlways&&!f.ateCk)&&(!KVOR.kioskOK||KVOR.kioskOK(f))&&kR()<.7)return kGoKiosk(f);
 // Wechsel zwischen Übungshang und Sessel
 const lid=KVOR.chooseLift?KVOR.chooseLift(f):kChooseLift(f);if(lid)kToQueue(f,lid)}
function kAnyLiftFor(f){for(const L of KVOR.lifts)if(KG.l[L.id].on&&KG.t<16.25&&!kWS(L.id))return 1;return 0}
function kChooseLift(f){const ses=KG.l.ses&&KG.l.ses.on&&KG.wx!=='sturm'&&KG.stage>=2,tl=KG.l.tl&&KG.l.tl.on;
 if(!ses)return 'tl';if(!tl)return 'ses';
 const p={fam:.82,anf:.25,pro:.97,sb:.95}[f.ty]||.6;const anfP=f.ty==='anf'?Math.min(.75,.18+(f.runs||0)*.07):p;return kR()<anfP?'ses':'tl'}
// Wege zwischen Orten
function kRev(P){return P.slice().reverse()}
function kWhere(f){// Bereich, an dem der Gast gerade ist: kas | tl | ses | kid | sch
 if(KVOR.where)return KVOR.where(f);
 const K=KVOR.kassa;if(Math.hypot(f.x-K.x,f.y-(K.y+8))<70||f.y>KVOR.valleyY)return 'kas';
 if(f.st==='kidin'||Math.hypot(f.x-KVOR.kinder.x,f.y-KVOR.kinder.y)<90)return 'kid';
 if(Math.hypot(f.x-KVOR.school.x,f.y-KVOR.school.y)<26)return 'sch';
 if(f.x>560&&f.y>1300)return 'ses';return 'tl'}
// Weg von Bereich zu Bereich (immer über die Kassa)
function kRoute(from,to,f){if(KVOR.route)return KVOR.route(from,to,f);const P=KW.paths,toK={tl:P.kTl,ses:P.kSes,kid:P.kKid,sch:P.kSchool};let path=[];if(from===to)return path;if(from!=='kas'&&toK[from])path=kRev(toK[from]);if(to!=='kas'&&toK[to])path=path.concat(toK[to]);else path.push([KVOR.kassa.x,KVOR.kassa.y+8]);return path}
function kToQueue(f,lid){const o=KW.lift[lid],here=kWhere(f);const path=here===lid?(KVOR.route?KVOR.route(here,lid,f):[]):kRoute(here,lid,f);
 const end=kQSlot(o,o.q.length+1);path.push(end);f.path=path;f.pi=0;f.st='walk';f.wsp=path.length>2?11:14;f.nx='q:'+lid}
function kJoinQ(f,lid){const o=KW.lift[lid];if(!o||!KG.l[lid].on||KG.t>=16.25||kWS(lid)){return f.ins?kInsHome(f):kGoHome(f)}f.st='q';f.qT=KG.t;f.lid=lid;o.q.push(f)}
function kQStep(o,dt){const qv=o.T.cap>1?30:14;for(let i=0;i<o.q.length;i++){const f=o.q[i],[sx,sy]=kQSlot(o,i),dx=sx-f.x,dy=sy-f.y,d=Math.hypot(dx,dy);if(d>.3){const m=Math.min(d,qv*dt);f.x+=dx/d*m;f.y+=dy/d*m;f.sv=0}}
 // Liftschluss: wer noch steht, geht heim
 if(KG.t>=16.25||!KG.l[o.L.id].on){while(o.q.length){const f=o.q.shift();if(f.ins)kInsHome(f);else kGoHome(f)}}}
// --- Gehen ---
function kZebraWait(f,p){const zb=KVOR.zebra;if(zb==null||Math.abs(f.x-zb)>16)return 0;const Y0=KVOR.road.y-19,Y1=KVOR.road.y+19;const onRoad=f.y>Y0&&f.y<Y1;if(onRoad)return 0;if(!((f.y<=Y0&&p[1]>Y0)||(f.y>=Y1&&p[1]<Y1)))return 0;
 for(const c of KW.cars){if(c.st!=='in'&&c.st!=='leave')continue;const d=(zb-c.x)*c.dir;if(d>-14&&d<58)return 1}for(const b of KW.buses){const d=(zb-b.x)*b.dir;if(b.st!=='stop'&&d>-20&&d<70)return 1}return 0}
function kWalkStep(f,dt){if(!f.path||f.pi>=f.path.length){return kArrive(f)}if(kZebraWait(f,f.path[f.pi]))return;const p=f.path[f.pi],dx=p[0]-f.x,dy=p[1]-f.y,d=Math.hypot(dx,dy),m=(f.wsp||11)*2.3*(f.kid?.85:1)*dt;
 if(d<=m){f.x=p[0];f.y=p[1];f.pi++;if(f.pi>=f.path.length)kArrive(f)}else{f.x+=dx/d*m;f.y+=dy/d*m}}
function kArrive(f){const nx=f.nx||'';f.nx='';f.path=null;if(KVOR.arrive&&KVOR.arrive(f,nx))return;
 if(nx==='kassa')return kKassa(f);
 if(nx.startsWith('q:'))return kJoinQ(f,nx.slice(2));
 if(nx==='car')return kAtCar(f);
 if(nx==='hut'){f.st='hut';f.tEnd=KG.t+.55+kR()*.4;kHutSeat(f);return}
 if(nx==='hutback'){f.ate=1;kSkiStart(f,KVOR.hut.pid||'main',null,KW.hutS+2);return}
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
 f.sat+=r>1?-(r-1)*45*sens:(1-r)*14;kEarn('tk',pr,f.kasP?f.kasP[0]:V.kassa.x,(f.kasP?f.kasP[1]:V.kassa.y)-30);f.paid=(f.paid||0)+pr;f.half=half;
 // Skischule buchen
 if(KG.b.school&&(f.ty==='anf'||f.kid&&!KG.b.kinder)&&!f.lessonD&&KG.t<14.4){const g=kSchoolSlot();if(g&&kR()<kcl(1.3-P.school/F.school*.55,.12,.85)){f.lessonD=1;g.pu.push(f);f.grp=g;kEarn('sch',P.school,V.school.x,V.school.y-30);f.paid+=P.school;f.sat+=6;kWalk(f,KW.paths.kSchool,'school',10);return}}
 kAfterRun(f)}
function kWalk(f,path,nx,sp){f.st='walk';f.path=path.map(p=>[p[0],p[1]]);f.pi=0;f.nx=nx;f.wsp=sp||11}
// --- Heimgehen ---
function kGoHome(f,noRide){const P=KW.paths,V=KVOR;if(V.descend&&V.descend(f))return;f.leaving=1;if(V.goHome)return V.goHome(f,noRide);
 if(f.kid&&f.st==='kidin'){kWalk(f,kRev(P.kKid).concat(kHomeTail(f)),f.hotelG?'hotelin':f.busG?'busw':'car',10);return}
 let path=[];const here=kWhere(f);
 if(!noRide)path=kRoute(here,'kas');
 path=path.concat(kHomeTail(f));kWalk(f,path,f.hotelG?'hotelin':f.busG?'busw':'car',11)}
// Parkplatz-Geometrie aus der Vorlage
const kPY=()=>KVOR.parkY,kLN=()=>KVOR.road.y-9,kLS=()=>KVOR.road.y+9;
function kHomeTail(f){const V=KVOR,k=V.kassa,W=V.walkY;if(f.hotelG)return V.hotel.pout();if(f.busG)return kRev(KW.paths.busUp);
 const c=f.car;if(!c)return [[k.x,W]];return [[k.x,k.y+8],[k.x,W],[c.sx+9,W],[c.sx+9,V.parkY-10]]}
function kAtCar(f){f.st='gone';const c=f.car;if(c){c.back++;if(c.back>=c.n&&c.st==='park'){c.st='out';c.tw=.4+kR()*.6}}}
// --- Hütte ---
function kHutSeat(f){const H=KVOR.hut,i=(KW.hutN=(KW.hutN||0)+1)%10;const sp=[[-26,6],[-20,6],[-12,6],[10,6],[14,6],[18,6],[-8,14],[-2,14],[4,14],[8,14]][i];f.x=H.x+sp[0];f.y=H.y+sp[1];f.sit=1}
function kHutDone(f){const V=KVOR,P=KG.price,r=P.food/V.fair.food;f.sit=0;f.ate=1;if(r<1.6||kR()<.5){const v=Math.round(P.food*(f.ty==='fam'?1.15:1));kEarn('food',v,V.hut.x,V.hut.y-46);f.paid+=v;f.sat+=r>1?-(r-1)*22:5}else f.sat-=4;
 kWalk(f,kRev(V.hut.in),'hutback',12)}
function kGoKiosk(f){const k=KVOR.kassa;const path=kRoute(kWhere(f),'kas',f).concat([[k.x+36,k.y+12]]);kWalk(f,path,'kiosk',11)}
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
 if(KG.b.bw){const B0=KVOR.bwStart||[KVOR.garage.x-40,KVOR.garage.y+8];KW.res={f,st:'go',x:B0[0],y:B0[1],t:0,path:(typeof KVOR.resPre==='function'?KVOR.resPre(f):KVOR.resPre||[]).concat(kResPath(f))};kLog('⛑️','Unfall auf der Piste '+KW.pmap[f.pid].n+' – die Bergwacht ist unterwegs.')}
 else{kLog('🤕','Unfall auf der Piste '+KW.pmap[f.pid].n+' – ohne Bergwacht dauert die Hilfe lange. Ruf −3.');KG.ruf=Math.max(5,KG.ruf-3)}}
function kResPath(f){const pts=[],segs=[];let P=KW.pmap[f.pid],s0=f.s,g=0;while(P&&g++<6){segs.push([P,s0]);if(!P.next)break;s0=P.next.s;P=KW.pmap[P.next.p]}
 for(let i=segs.length-1;i>=0;i--){const [Q,a]=segs[i];for(let s=Q.d[Q.d.length-1][3];s>a;s-=40){const q=kAt(Q.d,s);pts.push([q[0]+q[3]*q[2]*.82,q[1]+q[4]*q[2]*.82])}}pts.push([f.x+10,f.y+4]);return pts}
function kResStep(dt){const R=KW.res;if(!R)return;const sp=56;
 if(R.st==='go'||R.st==='back'){const p=R.path[R.pi||0];if(!p){if(R.st==='go'){R.st='load';R.t=0}else{KW.res=null;const f=R.f;f.st='gone';return}return}
  const dx=p[0]-R.x,dy=p[1]-R.y,d=Math.hypot(dx,dy),m=sp*dt;R.a=Math.atan2(dy,dx);if(d<=m){R.x=p[0];R.y=p[1];R.pi=(R.pi||0)+1}else{R.x+=dx/d*m;R.y+=dy/d*m}if(R.st==='back'){R.f.x=R.x-Math.cos(R.a)*12;R.f.y=R.y-Math.sin(R.a)*12}return}
 if(R.st==='load'){R.t+=dt;if(R.t>2.4){const B0=KVOR.bwStart||[KVOR.garage.x-40,KVOR.garage.y+8];R.st='back';R.path=kRev(R.path).concat([B0]);R.pi=1;R.f.st='akja'}}}
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
 free.sort((a,b)=>Math.abs(a.x-KVOR.kassa.x)-Math.abs(b.x-KVOR.kassa.x));return free[Math.floor(kR()*Math.min(4,free.length))]}
function kSpawnCar(ty){if(KVOR.spawnCar)return KVOR.spawnCar(ty);const sp=kFreeSpot();if(!sp){KG.rej++;KG.res.rej=(KG.res.rej||0)+1;return 0}
 const fromW=kR()<.5,y=fromW?kLS():kLN(),x=fromW?KVOR.bounds.x0-40:KVOR.bounds.x1+40;
 const g=kGroup(ty),arr=KG.t,lt=kLeaveT(ty,arr);for(const f of g)kSetupFolk(f,arr,lt);
 const car={x,y,a:fromW?0:Math.PI,dir:fromW?1:-1,v:0,st:'in',spot:sp,sx:sp.x,col:kpick(['#e8504a','#3a78d0','#f2f2f2','#6cc07a','#f2c53b','#ff8fb8','#8e93b8','#2fb3b8']),ppl:g,n:g.length,back:0,ty};
 for(const f of g)f.car=car;KW.cars.push(car);return g.length}
function kCarStep(c,dt){const zb=KVOR.zebra;
 const RY=KVOR.road.y,PY=kPY();const blockedZ=()=>{if(zb==null)return 0;for(const f of KW.folks){if(f.st==='walk'&&Math.abs(f.x-zb)<13&&f.y>RY-20&&f.y<RY+20)return 1}return 0};
 const ahead=(v)=>{for(const o of KW.cars){if(o===c||o.dir!==c.dir||Math.abs(o.y-c.y)>6||o.st==='park'||o.st==='turn'&&false)continue;const d=(o.x-c.x)*c.dir;if(d>0&&d<36)v=Math.min(v,Math.max(0,(d-26)*2))}const nz=(zb-c.x)*c.dir;if(nz>4&&nz<40&&blockedZ())v=0;return v};
 if(c.st==='in'){const tx=c.sx-c.dir*16,dist=(tx-c.x)*c.dir;let v=46;if(dist<60)v=Math.max(12,dist*.8);v=ahead(v);c.x+=c.dir*v*dt;if(dist<=1){c.x=tx;c.st='turn';c.tt=0;c.y0=c.y}return}
 if(c.st==='turn'){c.tt+=dt/1.7;const t=Math.min(1,c.tt),h=Math.PI/2;c.x=c.sx-c.dir*16+c.dir*16*Math.sin(t*h);c.y=c.y0+(PY-c.y0)*(1-Math.cos(t*h));c.a=(c.dir>0?0:Math.PI)+(c.dir>0?-1:1)*t*h;if(t>=1){c.st='park';c.a=-h;c.x=c.sx;c.y=PY;kUnloadCar(c)}return}
 if(c.st==='out'){c.tw-=dt;if(c.tw>0)return;c.st='back';c.tt=0;c.dir=kR()<.5?1:-1;return}
 if(c.st==='back'){// nur ausparken, wenn die Spur frei ist
  const ty2=c.dir>0?kLS():kLN();if(c.tt===0){for(const o of KW.cars){if(o===c||o.st==='park')continue;if(Math.abs(o.y-ty2)<6&&Math.abs(o.x-c.x)<46)return}}
  c.tt+=dt/1.9;const t=Math.min(1,c.tt),h=Math.PI/2;c.x=c.sx+c.dir*16*(1-Math.cos(t*h));c.y=PY+(ty2-PY)*Math.sin(t*h);c.a=-h+(c.dir>0?t*h:-t*h);if(t>=1){c.st='leave';c.y=ty2;c.a=c.dir>0?0:Math.PI;c.spot=null}return}
 if(c.st==='leave'){let v=ahead(48);c.x+=c.dir*v*dt;if(c.x<KVOR.bounds.x0-60||c.x>KVOR.bounds.x1+60)c.st='gone'}}
function kUnloadCar(c){const V=KVOR,W=V.walkY,k=V.kassa,PY=kPY();let i=0;for(const f of c.ppl){f.x=c.sx+(i%2?-10:10);f.y=PY+(i>>1)*6;i++;const path=[[f.x,PY-16],[c.sx+9,W],[k.x,W],[k.x,k.y+8]];kWalk(f,path,'kassa',11);KW.folks.push(f);KG.gDay++;KG.gT++}
 kEarn('pk',KG.price.park,c.sx,kPY()-22);
 const r=KG.price.park/Math.max(1,V.fair.park);if(r>1.3)for(const f of c.ppl)f.sat-=(r-1.3)*10}
// Bus
function kBusStep(b,dt){const X=KVOR.bus.x;if(b.st==='in'){let v=40;const d=(X-b.x)*b.dir;if(d<70)v=Math.max(10,d*.8);if(d<=1){b.st='stop';b.tw=3.5;b.x=X;kBusUnload(b)}else b.x+=b.dir*v*dt;return}
 if(b.st==='stop'){b.tw-=dt;if(b.tw<=0){// Abholung
   const W=KW.folks.filter(f=>f.st==='busw');for(const f of W.slice(0,40)){f.st='gone';kAtBus(f)}b.st='leave'}return}
 if(b.st==='leave'){b.x+=b.dir*44*dt;if(b.x<KVOR.bounds.x0-80||b.x>KVOR.bounds.x1+80)b.st='gone'}}
function kAtBus(f){}
function kBusUnload(b){const V=KVOR,n=b.n||0;for(let i=0;i<n;i++){const ty=kMix(),f=kMkFolk(ty,0);const lt=kLeaveT(ty,KG.t);kSetupFolk(f,KG.t,Math.min(16.2,lt));f.busG=1;f.x=V.bus.x-14+(i%5)*6;f.y=V.road.y-24+Math.floor(i/5)*2;kWalk(f,KW.paths.busUp,'kassa',11);KW.folks.push(f);KG.gDay++;KG.gT++}}
function kSpawnBus(n,pick){if(KVOR.spawnBus)return KVOR.spawnBus(n,pick);KW.buses.push({x:KVOR.bounds.x1+60,y:kLN(),dir:-1,st:'in',n,a:0,pick});}
// Hotelgäste (morgens aus dem Gasthof)
function kSpawnHotelG(n){const V=KVOR,H=V.hotel;for(let i=0;i<n;i++){const ty=kMix(),f=kMkFolk(ty,0);f.hotelG=1;kSetupFolk(f,KG.t,kLeaveT(ty,KG.t));f.x=H.x-20+kR()*6;f.y=H.y+4;
 const path=V.hotel.pin();kWalk(f,path,'kassa',11);f.delay=Math.floor(i/4)*2.2+(i%4)*.35;KW.folks.push(f);KG.gDay++;KG.gT++}}

// ===== Tagesablauf, Wirtschaft =====
const KBASE={sonn:[0,110,260,380],bich:[0,120,190,270,380],alt:[0,150,220,290,370],seek:[0,175,245,305,370,450],eis:[0,150,205,255,305,355,420]};
const KWXF={sonne:1.12,neuschnee:1.22,tau:.82,sturm:.5};
const KWI={sonne:'☀️',neuschnee:'🌨️',tau:'🌡️',sturm:'🌪️'},KWNM={sonne:'Sonne',neuschnee:'Neuschnee',tau:'Tauwetter',sturm:'Sturm'};
function kFairT(){return KVOR.fair.ticket[KG.stage]+(kStars()-1)*1.5}
function kDemand(){const V=KVOR,base=KBASE[V.id]||KBASE.sonn,st=KG.stage;if(!Object.values(KG.l).some(l=>l.on))return 0;
 // neue Stufe spricht sich herum
 let b=base[st];if(KG.buzzD&&KG.day-KG.buzzD<KG.buzzN){const u=(KG.day-KG.buzzD+1)/(KG.buzzN+1);b=base[st-1]+(base[st]-base[st-1])*u}
 const r=KG.price.ticket/kFairT(),priceF=kcl(1.15-(r-.85)*V.priceSens*.9,.3,1.3);
 const q=kPQavg();let att=1+(KG.b.kinder?.07:0)+(KG.b.school?.05:0)+(KG.b.hut&&st>=(V.hut?V.hut.st:2)?.06:0)+(KG.b.kiosk?.02:0)+(V.att?V.att():0);
 let cmp=0;for(const c of KG.cmp)cmp+=c.eff;
 const d=b*KWF[kWd()]*((KVOR.wxF&&KVOR.wxF[KG.wx])||KWXF[KG.wx]||1)*(.35+KG.ruf/100*.95)*(.8+.1*kStars())*priceF*att*(.72+.28*q/100)*(1+cmp);
 return Math.round(d)}
function kPQavg(){let s=0,n=0;for(const p of KW.pistes){if(p.conn||!kPisteOpen(p))continue;s+=KG.pq[p.id];n++}return n?s/n:100}
function kArrRate(t){if(t<8||t>=13.1)return 0;return t<9?1:t<10.6?1.6:t<12?.8:.62}
const KARRI=1*1+1.6*1.6+.8*1.4+.62*1.1;
// --- Wertung ---
function kOffer(){if(KVOR.offer)return KVOR.offer();let o=0;const l=KG.l,b=KG.b;if(l.tl&&l.tl.on)o+=40;if(l.ses&&l.ses.on){o+=90;if(l.ses.typ==='s4')o+=40;if(l.ses.typ==='s6')o+=70}
 for(const k in l)o+=(l[k].lg||0)*10;
 for(const p of KW.pistes)if(kPisteOpen(p))o+=p.id==='ueb'?15:30;
 o+=(b.kinder?45:0)+(b.school?30:0)+(b.hut?50:0)+(b.kiosk?15:0)+(b.raupe?30:0)+(b.cannons?35:0)+(KG.hotel?45:0)+(b.bus?20:0)+(b.bw?15:0)+(b.lw?10:0)+(KG.paved?15:0)+(KG.stage-1)*40;
 for(const L of KVOR.lots)if(!L.base&&KG.lots[L.id])o+=15;return o}
function kScore(){return Math.round(kOffer()*.6+KG.ruf*2.2+kPQavg()*.8)}
const KSTH=[0,0,300,420,540,660];
const kSTH=()=>KVOR&&KVOR.starTh||KSTH;
function kStars(){if(!KG)return 1;const s=kScore(),TH=kSTH();let n=1;for(let i=2;i<=5;i++)if(s>=TH[i])n=i;return n}
function kRank(){const me=kScore();return 1+KG.rv.filter(v=>v>me).length}
function kCredit(){const H=KG.hist.slice(-7);let avg=0;if(H.length)avg=H.reduce((a,h)=>a+h.inc,0)/H.length;return Math.round(Math.max(KVOR&&KVOR.credMin||5000,avg*8)*(KPK('bank')?1.5:1)/100)*100}
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
 if(KVOR.tick)KVOR.tick(dt,dth);
 const ar=kArrRate((KG.fog?KG.t-.6:KG.t)+(KVOR.arrShift||0));if(ar>0&&KG.dem>0){const car=KG.dem*(1-(KG.busShare||0))-KW.hotelN;KW.arrAcc=(KW.arrAcc||0)+Math.max(0,car)*ar/KARRI*dth/2.9;while(KW.arrAcc>=1){KW.arrAcc-=1;kSpawnCar(kMix())}}
 // Busse
 if(KG.b.bus){const BT=KVOR.busT?KVOR.busT():[8.65,9.65,10.65];for(const bt of BT)if(t0<bt&&KG.t>=bt){kSpawnBus(Math.round(KG.dem*(KG.busShare||0)/BT.length))}for(const bt of (KVOR.busPickT?KVOR.busPickT():[15.3,16.05,16.7]))if(t0<bt&&KG.t>=bt)kSpawnBus(0,1)}
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
   case 'hurt':if(!KG.b.bw&&KG.t>f.hT+.7){f.sat-=5;f.hurtOK=1;kGoHome(f,1)}break;
   case 'busw':if(KG.t>17.2){f.st='gone'}break;
   default:if(KVOR.folkStep)KVOR.folkStep(f,dt)}
  if(f.st==='gone'&&!f.dead){f.dead=1;kGuestDone(f)}}
 if(KW.folks.some(f=>f.dead))KW.folks=KW.folks.filter(f=>!f.dead);
 for(const c of KW.cars)(KVOR.carStep||kCarStep)(c,dt);if(KW.cars.some(c=>c.st==='gone'))KW.cars=KW.cars.filter(c=>c.st!=='gone');
 for(const b of KW.buses)(KVOR.busStep||kBusStep)(b,dt);if(KW.buses.some(b=>b.st==='gone'))KW.buses=KW.buses.filter(b=>b.st!=='gone');
 // Unfälle
 if(KW.acc&&KW.acc.length&&KG.t>=KW.acc[0]){KW.acc.shift();const S=KW.folks.filter(f=>f.st==='ski'&&!f.grpRun&&f.pid!=='ueb'&&!KW.pmap[f.pid].conn&&!f.engHold);if(S.length&&!KW.res){const f=kpick(S);f.hurtAt=f.s+20}}
 kResStep(dt);kGroomStep(dt);kCanStep(dt,dth);
 // Sicherheitsnetz: abends alle weg
 if(KG.t>=19&&KG.t<19+dth*2){for(const f of KW.folks){if(f.st!=='gone'&&!f.dead){f.st='gone'}}for(const c of KW.cars)if(c.st==='park'){c.st='out';c.tw=kR()}}
 for(const p of KW.pops)p.t+=dt;KW.pops=KW.pops.filter(p=>p.t<1.1);
 // Ziele prüfen
 kGoalCheck();}
function kRidePos(f){const c=f.ch;if(!c){f.st='walk';return}const o=KW.lift[f.lid],p=kLiftPos(o,c.u),i=c.r.indexOf(f),cap=o.T.cap;
 if(o.T.drag){f.x=p[0]+1+(i>0?-5:0);f.y=p[1]+9+(i>0?1:0);f.sv=0}else{f.x=p[0];f.y=p[1]+8}}
function kGuestDone(f){if(f.ins||f.ty==='staff')return;const k=f.kid?'fam':f.ty,S=KG.sat;const s=kcl(f.sat,0,100);(S[k]||(S[k]={n:0,s:0}));S[k].n++;S[k].s+=s;KG.res.satN=(KG.res.satN||0)+1;KG.res.satS=(KG.res.satS||0)+s}
// --- Morgen ---
function kMorning(){KG.wx=KG.wxN||'sonne';KG.dem=kDemand();KG.gDay=0;KG.rej=0;KG.inc={};KG.cost={};KG.sat={};KG.res={};KW.arrAcc=0;
 KG.busShare=KG.b.bus&&KG.dem>0?Math.min(.3,90/KG.dem):0;
 // Hotel
 KW.hotelN=0;if(KG.hotel){const H=KVOR.hotel,r=KG.price.hotel/KVOR.fair.hotel,occ=kcl(.2+.11*kStars()+KG.ruf/420-(r-1)*.9,.08,1);KG.hOcc=occ;KW.hotelN=Math.round(H.rooms*occ*1.7)}
 // Pannen und Unfälle planen
 for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;const p=KVOR.brkP?KVOR.brkP(id,s):.025+(1-s.cond/100)*.32;if(kR()<p){s.brkAt=9.4+kR()*5.6}else s.brkAt=0}
 const lam=.3+(KG.stage>=2?.35:0)+(kPQavg()<55?.4:0);KW.acc=[];let n=lam>1?1:0;if(kR()<lam%1)n++;for(let i=0;i<n;i++)KW.acc.push(9.6+kR()*5.5);KW.acc.sort((a,b)=>a-b);
 KG.fog=0;if(KVOR.morning)KVOR.morning();
 if(KVOR.windLog)KVOR.windLog();else if(KG.wx==='sturm')kLog('🌪️',KVOR.lifts.filter(L=>!KLT[KG.l[L.id].typ].drag&&KG.l[L.id].on).length>1?'Sturm – die Sessellifte bleiben heute zu.':'Sturm – der Sessellift bleibt heute zu.');
 kSave()}
// --- Mitternacht: Tagesabschluss ---
function kMidnight(){const V=KVOR,d=KG.day;
 // laufende Kosten
 const tm=KPK('team')?.8:1,c={};let up=0;for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;up+=KLT[s.typ].up*(kLC(id).upF||1)+(s.lg||0)*30}c.lift=up*(KPK('team')?.9:1);
 c.kassa=90*tm;if(KG.b.hut)c.hut=110*tm;if(KG.b.kinder)c.kinder=80*tm;if(KG.b.school)c.school=70*tm;if(KG.b.kiosk)c.kiosk=30*tm;
 if(KG.b.raupe)c.raupe=130;if(KG.canRan)c.can=Math.round((V.canCost?V.canCost():260)*(KPK('schnee')?.9:1));KG.canRan=0;if(V.costs)V.costs(c,tm);
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
 const fs=KG.sat.fam;let famA=null;if(fs&&fs.n>=5){famA=fs.s/fs.n;if(famA>=75&&V.famGoal){KG.famOK=(KG.famOK||0)+1;kLog('👨‍👩‍👧','Familien heute zu '+Math.round(famA)+' % zufrieden – Ziel: '+Math.min(5,KG.famOK)+' von 5 Tagen.')}}
 KG.hist.push({d,inc:Math.round(inc),cost:cs,g,rej:KG.rej,sat:satA==null?null:Math.round(satA),fam:famA==null?null:Math.round(famA),ruf:Math.round(KG.ruf),m:Math.round(KG.money),wx:KG.wx,st:kStars()});if(KG.hist.length>60)KG.hist.shift();
 KG.seaInc=(KG.seaInc||0)+inc;KG.seaCost=(KG.seaCost||0)+cs;
 KG.lastDay={inc:Math.round(inc),cost:cs,g,sat:satA,c,i:Object.assign({},KG.inc)};
 // Schnee und Pisten
 const dw=(V.snowDW||{neuschnee:16,sturm:5,tau:-8,sonne:-1.5})[KG.wx]||0;KG.snow=Math.max(0,KG.snow+dw);
 for(const p of V.pistes){if(KG.wx==='tau')KG.pq[p.id]-=(V.tauPQ||12);if(KG.wx==='neuschnee')KG.pq[p.id]=Math.max(KG.pq[p.id],82);KG.pq[p.id]=kcl(KG.pq[p.id],0,kSnowCap())}if(V.midnight)V.midnight();
 // Lifte altern
 for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;s.cond=Math.max(15,s.cond-(.9+(KW.lift[id]?KW.lift[id].cnt:0)/500));if(KW.lift[id])KW.lift[id].cnt=0}
 // Konkurrenz
 KG.rv=KG.rv.map(v=>Math.round(v+(.8+kR()*2.2)*(V.rivG||1)));
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
 else if(b.k==='up'){if(b.typ)kUpLift(b.lift,b.typ,b.quiet);else kUp4()}
 if(KVOR.applied)KVOR.applied(b);
 kLog('✅',b.n+' ist fertig.');if(KG.t<13)KG.dem=kDemand();kRebuild();kUIdirty();kSave()}
// --- Pistenraupe ---
function kGroomPlan(){if(KVOR.groomPlan)return KVOR.groomPlan();const out=[];const ps=KW.pistes.filter(p=>!p.conn&&kPisteOpen(p)).sort((a,b)=>(b.id==='main')-(a.id==='main'));
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
function kCanPos(){if(KW.canP)return KW.canP;if(KVOR.canPos)return KW.canP=KVOR.canPos();const out=[];const p=KW.pmap.main,L=p.d[p.d.length-1][3];let sd=1;const n=KVOR.cannons.n;
 const okP=(x,y)=>{if(kOnP(x,y,6))return 0;for(const L of KVOR.lifts){const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(Math.hypot(x-L.b[0]-dx*u,y-L.b[1]-dy*u)<30)return 0}for(const b of KST.blocks)if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])return 0;return 1};
 for(let i=0;i<n*2&&out.length<n;i++){const s=L*(.1+.82*(i%n)/(n-1))+(i>=n?18:0),q=kAt(p.d,s);for(const sg of [sd,-sd]){const x=q[0]+q[3]*(q[2]+13)*sg,y=q[1]+q[4]*(q[2]+13)*sg;if(okP(x,y)){out.push({x,y,sd:sg,ph:kR()*20});break}}sd=-sd}
 const u=KW.pmap.ueb;for(const s of [40,120]){const q=kAt(u.d,s);const sg=q[3]<0?1:-1;const x=q[0]+q[3]*(q[2]+12)*sg,y=q[1]+q[4]*(q[2]+12)*sg;if(okP(x,y))out.push({x,y,sd:sg,ph:kR()*20})}
 return KW.canP=out}
function kCanStep(dt,dth){if(!KG.b.cannons)return;const t=KG.t,night=t>=20||t<5;KW.canOn=night&&KG.canAuto!==0&&KG.snow<75;if(KW.canOn){KG.canRan=1;KG.canEver=1;KG.snow+=dth*.85*(KVOR.canF?KVOR.canF(dth):1)}}
// --- Pannen ---
function kBrkStep(){const t=KG.t;for(const id in KG.l){const s=KG.l[id];if(!s.on)continue;
 if(s.brkAt&&t>=s.brkAt&&!s.brk&&kLiftOpen(id)){const lw=KG.b.lw,dur=lw?(KPK('team')?.3:.45):1.2;s.brk={t0:t,end:t+dur,lw};s.brkAt=0;if(KVOR.onBrk)KVOR.onBrk(id);
  if(!lw){kSpend('tech',650);kLog('🔧',kLC(id).n+': Störung! Ohne Liftwart kommt ein Techniker von außen (650 €, über 1 Stunde).')}else kLog('🔧',kLC(id).n+': Störung – der Liftwart repariert.');kUIdirty()}
 if(s.brk&&t>=s.brk.end){s.brk=null;s.cond=Math.min(100,s.cond+6);kLog('✅',kLC(id).n+' läuft wieder.');kUIdirty()}}}
// --- Saisonende ---
function kSeasonEnd(){KG.seaHist.push({n:kSeaN()-1,inc:Math.round(KG.seaInc),cost:Math.round(KG.seaCost),res:kSeaRes(),st:kStars(),rank:kRank()});
 kGoalCheck(1);const last=kSeaN()-1>=KVOR.seasons;if(last){KG.done=1;kSave();kBergEnd(0);return}
 // weitere Saison (für spätere Berge): Ruf vergisst etwas, Saisonwerte zurücksetzen
 KG.ruf=Math.max(20,KG.ruf-15);KG.seaInc=0;KG.seaCost=0;KG.seaBau=0;KG.seaWer=0;KG.snow=KVOR.snow0||40;KG.wat=100;kSave();kSeaWin()}
// --- Ziele ---
function kGoalCheck(fin){if(!KG||!KVOR)return;for(const g of KVOR.goals){if(KG.goals[g.k])continue;if(g.end&&!fin)continue;if(g.ok()){KG.goals[g.k]=1;if(!fin){kLog('🎯','Ziel geschafft: '+g.t);kToast('🎯 Ziel geschafft: '+g.sh,4000)}}}}
function kBergStars(){const g=KG.goals;if(!g.pf)return 0;return 1+(g.zu?1:0)+(g.me?1:0)}
// --- Neu freigeschaltet ---
function kNeu(st){const I=KVOR.stageInfo[st];KW.neu={st,n:I.n,d:I.d};kUIdirty()}
function kRebuild(){KW.canP=null;KW.hutS=kHutS();kBuildStatic()}
function kHutS(){if(!KVOR.hut)return 0;const p=KW.pmap[KVOR.hut.pid||'main'],H=KVOR.hut.in[0];let best=0,bd=1e9;for(const q of p.d){const d=Math.hypot(q[0]-H[0],q[1]-H[1]);if(d<bd){bd=d;best=q[3]}}return best}

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
  kDrawWear(c);if(KVOR.drawDyn)KVOR.drawDyn(c,T0);
  const O=[];const add=(y,f)=>O.push({y,f});
  kDrawFences(c);
  for(const car of KW.cars)if(kInV(car.x,car.y))add(car.y+(car.st==='park'?-4:6),c2=>car2(c2,car));
  for(const b of KW.buses)if(kInV(b.x,b.y))add(b.y+8,c2=>bus(c2,b.x,b.y,b.a!=null?b.a:b.dir>0?0:Math.PI,'#2e9e5b','SKIBUS'));
  kDrawBuildings(add,T0);
  for(const f of KW.folks){if(f.hide||KVOR.hideF&&KVOR.hideF(f)||f.delay>0||f.st==='ride'&&KW.lift[f.lid]&&!KW.lift[f.lid].T.drag||f.st==='gone'||f.st==='kas'&&0)continue;if(!kInV(f.x,f.y,20))continue;add(f.y,c2=>kPerson(c2,f,T0))}
  if(KW.groom&&KW.groom.st!=='home'){const R=KW.groom;add(R.y,c2=>groomer(c2,R.x,R.y,R.a-Math.PI/2,T0,true))}
  if(KW.res){const R=KW.res;add(R.y,c2=>kSled(c2,R,T0))}
  if(KG.b.cannons)for(const p of kCanPos())if(kInV(p.x,p.y))add(p.y,c2=>{c2.save();c2.translate(p.x,p.y);c2.scale(p.sd>0?-1:1,1);cannonN(c2,0,0,KW.canOn?1:0,T0+p.ph);c2.restore()});
  O.sort((a,b)=>a.y-b.y);for(const o of O)o.f(c);
  kDrawLifts(c,T0);
  if(KW.canOn&&KG.b.cannons)kCanSpray(c,T0);
 });
 kDrawNight(c);if(KVOR.drawOver)KVOR.drawOver(c,T0);kDrawWeather(c);
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
function kDrawWear(c){for(const p of KW.pistes){if(p.conn||!kPisteOpen(p))continue;const q=KG.pq[p.id];if(q>85)continue;const a=(85-q)/85;const r=kRNG(p.d.length);c.fillStyle='rgba(170,185,205,'+(.28*a).toFixed(3)+')';for(let i=0;i<p.d.length;i+=6){const d=p.d[i];if(!kInV(d[0],d[1],60)||!kPtOpen(p,d))continue;if(r()>a*.9)continue;const o=(r()*2-1)*.8;c.beginPath();c.ellipse(d[0]+d[3]*d[2]*o,d[1]+d[4]*d[2]*o,6+r()*10,2+r()*3,0,0,7);c.fill()}}}
// Anstell-Gitter + Wartezeit-Schild
function kDrawFences(c){for(const id in KW.lift){const o=KW.lift[id];if(!KG.l[id].on)continue;if(KVOR.fence&&KVOR.fence(c,o,id))continue;const L=o.L,bx=L.b[0],by=L.b[1];c.strokeStyle='#8a94a8';c.lineWidth=1;
 if(o.T.cap===1){for(let r=-1;r<4;r++){const y=by+14.5+r*7;let a=bx-19,b=bx+19;if(r>=0&&r<3){if(r%2===0)b=bx+12;else a=bx-12}c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.stroke();c.fillStyle='#5d667a';for(let x=a;x<=b;x+=12)c.fillRect(x-.7,y-1.4,1.4,2.8)}}
 else{const R=Math.max(6,Math.min(9,Math.ceil(o.q.length/9)+1));for(let r=-1;r<R;r++){const y=by+12+r*8;let a=bx-14-8*7-5,b=bx-8;if(r>=0&&r<R-1){if(r%2===0)a=bx-14-8*7+3;else b=bx-18}c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.stroke();c.fillStyle='#5d667a';for(let x=a;x<=b;x+=13)c.fillRect(x-.8,y-1.6,1.6,3.2)}c.beginPath();c.moveTo(bx-14-8*7-5,by+4);c.lineTo(bx-14-8*7-5,by+12+(R-1)*8);c.stroke()}
 const w=kWait(id),x=o.T.cap===1?bx-30:bx-82,y=by+(o.T.cap===1?20:6);c.fillStyle='#5d667a';c.fillRect(x-.8,y,1.6,14);c.fillStyle=w>22?'#e8504a':w>8?'#f2a63b':'#2e9e5b';c.beginPath();c.roundRect(x-16,y-12,32,13,2.5);c.fill();c.fillStyle='#fff';c.font='700 5.6px Fredoka,sans-serif';c.textAlign='center';c.fillText('WARTEZEIT',x,y-6.4);c.font='600 5px Fredoka,sans-serif';c.fillText(w<1?'keine':Math.round(w)+' Min.',x,y-1.4)}}
function kWait(id){const o=KW.lift[id];if(!o)return 0;// Schätzung aus Schlangenlänge und Förderleistung
 const perS=o.T.v/(o.len*2/o.n)*o.T.cap;const s=o.q.length/Math.max(.1,perS);return s/KRT*60}
// Lifte: Seile, Stützen, Sessel/Teller
function kDrawLifts(c,t){const vw=kViewW(),vh=kViewH();for(const id in KW.lift){const o=KW.lift[id];if(!KG.l[id].on&&!o.run)continue;const {bx,by,tx,ty,len,ux,uy}=o,co=o.T.co;
 if(Math.max(bx,tx)<kZ.camX-80||Math.min(bx,tx)>kZ.camX+vw+80||Math.max(by,ty)<kZ.camY-80||Math.min(by,ty)>kZ.camY+vh+80)continue;
 if(KVOR.liftLook&&KVOR.liftLook(c,o,t))continue;
 if(o.T.cap===1){c.strokeStyle='#2a2e44';c.lineWidth=.8;c.beginPath();c.moveTo(bx,by-14);c.lineTo(tx,ty-14);c.stroke();
  const n=Math.max(2,Math.ceil(len/70));for(let i=1;i<n;i++){const px=bx+(tx-bx)*i/n,py=by+(ty-by)*i/n;c.fillStyle='rgba(110,140,180,.25)';c.beginPath();c.ellipse(px+3,py+2,5,1.6,0,0,7);c.fill();c.fillStyle='#6a6890';c.fillRect(px-1,py-17,2,18);c.fillStyle='#3a3f58';c.fillRect(px-4,py-17,8,1.6)}
  for(const ch of o.ch){if(ch.u>=1)continue;const x=bx+(tx-bx)*ch.u,y=by+(ty-by)*ch.u-14;c.strokeStyle='#2a2e44';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+9);c.stroke();c.fillStyle='#f2c53b';c.beginPath();c.arc(x,y+10,1.6,0,7);c.fill()}
  continue}
 c.strokeStyle='#161a28';c.lineWidth=1.2;const px=-uy,py=ux;for(const sd of [-1,1]){c.beginPath();c.moveTo(bx+px*co*sd,by+py*co*sd);c.lineTo(tx+px*co*sd,ty+py*co*sd);c.stroke()}
 const n=Math.max(2,Math.ceil(len/110));for(let i=1;i<n;i++){const x=bx+(tx-bx)*i/n,y=by+(ty-by)*i/n;if(kInV(x,y))pylonN(c,x,y,co+3)}
 const cap=o.T.cap;for(const ch of o.ch){if(ch.u<.03||ch.u>1.97||Math.abs(ch.u-1)<.03)continue;const [x,y]=kLiftPos(o,ch.u);if(!kInV(x,y,30))continue;const k={r:ch.r.map(f=>({col:f.col}))};c.save();c.translate(x,y);c.rotate(Math.sin(ch.u*40+t*.8)*.04);gondola(c,k,cap);c.restore()}
 }}
// Gebäude
function kDrawBuildings(add,t){const V=KVOR;if(V.drawB)return V.drawB(add,t);
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
 if(KG.b.bw)add(V.bwHut.y,c=>kBwHut(c,V.bwHut.x,V.bwHut.y,t));
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
function kHotelDraw(c,H,t){chalet(c,H.x,H.y,H.w,H.h,H.k);kSign(c,H.x,H.y-H.h-24,H.sign||H.n.toUpperCase(),'#8f5a34','#fff',5.4);for(const [wx,wy] of chWin(H.x,H.y,H.w,H.h))kWin(wx,wy,6,6);
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
  for(const [x,y] of KVOR.lamps())kLamp(c,x,y-22,g)
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
 for(const L of V.lifts){if(!KG.l[L.id].on&&!KG.bau.find(b=>b.lift===L.id))continue;if(d(L.b[0],L.b[1])<40)hit.push({k:'l:'+L.id,d:0});else if(d(L.t[0],L.t[1]+6)<34)hit.push({k:'l:'+L.id,d:.5});
  // Seil antippen
  const dx=L.t[0]-L.b[0],dy=L.t[1]-L.b[1],l2=dx*dx+dy*dy,u=kcl(((x-L.b[0])*dx+(y-L.b[1])*dy)/l2,0,1);if(KG.l[L.id].on&&d(L.b[0]+dx*u,L.b[1]+dy*u)<14)hit.push({k:'l:'+L.id,d:1})}
 if(d(V.kassa.x,V.kassa.y-14)<32)hit.push({k:'kas',d:0});if(KG.b.kiosk&&d(V.kassa.x+38,V.kassa.y)<16)hit.push({k:'kio',d:0});
 if(KG.b.hut&&d(V.hut.x,V.hut.y-12)<40)hit.push({k:'hut',d:0});
 if(KG.b.kinder&&V.kinder&&Math.hypot((x-V.kinder.x)/V.kinder.rx,(y-V.kinder.y)/V.kinder.ry)<1.1)hit.push({k:'kid',d:0});
 if(KG.b.school&&V.school&&d(V.school.x,V.school.y-12)<30)hit.push({k:'sch',d:0});
 if(V.hit)V.hit(x,y,hit,d);
 if(KG.b.raupe&&d(V.garage.x,V.garage.y-10)<32)hit.push({k:'rau',d:0});
 if(KG.hotel&&d(V.hotel.x,V.hotel.y-14)<40)hit.push({k:'hot',d:0});
 for(const L of V.lots)if(KG.lots[L.id]&&x>L.x0&&x<L.x1&&y>L.y0-6&&y<L.y1+6)hit.push({k:'park',d:2});
 for(const p of KW.pistes)if(!p.conn&&kPisteOpen(p)){for(let i=0;i<p.d.length;i+=4){const q=p.d[i];if(kPtOpen(p,q)&&d(q[0],q[1])<q[2]){hit.push({k:'p:'+p.id,d:3});break}}}
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
.kopt{border-radius:16px;padding:10px 12px;margin:8px 0;background:var(--chip);border:2px solid transparent}.kopt.a{background:#fff6ea;border-color:#e8a33a}.kopt.n{background:#eef6ff;border-color:#3a78d0}
.kopt h4{margin:0 0 4px;font-size:15.5px;display:flex;justify-content:space-between;gap:8px;color:#23324a}.kopt h4 span{white-space:nowrap}
.kopt ul{margin:4px 0 8px;padding:0;list-style:none;font-size:13px;line-height:1.4;color:#23324a}.kopt li.p:before{content:'＋ ';color:#2e9e5b;font-weight:700}.kopt li.m:before{content:'－ ';color:#e8504a;font-weight:700}
.kzb{height:10px;border-radius:6px;background:#e3e9f1;overflow:hidden;margin:4px 0 2px}.kzb i{display:block;height:100%;background:linear-gradient(90deg,#e8504a,#f2a63b)}
.kold{display:grid;grid-template-columns:1fr auto auto;gap:4px 10px;font-size:12.5px;align-items:center;padding:4px 0}.kold b{font-size:13px}.kold .h{color:var(--mut);font-size:11.5px}
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
 if(KVOR&&KVOR.act&&KVOR.act(a,v))return;
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
function kReq(r){const [k,a]=r;if(KVOR.req){const q=KVOR.req(r);if(q!=null)return q}if(k==='can')return !!KG.b.cannons;if(k==='tl')return !!KG.l.tl.on;if(k==='ruf')return KG.ruf>=a;if(k==='gst')return KG.gT>=a;if(k==='stars')return kStars()>=a;if(k==='ses4')return KG.l.ses.typ==='s4';return false}
function kBuildItems(){if(KVOR.items)return KVOR.items();const C=kCosts(),V=KVOR,st=KG.stage,l=KG.l,b=KG.b,bau=id=>KG.bau.find(x=>x.id===id||x.lift===id);
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
 if(KVOR.buy&&KVOR.buy(id,I,pay)){}
 else if(id==='st2'||id==='st3'){const s=+id[2];pay();kBauStart({k:'stage',st:s,n:'Ausbau Stufe '+s,days:I.days,lift:s===2?'ses':null,id:'st'+s})}
 else if(id==='tl'){pay();kBauStart({k:'lift',id:'tl',n:'Tellerlift',days:0})}
 else if(id==='lgT'||id==='lgS'){pay();const L=id==='lgT'?'tl':'ses';KG.l[L].lg=(KG.l[L].lg||0)+1;kLiftSetup(L);kLog('💺',(id==='lgT'?'Mehr Teller':'Mehr Sessel')+' eingebaut.')}
 else if(id==='s4'){pay();if(I.days>0){KG.bau.push({k:'up',id:'s4',lift:'ses',n:'4er-Sessel',d0:KG.day,days:I.days});kLog('🚧','Umbau auf 4er-Sessel – der Lift steht bis zum Morgen.');KG.l.ses.on=0}else kUp4()}
 else if(id==='raupe'||id==='can'||id==='kiosk'||id==='lw'||id==='bw'||id==='bus'){pay();KG.b[id==='can'?'cannons':id]=1;kLog('✅',I.n+' – gekauft.');if(id==='bus')kLog('🚌','Ab morgen fahren die Skibusse.')}
 else if(id==='kinder'||id==='school'||id==='hut'||id==='hotel'){pay();kBauStart({k:'b',id,n:I.n,days:I.days})}
 else if(id==='po'){pay();KG.lots.po=1;kLog('🅿️','Parkplatz Ost ist offen.')}
 else if(id==='paved'){pay();KG.paved=1}
 if(KG.t<13)KG.dem=kDemand();kSfx();kRebuild();kUI();kHud(1);kSave()}
function kUp4(){KG.l.ses.typ='s4';KG.l.ses.on=1;kLiftSetup('ses');kLog('🚡','Der Sonnenhang-Sessel ist jetzt ein 4er-Sessel.')}
function kUpLift(id,typ,quiet){KG.l[id].typ=typ;KG.l[id].on=1;kLiftSetup(id);if(!quiet)kLog('🚡',kLC(id).n+' ist jetzt ein '+KLT[typ].n+'.')}
function kSfx(){try{if(typeof sfx==='function')sfx('build',300)}catch(e){}}
// --- Preise ---
function kPreItems(){const F=KVOR.fair,b=KG.b;const I=[{k:'ticket',ic:'🎫',n:'Tageskarte',f:Math.round(kFairT()),min:5,max:80,st:1,sub:'Halbtag ab 12 Uhr: 60 % · Kinder: 50 %'},{k:'park',ic:'🅿️',n:'Parken',f:F.park,min:0,max:20,st:1}];
 I.push({k:'food',ic:'🍲',n:'Mittagsmenü',f:F.food,min:5,max:40,st:1,sub:b.hut?KVOR.hut.n+' · Kiosk-Snack: 55 %':'Kiosk-Snack: 55 % davon',hide:!b.hut&&!b.kiosk});
 I.push({k:'kids',ic:'⭐',n:'Kinderland Eintritt',f:F.kids,min:0,max:30,st:1,hide:!b.kinder});I.push({k:'school',ic:'⛷️',n:'Skikurs (2 Stunden)',f:F.school,min:5,max:80,st:1,hide:!b.school});I.push({k:'hotel',ic:'🏨',n:(KVOR.hotel?KVOR.hotel.n:'Gasthof')+' je Nacht',f:F.hotel,min:20,max:150,st:2,hide:!KG.hotel});
 return I.filter(i=>!i.hide)}
function kPreHTML(){let h=kHead('💰 Preise')+'<p class="hint" style="margin:8px 0 4px">'+KVOR.preHint+'</p>';
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
function kVoices(){const out=[];let w=0;for(const id in KW.lift)if(KG.l[id].on)w=Math.max(w,kWait(id));const wt=0;const r=KG.price.ticket/kFairT();if(KVOR.voices)KVOR.voices(out);
 if(Math.max(w,wt)>15)out.push(['⏳','„Die Schlange am Lift ist viel zu lang!“']);if(r>1.15)out.push(['💸','„Die Tageskarte ist hier ganz schön teuer.“']);else if(r<.9)out.push(['💶','„So günstig – toll für Familien!“']);
 if(kPQavg()<60)out.push(['🧊','„Die Piste ist ganz zerfahren.“']);if(KVOR.kinder){if(!KG.b.kinder)out.push(['👧','„Für die Kleinen gibt es hier nicht viel.“']);else out.push(['⭐','„Das Kinderland ist super!“'])}
 if(!KG.b.hut&&!KG.b.kiosk)out.push(['🍽️','„Wo kann man hier etwas essen?“']);if(KG.rej>3)out.push(['🅿️','„Kein Parkplatz mehr frei – wir sind umgedreht.“']);if(KG.res.hurt&&!KG.b.bw)out.push(['⛑️','„Nach dem Unfall hat lange niemand geholfen.“']);
 if(KVOR.id==='sonn'&&KG.stage<2&&KG.gT>40)out.push(['🚡','„Ein richtiger Lift auf den Berg wäre schön.“']);if(!out.length)out.push(['😊','„Schöner Tag '+(KVOR.am||'in '+KVOR.n)+'!“']);return out.slice(0,5)}
// --- Statistik ---
function kStaHTML(){const tabs=[['heu','📅','Heute'],['ver','📈','Verlauf'],['gst','👥','Gäste'],['fin','💶','Finanzen']];if(KVOR.staTab)tabs.splice(1,0,KVOR.staTab);if(!KW.tab||!tabs.some(t=>t[0]===KW.tab))KW.tab='heu';let h=kHead('📊 Statistik',tabs);
 if(KW.tab==='heu'){const g=KG.gDay,inc=KG.inc;const L=[['tk','🎫 Tageskarten'],['pk','🅿️ Parken'],['food','🍲 Essen'],['kid','⭐ Kinderland'],['sch','⛷️ Skischule'],['hot','🏨 '+(KVOR.hotel?KVOR.hotel.n:'Gasthof')],['nos','🪑 Nostalgiefahrt']];let tot=0;for(const [k] of L)tot+=inc[k]||0;
  h+=`<div class="kpi"><div><small>Gäste heute</small><b>${g}</b>${KG.rej?`<i class="neg">${KG.rej} Autos abgewiesen</i>`:''}</div><div><small>Einnahmen heute</small><b>${kfmt(tot)}</b></div></div>`;
  h+=`<div class="wx wx2"><div><small>Heute</small>${KWI[KG.wx]} ${KWNM[KG.wx]}</div><div><small>Morgen</small>${KWI[KG.wxN]} ${KWNM[KG.wxN]}</div><div><small>Schnee</small>❄️ ${Math.round(KG.snow)} cm</div></div>`;
  h+='<div class="bgh">Einnahmen nach Quelle</div>'+L.filter(([k])=>inc[k]).map(([k,n])=>`<div class="row"><span>${n}</span><b>${kfmt(inc[k])}</b></div>`).join('')+(tot?'':'<p class="hint">Noch keine Einnahmen heute.</p>');
  h+='<div class="bgh">Lifte und Pisten</div>';for(const L2 of KVOR.lifts){if(!KG.l[L2.id].on)continue;h+=`<div class="row"><span>${L2.typ==='teller'?'🎿':'🚡'} ${L2.n}</span><b>Warten ${Math.round(kWait(L2.id))} Min.</b></div>`}
  for(const p of KW.pistes)if(!p.conn&&kPisteOpen(p))h+=`<div class="row"><span>${p.col==='r'?'🔴':p.col==='s'?'⚫':'🔵'} ${p.n}</span><b>Zustand ${Math.round(KG.pq[p.id])} %</b></div>`;
  if(KVOR.staExtra)h+=KVOR.staExtra()}
 if(KVOR.staTab&&KW.tab===KVOR.staTab[0])h+=KVOR.staTabHTML();
 if(KW.tab==='ver'){const H=KG.hist.slice(-14);const mx=Math.max(1,...H.map(x=>Math.max(x.inc,x.cost)));h+='<div class="bgh">Einnahmen 🟩 und Kosten 🟥 je Tag</div><div class="kbars">'+H.map(x=>`<div><i style="height:${Math.round(x.inc/mx*80)}px;background:#5fc27a"></i><i style="height:${Math.round(x.cost/mx*80)}px;background:#e8806f"></i><small>${KWN[(x.d-1)%7][0]}${KWN[(x.d-1)%7][1].toLowerCase()}</small></div>`).join('')+'</div>';
  const gm=Math.max(1,...H.map(x=>x.g));h+='<div class="bgh">Gäste je Tag</div><div class="kbars">'+H.map(x=>`<div><i style="height:${Math.round(x.g/gm*80)}px;background:#5aa7e6"></i><small>${x.g}</small></div>`).join('')+'</div>';
  if(!H.length)h+='<p class="hint">Nach dem ersten Tag erscheinen hier die Balken.</p>'}
 if(KW.tab==='gst'){const S=KG.sat,N={fam:'👨‍👩‍👧 Familien',anf:'🔰 Anfänger',pro:'⛷️ Profis',sb:'🏂 Snowboarder'};h+='<div class="bgh">Heute abgereiste Gäste · Zufriedenheit</div>';
  for(const k in N){const s=S[k];h+=`<div class="row"><span>${N[k]}</span><b>${s&&s.n?Math.round(s.s/s.n)+' % · '+s.n:'–'}</b></div>`}
  if(KVOR.famGoal)h+=`<div class="bgh">Ziel Familien</div><div class="row"><span>Tage mit Familien ≥ 75 % zufrieden</span><b>${Math.min(5,KG.famOK||0)} / 5</b></div><p class="hint">Familien mögen faire Preise, kurze Wartezeiten, das Kinderland und ein Mittagessen. Gezählt wird ein Tag ab 5 Familien-Gästen.</p>`}
 if(KW.tab==='fin'){const inc=KG.seaInc||0,cost=KG.seaCost||0;h+=`<div class="kpi"><div><small>Saison: Einnahmen</small><b>${kfmt(inc)}</b></div><div><small>Saison: laufende Kosten</small><b>${kfmt(cost)}</b></div><div><small>Betriebsergebnis</small><b class="${inc-cost>=0?'pos':'neg'}">${kfmt(inc-cost)}</b></div><div><small>Gebaut + Werbung</small><b>${kfmt((KG.seaBau||0)+(KG.seaWer||0))}</b></div></div>`;
  const L=KG.lastDay;if(L){h+='<div class="bgh">Kosten gestern</div>';const N={teich:'💧 Speicherteich',lift:'🚡 Lifte',kassa:'🎫 Kassa',hut:'🛖 '+(KVOR.hut?KVOR.hut.n:'Hütte'),kinder:'⭐ Kinderland',school:'⛷️ Skischule',kiosk:'🌭 Kiosk',raupe:'🚜 Pistenraupe',can:'❄️ Schneekanonen (Strom)',lots:'🅿️ Parkplätze',bus:'🚌 Skibus',hotel:'🏨 '+(KVOR.hotel?KVOR.hotel.n:'Gasthof'),lw:'🔧 Liftwart',bw:'⛑️ Bergwacht',zins:'🏦 Zinsen'};for(const k in L.c)h+=`<div class="row"><span>${N[k]||k}</span><b>${kfmt(L.c[k])}</b></div>`}
  h+=`<div class="bgh">Kredit</div><div class="row"><span>Kreditrahmen</span><b>${kfmt(kCredit())}</b></div><p class="hint">Die Kassa darf bis zum Kreditrahmen ins Minus gehen. Auf das Minus fallen jeden Tag Zinsen an${KPK('bank')?' (Hausbank: ein Drittel weniger)':''}. Liegt die Kassa 7 Tage hintereinander unter dem Rahmen, ist der Berg verloren.${KG.pleite?' <b style="color:#e8504a">Schon '+KG.pleite+' Tage darunter!</b>':''}</p>`}
 return h}
// --- Ziele, Sterne, Rangliste ---
function kZielHTML(){const tabs=[['zi','🎯','Ziele'],['st','⭐','Sterne'],['rk','🏆','Rangliste']];if(!KW.tab||!tabs.some(t=>t[0]===KW.tab))KW.tab='zi';let h=kHead('🎯 '+KVOR.n,tabs);
 if(KW.tab==='zi'){const B=KBERGE.find(b=>b.id===KG.id);h+=`<p class="hint" style="margin:8px 0 4px">Bis zum Ende von Saison ${KVOR.seasons}. Jedes Ziel ist ein Stern für die Karriere – ohne das Pflichtziel gibt es keinen.</p>`;
  KVOR.goals.forEach((g,i)=>{const ok=KG.goals[g.k];h+=`<div class="kgoal"><span class="s">${'★'.repeat(i+1)}<i>${'★'.repeat(2-i)}</i></span><span><b>${['Pflicht','Zusatz','Meister'][i]}:</b> ${g.t}<small>${ok?'<span class="ok">✓ geschafft</span>':g.prog?'Stand: '+g.prog():g.k==='pf'?'Sterne jetzt: '+kStars()+' · Stufe '+KG.stage:''}${g.end&&!ok?' · zählt am Saisonende':''}</small></span></div>`});
  h+=`<div class="bgh">Saison</div><div class="row"><span>Tag</span><b>${kSeaD()} von ${KSL}</b></div>`;
  if(KG.goals.pf)h+=`<p class="hint">Das Pflichtziel ist geschafft. Du kannst bis zum Saisonende weiterspielen, um die anderen Ziele zu holen – oder den Berg jetzt abschließen.</p><button class="btn" data-a="endnow" style="width:100%;margin-top:6px">${KW.endAsk?'Wirklich jetzt abschließen? Nochmal tippen':'🏁 Berg jetzt abschließen'}</button>`}
 if(KW.tab==='st'){const st=kStars(),sc=kScore(),TH=kSTH(),nx=TH[Math.min(5,st+1)];h+=`<div class="kpi"><div><small>Sterne</small><b style="color:#e8a33a">${'★'.repeat(st)}<span style="opacity:.25">${'★'.repeat(5-st)}</span></b></div><div><small>Punkte</small><b>${sc}</b>${st<5?`<i>nächster Stern ab ${nx}</i>`:''}</div></div>`;
  h+=`<div class="bgh">Woraus die Punkte bestehen</div><div class="row"><span>🏗️ Angebot (Lifte, Pisten, Gebäude)</span><b>${Math.round(kOffer()*.6)}</b></div><div class="row"><span>😊 Ruf ${Math.round(KG.ruf)} %</span><b>${Math.round(KG.ruf*2.2)}</b></div><div class="row"><span>❄️ Pistenzustand ${Math.round(kPQavg())} %</span><b>${Math.round(kPQavg()*.8)}</b></div><p class="hint">Sterne: 2 ab ${TH[2]}, 3 ab ${TH[3]}, 4 ab ${TH[4]}, 5 ab ${TH[5]} Punkten.</p>`}
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
  const w=kWait(id),T0=KLT[s.typ];const ovh=kOvhC(id);
  let h=kHead((s.typ==='teller'?'🎿 ':'🚡 ')+L.n)+`<div style="margin:4px 0"><span class="kchip b">${T0.n}</span>${s.lg?`<span class="kchip">+${s.lg} Ausbau</span>`:''}${s.brk?'<span class="kchip r">⚠️ Störung</span>':kLiftOpen(id)?'<span class="kchip g">in Betrieb</span>':'<span class="kchip">steht</span>'}</div>`;
  h+=`<div class="kpi"><div><small>Wartezeit</small><b>${w<1?'keine':Math.round(w)+' Min.'}</b></div><div><small>In der Schlange</small><b>${o?o.q.length:0}</b></div><div><small>Fahrten heute</small><b>${o?o.cnt:0}</b></div><div><small>Zustand</small><b>${Math.round(s.cond)} %</b></div></div>`;
  if(L.tn)h+=`<div class="row"><span>Strecke</span><b>${L.bn||'Talstation'} → ${L.tn}</b></div>`;
  if(kWS(id))h+=KVOR.windHint?KVOR.windHint(id):'<p class="hint">🌪️ Bei Sturm steht der Sessellift.</p>';
  h+=`<div class="row"><span>🔧 Generalüberholung (Zustand 100 %, weniger Störungen)</span><button class="btn" data-a="ovh" data-v="${id}" ${s.cond>92||!kCanPay(ovh)?'disabled':''}>${kfmt(ovh)}</button></div><div class="row"><span>Ausbau</span><button class="btn" data-a="go" data-v="bau|lif">Baumenü ›</button></div>`;if(V.liftInfo)h+=V.liftInfo(id)||'';return h}
 if(V.infHTML){const r=V.infHTML(k);if(r)return r}
 const Hd={kas:'🎫 Kassa',kio:'🌭 Kiosk',hut:'🛖 '+(V.hut?V.hut.n:'Hütte'),kid:'⭐ Kinderland',sch:'⛷️ Skischule',rau:'🚜 Pistenraupe',hot:'🏨 '+(V.hotel?V.hotel.n:'Gasthof'),park:'🅿️ Parkplätze'};
 if(Hd[k]){let h=kHead(Hd[k]);const inc=KG.inc;
  if(k==='kas')h+=`<div class="kpi"><div><small>Gäste heute</small><b>${KG.gDay}</b></div><div><small>Tageskarten heute</small><b>${kfmt(inc.tk||0)}</b></div></div><div class="row"><span>Tageskarte</span><button class="btn" data-a="go" data-v="pre">${KG.price.ticket} € ›</button></div>${KG.res.prRej?`<p class="hint">${KG.res.prRej} Gäste fanden die Karte zu teuer und sind umgekehrt.</p>`:''}`;
  if(k==='kio'||k==='hut')h+=`<div class="kpi"><div><small>Essen heute (alle)</small><b>${kfmt(inc.food||0)}</b></div><div><small>Mittagsmenü</small><b>${KG.price.food} €</b></div></div><p class="hint">Mittagszeit ist zwischen 11 und 14 Uhr.</p>`;
  if(k==='kid')h+=`<div class="kpi"><div><small>Kinderland heute</small><b>${kfmt(inc.kid||0)}</b></div><div><small>Kinder gerade</small><b>${KW.folks.filter(f=>f.st==='kidin').length}</b></div></div>`;
  if(k==='sch'){const g=KW.school.filter(x=>x.st==='run'||x.st==='wait');h+=`<div class="kpi"><div><small>Skikurse heute</small><b>${kfmt(inc.sch||0)}</b></div><div><small>Gruppen gerade</small><b>${g.length}</b></div></div><p class="hint">Kurse beginnen jeweils zur halben Stunde von 9:30 bis 14:30, bis zu 6 Teilnehmer je Gruppe.</p>`}
  if(k==='rau')h+=`<div class="kpi"><div><small>Pistenzustand</small><b>${Math.round(kPQavg())} %</b></div><div><small>Schnee</small><b>${Math.round(KG.snow)} cm</b></div></div><p class="hint">Die Raupe fährt ab 19 Uhr, wenn niemand mehr auf der Piste ist.${KG.snow<30?' Bei wenig Schnee kann auch die Raupe die Piste nicht mehr ganz herrichten.':''}</p>`;
  if(k==='hot')h+=`<div class="kpi"><div><small>Belegung</small><b>${Math.round((KG.hOcc||0)*100)} %</b></div><div><small>Zimmerpreis</small><b>${KG.price.hotel} €</b></div></div>`;
  if(k==='park'){const sp=kSpots().length,used=KW.cars.filter(c=>c.spot).length;h+=`<div class="kpi"><div><small>Belegt</small><b>${used} / ${sp}</b></div><div><small>Heute abgewiesen</small><b>${KG.rej}</b></div></div><div class="row"><span>Parken</span><button class="btn" data-a="go" data-v="pre">${KG.price.park} € ›</button></div>`}
  return h}
 if(k.startsWith('p:')){const p=KW.pmap[k.slice(2)];return kHead((p.col==='r'?'🔴 ':p.col==='s'?'⚫ ':p.col==='y'?'🟡 ':'🔵 ')+p.n)+`<div class="kpi"><div><small>Zustand</small><b>${Math.round(KG.pq[p.id])} %</b></div><div><small>Gäste darauf</small><b>${KW.folks.filter(f=>f.st==='ski'&&f.pid===p.id).length}</b></div></div>`+(V.pisteInfo?V.pisteInfo(p):'')}
 return kHead('Info')}
function kOvhC(id){const L=kLC(id);return Math.round((L.ovh||(id==='tl'?600:3000))*(KPK('lift')?.9:1))}
function kOverhaul(id){const c=kOvhC(id);if(!kCanPay(c))return;KG.money-=c;KG.cost.bau=(KG.cost.bau||0)+c;KG.seaBau=(KG.seaBau||0)+c;KG.l[id].cond=100;kLog('🔧',kLC(id).n+' generalüberholt.');kUI()}

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
 alt:{goals:['Schuldenfrei (Kassa über 0 €) und 2 Sterne','Alle 3 alten Lifte wieder in Betrieb – saniert oder neu – und Platz 6 oder besser','In der letzten Woche der 2. Saison keine einzige Liftpanne'],spec:[['☀️ Westhang (Sonnseite)','nachmittags weich'],['❄️ Osthang (Schattseite)','Schnee hält länger'],['🔧 Alte Lifte','Pannen 3-mal so oft'],['🏦 Kreditrahmen','20.000 €'],['🪑 Besonderes Gebäude','Nostalgie-Sessellift']],tip:'Tipp: Liftbau-Partner und Hausbank',
  extra:`<div class="bgh">🔧 Alte Lifte</div><div class="kold"><span class="h">Lift</span><span class="h">Sanieren</span><span class="h">Neu</span><span><b>Altbergbahn</b><br>2er-Sessel · 1971 · läuft noch</span><span>4.000 €</span><span>4er · 16.000 €</span><span><b>Ostlift</b><br>Schlepplift · 1968 · zu</span><span>3.000 €</span><span>4er · 13.000 €</span><span><b>Gipfelsessel</b><br>Einersessel · 1958 · zu</span><span>Nostalgie<br>9.000 €</span><span>6er · 22.000 €</span></div>`},
 seek:{goals:['3 Sterne','Einmal 500 Gäste an einem Tag','Platz 3 oder besser in der Rangliste'],spec:[['🌊 Lage','hinter einem See, nur 8 Parkplätze im Tal'],['🚶 Brücke','zu Fuß über eine Stunde'],['⛴️ Seeschiff','60 Plätze · alle 30 Minuten'],['🚠 Seebahn','Ausbau Stufe 5 · über den See'],['🏨 Besonderes Gebäude','Seehotel ★★★★ mit Steg']],tip:'Tipp: Die Anreise ist der Engpass'},
 eis:{goals:['4 Sterne','Platz 1 in der Rangliste','Platz 1 schon am Ende der 2. Saison'],spec:[['🌪️ Wind','oft Sturm – die oberen Bahnen stehen'],['⚠️ Lawinengefahr','ab Stufe 3: nach Neuschnee erst sprengen'],['🚡 Pendelbahn','Ausbau Stufe 5 · auf den Gipfel'],['🚠 3S-Gletscherexpress','Ausbau Stufe 6 · fährt auch bei Sturm'],['🍽️ Besonderes Gebäude','Gletscherrestaurant mit Eisgrotte']],tip:'Tipp: Konkurrenz baut schnell aus'}};
function kBergWin(id){kCareerLoad();const i=KBERGE.findIndex(b=>b.id===id),B=KBERGE[i],I=KBINFO[id],lk=!kOpenB(i),av=!!KV[id],sv=kLoad(id),best=KC.best[id]||0,R=KC.res[id];
 const img=av?kThumb(id):'';const perks=(KC.perks||[]).filter(p=>KPERK.find(x=>x.id===p));const used=kPerkUsed(perks),xp=kXP();
 let h=`<div class="kh"><a data-o="map">‹ Karte</a><h2 style="text-align:center">${B.n}</h2><span style="width:50px"></span></div><div class="card">`;
 h+=img?`<img src="${img}" style="width:100%;height:230px;object-fit:cover;border-radius:14px;display:block">`:`<div style="height:120px;border-radius:14px;background:linear-gradient(#dfeaf6,#f3f8fd);display:flex;align-items:center;justify-content:center;font-size:44px">🏔️</div>`;
 h+=`<div style="margin:10px 0 2px"><b style="font-size:18px">${B.n} – ${B.sub}</b></div><div style="margin:6px 0 2px"><span class="kchip b">${B.lv}</span><span class="kchip">🏗️ ${B.st} Ausbaustufen</span><span class="kchip">📅 ${B.sea} ${B.sea>1?'Saisons':'Saison'}</span><span class="kchip">💶 Start ${kfmt(B.start)}</span></div>`;
 if(av)h+=`<p style="margin:6px 0;font-size:13.5px;color:#33516f;line-height:1.35">${KV[id].desc}</p>`;
 h+=`<div class="bgh">🎯 Ziele <small style="font-weight:400">· jedes Ziel ein Stern</small></div>`+I.goals.map((g,j)=>`<div class="kgoal"><span class="s">${'★'.repeat(j+1)}<i>${'★'.repeat(2-j)}</i></span><span><b>${['Pflicht','Zusatz','Meister'][j]}:</b> ${g}${j===0&&i<4?`<small>Ohne diesen Stern bleibt ${KBERGE[i+1].n} zu</small>`:''}</span></div>`).join('');
 h+=`<div class="bgh">🌦️ Besonderheiten</div>`+I.spec.map(s=>`<div class="row"><span>${s[0]}</span><b style="text-align:right">${s[1]}</b></div>`).join('');if(I.extra)h+=I.extra;
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
 try{KVOR=KV[id];KG=kNewState(id,[]);KG.stage=KVOR.stages;for(const k in KG.l)KG.l[k].on=1;if(KVOR.thumbPrep)KVOR.thumbPrep(KG);else{KG.l.ses.typ='s4';KG.b.kinder=1;KG.b.school=1}KG.b.hut=1;KG.b.kiosk=1;KW.paths=KVOR.paths();kBuildWorld();kZ.S=.5;kZ.dpr=1;KST.c=null;
  const b=KVOR.bounds,rs=.62;const cv=document.createElement('canvas');cv.width=Math.ceil((b.x1-b.x0)*rs);cv.height=Math.ceil((b.y1-b.y0)*rs);const c=cv.getContext('2d');c.setTransform(rs,0,0,rs,-b.x0*rs,-b.y0*rs);
  kWithGame(()=>{KW.winOn=0;KVOR.bg(c);for(const L of KVOR.lots)kLot(c,L,0);kDrawPaths(c);kDrawPistes(c);const O=KST.objs.slice();for(const t of KST.trees)O.push({y:t.y,f:c2=>t.t==='p'?pineN(c2,t.x,t.y,t.s):kDecid(c2,t.x,t.y,t.s,t.t==='o')});for(const h of KST.houses)O.push({y:h.y,f:c2=>chalet(c2,h.x,h.y,h.w,h.h,h.k)});
   for(const L of KVOR.lifts){const co=L.typ==='teller'?0:8;if(!kLowerOf(L.id))O.push({y:L.b[1]+22,f:c2=>L.typ==='teller'?stationN(c2,L.b[0]+14,L.b[1],0):liftStation(c2,L.b[0],L.b[1],co,true)});O.push({y:L.t[1]+18,f:c2=>L.typ==='teller'?stationN(c2,L.t[0]+14,L.t[1],0):liftStation(c2,L.t[0],L.t[1],co,false)});
    O.push({y:3000,f:c2=>{c2.strokeStyle='#161a28';c2.lineWidth=1.2;for(const sd of [-1,1]){c2.beginPath();c2.moveTo(L.b[0]+sd*co,L.b[1]-(co?0:14));c2.lineTo(L.t[0]+sd*co,L.t[1]-(co?0:14));c2.stroke()}}})}
   O.push({y:KVOR.hut.y,f:c2=>hut(c2,0)});O.push({y:KVOR.kassa.y,f:c2=>kKassaDraw(c2,KVOR.kassa.x,KVOR.kassa.y)});if(KVOR.kinder){O.push({y:KVOR.kinder.y-60,f:c2=>kKidBack(c2,0)});O.push({y:KVOR.kinder.y+40,f:c2=>kKidCarpet(c2,0)})}if(KVOR.thumbObjs)KVOR.thumbObjs(O);
   O.sort((a,b)=>a.y-b.y);for(const o of O)o.f(c)});
  // Ausschnitt: Hang und Tal
  const out=document.createElement('canvas');out.width=640;out.height=520;const oc=out.getContext('2d');const TR=KVOR.thumbR||{x:-40,y:660,w:1080},x0=TR.x,y0=TR.y,w=TR.w,h=w*520/640;oc.drawImage(cv,(x0-b.x0)*rs,(y0-b.y0)*rs,w*rs,h*rs,0,0,640,520);url=out.toDataURL('image/jpeg',.82)}
 catch(e){console.error(e)}
 finally{KG=g0;KVOR=v0;KON=on0;KST.c=st0.c;KST.rs=st0.rs;KW.pistes=pist0;KW.pmap=pm0;KW.paths=paths0;Object.assign(kZ,z0);if(KVOR){kBuildWorld()}}
 return KTH[id]=url}
// Berg starten / verlassen
function kStart(id,fresh){kCareerLoad();KVOR=KV[id];if(!KVOR)return;let s=fresh?null:kLoad(id);if(!s||s.done){s=kNewState(id,KC.perks||[]);s.firm=KC.firm}KG=s;
 KW.folks=[];KW.cars=[];KW.buses=[];KW.pops=[];KW.lift={};KW.school=[];KW.groom=null;KW.res=null;KW.neu=null;KW.open=null;KW.paused=false;KW.modal=0;KW.speed=1;KW.endAsk=0;KW.rsAsk=0;KW.canP=null;KW.acc=[];KW.lgNew=0;
 KW.paths=KVOR.paths();if(KVOR.onStart)KVOR.onStart();kBuildWorld();for(const id2 in KG.l)if(KG.l[id2].on)kLiftSetup(id2);KW.hutS=kHutS();
 if(fresh||!KG.dem){KG.dem=kDemand();if(KG.t>=6&&KG.day===1&&!KG.started){KG.wx='sonne';KG.started=1;kLog('🏔️',KVOR.welcome)}}
 KW.hotelN=0;kOvCSS();kOvHide();const n=document.getElementById('kname');if(n)n.remove();document.body.classList.add('kmode');kUIbuild();kCanvas();kZ.cv.style.display='block';document.getElementById('kui').hidden=false;
 const H=KVOR.home;kZ.S=H.S;kZ.camX=H.cx-kViewW()/2;kZ.camY=H.cy-kViewH()*.55;kClamp();kBuildStatic();KON=true;KW.last=0;cancelAnimationFrame(KW.raf);KW.raf=requestAnimationFrame(kLoop);kHud(1);kUI();
 if(KG.day===1&&KG.t<7&&KVOR.tip&&(KVOR.tipIf?KVOR.tipIf():true))setTimeout(()=>kToast(KVOR.tip,5000),900);kSave()}
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
 liftSetup:kLiftSetup,bauApply:kBauApply,eng:()=>KW.eng,
 allX:()=>{KG.money=1e6;KG.ruf=80;KG.gT=500;KG.canEver=1;KG.stage=KVOR.stages;for(const L of KVOR.lifts){KG.l[L.id].on=1;kLiftSetup(L.id)}for(let k=0;k<12;k++){let any=0;for(const it of kBuildItems()){if(it.done||it.lock||it.bau)continue;kBuy(it.id);any=1}KG.bau.slice().forEach(b=>kBauApply(b));KG.bau=[];if(!any)break}KW.neu=null;KG.money=50000;kRebuild();kUI()},
 all:()=>{KG.money=1e6;KG.stage=3;KG.ruf=80;KG.gT=500;for(const id of ['tl','kiosk','po','raupe','can','kinder','school','hut','hotel','bus','lw','bw','paved','lgT','lgS'])kBuy(id);KG.l.ses.on=1;kUp4();KG.bau.slice().forEach(b=>kBauApply(b));KG.bau=[];KW.neu=null;KG.money=50000;kRebuild();kUI()}};

})();
