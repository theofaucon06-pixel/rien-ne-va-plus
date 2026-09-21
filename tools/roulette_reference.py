"""Reference-led roulette study. Blender 5.x, no external packages or downloads.

blender --background --python tools/roulette_reference.py -- --render
Outputs a separate review asset; deliberately does not overwrite live game assets.
"""
import argparse
import json
import math
import os
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art' / 'roulette-v2'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--render', action='store_true')
parser.add_argument('--samples', type=int, default=48)
parser.add_argument('--scale', type=int, default=100)
parser.add_argument('--views', default='all')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
TAU = math.tau
ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]
REDS = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}
asset = bpy.data.collections.new('ROULETTE — modèle')
bpy.context.scene.collection.children.link(asset)
studio = bpy.data.collections.new('STUDIO — éclairage et caméras')
bpy.context.scene.collection.children.link(studio)
font_path = '/System/Library/Fonts/Supplemental/Georgia.ttf'
FONT = bpy.data.fonts.load(font_path) if os.path.exists(font_path) else bpy.data.fonts.get('Bfont')

def link(obj, collection=asset):
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def material(name, color, rough=.4, metal=0, coat=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .21
    return mat

wood = material('Noyer — veinage et vernis satiné', (.12,.045,.019), .34, coat=.18)
leather = material('Cuir noir — grain fin', (.006,.007,.008), .49, coat=.025)
felt = material('Drap vert bouteille — fibres', (.009,.075,.045), .93)
brass = material('Laiton poli', (.66,.39,.105), .22, .85)
silver = material('Séparateurs nickel', (.47,.5,.52), .23, .9)
ivory = material('Encre ivoire', (.82,.78,.64), .82)
thread = material('Fil et passepoil anthracite', (.038,.041,.041), .75)
black = material('Encre noire', (.009,.013,.013), .87)
red = material('Encre rouge rubis', (.34,.014,.015), .85)
green = material('Zéro vert', (.014,.17,.065), .8)

# A reproducible packed image survives GLB export. Fine relief remains in the
# native scene; the image gives the web asset its grain without shader extensions.
n = 1024
y, x = np.mgrid[0:1:complex(n),0:1:complex(n)]
rng = np.random.default_rng(38)
def wood_noise(u,v,nx,ny):
    grid=rng.uniform(-1,1,(ny+2,nx+2))
    ux=np.mod(u,1)*nx;vy=np.mod(v,1)*ny
    ix=ux.astype(int);iy=vy.astype(int)
    fx=ux-ix;fy=vy-iy
    fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
    return (grid[iy,ix]*(1-fx)+grid[iy,ix+1]*fx)*(1-fy)+(grid[iy+1,ix]*(1-fx)+grid[iy+1,ix+1]*fx)*fy

# Irregular elongated fibres avoid the equally spaced stripes of a sine-wave
# wood shader. Domain warping gives the grain its broad cathedral shapes.
warp=y+.065*wood_noise(x,y,3,4)+.019*wood_noise(x,y,7,11)
grain=.50+.18*wood_noise(x,warp,3,95)+.11*wood_noise(x,warp,9,310)
grain+=.09*wood_noise(x,y,2,6)+.045*wood_noise(x,warp,22,710)
grain+=rng.normal(0,.01,(n,n))
grain = np.clip(grain,0,1)
rgba = np.ones((n,n,4),dtype=np.float32)
dark, light = np.array([.135,.05,.022]),np.array([.40,.20,.09])
rgba[:,:,:3] = dark + grain[:,:,None]*(light-dark)
tex = bpy.data.images.new('Walnut grain · 1024px · original', width=n, height=n)
tex.pixels.foreach_set(rgba.ravel())
tex.pack()
nodes, links = wood.node_tree.nodes, wood.node_tree.links
im = nodes.new('ShaderNodeTexImage'); im.image = tex
links.new(im.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])

def micro(mat, scale, strength, distance):
    nodes, links = mat.node_tree.nodes,mat.node_tree.links
    coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=scale
    noise.inputs['Detail'].default_value=2
    bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=strength
    bump.inputs['Distance'].default_value=distance
    links.new(coord.outputs['Object'],noise.inputs['Vector'])
    links.new(noise.outputs['Fac'],bump.inputs['Height'])
    links.new(bump.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])

micro(leather,195,.36,.0013)
micro(felt,650,.25,.00035)
micro(wood,120,.10,.00015)
felt.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=0
for mat in (felt,red,black,green,ivory):
    mat.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.12
