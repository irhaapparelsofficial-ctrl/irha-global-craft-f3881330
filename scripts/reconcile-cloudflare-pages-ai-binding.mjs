import { readFile, writeFile } from "node:fs/promises";

const [mode, inputPath, outputPath] = process.argv.slice(2);
if (!mode || !inputPath) {
  throw new Error("Usage: reconcile-cloudflare-pages-ai-binding.mjs <prepare|verify> <project-json> [patch-json]");
}

function asObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function projectFromApi(payload) {
  const root = asObject(payload, "Cloudflare response");
  if (Object.hasOwn(root, "success") && root.success !== true) {
    throw new Error("Cloudflare project response was not successful.");
  }
  return asObject(root.result ?? root, "Cloudflare project");
}

function bindingMap(environment, label) {
  const bindings = environment?.ai_bindings ?? {};
  return asObject(bindings, `${label} AI bindings`);
}

function bindingAt(bindings, name, label) {
  if (!Object.hasOwn(bindings, name)) {
    throw new Error(`${label} is missing the ${name} Workers AI binding.`);
  }
  return asObject(bindings[name], `${label} ${name} Workers AI binding`);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sameBinding(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

const payload = JSON.parse(await readFile(inputPath, "utf8"));
const project = projectFromApi(payload);
const deploymentConfigs = asObject(project.deployment_configs, "Cloudflare deployment configs");
const preview = asObject(deploymentConfigs.preview, "Cloudflare preview deployment config");
const production = asObject(deploymentConfigs.production, "Cloudflare production deployment config");
const previewBindings = bindingMap(preview, "Preview");
const productionBindings = bindingMap(production, "Production");
const previewAI = bindingAt(previewBindings, "AI", "Preview");
const productionAI = Object.hasOwn(productionBindings, "AI")
  ? asObject(productionBindings.AI, "Production AI Workers AI binding")
  : null;

if (mode === "prepare") {
  if (!outputPath) throw new Error("A patch output path is required in prepare mode.");
  const changed = !productionAI || !sameBinding(productionAI, previewAI);
  const patch = {
    deployment_configs: {
      production: {
        ai_bindings: {
          ...productionBindings,
          AI: previewAI,
        },
      },
    },
  };
  await writeFile(outputPath, `${JSON.stringify(patch, null, 2)}\n`, "utf8");
  console.log(`changed=${changed}`);
  console.log(`preserved_production_ai_bindings=${Object.keys(productionBindings).filter((name) => name !== "AI").length}`);
  console.log("preview_ai_binding=verified");
} else if (mode === "verify") {
  if (!productionAI || !sameBinding(productionAI, previewAI)) {
    throw new Error("Production AI binding does not match the verified preview AI binding.");
  }
  console.log("production_ai_binding=verified");
} else {
  throw new Error(`Unsupported mode: ${mode}`);
}
