// Runs before `vite dev` and `vite build`; writes the static sitemap seed.
// Product and taxonomy URLs are appended later from the owner Supabase public
// catalogue RPC. Legacy committed catalogue arrays must never define indexable
// product URLs.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://irhaapparels.com";
const FACTORY_VIDEO_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-2026.mp4";
const FACTORY_VIDEO_POSTER_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-poster.webp";

type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

type VideoSitemapEntry = {
  thumbnail: string;
  title: string;
  description: string;
  contentUrl: string;
  duration?: number;
};

type SitemapEntry = {
  path: string;
  changefreq?: ChangeFrequency;
  priority?: string;
  lastmod?: string;
  video?: VideoSitemapEntry;
};

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/products", changefreq: "weekly", priority: "0.95" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/manufacturing", changefreq: "monthly", priority: "0.8" },
  {
    path: "/factory-capability-video",
    changefreq: "monthly",
    priority: "0.84",
    lastmod: "2026-08-11",
    video: {
      thumbnail: FACTORY_VIDEO_POSTER_URL,
      title: "Inside Irha Apparels — real factory capability overview",
      description: "A real prerecorded capability overview showing Irha Apparels manufacturing activity in Sialkot, including pattern preparation, fabric marking, cutting-table support, industrial lockstitch and overlock sewing, finishing support and buyer communication.",
      contentUrl: FACTORY_VIDEO_URL,
      duration: 75,
    },
  },
  { path: "/materials", changefreq: "monthly", priority: "0.88" },
  { path: "/buyer-information", changefreq: "monthly", priority: "0.86" },
  { path: "/buyer-trust", changefreq: "monthly", priority: "0.85" },
  { path: "/factory-video-call", changefreq: "monthly", priority: "0.82" },
  { path: "/resources", changefreq: "monthly", priority: "0.78" },
  { path: "/faq", changefreq: "monthly", priority: "0.78" },
  { path: "/compliance", changefreq: "monthly", priority: "0.75" },
  { path: "/inquiry", changefreq: "monthly", priority: "0.85" },
  { path: "/repeat-order", changefreq: "monthly", priority: "0.72" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/connect", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
];

function safePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function absoluteUrl(path: string) {
  return path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function videoXml(video: VideoSitemapEntry) {
  return [
    "    <video:video>",
    `      <video:thumbnail_loc>${xmlEscape(video.thumbnail)}</video:thumbnail_loc>`,
    `      <video:title>${xmlEscape(video.title)}</video:title>`,
    `      <video:description>${xmlEscape(video.description)}</video:description>`,
    `      <video:content_loc>${xmlEscape(video.contentUrl)}</video:content_loc>`,
    video.duration ? `      <video:duration>${video.duration}</video:duration>` : null,
    "    </video:video>",
  ].filter(Boolean) as string[];
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const unique = new Map<string, SitemapEntry>();

  for (const entry of staticEntries) {
    if (!safePath(entry.path)) continue;
    unique.set(entry.path, entry);
  }

  const ordered = [...unique.values()].sort((left, right) => {
    if (left.path === "/") return -1;
    if (right.path === "/") return 1;
    return left.path.localeCompare(right.path);
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ...ordered.map((entry) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(absoluteUrl(entry.path))}</loc>`,
        `    <lastmod>${entry.lastmod ?? today}</lastmod>`,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        entry.priority ? `    <priority>${entry.priority}</priority>` : null,
        ...(entry.video ? videoXml(entry.video) : []),
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "</urlset>",
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), `${xml}\n`);
  console.log(
    `sitemap.xml static seed written (${ordered.length} URLs); canonical catalogue and taxonomy routes are appended from owner Supabase`,
  );
}

main();