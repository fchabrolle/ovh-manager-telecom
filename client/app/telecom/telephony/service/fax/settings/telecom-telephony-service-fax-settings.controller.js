angular.module('managerApp').controller('TelecomTelephonyServiceFaxSettingsCtrl', function ($q, $stateParams, $translate, $timeout, OvhApiTelephony, Toast, ToastError, telephonyBulk) {
  const self = this;

  /* ===============================
  =            HELPERS            =
  =============================== */

  function fetchEnums() {
    return OvhApiTelephony.v6().schema({
      billingAccount: $stateParams.billingAccount,
    }).$promise.then(schema => ({
      quality: schema.models['telephony.FaxQualityEnum'].enum,
      sendingTries: schema.models['telephony.FaxSendingTries'].enum,
      mailFormat: schema.models['telephony.FaxMailFormatEnum'].enum,
    }));
  }

  function fetchSettings() {
    return OvhApiTelephony.Fax().v6().getSettings({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }).$promise;
  }

  function refreshSettings() {
    OvhApiTelephony.Fax().v6().resetCache();
    OvhApiTelephony.Fax().v6().resetQueryCache();
    return fetchSettings()
      .then(settings => _.assign(self.settings, _.pick(settings, ['faxQuality', 'faxMaxCall', 'faxTagLine', 'fromName', 'fromEmail', 'mailFormat', 'redirectionEmail']), (objectValue, sourceValue) => (_.isArray(sourceValue) ? sourceValue : sourceValue.toString())));
  }

  /* -----  End of HELPERS  ------ */

  /* ===============================
    =            ACTIONS            =
    =============================== */

  self.cancelAddAddressesToNotifyForm = function () {
    self.addressesToNotifyForm.email = null;
    self.addressesToNotifyForm.isShown = false;
  };

  self.addRedirectionEmail = function (email) {
    self.settings.redirectionEmail.push(email);
    self.addressesToNotifyForm.redirectionEmail = null;
    self.addressesToNotifyForm.isShown = false;
  };

  self.removeRedirectionEmail = function (email) {
    _.pull(self.settings.redirectionEmail, email);
  };

  self.updateAllSettings = function () {
    self.updatingSettings = true;

    return OvhApiTelephony.Fax().v6().setSettings({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, self.settings).$promise.then(() => refreshSettings()).then(() => {
      Toast.success($translate.instant('telephony_service_fax_settings_notification_settings_update_settings_success'));
    }).catch(() => {
      Toast.error($translate.instant('telephony_service_fax_settings_notification_settings_update_settings_error'));
    }).finally(() => {
      self.updatingSettings = false;
    });
  };

  /* -----  End of ACTIONS  ------ */

  /* ======================================
    =            INITIALIZATION            =
    ====================================== */

  function init() {
    self.loading = {
      init: true,
    };

    self.enums = {};
    self.settings = {};

    self.addressesToNotifyForm = {
      email: null,
      threshold: 5,
      isShown: false,
      isAdding: false,
      isRemoving: false,
    };

    self.newRedirectionEmail = null;

    return $q.all({
      enums: fetchEnums(),
      settings: refreshSettings(),
    }).then((results) => {
      self.enums = results.enums;
    }).catch((err) => {
      self.settings = null;
      return new ToastError(err);
    }).finally(() => {
      self.loading.init = false;
    });
  }

  /* -----  End of INITIALIZATION  ------ */

  /* ===========================
    =            BULK            =
    ============================ */

  self.bulkDatas = {
    billingAccount: $stateParams.billingAccount,
    serviceName: $stateParams.serviceName,
    infos: {
      name: 'faxSettings',
      actions: [{
        name: 'settings',
        route: '/telephony/{billingAccount}/fax/{serviceName}/settings',
        method: 'PUT',
        params: null,
      }],
    },
  };

  self.filterServices = function (services) {
    return _.filter(services, service => ['fax', 'voicefax'].indexOf(service.featureType) > -1);
  };

  self.getBulkParams = function () {
    return self.settings;
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_service_fax_settings_update_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_service_fax_settings_update_bulk_some_success', {
        count: bulkResult.success.length,
      }),
      error: $translate.instant('telephony_service_fax_settings_update_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    // reset initial values to be able to modify again the options
    init();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_service_fax_settings_update_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };

  /* -----  End of BULK  ------ */

  init();
});
