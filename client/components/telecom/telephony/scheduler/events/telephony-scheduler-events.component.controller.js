angular.module('managerApp').controller('TelephonySchedulerEventsCtrl', function ($filter, telephonyScheduler) {
  const self = this;

  self.loading = {
    init: false,
  };

  self.model = {
    specialEdit: {
      attr: null,
      move: false,
    },
  };

  self.timeSlots = null;
  self.categories = null;
  self.datepickerOptions = {
    showWeeks: false,
  };

  /*= ==============================
    =            HELPERS            =
    =============================== */

  /* ----------  time slots creation  ----------*/

  function createTimeSlots(startParam) {
    const end = moment().endOf('day');
    const timeSlots = [];
    let start = startParam;

    if (!start) {
      start = moment().startOf('day');
    }

    while (start <= end) {
      timeSlots.push(start.format('HH:mm'));
      start.add(15, 'minutes');
    }

    return timeSlots;
  }

  self.getAvailableEndSlots = function () {
    const dateStartToMoment = moment(self.event.dateStart);

    if (moment(self.event.dateEnd).isSame(self.event.dateStart, 'day')) {
      return createTimeSlots(moment().hour(dateStartToMoment.hour()).minute(dateStartToMoment.minute()).add(15, 'minutes'));
    }
    return createTimeSlots();
  };

  /* ----------  date setter helpers  ----------*/

  function parseHourChange(date, hour) {
    const dateToMoment = moment(date);
    const hourToMoment = moment(hour, 'HH:mm');
    return dateToMoment.set('hours', hourToMoment.get('hours')).set('minutes', hourToMoment.get('minutes')).toDate();
  }

  /* ----------  ngModel getterSetter options  ----------*/

  self.parseFromDate = function (newDate) {
    if (arguments.length) {
      return (self.event.dateStart = newDate); // eslint-disable-line
    }
    return $filter('date')(self.event.dateStart, 'shortDate');
  };

  self.parseFromHour = function (newHour) {
    if (arguments.length) {
      return (self.event.dateStart = parseHourChange(self.event.dateStart, newHour)); // eslint-disable-line
    }
    return moment(self.event.dateStart).format('HH:mm');
  };

  self.parseToDate = function (newDate) {
    if (arguments.length) {
      return (self.event.dateEnd = newDate); // eslint-disable-line
    }
    return $filter('date')(self.event.dateEnd, 'shortDate');
  };

  self.parseToHour = function (newHour) {
    if (arguments.length) {
      return (self.event.dateEnd = parseHourChange(self.event.dateEnd, newHour)); // eslint-disable-line
    }
    return moment(self.event.dateEnd).format('HH:mm');
  };

  self.rightPageDateModel = function (newDate) {
    if (arguments.length) {
      if (self.model.specialEdit.attr === 'dateStart') {
        return (self.event.dateStart = newDate); // eslint-disable-line
      }
      return (self.event.dateEnd = newDate); // eslint-disable-line
    }
    return self.model.specialEdit.attr === 'dateStart' ? self.event.dateStart : self.event.dateEnd;
  };

  /* ----------  category availablity  ----------*/

  self.convertCategoryToSlot = function (category) {
    return telephonyScheduler
      .convertCategoryToSlot(self.timeCondition, category || self.event.categories);
  };

  self.isCategoryAvailable = function (category) {
    return self.scheduler.isEventInExistingRange({
      categories: category,
      dateStart: self.event.dateStart,
      dateEnd: self.event.dateEnd,
    });
  };

  function getFirstAvailableCategory() {
    return _.find(self.categories, category => !self.scheduler.isEventInExistingRange({
      categories: category,
      dateStart: self.event.dateStart,
      dateEnd: self.event.dateEnd,
    }));
  }

  /* -----  End of HELPERS  ------*/

  /*= ==============================
    =            ACTIONS            =
    =============================== */

  self.manageCancel = function () {
    self.onCancel()(self.event);
  };

  self.manageSave = function () {
    if (self.event.status === 'CREATING') {
      // add event to scheduler list
      // and flag event to be created by changing his status
      self.scheduler.addEvent(self.event).status = 'TOCREATE';
    }
    self.onSave()(self.event);
  };

  self.manageDelete = function () {
    if (self.event.status === 'TOCREATE') {
      self.scheduler.removeEvent(self.event);
    } else {
      // change status to call DELETE API
      self.event.status = 'TODELETE';
    }
    self.onDelete()(self.event);
  };

  self.manageDeleteConfirmation = function () {
    self.model.specialEdit.attr = 'delete';
    self.model.specialEdit.move = true;
  };

  self.manageOnDateChange = function () {
    if (self.model.specialEdit.attr === 'dateStart') {
      // if start date is after end date, set end date to end of start date day.
      if (moment(self.event.dateStart).isAfter(self.event.dateEnd)) {
        if (self.event.allDay) {
          self.event.dateEnd = moment(self.event.dateStart).endOf('day').toDate();
        } else {
          self.event.dateEnd = moment(self.event.dateStart).add(15, 'minutes').toDate();
        }
      }
    } else if (self.model.specialEdit.attr === 'dateEnd') {
      // if end date is before start date, set start date to begin of end date day.
      if (moment(self.event.dateEnd).isBefore(self.event.dateStart)) {
        if (self.event.allDay) {
          self.event.dateStart = moment(self.event.dateEnd).startOf('day').toDate();
        } else {
          self.event.dateStart = moment(self.event.dateEnd).subtract(15, 'minutes').toDate();
        }
      }

      // if event is full day event, set end date to the end of the day
      if (self.event.allDay) {
        self.event.dateEnd = moment(self.event.dateEnd).endOf('day').toDate();
      }
    }

    if (!self.event.categories) {
      self.event.categories = getFirstAvailableCategory();
    } else if (!getFirstAvailableCategory()) {
      self.event.categories = undefined;
    }

    self.model.specialEdit.move = false;
  };

  self.manageOnFromHourStart = function () {
    if (moment(self.event.dateEnd).isSame(self.event.dateStart, 'day')) {
      self.event.dateEnd = moment(self.event.dateStart).add(15, 'minutes').toDate();
    }
  };

  self.setAllDay = function (newValue) {
    self.event.allDay = newValue;
    self.manageOnAllDayChange();
  };

  self.manageOnAllDayChange = function () {
    if (self.event.allDay) {
      self.event.dateStart = moment(self.event.dateStart).startOf('day').toDate();
      self.event.dateEnd = moment(self.event.dateEnd).endOf('day').toDate();
    } else if (moment(self.event.dateEnd).isSame(self.event.dateStart, 'day')) {
      self.event.dateEnd = moment(self.event.dateEnd).startOf('day').add(15, 'minutes').toDate();
    } else {
      self.event.dateEnd = moment(self.event.dateEnd).startOf('day').toDate();
    }
  };

  /* -----  End of ACTIONS  ------*/

  /*= =====================================
    =            INITIALIZATION            =
    ====================================== */

  self.$onInit = function () {
    self.loading.init = true;
    self.timeSlots = createTimeSlots();

    return telephonyScheduler.getAvailableCategories().then((categories) => {
      self.categories = _.filter(
        categories,
        category => (self.timeCondition ? self.convertCategoryToSlot(category) : true),
      );

      if (self.event.status === 'CREATING' && self.scheduler.isEventInExistingRange(self.event)) {
        self.event.categories = getFirstAvailableCategory();
      }
    }).finally(() => {
      self.loading.init = false;
    });
  };

  /* -----  End of INITIALIZATION  ------*/
});
