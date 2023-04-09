const fs = require('fs');
const featureCollectionArray = require('./samples/realData.json');
const splitRed = require('./splitRed');
const geojsonUtil = require('./geojsonUtil');
const {
  parseFeatureCollection,
  mergeOneFeatureCollection,
  isFeatureIntersects,
  maskLineByLines,
  uniqLines,
  getRedOverlaps,
  lineToClockwise,
  splitRedYellowFeatures
} = geojsonUtil;

const redFile = fs.createWriteStream('./red.json');
const yellowFile = fs.createWriteStream('./yellow.json');
const splitedFile = fs.createWriteStream('./splited.json');

const main = () => {

  const [redFeatures, yellowFeatures] = splitRedYellowFeatures(featureCollectionArray);
  const fromRedFeatures = redFeatures[4];

  redFeatures.forEach(redFeature => {
    const intersects = yellowFeatures.filter(yellowFeature => {
      return isFeatureIntersects(redFeature, yellowFeature)
    })
    console.log(`number of intersect yellow: ${redFeature.id}:`, intersects.length);
  })

  const fromLine = redFeatures[4];
  const maskLines = yellowFeatures.filter(yellowFeature => {
    return isFeatureIntersects(fromLine, yellowFeature)
  })

  const results = splitRed(fromLine, maskLines, true)
  splitedFile.write(JSON.stringify(results));

  const redFeatureCollection = mergeOneFeatureCollection(redFeatures);
  const yellowFeatureCollection = mergeOneFeatureCollection(yellowFeatures);
  redFile.write(JSON.stringify(fromLine));
  yellowFile.write(JSON.stringify(yellowFeatureCollection))
}

main()