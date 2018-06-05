angular.module('managerApp').controller('TelecomTelephonyLinePhonePhonebookCtrl', function (
  $document, $filter, $q, $scope, $stateParams, $timeout, $translate, $uibModal, $window,
  OvhApiTelephony, voipServiceTask, Toast, ToastError, TELEPHONY_PHONEBOOK,
) {
  const self = this;

  /*= ==============================
    =            HELPERS            =
    =============================== */

  function fetchPhonebook() {
    return OvhApiTelephony.Line().Phone().Phonebook().v6()
      .query({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
      }).$promise.then((phonebookIds) => {
        if (_.size(phonebookIds)) {
          return OvhApiTelephony.Line().Phone().Phonebook().v6()
            .get({
              billingAccount: $stateParams.billingAccount,
              serviceName: $stateParams.serviceName,
              bookKey: _.first(phonebookIds),
            }).$promise;
        }
        return null;
      });
  }

  function fetchPhonebookContact(bookKey) {
    return OvhApiTelephony.Line().Phone().Phonebook().PhonebookContact()
      .v6()
      .query({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
        bookKey,
      }).$promise
      .then(phonebookContactIds => $q.all(_.map(_.chunk(phonebookContactIds, 50), chunkIds =>
        OvhApiTelephony.Line().Phone().Phonebook().PhonebookContact()
          .v6()
          .getBatch({
            billingAccount: $stateParams.billingAccount,
            serviceName: $stateParams.serviceName,
            bookKey,
            id: chunkIds,
          }).$promise))
        .then((chunkResult) => {
          const result = _.pluck(_.flatten(chunkResult), 'value');
          const emptyGroup = _.get(TELEPHONY_PHONEBOOK, 'emptyFields.group');
          const emptyPhoneNumber = _.get(TELEPHONY_PHONEBOOK, 'emptyFields.numbers');
          return _.each(result, (contact) => {
            _.set(contact, 'group', contact.group === emptyGroup ? '' : contact.group);
            _.set(contact, 'homeMobile', contact.homeMobile === emptyPhoneNumber ? '' : contact.homeMobile);
            _.set(contact, 'homePhone', contact.homePhone === emptyPhoneNumber ? '' : contact.homePhone);
            _.set(contact, 'workMobile', contact.workMobile === emptyPhoneNumber ? '' : contact.workMobile);
            _.set(contact, 'workPhone', contact.workPhone === emptyPhoneNumber ? '' : contact.workPhone);
          });
        }));
  }

  self.getSelection = function () {
    return _.filter(self.phonebookContact.raw, contact =>
      contact && self.phonebookContact.selected && self.phonebookContact.selected[contact.id]);
  };

  /* -----  End of HELPERS  ------*/

  /*= ==============================
    =            ACTIONS            =
    =============================== */

  /* ----------  PHONEBOOK  ----------*/

  self.createPhonebook = function (form) {
    self.phonebookToAdd.isAdding = true;
    const name = _.pick(self.phonebookToAdd, 'name');
    return OvhApiTelephony.Line().Phone().Phonebook().v6()
      .create({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
      }, name).$promise.then((phonebook) => {
        form.$setPristine();
        _.assign(self.phonebook, _.pick(phonebook, ['bookKey']), name);
        Toast.success($translate.instant('telephony_phonebook_create_success'));
      }).catch((error) => {
        if (error && error.status === 501) {
          return Toast.error($translate.instant('telephony_phonebook_brand_not_supported'));
        }
        return new ToastError(error);
      }).finally(() => {
        self.phonebookToAdd.isAdding = false;
      });
  };

  self.startEdition = function () {
    self.phonebook.inEdition = true;
    self.phonebook.newName = angular.copy(self.phonebook.name);
    $timeout(() => {
      $document.find("input[name='phonebookName']").select();
    });
  };

  self.cancelEdition = function () {
    self.phonebook.inEdition = false;
  };

  self.savePhonebook = function () {
    return OvhApiTelephony.Line().Phone().Phonebook().v6()
      .update({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
        bookKey: self.phonebook.bookKey,
      }, {
        name: self.phonebook.newName,
      }).$promise.then(() => {
        self.phonebook.name = self.phonebook.newName;
      }).catch((error) => {
        Toast.error($translate.instant('telephony_phonebook_update_ko', { error: _.get(error, 'data.message') }));
      }).finally(() => {
        self.phonebook.inEdition = false;
      });
  };

  self.deletePhonebook = function () {
    self.phonebook.hasModalOpened = true;
    const modal = $uibModal.open({
      animation: true,
      templateUrl: 'app/telecom/telephony/line/phone/phonebook/remove/telecom-telephony-line-phone-phonebook-remove.html',
      controller: 'TelecomTelephonyLinePhonePhonebookRemoveCtrl',
      controllerAs: 'PhonebookRemoveCtrl',
      resolve: {
        phonebook() { return self.phonebook; },
      },
    });
    modal.result.then(() => {
      self.phonebook.name = null;
      self.phonebook.bookKey = null;
      self.phonebookContact.raw = [];
      self.phonebookContact.groupsAvailable = [];
      self.sortPhonebookContact();
    }, (error) => {
      if (error && error.type === 'API') {
        Toast.error($translate.instant('telephony_phonebook_delete_ko', { error: _.get(error, 'msg.data.message') }));
      }
    }).finally(() => {
      self.phonebook.hasModalOpened = false;
    });
  };

  /* ----------  PHONEBOOK CONTACT  ----------*/

  self.addPhonebookContact = function () {
    self.phonebookContact.hasModalOpened = true;
    const modal = $uibModal.open({
      animation: true,
      templateUrl: 'app/telecom/telephony/line/phone/phonebook/contact-add/telecom-telephony-line-phone-phonebook-contact-add.html',
      controller: 'TelecomTelephonyLinePhonePhonebookContactAddCtrl',
      controllerAs: 'ContactAddCtrl',
      resolve: {
        data() {
          return {
            phonebook: self.phonebook,
            groupsAvailable: self.phonebookContact.groupsAvailable,
          };
        },
      },
    });
    modal.result.then(() => self.refresh(), (error) => {
      if (error && error.type === 'API') {
        Toast.error($translate.instant('telephony_phonebook_contact_add_ko', { error: _.get(error, 'msg.data.message') }));
      }
    }).finally(() => {
      self.phonebookContact.hasModalOpened = false;
    });
  };

  self.importPhonebookContact = function () {
    self.phonebookContact.hasModalOpened = true;
    const modal = $uibModal.open({
      animation: true,
      templateUrl: 'app/telecom/telephony/line/phone/phonebook/contact-import/telecom-telephony-line-phone-phonebook-contact-import.html',
      controller: 'TelecomTelephonyLinePhonePhonebookContactImportCtrl',
      controllerAs: 'ContactImportCtrl',
      resolve: {
        bookKey() { return _.get(self.phonebook, 'bookKey'); },
      },
    });
    modal.result.then((response) => {
      if (_.has(response, 'taskId')) {
        self.phonebookContact.isImporting = true;
        return voipServiceTask
          .startPolling($stateParams.billingAccount, $stateParams.serviceName, response.taskId, {
            namespace: `linePhonePhonebookContactImportTask_${$stateParams.serviceName}`,
            interval: 1000,
            retryMaxAttempts: 2,
          }).catch((err) => {
            if (err.status === 404) {
              self.phonebookContact.isImporting = false;
              return self.refresh();
            }
            Toast.error([$translate.instant('telephony_number_feature_redirect_save_error'), (err.data && err.data.message) || ''].join(' '));
            return $q.reject(err);
          });
      }
      return null;
    }).catch((err) => {
      if (err && err.type === 'API') {
        Toast.error($translate.instant('telephony_phonebook_contact_action_import_ko', { error: _.get(err, 'msg.data.message') }));
      }
    }).finally(() => {
      self.phonebookContact.hasModalOpened = false;
    });
    return modal;
  };

  self.exportPhonebookContact = function () {
    self.phonebookContact.isExporting = true;
    const tryGetCsvExport = function () {
      return OvhApiTelephony.Line().Phone().Phonebook().v6()
        .getExport({
          billingAccount: $stateParams.billingAccount,
          serviceName: $stateParams.serviceName,
          bookKey: _.get(self.phonebook, 'bookKey'),
          format: 'csv',
        }).$promise.then((exportPhonebook) => {
          if (exportPhonebook.status === 'done') {
            return exportPhonebook;
          }
          if (self.phonebookContact.poller) {
            $timeout.cancel(self.phonebookContact.poller);
          }
          self.phonebookContact.poller = $timeout(tryGetCsvExport, 1000);
          return self.phonebookContact.poller;
        });
    };
    return tryGetCsvExport().then((phonebook) => {
      $window.location.href = phonebook.url; // eslint-disable-line
      Toast.success($translate.instant('telephony_phonebook_contact_action_export_ok'));
    }).catch((err) => {
      Toast.error([$translate.instant('telephony_phonebook_contact_action_export_ko'), (err.data && err.data.message) || ''].join(' '));
      return $q.reject(err);
    }).finally(() => {
      self.phonebookContact.isExporting = false;
    });
  };

  self.updatePhonebookContact = function (contact) {
    self.phonebookContact.hasModalOpened = true;
    const modal = $uibModal.open({
      animation: true,
      templateUrl: 'app/telecom/telephony/line/phone/phonebook/contact-update/telecom-telephony-line-phone-phonebook-contact-update.html',
      controller: 'TelecomTelephonyLinePhonePhonebookContactUpdateCtrl',
      controllerAs: 'ContactUpdateCtrl',
      resolve: {
        data() {
          return {
            phonebook: self.phonebook,
            contact,
            groupsAvailable: self.phonebookContact.groupsAvailable,
          };
        },
      },
    });
    modal.result.then(() => self.refresh(), (error) => {
      if (error && error.type === 'API') {
        Toast.error($translate.instant('telephony_phonebook_contact_update_ko', { error: _.get(error, 'msg.data.message') }));
      }
    }).finally(() => {
      self.phonebookContact.hasModalOpened = false;
    });
  };

  self.removePhonebookContact = function (contact) {
    self.phonebookContact.isDeleting = true;
    return OvhApiTelephony.Line().Phone().Phonebook().PhonebookContact()
      .v6()
      .remove({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
        bookKey: self.phonebook.bookKey,
        id: contact.id,
      }).$promise.then(() => {
        Toast.success($translate.instant('telephony_phonebook_contact_remove_success'));
        return self.refresh();
      }).catch(error => new ToastError(error)).finally(() => {
        self.phonebookContact.isDeleting = false;
      });
  };

  self.deleteSelectedContacts = function () {
    const contacts = self.getSelection();
    const queries = contacts.map(contact =>
      OvhApiTelephony.Line().Phone().Phonebook().PhonebookContact()
        .v6()
        .remove({
          billingAccount: $stateParams.billingAccount,
          serviceName: $stateParams.serviceName,
          bookKey: _.get(self.phonebook, 'bookKey'),
          id: contact.id,
        }).$promise);
    self.phonebookContact.isDeleting = true;
    queries.push($timeout(angular.noop, 500)); // avoid clipping
    Toast.info($translate.instant('telephony_phonebook_delete_success'));
    return $q.all(queries).then(() => {
      self.phonebookContact.selected = {};
      return self.refresh();
    }).catch(error => new ToastError(error)).finally(() => {
      self.phonebookContact.isDeleting = false;
    });
  };

  self.sortPhonebookContact = function () {
    let data = angular.copy(self.phonebookContact.raw);
    data = $filter('orderBy')(
      data,
      self.phonebookContact.orderBy,
      self.phonebookContact.orderDesc,
    );
    self.phonebookContact.sorted = data;

    // avoid pagination bug…
    if (self.phonebookContact.sorted.length === 0) {
      self.phonebookContact.paginated = [];
    }
  };

  self.orderPhonebookContactBy = function (by) {
    if (self.phonebookContact.orderBy === by) {
      self.phonebookContact.orderDesc = !self.phonebookContact.orderDesc;
    } else {
      self.phonebookContact.orderBy = by;
    }
    self.sortPhonebookContact();
  };

  self.updatePhonebookContactGroups = function () {
    self.phonebookContact.groupsAvailable = _.chain(self.phonebookContact.raw)
      .pluck('group')
      .pull('No group')
      .uniq()
      .compact()
      .value();
  };

  self.refresh = function () {
    self.phonebookContact.isLoading = true;
    OvhApiTelephony.Line().Phone().Phonebook().PhonebookContact()
      .v6()
      .resetAllCache();
    return fetchPhonebookContact(self.phonebook.bookKey).then((phonebookContact) => {
      self.phonebookContact.raw = phonebookContact;
      self.sortPhonebookContact();
      self.updatePhonebookContactGroups();
    }).catch(error => new ToastError(error)).finally(() => {
      self.phonebookContact.isLoading = false;
    });
  };

  /* -----  End of ACTIONS  ------*/

  /*= =====================================
    =            INITIALIZATION            =
    ====================================== */

  function init() {
    self.phonebook = {
      name: null,
      bookKey: null,
      isLoading: false,
      hasModalOpened: false,
      inEdition: false,
    };
    self.phonebookToAdd = {
      name: '',
      isAdding: false,
    };
    self.phonebookContact = {
      raw: [],
      groupsAvailable: [],
      paginated: null,
      sorted: null,
      selected: {},
      orderBy: 'name',
      orderDesc: false,
      isLoading: false,
      isAdding: false,
      isImporting: false,
      isExporting: false,
      isDeleting: false,
      hasModalOpened: false,
      poller: null,
    };
    self.phonebook.isLoading = true;
    return fetchPhonebook().then((phonebook) => {
      if (phonebook) {
        _.assign(self.phonebook, _.pick(phonebook, ['name', 'bookKey']));
        return fetchPhonebookContact(self.phonebook.bookKey).then((phonebookContact) => {
          self.phonebookContact.raw = phonebookContact;
          self.sortPhonebookContact();
          self.updatePhonebookContactGroups();
        });
      }
      return null;
    }).catch(error => new ToastError(error)).finally(() => {
      self.phonebook.isLoading = false;
    });
  }

  /* -----  End of INITIALIZATION  ------*/

  init();

  $scope.$on('$destroy', () => {
    $timeout.cancel(self.phonebookContact.poller);
  });
});
