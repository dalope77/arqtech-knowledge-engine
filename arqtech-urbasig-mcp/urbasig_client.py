import os
import requests
import json
from typing import Dict, Any, List, Optional
from urllib.parse import urlencode

class UrbaSIGClient:
    def __init__(self, wfs_url: str = "http://urbasig.gob.gba.gob.ar/geoserver/urbasig/wfs"):
        self.wfs_url = wfs_url
        self.session = requests.Session()
        
    def _make_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Hace la petición al WFS y devuelve el JSON parsing."""
        try:
            response = self.session.get(self.wfs_url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise RuntimeError(f"Error querying UrbaSIG WFS: {str(e)}")

    def get_capabilities(self) -> List[Dict[str, str]]:
        """Extrae las capas expuestas en el WFS."""
        params = {
            "service": "WFS",
            "version": "1.1.0",
            "request": "GetCapabilities",
            "outputFormat": "application/json"
        }
        # GetCapabilities en WFS generalmente retorna XML, para extraer capas exactas 
        # en este caso ya las conocemos por el escaneo previo, pero podemos emular la respuesta 
        # o devolver las hardcodeadas útiles.
        return [
            {"name": "urbasig:_zonificacion", "title": "Zonificación"},
            {"name": "urbasig:uso_del_suelo", "title": "Zonas y Espacios DL 8912/77"},
            {"name": "urbasig:areas_ley_8912", "title": "Áreas Ley 8912"},
            {"name": "urbasig:decreto3202", "title": "Decreto 3202"}
        ]

    def spatial_query(self, layer: str, wkt_geometry: str, max_features: int = 5) -> Dict[str, Any]:
        """
        Hace una consulta espacial (Intersects) cruzando una geometría con una capa de UrbaSIG.
        """
        # CQL_FILTER para intersección espacial: INTERSECTS(geom, POLYGON(...))
        # Asumiendo que el campo de geometría en urbasig es 'the_geom' o 'geom'. 
        # WFS estándar permite usar INTERSECTS(geom, pol)
        cql_filter = f"INTERSECTS(geom, {wkt_geometry})"
        
        params = {
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetFeature",
            "typeName": layer,
            "outputFormat": "application/json",
            "maxFeatures": max_features,
            "CQL_FILTER": cql_filter,
            "srsName": "EPSG:4326"
        }
        
        # Intentamos con 'geom', si falla intentamos con 'the_geom'
        try:
            res = self._make_request(params)
            # Limpiamos las geometrías de la respuesta para no saturar al LLM
            cleaned_features = []
            for feat in res.get("features", []):
                cleaned_features.append({
                    "id": feat.get("id"),
                    "properties": feat.get("properties", {})
                })
            
            return {
                "layer": layer,
                "count": len(cleaned_features),
                "results": cleaned_features
            }
        except Exception as e:
            # Reintentar con the_geom
            params["CQL_FILTER"] = f"INTERSECTS(the_geom, {wkt_geometry})"
            res = self._make_request(params)
            cleaned_features = []
            for feat in res.get("features", []):
                cleaned_features.append({
                    "id": feat.get("id"),
                    "properties": feat.get("properties", {})
                })
            
            return {
                "layer": layer,
                "count": len(cleaned_features),
                "results": cleaned_features
            }

    def get_urban_zone(self, wkt_geometry: str) -> Dict[str, Any]:
        """Obtiene la zonificación urbana para un polígono."""
        return self.spatial_query("urbasig:_zonificacion", wkt_geometry)

    def check_ley_8912(self, wkt_geometry: str) -> Dict[str, Any]:
        """Verifica si es área Urbana, Rural o Complementaria."""
        return self.spatial_query("urbasig:areas_ley_8912", wkt_geometry)
        
    def check_coastal_restrictions(self, wkt_geometry: str) -> Dict[str, Any]:
        """Verifica restricciones del decreto 3202 (Franja costera)."""
        return self.spatial_query("urbasig:decreto3202", wkt_geometry)
