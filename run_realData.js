const featureCollectionArray = require('./samples/realData.json');
const turfUtils = require('./turfUtils');
const {
  parseFeatureCollection,
  mergeOneFeatureCollection
} = turfUtils;

const main = () => {
  const featureCollections = featureCollectionArray.map(featureCollection => {
    return parseFeatureCollection(featureCollection)
  })
  const oneFeatureCollection = mergeOneFeatureCollection(featureCollections);
  console.log(JSON.stringify(oneFeatureCollection))

}

main()