"""Build the reference entrance hall in Blender, in metres, with packed PBR maps.
Blender --background --python tools/hall_reference.py -- --render
Local X = world X - 40, local Y = 13.5 - world Z. All gameplay openings stay put.
"""
import argparse, json, math, sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art/hall-v1'; OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(); parser.add_argument('--render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
asset = bpy.data.collections.new('HALL — architecture et mobilier')
studio = bpy.data.collections.new('STUDIO — éclairage et caméras')
for coll in (asset, studio): bpy.context.scene.collection.children.link(coll)

def material(name, color, rough=.5, metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m
white=material('Hall ivory marble',(.72,.69,.60),.26)
dark=material('Hall noir marble',(.035,.03,.025),.48)
wood=material('Hall walnut',(.14,.055,.02),.42)
gold=material('Hall satin brass',(.64,.39,.12),.3,.82)
black=material('Hall charcoal',(.019,.020,.018),.62,.08)
glass=material('Hall clear glass',(.80,.88,.86),.12,.04)
glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.13
glass.surface_render_method='DITHERED'
warm=material('Hall warm lamps',(1,.72,.35),.35)
warm.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(1,.68,.3,1)
warm.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=2
letter=material('Hall ivory lettering',(.95,.82,.51),.4,.12)
leaf=material('Hall palm leaves',(.047,.14,.021),.65)
leaf.use_backface_culling=False
water=material('Hall fountain water',(.022,.22,.29),.19,.3)

# Original deterministic bitmap textures; no external asset dependencies.
n=1024; yy,xx=np.mgrid[0:1:complex(n),0:1:complex(n)]
rng=np.random.default_rng(61)
warp=np.zeros_like(xx)
for frequency,amplitude in ((2,.34),(5,.12),(13,.05),(37,.018)):
    for k in range(3):
        angle=rng.uniform(0,math.tau)
        warp+=amplitude*np.sin((xx*math.cos(angle)+yy*math.sin(angle))*frequency*math.tau+rng.uniform(0,6.28))/3
veins=np.exp(-np.abs(np.sin((xx*.9+yy*.63+warp*.48)*math.pi*8))*26)
fine=np.exp(-np.abs(np.sin((xx*.31-yy+warp*.16)*math.pi*19))*110)
cloud=np.clip(.5+warp,0,1)
white_rgb=np.stack([.84+cloud*.08,.81+cloud*.08,.73+cloud*.09],axis=-1)
white_rgb-=veins[:,:,None]*np.array([.26,.33,.40])+fine[:,:,None]*.065
dark_rgb=np.stack([.043+cloud*.020,.038+cloud*.018,.031+cloud*.016],axis=-1)
dark_rgb+=veins[:,:,None]*np.array([.26,.17,.073])+fine[:,:,None]*.027
grain=(np.sin((yy*47+warp*.85)*math.tau)*.5+.5)**5
wood_rgb=np.stack([.095+cloud*.06+grain*.03,.035+cloud*.028+grain*.017,.014+cloud*.016+grain*.007],axis=-1)

def texture(mat,name,rgb,normal=False):
    image=bpy.data.images.new(name,width=rgb.shape[1],height=rgb.shape[0])
    rgba=np.ones((*rgb.shape[:2],4),dtype=np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
    image.pixels.foreach_set(rgba.ravel());image.file_format='PNG' if normal else 'JPEG';image.pack()
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;tex=nodes.new('ShaderNodeTexImage');tex.image=image
    if normal:
        image.colorspace_settings.name='Non-Color'
        nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.28
        links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],nodes['Principled BSDF'].inputs['Normal'])
    else:links.new(tex.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
    return image
texture(white,'Ivory marble — fine warm mineral veins',white_rgb)
texture(dark,'Noir marble — restrained gold veins',dark_rgb)
texture(wood,'Walnut — fine horizontal grain',wood_rgb)

# One UV atlas for the tiled floor, including soft contact shading around furniture.
floor=material('Hall tiled marble floor',(.75,.72,.65),.25)
N=2048; fy,fx=np.mgrid[0:1:complex(N),0:1:complex(N)]
mx=fx*12-6; my=fy*10-5.1
tilex=np.floor((mx+6)/1.0);tiley=np.floor((my+5.1)/1.0)
u=((mx+6)%1+.17*tilex+.39*tiley)%1;v=((my+5.1)%1+.27*tilex+.13*tiley)%1
floor_rgb=white_rgb[(v*(n-1)).astype(int),(u*(n-1)).astype(int)].copy()
joint=(np.minimum((mx+6)%1,1-(mx+6)%1)<.003)|(np.minimum((my+5.1)%1,1-(my+5.1)%1)<.003)
floor_rgb[joint]*=.73
ao=np.ones((N,N))
for cx,cy,r,strength in [(0,0,1.25,.55),(-3.875,1.3,1,.45),(3.875,1.3,1,.45),(-4.3,-2.25,.6,.50)]+[(x,y,.34,.55) for x in (-5.125,5.125) for y in (3.875,-4.125)]+[(x,-4.5,.32,.45) for x in (-1,1)]:
    dist=np.hypot((mx-cx)/(1.6 if abs(cx)==3.875 else 1),my-cy)
    ao*=1-strength*np.exp(-np.maximum(0,dist-r)**2/.085)
floor_rgb*=ao[:,:,None]
texture(floor,'Floor atlas — 120 tiles and contact shading',floor_rgb)

# Water's concentric normal map stays independently animated in the browser.
r=np.hypot(xx-.5,yy-.5);ang=np.arctan2(yy-.5,xx-.5)
height=np.sin(r*240+np.sin(ang*9)*.5)*.004+np.sin(xx*120+yy*92)*.001
dy,dx=np.gradient(height)
normal=np.stack([-dx*90,-dy*90,np.ones_like(dx)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1)[:,:,None]
texture(water,'Fountain — ripple normals',normal*.5+.5,True)

def link(obj,mat):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    asset.objects.link(obj)
    if mat:obj.data.materials.append(mat)
    return obj
def cube(name,loc,size,mat,bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=link(bpy.context.object,mat);o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    # Per-face UVs in metres keep the marble grain consistent across slabs.
    uv=o.data.uv_layers.active
    for p in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3) if i!=axis]
        for li in p.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]/1.4+.5,co[axes[1]]/1.4+.5)
    if bevel:
        m=o.modifiers.new('Edges catch the light','BEVEL');m.width=bevel;m.segments=2
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def mesh(name,verts,faces,mat):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);asset.objects.link(o);d.materials.append(mat)
    return o
