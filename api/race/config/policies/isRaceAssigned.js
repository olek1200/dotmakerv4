'use strict';


// `next()` means go to next policy or reach the controller's action.
module.exports = async (ctx, next) => {
  if (ctx.state.user.role.name === 'Administrator') {
    return next();
  }

  // When user is not an administrator we check races that he is signed to.
  const assignedRaces = ctx.state.user.races.map(({ id }) => id);

  // 1) Get id of the race that user wants to chagne
  const queriedRace = Number(ctx.params.id);

  // 2) Check if user has permissions to this race
  const isAllowed = assignedRaces.find((id) => id === queriedRace);

  // 3) If the user has permissions to the race allow him to make changes.
  if (isAllowed) {
    return next();
  }

  // 4) If the ids do not match do not allow the user to do this action.
  return ctx.unauthorized('You\'re not allowed to perform this action!');
};
