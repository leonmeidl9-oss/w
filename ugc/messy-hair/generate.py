"""Generate the "Messy Silver Hair" Roblox UGC hair accessory.

Spiky, layered anime hair (white / silver). All strands grow out of a whorl
on the crown: long curved clumps fan out over the dome, bangs fall over the
forehead, the sides flick outwards, short spikes hang over the nape and an
ahoge sticks up on top.

Every strand is a closed, tapered three-sided blade (flat underside, ridge on
top) and the scalp is covered by a thin closed shell, so the whole mesh is
watertight as Roblox requires for rigid accessories.

Outputs (next to this script):
  messy_hair.obj          - single mesh, 1 unit = 1 stud, Y up, front = -Z
  messy_hair.mtl          - one material that points at the texture
  messy_hair_texture.png  - 1024x1024, baked ambient occlusion + strand streaks

The hair is built around the classic Roblox head (1.2 x 1.2 x 1.2 studs,
centred at the origin), so the head's HairAttachment sits at (0, 0.6, 0).

Run:  python3 generate.py      (needs numpy and pillow)
"""

import math
import os

import numpy as np
from PIL import Image

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
NAME = "messy_hair"
TEX_SIZE = 1024
MAX_TRIS = 4000

# Classic Roblox head: a rounded cylinder centred at the origin.
HEAD_R = 0.60    # radius
HEAD_H = 0.60    # half height
HEAD_RR = 0.22   # rounding of the top and bottom edges