def curve(name,pts,r,mat):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=r;d.bevel_resolution=2
    s=d.splines.new('POLY');s.points.add(len(pts)-1)
    for p,co in zip(s.points,pts):p.co=(*co,1)
    o=bpy.data.objects.new(name,d);asset.objects.link(o);d.materials.append(mat);return o
def cyl(name,loc,r,depth,mat,rt=None):
    bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=r,radius2=r if rt is None else rt,depth=depth,location=loc)
    o=link(bpy.context.object,mat);o.name=name
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    return o
def torus(name,loc,r,tube,mat,vertical=False):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=tube,major_segments=80,minor_segments=8,location=loc)
    o=link(bpy.context.object,mat);o.name=name
    if vertical:o.rotation_euler.x=math.pi/2
    for p in o.data.polygons:p.use_smooth=True
    return o
def sphere(name,loc,r,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=r,location=loc)
    o=link(bpy.context.object,mat);o.name=name
    for p in o.data.polygons:p.use_smooth=True
    return o
def parent_keep(o,parent):
    bpy.context.view_layer.update();m=o.matrix_world.copy();o.parent=parent;o.matrix_world=m
font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Georgia.ttf')
def text(name,body,loc,size,mat,yaw=0):
    d=bpy.data.curves.new(name,'FONT');d.body=body;d.font=font;d.size=size;d.align_x='CENTER';d.extrude=.0015;d.resolution_u=4
    o=bpy.data.objects.new(name,d);asset.objects.link(o);d.materials.append(mat);o.location=loc
    # Text faces local +Y (toward the entrance).
    o.rotation_euler=(math.pi/2,0,math.pi+yaw)
    return o

