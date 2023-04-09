const fs = require('fs');
const featureCollectionArray = require('./samples/realData.json');
const turfUtils = require('./turfUtils');
const {
  parseFeatureCollection,
  mergeOneFeatureCollection,
  isFeatureIntersects,
  maskLineByLines,
  uniqLines,
  getRedOverlaps,
  lineToClockwise
} = turfUtils;

const redFile = fs.createWriteStream('./red.json');
const yellowFile = fs.createWriteStream('./yellow.json');
const splitedFile = fs.createWriteStream('./splited.json');

const main = () => {
  const featureArray = featureCollectionArray.reduce((acct, featureCollection) => {
    const features = parseFeatureCollection(featureCollection);
    const addedAcct = [
      ...acct,
      ...features
    ]
    return addedAcct
  }, [])

  featureArray.forEach(feature => {
    feature.properties.stroke = feature.properties.color
  })

  const redFeatures = featureArray.filter(feature => {
      return feature.properties.color === 'red'
  })
  const yellowFeatures = featureArray.filter(feature => {
      return feature.properties.color === 'yellow'
  })
  const uniqRedFeatures = uniqLines(redFeatures)
  const uniqYellowFeatures = uniqLines(yellowFeatures)
  const redFeatureCollection = mergeOneFeatureCollection(uniqRedFeatures);
  const yellowFeatureCollection = mergeOneFeatureCollection(uniqYellowFeatures);


  redFeatures.forEach(redFeature => {
    const intersects = yellowFeatures.filter(yellowFeature => {
      return isFeatureIntersects(redFeature, yellowFeature)
    })
    console.log(`redFeature ${redFeature.id}:`, intersects.length);
  })

  uniqRedFeatures.forEach(redFeature => {
    const intersects = uniqYellowFeatures.filter(yellowFeature => {
      return isFeatureIntersects(redFeature, yellowFeature)
    })
    console.log(`uniqRedFeature ${redFeature.id}:`, intersects.length);
  })

  console.log(redFeatures.length, yellowFeatures.length)
  console.log(uniqRedFeatures.length, uniqYellowFeatures.length)
  // redFile.write(JSON.stringify(redFeatureCollection))
  // yellowFile.write(JSON.stringify(yellowFeatureCollection))
  // redFile.write(JSON.stringify(redFeatureCollection));
  // uniqRedFeatures.forEach(redFeature => {
  //   const maskedLines = maskLineByLines(redFeature, uniqYellowFeatures)
  // })
  const fromRedFeatures = uniqRedFeatures[4];
  // const results = maskLineByLines(fromRedFeatures, uniqYellowFeatures);
  // const results = getRedOverlaps(fromRedFeatures, uniqYellowFeatures);
  redFile.write(JSON.stringify(fromRedFeatures));
  yellowFile.write(JSON.stringify(yellowFeatureCollection))
  // splitedFile.write(JSON.stringify(results));

  const clockWise = lineToClockwise(fromRedFeatures)
  console.log(JSON.stringify(clockWise))
  
}

main()