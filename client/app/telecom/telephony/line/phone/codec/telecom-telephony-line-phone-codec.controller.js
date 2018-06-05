angular.module('managerApp').controller('TelecomTelephonyLinePhoneCodecCtrl', function ($q, $stateParams, $translate, TelephonyMediator, Toast, OvhApiTelephony, telephonyBulk, voipLinePhone) {
  const self = this;
  let codecsAuto = null;

  self.loading = {
    init: false,
  };

  self.model = {
    codecs: null,
  };

  self.codecs = null;
  self.servicesWithPhone = [];
  self.isCheckingPhones = false;

  /*= ==============================
    =            HELPERS            =
    =============================== */

  function refreshCodecs() {
    if (self.line.options.codecs) {
      self.model.codecs = _.find(self.line.availableCodecs, {
        value: _.trim(self.line.options.codecs, '_a'),
      });

      codecsAuto = _.endsWith(self.line.options.codecs, '_a');

      self.codecs = angular.extend({
        isAutomaticActivated: _.endsWith(self.line.options.codecs, '_a'),
      }, _.find(self.line.availableCodecs, {
        value: self.line.options.codecs.replace('_a', ''),
      }));

      self.model.auto = self.codecs.isAutomaticActivated;
    }
  }

  self.isAutomaticCodecEnabled = function () {
    return _.every(self.line.availableCodecs, {
      automatic: true,
    });
  };

  self.hasChanged = function () {
    return (self.model.codecs && self.codecs.value !== self.model.codecs.value) ||
      self.model.auto !== codecsAuto;
  };

  /* -----  End of HELPERS  ------*/

  /*= ==============================
    =            ACTIONS            =
    =============================== */

  self.saveNewCodec = function () {
    self.loading.save = true;

    return self.line.saveOption('codecs', self.model.auto ? `${self.model.codecs.value}_a` : self.model.codecs.value).then(() => {
      self.saved = true;
      Toast.success([$translate.instant('telephony_line_phone_codec_edit_codec_save_success')]);
      refreshCodecs();
    }, (error) => {
      if (error.init) {
        Toast.error([$translate.instant('telephony_line_phone_codec_edit_codec_load_error'), (error.data && error.data.message) || ''].join(' '));
      } else {
        Toast.error([$translate.instant('telephony_line_phone_codec_edit_codec_save_error'), (error.data && error.data.message) || ''].join(' '));
      }
    }).finally(() => {
      self.loading.save = false;
    });
  };

  /* -----  End of ACTIONS  ------*/

  /*= =====================================
    =            INITIALIZATION            =
    ====================================== */

  function init() {
    self.loading.init = true;

    return TelephonyMediator.getGroup($stateParams.billingAccount).then((group) => {
      self.line = group.getLine($stateParams.serviceName);

      return $q.all({
        options: self.line.getOptions(),
        codecList: self.line.getAvailableCodecs(),
      }).then(refreshCodecs);
    }).catch((error) => {
      Toast.error([$translate.instant('telephony_line_phone_codec_load_error'), (error.data && error.data.message) || ''].join(' '));
      return error;
    }).finally(() => {
      self.loading.init = false;
    });
  }

  /* -----  End of INITIALIZATION  ------*/

  /* ===========================
    =            BULK            =
    ============================ */

  self.bulkDatas = {
    billingAccount: $stateParams.billingAccount,
    serviceName: $stateParams.serviceName,
    infos: {
      name: 'codecs',
      actions: [{
        name: 'options',
        route: '/telephony/{billingAccount}/line/{serviceName}/options',
        method: 'PUT',
        params: null,
      }],
    },
  };

  self.filterServices = function (services) {
    const filteredServices = _.filter(services, service => ['sip', 'mgcp'].indexOf(service.featureType) > -1);

    return voipLinePhone
      .fetchAll()
      .then(voipLinePhones => _.filter(filteredServices, service =>
        _.some(voipLinePhones, {
          serviceName: service.serviceName,
          billingAccount: service.billingAccount,
        })));
  };

  self.getBulkParams = function () {
    const data = {
      codecs: self.model.auto ? `${self.model.codecs.value}_a` : self.model.codecs.value,
    };

    return data;
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_line_phone_codec_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_line_phone_codec_bulk_some_success', {
        count: bulkResult.success.length,
      }),
      error: $translate.instant('telephony_line_phone_codec_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    OvhApiTelephony.Line().Options().resetCache();
    TelephonyMediator.resetAllCache();
    TelephonyMediator.init();

    init();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_line_phone_codec_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };

  /* -----  End of BULK  ------ */

  init();
});
