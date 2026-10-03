import os
import xml.etree.ElementTree as ET
import requests
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv()

ARBA_WFS_URL = os.environ.get("ARBA_WFS_URL", "https://geo.arba.gov.ar/geoserver/idera/wfs")
ARBA_TIMEOUT = int(os.environ.get("ARBA_TIMEOUT", "30"))

class ArbaClient:
    def __init__(self):
        self.url = ARBA_WFS_URL
        
    def _fetch(self, params):
        url = f"{self.url}?{urlencode(params)}"
        try:
            response = requests.get(url, timeout=ARBA_TIMEOUT)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            raise Exception(f"Error connecting to ARBA WFS: {str(e)}")

    def get_capabilities(self):
        params = {
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetCapabilities"
        }
        res = self._fetch(params)
        
        # Parse XML
        root = ET.fromstring(res.content)
        layers = []
        for feature in root.findall(".//{http://www.opengis.net/wfs}FeatureType"):
            name = feature.find("{http://www.opengis.net/wfs}Name")
            title = feature.find("{http://www.opengis.net/wfs}Title")
            if name is not None:
                layers.append({
                    "name": name.text,
                    "title": title.text if title is not None else ""
                })
        return layers

    def describe_feature_type(self, type_name):
        params = {
            "service": "WFS",
            "version": "1.0.0",
            "request": "DescribeFeatureType",
            "typeName": type_name
        }
        res = self._fetch(params)
        
        root = ET.fromstring(res.content)
        fields = []
        
        # Parse XSD elements
        # Note: XML namespaces depend on the server, typically xsd:element
        for element in root.findall(".//{http://www.w3.org/2001/XMLSchema}element"):
            name = element.attrib.get("name")
            type_attr = element.attrib.get("type")
            if name:
                fields.append({"name": name, "type": type_attr})
                
        # Semantic mapping attempt
        semantic = {}
        for f in fields:
            fname = f["name"].lower()
            if fname in ["cca", "nomenclatura"]:
                semantic["nomenclatura"] = f["name"]
            elif fname in ["pda", "partida"]:
                semantic["partida"] = f["name"]
            elif fname in ["ara", "area", "superficie"]:
                semantic["area"] = f["name"]

        return {
            "layer": type_name,
            "fields": fields,
            "semantic_mapping": semantic
        }

    def get_parcel(self, layer, nomenclatura=None, partida=None, include_geometry=False):
        cql_parts = []
        if nomenclatura:
            cql_parts.append(f"cca='{nomenclatura}'")
        if partida:
            cql_parts.append(f"pda='{partida}'")
            
        params = {
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetFeature",
            "typeName": layer,
            "outputFormat": "application/json",
            "CQL_FILTER": " OR ".join(cql_parts)
        }
        
        res = self._fetch(params)
        return self._format_feature_collection(res.json(), include_geometry)
        
    def search_parcels(self, layer, partido=None, nom_contains=None, partida=None, limit=20, include_geometry=False):
        cql_parts = []
        if partido:
            cql_parts.append(f"pda LIKE '{partido}%'")
        if nom_contains:
            cql_parts.append(f"cca LIKE '%{nom_contains}%'")
        if partida:
            cql_parts.append(f"pda='{partida}'")
            
        cql = " AND ".join(cql_parts) if cql_parts else "INCLUDE"
        
        params = {
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetFeature",
            "typeName": layer,
            "outputFormat": "application/json",
            "CQL_FILTER": cql,
            "maxFeatures": min(limit, 100)
        }
        
        res = self._fetch(params)
        return self._format_feature_collection(res.json(), include_geometry)
        
    def spatial_query(self, layer, bbox, limit=20, include_geometry=False):
        params = {
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetFeature",
            "typeName": layer,
            "outputFormat": "application/json",
            "BBOX": bbox, # min_lon,min_lat,max_lon,max_lat
            "maxFeatures": min(limit, 100)
        }
        
        res = self._fetch(params)
        return self._format_feature_collection(res.json(), include_geometry)

    def _format_feature_collection(self, data, include_geometry):
        features = data.get("features", [])
        results = []
        for f in features:
            props = f.get("properties", {})
            result = {
                "nomenclatura": props.get("cca"),
                "partida": props.get("pda"),
                "area_m2": props.get("ara")
            }
            if include_geometry:
                result["geometry"] = f.get("geometry")
            results.append(result)
            
        return {
            "count": len(results),
            "results": results
        }
