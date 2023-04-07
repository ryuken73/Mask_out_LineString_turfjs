const turf = require('@turf/turf');

module.exports.parseFeatureCollection = featureCollection => {
  const features = [];
  turf.featureEach(featureCollection, (currentFeature) => {
    features.push(currentFeature)
  })
  return features;
}

const lineToStartNEndPoint = (lineString) => {
  const coords = turf.getCoords(lineString);
  const start = turf.point(coords[0]);
  const end = turf.point(coords[coords.length-1]);
  return [start, end];
}

const lineBearing = (lineString) => {
  const [startPoint, endPoint] = lineToStartNEndPoint(lineString);
  const startCoord = turf.getCoord(startPoint);
  const endCoord = turf.getCoord(endPoint);
  return turf.bearing(startCoord, endCoord)
}

const lineLength = (lineString) => {
  return turf.length(lineString, {units: 'meters'});
}

const isLinesParallel = (line1, line2) => {
  return turf.booleanParallel(line1, line2);
}

const isFeatureIntersects = (feature1, feature2) => {
  return turf.booleanIntersects(feature1, feature2);
}

const lineShortStartNEndPoint = (longLine, shortLine) => {
  const [startPoint, endPoint] = lineToStartNEndPoint(shortLine);
  const longLineSlice = turf.lineSlice(startPoint, endPoint, longLine);
  const longLineAngle = lineBearing(longLineSlice);
  const shortLineAngle = lineBearing(shortLine);
  if((longLineAngle * shortLineAngle) >= 0){
    return [startPoint, endPoint];
  } else {
    return [endPoint, startPoint];
  }
}

module.exports.maskLineByLine = (fromLine, maskLine) => {
  const [startPointShort, endPointShort] = lineShortStartNEndPoint(fromLine, maskLine);
  const [startPointLong, endPointLong] = lineToStartNEndPoint(fromLine);
  const firstSlice = turf.lineSlice(startPointLong, startPointShort, fromLine);
  const secondSlice = turf.lineSlice(endPointShort, endPointLong, fromLine);
  return featureCollection([firstSlice, secondSlice])
}