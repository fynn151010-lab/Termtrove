import { build } from "esbuild";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { relative } from "node:path";

const preview = process.argv.includes("--preview");
const dev = process.argv.includes("--dev");
const base = preview ? "/Termtrove/" : "/";
const out = preview ? "dist/preview" : dev ? "dist/dev" : "dist/client";
await rm(out, { recursive: true, force: true });
await cp("public", out, { recursive: true });
const result = await build({
  entryPoints: ["app/main.tsx"],
  outdir: out,
  bundle: true,
  minify: !dev,
  sourcemap: dev,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  entryNames: "assets/[name]-[hash]",
  assetNames: "assets/[name]-[hash]",
  loader: { ".woff2": "file" },
  define: {
    "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
    "import.meta.env.BASE_URL": JSON.stringify(base),
    "import.meta.env.VITE_VISUAL_PREVIEW": JSON.stringify(preview ? "1" : ""),
  },
  metafile: true,
});
const [entry, metadata] = Object.entries(result.metafile.outputs).find(
  ([, output]) => output.entryPoint === "app/main.tsx",
);
const asset = (path) => base + relative(out, path).split("\\").join("/");
const html = (await readFile("index.html", "utf8"))
  .replaceAll("%BASE_URL%", base)
  .replace("/app/main.tsx", asset(entry))
  .replace(
    "</head>",
    '<link rel="stylesheet" href="' + asset(metadata.cssBundle) + '"/></head>',
  );
await writeFile(out + "/index.html", html);
