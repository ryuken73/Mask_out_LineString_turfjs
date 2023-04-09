const turf = require('@turf/turf');

const fromLine = turf.lineString([
          [0,0],[0,5],
          [0,5],[5,5],
          [5,5],[5,0],
          [5,0],[1,0]], {color: 'red'});
// const lineStart = turf.lineString([[-1,0],[1,0]]);
// const lineStartExact = turf.lineString([[-1,0],[0,0]]);
// const lineMiddle = turf.lineString([[5,1],[5,2]]);
const lineMiddleReverse = turf.lineString([[5,3],[5,1]]);
const lineMiddleLater = turf.lineString([[3,5],[2,5]]);
const lineMiddleLong = turf.lineString([[1,5],[0,4]]);
const lineEnd = turf.lineString([[0,3],[0,0]]);
// const lineEndExact = turf.lineString([[0,3],[0,2]]);

const maskLines = [
  // lineStart, 
  // lineStartExact, 
  // lineMiddle, 
  lineMiddleReverse, 
  lineMiddleLater, 
  lineMiddleLong, 
  lineEnd, 
  // lineEndExact
];

const uniqId = () => {
  return Date.now() + Math.ceil(Math.random() * 10000);
}

const reverseFeature = feature => {
  return turf.rewind(feature, {reverse: true})
}
const isFeatureEqual = (feature1, feature2) => {
  return turf.booleanEqual(feature1.geometry, feature2.geometry);
};
const uniqFeatures = (features) => {
  let cloned = [...features];
  let uniq = [];
  while(cloned.length > 0){
    const targetFeature = cloned.shift();
    cloned = cloned.filter(feature => !isFeatureEqual(targetFeature,feature));
    uniq = [...uniq, targetFeature];
  }
  return uniq;
}
const getStartEndPT = (feature) => {
  const coords = turf.getCoords(feature);
  const startPoint = turf.point(coords[0]);
  const endPoint = turf.point(coords[coords.length-1]);
  return [startPoint, endPoint];
}
const getOverlapStartEndPT = (fromLine, maskLine) => {
  const {id=uniqId()} = maskLine;
  const [startPointMask, endPointMask] = getStartEndPT(maskLine);
  const startPointOverlapLine = turf.nearestPointOnLine(fromLine, startPointMask, {units:'meters'})
  const endPointOverlapLine = turf.nearestPointOnLine(fromLine, endPointMask, {units:'meters'})
  startPointOverlapLine.id = id + 1000000;
  endPointOverlapLine.id = id + 1000000;
  return [startPointOverlapLine, endPointOverlapLine]
}

const alignOverlapPT = (startPoint, endPoint) => {
  const {location:locationStart} = startPoint.properties;
  const {location:locationEnd} = endPoint.properties;
  if((locationEnd - locationStart) > 0){
    return [startPoint, endPoint]
  } else {
    return [endPoint, startPoint]
  }
}

const splitLineToPoint = (fromLine, startPoint, toPoint) => {
  const lineSliced = turf.lineSlice(startPoint, toPoint, fromLine);
  lineSliced.id = startPoint.id || uniqId();
  lineSliced.properties = {...fromLine.properties};
  return lineSliced;
}

const print = obj => console.log(JSON.stringify(obj));

const main = () => {
  const debug = true
  //1. remove duplicate maskLines
  const uniqMaskLines = uniqFeatures(maskLines);
  //2. get overlapping points along with main line
  const overlapPTs = uniqMaskLines.map(maskLine => {
    return getOverlapStartEndPT(fromLine, maskLine)
  })
  //3. adjust start point of overlapping points to have same direction.
  const alignedPTs = overlapPTs.map(([startPT, endPT]) => {
    return alignOverlapPT(startPT, endPT)
  })

  if(debug === true){
    alignedPTs.forEach(([startPT, endPT]) => {
      console.log('##########################')
      print(startPT.geometry);
      print(endPT.geometry);
    })
  }
  //4. sort overlapping points by distance from start point of main line. 
  const sortedPTs = alignedPTs.sort((a, b) => {
    const [startA] = a;
    const [startB] = b;
    return startA.properties.location - startB.properties.location;
  })
  if(debug === true){
    sortedPTs.forEach(([startPT, endPT]) => {
      console.log('##########################')
      console.log(startPT, endPT)
      print(startPT.properties.location);
      print(startPT.geometry)
      print(endPT.geometry)
    })
  }
  //5. merge adjacent overlapped mask line
  // mergeAdjacetLine(sortedPTs)

  //6. slice main line by overlapping point
  const results = [];
  let sliceStartPT = null;
  while(sortedPTs.length > 0){
    const nextMaskPT = sortedPTs.shift();
    const [startMaskPT, endMaskPT] = nextMaskPT;
    const startPT = sliceStartPT || getStartEndPT(fromLine)[0];
    const maskResult = splitLineToPoint(fromLine, startPT, startMaskPT)
    sliceStartPT = endMaskPT
    results.push(maskResult)
    if(sortedPTs.length === 0) {
      const lastResult = splitLineToPoint(fromLine, endMaskPT, getStartEndPT(fromLine)[1]);
      results.push(lastResult)}
  }
  console.log(results)
  print(turf.featureCollection(results));
}

main()

