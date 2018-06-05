angular.module('managerApp').directive('voipTimeConditionCalendar', ($compile, $timeout, uiCalendarConfig, VOIP_TIMECONDITION_ORDERED_DAYS) => ({
  restrict: 'EA',
  templateUrl: 'components/telecom/telephony/timeCondition/calendar/telephony-time-condition-calendar.html',
  controller: 'voipTimeConditionCalendarCtrl',
  controllerAs: '$ctrl',
  bindToController: true,
  scope: {
    timeCondition: '=voipTimeCondition',
    options: '=?calendarOptions',
  },
  link(iScope, iElement, iAttributes, controller) {
    /*= ==============================
            =            HELPERS            =
            =============================== */

    function compileFcEvent(event, element) {
      if (event.scope) {
        event.scope.$destroy();
        _.set(event, 'scope', null);
      }

      _.set(event, 'scope', iScope.$new());
      _.set(event, 'scope.isPopoverOpen', false);
      element.attr({
        'data-responsive-popover': "'components/telecom/telephony/timeCondition/condition/edit/telephony-time-condition-condition-edit.html'",
        'data-popover-trigger': 'outsideClick',
        'data-popover-placement': 'auto right',
        'data-popover-class': 'pretty-popover voip-time-condition-condition-edit-popover',
        'data-popover-is-open': 'isPopoverOpen',
        'data-popover-append-to-body': 'true',
      });

      $compile(element)(event.scope);
    }

    function refreshConditionFromEvent(event) {
      const conditionDropped = controller.timeCondition.getCondition(event.id);
      if (conditionDropped) {
        conditionDropped.startEdition();
        conditionDropped.weekDay =
          VOIP_TIMECONDITION_ORDERED_DAYS[event.start.day() === 0 ?
            VOIP_TIMECONDITION_ORDERED_DAYS.length - 1 : event.start.day() - 1];
        conditionDropped.timeFrom = event.start.format('HH:mm:ss');
        conditionDropped.timeTo = event.end.format('HH:mm:ss');
        conditionDropped.stopEdition();
      }
    }

    function manageEventEdit(event) {
      // set current edited condition
      _.set(event, 'scope.isPopoverOpen', true);
      _.set(controller, 'conditionInEdition', controller.timeCondition.getCondition(event.id).startEdition());
      _.set(controller, 'fcEventInEdition', event);
    }

    function setEventsEditable(editableState) {
      // disable edition of all events
      uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('clientEvents').forEach((event) => {
        _.set(event, 'editable', editableState);
      });

      // as event editable doesn't enable/disable events resize add/remove a custom class
      // to hide resize handle...
      if (!editableState) {
        uiCalendarConfig.calendars.conditionsCalendar.addClass('events-resizable-disabled');
      } else {
        uiCalendarConfig.calendars.conditionsCalendar.removeClass('events-resizable-disabled');
      }
    }

    function getOpenedEvent() {
      return _.find(uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('clientEvents'), fcEvent => _.get(fcEvent, 'scope.isPopoverOpen') === true);
    }

    /* -----  End of HELPERS  ------*/

    // set calendar options
    _.set(controller, 'options', _.defaultsDeep(controller.options || {}, {
      height: 'auto',
      locale: localStorage && localStorage.getItem('univers-selected-language') ? _.first(localStorage.getItem('univers-selected-language').split('_')) : 'fr',
      editable: true,
      allDaySlot: false,
      allDayDefault: false,
      selectable: true,
      eventOverlap: false,
      selectOverlap: false,
      header: false,
      firstDay: 1,
      timeZone: 'local',
      columnFormat: 'dddd',
      axisFormat: 'HH:mm',
      timeFormat: 'HH:mm',
      defaultView: 'agendaWeek',
      snapDuration: '00:15',
      eventConstraint: {
        start: '00:00',
        end: '24:00:01',
      },
      selectConstraint: {
        start: '00:00',
        end: '24:00',
      },
      events(start, end, timeZone, callback) {
        return callback(_.chain(controller.timeCondition.conditions).filter(condition => condition.state !== 'TO_DELETE').map(condition => angular.extend(condition.toFullCalendarEvent(), {
          className: condition.policy || 'available',
        })).value());
      },
      eventClick(event) {
        manageEventEdit(event);
      },
      eventRender(event, element) {
        compileFcEvent(event, element);

        // change event end display
        const displayTimeElem = $(element).find('.fc-time span');
        const splittedElemText = displayTimeElem.text().split('-');
        if (splittedElemText.length > 1) {
          const start = splittedElemText[0].trim();
          let end = splittedElemText[1].trim();
          const splittedEnd = end.split(':');
          if (splittedEnd.length) {
            const endMinute = parseInt(splittedEnd[1], 10);
            if (endMinute % 15 !== 0) {
              end = moment().set('hour', splittedEnd[0]).set('minute', splittedEnd[1]).add(1, 'minute');
              displayTimeElem.text(`${start} - ${end.format('HH:mm')}`);
            }
          }
        }
      },
      eventAfterAllRender(fcView) {
        let fcEvent;
        const draftCondition = _.find(controller.timeCondition.conditions, {
          state: 'DRAFT',
        });
        if (draftCondition) {
          fcEvent = _.find(fcView.calendar.clientEvents(), {
            id: draftCondition.conditionId,
          });
          if (fcEvent) {
            $timeout(() => {
              manageEventEdit(fcEvent);
            });
          }
        }
      },
      select(start, end) {
        // check if there is an opened event. If so unselect and return
        let openedEvent = getOpenedEvent();
        const openedCondition = _.find(controller.timeCondition.conditions, {
          inEdition: true,
        });

        if (openedCondition) {
          openedEvent = _.find(uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('clientEvents'), {
            id: openedCondition.conditionId,
          });
          if (openedEvent && openedEvent.scope) {
            openedEvent.scope.$destroy();
          }
        }

        if (openedEvent) {
          openedEvent.scope.isPopoverOpen = false;
          return uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('unselect');
        }
        if (controller.timeCondition.featureType === 'sip') {
          controller.timeCondition.addCondition({
            hourBegin: start.format('HHmm'),
            hourEnd: end.format('HHmm'),
            day: VOIP_TIMECONDITION_ORDERED_DAYS[start.day() === 0 ?
              VOIP_TIMECONDITION_ORDERED_DAYS.length - 1 : start.day() - 1],
            state: 'DRAFT',
          });
        } else {
          controller.timeCondition.addCondition({
            timeFrom: start.format('HH:mm:ss'),
            timeTo: end.format('HH:mm:ss'),
            weekDay: VOIP_TIMECONDITION_ORDERED_DAYS[start.day() === 0 ?
              VOIP_TIMECONDITION_ORDERED_DAYS.length - 1 : start.day() - 1],
            state: 'DRAFT',
          });
        }

        // refresh events
        uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('refetchEvents');

        return null;
      },
      eventDragStop(event) {
        compileFcEvent(event, $(this));
      },
      eventDrop(event) {
        refreshConditionFromEvent(event);
      },
      eventResizeStop(event) {
        compileFcEvent(event, $(this));
      },
      eventResize(event) {
        refreshConditionFromEvent(event);
      },
    }));

    _.set(controller, 'onPopoverInit', () => {
      setEventsEditable(false);
    });

    _.set(controller, 'onPopoverValidate', (fcEvent) => {
      _.set(fcEvent, 'scope.isPopoverOpen', false);
      uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('refetchEvents');
    });

    _.set(controller, 'onPopoverDestroy', (fcEvent) => {
      _.set(fcEvent, 'editable', true);
      _.set(fcEvent, 'scope.isPopoverOpen', false);

      const isConditionInEdition = _.some(controller.timeCondition.conditions, {
        inEdition: true,
      });

      if (!isConditionInEdition) {
        uiCalendarConfig.calendars.conditionsCalendar.fullCalendar('refetchEvents');
        setEventsEditable(true);
      }
    });
  },
}));
