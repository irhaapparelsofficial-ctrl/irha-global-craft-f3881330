export const EXECUTION_ID = "IA-MEDIA-E001";
export const MEDIA_VERSION = "ia-media-e001-20260730";
export const SITE_MEDIA_BUCKET = "site-media";
export const RESPONSIVE_WIDTHS = [360, 720, 1200, 1600];

const product = (sku, slug, name, driveFolderId, images) => ({
  sku,
  slug,
  name,
  driveFolderId,
  images,
});

const image = (driveFileId, role, roleIndex, displayOrder, confidence, visualIdentificationReasons) => ({
  driveFileId,
  role,
  roleIndex,
  displayOrder,
  confidence,
  visualIdentificationReasons,
});

export const PRODUCTS = [
  product("IRHA-P001", "short-lederhosen", "Short Lederhosen", "1H_SUxDLkFDpfi3XzeXq5XUbHnaa-4vxw", [
    image("1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY", "hero", 1, 1, "high", "Front source belongs to the exact P001 Drive group; the short above-knee silhouette and construction remain consistent with every independently reviewed alternate view."),
    image("1stFYqjEuRDb0ZcJLxxqZeyWQ4Rhk0GvC", "three_quarter", 1, 2, "verified", "Pixel review shows the complete short Lederhosen from a front-left three-quarter angle, with matching dark suede, bib embroidery, side buttons and hem."),
    image("1pMkT7GnFg1UV1hhC6So9z4hOERF7cAXw", "three_quarter", 2, 3, "verified", "Pixel review contradicts the source filename: the bib is visible, so this is an alternate front three-quarter view, not a rear view."),
    image("1aXnlt_v2th_i-41Isd8RRDxYVK8knIyf", "side", 1, 4, "verified", "Pixel review shows the same short garment in direct side profile with matching pocket, embroidery, buttons and dark suede."),
    image("1pXo-gGBS9e7NM0kSLO3SNW17FpDGk2Le", "back", 1, 5, "verified", "Pixel review shows a direct back view with two embroidered rear pockets and the complete short hem."),
    image("1wS5D67HBz5MDsxE3gNKT1zOhfCftgDhb", "macro", 1, 6, "verified", "Pixel review shows a close construction and embroidery detail from the same dark-brown P001 set."),
  ]),
  product("IRHA-P002", "knee-length-lederhosen", "Knee Length Lederhosen", "1HLJX9gXoVsKiXfiOVGJ5EAcX-kMZ8E95", [
    image("1Q0Om5OoxmlUMC3dNnqE2I4QinbzpFjij", "hero", 1, 1, "verified", "Direct front pixel review shows traditional knee-length breeches, suspenders, bib construction and below-knee silhouette distinct from P001."),
    image("1IWPm85ODhRdLnvQ5c0HGQ_iZGrW_oYIc", "three_quarter", 1, 2, "verified", "Front three-quarter view of the same knee-length design, matching suspenders, embroidery, buttons and cuff construction."),
    image("1geKjNhs5IonXxRi0TvPQ1rtIyw2hOJSQ", "side", 1, 3, "verified", "Direct side pixel review confirms the knee-length profile and matching side construction."),
    image("16ntN3iVNCOeKipegrVeJ-CwYKpqQLhp2", "rear_three_quarter", 1, 4, "verified", "Pixel review shows a rear three-quarter angle; this corrects the prior sequence-derived back label."),
    image("1k8bKWfgfycWap1JmJ18hxusZvH4IRK1W", "back", 1, 5, "verified", "Pixel review shows the direct back; this corrects the prior sequence-derived rear-three-quarter label."),
    image("1fgCmdDTfprTGR_WsmMrIrUR6dO13Rfcr", "macro", 1, 6, "verified", "Close pixel review shows matching embroidery, suede texture, hardware and construction detail."),
  ]),
  product("IRHA-P003", "long-lederhosen", "Long Lederhosen", "1BSSQfh4zkv1PeajzguKCRWb7QHqZn0O2", [
    image("1PQ9edN4zBZhwYG7cK-Hc-cAy39K1DWlk", "hero", 1, 1, "verified", "Direct front pixel review shows full-length Lederhosen trousers with suspenders and ankle-length legs."),
    image("1imXD3FcSsbIpm2xh3oXQdqI_llLA0_0s", "three_quarter", 1, 2, "verified", "Pixel review shows a front three-quarter view of the same full-length design; prior role metadata was wrong."),
    image("1VbnNZ8AkyC6e0irl_0lcVeWFIAG4TlkF", "rear_three_quarter", 1, 3, "verified", "Pixel review shows a rear three-quarter perspective with matching long silhouette and rear construction."),
    image("1iTONHMJsLulWmAl8qtiegZPMswg-4Xgx", "back", 1, 4, "verified", "Pixel review shows the direct back of the same full-length design; prior macro role metadata was wrong."),
    image("1SfgqDbKYMI1nv7-MVsi83X-0_B6QkNxi", "macro", 1, 5, "verified", "Pixel review shows buckle, suspenders, embroidery and hardware detail; prior side role metadata was wrong."),
  ]),
  product("IRHA-P004", "vintage-lederhosen", "Vintage Lederhosen", "1rD21wZgDCiZwpjtxFjlaZsX60X-j_wvJ", [
    image("1mkiG4teMgNRMsz5LhThe4YTJAPZvuwvl", "hero", 1, 1, "verified", "Direct front pixel review shows a strongly aged, mottled and heritage-finished short Lederhosen with suspenders."),
    image("1ZXfvGsEhK0O19IzVkzskvXx-EzB1w0Uh", "three_quarter", 1, 2, "verified", "Front three-quarter pixel review matches the same distressed finish, embroidery and pouch construction."),
    image("1reUz7XhoXnzWYussiJ53pGgYDCexp2pd", "side", 1, 3, "verified", "Direct side view confirms the same vintage garment, side pouch and short silhouette."),
    image("1zES1Ed61r6q4vQhZvmNLY6wIl9NV46Gf", "rear_three_quarter", 1, 4, "verified", "Pixel review shows a rear three-quarter angle; this corrects the prior sequence-derived back label."),
    image("1jMQQPdOaUyTV7eFTGD4Z1jj-OXxNilf0", "back", 1, 5, "verified", "Pixel review shows the direct back with laced waist; this corrects the prior rear-three-quarter label."),
    image("1te536dSJUJit68e5bdTwvh61EM0kPcAR", "macro", 1, 6, "verified", "Close construction view shows aged surface, lacing, hardware, stitching and pouch detail from the same set."),
  ]),
  product("IRHA-P005", "premium-embroidered-lederhosen", "Premium Embroidered Lederhosen", "1TUfN-YCDOc8B5jjfv8E68ZiRq_03DGM9", [
    image("1V9rNE3WFg833FI6Sb6A461jF604c3_oH", "hero", 1, 1, "verified", "Direct front pixel review makes the bib, thigh and side floral embroidery visible across the complete garment."),
    image("1wwS0_bQaZqs0HldzPykoa_ugOZdNrSOO", "three_quarter", 1, 2, "verified", "Front three-quarter view matches the same dense floral embroidery, trim and short silhouette."),
    image("1sijQeP9yc63jLJ1hfmjVZMVxyk5pKkWW", "side", 1, 3, "verified", "Side view confirms the embroidered pocket, side panel, buttons, lacing and matching material."),
    image("1j9NL63UIw0J7tiF73pY039sgDR-3-Mcf", "rear_three_quarter", 1, 4, "verified", "Pixel review shows a rear three-quarter angle; prior back metadata was sequence-derived and wrong."),
    image("1beVS9X1RzmY3p0YNCHz8TYr0HyRos24y", "back", 1, 5, "verified", "Pixel review shows the direct back; prior rear-three-quarter metadata was wrong."),
    image("18jipRuTkaQE85F3Sxv-7-A42HmczGZTa", "macro", 1, 6, "verified", "Macro pixel review clearly shows multi-tone floral embroidery, piping, stitching and horn-style button detail."),
  ]),
  product("IRHA-P006", "goat-suede-lederhosen", "Goat Suede Lederhosen", "1xO0YajOXlwodfg_g63GofO9Iro_9_suI", [
    image("1vWDOd8SNogo0oIGYu63yl_RqmkO0ao5Z", "hero", 1, 1, "verified", "Direct front pixel review shows the complete brown suede Lederhosen; material identity is supported by exact P006 source-folder provenance, not appearance alone."),
    image("1D82lgJ8iZrpA10bkZ4qv3KRH4uNKk3ib", "three_quarter", 1, 2, "verified", "Front three-quarter view matches the same P006 construction, embroidery, buttons and suede surface."),
    image("1jh2TpDLVuDYpOylIeCrBiom1K0waXmZl", "side", 1, 3, "verified", "Direct side view matches the same P006 pocket, panel, buttons and embroidery."),
    image("1lBi31K_9JoFAAm90zWUj0mk1Ep_MUChe", "rear_three_quarter", 1, 4, "verified", "Pixel review shows a rear three-quarter angle; prior back metadata was wrong."),
    image("1CPNz01l_eyfSopq7pUrlItOIJrPR6dcw", "back", 1, 5, "verified", "Pixel review shows the direct back and matching waist lacing; prior rear-three-quarter metadata was wrong."),
    image("102CA_XfxShBG6rVCT8Ly2ZEPrKZA72ir", "macro", 1, 6, "verified", "Macro review shows matching suede nap, embroidery, piping, stitching and button detail."),
  ]),
  product("IRHA-P007", "deer-suede-lederhosen", "Deer Suede Lederhosen", "116new2l0s5sisL81rMPjZ-NVaFMnIilp", [
    image("1GP5sJfMfKBcdn1ppRc2KqxSZvnQASCbx", "hero", 1, 1, "verified", "Direct front pixel review shows the complete light-tan suede Lederhosen; material identity is supported by exact P007 source-folder provenance, not color alone."),
    image("17ArDaUQw7y0JDBBc_4ZabQmVMJe570vH", "three_quarter", 1, 2, "verified", "Front three-quarter view matches the same P007 construction, embroidery, buttons and light-tan suede surface."),
    image("1ZsoVxE-37Wfs-BnlJKSB0QwMsmodrE6H", "side", 1, 3, "verified", "Direct side view matches the same P007 pocket, panel, embroidery and hem lacing."),
    image("19BSfXm3mOd5ZlKYEihY0aIeT1-7aCn9m", "rear_three_quarter", 1, 4, "verified", "Pixel review shows a rear three-quarter angle; prior back metadata was wrong."),
    image("12F4ufxSZO1PnM7eq6b8HZfaMkVmfVNcg", "back", 1, 5, "verified", "Pixel review shows the direct back; prior rear-three-quarter metadata was wrong."),
    image("1VyctJT-q7ExkAf90TXGp2DKL4czoWUtV", "macro", 1, 6, "verified", "Macro review shows matching patterned suede surface, floral embroidery, piping and horn-style button detail."),
  ]),
];

export const REJECTED_CANDIDATES = [
  {
    sku: "IRHA-P003",
    driveFileId: "1N2HfKQMsBuAQSUMjJXuKVLjPlfUAdSG3",
    reason: "Checksum-identical duplicate of selected P003 front three-quarter source 1imXD3FcSsbIpm2xh3oXQdqI_llLA0_0s; remains unpublished.",
  },
  {
    sku: "IRHA-P001",
    driveFileId: null,
    reason: "No source was published as rear three-quarter because the filename-labelled candidate visibly showed the front bib and was reclassified as an alternate front three-quarter view.",
  },
  {
    sku: "BRAND",
    driveFileId: "1ofqBrOVRTPUWmGeofRRw1ER5hwC93qWF",
    reason: "Drive candidate visually showed a shield/IA mark rather than the owner-approved navy-and-gold circular Irha Apparels Manufacturing Specialists crest.",
  },
];
