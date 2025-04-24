const {
  sin,
  cos,
  asin,
  acos,
  atan2,
  abs,
  sqrt,
  PI,
} = Math;

// according to `EPSG:3857` CRS
const earthRadius = 6378137;

const deg2Rad = (degrees) => degrees * (PI / 180);

const rad2Deg = (radians) => radians * (180 / PI);

const calculateDistanceInMeters = (pointA, pointB) => {
  // using haversine formula from:
  // http://movable-type.co.uk/scripts/latlong.html

  const latA = deg2Rad(pointA.lat);
  const latB = deg2Rad(pointB.lat);

  const diffLat = deg2Rad(pointA.lat - pointB.lat);
  const diffLng = deg2Rad(pointA.lng - pointB.lng);

  const a = sin(diffLat / 2) ** 2 + cos(latB) * cos(latA) * sin(diffLng / 2) ** 2;
  const c = 2 * asin(sqrt(a));

  // console.log(a);
  // console.log(c);

  return earthRadius * c;
};

// initial bearing / forward azimuth
const calculateBearing = (pointA, pointB) => {
  // http://movable-type.co.uk/scripts/latlong.html
  const latA = deg2Rad(pointA.lat);
  const latB = deg2Rad(pointB.lat);
  const diffLng = deg2Rad(pointB.lng - pointA.lng);

  const y = sin(diffLng) * cos(latB);
  const x = cos(latA) * sin(latB) - sin(latA) * cos(latB) * cos(diffLng);

  return (rad2Deg(atan2(y, x)) + 360) % 360;
};

const calculateMinDistanceFromPointToLine = (pointA, pointB, point) => {
  // https://stackoverflow.com/questions/20231258/minimum-distance-between-a-point-and-a-line-in-latitude-longitude
  // modifications once cross track is calculated
  // https://stackoverflow.com/questions/32771458/distance-from-lat-lng-point-to-minor-arc-segment
  const bearingFromAToPoint = deg2Rad(calculateBearing(pointA, point));
  const bearingFromAToB = deg2Rad(calculateBearing(pointA, pointB));
  const distanceFromPointToA = calculateDistanceInMeters(point, pointA);

  // console.log(bearingFromAToPoint);
  // console.log(bearingFromAToB);
  // console.log(distanceFromPointToA);

  // calculate relative bearing between AB and APoint
  let relativeBearing = abs(bearingFromAToPoint - bearingFromAToB);
  if (relativeBearing > PI) {
    relativeBearing = 2 * PI - relativeBearing;
  }
  // if relative bearing is an obtuse angle, the closest distance to point is from linePointA
  let distance;
  if (relativeBearing > PI / 2) {
    distance = distanceFromPointToA;
  } else {
    const crossTrackDistance = abs(asin(
      sin(distanceFromPointToA / earthRadius) * sin(bearingFromAToPoint - bearingFromAToB)
    ) * earthRadius);
    // if relative bearing is acute we need to check if cross track distance projection
    // falls on line AB or not
    // to do so, we compare length of AB to A-crossTrackProjectionOnLineAB
    const distanceFromAToB = calculateDistanceInMeters(pointA, pointB);
    const distanceFromAToCrossTrackProjection = acos(
      cos(distanceFromPointToA / earthRadius) / cos(crossTrackDistance / earthRadius)
    ) * earthRadius;
    if (distanceFromAToCrossTrackProjection > distanceFromAToB) {
      distance = calculateDistanceInMeters(pointB, point);
    } else {
      distance = crossTrackDistance;
    }
  }
  return distance;
};

const checkIfLineIntersectsCircle = (
  pointA, pointB, center, radius // radius in meters
) => calculateMinDistanceFromPointToLine(pointA, pointB, center) <= radius;

const checkIfPointInCircle = (
  point, circleCenter, radius
) => calculateDistanceInMeters(point, circleCenter) <= radius;

module.exports = {
  checkIfPointInCircle,
  checkIfLineIntersectsCircle,
};
