import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const EXPECTED_APP_SHA256 = "4895077f9f88924b3ede90251f06c9aeb5e29c6922e61b648d7724754b2d729f";
const legacyScript = await readFile("scripts/prepare-source.mjs", "utf8");

function extractBase64(name) {
  const match = legacyScript.match(new RegExp(`const ${name} = "([A-Za-z0-9+/=]+)";`));
  if (!match) throw new Error(`Missing validated repair block: ${name}`);
  return Buffer.from(match[1], "base64").toString("utf8");
}

const cleanSaleView = extractBase64("saleViewBase64");
const cleanPurchasesView = extractBase64("purchasesViewBase64");
const files = await readdir("source-parts");
const tailParts = files.filter((file) => file.startsWith("VevntasApp.tail.part")).sort();
if (tailParts.length !== 5) {
  throw new Error(`Expected 5 validated frontend tail fragments, found ${tailParts.length}.`);
}
const cleanTail = Buffer.from(
  (await Promise.all(tailParts.map((file) => readFile(join("source-parts", file), "utf8")))).join(""),
  "base64",
).toString("utf8");

const generated = [
  { prefix: "VevntasApp.tsx.part", target: "components/VevntasApp.tsx", binary: false },
  { prefix: "globals.css.part", target: "app/globals.css", binary: false },
  { prefix: "template.xlsx.part", target: "public/Modelo_Importacao_Produtos_Vevntas.xlsx", binary: true },
];

for (const item of generated) {
  const parts = files.filter((file) => file.startsWith(item.prefix)).sort();
  if (!parts.length) throw new Error(`Missing generated source parts for ${item.target}`);

  const encoded = (await Promise.all(
    parts.map((file) => readFile(join("source-parts", file), "utf8")),
  )).join("");
  const decoded = Buffer.from(encoded, "base64");
  let output = decoded;

  if (!item.binary) {
    let text = decoded.toString("utf8");

    if (item.target === "components/VevntasApp.tsx") {
      const saleStart = text.indexOf("function SaleView");
      if (saleStart < 0) throw new Error("Could not locate the stable SaleView boundary.");
      text = text.slice(0, saleStart) + cleanSaleView + cleanPurchasesView + cleanTail;
      const digest = createHash("sha256").update(text, "utf8").digest("hex");
      if (digest !== EXPECTED_APP_SHA256) {
        throw new Error(`Frontend integrity check failed: expected ${EXPECTED_APP_SHA256}, received ${digest}.`);
      }
    }

    if (text.includes("\uFFFD") || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text)) {
      throw new Error(`Generated text contains invalid UTF-8/control characters: ${item.target}`);
    }
    output = Buffer.from(text, "utf8");
  }

  await mkdir(dirname(item.target), { recursive: true });
  await writeFile(item.target, output);
}

console.log("Rebuilt Vevntas sources with verified frontend integrity.");
