"""Conservative local audio alignment. No guessed offsets are labelled synchronized."""
import cmath, json, math, subprocess, tempfile, time
from pathlib import Path
from platform_tools import WINDOWS, ffmpeg
import sys

def fft(values,inverse=False):
 a=list(map(complex,values));n=len(a);j=0
 for i in range(1,n):
  bit=n>>1
  while j&bit:j^=bit;bit>>=1
  j^=bit
  if i<j:a[i],a[j]=a[j],a[i]
 size=2
 while size<=n:
  step=cmath.exp((2j if inverse else -2j)*math.pi/size)
  for start in range(0,n,size):
   w=1
   for k in range(start,start+size//2):
    u=a[k];v=a[k+size//2]*w;a[k]=u+v;a[k+size//2]=u-v;w*=step
  size*=2
 return [v/n for v in a] if inverse else a

def correlation(a,b):
 size=1
 while size<len(a)+len(b)-1:size*=2
 fa=fft(a+[0]*(size-len(a)));fb=fft(list(reversed(b))+[0]*(size-len(b)))
 return [v.real for v in fft([x*y for x,y in zip(fa,fb)],True)]

def prefix(x):
 s=[0.0];q=[0.0]
 for v in x:s.append(s[-1]+v);q.append(q[-1]+v*v)
 return s,q

def features(bands):
 result=[]
 for band in bands:
  # Local spectral dynamics reduce differences in gain and slowly changing loudness.
  smooth=band[0];out=[]
  for x in band:
   smooth=.94*smooth+.06*x;out.append(max(-5,min(5,x-smooth)))
  result.append(out)
 return result

def align_pair(left,right,rate=50):
 a=features(left);b=features(right);na=len(a[0]);nb=len(b[0]);overlap=min(20*rate,int(min(na,nb)*.4))
 if overlap<10*rate:return None
 stats=[(prefix(x),prefix(y),correlation(x,y)) for x,y in zip(a,b)]
 candidates=[]
 for lag in range(-(nb-overlap),na-overlap+1):
  ia=max(0,lag);ib=max(0,-lag);count=min(na-ia,nb-ib);scores=[]
  for (sa,qa),(sb,qb),conv in stats:
   xa=sa[ia+count]-sa[ia];xb=sb[ib+count]-sb[ib]
   va=qa[ia+count]-qa[ia]-xa*xa/count;vb=qb[ib+count]-qb[ib]-xb*xb/count
   if va/count<.005 or vb/count<.005:scores.append(0);continue
   scores.append((conv[lag+nb-1]-xa*xb/count)/math.sqrt(max(1e-15,va*vb)))
  candidates.append((sum(scores)/len(scores),lag,scores))
 best=max(candidates);score,lag,bands=best
 alternative=max((v[0] for v in candidates if abs(v[1]-lag)>rate),default=0)
 if score<.62 or score-alternative<.09 or sum(v>.45 for v in bands)<2:return None
 # Reject a peak supported by only one short event: both overlap halves must agree.
 ia=max(0,lag);ib=max(0,-lag);count=min(na-ia,nb-ib)
 for first,last in [(0,count//2),(count//2,count)]:
  halves=[]
  for x,y in zip(a,b):
   xs=x[ia+first:ia+last];ys=y[ib+first:ib+last];n=len(xs)
   sx=sum(xs);sy=sum(ys);vx=sum(v*v for v in xs)-sx*sx/n;vy=sum(v*v for v in ys)-sy*sy/n
   halves.append((sum(v*w for v,w in zip(xs,ys))-sx*sy/n)/math.sqrt(max(1e-15,vx*vy)))
  if sum(halves)/len(halves)<.38:return None
 return {'offset':lag/rate,'correlation':round(score,3),'peakMargin':round(score-alternative,3),'overlap':count/rate}

def synchronize(sources,root,cancelled=lambda:False):
 decoded={};errors=[];edges=[]
 with tempfile.TemporaryDirectory(prefix='autoclipper-sync-') as tmp:
  for i,source in enumerate(sources):
   if cancelled():raise RuntimeError('Abgebrochen.')
   pb=source['playback'];output=Path(tmp)/(str(i)+'.json')
   helper=Path(root)/'src/sync/audio-envelope'
   command=[sys.executable,str(helper.with_suffix('.py')),ffmpeg()] if WINDOWS else [str(helper)]
   proc=subprocess.Popen(command+[source['path'],str(pb['start']),str(pb['end']),str(output)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   try:
    deadline=time.monotonic()+35
    while proc.poll() is None:
     if cancelled() or time.monotonic()>deadline:proc.kill();proc.wait();raise RuntimeError('Abgebrochen.' if cancelled() else 'Audioanalyse dauert zu lange.')
     time.sleep(.1)
    if proc.returncode or not output.exists():errors.append(i);continue
    decoded[i]=json.loads(output.read_text())['bands']
   finally:
    if proc.poll() is None:proc.kill();proc.wait()
  for i in decoded:
   for j in decoded:
    if j<=i:continue
    if cancelled():raise RuntimeError('Abgebrochen.')
    match=align_pair(decoded[i],decoded[j])
    if match:edges.append((match['correlation'],i,j,match))
  # Use the largest connected component; independent recordings remain explicitly unverified.
  components=[];remaining=set(decoded)
  while remaining:
   component={min(remaining)}
   while True:
    expanded=component|{j for _,i,j,_ in edges if i in component}|{i for _,i,j,_ in edges if j in component}
    if expanded==component:break
    component=expanded
   components.append(component);remaining-=component
  main=max(components,key=len,default=set());offsets={min(main):0.0} if main else {};accepted=[]
  while True:
   edge=next((edge for edge in sorted(edges,reverse=True) if (edge[1] in offsets)!=(edge[2] in offsets) and edge[1] in main and edge[2] in main),None)
   if not edge:break
   _,i,j,match=edge
   if i in offsets:offsets[j]=offsets[i]+match['offset']
   else:offsets[i]=offsets[j]-match['offset']
   accepted.append(match)
  # Conflicting pairwise evidence means the group needs manual alignment.
  inconsistent=any(i in offsets and j in offsets and abs(offsets[j]-offsets[i]-match['offset'])>.1 for _,i,j,match in edges)
  if inconsistent:offsets={};main=set()
  verified=len(offsets)>=2;origin=min(offsets.values(),default=0)
  for i,source in enumerate(sources):
   source['syncMode']=True;source['syncTrack']=i;source['syncVerified']=verified and i in offsets
   source['syncOffset']=round((offsets.get(i,origin)-origin)*30)/30 if source['syncVerified'] else 0.0
  missing=sum(not source['syncVerified'] for source in sources)
  warning=(str(missing)+' Ansicht(en) ohne sicheren Audio-Abgleich; auf separaten Spuren bei 0 s. Bitte manuell synchronisieren.') if missing else ''
  return {'verified':verified and not missing,'warning':warning,'matches':accepted,'missing':missing}
