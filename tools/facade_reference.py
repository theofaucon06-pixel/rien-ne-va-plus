"""Reference casino entrance, animated door pivots and web-ready packed materials.
Blender --background --python tools/facade_reference.py -- --render
"""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/facade-v1';OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--render',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
asset=bpy.data.collections.new('CASINO — façade');studio=bpy.data.collections.new('STUDIO')
for coll in (asset,studio):bpy.context.scene.collection.children.link(coll)

def material(name,color,rough=.5,metal=0):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.diffuse_color=(*color,1)
    p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return mat
stone=material('Facade limestone',(.66,.59,.46),.79)
marble=material('Facade dark marble',(.026,.030,.032),.32)
gold=material('Facade brushed brass',(.56,.33,.095),.27,.82)
black=material('Facade canopy charcoal',(.012,.016,.018),.4,.25)
glass=material('Facade bronze glass',(.18,.13,.065),.13,.12)
glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.23
glass.surface_render_method='DITHERED'
warm=material('Facade warm light',(1,.65,.25),.4)
warm.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(1,.58,.20,1)
warm.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=4

# Original packed mineral textures, reproducible without external image files.
n=1024;y,x=np.mgrid[0:1:complex(n),0:1:complex(n)];rng=np.random.default_rng(17)
noise=np.zeros((n,n))
for f,amp in ((3,.35),(9,.19),(27,.11),(81,.045)):
    for k in range(4):
        angle=rng.uniform(0,math.tau);phase=rng.uniform(0,math.tau)
        noise+=amp/4*np.sin((x*math.cos(angle)+y*math.sin(angle))*f*math.tau+phase)
noise+=rng.normal(0,.018,(n,n))
for mat,name,colors in ((stone,'Limestone — mineral grain',([.68,.635,.545],[.90,.85,.75])),(marble,'Black marble — fine veins',([.065,.073,.077],[.23,.24,.24]))):
    rgba=np.ones((n,n,4),dtype=np.float32)
    if mat==stone:factor=np.clip(.5+noise,0,1)
    else:
        veins=np.abs(np.sin((x+y*.37+noise*.22)*math.pi*7))
        factor=np.clip(.09+np.exp(-veins*75)*.65+noise*.14,0,1)
    rgba[:,:,:3]=np.array(colors[0])+factor[:,:,None]*(np.array(colors[1])-np.array(colors[0]))
    image=bpy.data.images.new(name,width=n,height=n);image.pixels.foreach_set(rgba.ravel());image.pack()
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    tex=nodes.new('ShaderNodeTexImage');tex.image=image
    links.new(tex.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.0006;bump.inputs['Strength'].default_value=.18
    links.new(tex.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],nodes['Principled BSDF'].inputs['Normal'])

