from mcp.server.fastmcp import FastMCP
from urbasig_client import UrbaSIGClient
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize FastMCP server
mcp = FastMCP(
    "arqtech-urbasig",
    dependencies=["requests"]
)

# Initialize Client
urbasig_url = os.getenv("URBASIG_WFS_URL", "http://urbasig.gob.gba.gob.ar/geoserver/urbasig/wfs")
client = UrbaSIGClient(wfs_url=urbasig_url)

@mcp.tool()
def get_urbasig_layers() -> list[dict]:
    """
    Obtiene la lista de capas disponibles en el WFS de UrbaSIG.
    """
    return client.get_capabilities()

@mcp.tool()
def get_urban_zone(wkt_geometry: str) -> dict:
    """
    Obtiene la zonificación urbana (ej. UR, C2, R4) para una geometría dada.
    
    Args:
        wkt_geometry: Geometría en formato WKT (ej: POLYGON((...))) proyectada en EPSG:4326.
    """
    return client.get_urban_zone(wkt_geometry)

@mcp.tool()
def check_ley_8912(wkt_geometry: str) -> dict:
    """
    Verifica si la geometría cae en área Urbana, Complementaria o Rural según el DL 8912/77.
    
    Args:
        wkt_geometry: Geometría en formato WKT proyectada en EPSG:4326.
    """
    return client.check_ley_8912(wkt_geometry)

@mcp.tool()
def check_coastal_restrictions(wkt_geometry: str) -> dict:
    """
    Verifica si la parcela está afectada por el Decreto 3202 (restricciones costeras).
    
    Args:
        wkt_geometry: Geometría en formato WKT proyectada en EPSG:4326.
    """
    return client.check_coastal_restrictions(wkt_geometry)

if __name__ == "__main__":
    mcp.run()
