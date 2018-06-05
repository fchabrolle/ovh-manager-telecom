angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.overTheBox.logs', {
    url: '/logs',
    views: {
      'otbView@telecom.overTheBox': {
        templateUrl: 'app/telecom/overTheBox/logs/overTheBox-logs.html',
        controller: 'OverTheBoxLogsCtrl',
        controllerAs: 'OTBLogs',
      },
    },
    translations: ['common', 'telecom/overTheBox', 'telecom/overTheBox/logs'],
  });
});
