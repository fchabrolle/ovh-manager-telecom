angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom', {
    url: '',
    templateUrl: 'app/telecom/telecom.html',
    controller: 'TelecomCtrl',
    controllerAs: 'TelecomCtrl',
    abstract: true,
    translations: ['../common', '.'],
    resolve: {
      vipStatus($q, TelecomMediator) {
        // this can be totally async. We don't force it to be resolved before loading state.
        TelecomMediator.initVipStatus();
        return $q.when({});
      },
      serviceCount(TelecomMediator) {
        return TelecomMediator.initServiceCount();
      },
    },
  });
});
