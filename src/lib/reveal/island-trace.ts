// Generated data — SECRET, same reasoning as geodata-secret.ts's own
// header: this is Ameland's real traced silhouette, from the same source
// SVG as nl-trace.ts (see that file's header) and recentered against the
// SAME mainland origin, so it lands at its true real-world position
// relative to the Netherlands outline with no separate calibration step —
// unlike the old WADDEN_CLUSTER_1 (a different, unrelated hand-drawn
// illustration bolted onto a mismatched coordinate space).
//
// This must stay server-side only, exactly like ISLAND_POINT: shipping
// this shape in the public client bundle would let anyone read the
// destination straight out of page source before the chapter unlocks,
// regardless of what camera coordinates ever reach them. It only reaches
// the browser inside the gated `revealData` payload once bestemming is
// unlocked — see trip-state.ts. Named ISLAND_SHAPE, not AMELAND_SHAPE,
// because that identifier is mirrored by trip-state.ts and by
// index.astro's client script — and that file's property names DO compile
// into the public bundle every visitor downloads, unlocked or not.
//
// `tx`/`ty` use the identical recentering origin as nl-trace.ts's
// NL_TRACE_PATHS (the mainland shape's own absolute center), not Ameland's
// own center — that's what makes the two line up correctly when rendered
// together under the same NL_CENTER/NL_SCALE transform. `d` is
// byte-identical to the source SVG's path data, never hand-edited.
export const ISLAND_SHAPE: { d: string; tx: number; ty: number } = {
  d: "M0,0 L9,0 L9,1 L10,1 L10,2 L11,2 L11,3 L13,3 L13,4 L14,4 L14,5 L15,5 L15,6 L16,6 L16,7 L17,7 L17,8 L18,8 L18,10 L17,10 L17,12 L16,12 L16,14 L14,14 L14,15 L11,15 L11,16 L8,16 L8,15 L5,15 L5,14 L2,14 L2,13 L-2,13 L-2,14 L-4,14 L-4,15 L-8,15 L-8,16 L-12,16 L-12,17 L-15,17 L-15,18 L-17,18 L-17,19 L-18,19 L-18,20 L-24,20 L-24,21 L-27,21 L-27,22 L-33,22 L-33,23 L-39,23 L-39,24 L-40,24 L-40,25 L-41,25 L-41,26 L-45,26 L-45,27 L-49,27 L-49,28 L-56,28 L-56,27 L-59,27 L-59,26 L-60,26 L-60,25 L-61,25 L-61,24 L-65,24 L-65,25 L-67,25 L-67,26 L-68,26 L-68,27 L-69,27 L-69,26 L-70,26 L-70,25 L-72,25 L-72,24 L-73,24 L-73,23 L-74,23 L-74,22 L-75,22 L-75,21 L-78,21 L-78,22 L-79,22 L-79,23 L-80,23 L-80,24 L-81,24 L-81,25 L-82,25 L-82,27 L-83,27 L-83,28 L-84,28 L-84,29 L-85,29 L-85,31 L-86,31 L-86,32 L-88,32 L-88,33 L-90,33 L-90,34 L-91,34 L-91,35 L-98,35 L-98,36 L-101,36 L-101,35 L-108,35 L-108,34 L-111,34 L-111,33 L-113,33 L-113,32 L-115,32 L-115,31 L-116,31 L-116,30 L-118,30 L-118,29 L-119,29 L-119,28 L-120,28 L-120,27 L-121,27 L-121,26 L-122,26 L-122,24 L-123,24 L-123,22 L-124,22 L-124,16 L-123,16 L-123,14 L-124,14 L-124,13 L-125,13 L-125,11 L-126,11 L-126,9 L-125,9 L-125,8 L-124,8 L-124,6 L-123,6 L-123,5 L-121,5 L-121,4 L-120,4 L-120,3 L-118,3 L-118,2 L-107,2 L-107,3 L-105,3 L-105,4 L-103,4 L-103,5 L-101,5 L-101,6 L-98,6 L-98,7 L-96,7 L-96,8 L-95,8 L-95,9 L-91,9 L-91,10 L-85,10 L-85,9 L-76,9 L-76,8 L-72,8 L-72,7 L-39,7 L-39,6 L-33,6 L-33,5 L-28,5 L-28,4 L-10,4 L-10,3 L-6,3 L-6,2 L-4,2 L-4,1 L0,1 Z M0,4 L0,5 L-3,5 L-3,6 L-5,6 L-5,7 L-9,7 L-9,8 L-28,8 L-28,9 L-33,9 L-33,10 L-39,10 L-39,11 L-63,11 L-63,10 L-64,10 L-64,11 L-71,11 L-71,12 L-76,12 L-76,13 L-84,13 L-84,14 L-92,14 L-92,13 L-96,13 L-96,12 L-97,12 L-97,11 L-99,11 L-99,10 L-102,10 L-102,9 L-104,9 L-104,8 L-106,8 L-106,7 L-108,7 L-108,6 L-117,6 L-117,7 L-119,7 L-119,8 L-120,8 L-120,9 L-121,9 L-121,11 L-119,11 L-119,12 L-118,12 L-118,16 L-119,16 L-119,17 L-120,17 L-120,21 L-119,21 L-119,23 L-118,23 L-118,24 L-117,24 L-117,26 L-115,26 L-115,27 L-114,27 L-114,28 L-112,28 L-112,29 L-110,29 L-110,30 L-108,30 L-108,31 L-101,31 L-101,32 L-98,32 L-98,31 L-92,31 L-92,30 L-91,30 L-91,29 L-89,29 L-89,28 L-88,28 L-88,27 L-87,27 L-87,25 L-86,25 L-86,24 L-85,24 L-85,22 L-84,22 L-84,21 L-83,21 L-83,20 L-82,20 L-82,19 L-81,19 L-81,18 L-79,18 L-79,17 L-75,17 L-75,18 L-72,18 L-72,19 L-71,19 L-71,20 L-70,20 L-70,21 L-69,21 L-69,22 L-68,22 L-68,21 L-67,21 L-67,20 L-60,20 L-60,21 L-59,21 L-59,22 L-57,22 L-57,23 L-56,23 L-56,24 L-49,24 L-49,23 L-45,23 L-45,22 L-43,22 L-43,21 L-42,21 L-42,20 L-40,20 L-40,19 L-34,19 L-34,18 L-28,18 L-28,17 L-24,17 L-24,16 L-19,16 L-19,15 L-18,15 L-18,14 L-16,14 L-16,13 L-13,13 L-13,12 L-9,12 L-9,11 L-6,11 L-6,10 L-3,10 L-3,9 L2,9 L2,10 L5,10 L5,11 L9,11 L9,12 L11,12 L11,11 L13,11 L13,9 L12,9 L12,8 L11,8 L11,7 L10,7 L10,6 L9,6 L9,5 L8,5 L8,4 Z ",
  tx: 237.5,
  ty: -865,
};
