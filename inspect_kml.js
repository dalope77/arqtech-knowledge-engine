const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

const kmlData = fs.readFileSync('docs/barrios.kml', 'utf8');
const result = parser.parse(kmlData);

const document = result.kml.Document;
const placemarks = document.Placemark || document.Folder?.Placemark || [];

let actualPlacemarks = Array.isArray(placemarks) ? placemarks : [placemarks];

// If it's deeper:
if (actualPlacemarks.length === 0 && document.Folder) {
    if (Array.isArray(document.Folder)) {
        document.Folder.forEach(f => {
            if (f.Placemark) {
                actualPlacemarks = actualPlacemarks.concat(Array.isArray(f.Placemark) ? f.Placemark : [f.Placemark]);
            }
        });
    }
}

console.log(`Found ${actualPlacemarks.length} placemarks.`);
if (actualPlacemarks.length > 0) {
    console.log("Sample Placemark:", JSON.stringify(actualPlacemarks[0], null, 2).substring(0, 500));
}
