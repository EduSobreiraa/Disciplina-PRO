/**
 * Contrato assíncrono implementado pela fronteira HTTP do Projeto 66.
 * As telas não devem conhecer fetch, bearer ou o header de tenant.
 */
export const projeto66RepositoryContract = Object.freeze({
  listEnrollments: 'listEnrollments',
  loadCycle: 'loadCycle',
  startCycle: 'startCycle',
  saveDailyRecord: 'saveDailyRecord',
  completeActivity: 'completeActivity',
  loadPrivateResponse: 'loadPrivateResponse',
  savePrivateResponse: 'savePrivateResponse',
})
