"""
Общая библиотека для рендера графики игры в Blender.

Единицы: 1 метр = 1 клетка пола. Клетка сетки (gx, gy) — это точка мира (gx, -gy, 0).
Камера — ортографическая изометрия 2:1 (поворот 60° / 0° / 45°), одна на все рендеры.
Игровые координаты: клетка 96×48 игровых пикселей; текстуры рендерятся в 2 раза крупнее (TEX = 2),
чтобы на телефонах и больших экранах картинка оставалась чёткой.
"""
import math
import os

import bpy
import numpy as np
from mathutils import Vector

TILE_W = 96
TILE_H = 48
TEX = 2  # плотность текстур: 2 пикселя текстуры на 1 игровой пиксель
PPU = (TILE_W / 2) / math.cos(math.radians(45))  # игровых пикселей на метр (≈ 67.88)
CAM_ROT = (math.radians(60), 0.0, math.radians(45))
CAM_FORWARD = Vector((-math.sin(math.radians(45)) * math.sin(math.radians(60)),
                      math.cos(math.radians(45)) * math.sin(math.radians(60)),
                      -math.cos(math.radians(60))))

FONT_BOLD = 'C:/Windows/Fonts/bahnschrift.ttf'
FONT_SERIF = 'C:/Windows/Fonts/georgiab.ttf'
FONT_SIGN = 'C:/Windows/Fonts/segoeuib.ttf'  # жирный рубленый — лучше всего читается на вывесках


# ---------------------------------------------------------------- координаты

def cell(gx, gy, z=0.0):
    """Клетка сетки → точка мира."""
    return Vector((gx, -gy, z))


def screen_of(p):
    """Точка мира → игровые пиксели (начало — центр клетки (0,0) на полу)."""
    return (48.0 * (p.x + p.y), 24.0 * (p.x - p.y) - PPU * math.sin(math.radians(60)) * p.z)


def world_on_floor(sx, sy):
    """Игровые пиксели → точка на полу (z = 0)."""
    s, d = sx / 48.0, sy / 24.0
    return Vector(((s + d) / 2.0, (s - d) / 2.0, 0.0))


# ---------------------------------------------------------------- сцена

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 2
    sc.cycles.transmission_bounces = 4
    sc.cycles.sample_clamp_indirect = 4.0
    sc.render.film_transparent = False
    try:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Punchy'
    except Exception:
        try:
            sc.view_settings.look = 'None'
        except Exception:
            pass
    sc.render.resolution_percentage = 100
    return sc


def set_quality(sc, quality):
    """quality: 'preview' (быстро, для проверки) или 'final'."""
    if quality == 'final':
        sc.cycles.samples = 96
        sc.cycles.adaptive_threshold = 0.02
    else:
        sc.cycles.samples = 24
        sc.cycles.adaptive_threshold = 0.08


def world_color(sc, rgb, strength=1.0):
    w = bpy.data.worlds.new('World')
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (*rgb, 1)
    bg.inputs[1].default_value = strength
    sc.world = w


def make_camera(sc, center_px, res, ortho_scale=None):
    """Ортокамера: центр кадра — игровая точка center_px на полу; res — (ширина, высота) в пикселях текстуры."""
    cam_data = bpy.data.cameras.new('Cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = ortho_scale or max(res) / (PPU * TEX)
    cam_data.clip_start = 0.1
    cam_data.clip_end = 200
    cam = bpy.data.objects.new('Cam', cam_data)
    sc.collection.objects.link(cam)
    target = world_on_floor(*center_px)
    cam.location = target - CAM_FORWARD * 60
    cam.rotation_euler = CAM_ROT
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = res
    return cam


# ---------------------------------------------------------------- материалы

_mats = {}


def mat(name, color, rough=0.6, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0, transmission=0.0, coat=0.0):
    """Материал Principled BSDF (кэшируется по имени)."""
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    _mats[name] = m
    return m


def hex_rgb(h):
    """'#rrggbb' → линейный цвет для Blender."""
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def wood_mat(name, base_hex, var=0.0):
    """Дерево с лёгкой процедурной фактурой (волокна)."""
    key = f'{name}'
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.55
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.inputs['Scale'].default_value = 3.0
    wave.inputs['Distortion'].default_value = 6.0
    wave.inputs['Detail'].default_value = 2.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    base = hex_rgb(base_hex)
    dark = tuple(c * 0.72 for c in base)
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].color = (*base, 1)
    nt.links.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    _mats[key] = m
    return m


def stripes_mat(name, a_hex, b_hex, count=40):
    """Обои в вертикальную полоску (полосы вдоль длины объекта)."""
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.9
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = count
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].color = (*hex_rgb(a_hex), 1)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = (*hex_rgb(b_hex), 1)
    nt.links.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    _mats[name] = m
    return m


# ---------------------------------------------------------------- геометрия

