"""Generate the "Check Staff" Roblox UGC mesh.

A golden staff (like the classic $-staff gear) whose head is a bold, beveled
green 3D check mark instead of the dollar sign.

Outputs (next to this script):
  check_staff.obj          - single mesh, 1 unit = 1 stud, Y up, front = -Z
  check_staff.mtl          - one material that points at the texture
  check_staff_texture.png  - 256x256 color atlas

Run:  python3 generate.py
"""

import math
import os

import numpy as np
from PIL import Image

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
NAME = "check_staff"
TEX_SIZE = 256

# ---------------------------------------------------------------------------
# Texture atlas layout (pixel rects: x0, y0, x1, y1 with y going down)
# ---------------------------------------------------------------------------
PAD = 6
REGIONS = {
    "check_face": (0, 0, 128, 128),
    "check_bevel": (128, 0, 256, 64),
    "check_side": (128, 64, 256, 128),
    "wood": (0, 128, 128, 256),
    "gold": (128, 128, 256, 256),
}


def region_uv(region, s, t):
    """Map local (s, t) in [0, 1]^2 into atlas UVs (t = 0 bottom, 1 top)."""
    x0, y0, x1, y1 = REGIONS[region]
    x0, y0, x1, y1 = x0 + PAD, y0 + PAD, x1 - PAD, y1 - PAD
    px = x0 + s * (x1 - x0)
    py = y1 - t * (y1 - y0)
    return (px / TEX_SIZE, 1.0 - py / TEX_SIZE)


# ---------------------------------------------------------------------------
# Mesh builder
# ---------------------------------------------------------------------------
class Mesh:
    def __init__(self):
        self.v, self.vt, self.vn, self.f = [], [], [], []

    def _add(self, lst, item):
        lst.append(tuple(float(c) for c in item))
        return len(lst)

    def tri(self, p, uv, n):
        """Add one triangle. p/uv/n are 3-lists. Winding is fixed so the
        geometric normal agrees with the supplied vertex normals."""
        p = [np.asarray(x, float) for x in p]
        geo = np.cross(p[1] - p[0], p[2] - p[0])
        if np.linalg.norm(geo) < 1e-12:
            return
        if np.dot(geo, np.sum(n, axis=0)) < 0:
            p, uv, n = [p[0], p[2], p[1]], [uv[0], uv[2], uv[1]], [n[0], n[2], n[1]]
        face = []
        for i in range(3):
            nn = np.asarray(n[i], float)
            nn = nn / np.linalg.norm(nn)
            face.append((self._add(self.v, p[i]), self._add(self.vt, uv[i]), self._add(self.vn, nn)))
        self.f.append(face)

    def quad(self, p, uv, n):
        self.tri([p[0], p[1], p[2]], [uv[0], uv[1], uv[2]], [n[0], n[1], n[2]])
        self.tri([p[0], p[2], p[3]], [uv[0], uv[2], uv[3]], [n[0], n[2], n[3]])

    def write(self, obj_path, mtl_name):
        with open(obj_path, "w") as fh:
            fh.write("# Check Staff - Roblox UGC\n")
            fh.write("# 1 unit = 1 stud, +Y up, front faces -Z\n")
            fh.write(f"mtllib {mtl_name}.mtl\n")
            fh.write("o CheckStaff\n")
            # Deduplicate on write to keep the file small.
            vmap, vtmap, vnmap = {}, {}, {}
            vs, vts, vns = [], [], []

            def key(vals, nd):
                return tuple(round(c, nd) for c in vals)

            def index(lst_in, i, mp, out, nd):
                k = key(lst_in[i - 1], nd)
                if k not in mp:
                    out.append(k)
                    mp[k] = len(out)
                return mp[k]

            faces = []
            for face in self.f:
                faces.append([
                    (index(self.v, a, vmap, vs, 5), index(self.vt, b, vtmap, vts, 5), index(self.vn, c, vnmap, vns, 4))
                    for a, b, c in face
                ])
            for x, y, z in vs:
                fh.write(f"v {x:.5f} {y:.5f} {z:.5f}\n")
            for u, v in vts:
                fh.write(f"vt {u:.5f} {v:.5f}\n")
            for x, y, z in vns:
                fh.write(f"vn {x:.4f} {y:.4f} {z:.4f}\n")
            fh.write(f"usemtl {mtl_name}\n")
            fh.write("s off\n")
            for face in faces:
                fh.write("f " + " ".join(f"{a}/{b}/{c}" for a, b, c in face) + "\n")
        return len(vs), len(faces)


