"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_TYPOLOGY_ITEMS = exports.MOCK_TYPOLOGIES = exports.MOCK_INSUMOS = exports.MOCK_ITEMS = exports.MOCK_RUBROS = void 0;
// RUBROS - Clasificación técnica
exports.MOCK_RUBROS = [
    { id: "R01", code: "01", name: "TRABAJOS PRELIMINARES Y DEMOLICIÓN", order_index: 1, is_active: true },
    { id: "R02", code: "02", name: "MOVIMIENTO DE SUELOS Y FUNDACIONES", order_index: 2, is_active: true },
    { id: "R03", code: "03", name: "ESTRUCTURA RESISTENTE", order_index: 3, is_active: true },
    { id: "R04", code: "04", name: "MAMPOSTERIA Y AISLACIONES", order_index: 4, is_active: true },
    { id: "R05", code: "05", name: "REVOQUES Y ENLUCIDOS", order_index: 5, is_active: true },
    { id: "R06", code: "06", name: "CONTRAPISOS Y CARPETAS", order_index: 6, is_active: true },
    { id: "R07", code: "07", name: "CIELORRASOS Y TABIQUERIA SECA", order_index: 7, is_active: true },
    { id: "R08", code: "08", name: "CUBIERTAS Y TECHOS", order_index: 8, is_active: true },
    { id: "R09", code: "09", name: "INSTALACIONES (Sanitaria, Gas, Eléctrica, Clima)", order_index: 9, is_active: true },
    { id: "R10", code: "10", name: "PISOS, REVESTIMIENTOS Y PINTURA", order_index: 10, is_active: true },
    { id: "R11", code: "11", name: "CARPINTERIAS Y VIDRIOS", order_index: 11, is_active: true },
    { id: "R12", code: "12", name: "MOBILIARIO Y MESADAS", order_index: 12, is_active: true },
    { id: "R13", code: "13", name: "VARIOS, EXTERIORES Y AMENITIES", order_index: 13, is_active: true }
];
exports.MOCK_ITEMS = [
    // 01 PRELIMINARES
    { id: "I0101", rubro_id: "R01", code: "01.01", description: "Obrador, Cerco y Cartel de Obra", unit: "gl", order_index: 1, is_active: true, development_types: ["residential", "building", "commercial", "industrial", "neighborhood"] },
    { id: "I0102", rubro_id: "R01", code: "01.02", description: "Replanteo y Marcación", unit: "m2", order_index: 2, is_active: true, development_types: ["residential", "building", "commercial", "industrial", "neighborhood"] },
    { id: "I0103", rubro_id: "R01", code: "01.03", description: "Demolición y Retiro de Escombros (Flipping)", unit: "gl", order_index: 3, is_active: true, development_types: ["flipping"] },
    { id: "I0104", rubro_id: "R01", code: "01.04", description: "Limpieza y Nivelación Manual", unit: "m2", order_index: 4, is_active: true, development_types: ["residential", "building", "neighborhood"] },
    // 02 FUNDACIONES
    { id: "I0201", rubro_id: "R02", code: "02.01", description: "Excavación Mecánica y Retiro", unit: "m3", order_index: 1, is_active: true },
    { id: "I0204", rubro_id: "R02", code: "02.04", description: "Platea de Hormigón Armado", unit: "m2", order_index: 2, is_active: true },
    { id: "I0205", rubro_id: "R02", code: "02.05", description: "Zapatas y Pilotines", unit: "m3", order_index: 3, is_active: true },
    { id: "I0206", rubro_id: "R02", code: "02.06", description: "Bases H°A° para Nave Industrial", unit: "m3", order_index: 4, is_active: true },
    // 03 ESTRUCTURA
    { id: "I0301", rubro_id: "R03", code: "03.01", description: "Columnas y Vigas H°A°", unit: "m3", order_index: 1, is_active: true },
    { id: "I0303", rubro_id: "R03", code: "03.03", description: "Losa Viguetas", unit: "m2", order_index: 2, is_active: true },
    { id: "I0304", rubro_id: "R03", code: "03.04", description: "Losa Maciza H°A°", unit: "m3", order_index: 3, is_active: true },
    { id: "I0306", rubro_id: "R03", code: "03.06", description: "Estructura Metálica (Alma Llena / Reticulada)", unit: "ton", order_index: 4, is_active: true },
    // 04 MAMPOSTERIA
    { id: "I0401", rubro_id: "R04", code: "04.01", description: "Mampostería Hueco Exterior", unit: "m2", order_index: 1, is_active: true },
    { id: "I0402", rubro_id: "R04", code: "04.02", description: "Mampostería Hueco Interior", unit: "m2", order_index: 2, is_active: true },
    { id: "I0403", rubro_id: "R04", code: "04.03", description: "Mampostería Retak Premium", unit: "m2", order_index: 3, is_active: true },
    { id: "I0405", rubro_id: "R04", code: "04.05", description: "Cerramiento Chapa / Paneles (Industrial)", unit: "m2", order_index: 4, is_active: true },
    // 05 REVOQUES
    { id: "I0503", rubro_id: "R05", code: "05.03", description: "Revoque Completo Int/Ext", unit: "m2", order_index: 1, is_active: true },
    { id: "I0505", rubro_id: "R05", code: "05.05", description: "Enlucido de Yeso", unit: "m2", order_index: 2, is_active: true },
    // 06 CONTRAPISOS
    { id: "I0601", rubro_id: "R06", code: "06.01", description: "Contrapiso y Carpeta", unit: "m2", order_index: 1, is_active: true },
    { id: "I0604", rubro_id: "R06", code: "06.04", description: "Piso Industrial (H° Llaineado)", unit: "m2", order_index: 2, is_active: true },
    // 07 CIELORRASOS
    { id: "I0701", rubro_id: "R07", code: "07.01", description: "Cielorraso Yeso / Durlock", unit: "m2", order_index: 1, is_active: true },
    { id: "I0703", rubro_id: "R07", code: "07.03", description: "Tabiques Durlock", unit: "m2", order_index: 2, is_active: true },
    // 08 CUBIERTAS
    { id: "I0801", rubro_id: "R08", code: "08.01", description: "Techo de Chapa", unit: "m2", order_index: 1, is_active: true },
    { id: "I0803", rubro_id: "R08", code: "08.03", description: "Impermeabilización Losa", unit: "m2", order_index: 2, is_active: true },
    // 09 INSTALACIONES
    { id: "I0901", rubro_id: "R09", code: "09.01", description: "Instalación Sanitaria Completa", unit: "gl", order_index: 1, is_active: true },
    { id: "I0905", rubro_id: "R09", code: "09.05", description: "Instalación Eléctrica Completa", unit: "gl", order_index: 2, is_active: true },
    { id: "I0907", rubro_id: "R09", code: "09.07", description: "Renovación de Cañerías (Flipping)", unit: "gl", order_index: 3, is_active: true },
    { id: "I0909", rubro_id: "R09", code: "09.09", description: "Climatización Central / Losa", unit: "gl", order_index: 4, is_active: true },
    // 10 PISOS Y PINTURA
    { id: "I1001", rubro_id: "R10", code: "10.01", description: "Pisos (Cerámico / Flotante Std)", unit: "m2", order_index: 1, is_active: true },
    { id: "I1002", rubro_id: "R10", code: "10.02", description: "Pisos Premium (Porcelanato)", unit: "m2", order_index: 2, is_active: true },
    { id: "I1004", rubro_id: "R10", code: "10.04", description: "Pintura Integral", unit: "m2", order_index: 3, is_active: true },
    // 11 CARPINTERIAS
    { id: "I1101", rubro_id: "R11", code: "11.01", description: "Aberturas Estándar (Aluminio/Chapa)", unit: "m2", order_index: 1, is_active: true },
    { id: "I1102", rubro_id: "R11", code: "11.02", description: "Aberturas Premium (DVH)", unit: "m2", order_index: 2, is_active: true },
    { id: "I1105", rubro_id: "R11", code: "11.05", description: "Frente Comercial (Blindex)", unit: "m2", order_index: 3, is_active: true },
    // 12 MOBILIARIO
    { id: "I1201", rubro_id: "R12", code: "12.01", description: "Mobiliario Fijo y Mesadas", unit: "gl", order_index: 1, is_active: true },
    // 13 VARIOS
    { id: "I1301", rubro_id: "R13", code: "13.01", description: "Limpieza y Ayuda de Gremios", unit: "gl", order_index: 1, is_active: true },
    { id: "I1503", rubro_id: "R13", code: "15.03", description: "Infraestructura Urbana (Calles/Redes)", unit: "gl", order_index: 2, is_active: true },
    // Pozo
    { id: "I1401", rubro_id: "R13", code: "14.01", description: "Inversión Financiera (Pozo)", unit: "gl", order_index: 3, is_active: true, development_types: ["pozo"] }
];
exports.MOCK_INSUMOS = exports.MOCK_ITEMS.flatMap(function (item, index) {
    var baseMaterialPrice = 15000 + (index * 1250);
    var baseLaborPrice = 8500 + (index * 800);
    return [
        { id: "ins_mat_".concat(item.id), item_id: item.id, type: "material", description: "Materiales ".concat(item.description), unit: item.unit, yield: 1, unit_price: baseMaterialPrice },
        { id: "ins_mo_".concat(item.id), item_id: item.id, type: "labor", description: "Mano de Obra ".concat(item.description), unit: item.unit, yield: 1, unit_price: baseLaborPrice }
    ];
});
// NUEVA MATRIZ DE TIPOLOGÍAS
exports.MOCK_TYPOLOGIES = [
    // Residencial (Vivienda/PH/Dúplex)
    { id: "typ-res-eco", name: "Vivienda Procrear / Social", slug: "vivienda-economica", description: "Terminaciones económicas, optimización estricta.", development_type_id: "residential", icon: "Home", color: "#64748b", order_index: 1, sellable_area_pct: 100, is_active: true },
    { id: "typ-res-med", name: "Vivienda Estándar / Dúplex", slug: "vivienda-media", description: "Construcción tradicional orientada a clase media.", development_type_id: "residential", icon: "Home", color: "#3b82f6", order_index: 2, sellable_area_pct: 95, is_active: true },
    { id: "typ-res-pre", name: "Vivienda Premium / Country", slug: "vivienda-premium", description: "Alta gama, detalles de lujo y domótica.", development_type_id: "residential", icon: "Gem", color: "#f59e0b", order_index: 3, sellable_area_pct: 90, is_active: true },
    // Edificios (Departamentos)
    { id: "typ-bld-eco", name: "Edificio Económico (Social)", slug: "edificio-economico", description: "Vivienda social en altura, sin amenities.", development_type_id: "building", icon: "Building2", color: "#64748b", order_index: 4, sellable_area_pct: 85, is_active: true },
    { id: "typ-bld-med", name: "Edificio Estándar", slug: "edificio-medio", description: "Departamentos para inversión, terminaciones medias.", development_type_id: "building", icon: "Building2", color: "#3b82f6", order_index: 5, sellable_area_pct: 80, is_active: true },
    { id: "typ-bld-pre", name: "Torre Premium", slug: "edificio-premium", description: "Amenities exclusivas, DVH, losa radiante.", development_type_id: "building", icon: "Building2", color: "#f59e0b", order_index: 6, sellable_area_pct: 75, is_active: true },
    // Comercial e Industrial
    { id: "typ-com-med", name: "Local / Oficina Estándar", slug: "comercial-medio", description: "Planta libre, baños, kitchenette, frente vidriado.", development_type_id: "commercial", icon: "Store", color: "#3b82f6", order_index: 7, sellable_area_pct: 95, is_active: true },
    { id: "typ-ind-med", name: "Nave Industrial / Galpón", slug: "industrial-nave", description: "Estructura metálica, piso llaineado, cerramiento chapa.", development_type_id: "industrial", icon: "Factory", color: "#64748b", order_index: 8, sellable_area_pct: 98, is_active: true },
    // Flipping
    { id: "typ-flip-eco", name: "Flipping Mínimo (Lavado de cara)", slug: "flipping-minimo", description: "Pintura, arreglos menores, refacción baño/cocina básica.", development_type_id: "flipping", icon: "PaintRoller", color: "#64748b", order_index: 9, sellable_area_pct: 100, is_active: true },
    { id: "typ-flip-med", name: "Flipping Medio (Integral)", slug: "flipping-medio", description: "Pisos nuevos, pintura, instalaciones a nuevo.", development_type_id: "flipping", icon: "Hammer", color: "#3b82f6", order_index: 10, sellable_area_pct: 100, is_active: true },
    { id: "typ-flip-pre", name: "Flipping Alto (Ampliación)", slug: "flipping-alto", description: "Reorganización de ambientes, demoliciones, premium.", development_type_id: "flipping", icon: "Wrench", color: "#f59e0b", order_index: 11, sellable_area_pct: 100, is_active: true },
    // Loteos
    { id: "typ-lot-eco", name: "Loteo / Barrio Abierto", slug: "loteo-economico", description: "Infraestructura mínima, calles tosca.", development_type_id: "neighborhood", icon: "Map", color: "#64748b", order_index: 12, sellable_area_pct: 80, is_active: true },
    { id: "typ-lot-pre", name: "Barrio Cerrado Premium", slug: "loteo-premium", description: "Calles asfalto, redes subterráneas, SUM, seguridad.", development_type_id: "neighborhood", icon: "TreePine", color: "#22c55e", order_index: 13, sellable_area_pct: 65, is_active: true },
    // Pozo
    { id: "typ-pozo-med", name: "Inversión en Pozo", slug: "inversion-pozo", description: "Compra de unidades financiadas en pozo.", development_type_id: "pozo", icon: "Building", color: "#3b82f6", order_index: 14, sellable_area_pct: 100, is_active: true }
];
// Generador Dinámico de Items (Recetas) basado en una matriz de incidencias base
var TYPOLOGY_RECIPES = {
    // Residencial
    "typ-res-eco": { "I0101": 0.015, "I0204": 1.0, "I0401": 1.5, "I0503": 2.5, "I0601": 1.0, "I0801": 1.1, "I0901": 0.02, "I0905": 0.02, "I1001": 1.0, "I1004": 3.0, "I1101": 0.15, "I1201": 0.02, "I1301": 0.01 },
    "typ-res-med": { "I0101": 0.02, "I0204": 1.0, "I0301": 0.1, "I0303": 0.5, "I0401": 1.5, "I0503": 2.5, "I0601": 1.0, "I0801": 0.5, "I0803": 0.5, "I0901": 0.03, "I0905": 0.03, "I1001": 1.0, "I1004": 3.0, "I1101": 0.2, "I1201": 0.03, "I1301": 0.01 },
    "typ-res-pre": { "I0101": 0.02, "I0205": 0.1, "I0301": 0.15, "I0304": 0.3, "I0403": 1.5, "I0505": 1.5, "I0601": 1.0, "I0701": 1.0, "I0803": 1.0, "I0901": 0.04, "I0905": 0.04, "I0909": 0.02, "I1002": 1.0, "I1004": 3.0, "I1102": 0.25, "I1201": 0.05, "I1301": 0.01 },
    // Edificios
    "typ-bld-eco": { "I0101": 0.01, "I0205": 0.2, "I0301": 0.2, "I0304": 0.25, "I0401": 1.0, "I0503": 2.0, "I0601": 1.0, "I0703": 1.0, "I0803": 0.2, "I0901": 0.03, "I0905": 0.03, "I1001": 1.0, "I1004": 2.5, "I1101": 0.15, "I1301": 0.01 },
    "typ-bld-med": { "I0101": 0.01, "I0205": 0.2, "I0301": 0.2, "I0304": 0.3, "I0401": 1.0, "I0505": 2.0, "I0601": 1.0, "I0701": 1.0, "I0803": 0.2, "I0901": 0.03, "I0905": 0.03, "I1001": 1.0, "I1004": 2.5, "I1101": 0.2, "I1201": 0.02, "I1301": 0.01 },
    "typ-bld-pre": { "I0101": 0.01, "I0205": 0.25, "I0301": 0.25, "I0304": 0.35, "I0403": 1.0, "I0505": 2.0, "I0601": 1.0, "I0701": 1.0, "I0803": 0.2, "I0901": 0.04, "I0905": 0.04, "I0909": 0.02, "I1002": 1.0, "I1004": 2.5, "I1102": 0.25, "I1201": 0.04, "I1301": 0.01 },
    // Comercial/Industrial
    "typ-com-med": { "I0101": 0.02, "I0204": 1.0, "I0301": 0.1, "I0304": 1.0, "I0401": 1.0, "I0503": 1.0, "I0601": 1.0, "I0703": 1.0, "I0901": 0.02, "I0905": 0.04, "I1002": 1.0, "I1004": 2.0, "I1105": 0.3, "I1301": 0.01 },
    "typ-ind-med": { "I0101": 0.01, "I0206": 0.1, "I0306": 0.05, "I0405": 1.2, "I0604": 1.0, "I0801": 1.0, "I0901": 0.01, "I0905": 0.03, "I1101": 0.05, "I1301": 0.01 },
    // Flipping
    "typ-flip-eco": { "I0103": 0.01, "I0503": 0.5, "I0901": 0.01, "I1004": 3.0, "I1201": 0.02, "I1301": 0.02 },
    "typ-flip-med": { "I0103": 0.03, "I0503": 1.0, "I0601": 1.0, "I0907": 0.04, "I0905": 0.03, "I1001": 1.0, "I1004": 3.0, "I1201": 0.04, "I1301": 0.03 },
    "typ-flip-pre": { "I0103": 0.05, "I0402": 0.5, "I0505": 2.0, "I0601": 1.0, "I0703": 1.0, "I0907": 0.05, "I0905": 0.05, "I1002": 1.0, "I1004": 3.0, "I1102": 0.2, "I1201": 0.06, "I1301": 0.05 },
    // Loteos
    "typ-lot-eco": { "I0102": 0.05, "I0104": 1.0, "I1503": 0.1 },
    "typ-lot-pre": { "I0101": 0.01, "I0104": 1.0, "I1503": 0.5, "I1301": 0.05 },
    // Pozo
    "typ-pozo-med": { "I1401": 1.0 }
};
exports.MOCK_TYPOLOGY_ITEMS = [];
var tiCounter = 1;
exports.MOCK_TYPOLOGIES.forEach(function (typ) {
    var recipe = TYPOLOGY_RECIPES[typ.id];
    if (recipe) {
        Object.entries(recipe).forEach(function (_a) {
            var itemId = _a[0], qty = _a[1];
            exports.MOCK_TYPOLOGY_ITEMS.push({
                id: "ti_".concat(tiCounter++),
                typology_id: typ.id,
                item_id: itemId,
                quantity_per_m2: qty
            });
        });
    }
});
