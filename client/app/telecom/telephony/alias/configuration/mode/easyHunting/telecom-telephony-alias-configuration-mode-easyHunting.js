angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.telephony.alias.configuration.mode.easyHunting', {
    url: '/easyHunting',
    views: {
      'aliasView@telecom.telephony.alias': {
        templateUrl: 'app/telecom/telephony/alias/configuration/mode/easyHunting/telecom-telephony-alias-configuration-mode-easyHunting.html',
        controller: 'TelecomTelephonyAliasConfigurationModeEasyHuntingCtrl',
        controllerAs: 'ModeEasyHuntingCtrl',
      },
    },
    translations: ['common'],
  });
});
