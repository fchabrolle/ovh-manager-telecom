angular.module('managerApp').controller('TelecomTelephonyServiceConsumptionIncomingCallsCtrl', function ($stateParams, $q, $translate, $filter, $timeout, OvhApiTelephony, ToastError) {
  const self = this;

  function fetchIncomingConsumption() {
    return OvhApiTelephony.Service().VoiceConsumption().v6().query({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }).$promise.then(ids =>
    // single batch is limited to 50 ids, so we might make multiple batch calls
      $q.all(_.map(_.chunk(ids, 50), chunkIds =>
        OvhApiTelephony.Service().VoiceConsumption().v6().getBatch({
          billingAccount: $stateParams.billingAccount,
          serviceName: $stateParams.serviceName,
          consumptionId: chunkIds,
        }).$promise))
        .then(chunkResult => _.flatten(chunkResult)))
      .then(result => _.chain(result)
        .pluck('value')
        .filter(conso => conso.wayType !== 'outgoing')
        .map((conso) => {
          _.set(conso, 'durationAsDate', new Date(conso.duration * 1000));
          if (conso.wayType === 'incoming' && conso.duration === 0) {
            _.set(conso, 'wayType', 'missing');
          }
          if (/anonymous/.test(conso.calling)) {
            _.set(conso, 'calling', $translate.instant('telephony_service_consumption_anonymous'));
          }
          return conso;
        })
        .value());
  }

  function init() {
    self.consumption = {
      raw: null,
      sorted: null,
      paginated: null,
      selected: null,
      durationSum: 0,
      orderBy: 'creationDatetime',
      orderDesc: true,
      filterBy: {
        calling: undefined,
        dialed: undefined,
      },
      showFilter: false,
    };

    self.period = {
      start: moment().startOf('month'),
      end: moment().endOf('month'),
    };

    self.serviceName = $stateParams.serviceName;

    fetchIncomingConsumption().then((result) => {
      self.consumption.raw = angular.copy(result);
      self.consumption.sorted = angular.copy(result);
      self.consumption.durationSum =
        new Date(_.sum(self.consumption.raw, conso => conso.duration) * 1000);
    }, err => new ToastError(err));
  }

  self.refresh = function () {
    OvhApiTelephony.Service().VoiceConsumption().v6().resetCache();
    OvhApiTelephony.Service().VoiceConsumption().v6().resetQueryCache();
    init();
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
      calling: undefined,
      dialed: undefined,
    };
    self.applySorting();
  };

  self.orderBy = function (by) {
    if (self.consumption.orderBy === by) {
      self.consumption.orderDesc = !self.consumption.orderDesc;
    } else {
      self.consumption.orderBy = by;
    }
    self.applySorting();
  };

  init();
});
