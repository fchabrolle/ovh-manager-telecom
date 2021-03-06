angular.module('managerApp').controller('TelecomTelephonyLineClick2CallCtrl', function ($stateParams, $state, TelephonyMediator, Toast, $translate, $timeout, $q, $uibModal) {
  const self = this;

  self.loading = {
    init: false,
    call: false,
  };

  self.filter = {
    perPage: 5,
  };

  self.call = function () {
    self.loading.call = true;

    return $q.all([
      self.clickToCall.call(self.numberToCall).then(() => true, error => error),
      $timeout(angular.noop, 1000),
    ]).then((responses) => {
      if (responses[0] === true) {
        Toast.success($translate.instant('telephony_group_line_calls_click2call_call_do_ok', { serviceName: $stateParams.serviceName }));
      } else {
        Toast.error($translate.instant('telephony_group_line_calls_click2call_call_do_ko'));
      }
    }).finally(() => {
      self.loading.call = false;
    });
  };

  self.add = function () {
    $state.go('telecom.telephony.line.click2call.addUser', {
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    });
  };

  self.edit = function (user) {
    $state.go('telecom.telephony.line.click2call.changePassword', {
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
      userId: user.id,
    });
  };

  self.remove = function (user) {
    const modal = $uibModal.open({
      animation: true,
      templateUrl: 'app/telecom/telephony/line/calls/click2Call/remove-user/telecom-telephony-line-calls-click2Call-remove-user.html',
      controller: 'TelecomTelephonyLineClick2CallRemoveUserCtrl',
      controllerAs: 'Click2CallRemoveUserCtrl',
      resolve: {
        line() { return self.line; },
        user() { return user; },
      },
    });
    modal.result.then(() => {
      self.loading.user = true;
      return self.clickToCall.getUsers();
    }, (error) => {
      if (error && error.type === 'API') {
        Toast.error($translate.instant('telephony_group_line_calls_click2call_removeUser_ko', { error: error.message }));
      }
    });
    return modal;
  };

  /*= =====================================
    =            INITIALIZATION            =
    ====================================== */

  function init() {
    self.loading.init = true;

    TelephonyMediator.getGroup($stateParams.billingAccount).then((group) => {
      self.line = group.getLine($stateParams.serviceName);
      self.clickToCall = self.line.getClick2Call();

      return self;
    }).then(() => self.clickToCall.getUsers().then((data) => {
      self.clickToCall.users = _.sortByOrder(self.clickToCall.users, ['creationDateTime'], ['desc']);
      return data;
    })).finally(() => {
      self.loading.init = false;
    });
  }

  /* -----  End of INITIALIZATION  ------*/

  init();
});