CAP_IN = 0.010   # scalp shell, distance of its inner side from the head
CAP_OUT = 0.035  # ... and of its outer side
STRAND_BASE = CAP_OUT + 0.012  # lowest strand underside
WIDTH_SCALE = 1.2  # all strand widths; wider = calmer, fewer visible gaps


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def smoothstep(e0, e1, x):
    t = np.clip((np.asarray(x, float) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def normalize(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def head_sdf(p):
    """Signed distance from p (..., 3) to the classic head."""
    qr = np.hypot(p[..., 0], p[..., 2]) - (HEAD_R - HEAD_RR)
    qy = np.abs(p[..., 1]) - (HEAD_H - HEAD_RR)
    outside = np.hypot(np.maximum(qr, 0.0), np.maximum(qy, 0.0))
    inside = np.minimum(np.maximum(qr, qy), 0.0)
    return outside + inside - HEAD_RR


def head_normal(p, eps=1e-4):
    g = np.stack([head_sdf(p + d) - head_sdf(p - d) for d in np.eye(3) * eps], axis=-1)
    return normalize(g)


def surface_point(dirs, dist):
    """Point along each unit direction (from the head centre) that lies `dist`
    studs away from the head surface. The head is convex, so bisect."""
    dirs = np.asarray(dirs, float)
    dist = np.broadcast_to(np.asarray(dist, float), dirs.shape[:-1])
    lo = np.zeros(dirs.shape[:-1])
    hi = np.full(dirs.shape[:-1], 4.0)
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        inside = head_sdf(dirs * mid[..., None]) < dist
        lo = np.where(inside, mid, lo)
        hi = np.where(inside, hi, mid)
    return dirs * (0.5 * (lo + hi))[..., None]


# Polar frame around the crown whorl: theta = angle away from the whorl,
# phi = direction around it (0 = front / -Z, +90 = +X, the avatar's right).
WHORL = normalize([0.10, 1.0, -0.20])
_front = np.array([0.0, 0.0, -1.0])
AX_F = normalize(_front - _front.dot(WHORL) * WHORL)
AX_R = np.cross(AX_F, WHORL)


def sph(theta, phi):
    t = np.radians(np.asarray(theta, float))[..., None]
    f = np.radians(np.asarray(phi, float))[..., None]
    return np.cos(t) * WHORL + np.sin(t) * (np.cos(f) * AX_F + np.sin(f) * AX_R)


# Outer shape of the hair volume, fitted to the reference picture: a bob that
# is widest at the cheeks, has a broad round dome on top (the upper half is a
# superellipse), stays close to the face in front and closes in at the jaw.
ENV_C = np.array([0.0, -0.10, 0.02])
ENV_SIDE, ENV_FRONT, ENV_BACK = 0.90, 0.72, 0.92
ENV_UP, ENV_DOWN = 0.82, 0.62
ENV_UP_POWER = 3.0
WHORL_DIP = 0.04  # the strands' roots sit this far down in the crown


def envelope_dist(dirs):
    """Distance from the head centre along each unit direction to the envelope."""
    lo = np.zeros(dirs.shape[:-1])
    hi = np.full(dirs.shape[:-1], 4.0)
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        q = dirs * mid[..., None] - ENV_C
        up = q[..., 1] > 0
        vert = np.abs(q[..., 1] / np.where(up, ENV_UP, ENV_DOWN)) ** np.where(up, ENV_UP_POWER, 2.0)
        f = (q[..., 0] / ENV_SIDE) ** 2 + vert + (q[..., 2] / np.where(q[..., 2] < 0, ENV_FRONT, ENV_BACK)) ** 2
        inside = f < 1.0
        lo = np.where(inside, mid, lo)
        hi = np.where(inside, hi, mid)
    return 0.5 * (lo + hi)


def smooth_max(a, b, k):
    return 0.5 * (a + b + np.sqrt((a - b) ** 2 + k * k))


def reach(phi, front, side, back):
    """Blend a value (usually how far down a strand reaches, as an angle from
    the whorl) between front (phi 0), sides (+-90) and back (180)."""
    f = np.radians(phi)
    a = (front + back) / 4 + side / 2
    c = (front + back) / 4 - side / 2
    return a + (front - back) / 2 * np.cos(f) + c * np.cos(2 * f)


def catmull_rom(ctrl, s):
    """Uniform Catmull-Rom curve through ctrl, sampled at s in [0, 1]."""
    ctrl = np.asarray(ctrl, float)
    pts = np.vstack([2 * ctrl[0] - ctrl[1], ctrl, 2 * ctrl[-1] - ctrl[-2]])
    u = np.clip(s, 0.0, 1.0) * (len(ctrl) - 1)
    j = np.minimum(u.astype(int), len(ctrl) - 2)
    t = (u - j)[:, None]
    p0, p1, p2, p3 = pts[j], pts[j + 1], pts[j + 2], pts[j + 3]
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2
                  + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)


# ---------------------------------------------------------------------------
# Strands
# ---------------------------------------------------------------------------
class Strand:
    """One clump of hair. Angles in degrees, lengths in studs.

    phi        direction around the whorl (0 = front, 90 = +X)
    theta_root where the strand starts (angle from the whorl)
    theta_end  how far down the head the strand reaches (angle from the whorl)
    seg        segments along the strand
    width      widest point of the blade
    ridge      height of the ridge on top, relative to the width
    depth      how far below the hair envelope the strand runs (layering)
    rise       fraction of the length over which it climbs out of the crown
    dphi       swirl around the whorl over the whole length
    hook       sideways bend of the tip
    curl       tip bends back up (towards the whorl) by this many degrees
    flare      tip lifts away from the head by this many studs
    tip_from   where along the strand the tip shaping starts
    twist      rotation of the blade around its axis towards the tip
    path / up  explicit control points and blade orientation (for the ahoge)
    """

    def __init__(self, phi=0.0, theta_end=90.0, width=0.2, depth=0.0, theta_root=2.5, seg=9,
                 rise=0.14, dphi=0.0, hook=0.0, curl=0.0, flare=0.0, tip_from=0.6,
                 twist=0.0, ridge=0.15, path=None, up=None):
        self.phi, self.theta_end, self.width, self.depth = phi, theta_end, width, depth
        self.theta_root, self.seg, self.rise, self.dphi = theta_root, seg, rise, dphi
        self.hook, self.curl, self.flare, self.tip_from = hook, curl, flare, tip_from
        self.twist, self.ridge, self.path, self.up = twist, ridge, path, up


def hair_strands():
    rng = np.random.default_rng(7)
    J = lambda a: float(rng.uniform(-a, a))  # noqa: E731
    side = lambda phi: abs(math.sin(math.radians(phi)))  # noqa: E731
    out = []

    # Inner layer: wide clumps that cover the head down to the jaw and nape.
    for i in range(12):
        phi = i * 30.0 + J(5)
        out.append(Strand(phi, reach(phi, 72, 126, 142) + J(4), 0.32 + J(0.03), 0.12 + J(0.02), seg=7,
                          dphi=J(10), flare=0.03, twist=J(5)))

    # Middle layer: long clumps hanging down the sides and the back.
    for i in range(18):
        phi = 10.0 + i * 20.0 + J(5)
        out.append(Strand(phi, reach(phi, 88, 118, 138) + J(6), 0.27 + J(0.03), 0.06 + J(0.015), seg=10,
                          dphi=J(15), hook=J(12), curl=4 + 8 * side(phi), flare=0.05 + 0.08 * side(phi),
                          twist=J(6)))

    # Outer layer: big sweeping strands from the whorl over the dome
    # (the front is left to the bangs).
    for i in range(12):
        phi = 50.0 + i * 260.0 / 11 + J(5)
        out.append(Strand(phi, reach(phi, 90, 102, 128) + J(8), 0.30 + J(0.03), J(0.01), seg=10,
                          dphi=J(15), hook=J(14), curl=6, flare=0.04, twist=J(6)))

    # Flicks: outer strands that hang down to the cheeks and hook out and up
    # at the end, 4 per side.
    for phi, theta_end, curl, flare in ((58, 112, 24, 0.18), (76, 126, 30, 0.24), (94, 118, 28, 0.22),
                                        (112, 108, 24, 0.18), (-62, 110, 22, 0.17), (-80, 128, 30, 0.24),
                                        (-98, 116, 26, 0.21), (-116, 106, 24, 0.18)):
        out.append(Strand(phi + J(3), theta_end + J(3), 0.20 + J(0.02), J(0.01), seg=11, dphi=J(8),
                          hook=float(np.sign(phi)) * J(8), curl=curl + 2, flare=flare, tip_from=0.5, twist=J(8)))

    # Wide strands just under the outer layer that close the dome.
    for i in range(8):
        phi = 22.0 + i * 45.0 + J(8)
        out.append(Strand(phi, reach(phi, 70, 84, 96) + J(6), 0.30 + J(0.03), 0.025, seg=7,
                          rise=0.2, dphi=J(12), hook=J(10), flare=0.02, twist=J(5)))

    # Bangs over the forehead: S-curves whose tips bend outwards.
    for phi, theta_end, hook in ((-52, 84, -24), (-35, 92, -16), (-18, 99, 10), (-2, 95, -12),
                                 (15, 100, 14), (32, 90, 18), (49, 83, 26)):
        out.append(Strand(phi + J(3), theta_end + J(3), 0.24 + J(0.03), 0.01 + J(0.02), seg=9,
                          dphi=-0.4 * hook, hook=hook, curl=3, flare=0.03, twist=J(6)))
    # One long thin strand over the bangs that hooks out to the avatar's left.
    out.append(Strand(8.0, 92.0, 0.14, -0.015, seg=10, dphi=6, hook=-38, curl=12, flare=0.06,
                      tip_from=0.5, twist=10))

    # Locks that hang in front of the cheeks down to the jaw.
    for phi, theta_end, hook in ((-62, 124, -6), (-44, 116, 8), (46, 118, -8), (63, 125, 6)):
        out.append(Strand(phi + J(3), theta_end + J(3), 0.22 + J(0.02), 0.03, seg=9, dphi=J(6), hook=hook,
                          curl=4, flare=0.04, twist=J(6)))

    # Short spikes hanging below the nape and the sides of the jaw.
    for k in range(9):
        phi = 90 + k * 22.5 + J(4)
        out.append(Strand(phi, 154 + J(4), 0.14 + J(0.02), 0.0, theta_root=124 + J(5), seg=4,
                          rise=0.4, flare=0.10 + J(0.03), tip_from=0.3, twist=J(10)))

    # Ahoge: rises from the whorl and curls over to the avatar's right (+X).
    root = WHORL * (envelope_dist(WHORL) - WHORL_DIP + 0.02)
    x, y = np.array([1.0, 0.0, 0.0]), WHORL
    path = [root, root + 0.08 * y + 0.04 * x, root + 0.16 * y + 0.13 * x,
            root + 0.19 * y + 0.24 * x, root + 0.27 * y + 0.31 * x]
    out.append(Strand(width=0.075, seg=10, ridge=0.3, path=path, up=[0.0, 0.25, -1.0], twist=20))
    return out


def width_profile(s):
    """Narrow at the root, widest at about a third, pointed tip."""
    grow = 0.2 + 0.8 * smoothstep(0.0, 0.32, s)
    taper = np.where(s < 0.45, 1.0, np.clip((1.0 - s) / 0.55, 0.0, 1.0) ** 0.85)
    return grow * taper


def strand_path(st):
    n = st.seg
    s = 1.0 - (1.0 - np.linspace(0.0, 1.0, n + 1)) ** 1.3  # denser towards the tip
    if st.path is not None:
        return s, catmull_rom(st.path, s)
    k = smoothstep(st.tip_from, 1.0, s)
    theta = st.theta_root + (st.theta_end - st.theta_root) * s - st.curl * k * k
    phi = st.phi + st.dphi * s + st.hook * k * k
    d = sph(theta, phi)
    r_scalp = np.linalg.norm(surface_point(d, STRAND_BASE), axis=-1)
    r = smooth_max(envelope_dist(d) - st.depth, r_scalp, 0.04)
    r_root = r[0] - WHORL_DIP
    r = r_root + (r - r_root) * smoothstep(0.0, st.rise, s) + st.flare * k * k
    return s, d * np.maximum(r, r_scalp)[:, None]


# ---------------------------------------------------------------------------
# Mesh assembly
# ---------------------------------------------------------------------------
class Mesh:
    """Positions are shared (the mesh stays watertight); UVs and normals are
    stored per face corner."""

    def __init__(self):
        self.pos = []
        self.faces = []  # list of [(pos_index, (u, v), (nx, ny, nz)), ...]

    def add_points(self, pts):
        base = len(self.pos)
        self.pos.extend(np.asarray(pts, float))
        return base

    def add_face(self, idx, uvs, nrms, outward):
        """Add a tri or quad; flip the winding if it doesn't face `outward`."""
        p = [self.pos[i] for i in idx]
        nrm = np.zeros(3)
        for a, b in zip(p, p[1:] + p[:1]):  # Newell normal
            nrm += np.cross(a, b)
        if np.dot(nrm, outward) < 0:
            idx, uvs, nrms = idx[::-1], uvs[::-1], nrms[::-1]
            nrm = -nrm
        self.faces.append(list(zip(idx, uvs, [tuple(n) for n in nrms])))
        return nrm / (np.linalg.norm(nrm) + 1e-12)

    def triangle_count(self):
        return sum(len(f) - 2 for f in self.faces)

    def open_edges(self):
        """Edges not shared by exactly two faces in opposite directions. Empty
        means the mesh is closed (watertight) with consistent winding."""
        count = {}
        for f in self.faces:
            idx = [c[0] for c in f]
            for a, b in zip(idx, idx[1:] + idx[:1]):
                count[(a, b)] = count.get((a, b), 0) + 1
        return [e for e, n in count.items() if n != 1 or count.get((e[1], e[0])) != 1]

    def flipped_normals(self):
        """Faces whose stored normals point against their winding."""
        bad = 0
        for f in self.faces:
            p = [self.pos[c[0]] for c in f]
            geo = sum(np.cross(a, b) for a, b in zip(p, p[1:] + p[:1]))
            if np.dot(geo, np.sum([c[2] for c in f], axis=0)) <= 0:
                bad += 1
        return bad

    def inside_out_parts(self):
        """Closed parts (strands, scalp shell) with a negative signed volume,
        i.e. whose faces all point inwards."""
        parent = list(range(len(self.pos)))

        def root(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        for f in self.faces:
            for c in f[1:]:
                parent[root(c[0])] = root(f[0][0])
        vol = {}
        pos = np.array(self.pos)
        for a, b, c in self.triangles():
            r = root(a)
            vol[r] = vol.get(r, 0.0) + np.dot(pos[a], np.cross(pos[b], pos[c])) / 6.0
        return sum(1 for v in vol.values() if v <= 0), len(vol)

    def triangles(self):
        tris = []
        for f in self.faces:
            for k in range(1, len(f) - 1):
                tris.append((f[0][0], f[k][0], f[k + 1][0]))
        return np.array(tris)


class Atlas:
    """Pixel rects (x0, y0, x1, y1, y going down) with a padding border."""

    PAD = 3

    def __init__(self):
        self.cap = (0, 0, TEX_SIZE, 160)
        self.under = (TEX_SIZE - 32, 160, TEX_SIZE, 192)
        self.cell_w, self.cell_h = 256, 32
        self.next = 0

    def strand_rect(self):
        cols = TEX_SIZE // self.cell_w
        r, c = divmod(self.next, cols)
        self.next += 1
        y0 = 192 + r * self.cell_h
        assert y0 + self.cell_h <= TEX_SIZE, "texture atlas is full"
        return (c * self.cell_w, y0, (c + 1) * self.cell_w, y0 + self.cell_h)

    @classmethod
    def uv(cls, rect, s, f):
        """Map local (s, f) in [0, 1]^2 (s along x, f along y downwards) to UV."""
        x0, y0, x1, y1 = rect
        px = x0 + cls.PAD + s * (x1 - x0 - 2 * cls.PAD)
        py = y0 + cls.PAD + f * (y1 - y0 - 2 * cls.PAD)
        return (px / TEX_SIZE, 1.0 - py / TEX_SIZE)


# Blade cross-section: left edge, ridge, right edge. The texture strip of a
# strand runs top-left face, top-right face, underside (the left edge appears
# twice because the strip wraps around).
EDGE_F = (0.0, 0.30, 0.60, 1.0)
BAND_MID = (0.15, 0.45, 0.80)
BANDS = ((0, 1), (1, 2), (2, 0))  # (from, to) cross-section vertex per face


def transport(v, t0, t1):
    """Rotate v by the rotation that takes unit tangent t0 to t1."""
    axis = np.cross(t0, t1)
    sin, cos = np.linalg.norm(axis), float(np.dot(t0, t1))
    if sin < 1e-9:
        return v
    k = axis / sin
    return v * cos + np.cross(k, v) * sin + k * np.dot(k, v) * (1.0 - cos)


def strand_frames(P, hint):
    """Tangent, blade normal and side vector along a strand.

    The normal follows `hint` (the head normal) where that is well defined,
    but is carried along the curve (parallel transport) where the strand
    points straight away from the head, e.g. in a curled-up tip. Re-deriving
    it from the hint there would flip the blade inside out."""
    T = normalize(np.gradient(P, axis=0))
    proj = hint - (hint * T).sum(-1, keepdims=True) * T
    plen = np.linalg.norm(proj, axis=-1)
    N = np.zeros_like(P)
    i0 = int(np.argmax(plen))
    N[i0] = proj[i0] / plen[i0]
    for order in (range(i0 + 1, len(P)), range(i0 - 1, -1, -1)):
        prev = i0
        for i in order:
            nv = transport(N[prev], T[prev], T[i])
            if plen[i] > 1e-6:
                h = proj[i] / plen[i]
                w = smoothstep(0.3, 0.8, plen[i]) * smoothstep(0.0, 0.5, np.dot(nv, h))
                nv = nv + w * (h - nv)
            nv = nv - np.dot(nv, T[i]) * T[i]
            N[i] = nv / np.linalg.norm(nv)
            prev = i
    return T, N, np.cross(T, N)


def build_strand(mesh, st, rect):
    s, P = strand_path(st)
    n = len(s) - 1
    hint = np.broadcast_to(normalize(st.up), P.shape) if st.up is not None else head_normal(P)
    T, N, B = strand_frames(P, hint)
    a = np.radians(st.twist) * smoothstep(0.3, 1.0, s)[:, None]
    N, B = np.cos(a) * N + np.sin(a) * B, np.cos(a) * B - np.sin(a) * N

    w = WIDTH_SCALE * st.width * width_profile(s)
    h = np.minimum(st.ridge * w, 0.035)
    ring = np.stack([P - B * (w / 2)[:, None], P + N * h[:, None], P + B * (w / 2)[:, None]], axis=1)
    centre = ring.mean(axis=1)
    centre[0], centre[n] = P[0], P[n]

    base = mesh.add_points([P[0], P[n]] + [ring[i, j] for i in range(1, n) for j in range(3)])

    def vid(i, j):
        if i == 0:
            return base
        if i == n:
            return base + 1
        return base + 2 + (i - 1) * 3 + j

    def frac(i, j, band):
        if i in (0, n):
            return BAND_MID[band]
        return EDGE_F[3] if (band == 2 and j == 0) else EDGE_F[j]

    # Pass 1: faces with flat normals to learn each segment's face normals.
    seg_n = np.zeros((n, 3, 3))
    plan = []
    for k in range(n):
        for band, (ja, jb) in enumerate(BANDS):
            if k == 0:
                corners = [(0, 0), (1, ja), (1, jb)]
            elif k == n - 1:
                corners = [(k, ja), (k, jb), (n, 0)]
            else:
                corners = [(k, ja), (k, jb), (k + 1, jb), (k + 1, ja)]
            pts = np.array([P[i] if i in (0, n) else ring[i, j] for i, j in corners])
            outward = pts.mean(axis=0) - 0.5 * (centre[k] + centre[k + 1])
            idx = [vid(i, j) for i, j in corners]
            nrm = np.zeros(3)
            for p0, p1 in zip(pts, np.roll(pts, -1, axis=0)):
                nrm += np.cross(p0, p1)
            if np.dot(nrm, outward) < 0:
                nrm = -nrm
            seg_n[k, band] = normalize(nrm)
            plan.append((k, band, corners, idx, outward))

    # Pass 2: smooth normals along the strand, hard edges between faces.
    def corner_normal(i, k, band):
        if i == 0 or i == n:
            return seg_n[min(k, n - 1), band]
        return normalize(seg_n[i - 1, band] + seg_n[i, band])

    for k, band, corners, idx, outward in plan:
        uvs = [Atlas.uv(rect, s[i], frac(i, j, band)) for i, j in corners]
        nrms = [corner_normal(i, k, band) for i, j in corners]
        mesh.add_face(idx, uvs, nrms, outward)

    # Ambient occlusion probes: the middle of each face at every inner ring.
    probes, probe_n = [], []
    for i in range(1, n):
        for band, (ja, jb) in enumerate(BANDS):
            probes.append(0.5 * (ring[i, ja] + ring[i, jb]))
            probe_n.append(corner_normal(i, i, band))
    return {"rect": rect, "s": s, "probes": np.array(probes), "probe_n": np.array(probe_n), "n": n}


def cap_edge_y(phi):
    """Hairline height: forehead in front, above the ears, nape at the back."""
    f = np.radians(phi)
    return -0.07 + 0.41 * np.cos(f) - 0.02 * np.cos(2 * f)


def cap_edge_theta(phis):
    lo, hi = np.zeros_like(phis), np.full_like(phis, 175.0)
    target = cap_edge_y(phis)
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        y = surface_point(sph(mid, phis), CAP_OUT)[..., 1]
        above = y > target
        lo, hi = np.where(above, mid, lo), np.where(above, hi, mid)
    return 0.5 * (lo + hi)


def build_cap(mesh, atlas, segs=18, rings=6, inner_rings=3):
    phis = np.arange(segs) * 360.0 / segs
    edge = cap_edge_theta(phis)

    def grid(nr, dist):
        t = (np.arange(1, nr + 1) / nr)[:, None] ** 0.85 * edge[None, :]
        return surface_point(sph(t, np.broadcast_to(phis, t.shape)), dist)

    outer, inner = grid(rings, CAP_OUT), grid(inner_rings, CAP_IN)
    pole_o = mesh.add_points([surface_point(WHORL, CAP_OUT)])
    base_o = mesh.add_points(outer.reshape(-1, 3))
    pole_i = mesh.add_points([surface_point(WHORL, CAP_IN)])
    base_i = mesh.add_points(inner.reshape(-1, 3))
    vo = lambda j, k: pole_o if j == 0 else base_o + (j - 1) * segs + k % segs  # noqa: E731
    vi = lambda j, k: pole_i if j == 0 else base_i + (j - 1) * segs + k % segs  # noqa: E731
    pos = lambda i: mesh.pos[i]  # noqa: E731
    under_uv = Atlas.uv(atlas.under, 0.5, 0.5)

    def cap_uv(j, k):
        return Atlas.uv(atlas.cap, k / segs, j / rings)

    for j in range(rings):
        for k in range(segs):
            if j == 0:
                corners = [(0, k), (1, k), (1, k + 1)]
            else:
                corners = [(j, k), (j, k + 1), (j + 1, k + 1), (j + 1, k)]
            idx = [vo(a, b) for a, b in corners]
            pts = np.array([pos(i) for i in idx])
            nrms = [head_normal(pos(i)) for i in idx]
            uvs = [cap_uv(a, b + 0.5 if a == 0 else b) for a, b in corners]
            mesh.add_face(idx, uvs, nrms, head_normal(pts.mean(axis=0)))

    for j in range(inner_rings):
        for k in range(segs):
            if j == 0:
                corners = [(0, k), (1, k), (1, k + 1)]
            else:
                corners = [(j, k), (j, k + 1), (j + 1, k + 1), (j + 1, k)]
            idx = [vi(a, b) for a, b in corners]
            pts = np.array([pos(i) for i in idx])
            nrms = [-head_normal(pos(i)) for i in idx]
            mesh.add_face(idx, [under_uv] * len(idx), nrms, -head_normal(pts.mean(axis=0)))

    for k in range(segs):
        idx = [vo(rings, k), vo(rings, k + 1), vi(inner_rings, k + 1), vi(inner_rings, k)]
        pts = np.array([pos(i) for i in idx])
        t = np.radians(edge[k])
        f = np.radians(phis[k])
        away = -math.sin(t) * WHORL + math.cos(t) * (math.cos(f) * AX_F + math.sin(f) * AX_R)
        edge_n = normalize(np.cross(pts[1] - pts[0], pts[3] - pts[0]))
        nrm = edge_n if np.dot(edge_n, away) > 0 else -edge_n
        mesh.add_face(idx, [under_uv] * 4, [nrm] * 4, away)

    probe = np.vstack([[pos(pole_o)], outer.reshape(-1, 3)])
    return {"probes": probe, "probe_n": head_normal(probe), "segs": segs, "rings": rings}


def head_triangles(n_lat=12, n_lon=24):
    """Low-poly classic head, only used as an occluder for the AO bake."""
    lat = np.linspace(0.0, math.pi, n_lat + 1)
    lon = np.linspace(0.0, 2 * math.pi, n_lon + 1)
    la, lo = np.meshgrid(lat, lon, indexing="ij")
    d = np.stack([np.sin(la) * np.cos(lo), np.cos(la), np.sin(la) * np.sin(lo)], axis=-1)
    p = surface_point(d, 0.0)
    tris = []
    for i in range(n_lat):
        for j in range(n_lon):
            tris.append((p[i, j], p[i + 1, j], p[i + 1, j + 1]))
            tris.append((p[i, j], p[i + 1, j + 1], p[i, j + 1]))
    return np.array(tris)


# ---------------------------------------------------------------------------
# Ambient occlusion (ray traced against the hair and the head)
# ---------------------------------------------------------------------------
def ambient_occlusion(points, normals, tris, rays=40, reach=0.26):
    k = np.arange(rays) + 0.5
    r = np.sqrt(k / rays)
    ang = 2.0 * math.pi * ((k * 0.6180339887) % 1.0)
    local = np.stack([r * np.cos(ang), r * np.sin(ang), np.sqrt(1.0 - r * r)], axis=-1)

    v0, v1, v2 = tris[:, 0], tris[:, 1], tris[:, 2]
    e1, e2 = v1 - v0, v2 - v0
    cen = tris.mean(axis=1)
    rad = np.max(np.linalg.norm(tris - cen[:, None], axis=-1), axis=1)

    out = np.empty(len(points))
    for i, (p, nrm) in enumerate(zip(points, normals)):
        t1 = normalize(np.cross(nrm, [0.0, 1.0, 0.0] if abs(nrm[1]) < 0.9 else [1.0, 0.0, 0.0]))
        t2 = np.cross(nrm, t1)
        dirs = local[:, :1] * t1 + local[:, 1:2] * t2 + local[:, 2:] * nrm
        o = p + nrm * 0.004
        near = np.linalg.norm(cen - o, axis=1) < reach + rad
        if not near.any():
            out[i] = 1.0
            continue
        a0, a1, a2 = v0[near], e1[near], e2[near]
        pv = np.cross(dirs[:, None, :], a2[None])
        det = np.einsum("rtk,tk->rt", pv, a1)
        ok = np.abs(det) > 1e-9
        inv = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0)
        tv = o - a0
        u = np.einsum("rtk,tk->rt", pv, tv) * inv
        qv = np.cross(tv[None], a1[None])
        v = np.einsum("rk,tk->rt", dirs, qv[0]) * inv
        t = np.einsum("tk,tk->t", a2, qv[0])[None] * inv
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-3) & (t < reach)
        tmin = np.where(hit, t, np.inf).min(axis=1)
        occl = np.where(np.isfinite(tmin), 1.0 - np.minimum(tmin, reach) / reach, 0.0) ** 0.5
        out[i] = 1.0 - occl.mean()
    return out


# ---------------------------------------------------------------------------
# Texture
# ---------------------------------------------------------------------------
DARK = np.array([88.0, 88.0, 90.0])
LIGHT = np.array([252.0, 252.0, 252.0])


def to_rgb(b):
    b = np.clip(b, 0.0, 1.0)[..., None]
    return DARK + (LIGHT - DARK) * b ** 1.1


def local_grid(rect):
    """(s, f) of every pixel in a rect, clamped so the padding repeats the edge."""
    x0, y0, x1, y1 = rect
    pad = Atlas.PAD
    xs = np.clip((np.arange(x0, x1) + 0.5 - x0 - pad) / (x1 - x0 - 2 * pad), 0.0, 1.0)
    ys = np.clip((np.arange(y0, y1) + 0.5 - y0 - pad) / (y1 - y0 - 2 * pad), 0.0, 1.0)
    return np.meshgrid(xs, ys)


def streaks(x, rng, amount):
    """Fine lengthwise hair streaks: a few random waves across the strand."""
    out = np.ones_like(x)
    for _ in range(4):
        out += amount * rng.uniform(0.4, 1.0) * np.sin(2 * math.pi * rng.uniform(5, 16) * x
                                                       + rng.uniform(0, 2 * math.pi))
    return out


def paint_strand(img, info, ao, rng):
    rect, s_r, n = info["rect"], info["s"], info["n"]
    s, f = local_grid(rect)
    band = np.where(f < EDGE_F[1], 0, np.where(f < EDGE_F[2], 1, 2))

    # Edge -> ridge position on the two top faces.
    e = np.where(band == 0, f / EDGE_F[1], (EDGE_F[2] - f) / (EDGE_F[2] - EDGE_F[1]))
    shade = np.where(band == 2, 0.80, 0.80 + 0.20 * smoothstep(0.0, 0.55, e))
    shade *= np.where(band == 2, 1.0, 1.0 + 0.05 * smoothstep(0.75, 1.0, e))
    shade *= streaks(f + 0.015 * np.sin(6.0 * s), rng, 0.022)
    shade *= 0.74 + 0.26 * smoothstep(0.0, 0.3, s)

    # AO probes sit on rings 1..n-1; extend to the root and the tip.
    grid = ao.reshape(n - 1, 3)
    grid = np.vstack([grid[:1] * 0.9, grid, grid[-1:]])
    occ = np.zeros_like(s)
    for b in range(3):
        occ = np.where(band == b, np.interp(s, s_r, grid[:, b]), occ)
    shade *= 0.5 + 0.5 * occ

    x0, y0, x1, y1 = rect
    img[y0:y1, x0:x1] = to_rgb(shade)


def paint_cap(img, atlas, info, ao, rng):
    segs, rings = info["segs"], info["rings"]
    x0, y0, x1, y1 = atlas.cap
    s, f = local_grid(atlas.cap)
    # Bilinear AO lookup on the (ring, segment) grid, wrapping around.
    grid = np.vstack([np.full((1, segs), ao[0]), ao[1:].reshape(rings, segs)])
    grid = np.hstack([grid, grid[:, :1]])
    gx, gy = s * segs, f * rings
    ix, iy = np.minimum(gx.astype(int), segs - 1), np.minimum(gy.astype(int), rings - 1)
    tx, ty = gx - ix, gy - iy
    occ = (grid[iy, ix] * (1 - tx) * (1 - ty) + grid[iy, ix + 1] * tx * (1 - ty)
           + grid[iy + 1, ix] * (1 - tx) * ty + grid[iy + 1, ix + 1] * tx * ty)
    shade = 0.80 * streaks(s * 3.0, rng, 0.03) * (0.5 + 0.5 * occ)
    img[y0:y1, x0:x1] = to_rgb(shade)

    ux0, uy0, ux1, uy1 = atlas.under
    img[uy0:uy1, ux0:ux1] = to_rgb(np.full((uy1 - uy0, ux1 - ux0), 0.55))


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def write_obj(mesh, path):
    vt_map, vn_map, vts, vns = {}, {}, [], []

    def index(val, mp, lst, nd):
        key = tuple(round(float(c), nd) for c in val)
        if key not in mp:
            lst.append(key)
            mp[key] = len(lst)
        return mp[key]

    faces = [[(i + 1, index(uv, vt_map, vts, 5), index(nm, vn_map, vns, 4)) for i, uv, nm in f]
             for f in mesh.faces]
    with open(path, "w") as fh:
        fh.write("# Messy Silver Hair - Roblox UGC (hair accessory)\n")
        fh.write("# 1 unit = 1 stud, +Y up, front faces -Z, classic head centred at the origin\n")
        fh.write(f"mtllib {NAME}.mtl\n")
        fh.write("o MessyHair\n")
        for x, y, z in mesh.pos:
            fh.write(f"v {x:.5f} {y:.5f} {z:.5f}\n")
        for u, v in vts:
            fh.write(f"vt {u:.5f} {v:.5f}\n")
        for x, y, z in vns:
            fh.write(f"vn {x:.4f} {y:.4f} {z:.4f}\n")
        fh.write(f"usemtl {NAME}\n")
        fh.write("s off\n")
        for f in faces:
            fh.write("f " + " ".join(f"{a}/{b}/{c}" for a, b, c in f) + "\n")


def main():
    mesh, atlas = Mesh(), Atlas()
    cap = build_cap(mesh, atlas)
    strands = [build_strand(mesh, st, atlas.strand_rect()) for st in hair_strands()]

    tris = mesh.triangle_count()
    assert tris <= MAX_TRIS, f"{tris} triangles, Roblox allows {MAX_TRIS}"
    open_edges = mesh.open_edges()
    assert not open_edges, f"mesh is not watertight: {len(open_edges)} bad edges, e.g. {open_edges[:5]}"
    flipped = mesh.flipped_normals()
    assert not flipped, f"{flipped} faces have normals against their winding"
    inside_out, parts = mesh.inside_out_parts()
    assert not inside_out, f"{inside_out} of {parts} parts are inside out"

    # Bake ambient occlusion at the probes.
    pos = np.array(mesh.pos)
    occluders = np.vstack([pos[mesh.triangles()], head_triangles()])
    probes = np.vstack([cap["probes"]] + [st["probes"] for st in strands])
    probe_n = np.vstack([cap["probe_n"]] + [st["probe_n"] for st in strands])
    ao = ambient_occlusion(probes, probe_n, occluders)

    rng = np.random.default_rng(3)
    img = np.full((TEX_SIZE, TEX_SIZE, 3), 170.0)
    n_cap = len(cap["probes"])
    paint_cap(img, atlas, cap, ao[:n_cap], rng)
    at = n_cap
    for st in strands:
        m = len(st["probes"])
        paint_strand(img, st, ao[at:at + m], rng)
        at += m
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT_DIR, f"{NAME}_texture.png"))

    write_obj(mesh, os.path.join(OUT_DIR, f"{NAME}.obj"))
    with open(os.path.join(OUT_DIR, f"{NAME}.mtl"), "w") as fh:
        fh.write(f"newmtl {NAME}\nKa 1 1 1\nKd 1 1 1\nKs 0.1 0.1 0.1\nNs 30\nd 1\nillum 2\n"
                 f"map_Kd {NAME}_texture.png\n")

    lo, hi = pos.min(axis=0), pos.max(axis=0)
    att = np.array([0.0, HEAD_H, 0.0])
    print(f"parts: {parts} closed, outward-facing  vertices: {len(pos)}  triangles: {tris}")
    print("bounding box (studs): {:.2f} x {:.2f} x {:.2f}".format(*(hi - lo)))
    print("from HairAttachment: up {:.2f}  down {:.2f}  front {:.2f}  behind {:.2f}  "
          "left/right {:.2f}/{:.2f}".format(hi[1] - att[1], att[1] - lo[1], -lo[2], hi[2], -lo[0], hi[0]))
    # Studio centres an imported MeshPart on its bounding box, so this is where
    # the Handle's HairAttachment goes for the hair to sit on a classic head.
    print("HairAttachment in the Handle: ({:.3f}, {:.3f}, {:.3f})".format(*(att - 0.5 * (lo + hi))))


if __name__ == "__main__":
    main()
