angular.module('managerApp').controller('TelecomTelephonyBillingAccountBillingDepositCtrl', function ($filter, $q, $stateParams, $translate, OvhApiOrder, OvhApiTelephony, ToastError) {
  const self = this;

  self.loading = {
    init: true,
    submit: false,
    success: false,
  };

  self.securityDepositAmounts = [];
  self.securityDepositAmount = null;
  self.contracts = [];
  self.contractsAccepted = false;
  self.futureDeposit = null;
  self.group = null;
  self.order = null;

  function init() {
    self.loading.init = true;

    $q.all({
      securityDepositAmounts: self.getSecurityDepositAmounts(),
      billingAccount: self.getBillingAccount(),
    }).then((data) => {
      self.securityDepositAmounts = data.securityDepositAmounts;
      self.group = data.billingAccount;
    })
      .catch(err => new ToastError(err))
      .finally(() => {
        self.loading.init = false;
      });
  }

  self.orderSecurityDeposit = function () {
    self.loading.submit = true;

    return OvhApiOrder.Telephony().v6().orderSecurityDeposit({
      billingAccount: $stateParams.billingAccount,
    }, {
      amount: self.securityDepositAmount.value,
    }).$promise.then((data) => {
      self.order = data;
      self.loading.success = true;
    })
      .catch(err => new ToastError(err))
      .finally(() => {
        self.loading.submit = false;
      });
  };

  self.onChangeAmount = function () {
    self.futureDeposit = null;
    self.contracts = null;

    return OvhApiOrder.Telephony().v6().getSecurityDeposit({
      billingAccount: $stateParams.billingAccount,
      amount: self.securityDepositAmount.value,
    }).$promise.then((data) => {
      self.contracts = data.contracts;
      self.contractsAccepted = false;

      self.futureDeposit = {};
      self.futureDeposit.currencyCode = data.prices.withoutTax.currencyCode;
      self.futureDeposit.value = data.prices.withoutTax.value + self.group.securityDeposit.value;
      self.futureDeposit.text = [$filter('number')(self.futureDeposit.value, 2), self.futureDeposit.currencyCode === 'EUR' ? '€' : self.futureDeposit.currencyCode].join(' ');
    })
      .catch(err => new ToastError(err));
  };

  self.getSecurityDepositAmounts = function () {
    return OvhApiTelephony.v6().getAmountSecurityDeposit({
      billingAccount: $stateParams.billingAccount,
    }).$promise;
  };

  self.getBillingAccount = function () {
    return OvhApiTelephony.v6().get({
      billingAccount: $stateParams.billingAccount,
    }).$promise;
  };

  init();
});
