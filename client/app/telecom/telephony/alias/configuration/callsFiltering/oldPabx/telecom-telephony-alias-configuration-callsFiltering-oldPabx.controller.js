angular.module('managerApp').controller('TelecomTelephonyAliasConfigurationCallsFilteringOldPabxCtrl', function ($stateParams, $q, $translate, OvhApiTelephony, ToastError, telephonyBulk, Toast) {
  const self = this;

  self.fetchStatus = function () {
    return OvhApiTelephony.Screen().v6().get({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }).$promise;
  };

  self.fetchScreenLists = function () {
    OvhApiTelephony.Screen().ScreenLists().v6().resetAllCache();
    return OvhApiTelephony.Screen().ScreenLists().v6()
      .query({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
      }).$promise
      .then(ids => $q.all(_.map(_.chunk(ids, 50), chunkIds =>
        OvhApiTelephony.Screen().ScreenLists().v6().getBatch({
          billingAccount: $stateParams.billingAccount,
          serviceName: $stateParams.serviceName,
          id: chunkIds,
        }).$promise))
        .then((chunkResult) => {
          const result = _.pluck(_.flatten(chunkResult), 'value');
          return _.map(result, res => angular.extend(res, {
            shortType: _.startsWith(res.type, 'incoming') ? 'incoming' : 'outgoing',
            list: res.type.indexOf('White') >= 0 ? 'white' : 'black',
          }));
        }));
  };

  self.removeScreenList = function (screen) {
    return OvhApiTelephony.Screen().ScreenLists().v6().remove({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
      id: screen.id,
    }).$promise;
  };

  self.addScreenList = function (screen) {
    return OvhApiTelephony.Screen().ScreenLists().v6().create({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, {
      type: screen.type,
      callNumber: screen.callNumber,
      nature: screen.nature,
    }).$promise;
  };

  self.onScreenListAdded = function () {
    self.screenLists.update();
  };

  self.updateScreen = function () {
    self.screenStatus.isLoading = true;
    return OvhApiTelephony.Screen().v6().change({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, {
      incomingScreenList: self.screenStatus.modified,
    }).$promise.then(() => {
      self.screenStatus.raw = angular.copy(self.screenStatus.modified);
    }).catch((err) => {
      self.screenStatus.modified = angular.copy(self.screenStatus.raw);
      return new ToastError(err);
    }).finally(() => {
      self.screenStatus.isLoading = false;
    });
  };

  function init() {
    self.screenLists = {
      fetchAll: self.fetchScreenLists,
      remove: self.removeScreenList,
      update: angular.noop,
      getList() {
        return [];
      },
    };
    self.screenStatus = {
      raw: null,
      modified: null,
      isLoading: false,
    };
    self.screenStatus.isLoading = true;
    return self.fetchStatus().then((result) => {
      self.screenStatus.raw = result.incomingScreenList;
      self.screenStatus.modified = angular.copy(result.incomingScreenList);
    }).catch(err => new ToastError(err)).finally(() => {
      self.screenStatus.isLoading = false;
    });
  }

  init();

  self.bulkDatas = {
    billingAccount: $stateParams.billingAccount,
    serviceName: $stateParams.serviceName,
    infos: {
      name: 'screen',
      actions: [{
        name: 'screen',
        route: '/telephony/{billingAccount}/screen/{serviceName}',
        method: 'PUT',
        params: null,
      }],
    },
  };

  self.getBulkParams = function () {
    return {
      incomingScreenList: _.get(self, 'screenStatus.modified'),
    };
  };

  self.filterServices = function (services) {
    return _.filter(services, service => ['easyPabx', 'miniPabx'].indexOf(service.featureType) > -1);
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_line_calls_filtering_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_line_calls_filtering_bulk_some_success', {
        count: bulkResult.success.length,
      }),
      error: $translate.instant('telephony_line_calls_filtering_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    window.location.reload();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_line_calls_filtering_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };
});