# ---------------------------------------------------------------------------
# 2D helpers
# ---------------------------------------------------------------------------
def rot(v, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([c * v[0] - s * v[1], s * v[0] + c * v[1]])


def unit(deg):
    a = math.radians(deg)
    return np.array([math.cos(a), math.sin(a)])


def line_intersect(p, d, q, e):
    """Intersect p + s*d with q + t*e."""
    m = np.array([[d[0], -e[0]], [d[1], -e[1]]])
    s, _ = np.linalg.solve(m, q - p)
    return p + s * d


def signed_area(poly):
    return 0.5 * sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1]
                     for i in range(len(poly)))


def ear_clip(poly):
    """Triangulate a simple CCW polygon. Returns index triples."""
    idx = list(range(len(poly)))
    tris = []

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def inside(p, a, b, c):
        return cross(a, b, p) >= -1e-12 and cross(b, c, p) >= -1e-12 and cross(c, a, p) >= -1e-12

    guard = 0
    while len(idx) > 3 and guard < 10000:
        guard += 1
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            a, b, c = poly[i0], poly[i1], poly[i2]
            if cross(a, b, c) <= 1e-12:
                continue  # reflex
            if any(inside(poly[j], a, b, c) for j in idx if j not in (i0, i1, i2)):
                continue
            tris.append((i0, i1, i2))
            idx.pop(k)
            break
    tris.append(tuple(idx))
    return tris


def inset(poly, d):
    """Miter-offset a CCW polygon inward by d."""
    out = []
    n = len(poly)
    for i in range(n):
        p0, p1, p2 = poly[i - 1], poly[i], poly[(i + 1) % n]
        e0 = (p1 - p0) / np.linalg.norm(p1 - p0)
        e1 = (p2 - p1) / np.linalg.norm(p2 - p1)
        n0 = np.array([-e0[1], e0[0]])  # left normal = inward for CCW
        n1 = np.array([-e1[1], e1[0]])
        m = n0 + n1
        m = m / np.linalg.norm(m)
        out.append(p1 + m * (d / max(np.dot(m, n0), 0.25)))
    return out


# ---------------------------------------------------------------------------
# Check mark outline (2D, u = viewer's right, v = up, tip at origin)
# ---------------------------------------------------------------------------
def check_outline():
    short_dir = unit(128.0)          # short arm goes up-left
    short_len = 0.40
    short_w = 0.19
    long_len = 1.10
    long_w0, long_w1 = 0.18, 0.115   # long arm tapers toward the top
    ang0, ang1 = 57.0, 43.0          # long arm curves (flattens) toward the top
    tip_flat = 0.035

    # Long arm outer (lower-right) edge, integrated along a gentle curve.
    steps = 6
    outer, inner = [], []
    p = np.zeros(2)
    ds = long_len / steps
    for i in range(steps + 1):
        s = i / steps
        ang = ang0 + (ang1 - ang0) * s
        w = long_w0 + (long_w1 - long_w0) * s
        d = unit(ang)
        outer.append(p.copy())
        inner.append(p + w * np.array([-d[1], d[0]]))
        if i < steps:
            p = p + ds * unit(ang0 + (ang1 - ang0) * (s + 0.5 / steps))

    # Short arm.
    short_n = np.array([short_dir[1], -short_dir[0]])  # points toward long arm
    a_outer = short_len * short_dir
    cap_dir = unit(28.0)
    a_inner = line_intersect(a_outer, cap_dir, short_w * short_n, short_dir)

    # Notch: where the short arm's inner line meets the long arm's inner edge.
    notch, cut = None, None
    for i in range(len(inner) - 1):
        q, e = inner[i], inner[i + 1] - inner[i]
        x = line_intersect(short_w * short_n, short_dir, q, e)
        t = np.dot(x - q, e) / np.dot(e, e)
        if 0.0 <= t <= 1.0:
            notch, cut = x, i + 1
            break
    assert notch is not None, "arms do not intersect"

    # Blunt the very tip a little so it seats into the staff collar.
    tip_l = tip_flat * short_dir
    tip_r = outer[0] + tip_flat * unit(ang0)

    poly = [tip_r] + outer[1:] + inner[::-1][: len(inner) - cut] + [notch, a_inner, a_outer, tip_l]
    poly = [np.asarray(p, float) for p in poly]
    assert signed_area(poly) > 0
    return poly


