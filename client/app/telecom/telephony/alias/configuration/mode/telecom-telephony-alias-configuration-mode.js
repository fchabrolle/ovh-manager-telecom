angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.telephony.alias.configuration.mode', {
    url: '/mode',
    abstract: true,
    translations: [
      'telecom/telephony/alias/configuration/mode',
    ],
  });
});
