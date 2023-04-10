const turf = require('@turf/turf');
const fs = require('fs');
const startNEndSplited = fs.createWriteStream('./breakStartNEnd.json');

const { 
  isFeatureIntersects, 
  isLineEqual,
  isGeomOfFeatureEqual
} = require('./geojsonUtil');

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

const MAX_FLOATING_PRECISION = 14;
const addOneToNextPrecision = (floatingNumber) => {
  const currentPrec = floatingNumber.toString().split('.')[1].length;
  if(MAX_FLOATING_PRECISION > currentPrec){
    const nextStringFormat = `${floatingNumber}1`;
    return parseFloat(nextStringFormat);
  }
  const lastNumber = parseInt(floatingNumber.toString().slice(-1)) - 4;
  const safeNumber = lastNumber === -1 ? 1 : lastNumber;
  return parseFloat(floatingNumber.toString().slice(0,-1) + safeNumber.toString());
}

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
  const lengthOfMaskLine = turf.length(maskLine, {units: 'meters'});
  const distanceOfOverldapLine = Math.abs(startPointOverlapLine.properties.location - endPointOverlapLine.properties.location);
  if(Math.abs(lengthOfMaskLine - distanceOfOverldapLine) > 10){
    console.log('reverse start/end +++++++++++', id, lengthOfMaskLine, distanceOfOverldapLine)
    startPointOverlapLine.properties.location = endPointOverlapLine.properties.location + lengthOfMaskLine;
    return [endPointOverlapLine, startPointOverlapLine]
  }
  return [startPointOverlapLine, endPointOverlapLine]
}

