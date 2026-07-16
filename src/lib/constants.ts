export const BRAND = {
  name: "Irha Apparels",
  tagline: "Global Premium Apparel Manufacturer from Sialkot",
  phone: "+923204110066",
  phoneDisplay: "+92 320 411 0066",
  email: "info@irhaapparels.com",
  address: "Sialkot, Punjab, Pakistan",
};

export const WHATSAPP_NUMBER = "923204110066";
export const whatsappLink = (msg = "Hello Irha Apparels, I'd like to request a quote.") =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
