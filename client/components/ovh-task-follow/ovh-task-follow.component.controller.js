angular.module('managerApp').controller('ovhTaskFollowCtrl', function ($scope, $q, $http, $interval, $uibModal, $translate, $translatePartialLoader) {
  const self = this;
  let taksInfoPollPromise = null;

  self.data = {
    alert: null,
    tasks: null,
  };

  self.loading = {
    init: false,
  };

  /*= ==============================
    =            HELPERS            =
    =============================== */

  function getTaskInfo() {
    return $http.get('/ovh-tasks', {
      serviceType: 'aapi',
    }).then((response) => {
      if (_.isEmpty(response)) {
        self.data.alert = null;
        self.data.tasks = [];
      } else {
        self.data.alert = _.get(response, 'data.alert', '');
        self.data.tasks = _.map(_.get(response, 'data.tasks', []), (task) => {
          _.set(task, 'comments', _.map(task.comments, (comment) => {
            _.set(comment, 'comment_text', _.get(comment, 'comment_text', '').replace(/\\'/g, "'").replace(/\\"/g, '"'));
            return comment;
          }).reverse());
          _.set(task, 'detailed_desc', _.get(task, 'detailed_desc', '').replace(/\\'/g, "'").replace(/\\"/g, '"'));
          return task;
        });
      }
    });
  }

  self.getAlert = function () {
    const lg = _.get(localStorage, 'univers-selected-language', 'en_GB');
    return _.get(self.data.alert, lg, _.get(self.data.alert, 'en_GB', self.data.alert));
  };

  /* -----  End of HELPERS  ------*/

  /*= =============================
    =            EVENTS            =
    ============================== */

  self.showFollow = function () {
    $uibModal.open({
      animation: true,
      templateUrl: 'components/ovh-task-follow/modal/ovh-task-follow-modal.html',
      controller: 'ovhTaskFollowModalCtrl',
      controllerAs: '$ctrl',
      scope: $scope,
    });
  };

  self.close = function () {
    self.data.alert = null;
    self.data.tasks = [];
    $interval.cancel(taksInfoPollPromise);
  };

  /* -----  End of EVENTS  ------*/

  /*= =====================================
    =            INITIALIZATION            =
    ====================================== */

  /* ----------  Translations load  ----------*/

  function getTranslations() {
    $translatePartialLoader.addPart('../components/ovh-task-follow');
    return $translate.refresh();
  }

  /* ----------  Component initialization  ----------*/

  self.$onInit = function () {
    self.loading.init = true;

    return $q.all({
      translations: getTranslations(),
      task: getTaskInfo(),
    }).then(() => {
      taksInfoPollPromise = $interval(getTaskInfo, 60000);
    }, () => {
      taksInfoPollPromise = $interval(getTaskInfo, 60000);
    }).finally(() => {
      self.loading.init = false;
    });
  };

  /* -----  End of INITIALIZATION  ------*/
});
