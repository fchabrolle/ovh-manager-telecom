angular.module('managerApp').controller('TelecomTelephonyServiceVoicemailPasswordCtrl', function ($state, $stateParams, $translate, $timeout, OvhApiTelephony, ToastError, telephonyBulk, Toast) {
  const self = this;

  function init() {
    self.options = null;
    self.loading = true;
    self.submitting = false;
    self.reset();

    self.isFax = $state.current.name.indexOf('fax') > -1;

    return OvhApiTelephony.Voicemail().v6().getNumbersSettings({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }).$promise.then((options) => {
      self.options = options;
    }).catch(err => new ToastError(err)).finally(() => {
      self.loading = false;
    });
  }

  self.checkPasswordConfirm = function (form) {
    form.passwordConfirm.$setValidity('matching', true);
    if (self.passwordConfirm && self.passwordConfirm !== self.password) {
      form.passwordConfirm.$setValidity('matching', false);
    }
  };

  self.reset = function () {
    self.password = '';
    self.passwordConfirm = '';
    self.success = false;
  };

  self.submitPasswordChange = function (form) {
    self.submitting = true;
    self.success = false;
    return OvhApiTelephony.Voicemail().v6().changePassword({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, {
      password: self.password,
    }).$promise.then(() => {
      self.success = true;
      $timeout(() => {
        self.reset();
        form.$setPristine();
      }, 3000);
    }).catch(() => new ToastError($translate.instant('telephony_line_answer_voicemail_password_change_error'))).finally(() => {
      self.submitting = false;
    });
  };

  self.bulkDatas = {
    billingAccount: $stateParams.billingAccount,
    serviceName: $stateParams.serviceName,
    infos: {
      name: 'password',
      actions: [{
        name: 'password',
        route: '/telephony/{billingAccount}/voicemail/{serviceName}/settings/changePassword',
        method: 'POST',
        params: null,
      }],
    },
  };

  self.filterServices = function (services) {
    return _.filter(services, service => ['sip', 'mgcp', 'fax', 'voicefax'].indexOf(service.featureType) > -1);
  };

  self.getBulkParams = function () {
    return {
      password: self.password,
    };
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_line_answer_voicemail_password_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_line_answer_voicemail_password_bulk_some_success', {
        count: bulkResult.success.length,

      }),
      error: $translate.instant('telephony_line_answer_voicemail_password_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    init();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_line_answer_voicemail_password_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };

  init();
});
