'use strict';


// `next()` means go to next policy or reach the controller's action.
module.exports = async (ctx, next) => {
  if (ctx.state.user.role.name === 'Administrator') {
    return next();
  }

  // When user is not an administrator we check races that he is signed to.
  const signedRaces = ctx.state.user.races.map(({ id }) => id);

  // Races inside query
  // eslint-disable-next-line no-underscore-dangle
  const queriedRaces = ctx.query._where[0][0]?.id_in;

  /* If inside query the only id is '0' we simply allow this action,
     because in this case no race will show up.
     That situation can occur when user has no races assigned to him, and we
     want to show him that he has no races assigned instead of the error about
     no authorization - which could me misleading */
  if (queriedRaces === '0') {
    return next();
  }

  const queriedRacesParsed = [];
  // We have to change array of strings into arrays of number for comparison
  for (let i = 0; i < queriedRaces?.length; i += 1) {
    queriedRacesParsed.push(Number(queriedRaces[i]));
  }

  // Lastly, we check if ids of races in the query match ids signed to the user.
  if (JSON.stringify(signedRaces) === JSON.stringify(queriedRacesParsed)) {
    return next();
  }

  // If the ids do not match we simply do not allow the user to do this action.
  return ctx.unauthorized('You\'re not allowed to perform this action!');
};
