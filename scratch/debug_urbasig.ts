async function test() {
  const currentSrid = '5347';
  const wkt = 'POINT(5686621.72 6133438.45)';
  const bodyParams = new URLSearchParams({
    request: 'GetFeature', service: 'WFS', version: '1.0.0', typeName: 'urbasig:_zonificacion',
    outputFormat: 'application/json',
    cql_filter: `INTERSECTS(geom, SRID=${currentSrid};${wkt})`
  });
  console.log("Request Body:", bodyParams.toString());
  
  const urbaRes = await fetch('https://urbasig.mgob.gba.gob.ar/geoserver/urbasig/wfs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams
  });
  
  console.log("Status:", urbaRes.status);
  const text = await urbaRes.text();
  console.log("Response:", text.substring(0, 300));
}
test();
