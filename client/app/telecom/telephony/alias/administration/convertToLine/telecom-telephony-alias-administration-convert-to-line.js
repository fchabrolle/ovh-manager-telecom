angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.telephony.alias.administration.convertToLine', {
    url: '/convert',
    views: {
      'aliasView@telecom.telephony.alias': {
        templateUrl: 'app/telecom/telephony/alias/administration/convertToLine/telecom-telephony-alias-administration-convert-to-line.html',
        controller: 'TelecomTelephonyAliasAdministrationConvertToLineCtrl',
        controllerAs: 'AliasConvertCtrl',
      },
    },
    translations: ['common'],
  });
});
