angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.telephony.alias.configuration', {
    url: '/configuration',
    views: {
      'aliasInnerView@telecom.telephony.alias': {
        templateUrl: 'app/telecom/telephony/alias/configuration/telecom-telephony-alias-configuration.html',
        controller: 'TelecomTelephonyAliasConfigurationCtrl',
        controllerAs: 'AliasConfigurationCtrl',
      },
    },
    translations: ['common', 'telecom/telephony/alias/configuration'],
  });
});
