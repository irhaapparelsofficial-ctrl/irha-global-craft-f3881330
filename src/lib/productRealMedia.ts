// Real product media mapped from the user's Drive library.
// One exact product set maps to one exact public product slug.
// Keep this layer small and explicit so media can later move to first-party storage
// without changing public product routes or mixing unrelated product variants.

export type ProductRealMedia = {
  gallery: string[];
};

const driveImage = (fileId: string) =>
  `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;

export const PRODUCT_REAL_MEDIA: Record<string, ProductRealMedia> = {
  "traditional-lederhosen": {
    gallery: [
      driveImage("1tLF2AgqD2MaZAOE6aZ0K72Fdjjri9SBv"), // front embroidery craftsmanship
      driveImage("1ylvMIDk8Mo6x5DRnvi0lW-3xgYjYJY0C"), // full back construction
      driveImage("18weJJOySX-IFH5gkL_gxCj6oDcRPqzTg"), // side embroidery and lacing
      driveImage("1340bnnN2S4KpLbL7uPdxOfb5oS4Fb72o"), // pocket and leather detail
      driveImage("1Bq5c6yubWJht3DaHJYwpqs9SEdtSftHe"), // suspender embroidery and buckle
    ],
  },
};