# Floor and ceiling fit the existing 12 x 10 m hall exactly.
o=mesh('Hall floor',[(-6,-5.1,.004),(6,-5.1,.004),(6,4.9,.004),(-6,4.9,.004)],[(0,1,2,3)],floor)
uv=o.data.uv_layers.new()
for li,co in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[li].uv=co
cube('Dark recessed ceiling',(0,-.1,4.19),(12,10,.02),black,0)
# A framed dark entrance inlay, away from the doors and the two walkways.
cube('Entry marble inlay',(-2,3.78,.009),(2.8,1.48,.012),dark,.002)
for x in (-3.38,-.62):cube('Inlay brass edge',(x,3.78,.018),(.009,1.45,.003),gold,0)
for y in (3.055,4.505):cube('Inlay brass edge',(-2,y,.018),(2.76,.009,.003),gold,0)

# Panel walls, segmented around the real openings. Thin liners do not obstruct paths.
def wall_run(axis,fixed,start,end):
    length=end-start;count=max(1,round(length/1.05));step=length/count
    for i in range(count):
        c=start+(i+.5)*step
        for z,h in ((1.545,2.86),(3.49,1.02)):
            loc=(fixed,c,z) if axis=='x' else (c,fixed,z)
            size=(.035,step-.012,h) if axis=='x' else (step-.012,.035,h)
            cube('Bookmatched noir wall panel',loc,size,dark,.003)
    for z,h,mat in ((.065,.13,black),(.16,.013,gold),(2.91,.02,gold),(3.99,.10,black),(4.065,.014,gold)):
        cube('Wall continuous trim',(fixed,(start+end)/2,z) if axis=='x' else ((start+end)/2,fixed,z),(.055,length,h) if axis=='x' else (length,.055,h),mat,.002)
for x in (-5.975,5.975):
    wall_run('x',x,-5.1,-1.11);wall_run('x',x,1.11,4.9)
    low=2.30 if x<0 else 2.60
    cube('Side door transom',(x,0,(low+4.19)/2),(.04,2.23,4.19-low),black,.003)
for a,b in ((-6,-1.01),(1.01,6)):wall_run('y',-5.075,a,b)
cube('Bar door transom',(0,-5.075,3.395),(2.02,.04,1.59),black,.003)
for a,b in ((-6,-3.02),(-.98,6)):wall_run('y',4.875,a,b)
cube('Entrance transom',(-2,4.875,3.65),(2.04,.04,1.0),black,.003)

# Deep-looking brass portals. Actual labels follow the casino map.
def portal(name,x,y,width,height,yaw=0):
    def pos(u,v,z):return (x+u*math.cos(yaw)-v*math.sin(yaw),y+u*math.sin(yaw)+v*math.cos(yaw),z)
    for u in (-width/2-.07,width/2+.07):
        o=cube('Portal brass jamb',pos(u,0,height/2),(.13,.10,height),gold,.012);o.rotation_euler.z=yaw
    o=cube('Portal lintel',pos(0,0,height+.065),(width+.26,.10,.13),gold,.009);o.rotation_euler.z=yaw
    o=cube('Portal black nameplate',pos(0,-.012,height+.34),(width+.30,.07,.36),black,.009);o.rotation_euler.z=yaw
    text('Portal lettering '+name,name,pos(0,.032,height+.26),.20,letter,yaw)
portal('BAR',0,-5.04,2,2.45)
portal('TABLES',5.94,0,2.2,2.45,math.pi/2)
portal('MACHINES',-5.94,0,2.2,2.14,-math.pi/2)

