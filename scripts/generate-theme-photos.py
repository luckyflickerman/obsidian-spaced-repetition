"""Procedural background photos for two new themes: "space" (deep blue Milky Way) and
"aurora" (green aurora over mountains and a lake). Original artwork, no licence issues.
Usage: python3 gen_themes.py <outdir>"""
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = 1440, 1080
out = sys.argv[1]


def to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def from_img(i):
    return np.asarray(i, dtype=np.float32) / 255.0


def noise(w, h, sx, sy, seed):
    """Value noise with cell size sx × sy (anisotropic when they differ)."""
    r = np.random.default_rng(seed)
    gw, gh = max(2, int(w / sx) + 2), max(2, int(h / sy) + 2)
    g = r.random((gh, gw)).astype(np.float32)
    return from_img(to_img(g).resize((w, h), Image.BICUBIC))


def fbm(w, h, sx, sy, octaves, seed, gain=0.55):
    total = np.zeros((h, w), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        total += amp * noise(w, h, sx / 2**o, sy / 2**o, seed + 17 * o)
        norm += amp
        amp *= gain
    return total / norm


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, r):
    if a.ndim == 2:
        return from_img(to_img(a).filter(ImageFilter.GaussianBlur(r)))
    return np.stack([blur(a[..., c], r) for c in range(3)], -1)


def starfield(h, w, count, seed, density=None, steep=9.0):
    """Float star layer: most stars faint, a few bright with a soft halo."""
    r = np.random.default_rng(seed)
    layer = np.zeros((h, w), np.float32)
    n = 0
    while n < count:
        xs = r.integers(0, w, count)
        ys = r.integers(0, h, count)
        keep = np.ones(count, bool) if density is None else r.random(count) < density[ys, xs]
        xs, ys = xs[keep], ys[keep]
        b = r.random(len(xs)) ** steep
        np.maximum.at(layer, (ys, xs), 0.12 + 0.88 * b)
        n += len(xs)
    core = blur(layer, 0.6) * 2.4
    bright = np.where(layer > 0.8, layer, 0)
    halo = blur(bright, 1.8) * 6 + blur(bright, 5) * 6
    return np.clip(core + halo, 0, 1.6)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
nx, ny = xx / W, yy / H

# =================== SPACE ===================
img = np.zeros((H, W, 3), np.float32)
# band from bottom-left to top-right
ang = np.deg2rad(-34)
u = (nx - 0.5) * np.cos(ang) - (ny - 0.55) * np.sin(ang)  # along the band
v = (nx - 0.5) * np.sin(ang) + (ny - 0.55) * np.cos(ang)  # across the band
wob = 0.035 * (fbm(W, H, 500, 500, 3, 3) - 0.5)
width = 0.13 + 0.05 * (fbm(W, H, 420, 420, 2, 4) - 0.5)
band = np.exp(-((v + wob) ** 2) / (2 * width**2))
# background: navy, brighter and bluer toward the band
bg_dark = np.array([0.008, 0.016, 0.05])
bg_blue = np.array([0.03, 0.07, 0.19])
img[:] = bg_dark + (bg_blue - bg_dark) * (band**0.6)[..., None]
# star clouds: big soft structure + fine grain, stretched along the band
big = fbm(W, H, 260, 260, 5, 11)
grain = fbm(W, H, 40, 40, 4, 12)
clouds = band * (0.35 + 0.9 * smooth(big, 0.35, 0.8)) * (0.75 + 0.5 * grain)
# galactic core: warm glow toward the lower left
corec = np.exp(-(((u + 0.28) / 0.22) ** 2) - ((v / 0.09) ** 2))
# dust lanes: dark filaments along the band (rotated anisotropic noise)
lane_n = blur(fbm(int(W * 1.6), int(H * 1.6), 240, 110, 6, 21), 2)
lane = from_img(to_img(lane_n).rotate(34, resample=Image.BICUBIC))
lane = lane[int(H * 0.3) : int(H * 0.3) + H, int(W * 0.3) : int(W * 0.3) + W]
dust = smooth(lane, 0.52, 0.78) * np.exp(-((v / (width * 0.6)) ** 2)) * 0.8
glow_col = np.array([0.42, 0.58, 1.0])
violet = np.array([0.62, 0.48, 1.0])
warm = np.array([1.0, 0.86, 0.72])
mixc = smooth(fbm(W, H, 600, 600, 2, 31), 0.3, 0.7)[..., None]
col = glow_col * (1 - mixc) + violet * mixc
light = clouds[..., None] * col * 0.42 + corec[..., None] * warm * 0.38 * (0.6 + 0.6 * big[..., None])
light *= (1 - 0.85 * dust)[..., None]
img += light
# faint nebulae away from the band
neb = smooth(fbm(W, H, 300, 300, 5, 51), 0.64, 0.92) * (1 - band) * 0.22
img += neb[..., None] * np.array([0.15, 0.3, 0.75])
# stars, denser and smaller inside the band
dens = 0.25 + 0.75 * band * (1 - 0.7 * dust)
st = starfield(H, W, 30000, 5, dens, steep=14)
st += starfield(H, W, 1500, 6, None, steep=10) * 0.8
star_col = np.array([0.92, 0.95, 1.0])
img += st[..., None] * star_col * 0.85
# gentle vignette
vig = 1 - 0.35 * (((nx - 0.5) / 0.75) ** 2 + ((ny - 0.5) / 0.75) ** 2)
img *= vig[..., None]
img = img ** 0.95
to_img(img).save(f"{out}/kosmos.jpg", quality=84, optimize=True, progressive=True)

