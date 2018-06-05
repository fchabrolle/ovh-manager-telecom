angular.module('managerApp').controller('TelecomTelephonyAliasAdministrationConvertToLineCtrl', function ($stateParams, $q, $translate, OvhApiTelephony, ToastError, Toast, telephonyBulk) {
  const self = this;

  function init() {
    self.serviceName = $stateParams.serviceName;
    self.contractsAccepted = false;
    self.isConverting = false;
    self.isLoading = false;
    self.offerError = null;

    return self.refresh().catch((err) => {
      if (err.status === 400 && /number range.*forbidden change/.test(_.get(err, 'data.message'))) {
        self.offerError = $translate.instant('telephony_alias_administration_convert_range_error');
        return $q.reject(err);
      }
      return new ToastError(err);
    });
  }

  self.refresh = function () {
    self.isLoading = true;
    self.contractsAccepted = false;
    return self.fetchConvertToLineTask().then((task) => {
      self.convertTask = task;
      if (!task) {
        return self.getAvailableOffers($stateParams).then((availableOffers) => {
          self.offers = availableOffers.offers;
          self.offer = _.first(self.offers);
          self.contracts = availableOffers.contracts;
        });
      }
      return null;
    }).finally(() => {
      self.isLoading = false;
    });
  };

  self.getAvailableOffers = function (service) {
    return OvhApiTelephony.Number().v6().convertToLineAvailableOffers({
      billingAccount: service.billingAccount,
      serviceName: service.serviceName,
    }).$promise;
  };

  self.fetchConvertToLineTask = function () {
    return OvhApiTelephony.Service().OfferTask().v6()
      .query({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
        action: 'convertToSip',
        type: 'offer',
      }).$promise
      .then(taskIds => $q.all(_.map(taskIds, id => OvhApiTelephony.Service().OfferTask().v6().get({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
        taskId: id,
      }).$promise)).then(tasks => _.first(_.filter(tasks, { status: 'todo' }))));
  };

  self.convertToLine = function () {
    self.isConverting = true;
    return OvhApiTelephony.Number().v6().convertToLine({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, {
      offer: self.offer.name,
    }).$promise.then(() => self.refresh()).then(() => {
      Toast.success($translate.instant('telephony_alias_administration_convert_success'));
    }).catch(err => new ToastError(err)).finally(() => {
      self.isConverting = false;
    });
  };

  self.cancelConvertion = function () {
    self.isCancelling = true;
    return OvhApiTelephony.Number().v6().cancelConvertToLine({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, {}).$promise.then(() => self.refresh()).then(() => {
      Toast.success($translate.instant('telephony_alias_administration_convert_cancel_success'));
    }).catch(err => new ToastError(err)).finally(() => {
      self.isCancelling = false;
    });
  };

  self.bulkDatas = {
    billingAccount: $stateParams.billingAccount,
    serviceName: $stateParams.serviceName,
    infos: {
      name: 'terminate',
      actions: [{
        name: 'service',
        route: '/telephony/{billingAccount}/number/{serviceName}/convertToLine',
        method: 'POST',
        params: null,
      }],
    },
  };

  self.filterServices = function (services) {
    function setServicesWithOffer(paramServices, listOffers) {
      const servicesFiltered = [];

      _.times(listOffers.length, (index) => {
        if (listOffers[index].status !== 404 || listOffers[index].status !== 400) {
          if (_.some(listOffers[index].offers, 'name', self.offer.name)) {
            servicesFiltered.push(paramServices[index]);
          }
        }
      });

      return $q.when(servicesFiltered);
    }

    const promises = [];

    _.forEach(services, (service) => {
      promises.push(self.getAvailableOffers(service));
    });

    return $q.allSettled(promises)
      .then(listOffers => setServicesWithOffer(services, listOffers))
      .catch(listOffers => setServicesWithOffer(services, listOffers));
  };

  self.getBulkParams = function () {
    return {
      offer: self.offer.name,
    };
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_alias_administration_convert_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_alias_administration_convert_bulk_some_success', {
        count: bulkResult.success.length,

      }),
      error: $translate.instant('telephony_alias_administration_convert_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    init();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_alias_administration_convert_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };

  init();
});