const alignOverlapPT = (startPoint, endPoint) => {
  const {location:locationStart} = startPoint.properties;
  const {location:locationEnd} = endPoint.properties;
  if((locationEnd - locationStart) >= 0){
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

module.exports = (fromLine ,maskLines, debug={}) => {
  // 0. if startPT and endPT of fromLine is same, make difference.
  const [startPT, endPT] = getStartEndPT(fromLine)
  if(isGeomOfFeatureEqual(startPT, endPT)){
    const newCoord = turf.getCoord(startPT).map(number => addOneToNextPrecision(number));
    if(debug.diffPoints){
      console.log('0.diffPoints:', newCoord)
    }
    const geom = turf.getGeom(fromLine); 
    geom.coordinates[0] = newCoord;
  }
  console.log(turf.getCoords(fromLine).length)
  startNEndSplited.write(JSON.stringify(fromLine));

  //1. remove duplicate maskLines
  const uniqMaskLines = uniqFeatures(maskLines);
  if(debug.maskLine === true){
    uniqMaskLines.forEach(maskLine => {
      console.log(`1. maskLine[${maskLine.id}]`)
      print(maskLine)
    })
  }

  // check nearest point from fromLine's start/end point
  const [startPTfromLine, endPTfromLine] = getStartEndPT(fromLine)
  debug.checkInverse && console.log(`----------------------------------------------`)
  debug.checkInverse && console.log("1-1. check yellow line contains both start and end PTs of redLine")
  debug.checkInverse && print(startPTfromLine)
  debug.checkInverse && print(endPTfromLine)
  const middleIntersetHandled = uniqMaskLines.reduce((acct, maskLine) => {
    const startPTonMask = turf.nearestPointOnLine(maskLine, startPTfromLine, {units: 'meters'})
    const endPTonMask = turf.nearestPointOnLine(maskLine, endPTfromLine, {units: 'meters'})
    debug.checkInverse && console.log(`----------------------------------------------`)
    debug.checkInverse && console.log(`the nearest point on yellow maskLine[${maskLine.id}] for each start and endpoint of redline`)
    debug.checkInverse && print(startPTonMask)
    debug.checkInverse && print(endPTonMask)
    if(startPTonMask.properties.location !== endPTonMask.properties.location){
      debug.checkInverse && console.log('##### some yellow lines containes start and end PTs of redLine')
      // need to split yellowFeature (split to three part)
      const [startPtOfMask, endPtOfMask] = getStartEndPT(maskLine);
      const firstPTonMask = startPTonMask.properties.location > endPTonMask.properties.location ? endPTonMask :startPTonMask;
      const secondPTonMask = startPTonMask.properties.location > endPTonMask.properties.location ? startPTonMask : endPTonMask;
      const splitted = [
        turf.lineString([turf.getCoord(startPtOfMask), turf.getCoord(firstPTonMask)]),
        // turf.lineString([turf.getCoord(firstPTonMask), turf.getCoord(secondPTonMask)]),
        turf.lineString([turf.getCoord(secondPTonMask), turf.getCoord(endPtOfMask)])
      ]
      const filtered = splitted.filter(part => isFeatureIntersects(fromLine, part))
      debug.checkInverse && print(turf.featureCollection(filtered));
      return [
        ...acct,
        ...filtered
      ]
    }
    return [
      ...acct,
      maskLine
    ]
  }, [])
  debug.checkInverse && console.log('End of check inverse %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%')

  //2. get overlapping points along with main line
  const overlapPTs = middleIntersetHandled.map(maskLine => {
    return getOverlapStartEndPT(fromLine, maskLine)
  })

  debug.overlapPTs && overlapPTs.forEach((pt) => {
    console.log('------------------- overlapPTs---------------------')
    print(pt);
  })

  //3. adjust start point of overlapping points to have same direction.
  const alignedPTs = overlapPTs.map(([startPT, endPT]) => {
    return alignOverlapPT(startPT, endPT)
  })

  if(debug.align === true){
    alignedPTs.forEach(([startPT, endPT]) => {
      console.log('2 alignedPTs ##########################')
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
  if(debug.sort === true){
    sortedPTs.forEach(([startPT, endPT]) => {
      console.log('sorted PTs ##########################')
      console.log(startPT, endPT)
      print(startPT.properties.location);
      print(startPT.geometry)
      print(endPT.geometry)
    })
  }

  //5. fix irregular points 
  //   (if nextPT.startPT.location is not bigger then prevPT.endPT.location,
  //    then that point is irregular) 
  //   (this can be happened, because maskLine is located at near start and end pt of fromLine
  //    and so, nearestStartPoint is picked from near startPT of fromLine 
  //    but nearestEndPoint is picked from near endPT of fromLine or vice versa)
  const irregularPTs = [];
  const filterIrregularPTs = sortedPTs.reduce((acct, point, index) => {
    if(index === 0){
      return [...acct, point];
    }
    const startPTlocationCurrent = point[0].properties.location;
    const endPTlocationPrev = acct.slice(-1)[0][1].properties.location;
    console.log('******', startPTlocationCurrent - endPTlocationPrev)
    // if(startPTlocationCurrent > endPTlocationPrev){
    if((startPTlocationCurrent - endPTlocationPrev) > -5){
    // if(Math.abs(startPTlocationCurrent - endPTlocationPrev) < 5){
      return [...acct, point];
    } else {
      console.log('add irregurlar pts:')
      print(point)
      irregularPTs.push(point);
      return [...acct]
    }
  }, [])
  if(debug.irregular === true){
    filterIrregularPTs.forEach(([startPT, endPT]) => {
      console.log('irregular filtered PTs ##########################')
      console.log(startPT, endPT)
      print(startPT.properties.location);
      print(startPT.geometry)
      print(endPT.geometry)
    })
  }
  debug.irregular && console.log(`number of irregular pts = ${irregularPTs.length}`)
  //5. merge adjacent overlapped mask line
  // mergeAdjacetLine(sortedPTs)

  //6. slice main line by overlapping point
  const results = [];
  let sliceStartPT = null;
  while(filterIrregularPTs.length > 0){
    const nextMaskPT = filterIrregularPTs.shift();
    const [startMaskPT, endMaskPT] = nextMaskPT;
    const startPT = sliceStartPT || getStartEndPT(fromLine)[0];
    const maskResult = splitLineToPoint(fromLine, startPT, startMaskPT)
    sliceStartPT = endMaskPT
    results.push(maskResult)
    if(filterIrregularPTs.length === 0) {
      console.log(`---------- lastResult handle ${endMaskPT.id}`)
      const lastResult = splitLineToPoint(fromLine, endMaskPT, getStartEndPT(fromLine)[1]);
      results.push(lastResult)
    }
  }
  return turf.featureCollection(results);
}

// main()

const test = () => {
  console.log(addOneToNextPrecision(10.9))
  console.log(addOneToNextPrecision(10.91))
  console.log(addOneToNextPrecision(10.910))
  console.log(addOneToNextPrecision(10.9104))
  console.log(addOneToNextPrecision(10.91041))
  console.log(addOneToNextPrecision(10.910412))
  console.log(addOneToNextPrecision(10.9104123))
}

// test()