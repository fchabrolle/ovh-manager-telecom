angular.module('managerApp').controller('TelecomTelephonyServiceVoicemailDefaultCtrl', function ($scope, $stateParams, $q, $timeout, $filter, $translate, ToastError, OvhApiTelephony, telephonyBulk, Toast) {
  const self = this;

  function fetchLines() {
    return OvhApiTelephony.Line().Aapi().get().$promise.then(result => _.filter(_.flatten(_.pluck(result, 'lines')), { serviceType: 'line' }));
  }

  function fetchFax() {
    return OvhApiTelephony.Fax().Aapi().getServices().$promise.then(result => _.filter(result, { type: 'FAX' }));
  }

  function fetchOptions() {
    return OvhApiTelephony.Line().v6().getOptions({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }).$promise;
  }

  function init() {
    self.numbers = [];
    self.options = {};
    self.defaultVoicemail = null;
    self.form = {
      email: null,
    };

    self.loading = true;
    return $q.all({
      lines: fetchLines(),
      fax: fetchFax(),
      options: fetchOptions(),
    }).then((result) => {
      self.numbers = result.lines.concat(result.fax);
      self.options = result.options;
      self.defaultVoicemail = self.options.defaultVoicemail;
    }).catch(err => new ToastError(err)).finally(() => {
      self.loading = false;
    });
  }

  self.saveDefaultVoicemail = function () {
    self.saving = true;
    const save = OvhApiTelephony.Line().v6().setOptions({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, self.options).$promise;

    self.success = false;
    return $q.all([
      $timeout(angular.noop, 1000), // avoid clipping
      save,
    ]).then(() => {
      self.defaultVoicemail = self.options.defaultVoicemail;
      self.success = true;
    }).catch(err => new ToastError(err)).finally(() => {
      self.saving = false;
    });
  };

  self.cancel = function () {
    self.options.defaultVoicemail = self.defaultVoicemail;
  };

  self.formatNumber = function (number) {
    const formatted = $filter('phoneNumber')(number.serviceName);
    if (number.description) {
      return number.description === number.serviceName ? formatted : `${formatted} ${number.description}`;
    } else if (number.label) {
      return number.label === number.serviceName ? formatted : `${formatted} ${number.label}`;
    }
    return formatted;
  };

  init();

  self.bulkDatas = {
    billingAccount: $stateParams.billingAccount,
    serviceName: $stateParams.serviceName,
    infos: {
      name: 'settings',
      actions: [{
        name: 'options',
        route: '/telephony/{billingAccount}/line/{serviceName}/options',
        method: 'PUT',
        params: null,
      }],
    },
  };

  self.getBulkParams = function () {
    return {
      defaultVoicemail: self.options.defaultVoicemail,
    };
  };

  self.filterServices = function (services) {
    return _.filter(services, service => ['sip', 'mgcp'].indexOf(service.featureType) > -1);
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_line_answer_default_voicemail_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_line_answer_default_voicemail_bulk_some_success', {
        count: bulkResult.success.length,
      }),
      error: $translate.instant('telephony_line_answer_default_voicemail_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    // reset initial values to be able to modify again the options
    OvhApiTelephony.Line().v6().resetAllCache();

    init();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_line_answer_default_voicemail_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };
});
