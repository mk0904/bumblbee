#!/usr/bin/env python3
"""Deterministic, project-authored yard atlas; world metres map to texture pixels.
Run with simulator/.venv/bin/python. No downloaded imagery or collision geometry.
"""
from pathlib import Path
import random
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
MAP_DIR = ROOT / 'shared/worlds'
WORLD = json.loads((MAP_DIR / 'training-ground-v1.json').read_text())
SIZE = WORLD['texturePixels']
SURFACE = WORLD['surface']
SPAN = SURFACE['maxX'] - SURFACE['minX']
OUTPUT = MAP_DIR / WORLD['texture']
rng = random.Random(20261116)
scale = SIZE / SPAN

def xy(x, y):
    return ((x - SURFACE['minX']) * scale, (SURFACE['maxY'] - y) * scale)

def box(x1, y1, x2, y2):
    a, b = xy(min(x1,x2), max(y1,y2)), xy(max(x1,x2), min(y1,y2))
    return (*a, *b)

image = Image.new('RGB', (SIZE,SIZE), '#65705b')
draw = ImageDraw.Draw(image)
# Concrete slabs: local patches remain visible even when the camera sees only ground.
for x in range(-54,54,3):
    for y in range(-54,54,3):
        value = rng.randrange(125,150)
        draw.rectangle(box(x,y,x+3,y+3), fill=(value,value+2,value-1), outline='#5d625d',width=2)
        if rng.random()<0.2:
            cx,cy=xy(x+rng.random()*3,y+rng.random()*3)
            draw.line([(cx,cy),(cx+12,cy+8),(cx+17,cy+27)],fill='#777c75',width=1)
# Two painted asphalt service lanes; they are flat texture, not physical obstacles.
draw.rectangle(box(-52,-11,52,-5),fill='#424847')
draw.rectangle(box(12,-52,18,52),fill='#424847')
for y in (-10.7,-5.3):draw.line([xy(-52,y),xy(52,y)],fill='#e1e0cd',width=4)
for x in (12.3,17.7):draw.line([xy(x,-52),xy(x,52)],fill='#e1e0cd',width=4)
for x in range(-50,51,5):draw.line([xy(x,-8),xy(x+2.3,-8)],fill='#d0b65b',width=5)
for y in range(-50,51,5):draw.line([xy(15,y),xy(15,y+2.3)],fill='#d0b65b',width=5)
# Matching dashboard scenery footprints, painted onto the surface.
for footprint in WORLD['footprints']:
    x,y,w,h = (footprint[k] for k in ('x','y','width','height'))
    draw.rectangle(box(x-w/2,y-h/2,x+w/2,y+h/2),fill='#4d5859',outline='#d4cab1',width=5)
    for n in range(1,int(w/2)):
        xx=x-w/2+n*2
        draw.line([xy(xx,y-h/2),xy(xx,y+h/2)],fill='#758183',width=2)
# Safety boundary, coordinate ticks, inspection cross-lines.
draw.rectangle(box(-50,-50,50,50),outline='#d4b34f',width=8)
for i in range(-50,51,5):
    for x,y,dx,dy in [(i,50,0,-0.6),(i,-50,0,0.6),(-50,i,0.6,0),(50,i,-0.6,0)]:
        draw.line([xy(x,y),xy(x+dx,y+dy)],fill='#e7d89a',width=4)
for x in range(-48,49,12):
    for y in range(-48,49,12):
        draw.line([xy(x-.25,y),xy(x+.25,y)],fill='#e5e2cf',width=3)
        draw.line([xy(x,y-.25),xy(x,y+.25)],fill='#e5e2cf',width=3)

font_path = Path('/System/Library/Fonts/Supplemental/Arial Bold.ttf')
if not font_path.exists():
    font_path = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')

def label(text,x,y,height=1,color='#ebe9dc'):
    font=ImageFont.truetype(str(font_path),max(12,int(height*scale)))
    draw.text(xy(x,y),text,font=font,fill=color,anchor='mm',stroke_width=0)

def pad(x,y,r,text,color):
    edge = max(2, round(0.055*scale))
    draw.ellipse(box(x-r-.04,y-r-.04,x+r+.04,y+r+.04),fill='#303b3b')
    draw.ellipse(box(x-r,y-r,x+r,y+r),fill=color,outline='#f0ecdb',width=edge)
    draw.ellipse(box(x-r+.12,y-r+.12,x+r-.12,y+r-.12),outline='#d7d8ca',width=1)
    label(text,x,y,r*.8)

for point in WORLD['pads']:
    pad(point['x'],point['y'],point['diameter']/2,point['id'],point['color'])
label('HOME / 00',0,-1.25,.3)
label('FLIGHT TEST APRON',-4,14,1.1)
label('HANGAR A',-30.8333,31.9167,1.1)
label('STORAGE',30.4167,-25.4167,1.1)
label('SERVICE',-33.4167,-25.8333,.8)
for x,y,name in [(-38,10,'01'),(37,26,'02'),(-30,-36,'03'),(34,-43,'04')]:
    draw.rectangle(box(x-2,y-1.7,x+2,y+1.7),fill='#bec0ab',outline='#515d56',width=3)
    label(name,x,y,2,'#435148')
# Orientation marks near home, matching the explicit ENU frame.
draw.line([xy(1.1,0),xy(3,0)],fill='#ba6156',width=8)
draw.polygon([xy(3,0),xy(2.6,.25),xy(2.6,-.25)],fill='#ba6156')
draw.line([xy(0,1.1),xy(0,3)],fill='#77956a',width=8)
draw.polygon([xy(0,3),xy(-.25,2.6),xy(.25,2.6)],fill='#77956a')
label('+X',3,-.5,.45,'#824b43')
label('+Y',-.6,3,.45,'#486b43')
# Seeded fine aggregate grain, blended after markings so paint also has texture.
grain=Image.frombytes('L',(SIZE,SIZE),rng.randbytes(SIZE*SIZE)).convert('RGB')
image=Image.blend(image,grain,0.09)
OUTPUT.parent.mkdir(exist_ok=True)
image.save(OUTPUT,quality=90,subsampling=0,optimize=True)
print(f'Wrote {OUTPUT.name}: {SIZE}×{SIZE}, 120 m square, deterministic seed 20261116')
