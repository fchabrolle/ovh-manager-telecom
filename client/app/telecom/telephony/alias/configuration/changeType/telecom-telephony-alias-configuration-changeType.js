angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.telephony.alias.configuration.changeType', {
    url: '/changeType',
    views: {
      'aliasView@telecom.telephony.alias': {
        templateUrl: 'app/telecom/telephony/alias/configuration/changeType/telecom-telephony-alias-configuration-changeType.html',
        controller: 'TelecomTelephonyAliasConfigurationChangeTypeCtrl',
        controllerAs: 'AliasConfigurationChangeTypeCtrl',
      },
    },
    translations: [
      'telecom/telephony/alias/configuration/changeType'
    ],
  });
});
