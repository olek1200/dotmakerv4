'use strict';


// `next()` means go to next policy or reach the controller's action.
module.exports = async (ctx, next) => {
  if (ctx.state.user.role.name === 'Administrator') {
    return next();
  }

  // When user is not an administrator we check races that he is signed to.
  const assignedRaces = ctx.state.user.races.map(({ id }) => id);

  let isAllowed = false;

  // 1) Get list of entries that user wants to add
  const listOfEntries = ctx.request.body.entries;

  // 2) Get list of races id that entries are trying to be added to
  const listOfRacesId = listOfEntries.map(({ race }) => race);

  /* 3) Check if every race id is the same == check if all entries
        are trying to be added to only one race */
  const checkIfAllEqual = listOfRacesId.every(id => id === listOfRacesId[0]);

  /* 4) If all entries are trying to be added to only one race, we check if user
        has permissions to this race */
  if (checkIfAllEqual) {
    isAllowed = assignedRaces.find((id) => id === listOfRacesId[0]);
  }

  // 5) If the user has permissions to the race allow him to make changes.
  if (isAllowed) {
    return next();
  }

  // 6) If the user has no permissions to the race do not allow the user to do this action.
  return ctx.unauthorized('You\'re not allowed to perform this action!');
};
