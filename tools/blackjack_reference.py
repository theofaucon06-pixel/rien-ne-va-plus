"""Build the reference blackjack in Blender, export it to the game, render a studio view.

Blender --background --python tools/blackjack_reference.py -- --render
Shares the packed walnut/leather materials of the approved roulette source.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art' / 'blackjack-v2'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--render', action='store_true')
parser.add_argument('--samples', type=int, default=32)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
asset = bpy.data.collections.new('BLACKJACK — modèle')
studio = bpy.data.collections.new('STUDIO')
for coll in (asset, studio): bpy.context.scene.collection.children.link(coll)
TAU = math.tau

with bpy.data.libraries.load(str(ROOT/'art/roulette-v2/roulette-reference.blend')) as (src, dst):
    dst.materials = [name for name in src.materials if name.startswith(('Noyer', 'Cuir noir', 'Drap vert', 'Séparateurs', 'Fil et'))]
wood = next(m for m in dst.materials if m.name.startswith('Noyer'))
leather = next(m for m in dst.materials if m.name.startswith('Cuir'))
felt = next(m for m in dst.materials if m.name.startswith('Drap'))
silver = next(m for m in dst.materials if m.name.startswith('Séparateurs'))
thread = next(m for m in dst.materials if m.name.startswith('Fil'))

def material(name, color, rough=.4, metal=0):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    p = mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return mat

ink = material('Encre dorée du tapis', (.78,.59,.25), .8)
traymat = material('Bac noir satiné', (.008,.009,.010), .28)
glass = material('Acrylique transparent du sabot', (.64,.73,.77), .15)
glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = .12
glass.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = .18
glass.surface_render_method = 'DITHERED'
edge = material('Tranches polies du sabot', (.48,.54,.56), .18, .2)

# A subtle packed felt texture survives export as well as the walnut texture.
rng = np.random.default_rng(21)
n = 512
pixels = np.ones((n,n,4), dtype=np.float32)
noise = rng.normal(1,.045,(n,n))
pixels[:,:,:3] = np.array([.065,.245,.172])[None,None,:] * noise[:,:,None]
image = bpy.data.images.new('Feutre vert — fibres originales', width=n, height=n)
image.pixels.foreach_set(pixels.ravel()); image.pack()
node = felt.node_tree.nodes.new('ShaderNodeTexImage'); node.image = image
felt.node_tree.links.new(node.outputs['Color'], felt.node_tree.nodes['Principled BSDF'].inputs['Base Color'])

def mesh(name, verts, faces, mat, smooth=False, uv=None):
    data = bpy.data.meshes.new(name); data.from_pydata(verts, [], faces); data.update()
    obj = bpy.data.objects.new(name, data); asset.objects.link(obj); data.materials.append(mat)
    layer = data.uv_layers.new(name='UVMap')
    for p in data.polygons:
        p.use_smooth = smooth
        for li in p.loop_indices:
            vi = data.loops[li].vertex_index
            layer.data[li].uv = uv[vi] if uv else (verts[vi][0]/3.6+.5, verts[vi][1]/1.8+.5)
    return obj

def bevel(obj, width=.005):
    mod = obj.modifiers.new('Arêtes adoucies', 'BEVEL'); mod.width = width; mod.segments = 3
    return obj

def cube(name, loc, size, mat, radius=.005):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for coll in list(obj.users_collection): coll.objects.unlink(obj)
    asset.objects.link(obj); obj.data.materials.append(mat)
    if radius: bevel(obj, radius)
    return obj

def curve(name, pts, radius, mat, cyclic=False):
    data = bpy.data.curves.new(name, 'CURVE'); data.dimensions = '3D'
    data.bevel_depth = radius; data.bevel_resolution = 2
    spline = data.splines.new('POLY'); spline.points.add(len(pts)-1)
    for point, co in zip(spline.points, pts): point.co = (*co, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data); asset.objects.link(obj); data.materials.append(mat)
    return obj

def lathe(name, profile, mat, cx=0, cy=0, segments=96):
    verts, uv, faces = [], [], []
    for r,z in profile:
        for k in range(segments+1):
            a = TAU*k/segments
            verts.append((cx+r*math.cos(a), cy+r*math.sin(a), z)); uv.append((z*1.3,k/segments))
    for j in range(len(profile)-1):
        for k in range(segments):
            a = j*(segments+1)+k; b = a+segments+1
            faces.append((a,a+1,b+1,b))
    return mesh(name, verts, faces, mat, True, uv)

def outline(rx=1.8, ry=1.65, back=.67):
    return [(rx*math.cos(a), back-ry*math.sin(a)) for a in np.linspace(0,math.pi,129)]

def deck(name, rx, ry, back, bottom, top, mat):
    pts = outline(rx,ry,back); n = len(pts)
    verts = [(x,y,z) for z in (bottom,top) for x,y in pts]
    faces = [tuple(range(n-1,-1,-1)), tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    # The clockwise outline needs outward normals for a real solid.
    faces = [tuple(reversed(face)) for face in faces]
    obj = mesh(name,verts,faces,mat)
    for p in list(obj.data.polygons)[2:]:
        p.use_smooth = len(p.vertices)==4 and p.index < n+1
        for li in p.loop_indices:
            vi = obj.data.loops[li].vertex_index
            obj.data.uv_layers.active.data[li].uv = ((vi%n)/n*2,(verts[vi][2]-bottom)*2)
    bevel(obj,.007)
    return obj

deck('Ceinture en noyer — demi-lune',1.8,1.65,.67,.785,.932,wood)
deck('Moulure basse',1.8,1.65,.67,.784,.807,wood)
deck('Feutre encastré',1.675,1.51,.64,.928,.943,felt)
cube('Traverse côté croupier',(0,.657,.934),(3.47,.035,.025),wood,.007)
for z in (.812,.923):
    curve('Filet de finition du noyer',[(x,y,z) for x,y in outline(1.799,1.649)],.0013,thread,True)

# One continuous padded rail, with rounded caps at the dealer's edge.
verts, faces, uv = [], [], []
path = outline(1.728,1.577,.647)
for k,(x,y) in enumerate(path):
    a = math.pi*k/(len(path)-1)
    norm = Vector((math.cos(a)/1.728,-math.sin(a)/1.577)); norm.normalize()
    for j in range(25):
        t = TAU*j/24
        verts.append((x+norm.x*.099*math.cos(t),y+norm.y*.099*math.cos(t),.962+.051*math.sin(t)))
        uv.append((k/len(path)*4,j/24))
for k in range(len(path)-1):
    for j in range(24):
        q=k*25+j; faces.append((q,q+25,q+26,q+1))
faces += [tuple(reversed(range(25))),tuple(range((len(path)-1)*25,len(path)*25))]
mesh('Accoudoir de cuir noir continu',verts,[tuple(reversed(f)) for f in faces],leather,True,uv)
for x,y in (path[0],path[-1]):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(x,y,.962))
    obj=bpy.context.object; obj.name='Extrémité arrondie du cuir'; obj.scale=(.099,.046,.051)
    for coll in list(obj.users_collection): coll.objects.unlink(obj)
    asset.objects.link(obj);obj.data.materials.append(leather)
    for p in obj.data.polygons:p.use_smooth=True
curve('Couture intérieure du cuir',[(x,y,.972) for x,y in outline(1.628,1.477,.647)],.0014,thread)

profile=[(0,.012),(.295,.012),(.332,.025),(.345,.047),(.345,.066),(.333,.083),(.316,.09),(.314,.115),(.304,.13),(.283,.146),(.271,.174),(.267,.199),(.235,.225),(.231,.268),(.231,.692),(.245,.725),(.267,.749),(.275,.772),(.271,.791),(0,.791)]
for cx in (-.94,.94):
    lathe('Piédestal tourné en noyer',profile,wood,cx,-.07)
    for p in range(12):
        a=TAU*p/12
        curve('Moulure verticale de piédestal',[(cx+r*math.cos(a),-.07+r*math.sin(a),z) for r,z in [(.233,.268),(.24,.285),(.24,.676),(.233,.692)]],.0055,wood)

# Seven thin printed betting rectangles follow the player's curved edge.
for i,a in enumerate(np.linspace(math.radians(24),math.radians(156),7)):
    cx,cy=1.30*math.cos(a),.53-1.04*math.sin(a)
    rot=math.pi/2-a
    pts=[]
    for ox,oy in [(-.093,-.124),(.093,-.124),(.093,.124),(-.093,.124)]:
        pts.append((cx+ox*math.cos(rot)-oy*math.sin(rot),cy+ox*math.sin(rot)+oy*math.cos(rot),.945))
    curve('Mise %d — encre dorée'%(i+1),pts,.0022,ink,True)

fontpath=Path('/System/Library/Fonts/Supplemental/Georgia.ttf')
font=bpy.data.fonts.load(str(fontpath)) if fontpath.exists() else bpy.data.fonts.get('Bfont')
text='BLACKJACK PAYS 3 TO 2'
widths=[]
for char in text:
    data=bpy.data.curves.new('Lettre','FONT');data.body=char;data.font=font;data.size=.087
    obj=bpy.data.objects.new('Inscription — '+char,data);asset.objects.link(obj);data.materials.append(ink)
    bpy.context.view_layer.update();widths.append((obj,max(obj.dimensions.x,.027)+.006))
pen=-sum(width for _,width in widths)/2
for obj,width in widths:
    x=pen+width/2; y=-.175+.21*(x/.85)**2
    obj.data.align_x='CENTER';obj.location=(x,y,.9448);obj.rotation_euler.z=math.atan(.42*x/.85**2)
    pen+=width
curve('Arc sous inscription',[(x,-.23+.21*(x/.85)**2,.945) for x in np.linspace(-.86,.86,97)],.0017,ink)

# Recessed-looking chip tray: twelve individual semicircular channels.
cube('Fond du bac à jetons',(0,.438,.953),(1.23,.315,.014),traymat,.014)
for x in (-.605,.605):cube('Cadre latéral du bac',(x,.438,.974),(.045,.323,.03),traymat,.012)
for y in (.293,.583):cube('Cadre du bac',(0,y,.974),(1.20,.034,.03),traymat,.009)
for i in range(12):
    cx=-.55+i*.10
    pts=[(cx+.046*math.cos(a),y,.985-.029*math.sin(a)) for y in (.31,.565) for a in np.linspace(0,math.pi,17)]
    mesh('Gouttière du bac %02d'%i,pts,[(j+17,j+18,j+1,j) for j in range(16)],traymat,True)
    curve('Cloison du bac',[(cx+.047,.313,.985),(cx+.047,.566,.985)],.003,traymat)
lathe('Serrure du bac',[(0,.989),(.016,.989),(.016,.995),(0,.995)],silver,0,.283,32)
cube('Fente de la serrure',(0,.283,.996),(.002,.014,.001),traymat,0)

# Card shoe with dark side panels, clear cover, visible polished edges.
shoe=[]
shoe.append(cube('Base du sabot',(1.285,.386,.963),(.245,.46,.026),traymat,.005))
shoe.append(cube('Semelle du sabot',(1.285,.386,.978),(.224,.432,.009),silver,.003))
for x in (1.174,1.396):
    v=[(x,.181,.987),(x,.597,.987),(x,.597,1.213),(x,.385,1.181),(x,.181,1.033)]
    shoe.append(mesh('Flanc noir du sabot',v,[(0,1,2,3,4)],traymat))
v=[(x,y,z) for x in (1.17,1.40) for y,z in [(.177,1.035),(.385,1.186),(.602,1.219)]]
shoe.append(mesh('Couvercle acrylique',v,[(0,3,4,1),(1,4,5,2)],glass))
shoe.append(mesh('Dos acrylique',[(x,.602,z) for x,z in [(1.17,.983),(1.40,.983),(1.40,1.219),(1.17,1.219)]],[(0,1,2,3)],glass))
for x in (1.17,1.40):
    shoe.append(curve('Tranche transparente du sabot',[(x,.177,1.035),(x,.385,1.186),(x,.602,1.219),(x,.602,.983),(x,.177,.983),(x,.177,1.035)],.0018,edge))
for y,z in ((.177,1.035),(.385,1.186),(.602,1.219)):
    shoe.append(curve('Joint du capot',[(1.17,y,z),(1.40,y,z)],.0013,edge))
# Rotate the whole shoe toward the dealer without changing individual geometry.
pivot=bpy.data.objects.new('Sabot — orientation',None);asset.objects.link(pivot);pivot.location=(1.285,.386,.943)
bpy.context.view_layer.update()
for obj in shoe:obj.parent=pivot;obj.matrix_parent_inverse=pivot.matrix_world.inverted()
pivot.rotation_euler.z=math.radians(-18)
pivot.scale=(.8,.8,.8);pivot.location.y+=.084;pivot.location.x+=.045

floor=material('Fond studio',(.32,.32,.31),.85)
obj=cube('Sol',(0,0,-.031),(200,200,.05),floor)
asset.objects.unlink(obj);studio.objects.link(obj)
def area(name,loc,energy,size,target=(0,0,.55)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
area('Softbox principal',(-3,-4,5),500,4)
area('Remplissage',(3,2,4),400,3)
area('Reflet sur cuir',(0,0,4),260,3)
area('Bois frontal',(0,-4,1.8),200,3)
world=bpy.data.worlds.new('Studio neutre');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.47,.5,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.3
scene=bpy.context.scene;scene.world=world
def camera(name,loc,target,lens):
    data=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,data);studio.objects.link(obj)
    obj.location=loc;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler();data.lens=lens
    return obj
views=[('01-perspective',camera('Vue principale',(2.1,-5.8,3.6),(0,-.12,.59),52)),('02-dessus',camera('Vue du tapis',(0,-.15,6.5),(0,-.15,.5),50))]
scene.camera=views[0][1];scene.render.engine='CYCLES';scene.cycles.samples=args.samples;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.file_format='PNG'
scene['Design note']='Four supplied blackjack references: continuous black leather rail, walnut twin pedestals, seven betting boxes, 3:2 inscription, twelve-channel tray and clear card shoe.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blackjack-reference.blend'))

# Apply all bevels and text geometry, then batch by material for web delivery.
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:
    if obj.type in ('MESH','CURVE','FONT'):obj.select_set(True)
bpy.context.view_layer.objects.active=next(obj for obj in asset.objects if obj.select_get())
bpy.ops.object.convert(target='MESH')
groups={}
for obj in list(asset.objects):
    if obj.type=='MESH':
        worldmatrix=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=worldmatrix
        groups.setdefault(obj.data.materials[0].name,[]).append(obj)
for name,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=name
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:
    if obj.type=='MESH':obj.select_set(True)
path=ROOT/'assets/models/blackjack-reference-v2.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_animations=False)
triangles=0
for obj in asset.objects:
    if obj.type=='MESH':obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
(OUT/'manifest.json').write_text(json.dumps({'betting_positions':7,'chip_channels':12,'pedestals':2,'triangles':triangles,'materials':len(groups),'glb_bytes':path.stat().st_size,'asset':str(path.relative_to(ROOT))},indent=2)+'\n')
if args.render:
    for name,cam in views:
        scene.camera=cam;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
print('BLACKJACK_READY',path,triangles)