def link(obj, parent=None, coll=None):
    (coll or bpy.context.scene.collection).objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def box(name, size, loc, material, parent=None, bevel=0.012, rot=(0, 0, 0)):
    """Коробка размера size (x, y, z) с центром основания... в точке loc (центр коробки)."""
    me = bpy.data.meshes.new(name)
    sx, sy, sz = (s / 2 for s in size)
    v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
         (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(v, [], f)
    me.materials.append(material)
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    if bevel and min(size) > bevel * 2.5:
        md = o.modifiers.new('bevel', 'BEVEL')
        md.width = bevel
        md.segments = 2
        md.limit_method = 'ANGLE'
    return link(o, parent)


def cyl(name, r, h, loc, material, parent=None, verts=12, r_top=None, rot=(0, 0, 0), bevel=0.0):
    """Цилиндр/конус: основание в loc (по центру низа), высота h вдоль Z."""
    me = bpy.data.meshes.new(name)
    rt = r if r_top is None else r_top
    vs, fs = [], []
    for i in range(verts):
        a = 2 * math.pi * i / verts
        vs.append((r * math.cos(a), r * math.sin(a), 0))
    for i in range(verts):
        a = 2 * math.pi * i / verts
        vs.append((rt * math.cos(a), rt * math.sin(a), h))
    for i in range(verts):
        j = (i + 1) % verts
        fs.append((i, j, verts + j, verts + i))
    fs.append(tuple(range(verts - 1, -1, -1)))
    fs.append(tuple(range(verts, 2 * verts)))
    me.from_pydata(vs, [], fs)
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = len(p.vertices) == 4
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    if bevel:
        md = o.modifiers.new('bevel', 'BEVEL')
        md.width = bevel
        md.segments = 2
    return link(o, parent)


def sphere(name, r, loc, material, parent=None, scale=(1, 1, 1), seg=12, rings=8, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    vs, fs = [(0, 0, -r)], []
    for j in range(1, rings):
        t = math.pi * j / rings - math.pi / 2
        for i in range(seg):
            a = 2 * math.pi * i / seg
            vs.append((r * math.cos(t) * math.cos(a), r * math.cos(t) * math.sin(a), r * math.sin(t)))
    vs.append((0, 0, r))
    top = len(vs) - 1
    for i in range(seg):
        fs.append((0, 1 + (i + 1) % seg, 1 + i))
    for j in range(rings - 2):
        for i in range(seg):
            a = 1 + j * seg + i
            b = 1 + j * seg + (i + 1) % seg
            fs.append((a, b, b + seg, a + seg))
    last = 1 + (rings - 2) * seg
    for i in range(seg):
        fs.append((last + i, last + (i + 1) % seg, top))
    me.from_pydata(vs, [], fs)
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.scale = scale
    o.rotation_euler = rot
    return link(o, parent)


def text(name, body, size, loc, material, parent=None, font=FONT_BOLD, rot=(math.radians(90), 0, 0), extrude=0.004,
         align='CENTER'):
    """Объёмный текст (кириллица из системного шрифта). По умолчанию стоит вертикально, лицом к −Y."""
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.font = bpy.data.fonts.load(font, check_existing=True)
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu)
    o.data.materials.append(material)
    o.location = loc
    o.rotation_euler = rot
    return link(o, parent)


def empty(name, loc=(0, 0, 0), rot_z=0.0, parent=None):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.rotation_euler = (0, 0, rot_z)
    return link(e, parent)


def point_light(name, loc, color, power, radius=0.08, parent=None):
    d = bpy.data.lights.new(name, 'POINT')
    d.energy = power
    d.color = color
    d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d)
    o.location = loc
    return link(o, parent)


def area_light(name, loc, rot, size, color, power, parent=None):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = power
    d.color = color
    d.shape = 'RECTANGLE'
    d.size, d.size_y = size
    o = bpy.data.objects.new(name, d)
    o.location = loc
    o.rotation_euler = rot
    return link(o, parent)


def descendants(o):
    out = [o]
    for c in o.children:
        out += descendants(c)
    return out


def bbox_px(objs):
    """Прямоугольник (игровые пиксели), который занимают объекты на экране."""
    xs, ys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type not in ('MESH', 'FONT', 'CURVE'):
            continue
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            p = ev.matrix_world @ Vector(c)
            x, y = screen_of(p)
            xs.append(x)
            ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


# ---------------------------------------------------------------- рендер и обработка

def render_to(path, sc):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def load_pixels(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)  # снизу вверх, как в Blender


def save_pixels(arr, path, fmt='WEBP', quality=88):
    """Сохранить массив (h, w, 4; снизу вверх) в файл."""
    h, w = arr.shape[:2]
    img = bpy.data.images.new('out', w, h, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(arr, dtype=np.float32).ravel())
    img.filepath_raw = path
    img.file_format = fmt
    sc = bpy.context.scene
    old = (sc.render.image_settings.file_format, sc.render.image_settings.quality)
    try:
        sc.render.image_settings.quality = quality
    except Exception:
        pass
    img.save(quality=quality) if fmt == 'WEBP' else img.save()
    bpy.data.images.remove(img)


def _blur(a, r):
    """Быстрое размытие: несколько проходов box-фильтра по обеим осям."""
    for _ in range(3):
        c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0), (0, 0)), mode='edge'), axis=0)
        a = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r), (0, 0)), mode='edge'), axis=1)
        a = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return a


def bloom(px, threshold=0.78, strength=0.75):
    """Свечение ярких мест (лампы, окна): яркое размывается на двух масштабах и добавляется сверху."""
    rgb = px[..., :3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    k = np.clip((lum - threshold) / (1 - threshold), 0, 1)[..., None]
    bright = rgb * k
    h, w = bright.shape[:2]
    acc = np.zeros_like(bright)
    for f, r, wgt in ((4, 4, 0.6), (8, 6, 0.9)):
        hh, ww = h // f, w // f
        small = bright[:hh * f, :ww * f].reshape(hh, f, ww, f, 3).mean(axis=(1, 3))
        small = _blur(small, r)
        up = np.repeat(np.repeat(small, f, axis=0), f, axis=1)
        acc[:hh * f, :ww * f] += up * wgt
    out = px.copy()
    out[..., :3] = np.clip(rgb + acc * strength, 0, 1)
    return out


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)
    return p
