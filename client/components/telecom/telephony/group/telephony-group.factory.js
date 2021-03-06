angular.module('managerApp').factory('TelephonyGroup', ($q, OvhApiTelephony, TelephonyGroupLine, TelephonyGroupNumber, TelephonyGroupFax, OvhApiOrder, TELEPHONY_REPAYMENT_CONSUMPTION) => {
  /*= ==================================
    =            CONSTRUCTOR            =
    =================================== */

  function TelephonyGroup(optionsParam) {
    let options = optionsParam;

    if (!options) {
      options = {};
    }

    // options check
    if (!options.billingAccount) {
      throw new Error('billingAccount option must be specified when creating a new TelephonyGroup');
    }

    // mandatory
    this.billingAccount = options.billingAccount.toLowerCase();

    // from API
    this.description = options.description;
    this.status = options.status;
    this.allowedOutplan = options.allowedOutplan;
    this.securityDeposit = options.securityDeposit;
    this.creditThreshold = options.creditThreshold;
    this.currentOutplan = options.currentOutplan;

    // custom
    this.inEdition = false;
    this.saveForEdition = null;
    this.availableOrders = null;
    this.calledFees = null;
    this.groupRepayments = null;

    // lines
    this.lines = [];
    this.numbers = [];
    this.fax = [];
    if (options.lines) {
      this.initLines(options.lines);
    }
    if (options.numbers) {
      this.initNumbers(options.numbers);
    }
    if (options.fax) {
      this.initFax(options.fax);
    }
  }

  /* -----  End of CONSTRUCTOR  ------*/

  /*= ========================================
    =            PROTOTYPE METHODS            =
    ========================================= */

  TelephonyGroup.prototype.getDisplayedName = function () {
    const self = this;

    return self.description || self.billingAccount;
  };

  TelephonyGroup.prototype.getService = function (serviceName) {
    const self = this;

    return self.getLine(serviceName) || self.getNumber(serviceName) || self.getFax(serviceName);
  };

  TelephonyGroup.prototype.getAllServices = function () {
    const self = this;
    const allServices = self.lines.concat(self.numbers, self.fax);

    return allServices;
  };

  /* ----------  API CALLS  ----------*/

  TelephonyGroup.prototype.save = function () {
    const self = this;

    return OvhApiTelephony.v6().edit({
      billingAccount: self.billingAccount,
    }, {
      description: self.description,
    }).$promise;
  };

  /* ----------  LINES  ----------*/

  TelephonyGroup.prototype.initLines = function (lineOptions) {
    const self = this;

    if (_.isArray(lineOptions)) {
      angular.forEach(lineOptions, (lineOption) => {
        self.addLine(lineOption);
      });
    }

    return self.lines;
  };

  TelephonyGroup.prototype.addLine = function (lineOptions) {
    const self = this;

    const line = new TelephonyGroupLine(angular.extend(lineOptions || {}, {
      billingAccount: self.billingAccount,
    }));

    self.lines.push(line);

    return line;
  };

  TelephonyGroup.prototype.getLine = function (lineServiceName) {
    const self = this;

    return _.find(self.lines, {
      serviceName: lineServiceName,
    });
  };

  /* ----------  NUMBERS  ----------*/

  TelephonyGroup.prototype.initNumbers = function (numberOptions) {
    const self = this;

    if (_.isArray(numberOptions)) {
      angular.forEach(numberOptions, (numberOpts) => {
        self.addNumber(numberOpts);
      });
    }

    return self.numbers;
  };

  TelephonyGroup.prototype.addNumber = function (numberOptions) {
    const self = this;

    const number = new TelephonyGroupNumber(angular.extend(numberOptions, {
      billingAccount: self.billingAccount,
    }));

    self.numbers.push(number);

    return number;
  };

  TelephonyGroup.prototype.getNumber = function (numberServiceName) {
    const self = this;

    return _.find(self.numbers, {
      serviceName: numberServiceName,
    });
  };


  TelephonyGroup.prototype.fetchService = function (serviceName) {
    const self = this;
    let number;

    // TODO : handle when service is not an alias
    return OvhApiTelephony.Number().v6().get({
      billingAccount: self.billingAccount,
      serviceName,
    }).$promise.then((numberOptions) => {
      number = new TelephonyGroupNumber(angular.extend(numberOptions, {
        billingAccount: self.billingAccount,
      }));

      if (self.getNumber(number.serviceName)) {
        self.numbers
          .splice(_.findIndex(self.numbers, n => n.serviceName === number.serviceName), 1, number);
      } else {
        self.addNumber(number);
      }

      return number;
    });
  };

  /* ----------  REPAYMENT CONSUMPTION  ----------*/

  TelephonyGroup.prototype.getRepaymentConsumption = function () {
    const self = this;

    return OvhApiTelephony.Service().RepaymentConsumption().Aapi().repayment({
      billingAccount: self.billingAccount,
    }).$promise.then((consumptions) => {
      const calledFeesPrefix = _.chain(TELEPHONY_REPAYMENT_CONSUMPTION)
        .get('calledFeesPrefix').valuesIn().flatten()
        .value();
      const groupRepaymentsPrefix = _.chain(TELEPHONY_REPAYMENT_CONSUMPTION)
        .get('groupRepaymentsPrefix').valuesIn().flatten()
        .value();

      self.calledFees = _.chain(calledFeesPrefix)
        .map(prefix => _.filter(consumptions, consumption => _.startsWith(consumption.dialed, prefix) && consumption.price !== 0 && moment(consumption.creationDatetime).isAfter(moment().subtract(60, 'days').format()))).flatten().value();

      self.groupRepayments = {
        all: consumptions,
        raw: _.chain(groupRepaymentsPrefix)
          .map(prefix => _.filter(consumptions,
            consumption => _.startsWith(consumption.dialed, prefix) && consumption.price !== 0))
          .flatten().value(),
      };

      return self;
    });
  };

  /* ----------  FAX  ----------*/

  TelephonyGroup.prototype.initFax = function (faxOptionsList) {
    const self = this;

    if (_.isArray(faxOptionsList)) {
      angular.forEach(faxOptionsList, (faxOptions) => {
        self.addFax(faxOptions);
      });
    }

    return self.fax;
  };

  TelephonyGroup.prototype.addFax = function (faxOptions) {
    const self = this;

    const fax = new TelephonyGroupFax(angular.extend(faxOptions, {
      billingAccount: self.billingAccount,
    }));

    self.fax.push(fax);

    return fax;
  };

  TelephonyGroup.prototype.getFax = function (faxServiceName) {
    const self = this;

    return _.find(self.fax, {
      serviceName: faxServiceName,
    });
  };

  /* ----------  EDITION  ----------*/

  TelephonyGroup.prototype.startEdition = function () {
    const self = this;

    self.inEdition = true;

    self.saveForEdition = {
      description: angular.copy(self.description),
    };

    return self;
  };

  TelephonyGroup.prototype.stopEdition = function (cancel) {
    const self = this;

    if (self.saveForEdition && cancel) {
      self.description = angular.copy(self.saveForEdition.description);
    }

    self.saveForEdition = null;
    self.inEdition = false;

    return self;
  };

  /* ----------  ORDERS  ----------*/

  TelephonyGroup.prototype.getAvailableOrderNames = function () {
    const self = this;

    if (self.availableOrders) {
      return $q.when(self.availableOrders);
    }
    return OvhApiOrder.Telephony().v6().get({
      billingAccount: self.billingAccount,
    }).$promise.then((orderNames) => {
      self.availableOrders = orderNames;
      return orderNames;
    }, (error) => {
      if (error.status === 404) {
        self.availableOrders = [];
        return self.availableOrders;
      }
      return $q.reject(error);
    });
  };

  /* -----  End of PROTOTYPE METHODS  ------*/

  return TelephonyGroup;
});
