const turf = require('@turf/turf')
var point = {
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [110, 40]
  }
}
var geom = turf.getGeom(point)
geom.coordinates = [111,41]

var aftergeom = turf.getGeom(point)
console.log(geom.coordinates)
console.log(aftergeom.coordinates)