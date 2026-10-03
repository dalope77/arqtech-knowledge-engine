import sys
from mcp.server.fastmcp import FastMCP
from arba_client import ArbaClient

# Configuración inicial del servidor MCP
mcp = FastMCP("GeoARBA", description="MCP determinístico para consumir datos catastrales y espaciales oficiales de ARBA mediante WFS")
client = ArbaClient()

@mcp.tool()
def get_layers(refresh: bool = False) -> dict:
    """Obtiene las capas disponibles en GeoARBA mediante GetCapabilities."""
    try:
        layers = client.get_capabilities()
        return {
            "ok": True,
            "count": len(layers),
            "layers": layers
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@mcp.tool()
def get_parcel_layer_schema() -> dict:
    """Detecta automáticamente la capa de parcelas y devuelve los campos (schema)."""
    try:
        # 1. Obtener capas
        layers = client.get_capabilities()
        
        # 2. Buscar capa de parcelas
        target_layer = None
        for l in layers:
            name_lower = l["name"].lower()
            if "parcela" in name_lower or "catastro" in name_lower:
                target_layer = l["name"]
                break
                
        if not target_layer:
            # Fallback a nombre conocido si no se detecta (idera:parcelas)
            target_layer = "idera:parcelas"
            
        # 3. Obtener esquema
        return client.describe_feature_type(target_layer)
    except Exception as e:
        return {"ok": False, "error": str(e)}

@mcp.tool()
def get_parcel(nomenclatura: str = None, partida: str = None, include_geometry: bool = False) -> dict:
    """Consultar una parcela concreta por nomenclatura o partida."""
    if not nomenclatura and not partida:
        return {"error": "Debe requerir nomenclatura o partida."}
        
    try:
        # Podríamos buscar el nombre de la capa en vivo, pero para eficiencia asumimos idera:parcelas 
        # o buscamos en cache. Para este ejemplo, lo hardcodeamos temporalmente pero se puede dinámicamente:
        layer = "idera:parcelas" 
        return client.get_parcel(layer, nomenclatura=nomenclatura, partida=partida, include_geometry=include_geometry)
    except Exception as e:
        return {"ok": False, "error": str(e)}

@mcp.tool()
def search_parcels(partido: str = None, nomenclatura_contains: str = None, partida: str = None, min_area_m2: float = None, max_area_m2: float = None, limit: int = 20, include_geometry: bool = False) -> dict:
    """Buscar parcelas mediante filtros."""
    try:
        layer = "idera:parcelas"
        results = client.search_parcels(
            layer, 
            partido=partido, 
            nom_contains=nomenclatura_contains, 
            partida=partida, 
            limit=limit, 
            include_geometry=include_geometry
        )
        
        # Post-filtrado por área si es necesario (ya que WFS a veces no filtra bien áreas en CQL nativo sin función especializada)
        final_results = []
        for r in results.get("results", []):
            area = r.get("area_m2")
            if area is not None:
                try:
                    area_float = float(area)
                    if min_area_m2 and area_float < min_area_m2:
                        continue
                    if max_area_m2 and area_float > max_area_m2:
                        continue
                except:
                    pass
            final_results.append(r)
            
        return {
            "count": len(final_results),
            "results": final_results
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@mcp.tool()
def spatial_query(bbox: str, limit: int = 20, include_geometry: bool = False) -> dict:
    """Consulta espacial mediante bounding box (min_lon,min_lat,max_lon,max_lat)."""
    try:
        parts = bbox.split(",")
        if len(parts) != 4:
            return {"error": "El bbox debe tener el formato min_lon,min_lat,max_lon,max_lat"}
            
        min_lon, min_lat, max_lon, max_lat = map(float, parts)
        if min_lon >= max_lon or min_lat >= max_lat:
            return {"error": "Coordenadas inválidas. min_lon < max_lon y min_lat < max_lat requeridos."}
            
        layer = "idera:parcelas"
        return client.spatial_query(layer, bbox, limit=limit, include_geometry=include_geometry)
    except Exception as e:
        return {"ok": False, "error": str(e)}

@mcp.tool()
def get_parcel_geometry(nomenclatura: str = None, partida: str = None, tolerance_m: float = 1.0) -> dict:
    """Obtener exclusivamente la geometría de una parcela."""
    if not nomenclatura and not partida:
        return {"error": "Debe requerir nomenclatura o partida."}
        
    try:
        layer = "idera:parcelas"
        res = client.get_parcel(layer, nomenclatura=nomenclatura, partida=partida, include_geometry=True)
        if not res.get("results"):
            return {"error": "Parcela no encontrada"}
            
        # Retornamos SOLO la geometría para ahorrar tokens
        return {
            "geometry": res["results"][0].get("geometry")
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    mcp.run(transport="stdio")
