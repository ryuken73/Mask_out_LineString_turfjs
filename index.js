const turf = require('@turf/turf');
const parallel = require('./samples/parallel.json');
const intersects = require('./samples/intersects.json');
const opposites = require('./samples/intersectOpposite.json');
const intersectStart = require('./samples/intersectStart.json');
const intersectEnd = require('./samples/intersectEnd.json');
const { featureCollection } = require('@turf/turf');


const geojsonToTurfObj = featureCollection => {
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

const lineLengthMeter = (lineString) => {
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


const maskLineByLine = (fromLine, maskLine) => {
  if(!isFeatureIntersects(fromLine, maskLine)){
    return [featureCollection([fromLine]), fromLine];
  }
  const [startPointShort, endPointShort] = lineShortStartNEndPoint(fromLine, maskLine);
  const [startPointLong, endPointLong] = lineToStartNEndPoint(fromLine);
  const firstSlice = turf.lineSlice(startPointLong, startPointShort, fromLine);
  const secondSlice = turf.lineSlice(endPointShort, endPointLong, fromLine);
  return [featureCollection([firstSlice, secondSlice]), firstSlice, secondSlice]
}

const main = () => {
  // const features = geojsonToTurfObj(parallel);
  // const features = geojsonToTurfObj(intersects);
  // const features = geojsonToTurfObj(intersectEnd);
  const features = geojsonToTurfObj(intersectStart);
  const [fromLine, maskLine] = features;
  features.forEach(lineString => {
    console.log(lineBearing(lineString));
    console.log(lineLengthMeter(lineString));
  })
  console.log(isLinesParallel(fromLine, maskLine))
  console.log(isFeatureIntersects(fromLine, maskLine))
  const [masked, first, second] = maskLineByLine(fromLine, maskLine)
  console.log(JSON.stringify(masked));
  console.log(JSON.stringify(first));
  console.log(JSON.stringify(second));

}
main();