# White columns, brass collars and warm cove lighting.
for x in (-5.125,5.125):
    for y in (3.875,-4.125):
        cyl('Ivory column',(x,y,2.08),.315,3.94,white)
        for z,r,h in ((.055,.39,.11),(.145,.35,.07),(4.06,.365,.15)):
            cyl('Column brass collar',(x,y,z),r,h,gold)
        for z in (1.4,2.78):torus('Column stone joint',(x,y,z),.315,.002,black)
for x in (-5.72,5.72):
    cube('Cove shelf',(x,-.1,4.04),(.38,10,.065),black,.003)
    cube('Cove warm strip',(x+(.20 if x<0 else -.20),-.1,4.025),(.019,9.9,.018),warm,.002)
for y in (-4.83,4.63):
    cube('Cove shelf',(0,y,4.04),(11.5,.38,.065),black,.003)
    cube('Cove warm strip',(0,y+(.20 if y<0 else -.20),4.025),(11.4,.019,.018),warm,.002)
for x in (-5.89,5.89):
    for y in (-2.9,2.7):
        cube('Wall sconce back',(x,y,2.2),(.07,.18,.48),gold,.009)
        cyl('Sconce socket',(x+(.045 if x<0 else -.045),y,2.18),.046,.35,gold)
        cyl('Sconce opal tube',(x+(.048 if x<0 else -.048),y,2.41),.036,.24,warm)

# Two counter vitrines, matching the original interaction and collision footprints.
for x,label in ((-3.875,'CAISSE'),(3.875,'FIDÉLITÉ')):
    y=1.3
    cube('Counter shadow plinth',(x,y,.06),(3.20,.87,.12),black,.006)
    cube('Walnut counter',(x,y,.57),(3.25,.90,.98),wood,.012)
    cube('Marble counter slab',(x,y,1.10),(3.31,.96,.10),white,.012)
    for gx in (x-1.48,x+1.48):
        cyl('Glass post',(gx,y,1.54),.016,.78,gold)
        cyl('Glass post shoe',(gx,y,1.18),.045,.065,gold)
        for gz in (1.28,1.82):cube('Glass clamp',(gx,y,gz),(.055,.038,.035),gold,.004)
    cube('Counter protective glass',(x,y,1.55),(2.94,.011,.74),glass,.001)
    for gx in (x-1.50,x+1.50):cube('Glass return',(gx,y-.19,1.55),(.011,.38,.74),glass,.001)
    cube('Counter brass label',(x,y+.461,.88),(.86,.012,.16),gold,.004)
    text('Counter name',label,(x,y+.472,.835),.10,black)

# Lathed marble fountain: real hollow basin, moulded rim and central gilded sphere.
profile=[(1.25,.015),(1.25,.07),(1.23,.11),(1.20,.20),(1.16,.44),(1.145,.49),(1.14,.52),(1.07,.52),(1.035,.47),(1.02,.14)]
verts=[];faces=[]
for radius,z in profile:
    verts.extend([(math.cos(i*math.tau/96)*radius,math.sin(i*math.tau/96)*radius,z) for i in range(96)])
for j in range(len(profile)-1):
    for i in range(96):faces.append((j*96+i,j*96+(i+1)%96,(j+1)*96+(i+1)%96,(j+1)*96+i))
o=mesh('Carved ivory fountain basin',verts,faces,white)
uv=o.data.uv_layers.new()
for p in o.data.polygons:
    p.use_smooth=True
    for li in p.loop_indices:
        co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(math.atan2(co.y,co.x)/math.tau*4,co.z)
torus('Fountain rolled stone lip',(0,0,.51),1.106,.045,white)
torus('Fountain fine brass seam',(0,0,.46),1.155,.008,gold)
o=cyl('FountainWater',(0,0,.43),1.054,.014,water)
o['separate']='water'
cyl('Fountain brass pedestal',(0,0,.81),.165,.76,gold)
cyl('Fountain dish',(0,0,1.19),.30,.046,gold,rt=.34)
sphere('Fountain gilded sphere',(0,0,1.39),.235,gold)

