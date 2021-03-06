angular.module('managerApp').controller('XdslAccessCtrl', class XdslAccessCtrl {
  constructor(
    $filter, $q, $scope, $stateParams, $templateCache, $translate, $uibModal,
    OvhApiPackXdsl, OvhApiXdsl, OvhApiXdslIps, OvhApiXdslLines, OvhApiXdslModem,
    OvhApiXdslNotifications, OvhApiXdslTasksCurrent, Toast, ToastError,
    PACK, PACK_IP, REDIRECT_URLS,
  ) {
    this.$filter = $filter;
    this.$q = $q;
    this.$scope = $scope;
    this.$stateParams = $stateParams;
    this.$templateCache = $templateCache;
    this.$translate = $translate;
    this.$uibModal = $uibModal;
    this.OvhApiPackXdsl = OvhApiPackXdsl;
    this.OvhApiXdsl = OvhApiXdsl;
    this.OvhApiXdslIps = OvhApiXdslIps;
    this.OvhApiXdslLines = OvhApiXdslLines;
    this.OvhApiXdslModem = OvhApiXdslModem;
    this.OvhApiXdslNotifications = OvhApiXdslNotifications;
    this.OvhApiXdslTasksCurrent = OvhApiXdslTasksCurrent;
    this.Toast = Toast;
    this.ToastError = ToastError;
    this.PACK = PACK;
    this.PACK_IP = PACK_IP;
    this.REDIRECT_URLS = REDIRECT_URLS;
  }

  $onInit() {
    this.packName = this.$stateParams.packName;
    this.number = this.$stateParams.number;

    this.$scope.loaders = {
      details: true,
      tasks: true,
      deconsolidation: true,
      xdsl: true,
    };

    this.$scope.access = {
      xdsl: null,
      tasks: { current: {} },
    };

    this.$scope.constants = {
      rangeOfBaseIpv4IP: this.PACK_IP.baseIpv4Range,
    };

    this.getLinesDetails();
    this.initTemplateCaches();

    this.$scope.notificationsChanged = (elements) => {
      if (this.$scope.access) {
        this.$scope.access.notificationsCount = elements.length;
      }
    };

    this.$scope.$on('changeAccessNameEvent', (event, data) => {
      if (this.$scope.access.xdsl.accessName === data.xdslId) {
        this.$scope.access.xdsl.description = data.description;
      }
    });
  }

  initTemplateCaches() {
    /* eslint-disable max-len */
    this.$templateCache.put('pack-xdsl-access-tooltip-dslam.html', '<div class="tooltip-description" data-translate="xdsl_access_dslam_reset_description"></div><div class="text-warning" data-translate="xdsl_access_dslam_reset_warning"></div>');
    this.$templateCache.put('pack-xdsl-access-tooltip-lnsApply.html', '<div class="tooltip-description" data-translate="xdsl_access_lns_ratelimit_description"></div><div class="text-warning" data-translate="xdsl_access_lns_ratelimit_warning"></div>');
    this.$templateCache.put('pack-xdsl-access-tooltip-lns.html', '<div class="tooltip-description" data-translate="xdsl_access_lns_description"></div><div class="text-warning" data-translate="xdsl_access_lns_warning"></div>');
    this.$templateCache.put('pack-xdsl-access-tooltip-deconsolidation.html', "<div class=\"tooltip-description\" data-ng-bind=\" ('xdsl_access_deconsolidation_warning_' + XdslAccess.lineDetails.deconsolidation) | translate\"></div>");
    this.$templateCache.put('pack-xdsl-access-tooltip-ipDelete.html', '<div class="tooltip-description" data-translate="xdsl_details_ips_remove_only_extra"></div>');
    this.$templateCache.put('pack-xdsl-access-tooltip-ips.html', '<div class="tooltip-description" data-translate="xdsl_access_ipv6_description"></div><div class="text-warning" data-translate="xdsl_access_ipv6_warning"></div>');
    this.$templateCache.put('pack-xdsl-access-tooltip-dslamProfile.html', '<div class="text-left"><p data-translate="xdsl_access_profile_tooltip_interleaved"></p><p data-translate="xdsl_access_profile_tooltip_fast"></p><p data-translate="xdsl_access_profile_tooltip_ginp"></p><p data-translate="xdsl_access_profile_tooltip_auto"></p><p data-translate="xdsl_access_profile_tooltip_snr"></p><p class="text-warning" data-translate="xdsl_access_profile_tooltip_time"></p></div>');
    /* eslint-enable max-len */
  }

  setStatusLabel(status) {
    switch (status) {
      case 'active':
        this.statusLabel = `<h5 class="ovh-font ovh-font-success text-success mr-2" aria-hidden="true"></h5> ${this.$translate.instant(`xdsl_details_status_${status}`)}`;
        break;
      case 'doing':
      case 'migration':
      case 'upgradeOffer':
        this.statusLabel = `<h5 class="ovh-font ovh-font-success text-success mr-2" aria-hidden="true"></h5> ${this.$translate.instant(`xdsl_details_status_${status}`)}`;
        break;
      case 'cancelled':
      case 'close':
      case 'deleting':
      case 'slamming':
        this.statusLabel = `<h5 class="ovh-font ovh-font-failure text-danger mr-2" aria-hidden="true"></h5> ${this.$translate.instant(`xdsl_details_status_${status}`)}`;
        break;
      default:
        this.statusLabel = status;
    }
  }

  error(err) {
    if (!_.isEmpty(err)) {
      this.ToastError(err);
    }
    this.$scope.loaders.tasks = false;
  }

  success(result) {
    if (result.success) {
      if (this.$scope.access.tasks.current.pendingOrderAdditionalIpOption
        && !result.data.pendingOrderAdditionalIpOption) {
        this.getIps();
        this.ordering = false;
      }
      this.$scope.access.tasks.current = result.data;
    } else {
      this.error(result);
    }
    this.$scope.loaders.tasks = false;
  }

  pollTasks() {
    this.OvhApiXdslTasksCurrent.Aapi().poll(this.$scope, {
      xdslId: this.$stateParams.serviceName,
    }).then(
      result => this.success(result),
      error => this.error(error),
      pending => this.success(pending),
    );
  }

  getOldV6TransfertUrl() {
    return this.REDIRECT_URLS.oldV6ServiceTransfert;
  }

  getIps() {
    return this.OvhApiXdslIps.Aapi().ips({
      xdslId: this.$stateParams.serviceName,
    }).$promise.then((ips) => {
      this.ips = ips;
      this.ipsV6 = this.$filter('filter')(ips, { version: 'v6' });
      this.ipsV4 = this.$filter('filter')(ips, { version: 'v4' });
      ips.forEach((ip) => {
        ip.getBlock = function () { // eslint-disable-line
          return `${this.ip}/${this.range}`;
        };
      });
    }, this.ToastError);
  }

  hasPendingOrderAdditionalIpOption() {
    return this.$scope.access.tasks.current.pendingOrderAdditionalIpOption;
  }

  canHaveMoreIps() {
    return _.filter(this.ipsV4, ip => ip.range !== this.PACK_IP.baseIpv4Range).length === 0;
  }

  orderIps() {
    const modal = this.$uibModal.open({
      animation: true,
      templateUrl: 'app/telecom/pack/xdsl/access/ip/order/pack-xdsl-access-ip-order.modal.html',
      controller: 'XdslAccessIpOrderCtrl',
      controllerAs: 'ctrl',
      resolve: {
        data() {
          return {
            xdslId: this.$stateParams.serviceName,
          };
        },
      },
    });
    modal.result.then((result) => {
      this.$scope.access.tasks.current[result.function] = true;
    });
  }

  deleteIps(ip) {
    _.set(ip, 'deleting', true);
    this.OvhApiXdslIps.v6().unOrder({
      xdslId: this.$stateParams.serviceName,
      ip: ip.ip,
    }, null).$promise.then(() => {
      this.getIps();
      _.set(ip, 'deleting', false);
      this.Toast.success(this.$translate.instant('xdsl_access_ip_block_delete_success', { ip: ip.ip }));
    }, (err) => {
      _.set(ip, 'deleting', false);
      this.ToastError(err);
    });
  }


  getLinesDetails() {
    this.$scope.loaders.details = true;
    this.$scope.loaders.tasks = true;

    this.transfert = {};

    this.pollTasks();

    this.$q.allSettled([
      // Get access Details
      this.OvhApiXdsl.v6().get({
        xdslId: this.$stateParams.serviceName,
      }).$promise.then((access) => {
        this.$scope.loaders.xdsl = false;
        this.$scope.access.xdsl = _.assign(access, {
          isFiber: _.includes(this.PACK.fiberAccess, access.accessType),
        });
        this.setStatusLabel(this.$scope.access.xdsl.status);
        return this.$scope.access.xdsl;
      }, (err) => {
        this.$scope.loaders.xdsl = false;
        return this.ToastError(err);
      }),

      // Get line details
      this.OvhApiXdslLines.v6().get({
        xdslId: this.$stateParams.serviceName,
        number: this.$stateParams.number,
      }).$promise.then((lineDetails) => {
        this.lineDetails = lineDetails;
        this.$scope.deconsolidation = lineDetails.deconsolidation;
        this.$scope.loaders.deconsolidation = false;
      }, (err) => {
        this.$scope.loaders.deconsolidation = false;
        return this.ToastError.constructor(err);
      }),

      // Get MAC Address
      this.OvhApiXdslModem.v6().get({
        xdslId: this.$stateParams.serviceName,
      }).$promise.then((modemDetail) => {
        this.modem = modemDetail;
      }, (err) => {
        if (err.status === 404) {
          return;
        }
        this.ToastError(err);
      }),

      this.getIps(),

      // Get notification number
      this.OvhApiXdslNotifications.v6().query({
        xdslId: this.$stateParams.serviceName,
      }).$promise.then((ids) => {
        this.$scope.access.notificationsCount = ids.length;
      }, this.ToastError),

      // Get Order
      this.OvhApiXdsl.v6().getOrder({
        xdslId: this.$stateParams.serviceName,
      }).$promise.then((orders) => {
        this.actualOrder = _.find(orders, order => order.status === 'doing');

        if (!this.actualOrder) {
          this.actualOrder = _.findLast(orders, order => order.status === 'done');
        }

        if (this.actualOrder.doneDate) {
          this.actualOrder.doneDateLocale = new Date(this.actualOrder.doneDate).toLocaleString();
        }
      }, this.ToastError),

      this.OvhApiPackXdsl.Task().v6().query({
        packName: this.packName,
        function: 'pendingAddressMove',
      }).$promise.then((result) => {
        this.pendingAddressMove = result.length > 0;
      }),

    ]).finally(() => {
      this.$scope.loaders.details = false;
    });
  }
});
