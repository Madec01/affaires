"""Rasterize the simple native leaf mark without external services."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
scale=4
im=Image.new('RGB',(512*scale,512*scale),'#174e48')
draw=ImageDraw.Draw(im)
def bezier(a,b,c,d):
 return [tuple(((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k])*scale for k in [0,1]) for t in [i/120 for i in range(121)]]
points=bezier((180,332),(108,225),(182,142),(335,170))+bezier((335,170),(349,312),(276,376),(180,332))
draw.line(points,fill='white',width=20*scale,joint='curve')
draw.line([(160*scale,365*scale),(282*scale,238*scale)],fill='white',width=20*scale)
for x,y in [(160,365),(282,238)]:draw.ellipse([(x-10)*scale,(y-10)*scale,(x+10)*scale,(y+10)*scale],fill='white')
for name,size in [('icon-192',192),('icon-512',512),('icon-maskable',512)]:im.resize((size,size),Image.Resampling.LANCZOS).save(ROOT/'assets'/f'{name}.png',optimize=True)