def cube(name,loc,size,mat,bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for coll in list(obj.users_collection):coll.objects.unlink(obj)
    asset.objects.link(obj);obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('Soft masonry edges','BEVEL');mod.width=bevel;mod.segments=3
    return obj
def rod(name,start,end,r,mat):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=3
    sp=data.splines.new('POLY');sp.points.add(1)
    for p,co in zip(sp.points,(start,end)):p.co=(*co,1)
    obj=bpy.data.objects.new(name,data);asset.objects.link(obj);data.materials.append(mat);return obj
def parent_keep(obj,parent):
    matrix=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=matrix

# Jointed stone wings and raised central pediment. Front faces toward Blender -Y.
for sign in (-1,1):
    for row in range(6):
        cube('Dalle de pierre latérale',(sign*3.42,.06,.56+row*.625),(1.54,.28,.619),stone)
    cube('Soubassement latéral',(sign*3.42,-.003,.255),(1.57,.37,.51),marble)
    cube('Couvertine latérale',(sign*3.42,.03,4.13),(1.60,.39,.10),black)
    cube('Corniche latérale',(sign*3.42,-.03,4.055),(1.60,.40,.045),stone)
    # A shallow return joins the existing long casino wall, without inventing a room.
    cube('Retour de façade',(sign*4.16,.38,2.08),(.12,.8,4.16),stone)
    cube('Socle du retour',(sign*4.18,.38,.25),(.14,.8,.50),marble)
    cx=sign*2.30
    cube('Pilastre — corps',(cx,-.065,2.40),(.82,.38,4.32),stone)
    cube('Pilastre — base',(cx,-.145,.34),(.92,.53,.20),stone)
    cube('Pilastre — socle sombre',(cx,-.10,.13),(.97,.48,.26),marble)
    cube('Pilastre — chapiteau',(cx,-.115,4.62),(.86,.48,.12),stone)
    for k in range(7):
        cube('Cannelure de pilastre',(cx-.33+k*.11,-.295,2.52),(.061,.105,4.10),stone,.022)
    cube('Couvertine du pilastre',(cx,-.04,4.72),(.93,.55,.085),black)
    # Stone reveals next to the brass frame.
    cube('Jambage en pierre',(sign*1.77,-.008,1.65),(.25,.34,2.82),stone)
for row in range(3):
    cube('Fronton en pierre',(0,.05,3.20+row*.50),(3.80,.32,.495),stone)
cube('Fronton supérieur',(0,.05,4.52),(3.80,.32,.13),stone)
cube('Corniche fine du fronton',(0,-.136,4.40),(3.81,.07,.045),stone)
cube('Couvertine centrale',(0,.03,4.72),(4.72,.48,.085),black)

# Two shallow steps, landing and a hidden rear slope to the level's ground floor.
cube('Marche basse',(0,-.88,.04),(5.00,1.72,.08),marble,.006)
cube('Marche haute',(0,-.61,.12),(4.60,1.16,.08),marble,.006)
cube('Palier',(0,-.33,.20),(4.18,.62,.08),marble,.006)
verts=[(-.98,0,.24),(.98,0,.24),(.98,.67,.002),(-.98,.67,.002)]
data=bpy.data.meshes.new('Rampe intérieure');data.from_pydata(verts,[],[(0,1,2,3)]);data.update()
obj=bpy.data.objects.new('Rampe intérieure',data);asset.objects.link(obj);data.materials.append(marble)
uv=data.uv_layers.new();
for loop in data.loops:uv.data[loop.index].uv=(verts[loop.vertex_index][0],verts[loop.vertex_index][1])

# Brass frame and glazed sidelights.
for cx in (-1.63,-.995,.995,1.63):cube('Montant fixe',(cx,-.18,1.58),(.075,.11,2.69),gold,.007)
cube('Linteau doré',(0,-.18,2.925),(3.34,.13,.095),gold)
for sign in (-1,1):
    cx=sign*1.315
    for z in (.285,2.87):cube('Traverse latérale',(cx,-.18,z),(.57,.11,.075),gold)
    cube('Fond de la baie latérale',(cx,.006,1.58),(.57,.015,2.50),black,0)
    cube('Vitrage latéral',(cx,-.19,1.58),(.54,.015,2.50),glass,.001)
    rod('Applique dorée',(cx,-.10,1.25),(cx,-.10,1.86),.032,gold)
    rod('Tube lumineux chaud',(cx,-.145,1.29),(cx,-.145,1.82),.017,warm)

# Separate named hinges survive batching and are opened by proximity in the game.
for side,sign in (('Left',-1),('Right',1)):
    hinge=bpy.data.objects.new('Door'+side,None);asset.objects.link(hinge);hinge.location=(sign*.97,-.225,.24)
    bpy.context.view_layer.update();parts=[];cx=sign*.485
    for xedge in (sign*.045,sign*.925):parts.append(cube('Vantail montant',(xedge,-.225,1.56),(.075,.095,2.64),gold,.006))
    for z in (.315,2.84):parts.append(cube('Vantail traverse',(cx,-.225,z),(.955,.095,.14),gold,.006))
    parts.append(cube('Vantail verre',(cx,-.225,1.56),(.808,.012,2.37),glass,.001))
    hx=sign*.13
    for z in (1.0,1.61):parts.append(rod('Attache poignée',(hx,-.24,z),(hx,-.325,z),.013,gold))
    parts.append(rod('Poignée verticale',(hx,-.325,.99),(hx,-.325,1.62),.019,gold))
    bpy.context.view_layer.update()
    for obj in parts:parent_keep(obj,hinge)

# Charcoal canopy, thin brass rims and three recessed warm spots.
cube('Marquise noire',(0,-.68,3.12),(4.70,1.44,.26),black,.009)
for z in (2.985,3.255):cube('Liseré laiton de marquise',(0,-.68,z),(4.74,1.47,.033),gold,.006)
for z in (2.977,3.263):cube('Panneau noir de marquise',(0,-.68,z),(4.62,1.35,.034),black,.003)
for x in (-1.55,0,1.55):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.065,depth=.012,location=(x,-.89,2.960))
    obj=bpy.context.object;obj.name='Spot encastré'
    for coll in list(obj.users_collection):coll.objects.unlink(obj)
    asset.objects.link(obj);obj.data.materials.append(warm)
    rod('Joint sous la marquise',(x-.45,-1.38,2.979),(x-.45,.015,2.979),.002,black)