# =================== AURORA ===================
img = np.zeros((H, W, 3), np.float32)
hz = 0.78  # shore line
top = np.array([0.006, 0.02, 0.05])
low = np.array([0.05, 0.17, 0.18])
t = np.clip(ny / hz, 0, 1) ** 1.6
img[:] = top * (1 - t[..., None]) + low * t[..., None]
img += starfield(H, W, 9000, 13, np.clip(1.1 - ny / hz * 1.2, 0, 1))[..., None] * 0.7


def curtain(base_y, amp, freq, phase, height, seed, strength):
    x = nx[0]
    edge = base_y + amp * np.sin(x * freq + phase) + 0.03 * (noise(W, 1, 140, 1, seed)[0] - 0.5)
    d = ny - edge[None, :]  # >0 below the edge, <0 above
    below = np.exp(-np.clip(d, 0, None) / 0.012)
    above = np.exp(-np.clip(-d, 0, None) / height) * smooth(d, -height * 3.2, -height * 0.5) ** 0 * (1 - smooth(-d, height * 1.5, height * 3.5))
    prof = np.where(d > 0, below, above)
    # vertical rays: fine noise along x, stretched up
    rays = noise(W, H, 5, 500, seed + 1) * 0.5 + noise(W, H, 14, 400, seed + 2) * 0.5
    rays = smooth(rays, 0.25, 0.85)
    fold = 0.4 + 0.9 * smooth(fbm(W, H, 220, 2000, 3, seed + 3), 0.3, 0.75)
    return prof * (0.35 + 0.8 * rays) * fold * strength, d


a1, d1 = curtain(0.42, 0.06, 5.0, 0.4, 0.085, 101, 1.0)
a2, d2 = curtain(0.27, 0.05, 3.3, 2.1, 0.06, 202, 0.45)
aur = a1 + a2
green = np.array([0.25, 1.0, 0.58])
teal = np.array([0.10, 0.72, 0.80])
magenta = np.array([0.70, 0.30, 0.80])
height_mix = smooth(-d1, 0.02, 0.22)[..., None]  # top of the curtain fades to teal/magenta
col = green * (1 - height_mix) + teal * height_mix
img += aur[..., None] * col * 0.75
img += (a1 * smooth(-d1, 0.12, 0.3))[..., None] * magenta * 0.35
# glow of the aurora on the sky
img += blur(aur, 40)[..., None] * green * 0.18


def ridge_line(base, amp, seed, sharp):
    x = nx[0]
    n = fbm(W, 1, 300, 1, 6, seed)[0]
    ridged = 1 - np.abs(2 * fbm(W, 1, 110, 1, 6, seed + 9)[0] - 1)
    return base - amp * (0.55 * n + 0.45 * ridged**sharp)


far = ridge_line(hz - 0.04, 0.4, 31, 1.7) * H
near = ridge_line(hz + 0.005, 0.12, 47, 1.4) * H
far_col = np.array([0.012, 0.03, 0.042])
near_col = np.array([0.004, 0.01, 0.014])
haze = blur(aur, 60)[..., None] * green * 0.25
m_far = (yy >= far[None, :]) & (ny < hz)
m_near = (yy >= near[None, :]) & (ny < hz)
# the far range is lit faintly from above (fades down to the valley)
fall = np.clip((yy - far[None, :]) / (H * 0.12), 0, 1)[..., None]
lit = far_col * (1.3 - 0.6 * fall) + haze * 0.35 * (1 - fall)
img[m_far] = lit[m_far]
img[m_near] = near_col + haze[m_near] * 0.15
# thin lit edge on the far ridge
rim = np.exp(-np.abs(yy - far[None, :]) / 1.6) * (yy >= far[None, :] - 1)
img += (rim * 0.18)[..., None] * green
# lake: mirror of everything above the shore, blurred and darker, with ripples
src_rows = np.clip((2 * hz * H - yy).astype(int), 0, H - 1)
mirror = img[src_rows, xx.astype(int)]
mirror = from_img(to_img(mirror).filter(ImageFilter.BoxBlur(2)).resize((W, H // 3)).resize((W, H)))
rip = noise(W, H, 60, 2.2, 71)
rip = 0.78 + 0.32 * rip
lake = ny >= hz
img[lake] = mirror[lake] * 0.85 * rip[lake][..., None] + np.array([0.0, 0.01, 0.015])
# soft shore line
shore = np.exp(-np.abs(yy - hz * H) / 2.5)
img *= (1 - 0.5 * shore)[..., None]
to_img(img).save(f"{out}/zorza.jpg", quality=84, optimize=True, progressive=True)
print("ok")
