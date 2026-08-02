import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const legacyScript = await readFile("scripts/prepare-source.mjs", "utf8");

function extractBase64(name) {
  const match = legacyScript.match(new RegExp(`const ${name} = "([A-Za-z0-9+/=]+)";`));
  if (!match) throw new Error(`Missing validated repair block: ${name}`);
  return Buffer.from(match[1], "base64").toString("utf8");
}

const cleanSaleView = extractBase64("saleViewBase64");
const cleanPurchasesView = extractBase64("purchasesViewBase64");

const generated = [
  { prefix: "VevntasApp.tsx.part", target: "components/VevntasApp.tsx", binary: false },
  { prefix: "globals.css.part", target: "app/globals.css", binary: false },
  { prefix: "template.xlsx.part", target: "public/Modelo_Importacao_Produtos_Vevntas.xlsx", binary: true },
];

const files = await readdir("source-parts");
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
      const markers = [
        "function PriceView",
        "function SaleView",
        "function PurchasesView",
        "function ProductsView",
        "function InventoryView",
        "function ImportView",
        "function SettingsView",
        "export function VevntasApp",
      ];
      const positions = Object.fromEntries(markers.map((marker) => [marker, text.indexOf(marker)]));
      console.log("Frontend marker positions:", JSON.stringify(positions));

      const saleStart = positions["function SaleView"];
      const productsStart = positions["function ProductsView"];
      if (saleStart < 0 || productsStart <= saleStart) {
        throw new Error(`Could not locate stable frontend boundaries: ${JSON.stringify(positions)}`);
      }
      text = text.slice(0, saleStart) + cleanSaleView + cleanPurchasesView + text.slice(productsStart);
    }

    if (text.includes("\uFFFD") || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text)) {
      throw new Error(`Generated text contains invalid UTF-8/control characters: ${item.target}`);
    }
    output = Buffer.from(text, "utf8");
  }

  await mkdir(dirname(item.target), { recursive: true });
  await writeFile(item.target, output);
}

console.log("Rebuilt validated Vevntas sources with repaired sale and purchase views.");