fontpath=Path('/System/Library/Fonts/Supplemental/Georgia.ttf')
font=bpy.data.fonts.load(str(fontpath)) if fontpath.exists() else bpy.data.fonts.get('Bfont')
data=bpy.data.curves.new('CASINO — lettres en relief','FONT');data.body='C A S I N O';data.font=font;data.size=.57
data.align_x='CENTER';data.extrude=.015;data.bevel_depth=.002;data.bevel_resolution=2
obj=bpy.data.objects.new('Enseigne CASINO',data);asset.objects.link(obj);data.materials.append(gold)
obj.location=(0,-.13,3.93);obj.rotation_euler.x=math.pi/2

# Studio with a lit backdrop behind the actual door opening (never exported).
floor=material('Studio floor',(.32,.33,.34),.82)
obj=cube('Sol studio',(0,0,-.04),(200,200,.07),floor)
asset.objects.unlink(obj);studio.objects.link(obj)
obj=cube('Fond derrière ouverture',(0,1.5,1.7),(2.3,.05,3.0),stone)
asset.objects.unlink(obj);studio.objects.link(obj)
def light(name,loc,power,size,target):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
light('Softbox',(-4,-6,7),1100,6,(0,0,2));light('Fill',(5,-3,5),800,5,(0,0,2))
light('Vestibule',(0,.7,2.5),95,1.2,(0,0,1))
for x in (-1.55,0,1.55):light('Lumière marquise',(x,-.9,2.93),35,.15,(x,-.5,.1))
world=bpy.data.worlds.new('Studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.52,.55,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.4
scene=bpy.context.scene;scene.world=world
views=[]
for name,loc in [('01-front',(0,-13,4.2)),('02-perspective',(7.5,-12,6.2))]:
    data=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,-.1,2.25))-obj.location).to_track_quat('-Z','Y').to_euler();data.lens=45;views.append((name,obj))
scene.camera=views[0][1];scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'casino-facade.blend'))

# Keep hinges separate; batch the fixed architecture and each leaf by material.
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:
    if obj.type in ('MESH','CURVE','FONT'):obj.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in asset.objects if o.select_get());bpy.ops.object.convert(target='MESH')
groups={}
for obj in asset.objects:
    if obj.type=='MESH':groups.setdefault((obj.parent.name if obj.parent else 'Static',obj.data.materials[0].name),[]).append(obj)
for (parent,name),objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    bpy.context.object.name=parent+' — '+name
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:obj.select_set(True)
path=ROOT/'assets/models/casino-facade-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
triangles=0
for obj in asset.objects:
    if obj.type=='MESH':obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
(OUT/'manifest.json').write_text(json.dumps({'triangles':triangles,'material_batches':len(groups),'glb_bytes':path.stat().st_size,'door_pivots':['DoorLeft','DoorRight'],'opening_m':1.84,'steps_m':[.08,.16,.24]},indent=2)+'\n')
if args.render:
    for name,cam in views:
        scene.camera=cam;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
print('FACADE_READY',path,triangles)
