import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const generated = [
  { prefix: "VevntasApp.tsx.part", target: "components/VevntasApp.tsx", binary: false },
  { prefix: "globals.css.part", target: "app/globals.css", binary: false },
  { prefix: "template.xlsx.part", target: "public/Modelo_Importacao_Produtos_Vevntas.xlsx", binary: true },
];

const files = await readdir("source-parts");
for (const item of generated) {
  const parts = files.filter((file) => file.startsWith(item.prefix)).sort();
  if (!parts.length) throw new Error(`Missing generated source parts for ${item.target}`);
  const encoded = (await Promise.all(parts.map((file) => readFile(join("source-parts", file), "utf8")))).join("");
  const decoded = Buffer.from(encoded, "base64");
  await mkdir(dirname(item.target), { recursive: true });
  await writeFile(item.target, item.binary ? decoded : decoded.toString("utf8"));
}
console.log("Prepared generated Vevntas sources and import template.");
