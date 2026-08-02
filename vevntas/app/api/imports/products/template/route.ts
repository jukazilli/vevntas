export async function GET() {
  const rows = [
    ["codigo", "codigo_barras", "nombre", "categoria", "unidad", "precio_venta_usd", "costo_compra_usd", "existencia", "stock_minimo"],
    ["", "7590000000012", "Arroz premium 1 kg", "Alimentos", "UNIDAD", "1.50", "1.10", "20", "5"],
    ["AB0002", "", "Frijol vendido por kilogramo", "Alimentos", "KG", "2.30", "1.80", "12.834", "2"],
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo_importacion_vevntas.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
