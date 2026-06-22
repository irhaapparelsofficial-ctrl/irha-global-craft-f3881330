import flatlay from "@/assets/banners/products-flatlay.jpg?w=1600&format=webp&quality=74";
import leatherFlatlay from "@/assets/banners/leather-flatlay.jpg?w=1600&format=webp&quality=74";
import leatherStack from "@/assets/banners/leather-stack.jpg?w=1600&format=webp&quality=74";
import leatherStitch from "@/assets/banners/leather-stitch.jpg?w=1600&format=webp&quality=74";

const IMAGES = [
  { src: flatlay, alt: "Premium apparel flat-lay" },
  { src: leatherFlatlay, alt: "Leather goods flat-lay" },
  { src: leatherStack, alt: "Folded leather stack" },
  { src: leatherStitch, alt: "Hand-stitched leather detail" },
];

export default function AtmosphericGrid() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container-luxe">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {IMAGES.map((img) => (
            <div key={img.src} className="relative aspect-square overflow-hidden bg-black">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center hover:scale-105 transition-transform duration-[1200ms]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
