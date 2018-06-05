angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.telephony.fax.management', {
    url: '/management',
    abstract: true,
    translations: [
      'common',
      'telecom/telephony/fax',
    ],
  });
});
