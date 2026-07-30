import type { ProductRealMedia } from "@/lib/productRealMedia";

const STORAGE_ORIGIN = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media";
const RECOVERY_ROOT = `${STORAGE_ORIGIN}/catalog/recovery/ia-media-e001-20260730`;

const media = (slug: string, files: string[]): ProductRealMedia => ({
  gallery: files.map((file) => `${RECOVERY_ROOT}/${slug}/${file}`),
});

export const IA_MEDIA_E001_PRODUCT_MEDIA: Readonly<Record<string, ProductRealMedia>> = Object.freeze({
  "short-lederhosen": media("short-lederhosen", [
    "01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp",
    "02-three_quarter-1stFYqjEuRDb0ZcJLxxqZeyWQ4Rhk0GvC.webp",
    "03-three_quarter-1pMkT7GnFg1UV1hhC6So9z4hOERF7cAXw.webp",
    "04-side-1aXnlt_v2th_i-41Isd8RRDxYVK8knIyf.webp",
    "05-back-1pXo-gGBS9e7NM0kSLO3SNW17FpDGk2Le.webp",
    "06-macro-1wS5D67HBz5MDsxE3gNKT1zOhfCftgDhb.webp",
  ]),
  "knee-length-lederhosen": media("knee-length-lederhosen", [
    "01-hero-1Q0Om5OoxmlUMC3dNnqE2I4QinbzpFjij.webp",
    "02-three_quarter-1IWPm85ODhRdLnvQ5c0HGQ_iZGrW_oYIc.webp",
    "03-side-1geKjNhs5IonXxRi0TvPQ1rtIyw2hOJSQ.webp",
    "04-rear_three_quarter-16ntN3iVNCOeKipegrVeJ-CwYKpqQLhp2.webp",
    "05-back-1k8bKWfgfycWap1JmJ18hxusZvH4IRK1W.webp",
    "06-macro-1fgCmdDTfprTGR_WsmMrIrUR6dO13Rfcr.webp",
  ]),
  "long-lederhosen": media("long-lederhosen", [
    "01-hero-1PQ9edN4zBZhwYG7cK-Hc-cAy39K1DWlk.webp",
    "02-three_quarter-1imXD3FcSsbIpm2xh3oXQdqI_llLA0_0s.webp",
    "03-rear_three_quarter-1VbnNZ8AkyC6e0irl_0lcVeWFIAG4TlkF.webp",
    "04-back-1iTONHMJsLulWmAl8qtiegZPMswg-4Xgx.webp",
    "05-macro-1SfgqDbKYMI1nv7-MVsi83X-0_B6QkNxi.webp",
  ]),
  "vintage-lederhosen": media("vintage-lederhosen", [
    "01-hero-1mkiG4teMgNRMsz5LhThe4YTJAPZvuwvl.webp",
    "02-three_quarter-1ZXfvGsEhK0O19IzVkzskvXx-EzB1w0Uh.webp",
    "03-side-1reUz7XhoXnzWYussiJ53pGgYDCexp2pd.webp",
    "04-rear_three_quarter-1zES1Ed61r6q4vQhZvmNLY6wIl9NV46Gf.webp",
    "05-back-1jMQQPdOaUyTV7eFTGD4Z1jj-OXxNilf0.webp",
    "06-macro-1te536dSJUJit68e5bdTwvh61EM0kPcAR.webp",
  ]),
  "premium-embroidered-lederhosen": media("premium-embroidered-lederhosen", [
    "01-hero-1V9rNE3WFg833FI6Sb6A461jF604c3_oH.webp",
    "02-three_quarter-1wwS0_bQaZqs0HldzPykoa_ugOZdNrSOO.webp",
    "03-side-1sijQeP9yc63jLJ1hfmjVZMVxyk5pKkWW.webp",
    "04-rear_three_quarter-1j9NL63UIw0J7tiF73pY039sgDR-3-Mcf.webp",
    "05-back-1beVS9X1RzmY3p0YNCHz8TYr0HyRos24y.webp",
    "06-macro-18jipRuTkaQE85F3Sxv-7-A42HmczGZTa.webp",
  ]),
  "goat-suede-lederhosen": media("goat-suede-lederhosen", [
    "01-hero-1vWDOd8SNogo0oIGYu63yl_RqmkO0ao5Z.webp",
    "02-three_quarter-1D82lgJ8iZrpA10bkZ4qv3KRH4uNKk3ib.webp",
    "03-side-1jh2TpDLVuDYpOylIeCrBiom1K0waXmZl.webp",
    "04-rear_three_quarter-1lBi31K_9JoFAAm90zWUj0mk1Ep_MUChe.webp",
    "05-back-1CPNz01l_eyfSopq7pUrlItOIJrPR6dcw.webp",
    "06-macro-102CA_XfxShBG6rVCT8Ly2ZEPrKZA72ir.webp",
  ]),
  "deer-suede-lederhosen": media("deer-suede-lederhosen", [
    "01-hero-1GP5sJfMfKBcdn1ppRc2KqxSZvnQASCbx.webp",
    "02-three_quarter-17ArDaUQw7y0JDBBc_4ZabQmVMJe570vH.webp",
    "03-side-1ZsoVxE-37Wfs-BnlJKSB0QwMsmodrE6H.webp",
    "04-rear_three_quarter-19BSfXm3mOd5ZlKYEihY0aIeT1-7aCn9m.webp",
    "05-back-12F4ufxSZO1PnM7eq6b8HZfaMkVmfVNcg.webp",
    "06-macro-1VyctJT-q7ExkAf90TXGp2DKL4czoWUtV.webp",
  ]),
});