def build_check(mesh, origin_y, depth=0.13, bevel=0.028):
    poly = check_outline()
    inner = inset(poly, bevel)
    tris = ear_clip(poly)

    us = [p[0] for p in poly]
    vs = [p[1] for p in poly]
    umin, umax, vmin, vmax = min(us), max(us), min(vs), max(vs)

    tip_mid = 0.5 * (poly[0] + poly[-1])
    zf, zb = -depth / 2, depth / 2         # front (-Z) and back
    zf2, zb2 = zf + bevel, zb - bevel

    def P(p2, z):
        # x = -u so the check reads correctly when seen from the front (-Z).
        return np.array([-(p2[0] - tip_mid[0]), p2[1] - tip_mid[1] + origin_y, z])

    def face_uv(p2):
        s = (p2[0] - umin) / (umax - umin)
        t = (p2[1] - vmin) / (vmax - vmin)
        return region_uv("check_face", s, t)

    # Front and back caps (inset polygon).
    for z, nz in ((zf, -1.0), (zb, 1.0)):
        nrm = [(0, 0, nz)] * 3
        for a, b, c in tris:
            pts = [inner[a], inner[b], inner[c]]
            mesh.tri([P(q, z) for q in pts], [face_uv(q) for q in pts], nrm)

    n = len(poly)
    perim = [0.0]
    for i in range(n):
        perim.append(perim[-1] + np.linalg.norm(poly[(i + 1) % n] - poly[i]))
    total = perim[-1]

    for i in range(n):
        j = (i + 1) % n
        e = poly[j] - poly[i]
        e = e / np.linalg.norm(e)
        out2 = np.array([e[1], -e[0]])  # outward for CCW
        out3 = np.array([-out2[0], out2[1], 0.0])
        s0, s1 = perim[i] / total, perim[i + 1] / total

        # Side wall.
        nrm = [out3] * 4
        mesh.quad([P(poly[i], zf2), P(poly[j], zf2), P(poly[j], zb2), P(poly[i], zb2)],
                  [region_uv("check_side", s0, 0), region_uv("check_side", s1, 0),
                   region_uv("check_side", s1, 1), region_uv("check_side", s0, 1)], nrm)

        # Front and back bevels.
        for zo, zi, nz in ((zf2, zf, -1.0), (zb2, zb, 1.0)):
            bn = out3 + np.array([0, 0, nz])
            nrm = [bn] * 4
            mesh.quad([P(poly[i], zo), P(poly[j], zo), P(inner[j], zi), P(inner[i], zi)],
                      [region_uv("check_bevel", s0, 0), region_uv("check_bevel", s1, 0),
                       region_uv("check_bevel", s1, 1), region_uv("check_bevel", s0, 1)], nrm)


def build_lathe(mesh, profile, region, segments=16, v_range=None):
    """Surface of revolution around Y. profile = [(radius, y), ...] bottom->top.
    Each profile segment gets its own normals (hard edges between bands)."""
    ys = [y for _, y in profile]
    y0, y1 = v_range if v_range else (min(ys), max(ys))
    for k in range(len(profile) - 1):
        (r0, ya), (r1, yb) = profile[k], profile[k + 1]
        dr, dy = r1 - r0, yb - ya
        if abs(dr) < 1e-9 and abs(dy) < 1e-9:
            continue
        nr, ny = dy, -dr
        ln = math.hypot(nr, ny)
        nr, ny = nr / ln, ny / ln
        ta, tb = (ya - y0) / (y1 - y0), (yb - y0) / (y1 - y0)
        for s in range(segments):
            th0 = 2 * math.pi * s / segments
            th1 = 2 * math.pi * (s + 1) / segments
            c0, s0_ = math.cos(th0), math.sin(th0)
            c1, s1_ = math.cos(th1), math.sin(th1)
            pts = [(r0 * c0, ya, r0 * s0_), (r0 * c1, ya, r0 * s1_), (r1 * c1, yb, r1 * s1_), (r1 * c0, yb, r1 * s0_)]
            nrm = [(nr * c0, ny, nr * s0_), (nr * c1, ny, nr * s1_), (nr * c1, ny, nr * s1_), (nr * c0, ny, nr * s0_)]
            uvs = [region_uv(region, s / segments, ta), region_uv(region, (s + 1) / segments, ta),
                   region_uv(region, (s + 1) / segments, tb), region_uv(region, s / segments, tb)]
            if r0 < 1e-9:
                mesh.tri([pts[0], pts[2], pts[3]], [uvs[0], uvs[2], uvs[3]], [nrm[0], nrm[2], nrm[3]])
            elif r1 < 1e-9:
                mesh.tri([pts[0], pts[1], pts[2]], [uvs[0], uvs[1], uvs[2]], [nrm[0], nrm[1], nrm[2]])
            else:
                mesh.quad(pts, uvs, nrm)


