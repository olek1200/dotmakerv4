'use strict';


// `next()` means go to next policy or reach the controller's action.
module.exports = async (ctx, next) => {
  if (ctx.state.user.role.name === 'Administrator') {
    return next();
  }

  // When user is not an administrator we check to which races he has permissions.
  const assignedRaces = ctx.state.user.races.map(({ id }) => id);

  // 1) Check which race is trying to be modified
  const queriedRaceId = ctx.request.body.race;

  // 2) Check if user has permissions to this race
  const isAllowed = assignedRaces.find((id) => id === queriedRaceId);

  // 3) If the user has permissions to the race allow him to make changes.
  if (isAllowed) {
    return next();
  }

  // If the user has no permissions to the race do not allow the user to do this action.
  return ctx.unauthorized('You\'re not allowed to perform this action!');
};