# Large double-ring chandelier, pendants, cables and porcelain flame bulbs.
for radius,z in ((1.68,3.23),(.89,3.66)):
    torus('Chandelier brass ring',(0,0,z),radius,.033,gold)
    torus('Chandelier inner rim',(0,0,z+.052),radius-.01,.009,gold)
    for i in range(16 if radius>1 else 8):
        a=i*math.tau/(16 if radius>1 else 8);x=math.cos(a)*radius;y=math.sin(a)*radius
        cyl('Pendant brass stem',(x,y,z+.09),.024,.38,gold)
        cyl('Ivory candle sleeve',(x,y,z+.30),.037,.12,warm)
        sphere('Opal bulb tip',(x,y,z+.363),.036,warm)
for a in (0,math.tau/3,2*math.tau/3):
    curve('Suspension cable',[(math.cos(a)*1.68,math.sin(a)*1.68,3.24),(0,0,4.10)],.007,gold)
cyl('Chandelier ceiling rose',(0,0,4.13),.15,.075,gold)

# Fortune wheel, with a separate rotor, fine separators, rim bulbs and fixed pointer.
cx,cy=-4.3,-2.25
cyl('Fortune circular base',(cx,cy,.07),.52,.14,gold)
cyl('Fortune black plinth',(cx,cy,.18),.47,.08,black)
for dx in (-.26,.26):curve('Wheel support',[(cx+dx,cy,.21),(cx+dx*.65,cy,1.66)],.025,gold)
rotor=bpy.data.objects.new('FortuneRotor',None);asset.objects.link(rotor);rotor.location=(cx,cy,1.78)
palette=[(.74,.09,.035),(.045,.18,.36),(.87,.75,.39),(.045,.27,.14),(.28,.09,.30),(.78,.72,.58)]
sectors=[material('Hall wheel segment '+str(i),c,.48,.06) for i,c in enumerate(palette)]
for i in range(54):
    a=i*math.tau/54;b=(i+1)*math.tau/54
    pts=[(cx,cy+.016,1.78),(cx+math.cos(a)*.88,cy+.016,1.78+math.sin(a)*.88),(cx+math.cos(b)*.88,cy+.016,1.78+math.sin(b)*.88)]
    o=mesh('Wheel enamel sector',pts,[(0,2,1)],sectors[i%6]);parent_keep(o,rotor)
    o=curve('Wheel radial inlay',[(cx+math.cos(a)*.18,cy+.025,1.78+math.sin(a)*.18),(cx+math.cos(a)*.88,cy+.025,1.78+math.sin(a)*.88)],.005,gold);parent_keep(o,rotor)
torus('Fortune rim',(cx,cy,1.78),.90,.031,gold,True)
o=sphere('Wheel brass hub',(cx,cy+.035,1.78),.20,gold);o.scale.y=.25
for i in range(20):
    a=i*math.tau/20;x=cx+math.cos(a)*1.00;z=1.78+math.sin(a)*1.00
    curve('Rim bulb stem',[(cx+math.cos(a)*.92,cy,z-math.sin(a)*.08),(x,cy,z)],.009,gold)
    sphere('Wheel rim lamp',(x,cy,z),.023,warm)
o=mesh('Fixed wheel pointer',[(cx-.048,cy+.07,2.79),(cx+.048,cy+.07,2.79),(cx,cy+.07,2.68)],[(0,2,1)],gold)
cube('Fortune sign',(cx,cy,3.04),(2.23,.10,.29),black,.01)
text('Fortune lettering','ROUE DE LA FORTUNE',(cx,cy+.061,2.985),.135,letter)

