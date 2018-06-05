angular.module('managerApp').component('linePhoneConfiguration', {
  require: {
    configForm: '^form',
  },
  bindings: {
    configGroup: '=linePhoneConfigurationGroup',
    editMode: '=linePhoneConfigurationEditMode',
    expertMode: '=linePhoneConfigurationExpertMode',
  },
  templateUrl: 'components/telecom/telephony/group/line/phone/configration/line-phone-configuration.html',
  controller($translate, validator, LINE_PHONE_CONFIGURATION) {
    const self = this;

    self.validator = validator;

    /*= ==============================
      =            HELPERS            =
      =============================== */

    self.isEnumHasToBeTranslated = function (configName) {
      return LINE_PHONE_CONFIGURATION.configEnumsToTranslate.indexOf(configName) > -1;
    };

    self.getConfigValue = function (config) {
      switch (config.type) {
        case 'boolean':
          return config.value ? $translate.instant('telephony_line_phone_configuration_config_yes') : $translate.instant('telephony_line_phone_configuration_config_no');
        case 'enum':
          return self.isEnumHasToBeTranslated(config.name) ? $translate.instant(['telephony_line_phone_configuration_config', _.snakeCase(config.value)].join('_')) : config.value;
        default:
          return config.value;
      }
    };

    self.getPlaceholderTranslation = function (configName) {
      const trKey = ['telephony_line_phone_configuration_config', _.snakeCase(configName)].join('_');
      const translated = $translate.instant(trKey);
      return translated !== trKey ? translated : configName;
    };

    /* -----  End of HELPERS  ------*/

    /*= =============================
      =            EVENTS            =
      ============================== */

    self.onTextInputBlur = function (config) {
      if (_.isEmpty(config.value)) {
        _.set(config, 'value', config.prevValue);
      }
    };

    /* -----  End of EVENTS  ------*/
  },
});
