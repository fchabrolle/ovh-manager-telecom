angular.module('managerApp').controller('TelecomTelephonyFaxManagementInformationsCtrl', function ($q, $stateParams, $translate, TelephonyMediator, Toast, NumberPlans) {
  const self = this;

  self.loading = {
    init: false,
  };

  self.group = null;
  self.fax = null;
  self.plan = null;

  /* =====================================
    =            INITIALIZATION            =
    ====================================== */

  self.$onInit = function () {
    self.loading.init = true;

    return TelephonyMediator.getGroup($stateParams.billingAccount).then((group) => {
      self.group = group;
      self.fax = self.group.getFax($stateParams.serviceName);
      self.plan = NumberPlans.getPlanByNumber(self.fax);
    }).catch((error) => {
      Toast.error([$translate.instant('telephony_fax_loading_error'), _.get(error, 'data.message', '')].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.loading.init = false;
    });
  };

  /* -----  End of INITIALIZATION  ------ */
});