# Botanical fronds with individual leaflets instead of low-poly cones.
for px in (-1,1):
    py=-4.5
    cyl('Palm ceramic planter',(px,py,.26),.24,.52,black,rt=.30)
    cyl('Planter soil',(px,py,.512),.276,.016,dark)
    for j in range(9):
        a=j*math.tau/9;length=.53+(j%3)*.12;peak=1.15+(j%3)*.22
        points=[]
        for k in range(13):
            t=k/12;points.append((px+math.cos(a)*length*t,py+math.sin(a)*length*t,.47+peak*math.sin(t*1.9)))
        curve('Palm curved rachis',points,.007,leaf)
        for k in range(2,12):
            t=k/12;center=Vector(points[k]);span=.19*math.sin(t*math.pi)**.6
            for sign in (-1,1):
                side=Vector((-math.sin(a)*sign,math.cos(a)*sign,.08));tip=center+side*span+Vector((math.cos(a)*.11,math.sin(a)*.11,-.07))
                v=[tuple(center+Vector((0,0,.009))),tuple(center+side*span*.40+Vector((math.cos(a)*.04,math.sin(a)*.04,.013))),tuple(tip),tuple(center+side*span*.35+Vector((math.cos(a)*.09,math.sin(a)*.09,-.035)))]
                mesh('Palm leaflet',v,[(0,1,2,3),(3,2,1,0)],leaf)

# Native render lights are not exported: the runtime uses its bounded light pool.
def area(name,loc,power,size,target,color=(1,.80,.55)):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Chandelier soft pool',(0,0,3.05),330,3,(0,0,0))
for x in (-4,4):
    for y in (-3,3):area('Ceiling wash',(x,y,3.96),160,2,(x*.7,y,0))
area('Entrance fill',(0,4.5,2.8),160,4,(0,-2,1),(1,.9,.77))
area('Back wall wash',(0,-2.5,3.6),110,3,(0,-5,2))
world=bpy.data.worlds.new('Night interior');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.12,.16,1);world.node_tree.nodes['Background'].inputs[1].default_value=.15
scene=bpy.context.scene;scene.world=world
views=[]
for name,loc,target,lens in [('01-entrance',(0,4.6,1.9),(0,-1.4,1.65),19),('02-details',(4.4,3.9,2.6),(-1,-1,1.4),20)]:
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;views.append((name,o))
scene.camera=views[0][1];scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
scene['Reference']='Five supplied lobby views: noir/gold walls, ivory floor and columns, walnut vitrines, fountain, ring chandelier and fortune wheel. Portals follow the existing world map.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'casino-hall.blend'))

# Apply modifiers and batch fixed meshes by material; keep water and rotor separate.
bpy.ops.object.select_all(action='DESELECT')
for o in asset.objects:
    if o.type in ('MESH','CURVE','FONT'):o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in asset.objects if o.select_get());bpy.ops.object.convert(target='MESH')
groups={}
for o in list(asset.objects):
    if o.type=='MESH':groups.setdefault((o.parent.name if o.parent else ('FountainWater' if o.get('separate')=='water' else 'Static'),o.data.materials[0].name),[]).append(o)
for (parent,name),objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    bpy.context.object.name='FountainWater' if parent=='FountainWater' else parent+' — '+name
bpy.ops.object.select_all(action='DESELECT')
for o in asset.objects:o.select_set(True)
path=ROOT/'assets/models/casino-hall-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_image_format='JPEG',export_image_quality=92)
triangles=0
for o in asset.objects:
    if o.type=='MESH':o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
(OUT/'manifest.json').write_text(json.dumps({'triangles':triangles,'material_batches':len(groups),'glb_bytes':path.stat().st_size,'dimensions_m':[12,10,4.2],'origin_world_m':[40,0,13.5],'animated_nodes':['FountainWater','FortuneRotor'],'preserved_openings':['entrance','machines','tables','bar']},indent=2)+'\n')
if args.render:
    for name,cam in views:scene.camera=cam;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
print('HALL_READY',path,triangles)