leather.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.3

def mesh(name, verts, faces, mat, uv=None, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces); data.update()
    obj = bpy.data.objects.new(name,data); asset.objects.link(obj)
    data.materials.append(mat)
    for p in data.polygons: p.use_smooth=smooth
    layer = data.uv_layers.new(name='UVMap')
    for face in data.polygons:
        for li in face.loop_indices:
            vi = data.loops[li].vertex_index
            co = verts[vi]
            layer.data[li].uv = uv[vi] if uv else (co[0]/4.4+.5, co[1]/1.94+.5)
    return obj

def bevel(obj,width=.005,segments=3):
    mod=obj.modifiers.new('Arêtes adoucies','BEVEL'); mod.width=width; mod.segments=segments
    return obj

def cube(name,loc,size,mat,bevel_width=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=link(bpy.context.object); obj.name=name; obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    if bevel_width: bevel(obj,bevel_width)
    return obj

def curve(name,pts,radius,mat,cyclic=False):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'
    data.resolution_u=1; data.bevel_depth=radius; data.bevel_resolution=2
    sp=data.splines.new('POLY'); sp.points.add(len(pts)-1)
    for point,co in zip(sp.points,pts): point.co=(*co,1)
    sp.use_cyclic_u=cyclic
    obj=bpy.data.objects.new(name,data); asset.objects.link(obj); data.materials.append(mat)
    return obj

def lathe(name,profile,mat,cx=0,cy=0,segments=128,vertical_grain=False):
    verts=[]; uv=[]
    for j,(r,z) in enumerate(profile):
        for k in range(segments+1):
            a=TAU*k/segments
            verts.append((cx+r*math.cos(a),cy+r*math.sin(a),z))
            uv.append((z*1.3,k/segments) if vertical_grain else (k/segments,z*1.3))
    faces=[]
    for j in range(len(profile)-1):
        for k in range(segments):
            a=j*(segments+1)+k; b=a+segments+1
            faces.append((a,a+1,b+1,b))
    return mesh(name,verts,faces,mat,uv)

def capsule(radius=1,half=1.25):
    # Clockwise along a stadium outline, from its right extremity.
    pts=[]
    for k in range(65):
        a=-math.pi/2+math.pi*k/64
        pts.append((half+radius*math.cos(a),radius*math.sin(a)))
    for k in range(1,49): pts.append((half-2*half*k/48,radius))
    for k in range(1,65):
        a=math.pi/2+math.pi*k/64
        pts.append((-half+radius*math.cos(a),radius*math.sin(a)))
    for k in range(1,48): pts.append((-half+2*half*k/48,-radius))
    return pts

def capsule_solid(name,r,half,z0,z1,mat):
    pts=capsule(r,half); count=len(pts)
    verts=[(x,y,z) for z in (z0,z1) for x,y in pts]
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    obj=mesh(name,verts,faces,mat,smooth=False)
    # Apron UVs follow the perimeter, keeping grain horizontal on all sides.
    uv=obj.data.uv_layers.active
    for p in list(obj.data.polygons)[2:]:
        for li in p.loop_indices:
            vi=obj.data.loops[li].vertex_index
            uv.data[li].uv=((vi%count)/count*3, (verts[vi][2]-z0)*1.4)
        p.use_smooth=True
    bevel(obj,.009,3)
    return obj

capsule_solid('Ceinture noyer · plateau arrondi',.97,1.25,.785,.935,wood)
capsule_solid('Moulure basse de la ceinture',.975,1.25,.786,.81,wood)
capsule_solid('Drap de jeu encastré',.864,1.25,.929,.948,felt)
for r,z in ((.968,.819),(.965,.917),(.854,.952)):
    curve('Filet de laiton dans le bois',[(x,y,z) for x,y in capsule(r,1.25)],.0017,brass,True)

# Upholstery swept around the outline, split into real separate padded sections.
path=capsule(.921,1.25)
count=len(path)
cuts=[0,22,43,64,88,112,134,155,176,200,224]
cuts=sorted(set([v for v in cuts if v<count]+[count]))
for si in range(len(cuts)-1):
    indices=list(range(cuts[si],cuts[si+1]+1))
    verts=[]; uv=[]
    for ii,k in enumerate(indices):
        x,y=path[k%count]; prev=Vector(path[(k-1)%count]); nxt=Vector(path[(k+1)%count])
        tang=(nxt-prev).normalized(); normal=Vector((tang.y,-tang.x))
        # A 1 mm reveal at each joint catches light like a sewn padded panel.
        shift=.0015 if ii==0 else (-.0015 if ii==len(indices)-1 else 0)
        for j in range(17):
            a=TAU*j/16
            verts.append((x+normal.x*.102*math.cos(a)+tang.x*shift,y+normal.y*.102*math.cos(a)+tang.y*shift,.974+.061*math.sin(a)))
            uv.append((k/count*5,j/16))
    faces=[]
    for i in range(len(indices)-1):
        for j in range(16):
            a=i*17+j; faces.append((a,a+1,a+18,a+17))
    faces += [tuple(reversed(range(17))),tuple(range((len(indices)-1)*17,len(indices)*17))]
    mesh('Cuir rembourré · panneau %02d'%si,verts,faces,leather,uv)
    # The cross-panel seam follows the upholstery surface.
    k=cuts[si]; x,y=path[k%count]; tangent=(Vector(path[(k+1)%count])-Vector(path[(k-1)%count])).normalized()
    norm=Vector((tangent.y,-tangent.x))
    seam=[(x+norm.x*.1025*math.cos(a),y+norm.y*.1025*math.cos(a),.974+.0615*math.sin(a)) for a in np.linspace(0,math.pi,17)]
    curve('Couture transversale',seam,.0012,thread)
curve('Passepoil intérieur',[(x,y,1.002) for x,y in capsule(.831,1.25)],.0016,thread,True)

# Two turned wooden pedestals, recessed fluted panels and layered bases.
for cx in (-1.24,1.24):
    profile=[(0,.012),(.36,.012),(.405,.025),(.421,.047),(.421,.066),(.406,.083),(.385,.090),(.382,.115),(.371,.13),(.345,.146),(.331,.174),(.326,.199),(.287,.225),(.282,.268),(.282,.692),(.299,.725),(.325,.749),(.335,.772),(.33,.791),(0,.791)]
    lathe('Piédestal tourné en noyer',profile,wood,cx,segments=128,vertical_grain=True)
    for z,r in ((.072,.414),(.13,.372),(.218,.296),(.71,.29)):
        lathe('Bague décorative du pied',[(r-.001,z-.002),(r+.001,z),(r-.001,z+.002)],brass,cx)
    for p in range(12):
        a=TAU*p/12
        pts=[(cx+(.284+d)*math.cos(a),(.284+d)*math.sin(a),z) for d,z in [(0,.267),(.008,.282),(.008,.674),(0,.691)]]
        curve('Montant de panneau du piédestal',pts,.007,wood)

wx=-1.24
lathe('Cuvette en noyer sculpté',[(.72,.949),(.748,.957),(.768,.982),(.77,1.024),(.755,1.059),(.731,1.075),(.704,1.074),(.685,1.059),(.677,1.034),(.663,1.024),(.644,1.021),(.62,.998),(.583,.969),(.541,.952),(.513,.950)],wood,wx,segments=192)
for r,z,th in ((.742,1.069,.0025),(.680,1.031,.002),(.515,.955,.002),(.349,.964,.002)):
    lathe('Anneau de précision',[(r-th,z),(r,z+th),(r+th,z),(r,z-th),(r-th,z)],brass,wx,segments=192)
rotor=lathe('Rotor central en bois',[(0,.958),(.12,1.025),(.20,1.005),(.28,.981),(.35,.962)],wood,wx,segments=192)
for loop in rotor.data.loops:
    p=rotor.data.vertices[loop.vertex_index].co
    rotor.data.uv_layers.active.data[loop.index].uv=((p.x-wx)*.9+.5,p.y*.9+.5)

def sector(name,r0,r1,a0,a1,z,mat):
    verts=[]
    for r in (r0,r1):
        for a in np.linspace(a0,a1,5): verts.append((wx+r*math.cos(a),r*math.sin(a),z))
    return mesh(name,verts,[(k+5,k+6,k+1,k) for k in range(4)],mat,smooth=False)

def text(body,x,y,z,size,mat=ivory,angle=0,name=None):
    data=bpy.data.curves.new(name or body,'FONT'); data.body=body; data.font=FONT
    data.align_x='CENTER'; data.align_y='CENTER'; data.size=size; data.resolution_u=5
    obj=bpy.data.objects.new(name or 'Marquage · '+body,data); asset.objects.link(obj)
    obj.location=(x,y,z); obj.rotation_euler.z=angle; data.materials.append(mat)
    return obj

for i,num in enumerate(ORDER):
    a=math.pi/2-TAU*i/37
    lo,hi=a-TAU/74,a+TAU/74
    color=green if num==0 else red if num in REDS else black
    sector('Couronne numérotée %02d'%num,.439,.512,lo+.001,hi-.001,.956,color)
    sector('Case creuse %02d'%num,.354,.435,lo+.009,hi-.009,.949,color)
    curve('Séparateur radial',[(wx+.353*math.cos(lo),.353*math.sin(lo),.963),(wx+.44*math.cos(lo),.44*math.sin(lo),.963)],.0023,silver)
    curve('Trait couronne',[(wx+.438*math.cos(lo),.438*math.sin(lo),.958),(wx+.514*math.cos(lo),.514*math.sin(lo),.958)],.0009,ivory)
    text(str(num),wx+.48*math.cos(a),.48*math.sin(a),.957,.067,angle=a-math.pi/2,name='Roue · %02d'%num)
for i in range(8):
    a=TAU*(i+.5)/8
    obj=cube('Déflecteur losange', (wx+.602*math.cos(a),.602*math.sin(a),.989),(.024,.011,.008),brass,.004)
    obj.rotation_euler=(0,.35,a)
lathe('Axe tourné en laiton',[(0,.965),(.104,.965),(.108,.979),(.103,.991),(.075,.998),(.066,1.010),(.071,1.026),(.068,1.041),(.048,1.051),(.037,1.074),(.029,1.101),(.027,1.126),(.038,1.148),(.055,1.162),(.059,1.175),(.054,1.186),(.034,1.198),(.023,1.211),(.023,1.238),(.035,1.25)],brass,wx)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=.034,location=(wx,0,1.258))
obj=link(bpy.context.object); obj.name='Pommeau en laiton'; obj.data.materials.append(brass)
for p in obj.data.polygons:p.use_smooth=True
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.011,location=(wx+.622,-.067,1.014))
obj=link(bpy.context.object); obj.name='Bille ivoire'; obj.data.materials.append(ivory)
for p in obj.data.polygons:p.use_smooth=True

