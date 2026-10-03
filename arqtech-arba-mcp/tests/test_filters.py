import pytest
from unittest.mock import patch, MagicMock
from arba_client import ArbaClient

@pytest.fixture
def client():
    return ArbaClient()

@patch('arba_client.requests.get')
def test_get_capabilities(mock_get, client):
    mock_resp = MagicMock()
    mock_resp.content = b'''<?xml version="1.0" encoding="UTF-8"?>
    <WFS_Capabilities xmlns="http://www.opengis.net/wfs">
        <FeatureTypeList>
            <FeatureType>
                <Name>idera:parcelas</Name>
                <Title>Parcelario de ARBA</Title>
            </FeatureType>
        </FeatureTypeList>
    </WFS_Capabilities>'''
    mock_resp.raise_for_status.return_value = None
    mock_get.return_value = mock_resp
    
    layers = client.get_capabilities()
    assert len(layers) == 1
    assert layers[0]['name'] == 'idera:parcelas'

@patch('arba_client.requests.get')
def test_search_parcels_limit(mock_get, client):
    mock_resp = MagicMock()
    # Simulamos JSON respuesta WFS GeoJSON
    mock_resp.json.return_value = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"cca": "015-1-A-1", "pda": "015-12345", "ara": "200000"},
                "geometry": {"type": "Polygon", "coordinates": []}
            }
        ]
    }
    mock_resp.raise_for_status.return_value = None
    mock_get.return_value = mock_resp
    
    res = client.search_parcels("idera:parcelas", limit=1, include_geometry=False)
    
    # Comprobar que no hay geometria porque no se pidió
    assert "geometry" not in res["results"][0]
    assert res["results"][0]["nomenclatura"] == "015-1-A-1"
    assert res["count"] == 1
