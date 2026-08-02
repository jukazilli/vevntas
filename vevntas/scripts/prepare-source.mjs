import fs from "node:fs";

const componentPath = "components/VevntasApp.tsx";
const source = fs.readFileSync(componentPath, "utf8");
const patched = source.replace(
  'from "read-excel-file/browser"',
  'from "read-excel-file"',
);

if (patched === source && !source.includes('from "read-excel-file"')) {
  throw new Error("No fue posible localizar el importador XLSX para preparar el build.");
}

fs.writeFileSync(componentPath, patched);
console.log("Prepared Vevntas source for the current Next.js bundler.");