# Correct 0–36 single-zero layout. All marking is vector geometry, never text
# extracted from the distorted numbers in the photographic references.
z=.9485; gx=-.12; gy=-.13; cw=.143; ch=.205
def line(x0,y0,x1,y1):return curve('Trait sérigraphié',[(x0,y0,z+.0003),(x1,y1,z+.0003)],.0009,ivory)
for col in range(12):
    for row in range(3):
        num=col*3+row+1; x=gx+col*cw; y=gy+row*ch
        cube('Case tapis %02d'%num,(x+cw/2,y+ch/2,z), (cw-.002,ch-.002,.0002),red if num in REDS else black)
        text(str(num),x+cw/2,y+ch/2,z+.0003,.10,angle=math.pi/2)
for col in range(13):line(gx+col*cw,gy,gx+col*cw,gy+3*ch)
for row in range(4):line(gx,gy+row*ch,gx+12*cw,gy+row*ch)
line(gx-.143,gy,gx-.143,gy+3*ch);line(gx-.143,gy,gx,gy);line(gx-.143,gy+3*ch,gx,gy+3*ch)
text('0',gx-.073,gy+1.5*ch,z+.0003,.11)
for row in range(3):
    line(gx+13.3*cw,gy+row*ch,gx+13.3*cw,gy+(row+1)*ch)
    line(gx+12*cw,gy+row*ch,gx+13.3*cw,gy+row*ch)
    text('2 to 1',gx+12.66*cw,gy+(row+.5)*ch,z+.0003,.053)
