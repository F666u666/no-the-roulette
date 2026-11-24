import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const base='reports/live-draw-audit/2026-11-02-session-';
const sessions=await Promise.all(['01','02'].map(s=>readFile(base+s+'.json','utf8').then(JSON.parse)));
const names=[...new Set(sessions.flatMap(s=>s.observations.map(o=>o.fighter)))];
if(names.length!==10 || names.includes(null))throw Error('Unconfirmed roster');
const observed=sessions.map(s=>names.map(n=>s.observations.filter(o=>o.fighter===n).length));
observed.push(names.map((_,i)=>observed[0][i]+observed[1][i]));
const lengths=[...sessions.map(s=>s.observations.length),sessions.reduce((a,s)=>a+s.observations.length,0)];
const score=(a)=>a.reduce((t,x)=>t+x*x,0);
const thresholds=observed.map((a,i)=>({n:lengths[i],min:Math.min(...a),max:Math.max(...a),sumSquares:score(a)}));
const buffer=new Uint32Array(16384);let offset=buffer.length;
function below(n){const limit=Math.floor(0x100000000/n)*n;let x;do{if(offset===buffer.length){crypto.getRandomValues(buffer);offset=0;}x=buffer[offset++];}while(x>=limit);return x%n;}
const trials=200000;
const hits=thresholds.map(()=>({ratio:0,range:0,sumSquares:0,maxAndMin:0}));
const started=performance.now();
for(let trial=0;trial<trials;trial++){
 let previous=-1;
 const c1=new Uint16Array(10),c2=new Uint16Array(10);
 for(let j=0;j<lengths[2];j++){
  const k=below(previous<0?10:9);
  const next=previous<0?k:k>=previous?k+1:k;
  (j<lengths[0]?c1:c2)[next]++;previous=next;
 }
 const both=c1.map((v,i)=>v+c2[i]);
 for(const [i,counts] of [c1,c2,both].entries()){
  const lo=Math.min(...counts),hi=Math.max(...counts),o=thresholds[i];
  if(lo===0 || hi*o.min>=o.max*lo)hits[i].ratio++;
  if(hi-lo>=o.max-o.min)hits[i].range++;
  if(score(counts)>=o.sumSquares)hits[i].sumSquares++;
  if(hi>=o.max && lo<=o.min)hits[i].maxAndMin++;
 }
}
// Cross-check the equivalent Markov model with the actual unchanged production drawAll function.
const source=await readFile('src/services/lottery.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {drawAll}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const actualTrials=10000, actualHits={ratio:0,sumSquares:0};
for(let trial=0;trial<actualTrials;trial++){
 const p={id:'audit',candidates:names,lastFighter:null};const counts=Array(10).fill(0);
 for(let j=0;j<lengths[2];j++){
  const next=drawAll([p],true)[p.id];
  if(next===p.lastFighter)throw Error('Previous exclusion failed');
  counts[names.indexOf(next)]++;p.lastFighter=next;
 }
 const lo=Math.min(...counts),hi=Math.max(...counts),o=thresholds[2];
 if(lo===0||hi*o.min>=o.max*lo)actualHits.ratio++;
 if(score(counts)>=o.sumSquares)actualHits.sumSquares++;
}
const report={createdAt:new Date().toISOString(),settings:{fighters:10,excludePrevious:true,players:1,trials,sessionLengths:lengths.slice(0,2),model:'Uniform first choice, then uniform over other 9. Sessions treated as consecutive; no candidate/settings changes.',randomSource:'Web Crypto, rejection sampling, buffered 32-bit values'},observed:thresholds.map((o,i)=>({...o,counts:Object.fromEntries(names.map((n,k)=>[n,observed[i][k]])),ratio:o.max/o.min,pearsonStatistic:o.sumSquares/(o.n/10)-o.n})),simulation:hits.map((h,i)=>({draws:lengths[i],hits:h,probability:Object.fromEntries(Object.entries(h).map(([k,v])=>[k,v/trials]))})),actualProductionCrossCheck:{trials:actualTrials,hits:actualHits,probability:Object.fromEntries(Object.entries(actualHits).map(([k,v])=>[k,v/actualTrials])),lotterySourceSha256:createHash('sha256').update(source).digest('hex')},methodNotes:{ratio:'Any of 10 fighters may be max/min; not a preselected pair. hi / lo >= observed hi / observed lo, integer comparison.',sumSquares:'Whole 10-count distribution at least as unequal by sum of squared counts; same tail ordering as Pearson statistic. Simulated no-repeat null, not an independent-draw chi-square approximation.',interpretation:'These are probabilities of discrepancy statistics under the fair model, not the probability that the app is fair. User reports and a fixed candidate set are assumed correct.'},elapsedSeconds:(performance.now()-started)/1000};
await writeFile('reports/live-draw-audit/fairness-assessment.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
