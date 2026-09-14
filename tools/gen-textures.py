import json, base64, os, sys, time, urllib.request
from PIL import Image, ImageChops
# Usage: OPENAI_API_KEY=sk-... python3 tools/gen-textures.py  (regenerates missing files in assets/tex)
KEY = os.environ['OPENAI_API_KEY']
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'tex')
JOBS = [
  ('carpet_red', 'Seamless tileable texture, top-down flat view, luxury VIP casino carpet: deep burgundy red with intricate gold baroque medallion pattern, evenly lit, no shadows, no perspective, photorealistic fabric weave', True),
  ('carpet_purple', 'Seamless tileable texture, top-down flat view, hotel corridor carpet: dark plum purple with subtle diagonal geometric copper line pattern, evenly lit, no shadows, photorealistic', True),
  ('marble', 'Seamless tileable texture, top-down flat view, polished white Calacatta marble floor with warm grey and gold veins, large tiles with thin dark grout lines, evenly lit, no reflections, no perspective', True),
  ('wood', 'Seamless tileable texture, top-down flat view, dark walnut hardwood floor planks, rich grain, evenly lit, no perspective, photorealistic', True),
  ('brick', 'Seamless tileable texture, straight front view, old dark red brick wall with light grey mortar, slightly weathered, evenly lit, no perspective', True),
  ('wall', 'Seamless tileable texture, straight front view, dark charcoal grey upholstered fabric wall panel with a subtle tone-on-tone damask pattern, luxury casino interior, evenly lit, no perspective', True),
  ('wallpaper', 'Seamless tileable texture, straight front view, burgundy damask wallpaper with gold flocked pattern, luxurious hotel, evenly lit, no perspective', True),
  ('ceiling', 'Seamless tileable texture, view straight up, dark coffered ceiling panels with thin brass trim, evenly lit, no perspective', True),
  ('tile', 'Seamless tileable texture, top-down flat view, small black and white checkerboard ceramic bathroom floor tiles with thin grout, evenly lit, no perspective', True),
  ('art1', 'Oil painting in art deco style of a roulette wheel in motion, gold and deep green palette, gallery artwork, no text, no frame', False),
  ('art2', 'Vintage 1920s Monte Carlo casino travel poster illustration, palm trees, seaside, art deco style, muted colours, no text', False),
  ('art3', 'Abstract painting, gold leaf and crimson strokes on dark green, luxurious, gallery artwork, no text, no frame', False),
  ('poster_show', 'Vintage cabaret show poster, red velvet curtain, spotlight, art deco typography, bold title text SPECTACLE and subtitle CE SOIR 22H', False),
  ('slot_lucky', 'Slot machine cabinet screen artwork, retro Lucky 7 theme, glossy red neon sevens, chrome and stars, dark background, vibrant, no reels, no text', False),
  ('slot_fruits', 'Slot machine screen artwork, classic fruit slot theme, glossy cherries lemons and golden bells, red and gold, dark background, vibrant, no text', False),
  ('slot_presque', 'Slot machine screen artwork, hot streak theme, flames and flying gold coins, orange and gold, dark background, vibrant, no text', False),
  ('slot_pharaon', 'Slot machine screen artwork, Egyptian pharaoh theme, golden mask, pyramids and hieroglyphs, turquoise and gold, dark background, vibrant, no text', False),
  ('slot_mega', 'Slot machine screen artwork, neon dragon theme, purple and cyan lightning, futuristic, dark background, vibrant, no text', False),
]
def seamless(img, band=96):
    w, h = img.size
    off = ImageChops.offset(img, w // 2, h // 2)
    # build a weight mask: 1 away from the centre seams, 0 on them (linear ramps of `band` px)
    mask = Image.new('L', (w, h), 255)
    from PIL import ImageDraw
    px = mask.load()
    for x in range(w):
        fx = min(1.0, abs(x - w / 2) / band)
        for y in range(h):
            fy = min(1.0, abs(y - h / 2) / band)
            px[x, y] = int(255 * min(fx, fy))
    return Image.composite(off, img, mask)
def gen(name, prompt, tile):
    dst = f'{OUT}/{name}.jpg'
    if os.path.exists(dst): print('skip', name); return
    body = json.dumps({'model': 'gpt-image-1', 'prompt': prompt, 'size': '1024x1024', 'quality': 'medium', 'n': 1}).encode()
    req = urllib.request.Request('https://api.openai.com/v1/images/generations', data=body, headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    for attempt in range(3):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=180)); break
        except Exception as e:
            print('retry', name, e); time.sleep(5)
    else:
        print('FAIL', name); return
    raw = f'/tmp/{name}.png'; open(raw, 'wb').write(base64.b64decode(d['data'][0]['b64_json']))
    img = Image.open(raw).convert('RGB')
    if tile: img = seamless(img)
    img.save(dst, quality=86, optimize=True); print('done', name, os.path.getsize(dst) // 1024, 'KB')
JOBS.insert(0, ('carpet_green', 'Seamless tileable texture, top-down flat view, luxury casino carpet: deep green with intricate gold art-deco diamond and fleur-de-lis pattern, evenly lit, no shadows, no perspective, photorealistic fabric weave', True))
for name, prompt, tile in JOBS: gen(name, prompt, tile)
print('ALL DONE')
