import { defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import listCategories from "./tools/list-categories";
import listFaqs from "./tools/list-faqs";
import listBlogPosts from "./tools/list-blog-posts";
import submitInquiry from "./tools/submit-inquiry";

export default defineMcp({
  name: "irha-apparels-mcp",
  title: "Irha Apparels",
  version: "0.1.0",
  instructions:
    "Tools for Irha Apparels — a B2B garment manufacturer in Sialkot, Pakistan (lederhosen, dirndls, business suits, uniforms, sportswear). " +
    "Use `list_categories` and `list_products` to explore the catalogue, `list_faqs` for buyer FAQs (MOQ, lead times, shipping), " +
    "`list_blog_posts` for editorial content, and `submit_inquiry` to send a wholesale enquiry to the sales team.",
  tools: [listProducts, listCategories, listFaqs, listBlogPosts, submitInquiry],
});
