import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
// No Supabase credentials are used or embedded by this read-only build.
execFileSync(process.execPath, ["scripts/build-client.mjs", "--preview"], {
  stdio: "inherit",
});
const index = readFileSync("dist/preview/index.html", "utf8").replace(
  "<head>",
  '<head><meta name="robots" content="noindex,nofollow"/>',
);
writeFileSync("dist/preview/index.html", index);
copyFileSync("dist/preview/index.html", "dist/preview/404.html");
writeFileSync("dist/preview/.nojekyll", "");
writeFileSync("dist/preview/robots.txt", "User-agent: *\nDisallow: /\n");
console.log(
  "Built a labelled read-only preview. Authentication, publishing, messages and orders are disabled.",
);