line(gx+12*cw,gy+3*ch,gx+13.3*cw,gy+3*ch)
for i,label in enumerate(('1st 12','2nd 12','3rd 12')):
    x=gx+i*4*cw;line(x,gy-.145,x,gy);line(x,gy-.145,x+4*cw,gy-.145)
    text(label,x+2*cw,gy-.073,z+.0003,.075)
line(gx+12*cw,gy-.145,gx+12*cw,gy)
for i,label in enumerate(('1 to 18','EVEN','','','ODD','19 to 36')):
    x=gx+i*2*cw;line(x,gy-.285,x,gy-.145);line(x,gy-.285,x+2*cw,gy-.285)
    if label:text(label,x+cw,gy-.218,z+.0003,.058)
    else:
        cx=x+cw;cy=gy-.216
        pts=[(cx-.076,cy,z+.0002),(cx,cy+.047,z+.0002),(cx+.076,cy,z+.0002),(cx,cy-.047,z+.0002)]
        mesh('Losange mise couleur',pts,[(0,3,2,1)],red if i==2 else black,smooth=False)
        curve('Liseré losange',[(a,b,c+.0002) for a,b,c in pts],.0009,ivory,True)
line(gx+12*cw,gy-.285,gx+12*cw,gy-.145)

# Review studio; the exported object contains no backdrop, cameras or lights.
floor=material('Fond studio gris chaud',(.31,.30,.28),.82)
obj=cube('Sol studio',(0,0,-.028),(200,200,.05),floor)
link(obj,studio)
def area(name,loc,energy,size,color,target=(0,0,.7),size_y=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy*.25;data.shape='RECTANGLE';data.size=size;data.size_y=size_y or size
    data.color=color;obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
area('Softbox principal',(-2,-3,5),1050,4,(1,.91,.8),size_y=2)
area('Softbox de remplissage',(1,4,3.5),900,3.5,(.83,.9,1),size_y=2)
area('Reflet long sur cuir',(0,-.4,4.5),550,4.5,(1,1,1),size_y=.8)
area('Lumière rasante bois',(-4,1,2),320,2,(1,.87,.69))
area('Réflecteur frontal des piédestaux',(0,-3.8,1.4),650,3,(1,.92,.83),target=(0,0,.4),size_y=1.6)
world=bpy.data.worlds.new('Studio neutre');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.39,.45,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.2
bpy.context.scene.world=world
def camera(name,loc,target,lens=52):
    data=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,data);studio.objects.link(obj)
    obj.location=loc;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler();data.lens=lens
    return obj
