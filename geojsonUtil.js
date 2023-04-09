const turf = require('@turf/turf');

const parseFeatureCollection = featureCollection => {
  const features = [];
  turf.featureEach(featureCollection, (currentFeature) => {
    features.push(currentFeature)
  })
  return features;
}

module.exports.uniqLines = (features) => {
  let cloned = [...features];
  let uniq = [];
  while(cloned.length > 0){
    const targetFeature = cloned.shift();
    cloned = cloned.filter(feature => !this.isLineEqual(targetFeature,feature));
    uniq = [...uniq, targetFeature];
  }
  return uniq;
}

module.exports.isFeatureIntersects = (feature1, feature2) => {
  return turf.booleanIntersects(feature1, feature2);
}

module.exports.mergeOneFeatureCollection = geojsonArray => {
  return turf.featureCollection([...geojsonArray]);
}

module.exports.splitRedYellowFeatures = featureCollectionArray => {
  const featureArray = featureCollectionArray.reduce((acct, featureCollection) => {
    const features = parseFeatureCollection(featureCollection);
    const subResult = [
      ...acct,
      ...features
    ]
    return subResult
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
  const uniqRedFeatures = this.uniqLines(redFeatures)
  const uniqYellowFeatures = this.uniqLines(yellowFeatures)

  return [uniqRedFeatures, uniqYellowFeatures]
}


/////////////////////////////////////////////////////////

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

const getLineOverlap = (lineString1, lineString2) => {
  return turf.lineOverlap(lineString1, lineString2);
}

const getLineIntersectPoints = (lineString1, lineString2) => {
  return turf.lineIntersect(lineString1, lineString2);
}

module.exports.lineToClockwise = (lineString) => {
  return turf.rewind(lineString, {reverse: true})
}

module.exports.getRedOverlaps = (fromLine, maskLines) => {
  const intersectMaskLines = maskLines.filter((maskLine) => {
    return this.isFeatureIntersects(fromLine, maskLine);
  })
  const intersectPoints = intersectMaskLines.map(maskLine => {
    return getLineIntersectPoints(maskLine, fromLine)
  })

  console.log(JSON.stringify(intersectPoints[0]))
  console.log(JSON.stringify(intersectPoints[1]))
  // const overlaps = intersectmasklines.map(maskline => {
  //   return getlineoverlap(fromline, maskline);
  // })
  // console.log(json.stringify(intersectmasklines))
  // return turf.featurecollection([...overlaps])
}

const lineLength = (lineString) => {
  return turf.length(lineString, {units: 'meters'});
}

const isLinesParallel = (line1, line2) => {
  return turf.booleanParallel(line1, line2);
}

// const deepClone = obj => JSON.parse(JSON.stringify(obj));
const deepClone = obj => turf.clone(obj);


const lineMaskStartNEndPoint = (fromLine, maskLine) => {
  const [startPoint, endPoint] = lineToStartNEndPoint(maskLine);
  const fromLineSlice = turf.lineSlice(startPoint, endPoint, fromLine);
  const fromLineAngle = lineBearing(fromLineSlice);
  const maskLineAngle = lineBearing(maskLine);
  if((fromLineAngle * maskLineAngle) >= 0){
    return [startPoint, endPoint];
  } else {
    return [endPoint, startPoint];
  }
}


// is not equal original featureCollection
module.exports.mergeOneLineStringFeature = featureCollection => {
  const features = this.parseFeatureCollection(featureCollection);
  const coords = turf.coordAll(featureCollection);
  const primeFeature = features[0];
  const oneLineString = turf.lineString(coords, primeFeature.properties, {id: primeFeature.id})
  return turf.featureCollection([oneLineString]);
}

module.exports.isLineEqual = (lineFeature1, lineFeature2) => {
  // console.log('-----------------------------------------');
  // console.log('first:', lineFeature1.geometry, 'second', lineFeature2.geometry)
  return turf.booleanEqual(lineFeature1.geometry, lineFeature2.geometry);
};

// mask fromLine with maskLine
module.exports.maskLineByLine = (origFromLine, origMaskLine) => {
  console.log(origFromLine, origMaskLine)
  const fromLine = deepClone(origFromLine);
  const maskLine = deepClone(origMaskLine);
  // if(!this.isFeatureIntersects(fromLine, maskLine)){
  //   console.log(`${fromLine.id}: no intersect!`);
  //   return {
  //     isMasked: false,
  //     maskedLines: [fromLine]
  //   } 
  // }
  const fromId = fromLine.id;
  const [startPointMaskLine, endPointMaskLine] = lineMaskStartNEndPoint(fromLine, maskLine);
  const [startPointFromLine, endPointFromLine] = lineToStartNEndPoint(fromLine);
  const origFirstLine = turf.lineSlice(startPointFromLine, startPointMaskLine, fromLine);
  const origSecondLine = turf.lineSlice(endPointMaskLine, endPointFromLine, fromLine);
  const firstLine = deepClone(origFirstLine);
  const secondLine = deepClone(origSecondLine);
  const firstLineId = fromId + maskLine.id;
  const secondLineId = fromId + maskLine.id + 100000;
  console.log('firstLineId:',firstLineId,'secondLineId',secondLineId)
  firstLine.id = firstLineId
  secondLine.id = secondLineId
  firstLine.properties.name = firstLineId;
  secondLine.properties.name = secondLineId;
  console.log(`${fromId}: firstLine:`,JSON.stringify(firstLine));
  console.log(`${fromId}: secondLine:`,JSON.stringify(secondLine));
  return {
    isMasked: true,
    maskedLines: [firstLine, secondLine]
  }
}

const orderMaskLinesAlongLine = (line, maskLines) => {
  return maskLines.sort((a, b) => {
    const [startPointMaskLineA] = lineMaskStartNEndPoint(line, a);
    const [startPointMaskLineB] = lineMaskStartNEndPoint(line, b);
    const nearestPointA = turf.nearestPointOnLine(line, startPointMaskLineA, {units:'meters'})
    const nearestPointB = turf.nearestPointOnLine(line, startPointMaskLineB, {units:'meters'})
    return nearestPointA.properties.index - nearestPointB.properties.index;
  })
}

const getSnappedPoint = (fromLine, maskLine) => {
  const [startPoint, endPoint] = lineMaskStartNEndPoint(fromLine, maskLine);
  const startSnappedPoint = turf.nearestPointOnLine(fromLine, startPoint, {units:'meters'})
  const endSnappedPoint = turf.nearestPointOnLine(fromLine, endPoint, {units:'meters'})
  return [startSnappedPoint, endSnappedPoint]
}

const splitLineToPoint = (fromLine, startPoint, toPoint) => {
  const lineSliced = turf.lineSlice(startPoint, toPoint, fromLine);
  return lineSliced;
}