# ---------------------------------------------------------------------------
# Texture
# ---------------------------------------------------------------------------
def make_texture(path):
    rng = np.random.default_rng(7)
    img = np.zeros((TEX_SIZE, TEX_SIZE, 3), float)

    def fill(region, fn):
        x0, y0, x1, y1 = REGIONS[region]
        h, w = y1 - y0, x1 - x0
        yy, xx = np.mgrid[0:h, 0:w]
        s = xx / (w - 1)
        t = 1.0 - yy / (h - 1)
        img[y0:y1, x0:x1] = fn(s, t, h, w)

    def lerp(a, b, k):
        a, b = np.array(a, float), np.array(b, float)
        return a + (b - a) * k[..., None]

    # Bright green face, lighter toward the top right like the reference.
    fill("check_face", lambda s, t, h, w: lerp((40, 190, 40), (120, 245, 110), np.clip(0.55 * t + 0.35 * s, 0, 1)))
    fill("check_bevel", lambda s, t, h, w: lerp((70, 215, 70), (150, 250, 140), t))
    fill("check_side", lambda s, t, h, w: lerp((22, 140, 28), (34, 168, 38), t))

    def wood(s, t, h, w):
        # Fine vertical grain along the staff (texture x = around the pole).
        grain = np.zeros(w)
        for f, a in ((3, 0.5), (7, 0.3), (17, 0.2)):
            grain += a * np.sin(2 * math.pi * f * np.linspace(0, 1, w) + rng.uniform(0, 6.28))
        grain = (grain - grain.min()) / (grain.max() - grain.min())
        k = np.broadcast_to(grain[None, :], (h, w)) * 0.6 + 0.4 * t
        return lerp((176, 128, 52), (226, 182, 96), k)

    fill("wood", wood)
    fill("gold", lambda s, t, h, w: lerp((196, 140, 24), (252, 214, 92), 0.5 + 0.5 * np.sin(math.pi * t)))

    noise = rng.normal(0, 2.0, img.shape)
    Image.fromarray(np.clip(img + noise, 0, 255).astype(np.uint8)).save(path)


# ---------------------------------------------------------------------------
def main():
    mesh = Mesh()
    seg = 16

    # Staff, bottom at y = 0.
    pole_top = 2.62
    build_lathe(mesh, [(0.0, 0.0), (0.045, 0.0), (0.07, 0.035), (0.075, 0.10), (0.06, 0.13)], "gold", seg)
    build_lathe(mesh, [(0.06, 0.13), (0.055, pole_top)], "wood", seg)
    collar = [(0.055, pole_top), (0.075, pole_top + 0.02), (0.075, pole_top + 0.08), (0.06, pole_top + 0.10),
              (0.06, pole_top + 0.13), (0.105, pole_top + 0.22), (0.105, pole_top + 0.25), (0.0, pole_top + 0.25)]
    build_lathe(mesh, collar, "gold", seg)

    # Check head seated into the collar cup.
    build_check(mesh, origin_y=pole_top + 0.21)

    obj_path = os.path.join(OUT_DIR, f"{NAME}.obj")
    nv, nf = mesh.write(obj_path, NAME)

    with open(os.path.join(OUT_DIR, f"{NAME}.mtl"), "w") as fh:
        fh.write(f"newmtl {NAME}\nKa 1 1 1\nKd 1 1 1\nKs 0.15 0.15 0.15\nNs 40\nd 1\nillum 2\n"
                 f"map_Kd {NAME}_texture.png\n")

    make_texture(os.path.join(OUT_DIR, f"{NAME}_texture.png"))

    v = np.array(mesh.v)
    size = v.max(0) - v.min(0)
    print(f"vertices: {nv}  triangles: {nf}")
    print(f"bounding box (studs): {size[0]:.2f} x {size[1]:.2f} x {size[2]:.2f}")


if __name__ == "__main__":
    main()