views=[
    ('01-perspective',camera('Vue principale', (2.7,-6.8,3.85),(0,0,.63),52)),
    ('02-dessus',camera('Vue du tapis',(0,-.5,7.4),(0,0,.60),48)),
    ('03-roue',camera('Détail roue',(-2.8,-2.65,2.9),(wx,0,1.0),65)),
    ('04-cuir-bois',camera('Détail cuir et bois',(2.8,-2.7,1.7),(1.15,-.4,.74),62)),
]
scene=bpy.context.scene;scene.camera=views[0][1]
scene.render.engine='CYCLES';scene.cycles.samples=args.samples;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=args.scale
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=0
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene['Design note']='Reference-led study: rounded walnut table, black segmented upholstery, twin turned pedestals. 0–36 European layout corrected from the supplied images.'
for obj in asset.objects:obj.select_set(False)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
            area.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'roulette-reference.blend'))

# Export a separate preview GLB. Typography and piping are converted in-memory;
# the saved Blender source retains fully editable curves and text objects.
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=next(iter(asset.objects))
bpy.ops.object.convert(target='MESH')
# Material batches keep this detailed static preview inexpensive to draw.
groups={}
for obj in asset.objects:
    if obj.type=='MESH':groups.setdefault(obj.data.materials[0].name,[]).append(obj)
for name,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    bpy.context.object.name=name
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'roulette-reference.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_animations=False)
deps=bpy.context.evaluated_depsgraph_get()
triangles=0
for obj in asset.objects:
    if obj.type=='MESH':
        data=obj.evaluated_get(deps).to_mesh();data.calc_loop_triangles();triangles+=len(data.loop_triangles);obj.evaluated_get(deps).to_mesh_clear()
manifest={'dimensions_m':[4.55,2.046,1.292],'wheel_order':ORDER,'numbered_pockets':37,'pedestals':2,'triangles':triangles,'glb_bytes':(OUT/'roulette-reference.glb').stat().st_size,'render_samples':args.samples,'source':'Four user supplied reference views; original modeled geometry and generated walnut texture.','status':'Review model; not integrated into the production casino.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if args.render:
    for name,cam in views:
        if args.views!='all' and name not in args.views.split(','):continue
        scene.camera=cam;scene.render.filepath=str(OUT/(name+'.png'))
        bpy.ops.render.render(write_still=True)
print('ROULETTE_REVIEW_READY',json.dumps(manifest))
