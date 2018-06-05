angular.module('managerApp').controller('TelecomTelephonyServiceConsumptionOutgoingFaxCtrl', function ($stateParams, $q, $translate, $filter, $timeout, OvhApiTelephony, ToastError) {
  const self = this;

  function fetchOutgoingConsumption() {
    return OvhApiTelephony.Service().FaxConsumption().v6()
      .query({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
      }).$promise
      .then(ids => $q.all(_.map(_.chunk(ids, 50), chunkIds =>
        OvhApiTelephony.Service().FaxConsumption().v6().getBatch({
          billingAccount: $stateParams.billingAccount,
          serviceName: $stateParams.serviceName,
          consumptionId: chunkIds,
        }).$promise))
        .then(chunkResult => _.flatten(chunkResult)))
      .then((resultParam) => {
        let result = _.pluck(resultParam, 'value');
        result = _.filter(result, conso => conso.wayType === 'sent');
        return result;
      });
  }

  self.$onInit = function () {
    self.consumption = {
      raw: null,
      sorted: null,
      paginated: null,
      selected: null,
      pagesSum: 0,
      orderBy: 'creationDatetime',
      orderDesc: true,
      filterBy: {
        called: undefined,
      },
      showFilter: false,
    };

    self.period = {
      start: moment().startOf('month'),
      end: moment().endOf('month'),
    };

    fetchOutgoingConsumption().then((result) => {
      self.consumption.raw = angular.copy(result);
      self.applySorting();
      self.consumption.pagesSum = _.sum(self.consumption.raw, conso => conso.pages);
      let priceSuffix = '';
      self.consumption.priceSum = _.sum(self.consumption.raw, (conso) => {
        if (conso.priceWithoutTax) {
          priceSuffix = priceSuffix || conso.priceWithoutTax.text.replace(/[0-9.,\s]/g, '');
          return conso.priceWithoutTax.value;
        }
        return 0.0;
      });
      self.consumption.priceSum = `${Math.floor(self.consumption.priceSum * 100.0, 2) / 100.0} ${priceSuffix}`;
    }, err => new ToastError(err));
  };

  self.refresh = function () {
    OvhApiTelephony.Service().FaxConsumption().v6().resetCache();
    OvhApiTelephony.Service().FaxConsumption().v6().resetQueryCache();
    self.$onInit();
  };

  self.applySorting = function () {
    let data = angular.copy(self.consumption.raw);
    data = $filter('filter')(data, self.consumption.filterBy);
    data = $filter('orderBy')(
      data,
      self.consumption.orderBy,
      self.consumption.orderDesc,
    );
    self.consumption.sorted = data;
  };

  self.toggleShowFilter = function () {
    self.consumption.showFilter = !self.consumption.showFilter;
    self.consumption.filterBy = {
      called: undefined,
    };
    self.applySorting();
  };
});
