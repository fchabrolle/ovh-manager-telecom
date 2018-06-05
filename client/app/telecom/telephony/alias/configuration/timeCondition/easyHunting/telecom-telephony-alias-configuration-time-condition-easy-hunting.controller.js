angular.module('managerApp').controller('TelecomTelephonyAliasConfigurationTimeConditionEasyHuntingCtrl', function (
  $q, $stateParams, $translate, $uibModal,
  OvhApiTelephony, TelephonyMediator, Toast, uiCalendarConfig, telephonyBulk,
  VoipTimeConditionCondition, voipTimeConditionConfiguration,
) {
  const self = this;
  const bulkActionNames = {
    createCondition: 'createSrcCondition',
    deleteCondition: 'deleteSrcCondition',
    editCondition: 'editSrcCondition',
    options: 'options',
  };

  self.loading = {
    init: false,
  };

  self.number = null;
  self.helpCollapsed = true;

  /*= ==============================
  =            HELPERS            =
  =============================== */

  self.hasChange = function () {
    const isConditionsInEdition = _.some(self.number.feature.timeCondition.conditions, {
      inEdition: true,
    });

    return !isConditionsInEdition && self.number.feature.timeCondition.hasChange();
  };

  /* -----  End of HELPERS  ------*/

  /*= =============================
  =            EVENTS            =
  ============================== */

  self.onTimeConditionFormSubmit = function () {
    self.number.feature.timeCondition.status = 'SAVING';

    // first save options
    return self.number.feature.timeCondition.save().then(() => {
      self.number.feature.timeCondition
        .stopEdition()
        .stopSlotsEdition(false, false, true)
        .startEdition();

      // then save conditions
      return self.number.feature.timeCondition.saveConditions().then(() => {
        Toast.success($translate.instant('telephony_alias_configuration_time_condition_save_success'));
      });
    }, (error) => {
      self.number.feature.timeCondition.stopEdition(true).startEdition();
      Toast.error([$translate.instant('telephony_alias_configuration_time_condition_save_error'), _.get(error, 'data.message')].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.number.feature.timeCondition.status = 'OK';
    });
  };

  self.onTimeConditionFormReset = function () {
    // stop and restart the edition of time condition (stop also slots edition)
    self.number.feature.timeCondition
      .stopEdition(true)
      .stopSlotsEdition(true, true)
      .stopConditionsEdition(true, true)
      .startEdition();

    // refresh the calendar...
    uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('refetchEvents');
  };

  /*= =====================================
  =            INITIALIZATION            =
  ====================================== */

  self.$onInit = function () {
    self.loading.init = true;

    return TelephonyMediator.getGroup($stateParams.billingAccount).then((group) => {
      self.number = group.getNumber($stateParams.serviceName);

      return self.number.feature
        .init()
        .then(() => self.number.feature.getTimeCondition().then(() => {
          // start timeCondition edition
          self.number.feature.timeCondition.startEdition();
        }));
    }).catch((error) => {
      Toast.error([$translate.instant('telephony_alias_configuration_time_condition_load_error'), _.get(error, 'data.message')].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.loading.init = false;
    });
  };

  /* -----  End of INITIALIZATION  ------*/

  /* ======================================
  =      EXPORT/IMPORT CONFIGURATION      =
  ======================================= */

  self.exportConfiguration = function () {
    if (self.number.feature.timeCondition.conditions) {
      voipTimeConditionConfiguration
        .exportConfiguration(self.number.feature.timeCondition.conditions);
    }
  };

  self.importConfiguration = function () {
    const modal = $uibModal.open({
      animation: true,
      templateUrl: 'app/telecom/telephony/service/time-condition/import/telecom-telephony-service-time-condition-import.html',
      controller: 'TelecomTelephonyServiceTimeConditionImportCtrl',
      controllerAs: 'TimeConditionImportCtrl',
    });

    modal.result.then((conditions) => {
      // Set existing condition state to delete
      _.forEach(self.number.feature.timeCondition.conditions, (condition) => {
        _.set(condition, 'state', 'TO_DELETE');
      });

      return self.number.feature.timeCondition.saveConditions().then(() => {
        self.number.feature.timeCondition.conditions =
          self.number.feature.timeCondition.conditions.concat(_.map(conditions, (condition) => {
            _.set(condition, 'billingAccount', $stateParams.billingAccount);
            _.set(condition, 'serviceName', $stateParams.serviceName);
            _.set(condition, 'state', 'TO_CREATE');
            _.set(condition, 'featureType', 'easyHunting');

            return new VoipTimeConditionCondition(condition);
          }));

        uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('refetchEvents');
        return self.number.feature.timeCondition.saveConditions().then(() => {
          Toast.success($translate.instant('telephony_common_time_condition_import_configuration_success'));
        }).catch(() => {
          Toast.error($translate.instant('telephony_common_time_condition_import_configuration_error'));
        }).finally(() => {
          self.$onInit();
        });
      });
    }).catch((error) => {
      if (error) {
        Toast.error($translate.instant('telephony_common_time_condition_import_configuration_error'));
      }
    });
  };

  /* ------ End of EXPORT/IMPORT CONFIGURATION ------ */

  /* ===========================
  =            BULK            =
  ============================ */

  self.filterServices = function (services) {
    return _.filter(services, service => ['easyHunting', 'contactCenterSolution'].indexOf(service.featureType) > -1);
  };

  self.bulkDatas = {
    conditions: (self.number && self.number.feature && self.number.feature.timeCondition) || [],
    infos: {
      name: 'timeConditionEasyHunting',
      actions: [
        {
          name: bulkActionNames.deleteCondition,
          route: '/telephony/{billingAccount}/easyHunting/{serviceName}/timeConditions/conditions/{conditionId}',
          method: 'DELETE',
          params: null,
        },
        {
          name: bulkActionNames.createCondition,
          route: '/telephony/{billingAccount}/easyHunting/{serviceName}/timeConditions/conditions',
          method: 'POST',
          params: null,
        },
        {
          name: bulkActionNames.editCondition,
          route: '/telephony/{billingAccount}/easyHunting/{serviceName}/timeConditions/conditions/{conditionId}',
          method: 'PUT',
          params: null,
        },
        {
          name: bulkActionNames.options,
          route: '/telephony/{billingAccount}/easyHunting/{serviceName}/timeConditions',
          method: 'PUT',
          params: null,
        },
      ],
    },
  };

  self.getBulkParams = function (action) {
    switch (action) {
      case bulkActionNames.createCondition:
      case bulkActionNames.deleteCondition:
      case bulkActionNames.editCondition:
        return self.getTimeConditions(action);
      case bulkActionNames.options:
        return {
          slot1Number: self.number.feature.timeCondition.slots[1].number,
          slot1Type: !_.isNull(self.number.feature.timeCondition.slots[1].number) ? self.number.feature.timeCondition.slots[1].type : '',
          slot2Number: self.number.feature.timeCondition.slots[2].number,
          slot2Type: !_.isNull(self.number.feature.timeCondition.slots[2].number) ? self.number.feature.timeCondition.slots[2].type : '',
          slot3Number: self.number.feature.timeCondition.slots[3].number,
          slot3Type: !_.isNull(self.number.feature.timeCondition.slots[3].number) ? self.number.feature.timeCondition.slots[3].type : '',
          enable: self.number.feature.timeCondition.enable,
          unavailableNumber: self.number.feature.timeCondition.slots[4].number,
          unavailableType: !_.isNull(self.number.feature.timeCondition.slots[4].number) ? self.number.feature.timeCondition.slots[4].type : '',
        };
      default:
        return false;
    }
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_line_calls_time_condition_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_line_calls_time_condition_bulk_some_success', {
        count: bulkResult.success.length,
      }),
      error: $translate.instant('telephony_line_calls_time_condition_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    self.number.feature.timeCondition
      .stopEdition()
      .stopSlotsEdition(false, false, true)
      .stopConditionsEdition(true, true)
      .startEdition();
    OvhApiTelephony.TimeCondition().resetCache();
    TelephonyMediator.resetAllCache();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_line_calls_time_condition_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };

  self.getTimeConditions = function (action) {
    const conditions = _.filter(self.number.feature.timeCondition.conditions, (condition) => {
      switch (action) {
        case bulkActionNames.createCondition:
          return condition.state === 'TO_CREATE';
        case bulkActionNames.deleteCondition:
          return condition.state === 'TO_DELETE';
        case bulkActionNames.editCondition:
          return condition.state === 'TO_EDIT';
        default:
          return false;
      }
    });

    return _.map(conditions, condition => ({
      conditionId: condition.conditionId,
      weekDay: condition.weekDay,
      timeFrom: condition.timeFrom,
      timeTo: condition.timeTo,
      policy: condition.policy,
      status: condition.status,
    }));
  };

  /* -----  End of BULK  ------ */
});
