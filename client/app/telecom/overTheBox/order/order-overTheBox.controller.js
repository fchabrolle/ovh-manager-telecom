angular.module('managerApp').controller('OrderOverTheBoxCtrl', function ($translate, $q, $scope, OvhApiOrderOverTheBoxNew, OvhApiPriceOverTheBoxOffer, OvhApiOverTheBox, Toast, ToastError, OvhApiMePaymentMean) {
  const self = this;

  self.loaders = {
    durations: false,
    order: false,
    orders: false,
    create: false,
    checking: false,
  };

  self.durations = [];
  self.offers = [];
  self.devices = [];
  self.hasDefaultPaymentMeans = false;

  // when true, the customer is proposed to attach a device before ordering a new service
  self.proposeLinkDevice = false;

  self.orderModel = {
    offer: null,
    duration: null,
    deviceId: null,
    voucher: null,
  };

  self.states = {
    order: false,
    orderDone: false,
  };

  function init() {
    self.checkPaymentMeans();
    self.checkDevices();
  }

  self.checkPaymentMeans = function () {
    self.paymentMeansChecking = false;
    return OvhApiMePaymentMean.v6().getDefaultPaymentMean().then((defaultPaymentMean) => {
      self.hasDefaultPaymentMeans = !!defaultPaymentMean;
    }).finally(() => {
      self.paymentMeansChecking = false;
    });
  };

  self.checkDevices = function () {
    self.loaders.checking = true;
    return $q.all([
      OvhApiOverTheBox.v6().checkDevices().$promise.then((devices) => {
        self.devices = devices;
        return devices;
      }, (error) => {
        self.error.checking = error.data;
        return new ToastError(error);
      }),
      OvhApiOverTheBox.Aapi().getServices().$promise.then((services) => {
        self.services = services;
        self.unlinkedServices = services.filter(service => !service.device);
        return self.unlinkedServices;
      }, err => new ToastError(err)),
    ]).then(() => {
      self.orphanDevices = self.devices.filter((device) => {
        let found = false;
        self.services.forEach((service) => {
          found = service.device.deviceId === device.deviceId ? true : found;
        });
        return !found;
      });
      self.proposeLinkDevice = (self.devices.length > 0) && (self.unlinkedServices.length > 0) ?
        {
          service: self.unlinkedServices[0],
          devices: self.orphanDevices.length === 1 ? self.orphanDevices[0] : null,
        } : null;
    }).finally(() => {
      self.loaders.checking = false;
    });
  };

  self.startOrder = function () {
    return self.getOrderOffers().then((offers) => {
      if (offers.length === 1) {
        self.orderModel.offer = _.first(offers);
        self.getOrderDurations().finally(() => {
          self.states.order = true;
        });

        return offers;
      }
      self.states.order = true;
      return offers;
    });
  };

  self.getOrderOffers = function () {
    return OvhApiOverTheBox.v6().availableOffers().$promise.then(
      (offers) => {
        self.offers = offers;

        return offers;
      },
      () => new ToastError(null, 'order_overTheBox_offers_error'),
    );
  };

  self.getOrderDurations = function () {
    self.loaders.durations = true;

    return OvhApiOrderOverTheBoxNew.v6().query({
      deviceId: self.orderModel.deviceId,
      offer: self.orderModel.offer,
      voucher: self.orderModel.voucher,
    }).$promise.then((durations) => {
      self.durations = durations;
      if (durations.length === 1) {
        self.orderModel.duration = _.first(self.durations);
      }
      if (self.devices.length === 1) {
        self.orderModel.deviceId = _.first(self.devices).deviceId;
      }

      return durations;
    }, error => new ToastError(error)).finally(() => {
      self.loaders.durations = false;
    });
  };

  self.getOrder = function () {
    self.loaders.order = true;
    return OvhApiOrderOverTheBoxNew.v6().get({
      duration: self.orderModel.duration,
      deviceId: self.orderModel.deviceId,
      offer: self.orderModel.offer || 'summit',
      voucher: self.orderModel.voucher,
    }).$promise.then((informations) => {
      self.orderInformations = informations;

      return informations;
    }, error => new ToastError(error)).finally(() => {
      self.loaders.order = false;
    });
  };

  self.order = function () {
    self.loaders.create = true;
    return OvhApiOrderOverTheBoxNew.v6().save({
      duration: self.orderModel.duration,
    }, {
      deviceId: self.orderModel.deviceId,
      offer: self.orderModel.offer,
      voucher: self.orderModel.voucher,
    }).$promise.then((success) => {
      self.bcUrl = success.url;
      self.states.order = false;
      self.states.orderDone = true;

      return success;
    }, error => new ToastError(error)).finally(() => {
      self.loaders.create = false;
    });
  };

  $scope.$watchCollection(() => self.orderModel, () => {
    if (!self.loaders.order && self.orderModel.offer && self.orderModel.duration) {
      self.getOrder();
    }
  });

  init();
});
